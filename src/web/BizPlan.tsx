import React, { useEffect, useRef, useState } from "react";
import { AiThinking } from "./AiThinking";
import { bi, t } from "./i18n";
import { prepareImage, type PreparedImage } from "./imagePrep";

type Room = { name: string; view: string; on: boolean };
type Item = { id?: string; room: string; status: string; outputUrl?: string | null; error?: string };
/** One earlier render run: the plan and every room rendered from it, grouped by the batch id the worker stores. */
type Batch = { id: string; at: number; plan: string | null; style: string; rooms: { id: string; room: string; outputUrl: string | null; status: string }[] };
const MAX_ROOMS = 8; // matches MAX_PLAN_ROOMS in the worker
const ink = "#1c1b19", line = "rgba(0,0,0,0.12)";

/** Business 3D Floorplan: upload a plan, review the detected rooms, render each one (1 credit per room). */
export function BizPlan({ onCreditsChange }: { onCreditsChange?: () => void }) {
  const [styles, setStyles] = useState<{ slug: string; name: string }[]>([]);
  const [style, setStyle] = useState("");
  const [plan, setPlan] = useState<{ prep: PreparedImage; url: string } | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [home, setHome] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<"" | "detect" | "render">("");
  const [err, setErr] = useState("");
  const [history, setHistory] = useState<Batch[] | null>(null);
  const timers = useRef<number[]>([]);

  // The page has no shared "Latest designs" list, so earlier runs are listed here from the saved generations.
  const loadHistory = () => fetch("/api/generations?tool=interior-bizplan&limit=300").then((r) => r.json() as Promise<any>).then((d) => {
    const groups = new Map<string, Batch>();
    for (const g of d.items ?? []) {
      if (g.tool !== "interior-bizplan" || g.status === "FAILED") continue;
      const id = g.params?.batchId ?? g.id;
      const b: Batch = groups.get(id) ?? { id, at: g.createdAt, plan: g.inputUrl, style: g.params?.styleSlug ?? "", rooms: [] };
      b.at = Math.max(b.at, g.createdAt);
      b.rooms.push({ id: g.id, room: g.params?.roomType ?? "", outputUrl: g.outputUrl, status: g.status });
      groups.set(id, b);
    }
    setHistory([...groups.values()].sort((a, b) => b.at - a.at));
  }).catch(() => setHistory([]));

  useEffect(() => {
    fetch("/api/styles").then((r) => r.json() as Promise<any>).then((m) => {
      const list = m.styles.filter((s: any) => s.scope === "interior");
      setStyles(list); setStyle(list[0]?.slug ?? "");
    }).catch(() => {});
    loadHistory();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const pick = async (f?: File) => {
    if (!f) return;
    setErr("");
    try { const prep = await prepareImage(f); setPlan({ prep, url: URL.createObjectURL(prep.file) }); setKey(null); setRooms([]); setItems([]); } catch (e: any) { setErr(e.message); }
  };
  const post = async (path: string, body: unknown) => {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error ?? "Error · Lỗi");
    return d;
  };

  const detect = async () => {
    if (!plan) return;
    setBusy("detect"); setErr(""); setItems([]);
    try {
      let k = key;
      if (!k) {
        const up = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": plan.prep.file.type }, body: plan.prep.file });
        const d: any = await up.json();
        if (!up.ok) throw new Error(d.error ?? "Upload failed · Tải ảnh thất bại");
        k = d.key as string; setKey(k);
      }
      const d = await post("/api/bizplan/detect", { inputKey: k });
      setHome(d.home); setRooms(d.rooms.map((r: any) => ({ ...r, on: true })));
    } catch (e: any) { setErr(e.message); } finally { setBusy(""); }
  };

  const poll = (id: string) => {
    timers.current.push(window.setTimeout(async () => {
      try {
        const g: any = await fetch(`/api/generations/${id}`).then((r) => r.json());
        setItems((a) => a.map((x) => (x.id === id ? { ...x, status: g.status, outputUrl: g.outputUrl, error: g.error } : x)));
        if (g.status === "RUNNING" || g.status === "QUEUED") poll(id); else onCreditsChange?.();
      } catch { poll(id); }
    }, 5000));
  };

  const chosen = rooms.filter((r) => r.on && r.name.trim());
  const render = async () => {
    setBusy("render"); setErr("");
    try {
      const d = await post("/api/bizplan/render", { inputKey: key, styleSlug: style, home, rooms: chosen.map(({ name, view }) => ({ name, view })), aspectRatio: "4:3" });
      setItems(d.items.map((x: any) => ({ ...x, status: x.error ? "FAILED" : "RUNNING" })));
      d.items.forEach((x: any) => x.id && poll(x.id));
      onCreditsChange?.();
    } catch (e: any) { setErr(e.message); } finally { setBusy(""); }
  };

  const running = items.some((x) => x.status === "RUNNING" || x.status === "QUEUED");
  // Refresh the history when a run starts (rows exist as RUNNING) and again when it finishes.
  useEffect(() => { if (items.length) loadHistory(); }, [running, items.length]);
  const styleName = (slug: string) => bi(styles.find((x) => x.slug === slug)?.name ?? slug);
  const when = (ms: number) => { const d = new Date(ms), p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  const field: React.CSSProperties = { padding: 8, borderRadius: 8, border: `1px solid ${line}`, font: "inherit", minWidth: 0 };
  const btn = (primary: boolean, disabled: boolean): React.CSSProperties => ({ padding: "10px 16px", borderRadius: 10, border: primary ? "none" : `1px solid ${line}`, background: primary ? ink : "transparent", color: primary ? "#fff" : ink, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, font: "inherit" });

  return (
    <div style={{ display: "grid", gap: 20, textAlign: "left", color: ink }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
        <section style={{ flex: "1 1 280px", minWidth: 0, display: "grid", gap: 12 }}>
          <h4 style={{ margin: 0, fontSize: 15 }}>{t("1. Upload a floor plan", "1. Tải mặt bằng lên")}</h4>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, border: `2px dashed ${line}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", padding: 6 }}>
            {plan ? <img src={plan.url} alt="" style={{ maxHeight: 300, width: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 13, opacity: 0.7, textAlign: "center" }}>{t("A 2D plan with room labels works best", "Mặt bằng 2D có ghi tên phòng cho kết quả tốt nhất")}</span>}
            <input type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <b>{t("Interior style for the whole home", "Phong cách nội thất cho cả căn")}</b>
            <select value={style} onChange={(e) => setStyle(e.target.value)} style={field}>{styles.map((s) => <option key={s.slug} value={s.slug}>{bi(s.name)}</option>)}</select>
          </label>
          <button type="button" disabled={!plan || !!busy} onClick={detect} style={btn(!rooms.length, !plan || !!busy)}>
            {busy === "detect" ? t("Reading the plan… about 15–25 s", "Đang đọc mặt bằng… khoảng 15–25 giây") : rooms.length ? t("Detect rooms again", "Đọc lại các phòng") : t("Detect rooms (free)", "Đọc các phòng (miễn phí)")}
          </button>
        </section>

        <section style={{ flex: "1 1 320px", minWidth: 0, display: "grid", gap: 10, alignContent: "start" }}>
          <h4 style={{ margin: 0, fontSize: 15 }}>{t("2. Rooms to render", "2. Các phòng cần render")}</h4>
          {!rooms.length ? <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{t("Detected rooms appear here. You can untick or rename them before rendering.", "Các phòng đọc được sẽ hiện ở đây. Bạn có thể bỏ chọn hoặc đổi tên trước khi render.")}</p> : (
            <>
              {home && <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{home}</p>}
              {rooms.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" id={`room-${i}`} checked={r.on} onChange={(e) => setRooms((a) => a.map((x, k) => (k === i ? { ...x, on: e.target.checked } : x)))} aria-label={r.name} />
                  <input value={r.name} maxLength={40} onChange={(e) => setRooms((a) => a.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} style={{ ...field, flex: 1 }} aria-label={t("Room name", "Tên phòng")} />
                </div>
              ))}
              <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{t(`1 credit per room · ${chosen.length} selected (max ${MAX_ROOMS})`, `1 credit mỗi phòng · đã chọn ${chosen.length} (tối đa ${MAX_ROOMS})`)}</p>
              <button type="button" disabled={!chosen.length || chosen.length > MAX_ROOMS || !!busy || running} onClick={render} style={btn(true, !chosen.length || !!busy || running)}>
                {busy === "render" ? t("Starting…", "Đang bắt đầu…") : t(`Render ${chosen.length} rooms · ${chosen.length} credits`, `Render ${chosen.length} phòng · ${chosen.length} credit`)}
              </button>
            </>
          )}
          {err && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>{bi(err)}</p>}
        </section>
      </div>

      {items.length > 0 && (
        <section style={{ display: "grid", gap: 10 }}>
          <h4 style={{ margin: 0, fontSize: 15 }}>{t("3. Your renders", "3. Ảnh render")}{running && <span style={{ fontWeight: 400, opacity: 0.7 }}> · {t("1–2 minutes", "1–2 phút")}</span>}</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
            {items.map((x, i) => (
              <figure key={x.id ?? i} style={{ margin: 0, border: `1px solid ${line}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                <div style={{ aspectRatio: "4 / 3", display: "grid", placeItems: "center", background: "#f4f1ea" }}>
                  {x.status === "SUCCESS" && x.outputUrl ? <a href={x.outputUrl} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", height: "100%" }}><img src={x.outputUrl} alt={x.room} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></a>
                    : x.status === "FAILED" ? <span style={{ fontSize: 13, opacity: 0.7, padding: 10, textAlign: "center" }}>{`${t("Failed (credit refunded)", "Lỗi (đã hoàn credit)")}${x.error ? ` · ${bi(x.error)}` : ""}`}</span> : <AiThinking tile />}
                </div>
                <figcaption style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", fontSize: 14 }}>
                  <b style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.room}</b>
                  {x.status === "SUCCESS" && x.outputUrl && <a href={x.outputUrl} download={`${x.room}.png`} style={{ fontSize: 13 }}>{t("Download", "Tải xuống")}</a>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section style={{ display: "grid", gap: 12, borderTop: `1px solid ${line}`, paddingTop: 18 }}>
        <h4 style={{ margin: 0, fontSize: 15 }}>{t("Earlier renders", "Lịch sử render")}{history && history.length > 0 && <span style={{ fontWeight: 400, opacity: 0.7 }}> · {history.length}</span>}</h4>
        {history === null ? <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{t("Loading…", "Đang tải…")}</p>
          : !history.length ? <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{t("Your rendered floor plans will be kept here.", "Các mặt bằng đã render sẽ được lưu ở đây.")}</p>
          : history.map((b) => (
            <article key={b.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", border: `1px solid ${line}`, borderRadius: 12, padding: 10, background: "#fff" }}>
              <div style={{ display: "grid", gap: 6, minWidth: 0, flex: "0 1 150px" }}>
                {b.plan ? <a href={b.plan} target="_blank" rel="noreferrer"><img src={b.plan} alt={t("Floor plan", "Mặt bằng")} loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "contain", background: "#f4f1ea", borderRadius: 8 }} /></a> : null}
                <span style={{ fontSize: 12, opacity: 0.75 }}>{when(b.at)}{b.style ? ` · ${styleName(b.style)}` : ""}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))", gap: 8, minWidth: 0, flex: "1 1 240px" }}>
                {b.rooms.map((r) => (
                  <figure key={r.id} style={{ margin: 0, minWidth: 0, border: `1px solid ${line}`, borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ aspectRatio: "4 / 3", display: "grid", placeItems: "center", background: "#f4f1ea" }}>
                      {r.outputUrl ? <a href={r.outputUrl} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", height: "100%" }}><img src={r.outputUrl} alt={r.room} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></a> : <AiThinking tile />}
                    </div>
                    <figcaption style={{ display: "flex", justifyContent: "space-between", gap: 6, padding: "5px 7px", fontSize: 12 }}>
                      <b style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.room}</b>
                      {r.outputUrl && <a href={r.outputUrl} download={`${r.room}.png`}>{t("Download", "Tải xuống")}</a>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </article>
          ))}
      </section>
    </div>
  );
}
