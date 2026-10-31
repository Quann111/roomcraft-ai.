import React from "react";
import { t } from "./i18n";
import type { Slab } from "./GeneratePanel";

/** Surfaces a VASTA slab can go on. */
export const SLAB_SURFACES = ["countertops", "island"];
/** Swatch folder per surface: the island shares the worktop swatches. */
export const swatchDir = (surface: string) => (surface === "island" ? "countertops" : surface);
export const slabLabel = (s: Slab) => `${s.title} · ${s.finish === "matte" ? t("Matte", "Mờ") : t("Polished", "Bóng")}`;

/** VASTA ESSENTIALS slabs (280 × 120 cm) for the worktops or the island top; each product code is one finish. */
export function SlabGrid({ slabs, active, pick }: { slabs: Slab[]; active: (name: string) => boolean; pick: (name: string) => void }) {
  return (
    <>
      <b style={{ display: "block", margin: "14px 0 8px", fontSize: 13 }}>{t("VASTA ESSENTIALS slabs · 280 × 120 cm", "Đá tấm VASTA ESSENTIALS · 280 × 120 cm")}</b>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8 }}>
        {slabs.map((x) => (
          <button key={x.name} type="button" title={`${x.title}${x.code ? ` ${x.code}` : ""}`} aria-pressed={active(x.name)} onClick={() => pick(x.name)}
            style={{ display: "block", minWidth: 0, padding: 0, borderRadius: 8, overflow: "hidden", background: "#fff", cursor: "pointer", textAlign: "left", border: "1px solid #e2ded6", outline: active(x.name) ? "2px solid #1c1b19" : "none", outlineOffset: -1 }}>
            <span style={{ display: "block", position: "relative" }}>
              <img src={x.thumb} alt="" loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "1", objectFit: "cover" }} />
              <span aria-hidden="true" style={{ position: "absolute", top: 4, left: 4, padding: "2px 5px", borderRadius: 4, color: "#1c1b19", background: x.finish === "matte" ? "#e9e4da" : "#c9a24b", fontSize: 8, fontWeight: 700, letterSpacing: ".3px", lineHeight: 1.2 }}>{x.finish === "matte" ? t("MATTE", "MỜ") : t("POLISHED", "BÓNG")}</span>
            </span>
            <span style={{ display: "block", padding: "4px 4px 0", fontSize: 10, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.title}</span>
            <span style={{ display: "block", padding: "0 4px 4px", fontSize: 9, color: "#8b8f93", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.code || "\u00a0"}</span>
          </button>
        ))}
      </div>
    </>
  );
}
