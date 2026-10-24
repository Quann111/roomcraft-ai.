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

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
