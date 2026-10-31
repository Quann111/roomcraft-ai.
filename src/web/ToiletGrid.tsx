import React, { useState } from "react";
import { t } from "./i18n";
import type { Toilet } from "./GeneratePanel";

type Filter = Toilet["type"] | "all" | "kids";
const TYPES: [Filter, string, string][] = [["all", "All", "Tất cả"], ["one-piece", "One-piece", "Một khối"], ["two-piece", "Two-piece", "Hai khối"], ["wall-hung", "Wall-hung", "Treo tường"], ["smart", "Smart", "Thông minh"], ["kids", "Kids", "Trẻ em"]];
const fits = (x: Toilet, f: Filter) => f === "all" || (f === "kids" ? !!x.kids : x.type === f);
export const toiletType = (k: Filter) => { const x = TYPES.find(([v]) => v === k)!; return t(x[1], x[2]); };

/** Viglacera toilets to install, filtered by type; the card shows the model code (price and link once the supplier sends them). */
export function ToiletGrid({ toilets, value, pick }: { toilets: Toilet[]; value: string; pick: (name: string) => void }) {
  const [type, setType] = useState<Filter>("all");
  const list = toilets.filter((x) => fits(x, type));
  return (
    <>
      <div className="segmented" style={{ flexWrap: "wrap", marginBottom: 10 }}>
        {TYPES.filter(([k]) => toilets.some((x) => fits(x, k))).map(([k, en, vi]) => (
          <button key={k} type="button" className={type === k ? "active" : ""} onClick={() => setType(k)}>{t(en, vi)} · {toilets.filter((x) => fits(x, k)).length}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 8, maxHeight: 420, overflowY: "auto", padding: 2 }}>
        {list.map((x) => {
          const on = value === x.name;
          return (
            <button key={x.name} type="button" title={`${x.name} · ${toiletType(x.type)}`} aria-pressed={on} onClick={() => pick(x.name)}
              style={{ display: "block", minWidth: 0, padding: 0, borderRadius: 8, overflow: "hidden", background: "#fff", cursor: "pointer", textAlign: "left", border: "1px solid #e2ded6", outline: on ? "2px solid #1c1b19" : "none", outlineOffset: -1 }}>
              <span style={{ display: "block", position: "relative" }}>
                <img src={x.thumb} alt="" loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "1", objectFit: "contain", background: "#fff" }} />
                <span aria-hidden="true" style={{ position: "absolute", top: 4, left: 4, padding: "2px 5px", borderRadius: "var(--radius, 4px)", color: "#fff", background: "#1f5aa6", fontSize: 8, fontWeight: 700, letterSpacing: ".4px", lineHeight: 1.2 }}>VIGLACERA</span>
              </span>
              <span style={{ display: "block", padding: "4px 4px 0", fontSize: 11, fontWeight: 600, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.code}</span>
              <span style={{ display: "block", padding: "0 4px 4px", fontSize: 9, color: "#8b8f93", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {toiletType(x.type)}{x.kids ? ` · ${toiletType("kids")}` : ""}{x.price ? ` · ${x.price.toLocaleString("vi-VN")}₫` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
