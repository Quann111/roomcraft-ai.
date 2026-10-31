import React, { useEffect, useState } from "react";
import { bi, t } from "./i18n";

export type Feedback = { rating: 1 | -1; reasons: string[]; note: string } | null;
const REASONS: [string, string, string][] = [
  ["structure", "Wrong layout or structure", "Sai kết cấu, bố cục"], ["objects", "Objects lost or added", "Mất / thêm đồ vật"],
  ["product", "Wrong product or material", "Sai mẫu sản phẩm / vật liệu"], ["angle", "Turned or wrong angle", "Xoay lệch / sai góc"],
  ["color", "Color or light", "Màu / ánh sáng"], ["other", "Other", "Khác"],
];
const pill = (on: boolean): React.CSSProperties => ({ padding: "4px 10px", borderRadius: 99, border: "1px solid var(--line)", background: on ? "#1c1b19" : "var(--white)", color: on ? "#fff" : "inherit", cursor: "pointer", fontSize: 12 });

/** 👍/👎 under a result; 👎 asks what went wrong (reasons and a note) so the team can look into it. 👍 again, or "Remove" under 👎, clears it. */
export function ResultFeedback({ id, initial }: { id: string; initial?: Feedback }) {
  const [fb, setFb] = useState<Feedback>(initial ?? null);
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState<string[]>(initial?.reasons ?? []);
  const [note, setNote] = useState(initial?.note ?? "");
  const [msg, setMsg] = useState("");
  const show = (f: Feedback) => { setFb(f); setReasons(f?.reasons ?? []); setNote(f?.note ?? ""); };
  // Without `initial` (a history preview) the rating is read from the generation.
  useEffect(() => {
    show(initial ?? null); setOpen(false); setMsg("");
    if (initial === undefined) fetch(`/api/generations/${id}`).then((r) => (r.ok ? r.json() : null)).then((d: any) => d && show(d.feedback ?? null)).catch(() => {});
  }, [id]);

  const save = async (rating: 1 | -1 | 0, rs: string[] = [], n = "") => {
    setMsg("");
    const r = await fetch(`/api/generations/${id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, reasons: rs, note: n }) }).catch(() => null);
    const d: any = await r?.json().catch(() => ({}));
    if (!r?.ok) { setMsg(bi(d?.error ?? "Could not save · Không lưu được")); return; }
    setFb(d.feedback); setOpen(false);
    setMsg(rating ? t("Thanks, noted.", "Cảm ơn, đã ghi nhận.") : "");
  };
  const toggle = (k: string) => setReasons((rs) => (rs.includes(k) ? rs.filter((x) => x !== k) : [...rs, k]));

  return (
    <div style={{ marginTop: 12, fontSize: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: "var(--stone)" }}>{t("Is this result what you wanted?", "Kết quả có như ý không?")}</span>
        <button type="button" style={pill(fb?.rating === 1)} aria-pressed={fb?.rating === 1} onClick={() => save(fb?.rating === 1 ? 0 : 1)}>👍 {t("Yes", "Có")}</button>
        <button type="button" style={pill(fb?.rating === -1 || open)} aria-pressed={fb?.rating === -1} onClick={() => setOpen(!open)}>👎 {t("No", "Chưa")}</button>
        {msg && <span style={{ color: "var(--stone)" }}>{msg}</span>}
      </div>
      {open && (
        <div style={{ marginTop: 10, padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: "var(--white)", display: "grid", gap: 10 }}>
          <span>{t("What went wrong? (pick any)", "Chưa ổn ở đâu? (chọn một hoặc nhiều)")}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {REASONS.map(([k, en, vi]) => <button key={k} type="button" style={pill(reasons.includes(k))} aria-pressed={reasons.includes(k)} onClick={() => toggle(k)}>{t(en, vi)}</button>)}
          </div>
          <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Anything else? (optional)", "Mô tả thêm (không bắt buộc)")}
            style={{ width: "100%", padding: 8, border: "1px solid var(--line)", borderRadius: 6, font: "inherit", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="outline-btn" onClick={() => save(-1, reasons, note)}>{t("Send", "Gửi")}</button>
            <button type="button" className="outline-btn" onClick={() => setOpen(false)}>{t("Cancel", "Huỷ")}</button>
            {fb?.rating === -1 && <button type="button" className="outline-btn" onClick={() => save(0)}>{t("Remove my rating", "Bỏ đánh giá")}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
