import React from "react";
import { bi, t } from "./i18n";

/** The sheen scale shared by paint and Material Swap, from flat to shiny (keys match the worker's FINISHES). */
export const FINISHES = ["matte", "textured", "satin", "semi-gloss", "gloss"] as const;

/**
 * Five-step sheen picker (Mờ · Nhám · Bóng nhẹ · Bán bóng · Bóng). With `optional`, a first "Natural" step leaves the
 * material's own finish, and clicking the chosen step again goes back to it.
 */
export function FinishPicker({ value, onChange, optional }: { value?: string; onChange: (f: string | undefined) => void; optional?: boolean }) {
  const steps: (string | undefined)[] = optional ? [undefined, ...FINISHES] : [...FINISHES];
  return (
    <div role="radiogroup" aria-label={t("Finish", "Độ bóng")} style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {steps.map((f) => {
        const on = value === f;
        return (
          <button key={f ?? "natural"} type="button" role="radio" aria-checked={on} onClick={() => onChange(on && optional ? undefined : f)}
            style={{ flex: "1 1 auto", minWidth: 0, padding: "6px 8px", border: `1px solid ${on ? "#1c1b19" : "rgba(0,0,0,0.14)"}`, borderRadius: 6, fontSize: 12, cursor: "pointer", background: on ? "#1c1b19" : "#fff", color: on ? "#fff" : "#1c1b19", fontFamily: "inherit" }}>
            {f ? bi(f) : t("Natural", "Tự nhiên")}
          </button>
        );
      })}
    </div>
  );
}
