import React, { useState } from "react";
import { t } from "./i18n";
import { GUIDES, type L2 } from "./toolGuides";

const KEY = "roomcraft-guide-open";
const tt = (p: L2) => t(p[0], p[1]);
const readOpen = () => { try { return localStorage.getItem(KEY) !== "0"; } catch { return true; } };

/** "How to use this tool" panel: steps, tips, credit cost and a real before/after example. Open by default; the choice is remembered. */
export function ToolGuide({ name }: { name: string }) {
  const g = GUIDES[name];
  const [open, setOpen] = useState(readOpen);
  if (!g) return null;
  const toggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const v = e.currentTarget.open;
    setOpen(v);
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* private mode: fine */ }
  };
  return (
    <details open={open} onToggle={toggle} style={{ margin: "12px 0 4px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, background: "#fff" }}>
      <summary style={{ cursor: "pointer", padding: "12px 16px", fontWeight: 600, listStylePosition: "inside" }}>{t("How to use this tool", "Cách dùng tool này")}</summary>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: "0 16px 16px", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px", minWidth: 0, display: "grid", gap: 12 }}>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{tt(g.what)}</p>
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>{g.steps.map((s, i) => <li key={i}>{tt(s)}</li>)}</ol>
          {g.tips.length > 0 && (
            <div style={{ display: "grid", gap: 4 }}>
              {g.tips.map((s, i) => <p key={i} style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>💡 {tt(s)}</p>)}
            </div>
          )}
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{t("Cost", "Chi phí")}: {tt(g.credits)}</p>
        </div>
        {g.example && (
          <figure style={{ flex: "1 1 360px", minWidth: 0, margin: 0 }}>
            <img src={`/examples/${g.example}.jpg`} alt={t(`Example result of ${name}`, `Ví dụ kết quả của ${name}`)} loading="lazy" style={{ width: "100%", borderRadius: 10, display: "block" }} />
            <figcaption style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>{t("Real result made with this tool", "Kết quả thật được tạo bằng tool này")}</figcaption>
          </figure>
        )}
      </div>
    </details>
  );
}
