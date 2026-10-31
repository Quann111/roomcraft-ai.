import React from "react";
import { t } from "./i18n";
import type { Slab } from "./GeneratePanel";

/** Surfaces a VASTA slab can go on. */
export const SLAB_SURFACES = ["countertops", "island"];
/** Swatch folder per surface: the island shares the worktop swatches. */
export const swatchDir = (surface: string) => (surface === "island" ? "countertops" : surface);
export const slabLabel = (s: Slab) => s.title;

/** VASTA ESSENTIALS slab designs (280 × 120 cm) for the worktops or the island top; the sheen is picked on the finish scale. */
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
              {/* Collection badge in the gold of the VICOSTONE badge; a full-width band so the long name fits even narrow cells. */}
              <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "2px 2px", color: "var(--ink, #1c1b19)", background: "var(--gold, #c9a24b)", fontSize: 7, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>VASTA ESSENTIALS</span>
            </span>
            <span style={{ display: "block", padding: "4px 4px 0", fontSize: 10, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.title}</span>
            <span style={{ display: "block", padding: "0 4px 4px", fontSize: 9, color: "#8b8f93", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.code || "\u00a0"}</span>
          </button>
        ))}
      </div>
    </>
  );
}
