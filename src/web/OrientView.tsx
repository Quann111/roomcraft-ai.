import React, { useEffect, useRef, useState } from "react";
import { t } from "./i18n";

export type Orient = {
  summary: string;
  sides: { side: string; direction: string; rating: "good" | "mixed" | "harsh"; sun: string; wind: string; impact: string }[];
  recommendations: { area: string; suggestion: string; why: string; priority: "high" | "medium" | "low" }[];
  roomNotes: string[];
};

export const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const DIR_NAMES: Record<string, [string, string]> = {
  N: ["North", "Bắc"], NE: ["Northeast", "Đông Bắc"], E: ["East", "Đông"], SE: ["Southeast", "Đông Nam"],
  S: ["South", "Nam"], SW: ["Southwest", "Tây Nam"], W: ["West", "Tây"], NW: ["Northwest", "Tây Bắc"],
};
const tt = (p: readonly [string, string]) => t(p[0], p[1]);
const dirName = (d: string) => tt(DIR_NAMES[d] ?? [d, d]);
// Sides in the worker's order: front, +90°, back, +270°. A street photo is seen from outside, so +90° is on its left.
const SIDE_NAMES = {
  plan: [["Top edge of the plan", "Cạnh trên bản vẽ"], ["Right edge", "Cạnh phải"], ["Bottom edge", "Cạnh dưới"], ["Left edge", "Cạnh trái"]],
  facade: [["Front (in the photo)", "Mặt tiền (trong ảnh)"], ["Left of the photo", "Bên trái ảnh"], ["Back", "Mặt sau"], ["Right of the photo", "Bên phải ảnh"]],
} as const;
const RATING = {
  good: { label: ["Good", "Tốt"], color: "#24613f", bg: "#e3f2ea", stroke: "#2f8a57" },
  mixed: { label: ["Mixed", "Trung bình"], color: "#8a5300", bg: "#fbf0dc", stroke: "#d28a1c" },
  harsh: { label: ["Harsh", "Gắt"], color: "#9b1c1c", bg: "#fde8e7", stroke: "#c8362e" },
} as const;
const PRIORITY = { high: ["High priority", "Ưu tiên cao"], medium: ["Medium", "Vừa"], low: ["Nice to have", "Nên có"] } as const;

/** Compass with the home drawn as a square whose edges are coloured by how harsh that side's exposure is. */
function Compass({ facing, rating }: { facing: string; rating: (dir: string) => Orient["sides"][number]["rating"] | undefined }) {
  const a = DIRS.indexOf(facing) * 45;
  const edge = (i: number) => RATING[rating(DIRS[(DIRS.indexOf(facing) + i * 2) % 8]) ?? "mixed"].stroke;
  return (
    <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label={t("Sun exposure by side", "Mức nắng theo từng mặt")} style={{ flex: "none" }}>
      <circle cx="90" cy="90" r="78" fill="none" stroke="rgba(0,0,0,0.15)" />
      {DIRS.map((d, i) => {
        const r = (i * 45 - 90) * (Math.PI / 180);
        return <text key={d} x={90 + 68 * Math.cos(r)} y={90 + 68 * Math.sin(r) + 4} textAnchor="middle" fontSize="11" fontWeight={d === "N" ? 700 : 400} fill="#1c1b19">{d}</text>;
      })}
      <g transform={`rotate(${a} 90 90)`}>
        <rect x="60" y="60" width="60" height="60" fill="#f4f1ea" />
        <line x1="60" y1="60" x2="120" y2="60" stroke={edge(0)} strokeWidth="7" />
        <line x1="120" y1="60" x2="120" y2="120" stroke={edge(1)} strokeWidth="7" />
        <line x1="120" y1="120" x2="60" y2="120" stroke={edge(2)} strokeWidth="7" />
        <line x1="60" y1="120" x2="60" y2="60" stroke={edge(3)} strokeWidth="7" />
        <path d="M90 40 L84 52 L96 52 Z" fill="#1c1b19" />
      </g>
    </svg>
  );
}

/** Orientation analysis plus an optional illustration rendered from the stored analysis (1 credit). */
export function OrientView({ photo, o, id, params, onCredits, Compare }: {
  photo: string | null; o: Orient; id: string; params: { kind?: string; facing?: string; city?: string };
  onCredits?: () => void; Compare: (p: { before: string | null; after: string }) => React.ReactElement;
}) {
  const kind = params.kind === "facade" ? "facade" : "plan";
  const facing = DIRS.includes(params.facing ?? "") ? params.facing! : "N";
  const [render, setRender] = useState<{ status: string; outputUrl?: string | null; error?: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { setRender(null); clearTimeout(timer.current); }, [id]);

  const sideOf = (dir: string) => o.sides.find((s) => s.direction === dir);
  const ordered = [0, 1, 2, 3].map((i) => ({ i, dir: DIRS[(DIRS.indexOf(facing) + i * 2) % 8] })).map((x) => ({ ...x, s: sideOf(x.dir) }));

  const illustrate = async () => {
    setRender({ status: "RUNNING" });
    try {
      const r = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "exterior-orient-render", sourceId: id, inputKey: photo?.replace(/^\/api\/images\//, ""), resolution: "1k" }),
      });
      const d: any = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Error · Lỗi");
      onCredits?.();
      const poll = () => { timer.current = window.setTimeout(async () => {
        const g: any = await fetch(`/api/generations/${d.id}`).then((x) => x.json()).catch(() => ({ status: "RUNNING" }));
        if (g.status === "RUNNING" || g.status === "QUEUED") return poll();
        setRender({ status: g.status, outputUrl: g.outputUrl, error: g.error }); onCredits?.();
      }, 5000); };
      poll();
    } catch (e: any) { setRender({ status: "FAILED", error: e.message }); }
  };

  const h = { margin: "0 0 6px", fontSize: 15, fontWeight: 600 } as const;
  const chip = (c: { color: string; bg: string }) => ({ fontSize: 11, fontWeight: 600, padding: "1px 8px", borderRadius: 999, color: c.color, background: c.bg }) as const;
  return (
    <div style={{ display: "grid", gap: 16, textAlign: "left" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Compass facing={facing} rating={(d) => sideOf(d)?.rating} />
        <div style={{ minWidth: 0, flex: "1 1 220px", display: "grid", gap: 6 }}>
          <div style={{ fontSize: 13, opacity: 0.7 }}>{params.city} · {kind === "plan" ? t(`Top of the plan faces ${dirName(facing)}`, `Phía trên bản vẽ nhìn hướng ${dirName(facing)}`) : t(`Facade faces ${dirName(facing)}`, `Mặt tiền nhìn hướng ${dirName(facing)}`)}</div>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{o.summary}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 230px), 1fr))", gap: 10 }}>
        {ordered.map(({ i, dir, s }) => (
          <div key={i} style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 4 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <b>{tt(SIDE_NAMES[kind][i])} · {dirName(dir)}</b>
              {s && <span style={chip(RATING[s.rating])}>{tt(RATING[s.rating].label)}</span>}
            </div>
            {s ? <>
              <p style={{ margin: 0, fontSize: 13 }}>☀ {s.sun}</p>
              <p style={{ margin: 0, fontSize: 13 }}>≋ {s.wind}</p>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>{s.impact}</p>
            </> : <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>–</p>}
          </div>
        ))}
      </div>

      <div>
        <h4 style={h}>{t("Recommended design changes", "Đề xuất thiết kế")}</h4>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
          {o.recommendations.map((x, i) => (
            <li key={i} style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <b>{x.area}</b><span style={chip(x.priority === "high" ? RATING.harsh : x.priority === "medium" ? RATING.mixed : RATING.good)}>{tt(PRIORITY[x.priority])}</span>
              </div>
              <p style={{ margin: "6px 0 0" }}>→ {x.suggestion}</p>
              {x.why && <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.7 }}>{x.why}</p>}
            </li>
          ))}
        </ol>
      </div>

      {o.roomNotes.length > 0 && <div><h4 style={h}>{t("Room by room", "Theo từng phòng")}</h4><ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>{o.roomNotes.map((n) => <li key={n}>{n}</li>)}</ul></div>}

      <div style={{ display: "grid", gap: 10 }}>
        <h4 style={{ ...h, margin: 0 }}>{t("See it applied", "Xem phương án minh hoạ")}</h4>
        {!render ? (
          <button type="button" onClick={illustrate} style={{ justifySelf: "start", padding: "10px 16px", borderRadius: 10, border: "none", background: "#1c1b19", color: "#fff", cursor: "pointer", font: "inherit" }}>
            {kind === "plan" ? t("Render the plan with these changes · 1 credit", "Render mặt bằng với các đề xuất · 1 credit") : t("Render the facade with these changes · 1 credit", "Render mặt tiền với các đề xuất · 1 credit")}
          </button>
        ) : render.status === "SUCCESS" && render.outputUrl ? <>
          <Compare before={photo} after={render.outputUrl} />
          <a href={render.outputUrl} download={`climate-${id}.png`} style={{ justifySelf: "start", fontSize: 13 }}>{t("Download", "Tải xuống")}</a>
        </> : render.status === "FAILED" ? <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>{t("Could not render (credit refunded)", "Chưa render được (đã hoàn credit)")}{render.error ? ` · ${render.error}` : ""}</p>
          : <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{t("Rendering… about 30 seconds.", "Đang render… khoảng 30 giây.")}</p>}
      </div>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>{t("Sun hours are computed from the city's latitude; this is an early design guide, not an engineering simulation.", "Số giờ nắng được tính theo vĩ độ của thành phố; đây là đánh giá sơ bộ để định hướng thiết kế, không thay cho tính toán kỹ thuật.")}</p>
    </div>
  );
}
