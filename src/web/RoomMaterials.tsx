import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { bi, t } from "./i18n";

type Meta = { surfaces: Record<string, string[]>; floorTiles?: { name: string; code: string; thumb: string }[] };
const ink = "#1c1b19", line = "rgba(0,0,0,0.12)";
const slug = (m: string) => m.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let metaCache: Promise<Meta> | null = null;

/**
 * Material Swap for one room of a Business 3D Floorplan run, in a window over the run: pick a material per surface (swatches,
 * VICOSTONE tiles on the floor), and the room's render is edited in place; the result joins the run as a new version.
 */
export function RoomMaterials({ batchId, room, onClose, onStarted }: { batchId: string; room: { id: string; name: string; url: string }; onClose: () => void; onStarted: () => void }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [surface, setSurface] = useState("floor");
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [autoCheck, setAutoCheck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { (metaCache ??= fetch("/api/styles").then((r) => r.json() as Promise<Meta>)).then(setMeta).catch(() => setErr("Could not load materials · Không tải được vật liệu")); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, []);

  const toggle = (s: string, m: string) => setPicks((p) => { const n = { ...p }; if (n[s] === m) delete n[s]; else n[s] = m; return n; });
  const entries = Object.entries(picks);
  const tile = !!picks.floor && !!meta?.floorTiles?.some((x) => x.name === picks.floor);
  const run = async () => {
    setBusy(true); setErr("");
    try {
      const [s, m] = entries[0];
      const body = entries.length > 1 ? { tool: "interior-material", changes: picks } : s === "floor" ? { tool: "interior-floor", surface: "floor", material: m } : { tool: "interior-material", surface: s, material: m };
      const r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, planRun: { batchId, id: room.id }, resolution: "1k", aspectRatio: "4:3", ...(tile && autoCheck ? { autoCheck: true } : {}) }) });
      const d: any = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Error · Lỗi");
      onStarted(); onClose();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const cell = (key: string, label: string, img: string, on: boolean, click: () => void) => (
    <button key={key} type="button" title={label} aria-pressed={on} onClick={click}
      style={{ display: "block", minWidth: 0, padding: 0, borderRadius: 8, overflow: "hidden", background: "#fff", cursor: "pointer", textAlign: "left", border: "1px solid #e2ded6", outline: on ? `2px solid ${ink}` : "none", outlineOffset: -1 }}>
      <img src={img} alt="" loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "1", objectFit: "cover" }} />
      <span style={{ display: "block", padding: 4, fontSize: 10, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))", gap: 8 };

  return createPortal(
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 1500, display: "grid", placeItems: "center", padding: 12, background: "rgba(0,0,0,0.55)" }}>
      <div role="dialog" aria-label={t("Change materials", "Đổi vật liệu")} style={{ width: "min(720px, 100%)", maxHeight: "92vh", overflowY: "auto", display: "grid", gap: 12, padding: 16, borderRadius: 14, background: "#fff", color: ink }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={room.url} alt="" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8, flex: "0 0 auto" }} />
          <div style={{ minWidth: 0, flex: 1 }}><b style={{ fontSize: 15 }}>{t("Change materials", "Đổi vật liệu")} · {room.name}</b>
            <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.7 }}>{t("The result is added to this room as a new version.", "Kết quả được thêm vào phòng này thành một phiên bản mới.")}</p></div>
          <button type="button" onClick={onClose} aria-label={t("Close", "Đóng")} style={{ border: 0, background: "none", fontSize: 20, cursor: "pointer", alignSelf: "flex-start" }}>×</button>
        </div>
        {!meta ? <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{err ? bi(err) : t("Loading…", "Đang tải…")}</p> : <>
          <div className="segmented" style={{ display: "flex", flexWrap: "wrap", gap: 3, padding: 3, border: `1px solid ${line}`, borderRadius: 8, background: "#faf8f3" }}>
            {Object.keys(meta.surfaces).map((s) => (
              <button key={s} type="button" onClick={() => setSurface(s)} style={{ flex: 1, padding: "7px 6px", border: 0, borderRadius: 6, fontSize: 12, cursor: "pointer", background: s === surface ? ink : "transparent", color: s === surface ? "#fff" : ink }}>{bi(s)}{picks[s] ? " ✓" : ""}</button>
            ))}
          </div>
          {entries.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 12 }}>
              <span style={{ opacity: 0.7 }}>{t("Will change:", "Sẽ đổi:")}</span>
              {entries.map(([s, m]) => (
                <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 4px 3px 8px", border: `1px solid ${line}`, borderRadius: 99 }}>
                  <b>{bi(s)}</b> · {bi(m)}<button type="button" aria-label={t("Remove", "Bỏ")} onClick={() => toggle(s, m)} style={{ border: 0, background: "none", cursor: "pointer", padding: "0 4px", opacity: 0.6 }}>×</button>
                </span>
              ))}
            </div>
          )}
          <div style={grid}>{meta.surfaces[surface].map((m) => cell(m, bi(m), `/materials/${surface}/${slug(m)}.jpg`, picks[surface] === m, () => toggle(surface, m)))}</div>
          {surface === "floor" && !!meta.floorTiles?.length && <>
            <b style={{ fontSize: 13 }}>{t("VICOSTONE tiles · 120 × 120 cm, polished", "Gạch VICOSTONE · 120 × 120 cm, bóng kiếng")}</b>
            <div style={grid}>{meta.floorTiles.map((x) => cell(x.name, x.code, x.thumb, picks.floor === x.name, () => toggle("floor", x.name)))}</div>
          </>}
          {tile && (
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
              <input type="checkbox" checked={autoCheck} onChange={(e) => setAutoCheck(e.target.checked)} style={{ marginTop: 2 }} />
              <span>{t("Auto-check the result: if a rug, person or object was lost, redo it once (no extra credit)", "Tự kiểm tra kết quả: nếu mất thảm, người hoặc đồ vật thì tự tạo lại 1 lần (không tốn thêm credit)")}</span>
            </label>
          )}
          {err && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>{bi(err)}</p>}
          <button type="button" disabled={busy || !entries.length} onClick={run} style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: ink, color: "#fff", cursor: busy || !entries.length ? "default" : "pointer", opacity: busy || !entries.length ? 0.45 : 1, font: "inherit" }}>
            {busy ? t("Starting…", "Đang bắt đầu…") : !entries.length ? t("Pick a material for at least one surface", "Hãy chọn vật liệu cho ít nhất một bề mặt") : entries.length > 1 ? t(`Change ${entries.length} surfaces · 1 credit`, `Đổi ${entries.length} bề mặt · 1 credit`) : t("Change material · 1 credit", "Đổi vật liệu · 1 credit")}
          </button>
        </>}
      </div>
    </div>, document.body,
  );
}
