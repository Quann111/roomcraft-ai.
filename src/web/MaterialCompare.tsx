import React, { useEffect, useRef, useState } from "react";
import { bi, t } from "./i18n";

export const MAX_COMPARE = 4; // matches MAX_COMPARE in the worker
type Item = { id?: string; material: string; status: string; outputUrl?: string | null; error?: string };

/** Runs a material comparison (one generation per material, in parallel) and polls each result. */
export function useCompare(onCredits: () => void) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const poll = (id: string) => {
    timers.current.push(window.setTimeout(async () => {
      try {
        const g: any = await fetch(`/api/generations/${id}`).then((r) => r.json());
        setItems((a) => a.map((x) => (x.id === id ? { ...x, status: g.status, outputUrl: g.outputUrl, error: g.error } : x)));
        if (g.status === "RUNNING" || g.status === "QUEUED") poll(id); else onCredits();
      } catch { poll(id); }
    }, 5000));
  };

  const run = async (o: { tool: string; file: File; surface: string; materials: string[]; resolution: string; aspectRatio?: string; custom: string; autoCheck?: boolean }) => {
    setBusy(true); setErr(""); setItems([]);
    try {
      const up = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": o.file.type }, body: o.file });
      const u: any = await up.json();
      if (!up.ok) throw new Error(u.error ?? "Upload failed · Tải ảnh thất bại");
      const r = await fetch("/api/compare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: o.tool, inputKey: u.key, surface: o.surface, materials: o.materials, resolution: o.resolution, aspectRatio: o.aspectRatio, custom: o.custom, ...(o.autoCheck ? { autoCheck: true } : {}) }),
      });
      const d: any = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Error · Lỗi");
      setItems(d.items.map((x: any) => ({ ...x, status: x.error ? "FAILED" : "RUNNING" })));
      d.items.forEach((x: any) => x.id && poll(x.id));
      onCredits();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const running = items.some((x) => x.status === "RUNNING" || x.status === "QUEUED");
  return { items, busy: busy || running, err, run, reset: () => setItems([]) };
}

/** The original next to every material; clicking a tile opens it in the before/after slider above. */
export function CompareResults({ original, items, Compare }: { original: string; items: Item[]; Compare: (p: { before: string | null; after: string }) => React.ReactElement }) {
  const [sel, setSel] = useState(0);
  const done = items.filter((x) => x.status === "SUCCESS" && x.outputUrl);
  const current = done[Math.min(sel, done.length - 1)];
  const tile: React.CSSProperties = { margin: 0, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, overflow: "hidden", background: "#fff", padding: 0, textAlign: "left", font: "inherit", cursor: "pointer" };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {current?.outputUrl && <Compare before={original} after={current.outputUrl} />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))", gap: 8 }}>
        <figure style={{ ...tile, cursor: "default" }}>
          <img src={original} alt="" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }} />
          <figcaption style={{ padding: "6px 8px", fontSize: 13, fontWeight: 600 }}>{t("Original", "Ảnh gốc")}</figcaption>
        </figure>
        {items.map((x, i) => {
          const k = done.indexOf(x);
          const ok = k >= 0;
          return (
            <button key={x.id ?? i} type="button" disabled={!ok} onClick={() => setSel(k)} style={{ ...tile, outline: ok && current === x ? "2px solid #1c1b19" : "none", cursor: ok ? "pointer" : "default" }} aria-label={bi(x.material)}>
              <div style={{ aspectRatio: "4 / 3", display: "grid", placeItems: "center", background: "#f4f1ea" }}>
                {ok ? <img src={x.outputUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <span style={{ fontSize: 12, opacity: 0.7, padding: 6, textAlign: "center" }}>{x.status === "FAILED" ? t("Failed (credit refunded)", "Lỗi (đã hoàn credit)") : t("Rendering…", "Đang render…")}</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6, padding: "6px 8px", fontSize: 13 }}>
                <b style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bi(x.material)}</b>
                {ok && <a href={x.outputUrl!} download={`${x.material}.png`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 12 }}>↓</a>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
