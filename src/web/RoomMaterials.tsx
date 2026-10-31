import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AiThinking } from "./AiThinking";
import { DownloadLink } from "./SaveToPhotos";
import { FinishPicker } from "./FinishPicker";
import { SlabGrid, SLAB_SURFACES, swatchDir, slabLabel } from "./SlabGrid";
import type { Slab } from "./GeneratePanel";
import { bi, t } from "./i18n";

type Meta = { surfaces: Record<string, string[]>; floorTiles?: { name: string; code: string; thumb: string }[]; slabs?: Slab[] };
export type RunRow = { id: string; params: any; status: string; error?: string | null; createdAt: number; outputUrl: string | null };
const ink = "#1c1b19", line = "rgba(0,0,0,0.12)";
const slug = (m: string) => m.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const running = (r?: RunRow) => r?.status === "RUNNING" || r?.status === "QUEUED";
const done = (r?: RunRow) => !!r && r.status === "SUCCESS" && !!r.outputUrl;
let metaCache: Promise<Meta> | null = null;

// Two columns on wide screens (image | materials), stacked on phones.
const CSS = `
.rm-wrap { position: fixed; inset: 0; z-index: 1500; display: grid; place-items: center; padding: 16px; background: rgba(28,27,25,.38); -webkit-backdrop-filter: blur(14px) saturate(1.1); backdrop-filter: blur(14px) saturate(1.1); }
.rm-box { width: min(1240px, 100%); height: min(860px, calc(100vh - 32px)); display: grid; grid-template-columns: minmax(0, 1fr) 380px; overflow: hidden; border-radius: 16px; background: #fff; color: ${ink}; box-shadow: 0 30px 80px rgba(0,0,0,.28); }
.rm-view { position: relative; min-height: 0; display: grid; grid-template-rows: minmax(0, 1fr) auto; background: #f4f1ea; }
.rm-stage { position: relative; min-height: 0; display: grid; place-items: center; padding: 16px; }
.rm-stage img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 8px 28px rgba(0,0,0,.12); }
.rm-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 16px; border-top: 1px solid ${line}; background: #fff; font-size: 12px; }
.rm-side { min-height: 0; overflow-y: auto; display: grid; align-content: start; gap: 12px; padding: 16px; border-left: 1px solid ${line}; }
@media (max-width: 860px) {
  .rm-wrap { padding: 0; place-items: stretch; }
  .rm-box { height: 100%; border-radius: 0; grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
  .rm-view { max-height: 46vh; }
  .rm-side { border-left: 0; border-top: 1px solid ${line}; }
}`;

/**
 * One room of a Business 3D Floorplan run, opened over a blurred page: the render large on the left with its versions, and
 * Material Swap on the right (swatches, VICOSTONE tiles on the floor, a finish per surface). Each change is an in-place edit
 * of the version on screen; it joins the run as a new version and appears here when ready, so changes can be chained.
 */
export function RoomMaterials({ batchId, name, versions, onClose, onStarted }: { batchId: string; name: string; versions: RunRow[]; onClose: () => void; onStarted: () => void }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [surface, setSurface] = useState("floor");
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [finishes, setFinishes] = useState<Record<string, string>>({});
  const [autoCheck, setAutoCheck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [at, setAt] = useState(versions.length - 1);
  const [count, setCount] = useState(versions.length);
  useEffect(() => { (metaCache ??= fetch("/api/styles").then((r) => r.json() as Promise<Meta>)).then(setMeta).catch(() => setErr("Could not load materials · Không tải được vật liệu")); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, []);
  useEffect(() => { const o = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = o; }; }, []);
  // A version that just started (or appeared) is shown at once.
  useEffect(() => { if (versions.length !== count) { setCount(versions.length); setAt(versions.length - 1); } }, [versions.length]);

  const i = Math.min(at, versions.length - 1), shown = versions[i];
  const base = done(shown) ? shown : [...versions].reverse().find(done); // the version a change is applied to
  const toggle = (s: string, m: string) => setPicks((p) => { const n = { ...p }; if (n[s] === m) delete n[s]; else n[s] = m; return n; });
  const entries = Object.entries(picks);
  const isTile = (m?: string) => !!m && !!meta?.floorTiles?.some((x) => x.name === m);
  const slabOf = (m?: string) => (m ? meta?.slabs?.find((x) => x.name === m) : undefined);
  const fixed = (m?: string) => isTile(m);
  const tile = isTile(picks.floor);
  const slab = Object.values(picks).some((m) => !!slabOf(m));
  // Sheen only for picked surfaces that are not VICOSTONE tiles (those come polished).
  const fin = Object.fromEntries(Object.entries(finishes).filter(([s]) => picks[s] && !fixed(picks[s])));
  const run = async () => {
    if (!base) return;
    setBusy(true); setErr("");
    try {
      const [s, m] = entries[0];
      const body = entries.length > 1 || slab ? { tool: "interior-material", changes: picks, finishes: fin } : s === "floor" ? { tool: "interior-floor", surface: "floor", material: m, finish: fin.floor } : { tool: "interior-material", surface: s, material: m, finish: fin[s] };
      const r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, planRun: { batchId, id: base.id }, resolution: "1k", aspectRatio: "4:3", ...((tile || slab) && autoCheck ? { autoCheck: true } : {}) }) });
      const d: any = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Error · Lỗi");
      setPicks({}); setFinishes({}); onStarted();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const cell = (key: string, label: string, img: string, on: boolean, click: () => void) => (
    <button key={key} type="button" title={label} aria-pressed={on} onClick={click}
      style={{ display: "block", minWidth: 0, padding: 0, borderRadius: 8, overflow: "hidden", background: "#fff", cursor: "pointer", textAlign: "left", border: "1px solid #e2ded6", outline: on ? `2px solid ${ink}` : "none", outlineOffset: -1 }}>
      <img src={img} alt="" loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "1", objectFit: "cover" }} />
      <span style={{ display: "block", padding: 4, fontSize: 10, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 };
  const nav: React.CSSProperties = { padding: "4px 10px", border: `1px solid ${line}`, borderRadius: 99, background: "#fff", fontFamily: "inherit", fontSize: 12, cursor: "pointer" };
  const finishOf = (r: RunRow, s: string) => r.params.finishes?.[s] ?? (r.params.changes ? undefined : r.params.finish);
  const materials = (r?: RunRow) => r?.params?.changes || r?.params?.material
    ? Object.entries(r.params.changes ?? { [r.params.surface ?? "floor"]: r.params.material }).map(([s, m]) => `${bi(s)} · ${bi(String(m))}${finishOf(r, s) ? ` · ${bi(finishOf(r, s))}` : ""}`).join(", ")
    : "";

  return createPortal(
    <div className="rm-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{CSS}</style>
      <div className="rm-box" role="dialog" aria-modal="true" aria-label={`${t("Change materials", "Đổi vật liệu")} · ${name}`}>
        <div className="rm-view">
          <div className="rm-stage">
            {done(shown) ? <img src={shown.outputUrl!} alt={name} />
              : shown?.status === "FAILED" ? <span style={{ fontSize: 13, opacity: 0.7, textAlign: "center" }}>{`${t("Failed (credit refunded)", "Lỗi (đã hoàn credit)")}${shown.error ? ` · ${bi(shown.error)}` : ""}`}</span>
              : <AiThinking />}
          </div>
          <div className="rm-bar">
            {versions.length > 1 && <>
              <button type="button" style={{ ...nav, opacity: i === 0 ? 0.4 : 1 }} disabled={i === 0} onClick={() => setAt(i - 1)} aria-label={t("Older version", "Bản trước")}>‹</button>
              <span>{t("Version", "Phiên bản")} {i + 1}/{versions.length}</span>
              <button type="button" style={{ ...nav, opacity: i === versions.length - 1 ? 0.4 : 1 }} disabled={i === versions.length - 1} onClick={() => setAt(i + 1)} aria-label={t("Newer version", "Bản sau")}>›</button>
            </>}
            <span style={{ flex: 1, minWidth: 120, opacity: 0.7 }}>{running(shown) ? t("Changing materials…", "Đang đổi vật liệu…") : materials(shown)}</span>
            {done(shown) && <DownloadLink url={shown.outputUrl!} name={`${name}.png`} style={{ ...nav, textDecoration: "none", color: ink }} phone={t("Save to Photos", "Lưu vào Ảnh")}>{t("Download", "Tải xuống")}</DownloadLink>}
          </div>
        </div>

        <div className="rm-side">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}><b style={{ fontSize: 16 }}>{name}</b>
              <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.7 }}>{t("Pick materials; the change is applied to the version on screen and added as a new version.", "Chọn vật liệu; thay đổi áp dụng lên phiên bản đang xem và được thêm thành phiên bản mới.")}</p></div>
            <button type="button" onClick={onClose} aria-label={t("Close", "Đóng")} style={{ border: 0, background: "none", fontSize: 24, lineHeight: 1, cursor: "pointer", padding: "0 4px" }}>×</button>
          </div>
          {!meta ? <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{err ? bi(err) : t("Loading…", "Đang tải…")}</p> : <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, padding: 3, border: `1px solid ${line}`, borderRadius: 8, background: "#faf8f3" }}>
              {Object.keys(meta.surfaces).map((s) => (
                <button key={s} type="button" onClick={() => setSurface(s)} style={{ flex: "1 1 auto", padding: "7px 6px", border: 0, borderRadius: 6, fontSize: 12, cursor: "pointer", background: s === surface ? ink : "transparent", color: s === surface ? "#fff" : ink, fontFamily: "inherit" }}>{bi(s)}{picks[s] ? " ✓" : ""}</button>
              ))}
            </div>
            {entries.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 12 }}>
                <span style={{ opacity: 0.7 }}>{t("Will change:", "Sẽ đổi:")}</span>
                {entries.map(([s, m]) => (
                  <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 4px 3px 8px", border: `1px solid ${line}`, borderRadius: 99 }}>
                    <b>{bi(s)}</b> · {slabOf(m) ? slabLabel(slabOf(m)!) : bi(m)}{fin[s] ? ` · ${bi(fin[s])}` : ""}<button type="button" aria-label={t("Remove", "Bỏ")} onClick={() => toggle(s, m)} style={{ border: 0, background: "none", cursor: "pointer", padding: "0 4px", opacity: 0.6 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div style={grid}>{meta.surfaces[surface].map((m) => cell(m, bi(m), `/materials/${swatchDir(surface)}/${slug(m)}.jpg`, picks[surface] === m, () => toggle(surface, m)))}</div>
            {surface === "floor" && !!meta.floorTiles?.length && <>
              <b style={{ fontSize: 13 }}>{t("VICOSTONE tiles · 120 × 120 cm, polished", "Gạch VICOSTONE · 120 × 120 cm, bóng kiếng")}</b>
              <div style={grid}>{meta.floorTiles.map((x) => cell(x.name, x.code, x.thumb, picks.floor === x.name, () => toggle("floor", x.name)))}</div>
            </>}
            {SLAB_SURFACES.includes(surface) && !!meta.slabs?.length && <SlabGrid slabs={meta.slabs} active={(n) => picks[surface] === n} pick={(n) => toggle(surface, n)} />}
            {picks[surface] && !fixed(picks[surface]) && <>
              <b style={{ fontSize: 13 }}>{t("Finish", "Độ bóng")} · {bi(surface)}</b>
              <FinishPicker optional value={finishes[surface]} onChange={(f) => setFinishes((p) => { const n = { ...p }; if (f) n[surface] = f; else delete n[surface]; return n; })} />
            </>}
            {(tile || slab) && (
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
                <input type="checkbox" checked={autoCheck} onChange={(e) => setAutoCheck(e.target.checked)} style={{ marginTop: 2 }} />
                <span>{t("Auto-check the result: if a rug, person or object was lost, redo it once (no extra credit)", "Tự kiểm tra kết quả: nếu mất thảm, người hoặc đồ vật thì tự tạo lại 1 lần (không tốn thêm credit)")}</span>
              </label>
            )}
            {err && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>{bi(err)}</p>}
            <button type="button" disabled={busy || !entries.length || !base} onClick={run} style={{ position: "sticky", bottom: 0, padding: "12px 16px", borderRadius: 10, border: "none", background: ink, color: "#fff", cursor: busy || !entries.length ? "default" : "pointer", opacity: busy || !entries.length || !base ? 0.45 : 1, fontFamily: "inherit", fontSize: 14 }}>
              {busy ? t("Starting…", "Đang bắt đầu…") : !entries.length ? t("Pick a material for at least one surface", "Hãy chọn vật liệu cho ít nhất một bề mặt") : entries.length > 1 ? t(`Change ${entries.length} surfaces · 1 credit`, `Đổi ${entries.length} bề mặt · 1 credit`) : t("Change material · 1 credit", "Đổi vật liệu · 1 credit")}
            </button>
          </>}
        </div>
      </div>
    </div>, document.body,
  );
}
