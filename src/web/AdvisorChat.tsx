import React, { useEffect, useRef, useState } from "react";
import { bi, getLang, t } from "./i18n";
import { prepareImage, type PreparedImage } from "./imagePrep";

export type Turn = { role: "user" | "assistant"; text: string };

const SUGGESTIONS: [string, string][] = [
  ["How can I make my small living room feel bigger?", "Làm sao để phòng khách nhỏ trông rộng hơn?"],
  ["Which wall colors go with a grey sofa and an oak floor?", "Màu tường nào hợp với sofa xám và sàn gỗ sồi?"],
  ["Help me split my budget for a bedroom makeover.", "Giúp tôi chia ngân sách để làm mới phòng ngủ."],
];

const ink = "#1c1b19", paper = "#f4f1ea", line = "rgba(0,0,0,0.12)";

/** Read-only transcript, used for history previews. */
export function Transcript({ turns }: { turns: Turn[] }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {turns.map((x, i) => (
        <div key={i} style={{ justifySelf: x.role === "user" ? "end" : "start", maxWidth: "85%", padding: "10px 14px", borderRadius: 14, whiteSpace: "pre-wrap", lineHeight: 1.5, textAlign: "left", background: x.role === "user" ? ink : paper, color: x.role === "user" ? "#fff" : ink }}>{x.text}</div>
      ))}
    </div>
  );
}

/** Design Advisor: a chat with the AI designer. One conversation costs 1 credit (MAX turns enforced by the server). */
export function AdvisorChat({ onCreditsChange }: { onCreditsChange?: () => void }) {
  const [meta, setMeta] = useState<{ roomTypes: string[]; budgets: string[] } | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [turnsLeft, setTurnsLeft] = useState<number | null>(null);
  const [photo, setPhoto] = useState<{ prep: PreparedImage; url: string } | null>(null);
  const [room, setRoom] = useState("");
  const [budget, setBudget] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { fetch("/api/styles").then((r) => r.json() as Promise<any>).then(setMeta).catch(() => {}); }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [turns, busy]);

  const pickPhoto = async (f?: File) => {
    if (!f) return;
    setErr("");
    try { const prep = await prepareImage(f); setPhoto({ prep, url: URL.createObjectURL(prep.file) }); } catch (e: any) { setErr(e.message); }
  };

  const send = async (msg: string) => {
    msg = msg.trim();
    if (msg.length < 2 || busy) return;
    setBusy(true); setErr(""); setText("");
    setTurns((a) => [...a, { role: "user", text: msg }]);
    try {
      let inputKey: string | undefined;
      if (!id && photo) {
        const up = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": photo.prep.file.type }, body: photo.prep.file });
        const d: any = await up.json();
        if (!up.ok) throw new Error(d.error ?? "Upload failed · Tải ảnh thất bại");
        inputKey = d.key;
      }
      const r = await fetch("/api/advisor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, message: msg, inputKey, lang: getLang(), roomType: room || undefined, budget: budget || undefined }),
      });
      const d: any = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Error · Lỗi");
      setTurns((a) => [...a, { role: "assistant", text: d.reply }]);
      setTurnsLeft(d.turnsLeft);
      if (!id) { setId(d.id); onCreditsChange?.(); }
    } catch (e: any) {
      setErr(e.message);
      setTurns((a) => a.slice(0, -1)); // drop the unanswered question and give it back to the input
      setText(msg);
    } finally { setBusy(false); }
  };

  const restart = () => { setId(null); setTurns([]); setTurnsLeft(null); setPhoto(null); setErr(""); setText(""); };
  const locked = !!id; // the photo, room and budget are context for the whole conversation
  const done = turnsLeft === 0;
  const chip = (active: boolean): React.CSSProperties => ({ padding: "6px 12px", borderRadius: 999, border: `1px solid ${active ? ink : line}`, background: active ? ink : "transparent", color: active ? "#fff" : ink, cursor: locked ? "default" : "pointer", fontSize: 13 });

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start", textAlign: "left", color: ink }}>
      <aside style={{ flex: "1 1 240px", minWidth: 0, display: "grid", gap: 14 }}>
        <div>
          <h4 style={{ margin: "0 0 8px", fontSize: 15 }}>{t("Your space (optional)", "Không gian của bạn (không bắt buộc)")}</h4>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 130, border: `2px dashed ${line}`, borderRadius: 12, overflow: "hidden", cursor: locked ? "default" : "pointer", padding: 6 }}>
            {photo ? <img src={photo.url} alt="" style={{ maxHeight: 160, width: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 13, opacity: 0.7, textAlign: "center" }}>{t("Add a room photo so the advisor can see it", "Thêm ảnh phòng để trợ lý nhìn thấy không gian")}</span>}
            <input type="file" accept="image/*" hidden disabled={locked} onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </label>
        </div>
        {meta && (
          <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <b>{t("Room type", "Loại phòng")}</b>
            <select value={room} disabled={locked} onChange={(e) => setRoom(e.target.value)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${line}` }}>
              <option value="">{t("Not sure / several rooms", "Chưa rõ / nhiều phòng")}</option>
              {meta.roomTypes.map((r) => <option key={r} value={r}>{bi(r)}</option>)}
            </select>
          </label>
        )}
        {meta && (
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <b>{t("Budget", "Ngân sách")}</b>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {meta.budgets.map((x) => <button key={x} type="button" disabled={locked} style={chip(budget === x)} onClick={() => setBudget(budget === x ? "" : x)}>{bi(x)}</button>)}
            </div>
          </div>
        )}
        <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>
          {locked ? t("Photo, room and budget are set for this conversation.", "Ảnh, loại phòng và ngân sách đã cố định cho cuộc trò chuyện này.") : t("Each conversation costs 1 credit and includes up to 20 questions.", "Mỗi cuộc trò chuyện tốn 1 credit, gồm tối đa 20 câu hỏi.")}
          {turnsLeft != null && ` ${t(`${turnsLeft} questions left.`, `Còn ${turnsLeft} câu hỏi.`)}`}
        </p>
        {id && <button type="button" onClick={restart} style={{ ...chip(false), cursor: "pointer", justifySelf: "start" }}>{t("New conversation", "Cuộc trò chuyện mới")}</button>}
      </aside>

      <section style={{ flex: "2 1 360px", minWidth: 0, border: `1px solid ${line}`, borderRadius: 14, display: "flex", flexDirection: "column", background: "#fff" }}>
        <div style={{ height: 440, overflowY: "auto", padding: 16, display: "grid", alignContent: "start", gap: 10 }}>
          {turns.length === 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{t("Hi! Tell me about your room, how you use it and what you'd like to change. I'll suggest a plan that fits your style and budget.", "Xin chào! Hãy kể về căn phòng của bạn, bạn dùng nó thế nào và muốn thay đổi gì. Mình sẽ gợi ý phương án hợp phong cách và ngân sách của bạn.")}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUGGESTIONS.map((s) => <button key={s[0]} type="button" onClick={() => send(t(...s))} style={{ ...chip(false), cursor: "pointer", textAlign: "left" }}>{t(...s)}</button>)}
              </div>
            </div>
          ) : <Transcript turns={turns} />}
          {busy && <div style={{ justifySelf: "start", padding: "10px 14px", borderRadius: 14, background: paper, opacity: 0.7 }}>{t("Thinking…", "Đang suy nghĩ…")}</div>}
          <div ref={bottom} />
        </div>
        {err && <p style={{ margin: "0 16px 8px", color: "#b3261e", fontSize: 13 }}>{bi(err)}</p>}
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${line}` }}>
          <textarea id="advisor-input" value={text} maxLength={1000} rows={2} disabled={done} placeholder={done ? t("Start a new conversation to keep asking.", "Hãy bắt đầu cuộc trò chuyện mới để hỏi tiếp.") : t("Ask about layout, colors, materials, budget…", "Hỏi về bố cục, màu sắc, vật liệu, ngân sách…")}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
            style={{ flex: 1, minWidth: 0, resize: "none", padding: 10, borderRadius: 10, border: `1px solid ${line}`, font: "inherit" }} />
          <button type="submit" disabled={busy || done || text.trim().length < 2} style={{ padding: "0 18px", borderRadius: 10, border: "none", background: ink, color: "#fff", cursor: "pointer", opacity: busy || done || text.trim().length < 2 ? 0.4 : 1 }}>{t("Send", "Gửi")}</button>
        </form>
      </section>
    </div>
  );
}
