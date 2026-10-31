import React, { useEffect, useState } from "react";
import { bi, t } from "./i18n";
import { AdminLogin, CSS as COSTS_CSS, toolName } from "./AdminCosts";

// Admin page: results customers did not like (or the auto-check failed on), what each was sent, and replays to see how often
// the same input succeeds. Data from /api/admin/cases.
type Item = {
  id: string; tool: string; status: string; createdAt: number; version?: string; inputUrl: string | null; outputUrl: string | null;
  rating: number | null; reasons: string[]; note: string; regression: boolean; qa: boolean[] | null; replays: { judged: number; passed: number };
};
type Replay = { id: string; mode: "same" | "current"; status: string; error?: string; version?: string; promptHash?: string; createdAt: number; url: string | null; verdict: { pass: boolean; problems: string[] } | null; mark: boolean | null; pass: boolean | null };
type Case = {
  id: string; tool: string; status: string; error?: string; createdAt: number; finishedAt: number | null; userId: string; inputUrl: string | null; outputUrl: string | null; draftUrl: string | null;
  promptHash: string; promptLength: number; trace: { version?: string; model: string; aspect?: string; res: string; images: (string | null)[]; rebuild: boolean } | null;
  params: any; attempts: { pass: boolean; failed: string[]; problems: string[]; at: number | null; url: string | null }[]; qaKept: number | null; qaSkipped: boolean;
  feedback: { rating: number; reasons: string[]; note: string; at: number }[]; replays: Replay[]; plan: unknown; regression: { note: string; at: number } | null; canJudge: boolean;
};

const FILTERS: [string, string, string][] = [["down", "👎 from customers", "👎 từ khách"], ["qa", "Auto-check failed first try", "Tự kiểm tra lỗi lần đầu"], ["regression", "Regression set", "Bộ kiểm thử"], ["traced", "All traced results", "Tất cả có ghi vết"]];
const REASON: Record<string, [string, string]> = {
  structure: ["Layout / structure", "Sai kết cấu"], objects: ["Objects lost/added", "Mất/thêm đồ"], product: ["Wrong product", "Sai mẫu"],
  angle: ["Turned / angle", "Xoay lệch/sai góc"], color: ["Color / light", "Màu/ánh sáng"], other: ["Other", "Khác"],
};
const MODEL: Record<string, string> = { flash: "Gemini flash", text: "Gemini flash (text)" };
const modelName = (m: string) => MODEL[m] ?? (/g-2\.5|gpt-image-2\.5/.test(m) ? "GPT Image 2.5" : /n-g31|flash/.test(m) ? "Gemini flash" : m);
const vnTime = (ms: number) => new Date(ms + 7 * 3_600_000).toISOString().slice(5, 16).replace("T", " ");
const secs = (ms: number) => (ms < 90_000 ? `${Math.round(ms / 1000)}s` : `${(ms / 60_000).toFixed(1)} min`);
const pct = (a: number, b: number) => (b ? `${a}/${b} (${Math.round((a / b) * 100)}%)` : "—");
const api = async (url: string, body?: unknown) => {
  const r = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d: any = await r.json().catch(() => ({}));
  if (r.status === 403) throw Object.assign(new Error("403"), { denied: true });
  if (!r.ok) throw new Error(bi(d.error ?? "Error"));
  return d;
};

export function AdminInvestigatePage() {
  const [filter, setFilter] = useState("down");
  const [items, setItems] = useState<Item[] | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [denied, setDenied] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(() => new URLSearchParams(location.search).get("id"));
  const [note, setNote] = useState("");
  const fail = (e: any) => (e.denied ? setDenied(true) : setErr(e.message));
  const load = (more = false) => {
    setErr("");
    api(`/api/admin/cases?filter=${filter}${more && next ? `&before=${next}` : ""}`).then((d) => {
      setDenied(false); setItems((xs) => (more ? [...(xs ?? []), ...d.items] : d.items)); setNext(d.next);
    }).catch(fail);
  };
  useEffect(() => load(), [filter]);
  const show = (id: string | null) => { setOpen(id); history.replaceState(null, "", id ? `?id=${id}` : location.pathname); scrollTo(0, 0); };
  const runSet = async () => {
    const n = Number(prompt(t("Replays per case (1–5), with the deployed prompts:", "Số lần chạy lại mỗi ca (1–5), với prompt hiện tại:"), "2"));
    if (!n) return;
    setNote(t("Starting…", "Đang bắt đầu…"));
    api("/api/admin/regression/replay", { n }).then((d) => {
      const bad = d.items.filter((x: any) => x.error);
      setNote(t(`Started ${d.items.length - bad.length} cases.`, `Đã chạy ${d.items.length - bad.length} ca.`) + (bad.length ? ` ${bad.map((x: any) => bi(x.error)).join("; ")}` : ""));
    }).catch((e) => setNote(e.message));
  };

  return (
    <div className="costs inv mx-auto grid max-w-5xl gap-6 px-4 py-10">
      <style>{COSTS_CSS + CSS}</style>
      <header className="grid gap-2">
        <p className="eyebrow">Admin</p>
        <h1 style={{ margin: 0, fontSize: 30 }}>{t("Investigate results", "Điều tra kết quả")}</h1>
        <p className="muted">{t("Results customers marked 👎 or the auto-check failed on: what each was sent, every attempt, and replays to see how often the same input works. A single bad image can be bad luck; a low pass rate over several replays is a real problem.", "Ảnh khách chấm 👎 hoặc bị tự kiểm tra đánh lỗi: đã gửi gì, từng lần thử, và nút chạy lại để xem cùng một đầu vào thành công bao nhiêu lần. Một ảnh xấu có thể do ngẫu nhiên; tỉ lệ đạt thấp qua nhiều lần chạy lại mới là lỗi thật.")}</p>
        <a className="small" href="/admin">{t("← API costs", "← Chi phí API")}</a>
      </header>
      {denied ? <AdminLogin onDone={() => load()} /> : open ? <CaseView id={open} onBack={() => { show(null); load(); }} onDenied={() => setDenied(true)} /> : (
        <>
          <div className="toolbar">
            <div className="chips" role="group" aria-label={t("Cases", "Loại")}>
              {FILTERS.map(([k, en, vi]) => <button key={k} type="button" className={k === filter ? "on" : ""} aria-pressed={k === filter} onClick={() => { setItems(null); setFilter(k); }}>{t(en, vi)}</button>)}
            </div>
            {filter === "regression" && !!items?.length && <button type="button" className="import" onClick={runSet}>{t("Replay the whole set", "Chạy lại cả bộ")}</button>}
          </div>
          {note && <p className="note">{note}</p>}
          {err ? <p className="note warn">{err}</p> : !items ? <p className="muted">{t("Loading…", "Đang tải…")}</p> : !items.length ? <p className="muted">{t("Nothing here yet.", "Chưa có ca nào.")}</p> : (
            <div className="cases">
              {items.map((x) => (
                <button key={x.id} type="button" className="case" onClick={() => show(x.id)}>
                  <span className="thumb">{x.outputUrl && !x.outputUrl.endsWith(".json") ? <img src={x.outputUrl} alt="" loading="lazy" /> : <i>{x.status}</i>}</span>
                  <b>{toolName(x.tool)}</b>
                  <span className="muted small">{vnTime(x.createdAt)}{x.version ? ` · v${x.version}` : ""}</span>
                  <span className="tags">
                    {x.rating != null && <em className={x.rating < 0 ? "bad" : "good"}>{x.rating < 0 ? "👎" : "👍"} {x.reasons.map((r) => (REASON[r] ? t(...REASON[r]) : r)).join(", ")}</em>}
                    {x.qa && <em className={x.qa[0] === false ? "bad" : "good"}>{t("Check", "Kiểm tra")} {x.qa.map((p) => (p ? "✓" : "✗")).join(" ")}</em>}
                    {x.replays.judged > 0 && <em>{t("Replays", "Chạy lại")} {pct(x.replays.passed, x.replays.judged)}</em>}
                    {x.regression && <em>{t("In set", "Trong bộ")}</em>}
                  </span>
                  {x.note && <span className="small quote">“{x.note}”</span>}
                </button>
              ))}
            </div>
          )}
          {next && <button type="button" className="import" style={{ justifySelf: "center" }} onClick={() => load(true)}>{t("More", "Xem thêm")}</button>}
        </>
      )}
    </div>
  );
}

function CaseView({ id, onBack, onDenied }: { id: string; onBack: () => void; onDenied: () => void }) {
  const [c, setC] = useState<Case | null>(null);
  const [err, setErr] = useState("");
  const [n, setN] = useState(3);
  const [mode, setMode] = useState<"same" | "current">("same");
  const [busy, setBusy] = useState(false);
  const [regNote, setRegNote] = useState("");
  const load = () => api(`/api/admin/cases/${id}`).then((d) => { setC(d); setRegNote(d.regression?.note ?? ""); }).catch((e) => (e.denied ? onDenied() : setErr(e.message)));
  useEffect(() => { load(); }, [id]);
  const open = !!c?.replays.some((r) => r.status === "RUNNING" || r.status === "JUDGING");
  useEffect(() => { if (!open) return; const h = setTimeout(load, 5000); return () => clearTimeout(h); }, [c]);
  if (err) return <p className="note warn">{err}</p>;
  if (!c) return <p className="muted">{t("Loading…", "Đang tải…")}</p>;

  const replay = async () => {
    setBusy(true); setErr("");
    await api(`/api/admin/cases/${id}/replay`, { n, mode }).catch((e) => alert(e.message));
    setBusy(false); load();
  };
  const mark = (r: Replay, pass: boolean | null) => api(`/api/admin/replays/${r.id}/mark`, { pass }).then(load);
  const setReg = (on: boolean) => api(`/api/admin/cases/${id}/regression`, { on, note: regNote }).then(load);
  // Pass rate per prompt (same prompt = randomness; a new prompt hash = a code change being tested).
  const groups = [...new Set(c.replays.map((r) => `${r.mode}|${r.promptHash ?? ""}`))].map((k) => {
    const rs = c.replays.filter((r) => `${r.mode}|${r.promptHash ?? ""}` === k), judged = rs.filter((r) => r.status === "SUCCESS" && r.pass != null);
    return { mode: rs[0].mode, hash: rs[0].promptHash, sameAsOriginal: rs[0].promptHash === c.promptHash, total: rs.length, judged: judged.length, passed: judged.filter((r) => r.pass).length };
  });
  const images: [string, string | null][] = [
    ...((c.trace?.images ?? [c.inputUrl]).map((u, i) => [`${t("Sent", "Ảnh gửi")} ${i + 1}`, u] as [string, string | null])),
    ...(c.draftUrl ? [[t("Before polish", "Trước khi đánh bóng"), c.draftUrl] as [string, string]] : []),
    [t("Result shown", "Kết quả khách thấy"), c.outputUrl],
  ];

  return (
    <>
      <div className="toolbar">
        <button type="button" className="import" onClick={onBack}>← {t("All cases", "Danh sách")}</button>
        <span className="muted small">{c.id}</span>
      </div>
      <div className="card">
        <h2>{toolName(c.tool)} · {c.status}</h2>
        <div className="shots">{images.map(([label, u], i) => u && <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" loading="lazy" /><span>{label}</span></a>)}</div>
        <table><tbody>
          <tr><th>{t("Made", "Tạo lúc")}</th><td>{vnTime(c.createdAt)}{c.finishedAt ? ` · ${t("took", "mất")} ${secs(c.finishedAt - c.createdAt)}` : ""}</td></tr>
          {c.trace ? <>
            <tr><th>{t("Version", "Phiên bản")}</th><td>{c.trace.version ?? "—"}</td></tr>
            <tr><th>{t("Model", "Model")}</th><td>{modelName(c.trace.model)} · {c.trace.aspect ?? t("auto ratio", "tỉ lệ tự động")} · {c.trace.res}</td></tr>
          </> : <tr><th>{t("Trace", "Ghi vết")}</th><td>{t("Made before tracing: no record of what was sent, cannot be replayed.", "Tạo trước khi có ghi vết: không có dữ liệu đã gửi, không chạy lại được.")}</td></tr>}
          <tr><th>{t("Prompt", "Prompt")}</th><td>#{c.promptHash} · {c.promptLength} {t("characters", "ký tự")}</td></tr>
          {c.error && <tr><th>{t("Error", "Lỗi")}</th><td>{bi(c.error)}</td></tr>}
        </tbody></table>
      </div>

      <div className="card">
        <h2>{t("Customer feedback", "Đánh giá của khách")}</h2>
        {!c.feedback.length ? <p className="muted small">{t("None.", "Chưa có.")}</p> : c.feedback.map((f, i) => (
          <p key={i} style={{ margin: 0 }}>{f.rating < 0 ? "👎" : "👍"} {f.reasons.map((r) => (REASON[r] ? t(...REASON[r]) : r)).join(", ")}{f.note ? ` — “${f.note}”` : ""} <span className="muted small">{vnTime(f.at)}</span></p>
        ))}
      </div>

      <div className="card">
        <h2>{t("Auto-check", "Tự kiểm tra")}</h2>
        {!c.attempts.length ? <p className="muted small">{c.qaSkipped ? t("Could not run.", "Không chạy được.") : t("Not used for this result.", "Không bật cho kết quả này.")}</p> : (
          <div className="shots">{c.attempts.map((a, i) => (
            <div key={i} className="attempt">
              {a.url && <a href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt="" loading="lazy" /></a>}
              <b className={a.pass ? "good" : "bad"}>{t("Try", "Lần")} {i + 1}: {a.pass ? t("pass", "đạt") : t("fail", "lỗi")}{c.qaKept === i + 1 ? ` · ${t("shown", "được giữ")}` : ""}</b>
              {!a.pass && <span className="small">{a.problems.join("; ") || a.failed.join(", ")}</span>}
            </div>
          ))}</div>
        )}
      </div>

      <div className="card">
        <h2>{t("Replays", "Chạy lại")}</h2>
        <p className="muted small">{t("Runs the same generation again, outside the customer's history and without credits (each replay costs one API call). ", "Chạy lại đúng ca này, không hiện trong lịch sử của khách và không trừ credit (mỗi lần tốn một lượt gọi API). ")}
          {c.canJudge ? t("Each replay is judged by the tool's auto-check; you can override it.", "Mỗi lần được tự kiểm tra chấm; bạn có thể chấm lại.") : t("This tool has no auto-check: mark each replay pass or fail yourself.", "Công cụ này không có tự kiểm tra: hãy tự chấm đạt/lỗi từng lần.")}</p>
        {c.trace && (
          <div className="toolbar" style={{ justifyContent: "flex-start" }}>
            <label className="small">{t("Times", "Số lần")} <select value={n} onChange={(e) => setN(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}</select></label>
            <div className="chips">
              <button type="button" className={mode === "same" ? "on" : ""} onClick={() => setMode("same")}>{t("Same prompt", "Giữ nguyên prompt")}</button>
              <button type="button" className={mode === "current" ? "on" : ""} disabled={!c.trace.rebuild} title={c.trace.rebuild ? "" : t("Not available for this tool", "Không áp dụng cho công cụ này")} onClick={() => setMode("current")}>{t("Deployed prompt", "Prompt hiện tại")}</button>
            </div>
            <button type="button" className="import primary" disabled={busy} onClick={replay}>{busy ? "…" : t(`Replay ${n}×`, `Chạy lại ${n} lần`)}</button>
          </div>
        )}
        {groups.length > 0 && (
          <table><thead><tr><th>{t("Prompt", "Prompt")}</th><th>{t("Replays", "Số lần")}</th><th>{t("Passed", "Đạt")}</th></tr></thead><tbody>
            {groups.map((g, i) => <tr key={i}><td>#{g.hash} {g.sameAsOriginal ? t("(as the customer's)", "(như của khách)") : t("(new prompt)", "(prompt mới)")}</td><td>{g.total}</td><td><b>{pct(g.passed, g.judged)}</b></td></tr>)}
          </tbody></table>
        )}
        <div className="shots">{c.replays.map((r) => (
          <div key={r.id} className="attempt">
            {r.url ? <a href={r.url} target="_blank" rel="noreferrer"><img src={r.url} alt="" loading="lazy" /></a> : <span className="ph">{r.status === "FAILED" ? t("failed", "lỗi") : t("running…", "đang chạy…")}</span>}
            <b className={r.pass == null ? "" : r.pass ? "good" : "bad"}>{r.pass == null ? (r.status === "SUCCESS" ? t("not judged", "chưa chấm") : r.status === "FAILED" ? t("failed", "lỗi") : r.status === "JUDGING" ? t("judging…", "đang chấm…") : t("running…", "đang chạy…")) : r.pass ? t("pass", "đạt") : t("fail", "lỗi")}{r.mark != null ? ` (${t("by you", "bạn chấm")})` : ""}</b>
            {r.verdict && !r.verdict.pass && <span className="small">{r.verdict.problems.join("; ")}</span>}
            {r.error && <span className="small">{bi(r.error)}</span>}
            {r.status === "SUCCESS" && <span className="marks">
              <button type="button" aria-pressed={r.mark === true} onClick={() => mark(r, r.mark === true ? null : true)}>✓</button>
              <button type="button" aria-pressed={r.mark === false} onClick={() => mark(r, r.mark === false ? null : false)}>✗</button>
            </span>}
          </div>
        ))}</div>
      </div>

      <div className="card">
        <h2>{t("Regression set", "Bộ kiểm thử")}</h2>
        <p className="muted small">{t("Cases in the set are replayed together after a prompt or model change, to check a fix does not break them.", "Các ca trong bộ được chạy lại cùng nhau sau mỗi lần đổi prompt hoặc model, để chắc bản sửa không làm hỏng chúng.")}</p>
        <div className="toolbar" style={{ justifyContent: "flex-start" }}>
          <input value={regNote} maxLength={300} onChange={(e) => setRegNote(e.target.value)} placeholder={t("What to look for", "Cần kiểm tra điều gì")} style={{ flex: 1, minWidth: 200, padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 4 }} />
          <button type="button" className="import" onClick={() => setReg(true)}>{c.regression ? t("Save note", "Lưu ghi chú") : t("Add to set", "Thêm vào bộ")}</button>
          {c.regression && <button type="button" className="import" onClick={() => setReg(false)}>{t("Remove", "Bỏ khỏi bộ")}</button>}
        </div>
      </div>

      <details className="card">
        <summary>{t("Everything stored with this result (scout readings, options)", "Toàn bộ dữ liệu lưu kèm (kết quả đọc ảnh, tuỳ chọn)")}</summary>
        <pre>{JSON.stringify(c.params, null, 2)}</pre>
        {!!c.plan && <pre>{JSON.stringify(c.plan, null, 2)}</pre>}
      </details>
    </>
  );
}

const CSS = `
.inv .cases { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 12px; }
.inv .case { display: grid; gap: 4px; align-content: start; padding: 8px; border: 1px solid var(--line); border-radius: 8px; background: #fff; text-align: left; cursor: pointer; font: inherit; }
.inv .case:hover { border-color: #17191b; }
.inv .thumb { display: grid; place-items: center; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 6px; background: #f4f1ea; }
.inv .thumb img { width: 100%; height: 100%; object-fit: cover; }
.inv .tags { display: flex; flex-wrap: wrap; gap: 4px; } .inv .tags em { font-style: normal; font-size: 11px; padding: 2px 6px; border-radius: 99px; background: #f1eee7; }
.inv .tags em.bad, .inv b.bad { color: #9b1c1c; } .inv .tags em.good, .inv b.good { color: #1d6b3a; }
.inv .quote { color: var(--muted); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.inv .shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr)); gap: 10px; }
.inv .shots a { display: grid; gap: 4px; color: inherit; text-decoration: none; font-size: 12px; }
.inv .shots img { width: 100%; aspect-ratio: 4 / 3; object-fit: contain; background: #f4f1ea; border-radius: 6px; }
.inv .attempt { display: grid; gap: 4px; align-content: start; font-size: 13px; }
.inv .attempt .ph { display: grid; place-items: center; aspect-ratio: 4 / 3; background: #f4f1ea; border-radius: 6px; color: var(--muted); }
.inv .marks { display: flex; gap: 6px; } .inv .marks button { padding: 3px 12px; border: 1px solid var(--line); border-radius: 4px; background: #fff; cursor: pointer; }
.inv .marks button[aria-pressed="true"] { background: #17191b; color: #fff; }
.inv .import.primary { background: #17191b; color: #fff; } .inv button:disabled { opacity: .45; cursor: default; }
.inv select { padding: 5px 6px; border: 1px solid var(--line); border-radius: 4px; }
.inv pre { margin: 0; max-height: 360px; overflow: auto; padding: 10px; background: #f7f5f0; border-radius: 6px; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
.inv details summary { cursor: pointer; font-weight: 600; }
`;
