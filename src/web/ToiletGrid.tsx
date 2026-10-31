import React, { useState } from "react";
import { t } from "./i18n";
import type { Toilet, Basin, Faucet } from "./GeneratePanel";

type Item = { code: string; name: string; thumb: string; price?: number; url?: string };
type Filter<T> = [key: string, en: string, vi: string, fits: (x: T) => boolean];

const TOILET_FILTERS: Filter<Toilet>[] = [["one-piece", "One-piece", "Một khối", (x) => x.type === "one-piece"], ["two-piece", "Two-piece", "Hai khối", (x) => x.type === "two-piece"],
  ["wall-hung", "Wall-hung", "Treo tường", (x) => x.type === "wall-hung"], ["smart", "Smart", "Thông minh", (x) => x.type === "smart"], ["kids", "Kids", "Trẻ em", (x) => !!x.kids]];
const BASIN_FILTERS: Filter<Basin>[] = [["vessel", "Countertop", "Đặt bàn", (x) => x.type === "vessel"], ["inset", "Inset", "Âm/dương vành", (x) => x.type === "inset"],
  ["wall-hung", "Wall-hung", "Treo tường", (x) => x.type === "wall-hung"], ["top", "Vanity top", "Liền mặt bàn", (x) => x.type === "top"]];
const FAUCET_FILTERS: Filter<Faucet>[] = [["short", "Standard", "Vòi thấp", (x) => x.type === "short"], ["tall", "Tall", "Vòi cao", (x) => x.type === "tall"], ["sensor", "Sensor", "Cảm ứng", (x) => x.type === "sensor"]];
const label = <T,>(filters: Filter<T>[], x: T) => filters.filter(([, , , f]) => f(x)).map(([, en, vi]) => t(en, vi)).join(" · ");

/** One product category: type filters with counts, then the product cards (VIGLACERA badge, code, type, price once known). */
function Grid<T extends Item>({ items, filters, value, pick, first }: { items: T[]; filters: Filter<T>[]; value: string; pick: (name: string) => void; first?: (x: T) => boolean }) {
  const [key, setKey] = useState("all");
  const fit = (x: T) => key === "all" || filters.find(([k]) => k === key)![3](x);
  const list = items.filter(fit).sort((a, b) => (first ? Number(first(b)) - Number(first(a)) : 0));
  return (
    <>
      <div className="segmented" style={{ flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" className={key === "all" ? "active" : ""} onClick={() => setKey("all")}>{t("All", "Tất cả")} · {items.length}</button>
        {filters.filter(([, , , f]) => items.some(f)).map(([k, en, vi, f]) => (
          <button key={k} type="button" className={key === k ? "active" : ""} onClick={() => setKey(k)}>{t(en, vi)} · {items.filter(f).length}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 8, maxHeight: 420, overflowY: "auto", padding: 2 }}>
        {list.map((x) => {
          const on = value === x.name;
          return (
            <button key={x.name} type="button" title={`${x.code} · ${label(filters, x)}`} aria-pressed={on} onClick={() => pick(on ? "" : x.name)}
              style={{ display: "block", minWidth: 0, padding: 0, borderRadius: 8, overflow: "hidden", background: "#fff", cursor: "pointer", textAlign: "left", border: "1px solid #e2ded6", outline: on ? "2px solid #1c1b19" : "none", outlineOffset: -1 }}>
              <span style={{ display: "block", position: "relative" }}>
                <img src={x.thumb} alt="" loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "1", objectFit: "contain", background: "#fff" }} />
                <span aria-hidden="true" style={{ position: "absolute", top: 4, left: 4, padding: "2px 5px", borderRadius: "var(--radius, 4px)", color: "#fff", background: "#1f5aa6", fontSize: 8, fontWeight: 700, letterSpacing: ".4px", lineHeight: 1.2 }}>VIGLACERA</span>
              </span>
              <span style={{ display: "block", padding: "4px 4px 0", fontSize: 11, fontWeight: 600, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.code}</span>
              <span style={{ display: "block", padding: "0 4px 4px", fontSize: 9, color: "#8b8f93", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {label(filters, x)}{x.price ? ` · ${x.price.toLocaleString("vi-VN")}₫` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

type Pick = { toilet: string; basin: string; faucet: string };
/**
 * Viglacera sanitaryware picker: toilet, basin and basin tap in tabs; each is optional and all picked ones are installed in
 * one image. A countertop vessel basin without its own tap deck needs a tall tap, so tall taps come first and a short pick
 * gets a hint.
 */
export function SanitaryPicker({ toilets, basins, faucets, value, set }: { toilets: Toilet[]; basins: Basin[]; faucets: Faucet[]; value: Pick; set: (p: Partial<Pick>) => void }) {
  const [tab, setTab] = useState<keyof Pick>(value.toilet || (!value.basin && !value.faucet) ? "toilet" : value.basin ? "basin" : "faucet");
  const basin = basins.find((x) => x.name === value.basin), faucet = faucets.find((x) => x.name === value.faucet);
  const needsTall = basin?.type === "vessel" && !basin.deck;
  const tabs: [keyof Pick, string, string][] = [["toilet", "Toilet", "Bồn cầu"], ["basin", "Basin", "Chậu rửa"], ["faucet", "Basin tap", "Vòi chậu"]];
  const picked = tabs.filter(([k]) => value[k]);
  const code = (k: keyof Pick) => [...toilets, ...basins, ...faucets].find((x) => x.name === value[k])?.code;
  return (
    <>
      <div className="segmented">{tabs.map(([k, en, vi]) => <button key={k} type="button" className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{t(en, vi)}{value[k] ? " ✓" : ""}</button>)}</div>
      <p className="helper" style={{ margin: "6px 0 8px" }}>{t("Pick one, two or all three; they are installed together in one image.", "Chọn 1, 2 hoặc cả 3 món; tất cả được lắp cùng lúc trong một ảnh.")}</p>
      {picked.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 10, fontSize: 12 }}>
          <span style={{ color: "var(--stone)" }}>{t("Will install:", "Sẽ lắp:")}</span>
          {picked.map(([k, en, vi]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 4px 3px 8px", border: "1px solid var(--line)", borderRadius: 99, background: "var(--white)" }}>
              <b>{t(en, vi)}</b> · {code(k)}
              <button type="button" aria-label={t("Remove", "Bỏ")} onClick={() => set({ [k]: "" })} style={{ border: 0, background: "none", cursor: "pointer", padding: "0 4px", color: "var(--stone)" }}>×</button>
            </span>
          ))}
        </div>
      )}
      {tab === "toilet" && <Grid items={toilets} filters={TOILET_FILTERS} value={value.toilet} pick={(n) => set({ toilet: n })} />}
      {tab === "basin" && <Grid items={basins} filters={BASIN_FILTERS} value={value.basin} pick={(n) => set({ basin: n })} />}
      {tab === "faucet" && <Grid items={faucets} filters={FAUCET_FILTERS} value={value.faucet} pick={(n) => set({ faucet: n })} first={needsTall ? (x) => x.type === "tall" : undefined} />}
      {needsTall && faucet && faucet.type !== "tall" && (
        <p className="helper" style={{ color: "#8a5a00" }}>{t(`${basin!.code} sits on the counter with no tap deck: a tall tap reaches its bowl best.`, `${basin!.code} là chậu đặt bàn không có lỗ vòi: nên chọn vòi cao để với tới lòng chậu.`)}</p>
      )}
    </>
  );
}
