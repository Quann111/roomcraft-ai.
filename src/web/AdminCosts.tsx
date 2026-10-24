import React, { useEffect, useMemo, useRef, useState } from "react";
import { bi, t } from "./i18n";

// Admin page: what RunningHub image/video tasks and LLM calls cost, from /api/admin/costs.
type Group = { key: string; count: number; usd: number; estimatedUsd: number };
type Day = { day: string; exact: number; estimated: number; count: number };
type Recent = { at: number; tool: string; model: string; kind: string; usd: number; estimated: boolean; user?: string };
type Data = {
  days: number; trackingReady: boolean; byDay: Day[]; byTool: Group[]; byModel: Group[]; recent: Recent[];
  totals: { usd: number; estimatedUsd: number; today: number; last7: number; count: number; perImage: number; llmUsd: number };
};

const TOOL_NAMES: Record<string, [string, string]> = {
  "interior-redesign": ["Redesign", "Thiết kế lại"], "interior-staging": ["Virtual Staging", "Bài trí ảo"], "interior-declutter": ["Furniture Removal", "Xoá đồ nội thất"],
  "interior-sketch": ["Sketch to Render", "Phác thảo → ảnh thật"], "interior-material": ["Material Swap", "Đổi vật liệu"], "interior-paint": ["Paint Visualizer", "Thử màu sơn"],
  "interior-floor": ["Floor Editor", "Chỉnh sửa sàn"], "interior-transfer": ["Design Transfer", "Chuyển phong cách"], "interior-text": ["Text to Design", "Văn bản → thiết kế"],
  "interior-compose": ["Room Composer", "Sắp xếp phòng"], "interior-lighting": ["Day & Night Lighting", "Ánh sáng ngày & đêm"], "interior-floorplan": ["3D Floorplan", "Mặt bằng 3D"],
  "interior-bizplan": ["Business 3D Floorplan", "Mặt bằng 3D doanh nghiệp"], "interior-video": ["Video Generation", "Tạo video"], "interior-critique": ["Design Critique", "Nhận xét thiết kế"],
  "interior-advisor": ["Design Advisor", "Tư vấn thiết kế"], "interior-finder": ["Furniture Finder", "Tìm nội thất"], "exterior-orient": ["Sun & Wind Analysis", "Phân tích nắng & gió"],
  "exterior-orient-render": ["Sun & Wind render", "Phân tích nắng & gió (ảnh)"], "exterior-redesign": ["Exterior Redesign", "Thiết kế lại ngoại thất"], "exterior-sky": ["Sky Colors", "Đổi màu bầu trời"],
  "garden-redesign": ["Garden Redesign", "Thiết kế sân vườn"],
};
const toolName = (k: string) => (k === "—" || !k ? t("Outside the app (tests, scripts)", "Ngoài app (test, script)") : TOOL_NAMES[k] ? t(...TOOL_NAMES[k]) : k);
const usd = (v: number) => (v === 0 ? "$0" : `$${v >= 1 ? v.toFixed(2) : v.toFixed(3)}`);
const vnTime = (ms: number) => new Date(ms + 7 * 3_600_000).toISOString().slice(5, 16).replace("T", " ");

export function AdminCostsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [denied, setDenied] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const load = () => {
    setErr("");
    fetch(`/api/admin/costs?days=${days}`).then(async (r) => {
      if (r.status === 403) { setDenied(true); setData(null); return; }
      const d: any = await r.json();
      if (!r.ok) throw new Error(bi(d.error ?? "Error"));
      setDenied(false); setData(d);
    }).catch((e) => setErr(e.message));
  };
  useEffect(load, [days]);

  const importCsv = async (f?: File) => {
    if (!f) return;
    setNote(t("Importing…", "Đang nhập…"));
    const r = await fetch("/api/admin/costs/import", { method: "POST", headers: { "Content-Type": "text/csv" }, body: await f.text() });
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok) { setNote(bi(d.error ?? "Error")); return; }
    setNote(t(`Imported ${d.imported} RunningHub tasks (${usd(d.usd)}); ${d.matched} matched runs in the app.`, `Đã nhập ${d.imported} lượt RunningHub (${usd(d.usd)}); ${d.matched} lượt khớp với ảnh tạo trong app.`));
    load();
  };

  return (
    <div className="costs mx-auto grid max-w-5xl gap-6 px-4 py-10">
      <style>{CSS}</style>
      <header className="grid gap-2">
        <p className="eyebrow">Admin</p>
        <h1 style={{ margin: 0, fontSize: 30 }}>{t("API costs", "Chi phí API")}</h1>
        <p className="muted">{t("What the app spends on RunningHub: image and video tasks at the amount RunningHub billed, AI image reading by token count. Days are Vietnam time.", "Số tiền app chi cho RunningHub: ảnh và video theo đúng số RunningHub tính, AI đọc ảnh tính theo số token. Ngày theo giờ Việt Nam.")}</p>
      </header>
      {denied ? <AdminLogin onDone={load} /> : !data ? <p className="muted">{err || t("Loading…", "Đang tải…")}</p> : (
        <>
          <div className="toolbar">
            <div className="chips" role="group" aria-label={t("Period", "Khoảng thời gian")}>
              {[7, 30, 90].map((d) => <button key={d} type="button" className={d === days ? "on" : ""} aria-pressed={d === days} onClick={() => setDays(d)}>{d} {t("days", "ngày")}</button>)}
            </div>
            <label className="import">{t("Import RunningHub billing CSV", "Nhập file hoá đơn RunningHub (CSV)")}<input type="file" accept=".csv,text/csv" onChange={(e) => { importCsv(e.target.files?.[0]); e.target.value = ""; }} /></label>
          </div>
          {note && <p className="note">{note}</p>}
          {!data.trackingReady && <p className="note warn">{t("Cost tracking is not set up on this database yet (migration 0003). Everything below is a list-price estimate.", "Database này chưa có bảng ghi chi phí (migration 0003). Mọi số bên dưới là ước tính theo bảng giá.")}</p>}
          <div className="kpis">
            <Kpi label={t(`Last ${data.days} days`, `${data.days} ngày qua`)} value={usd(data.totals.usd)} sub={`${data.totals.count} ${t("charges", "lượt")}`} />
            <Kpi label={t("Today", "Hôm nay")} value={usd(data.totals.today)} />
            <Kpi label={t("Last 7 days", "7 ngày qua")} value={usd(data.totals.last7)} />
            <Kpi label={t("Average per image", "Trung bình mỗi ảnh")} value={usd(data.totals.perImage)} />
            <Kpi label={t("AI image reading", "AI đọc ảnh")} value={usd(data.totals.llmUsd)} sub={t("token-based", "tính theo token")} />
            <Kpi label={t("Estimated part", "Phần ước tính")} value={usd(data.totals.estimatedUsd)} sub={data.totals.usd ? `${Math.round((data.totals.estimatedUsd / data.totals.usd) * 100)}%` : ""} />
          </div>
          <DayChart days={data.byDay} />
          <Table title={t("By tool", "Theo công cụ")} rows={data.byTool} name={toolName} />
          <Table title={t("By model", "Theo model")} rows={data.byModel} name={(k) => k} />
          <section className="card">
            <h2>{t("Latest charges", "Lượt gần đây")}</h2>
            <div className="scroll"><table>
              <thead><tr><th>{t("Time (VN)", "Giờ (VN)")}</th><th>{t("Tool", "Công cụ")}</th><th>Model</th><th className="r">USD</th><th>{t("User", "Người dùng")}</th></tr></thead>
              <tbody>{data.recent.map((r, i) => (
                <tr key={i}><td className="num">{vnTime(r.at)}</td><td>{toolName(r.tool)}</td><td className="small">{r.model}</td>
                  <td className="r num">{usd(r.usd)}{r.estimated && <span className="est" title={t("Estimated from the price list", "Ước tính theo bảng giá")}> ~</span>}</td><td className="small">{r.user ?? ""}</td></tr>
              ))}</tbody>
            </table></div>
          </section>
          <p className="muted small">{t("“~” and the orange bars are list-price estimates: runs from before cost tracking, or tasks RunningHub reported no amount for. Importing the RunningHub billing CSV replaces them with the billed amounts. Failed tasks are not charged.", "“~” và cột màu cam là ước tính theo bảng giá: các lượt từ trước khi có ghi chi phí, hoặc lượt RunningHub không trả số tiền. Nhập file CSV hoá đơn RunningHub sẽ thay bằng số tiền thật. Lượt lỗi không bị tính tiền.")}</p>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="kpi"><span>{label}</span><b className="num">{value}</b>{sub && <small>{sub}</small>}</div>;
}

function Table({ title, rows, name }: { title: string; rows: Group[]; name: (k: string) => string }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="scroll"><table>
        <thead><tr><th></th><th className="r">{t("Charges", "Lượt")}</th><th className="r">USD</th><th className="r">{t("Estimated", "Ước tính")}</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.key}><td>{name(r.key)}</td><td className="r num">{r.count}</td><td className="r num">{usd(r.usd)}</td><td className="r num muted">{r.estimatedUsd ? usd(r.estimatedUsd) : "—"}</td></tr>
        ))}</tbody>
      </table></div>
    </section>
  );
}

/** Stacked bars per day: billed (series 1) under estimated (series 2), with a hover tooltip and a legend. */
function DayChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const max = useMemo(() => Math.max(0.01, ...days.map((d) => d.exact + d.estimated)), [days]);
  const nice = (() => { const p = 10 ** Math.floor(Math.log10(max)); return Math.ceil(max / p) * p; })();
  const W = 760, H = 220, L = 52, B = 26, T = 10, iw = W - L - 8, ih = H - B - T, bw = iw / days.length;
  const y = (v: number) => T + ih - (v / nice) * ih;
  const step = Math.ceil(days.length / 8);
  const d = hover != null ? days[hover] : null;
  return (
    <section className="card">
      <div className="chart-head"><h2>{t("Cost per day", "Chi phí theo ngày")}</h2>
        <div className="legend"><span><i style={{ background: "var(--series-1)" }} />{t("Billed", "Chính xác")}</span><span><i style={{ background: "var(--series-2)" }} />{t("Estimated", "Ước tính")}</span></div></div>
      <div className="chart" ref={box} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("Cost per day", "Chi phí theo ngày")}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}><line x1={L} x2={W - 8} y1={y(nice * f)} y2={y(nice * f)} className="grid" /><text x={L - 6} y={y(nice * f) + 4} className="axis" textAnchor="end">{usd(nice * f)}</text></g>
          ))}
          {days.map((dd, i) => {
            const x = L + i * bw + bw * 0.15, w = Math.max(2, bw * 0.7), he = (dd.exact / nice) * ih, hs = (dd.estimated / nice) * ih;
            return (
              <g key={dd.day}>
                {he > 0 && <rect x={x} y={T + ih - he} width={w} height={he} rx={Math.min(4, w / 2)} fill="var(--series-1)" />}
                {hs > 0 && <rect x={x} y={T + ih - he - hs - (he > 0 ? 2 : 0)} width={w} height={hs} rx={Math.min(4, w / 2)} fill="var(--series-2)" />}
                <rect x={L + i * bw} y={T} width={bw} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
                {i % step === 0 && <text x={x + w / 2} y={H - 8} className="axis" textAnchor="middle">{dd.day.slice(8)}/{dd.day.slice(5, 7)}</text>}
              </g>
            );
          })}
          <line x1={L} x2={W - 8} y1={T + ih} y2={T + ih} className="base" />
        </svg>
        {d && hover != null && (
          <div className="tip" style={{ left: `${((L + (hover + 0.5) * bw) / W) * 100}%` }}>
            <b>{d.day.slice(8)}/{d.day.slice(5, 7)}</b><span>{t("Billed", "Chính xác")}: {usd(d.exact)}</span><span>{t("Estimated", "Ước tính")}: {usd(d.estimated)}</span><span>{d.count} {t("charges", "lượt")}</span>
          </div>
        )}
      </div>
    </section>
  );
}

/** The site logs everyone in as the shared account while OPEN_ACCESS is on, so admins sign in here. */
function AdminLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw }) });
    const d: any = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(bi(d.error ?? "Error")); return; }
    onDone();
  };
  return (
    <form className="card login" onSubmit={submit}>
      <h2>{t("Admin sign-in", "Đăng nhập admin")}</h2>
      <p className="muted small">{t("API costs are only shown to admin accounts signed in with their own password.", "Chi phí API chỉ hiện cho tài khoản admin đăng nhập bằng mật khẩu riêng.")}</p>
      <input type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" autoComplete="current-password" placeholder={t("Password", "Mật khẩu")} value={pw} onChange={(e) => setPw(e.target.value)} required />
      {err && <p className="err">{err}</p>}
      <button type="submit" disabled={busy}>{busy ? "…" : t("Sign in", "Đăng nhập")}</button>
    </form>
  );
}

// Chart colors: reference palette slots 1-2 (validated as an adjacent pair). The site has no dark theme, so light only.
const CSS = `
.costs { --series-1: #2a78d6; --series-2: #eb6834; --line: #e3ddd0; --muted: #5d6779; }
.costs .eyebrow { margin: 0; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.costs .muted { color: var(--muted); } .costs .small { font-size: 12px; } .costs .num { font-variant-numeric: tabular-nums; }
.costs .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
.costs .chips { display: flex; gap: 6px; }
.costs .chips button, .costs .import, .costs .login button { padding: 7px 14px; border: 1px solid #17191b; border-radius: 4px; background: transparent; font-size: 13px; cursor: pointer; }
.costs .chips button.on, .costs .login button { background: #17191b; color: #fff; }
.costs .import { position: relative; overflow: hidden; } .costs .import input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.costs .note { margin: 0; padding: 10px 14px; border-radius: 6px; background: #eef3fb; font-size: 14px; } .costs .note.warn { background: #fbf0dc; }
.costs .kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); gap: 10px; }
.costs .kpi { display: grid; gap: 2px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
.costs .kpi span { font-size: 12px; color: var(--muted); } .costs .kpi b { font-size: 22px; } .costs .kpi small { font-size: 12px; color: var(--muted); }
.costs .card { display: grid; gap: 10px; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: #fff; min-width: 0; }
.costs .card h2 { margin: 0; font-size: 16px; }
.costs .chart-head { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; }
.costs .legend { display: flex; gap: 14px; font-size: 12px; color: var(--muted); } .costs .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
.costs .chart { position: relative; } .costs .chart svg { width: 100%; height: auto; display: block; }
.costs .grid { stroke: var(--line); stroke-width: 1; } .costs .base { stroke: #b9b3a6; stroke-width: 1; } .costs .axis { font-size: 11px; fill: var(--muted); }
.costs .tip { position: absolute; top: 0; transform: translateX(-50%); display: grid; gap: 1px; padding: 6px 9px; border-radius: 6px; background: #17191b; color: #fff; font-size: 12px; pointer-events: none; white-space: nowrap; }
.costs .scroll { overflow-x: auto; } .costs table { width: 100%; border-collapse: collapse; font-size: 13px; }
.costs th, .costs td { padding: 7px 8px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; } .costs th { font-size: 11px; color: var(--muted); font-weight: 600; }
.costs .r { text-align: right; } .costs .est { color: var(--muted); }
.costs .login { max-width: 380px; } .costs .login input { padding: 9px 11px; border: 1px solid var(--line); border-radius: 4px; font-size: 14px; } .costs .err { margin: 0; color: #9b1c1c; font-size: 13px; }
`;
