import React, { useEffect, useState } from "react";
import { PlanRun } from "./PlanRun";
import { bi, t } from "./i18n";
import { prepareImage, type PreparedImage } from "./imagePrep";

/** A detected room; `box` (fractions of the plan) and the wall-by-wall facts come from the detector and go back with the render. */
type Room = { name: string; view: string; box?: number[]; size?: string; walls?: string; fixtures?: string; notHere?: string; on: boolean };
const MAX_ROOMS = 8; // matches MAX_PLAN_ROOMS in the worker
const ink = "#1c1b19", line = "rgba(0,0,0,0.12)";

/** Cuts one room's part of the plan (its box plus a 3% margin) as a JPEG, so the render sees that room up close. */
async function cropRoom(url: string, box: number[]): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
  const m = 0.03, W = img.naturalWidth, H = img.naturalHeight;
  const x0 = Math.max(0, box[0] - m) * W, y0 = Math.max(0, box[1] - m) * H, x1 = Math.min(1, box[2] + m) * W, y1 = Math.min(1, box[3] + m) * H;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(x1 - x0)); c.height = Math.max(1, Math.round(y1 - y0));
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("Could not crop the plan · Không cắt được mặt bằng"))), "image/jpeg", 0.92));
}

/** Business 3D Floorplan: upload a plan, review the detected rooms, render each one (1 credit per room). */
export function BizPlan({ onCreditsChange }: { onCreditsChange?: () => void }) {
  const [styles, setStyles] = useState<{ slug: string; name: string }[]>([]);
  const [style, setStyle] = useState("");
  const [plan, setPlan] = useState<{ prep: PreparedImage; url: string } | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [home, setHome] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [batch, setBatch] = useState<string | null>(null); // the run being shown under "3. Your renders"
  const [busy, setBusy] = useState<"" | "detect" | "render">("");
  const [err, setErr] = useState("");
  const [autoCheck, setAutoCheck] = useState(false); // optional post-check with one redraw per room, off by default

  useEffect(() => {
    fetch("/api/styles").then((r) => r.json() as Promise<any>).then((m) => {
      const list = m.styles.filter((s: any) => s.scope === "interior");
      setStyles(list); setStyle(list[0]?.slug ?? "");
    }).catch(() => {});
  }, []);

  const pick = async (f?: File) => {
    if (!f) return;
    setErr("");
    try { const prep = await prepareImage(f); setPlan({ prep, url: URL.createObjectURL(prep.file) }); setKey(null); setRooms([]); setBatch(null); } catch (e: any) { setErr(e.message); }
  };
  const upload = async (body: Blob) => {
    const up = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": body.type }, body });
    const d: any = await up.json();
    if (!up.ok) throw new Error(d.error ?? "Upload failed · Tải ảnh thất bại");
    return d.key as string;
  };
  const post = async (path: string, body: unknown) => {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error ?? "Error · Lỗi");
    return d;
  };

  const detect = async () => {
    if (!plan) return;
    setBusy("detect"); setErr(""); setBatch(null);
    try {
      let k = key;
      if (!k) { k = await upload(plan.prep.file); setKey(k); }
      const d = await post("/api/bizplan/detect", { inputKey: k });
      setHome(d.home); setRooms(d.rooms.map((r: any) => ({ ...r, on: true })));
    } catch (e: any) { setErr(e.message); } finally { setBusy(""); }
  };

  const chosen = rooms.filter((r) => r.on && r.name.trim());
  const render = async () => {
    setBusy("render"); setErr("");
    try {
      // Each room's own part of the plan goes with it; a room whose crop fails is rendered from the whole plan.
      const cropKeys = await Promise.all(chosen.map((r) => (r.box && plan ? cropRoom(plan.url, r.box).then(upload).catch(() => undefined) : undefined)));
      const d = await post("/api/bizplan/render", {
        inputKey: key, styleSlug: style, home, aspectRatio: "4:3", ...(autoCheck ? { autoCheck: true } : {}),
        rooms: chosen.map(({ on, ...r }, i) => ({ ...r, cropKey: cropKeys[i] })),
      });
      setBatch(d.batchId);
      onCreditsChange?.();
    } catch (e: any) { setErr(e.message); } finally { setBusy(""); }
  };

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
            {busy === "detect" ? t("Reading the plan… about 20–40 s", "Đang đọc mặt bằng… khoảng 20–40 giây") : rooms.length ? t("Detect rooms again", "Đọc lại các phòng") : t("Detect rooms (free)", "Đọc các phòng (miễn phí)")}
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
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
                <input type="checkbox" checked={autoCheck} onChange={(e) => setAutoCheck(e.target.checked)} style={{ marginTop: 2 }} />
                <span>{t("Auto-check each room: if its shape, fixtures or built elements do not match the plan, redo it once (no extra credit, about 1 minute slower)", "Tự kiểm tra từng phòng: nếu hình dáng, đồ đạc cố định hoặc kết cấu không khớp bản vẽ thì tự vẽ lại 1 lần (không tốn thêm credit, chậm hơn khoảng 1 phút)")}</span>
              </label>
              <button type="button" disabled={!chosen.length || chosen.length > MAX_ROOMS || !!busy} onClick={render} style={btn(true, !chosen.length || !!busy)}>
                {busy === "render" ? t("Starting…", "Đang bắt đầu…") : t(`Render ${chosen.length} rooms · ${chosen.length} credits`, `Render ${chosen.length} phòng · ${chosen.length} credit`)}
              </button>
            </>
          )}
          {err && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>{bi(err)}</p>}
        </section>
      </div>

      {batch && (
        <section style={{ display: "grid", gap: 10 }}>
          <h4 style={{ margin: 0, fontSize: 15 }}>{t("3. Your renders", "3. Ảnh render")} <span style={{ fontWeight: 400, opacity: 0.7 }}>· {t("tick a room to redraw it, matched to the others", "tick phòng nào cần vẽ lại, ảnh mới sẽ đồng bộ với các phòng khác")}</span></h4>
          <PlanRun batchId={batch} onChange={onCreditsChange} />
        </section>
      )}
    </div>
  );
}
