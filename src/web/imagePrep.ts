// Client-side input optimisation: every photo is normalised in the browser before upload so the
// AI gets a clean, upright, reasonably sized JPEG and the output keeps the photo's framing.

/** Aspect ratios the worker accepts (keep in sync with ASPECTS in src/worker/index.ts). */
const ASPECTS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5", "21:9"] as const;

const MAX_SIDE = 2560; // plenty for 4K output, keeps uploads small
const MIN_SIDE = 512; // below this results get noticeably soft
const MAX_BYTES = 9.5 * 1024 * 1024; // stay under the worker's 10MB limit

export type PreparedImage = {
  file: File;
  aspectRatio: string;
  original: { width: number; height: number; bytes: number; type: string };
  output: { width: number; height: number; bytes: number };
  warnings: string[]; // bilingual "English · Tiếng Việt", render with bi()
};

/** Closest supported ratio, compared on a log scale so 16:9 vs 9:16 are symmetric. */
export function nearestAspect(width: number, height: number) {
  const r = Math.log(width / height);
  let best: string = ASPECTS[0];
  let bestDiff = Infinity;
  for (const a of ASPECTS) {
    const [w, h] = a.split(":").map(Number);
    const d = Math.abs(Math.log(w / h) - r);
    if (d < bestDiff) { best = a; bestDiff = d; }
  }
  return best;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap applies the EXIF orientation, so phone photos come out upright.
  try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { /* fall back below */ }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("This image format can't be read here — please use JPG or PNG · Không đọc được định dạng ảnh này — hãy dùng JPG hoặc PNG");
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (c: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("Could not encode image · Không mã hoá được ảnh"))), "image/jpeg", quality));

/**
 * `exactAspect` center-crops the photo to exactly its nearest supported ratio. Use it for tools whose model always returns
 * that exact ratio (the VICOSTONE tile edit), which otherwise re-frames the scene so the result no longer lines up.
 */
export async function prepareImage(file: File, o: { exactAspect?: boolean } = {}): Promise<PreparedImage> {
  const src = await decode(file);
  const w0 = "naturalWidth" in src ? src.naturalWidth : src.width;
  const h0 = "naturalHeight" in src ? src.naturalHeight : src.height;
  if (!w0 || !h0) throw new Error("Empty image · Ảnh rỗng");
  const aspectRatio = nearestAspect(w0, h0);

  // Source rectangle: the whole photo, or its centered crop to the exact target ratio.
  let sw = w0, sh = h0;
  if (o.exactAspect) {
    const [aw, ah] = aspectRatio.split(":").map(Number);
    if (w0 / h0 > aw / ah) sw = Math.round(h0 * aw / ah); else sh = Math.round(w0 * ah / aw);
  }
  const sx = Math.round((w0 - sw) / 2), sy = Math.round((h0 - sh) / 2);
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  let w = Math.round(sw * scale);
  let h = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  const draw = () => {
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; // transparent PNGs/sketches get a white background instead of black
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
  };
  draw();

  // Re-encoding drops all metadata (including GPS). Step quality, then size, down until it fits.
  let blob = await toBlob(canvas, 0.9);
  for (const q of [0.82, 0.72]) if (blob.size > MAX_BYTES) blob = await toBlob(canvas, q);
  while (blob.size > MAX_BYTES && Math.max(w, h) > 1024) {
    w = Math.round(w * 0.8); h = Math.round(h * 0.8);
    draw();
    blob = await toBlob(canvas, 0.8);
  }
  if ("close" in src) src.close();

  const warnings: string[] = [];
  if (sw !== w0 || sh !== h0) warnings.push(`Trimmed the edges to an exact ${aspectRatio} frame so the result lines up with the photo · Đã cắt nhẹ mép ảnh về đúng khung ${aspectRatio} để kết quả khớp với ảnh gốc`);
  if (Math.min(w0, h0) < MIN_SIDE) warnings.push(`Low resolution (${w0}×${h0}) — results may look blurry · Ảnh độ phân giải thấp (${w0}×${h0}) — kết quả có thể bị mờ`);

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return {
    file: new File([blob], name, { type: "image/jpeg" }),
    aspectRatio,
    original: { width: w0, height: h0, bytes: file.size, type: file.type || "unknown" },
    output: { width: w, height: h, bytes: blob.size },
    warnings,
  };
}

/** Solves for PIL-style perspective coefficients mapping output points `dst` back to input points `src` (4 pairs). */
function homography(src: number[][], dst: number[][]): number[] {
  const A: number[][] = [];
  dst.forEach(([x, y], i) => {
    const [u, v] = src[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map((row, i) => row[8] / row[i]);
}

/** Pinhole camera outside the building, `pitch` degrees above the ground, looking at its centre from the near (bottom) side. */
function camera(w: number, h: number, pitch = 42, fov = 40) {
  const t = Math.tan((fov * Math.PI) / 360), dist = (1.25 * Math.hypot(w, h)) / (2 * t), a = (pitch * Math.PI) / 180;
  const cy = -dist * Math.cos(a), cz = dist * Math.sin(a);
  // forward points at the centre; right is +X; up = right x forward
  const fwd = [0, -cy / dist, -cz / dist], up = [0, -fwd[2], fwd[1]];
  return (X: number, Y: number, Z: number): [number, number] => {
    const p = [X, Y - cy, Z - cz], z = p[1] * fwd[1] + p[2] * fwd[2];
    return [p[0] / t / z, -(p[1] * up[1] + p[2] * up[2]) / t / z];
  };
}

/**
 * 2D -> 3D in true one-point perspective: the plan (cropped to the building, `crop` as 0-1 fractions plus 2%) is projected by a
 * real camera twice, dark on the floor and light blue at the wall tops (1.2 m, from the footprint's long side `longM` in metres),
 * on a white 16:9 canvas. The image model builds each wall between its two copies, so every wall follows the same vanishing point.
 */
export async function perspGuide(file: File, crop: number[] | null | undefined, longM: number): Promise<Blob> {
  const img = await decode(file);
  const iw = img.width, ih = img.height, m = 0.02;
  const [x0, y0, x1, y1] = crop && crop.length === 4 ? crop : [0, 0, 1, 1];
  const sx = Math.max(0, x0 - m) * iw, sy = Math.max(0, y0 - m) * ih, sw = Math.min(1, x1 + m) * iw - sx, sh = Math.min(1, y1 + m) * ih - sy;
  const k = Math.min(1, 1600 / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  const src = document.createElement("canvas");
  src.width = w; src.height = h;
  const sg = src.getContext("2d")!;
  sg.fillStyle = "#fff"; sg.fillRect(0, 0, w, h);
  sg.drawImage(img as CanvasImageSource, sx, sy, sw, sh, 0, 0, w, h);
  const plan = sg.getImageData(0, 0, w, h).data;
  // metres per pixel from the long side; plan top = far side
  const s = (longM > 0 ? longM : 12) / Math.max(w, h), wall = 1.2;
  const proj = camera(w * s, h * s);
  const corners = [[0, 0], [w, 0], [w, h], [0, h]];
  const at = (z: number) => corners.map(([u, v]) => proj((u - w / 2) * s, (h / 2 - v) * s, z));
  const top = at(wall), floor = at(0), all = [...top, ...floor];
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const W = 1600, H = 900, f = 0.86 * Math.min(W / (Math.max(...xs) - Math.min(...xs)), H / (Math.max(...ys) - Math.min(...ys)));
  const ox = W / 2 - (f * (Math.max(...xs) + Math.min(...xs))) / 2, oy = H / 2 - (f * (Math.max(...ys) + Math.min(...ys))) / 2;
  const out = new ImageData(W, H);
  out.data.fill(255);
  for (const [pts, blue] of [[top, true], [floor, false]] as const) {
    const [a, b, c, d, e, g2, p, q] = homography(corners, pts.map(([x, y]) => [ox + f * x, oy + f * y]));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = p * x + q * y + 1, u = (a * x + b * y + c) / n, v = (d * x + e * y + g2) / n;
      if (u < 0 || v < 0 || u >= w || v >= h) continue;
      const i = ((v | 0) * w + (u | 0)) * 4, o = (y * W + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        let val = plan[i + ch];
        if (blue) { const l = (plan[i] * 299 + plan[i + 1] * 587 + plan[i + 2] * 114) / 1000, tint = [90, 150, 220][ch]; val = 0.75 * (tint + ((255 - tint) * l) / 255) + 64; }
        if (val < out.data[o + ch]) out.data[o + ch] = val;
      }
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  canvas.getContext("2d")!.putImageData(out, 0, 0);
  return new Promise((ok, fail) => canvas.toBlob((b2) => (b2 ? ok(b2) : fail(new Error("Could not prepare the plan · Không xử lý được mặt bằng"))), "image/jpeg", 0.9));
}

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
