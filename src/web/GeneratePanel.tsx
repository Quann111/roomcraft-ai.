import React, { useEffect, useRef, useState } from "react";
import { bi } from "./i18n";

type Meta = {
  styles: { slug: string; name: string; scope: string; thumb?: string }[];
  roomTypes: string[]; intervention: string[];
  surfaces: Record<string, string[]>; paints: { name: string; hex: string }[]; finishes: string[]; weather: string[]; remove: string[]; angles: string[];
};
type Gen = { id: string; status: string; error?: string; public?: boolean; inputUrl: string; outputUrl: string | null };
export type Preset = Partial<{ styleSlug: string; roomType: string; intervention: string; surface: string; material: string; weather: string; remove: string[]; angle: string; color: string; finish: string }>;

export type ToolId =
  | "interior-redesign" | "interior-staging" | "interior-declutter" | "interior-sketch" | "interior-material"
  | "interior-paint" | "interior-floor"
  | "exterior-redesign" | "exterior-sky" | "exterior-sketch" | "exterior-paint" | "garden-redesign";

type Cfg = { scope?: "interior" | "exterior" | "garden"; room?: boolean; intervention?: boolean; remove?: boolean; surface?: boolean; weather?: boolean; angle?: boolean; paint?: boolean; floor?: boolean; hint: string };
const CFG: Record<ToolId, Cfg> = {
  "interior-redesign": { scope: "interior", room: true, intervention: true, hint: "Room photo to redesign · Ảnh phòng cần thiết kế lại" },
  "interior-staging": { scope: "interior", room: true, hint: "Empty room photo to stage · Ảnh phòng trống cần bài trí" },
  "interior-declutter": { remove: true, hint: "Room photo to declutter · Ảnh phòng cần dọn đồ" },
  "interior-sketch": { scope: "interior", room: true, hint: "Room sketch · Bản phác thảo phòng" },
  "interior-material": { surface: true, hint: "Room photo to retexture · Ảnh phòng cần đổi vật liệu" },
  "interior-paint": { paint: true, hint: "Room photo to repaint · Ảnh phòng cần sơn lại" },
  "interior-floor": { floor: true, hint: "Room photo with a visible floor · Ảnh phòng thấy rõ sàn" },
  "exterior-redesign": { scope: "exterior", angle: true, hint: "House exterior photo · Ảnh mặt ngoài ngôi nhà" },
  "exterior-sky": { weather: true, hint: "House exterior photo · Ảnh mặt ngoài ngôi nhà" },
  "exterior-sketch": { scope: "exterior", hint: "House sketch · Bản phác thảo ngôi nhà" },
  "exterior-paint": { paint: true, hint: "House exterior photo · Ảnh mặt ngoài ngôi nhà" },
  "garden-redesign": { scope: "garden", hint: "Garden photo · Ảnh khu vườn" },
};

const RES_COST: Record<string, number> = { "1k": 1, "2k": 2, "4k": 3 };

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as any).error ?? "Error · Lỗi");
  return d as T;
}

export function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative mx-auto max-w-2xl select-none overflow-hidden rounded-xl">
      <img src={after} className="block w-full" alt="after" />
      <img src={before} alt="before" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} className="absolute inset-x-0 bottom-2 w-full" aria-label={bi("Compare before/after · So sánh trước/sau")} />
    </div>
  );
}

export function useGenerator(tool: ToolId, preset: Preset | undefined, onCreditsChange: () => void) {
  const cfg = CFG[tool];
  const [meta, setMeta] = useState<Meta | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [style, setStyle] = useState("");
  const [room, setRoom] = useState("Living room");
  const [lvl, setLvl] = useState(2);
  const [custom, setCustom] = useState("");
  const [res, setRes] = useState("1k");
  const [remove, setRemove] = useState<string[]>(["furniture"]);
  const [surface, setSurface] = useState("floor");
  const [material, setMaterial] = useState("");
  const [weather, setWeather] = useState("");
  const [angle, setAngle] = useState("front");
  const [color, setColor] = useState("Sage green");
  const [paintFinish, setPaintFinish] = useState("matte");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [gen, setGen] = useState<Gen | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const timer = useRef<number | undefined>(undefined);

  const loadHistory = () => j<{ items: any[] }>("/api/generations").then((d) => setHistory(d.items)).catch(() => {});
  useEffect(() => {
    j<Meta>("/api/styles").then((m) => { setMeta(m); setWeather(m.weather[0]); });
    loadHistory();
    return () => clearTimeout(timer.current);
  }, []);

  // Reset per-tool state when the user switches tools.
  const styles = meta?.styles.filter((s) => s.scope === cfg.scope) ?? [];
  useEffect(() => {
    clearTimeout(timer.current);
    setGen(null); setErr(""); setBusy(false);
    setStyle(preset?.styleSlug && styles.some((s) => s.slug === preset.styleSlug) ? preset.styleSlug : styles[0]?.slug ?? "");
    if (preset?.roomType) setRoom(preset.roomType);
    if (preset?.intervention && meta) setLvl(Math.max(0, meta.intervention.indexOf(preset.intervention)));
    if (preset?.remove?.length) setRemove(preset.remove);
    if (preset?.weather) setWeather(preset.weather);
    if (preset?.angle) setAngle(preset.angle);
    if (preset?.surface) setSurface(preset.surface);
    if (cfg.floor) setSurface("floor");
    if (preset?.color) setColor(preset.color);
    if (preset?.finish) setPaintFinish(preset.finish);
  }, [tool, meta, preset]);
  useEffect(() => {
    if (!meta) return;
    const list = meta.surfaces[surface];
    setMaterial(preset?.surface === surface && preset.material && list.includes(preset.material) ? preset.material : list[0]);
  }, [surface, meta, preset]);

  const togglePublic = async () => {
    if (!gen) return;
    if (!gen.public && !confirm(bi("Publish to community gallery? · Đăng lên thư viện cộng đồng? Cả ảnh gốc và ảnh kết quả sẽ hiển thị công khai (không kèm email)."))) return;
    try {
      const r = await j<{ public: boolean }>(`/api/generations/${gen.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ public: !gen.public }) });
      setGen({ ...gen, public: r.public }); loadHistory();
    } catch (e: any) { setErr(e.message); }
  };
  const remove_ = async () => {
    if (!gen || !confirm(bi("Delete this design permanently? · Xoá vĩnh viễn thiết kế này?"))) return;
    try { await j(`/api/generations/${gen.id}`, { method: "DELETE" }); setGen(null); loadHistory(); } catch (e: any) { setErr(e.message); }
  };

  const pick = (f?: File) => {
    if (!f) return;
    setFile(f); setGen(null); setErr("");
    setPreview(URL.createObjectURL(f));
  };

  const poll = (id: string) => {
    timer.current = window.setTimeout(async () => {
      try {
        const g = await j<Gen>(`/api/generations/${id}`);
        setGen(g);
        if (g.status === "RUNNING" || g.status === "QUEUED") return poll(id);
        setBusy(false); onCreditsChange(); loadHistory();
        if (g.status === "FAILED") setErr(g.error || "Generation failed (credits refunded) · Tạo ảnh thất bại (đã hoàn credits)");
      } catch (e: any) { setErr(e.message); setBusy(false); }
    }, 4000);
  };

  const run = async () => {
    if (!file || !meta) return;
    setBusy(true); setErr(""); setGen(null);
    try {
      const { key } = await j<{ key: string }>("/api/upload", { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const g = await j<{ id: string }>("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool, inputKey: key, custom, resolution: res,
          ...(cfg.scope ? { styleSlug: style } : {}),
          ...(cfg.room ? { roomType: room } : {}),
          ...(cfg.intervention ? { intervention: meta.intervention[lvl] } : {}),
          ...(cfg.remove ? { remove } : {}),
          ...(cfg.surface ? { surface, material } : {}),
          ...(cfg.floor ? { surface: "floor", material } : {}),
          ...(cfg.paint ? { color, finish: paintFinish } : {}),
          ...(cfg.weather ? { weather } : {}),
          ...(cfg.angle ? { angle } : {}),
        }),
      });
      onCreditsChange();
      poll(g.id);
    } catch (e: any) { setErr(e.message); setBusy(false); onCreditsChange(); }
  };

  return { cfg, meta, file, preview, style, setStyle, room, setRoom, lvl, setLvl, custom, setCustom, res, setRes, remove, setRemove, surface, setSurface, material, setMaterial, weather, setWeather, angle, setAngle, color, setColor, paintFinish, setPaintFinish, busy, err, gen, setGen, history, styles, pick, run, togglePublic, remove_, loadHistory };
}

export function GeneratePanel({ tool, preset, onCreditsChange }: { tool: ToolId; preset?: Preset; onCreditsChange: () => void }) {
  const { cfg, meta, file, preview, style, setStyle, room, setRoom, lvl, setLvl, custom, setCustom, res, setRes, remove, setRemove, surface, setSurface, material, setMaterial, weather, setWeather, angle, setAngle, color, setColor, paintFinish, setPaintFinish, busy, err, gen, setGen, history, styles, pick, run, togglePublic, remove_, loadHistory } = useGenerator(tool, preset, onCreditsChange);
  if (!meta) return <p className="mt-8 text-center text-neutral-500">{bi("Loading… · Đang tải…")}</p>;
  const field = "w-full rounded border p-2";
  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <label className="flex min-h-48 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed">
          {preview ? <img src={preview} className="max-h-72 w-full object-contain" alt="ảnh gốc" /> : <span className="px-4 text-center text-neutral-500">{bi(cfg.hint)} (JPG/PNG/WebP, ≤10MB)</span>}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {cfg.room && <select className={field} value={room} onChange={(e) => setRoom(e.target.value)}>{meta.roomTypes.map((r) => <option key={r} value={r}>{bi(r)}</option>)}</select>}
        {cfg.scope && <select className={field} value={style} onChange={(e) => setStyle(e.target.value)}>{styles.map((s) => <option key={s.slug} value={s.slug}>{bi(s.name)}</option>)}</select>}
        {cfg.angle && <select className={field} value={angle} onChange={(e) => setAngle(e.target.value)}>{meta.angles.map((a) => <option key={a} value={a}>{bi("View · Góc nhìn")}: {bi(a)}</option>)}</select>}
        {cfg.weather && <select className={field} value={weather} onChange={(e) => setWeather(e.target.value)}>{meta.weather.map((w) => <option key={w} value={w}>{bi(w)}</option>)}</select>}
        {cfg.remove && (
          <div className="flex flex-wrap gap-3 text-sm">
            {meta.remove.map((r) => (
              <label key={r} className="flex items-center gap-1">
                <input type="checkbox" checked={remove.includes(r)} onChange={(e) => setRemove(e.target.checked ? [...remove, r] : remove.filter((x) => x !== r))} />{r}
              </label>
            ))}
          </div>
        )}
        {cfg.surface && (
          <>
            <select className={field} value={surface} onChange={(e) => setSurface(e.target.value)}>{Object.keys(meta.surfaces).map((s) => <option key={s} value={s}>{bi(s)}</option>)}</select>
            <select className={field} value={material} onChange={(e) => setMaterial(e.target.value)}>{meta.surfaces[surface].map((m) => <option key={m} value={m}>{bi(m)}</option>)}</select>
          </>
        )}
        {cfg.floor && <select className={field} value={material} onChange={(e) => setMaterial(e.target.value)}>{meta.surfaces.floor.map((m) => <option key={m} value={m}>{bi(m)}</option>)}</select>}
        {cfg.paint && (
          <div className="flex flex-wrap items-center gap-2">
            {meta.paints.map((c) => (
              <button key={c.name} type="button" title={bi(c.name)} aria-label={bi(c.name)} onClick={() => setColor(c.name)}
                className={`h-8 w-8 rounded-full border ${color === c.name ? "ring-2 ring-black ring-offset-2" : ""}`} style={{ background: c.hex }} />
            ))}
            <label className="flex items-center gap-1 text-sm">{bi("Custom · Tuỳ chọn")}
              <input type="color" value={color.startsWith("#") ? color : meta.paints.find((c) => c.name === color)?.hex ?? "#ffffff"} onChange={(e) => setColor(e.target.value)} />
            </label>
            <select className={field} value={paintFinish} onChange={(e) => setPaintFinish(e.target.value)}>{meta.finishes.map((f) => <option key={f} value={f}>{bi("Finish · Độ bóng")}: {bi(f)}</option>)}</select>
          </div>
        )}
        {cfg.intervention && (
          <label className="text-sm">{bi("AI intervention · Mức can thiệp AI: ")}<b>{bi(meta.intervention[lvl])}</b>
            <input type="range" min={0} max={4} value={lvl} onChange={(e) => setLvl(+e.target.value)} className="w-full" />
          </label>
        )}
        <textarea className={field} rows={2} maxLength={500} placeholder={bi("Extra instructions (optional) · Yêu cầu thêm (tuỳ chọn)")} value={custom} onChange={(e) => setCustom(e.target.value)} />
        <select className={field} value={res} onChange={(e) => setRes(e.target.value)}>
          {Object.entries(RES_COST).map(([k, c]) => <option key={k} value={k}>{k.toUpperCase()} · {c} credit{c > 1 ? "s" : ""}</option>)}
        </select>
        {err && <p className="text-sm text-red-600">{bi(err)}</p>}
        <button disabled={!file || busy} onClick={run} className="rounded bg-black py-3 text-white disabled:opacity-40">{busy ? bi("Generating… (1–2 min) · Đang tạo…") : bi("Generate · Tạo thiết kế")}</button>
      </div>
      <div>
        {gen?.status === "SUCCESS" && gen.outputUrl ? (
          <>
            <BeforeAfter before={gen.inputUrl} after={gen.outputUrl} />
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href={gen.outputUrl} download={`design-${gen.id}.png`} className="rounded border px-4 py-2">{bi("Download · Tải ảnh xuống")}</a>
              <button onClick={togglePublic} className="rounded border px-4 py-2">{gen.public ? bi("Unpublish · Gỡ khỏi thư viện") : bi("Publish · Đăng lên thư viện")}</button>
              <button onClick={remove_} className="rounded border px-4 py-2 text-red-600">{bi("Delete · Xoá")}</button>
            </div>
          </>
        ) : <div className="flex h-full min-h-48 items-center justify-center rounded-xl border text-neutral-400">{busy ? bi("Processing… · Đang xử lý…") : bi("Result appears here · Kết quả sẽ hiện ở đây")}</div>}
      </div>
      {history.length > 0 && (
        <div className="md:col-span-2">
          <h3 className="mb-2 font-semibold">{bi("History · Lịch sử")}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {history.filter((h) => h.outputUrl).map((h) => (
              <button key={h.id} onClick={() => setGen({ id: h.id, status: "SUCCESS", public: h.public, inputUrl: h.inputUrl, outputUrl: h.outputUrl })} className="overflow-hidden rounded-lg border">
                <img src={h.outputUrl} loading="lazy" className="aspect-square w-full object-cover" alt={h.tool} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
