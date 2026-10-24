import { useEffect, useRef } from "react";
import * as H from "@lucasmarkes/hairline/react";
import { mountIso, SCENES, type SceneName } from "./iso";

type HairlineName = Exclude<keyof typeof H, "HairlineProps">;
type Name = SceneName | HairlineName;

export function Figure({ name, caption, dark, intensity = 0.6, style }: { name: Name; caption?: string; dark?: boolean; intensity?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const iso = name in SCENES;
  useEffect(() => (iso && ref.current ? mountIso(ref.current, name as SceneName, { intensity }) : undefined), [name, iso, intensity]);
  const C = !iso ? (H[name as HairlineName] as React.ComponentType<{ play?: boolean; intensity?: number; theme?: "light" | "dark" }>) : null;
  return (
    <figure className={`hl-figure${dark ? " dark" : ""}`} style={{ margin: 0, ...style }}>
      {C ? <C play intensity={intensity} theme={dark ? "dark" : "light"} /> : <div ref={ref} className="iso-box" />}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
