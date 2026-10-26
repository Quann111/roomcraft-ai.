import React, { useEffect, useState } from "react";
import { t } from "./i18n";

// Loading state for AI jobs: "SOLYC Analyzing" while the photo is read, then "SOLYC Thinking", with the SOLYC mark inside a
// spinning gold ring and a shimmer.
// The small line under it cycles through what the AI is doing; `eta` is the usual wait for this kind of job.
type Kind = "image" | "video" | "analysis";
const ANALYZE_MS = 6000, STEP_MS = 4500;
const STEPS: Record<Kind, [string, string][]> = {
  image: [["Reading layout, light and materials", "Đọc bố cục, ánh sáng và vật liệu"], ["Planning the design", "Lên phương án thiết kế"], ["Placing furniture and finishes", "Sắp đặt nội thất và vật liệu"], ["Refining lighting and details", "Tinh chỉnh ánh sáng và chi tiết"]],
  video: [["Reading the scene", "Đọc khung cảnh"], ["Planning the camera move", "Lên chuyển động máy quay"], ["Rendering frames", "Dựng từng khung hình"], ["Adding ambient sound", "Thêm âm thanh nền"]],
  analysis: [["Reading the room", "Đọc không gian"], ["Weighing style and layout", "Cân nhắc phong cách và bố cục"], ["Writing suggestions", "Viết gợi ý"]],
};
const ETA: Record<Kind, [string, string]> = {
  image: ["Usually 1–2 minutes", "Thường mất 1–2 phút"], video: ["Usually 1–3 minutes", "Thường mất 1–3 phút"], analysis: ["Usually 20–30 seconds", "Thường mất 20–30 giây"],
};

/** `compact`: one row for narrow panels; `tile`: small and stacked, for a result card in a grid. */
export function AiThinking({ kind = "image", compact = false, tile = false }: { kind?: Kind; compact?: boolean; tile?: boolean }) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setMs(Date.now() - start), 500);
    return () => clearInterval(id);
  }, []);
  const thinking = ms >= ANALYZE_MS;
  const steps = STEPS[kind];
  const step = steps[thinking ? Math.min(steps.length - 1, 1 + Math.floor((ms - ANALYZE_MS) / STEP_MS)) : 0];
  return (
    <div className={`ai-thinking ${compact ? "compact" : ""} ${tile ? "tile" : ""}`} role="status" aria-live="polite">
      <style>{CSS}</style>
      <span className="ai-orb" aria-hidden="true"><i><img src="/solyc/symbol-gold.svg" alt="" /></i></span>
      <div className="ai-copy">
        <b className="ai-word">SOLYC {thinking ? "Thinking" : "Analyzing"}<span className="ai-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></b>
        <span className="ai-step" key={step[0]}>{t(...step)}</span>
        {!compact && !tile && <small className="ai-eta">{t(...ETA[kind])}</small>}
      </div>
    </div>
  );
}

const CSS = `
.ai-thinking { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 36px 12px; text-align: center; }
.ai-thinking.compact { flex-direction: row; gap: 12px; padding: 18px 12px; text-align: left; }
/* Only the ring (::before) spins; the inner disc with the logo stays upright. */
.ai-orb { position: relative; width: 58px; height: 58px; flex: 0 0 auto; border-radius: 50%;
  box-shadow: 0 0 26px rgba(180, 135, 61, .45); animation: ai-pulse 2.4s ease-in-out infinite; }
.ai-orb::before { content: ""; position: absolute; inset: 0; border-radius: 50%; filter: saturate(1.1);
  background: conic-gradient(from 0deg, #B4873D, #F3E2BC, #8C6526, #E7C98C, #B4873D); animation: ai-spin 3.2s linear infinite; }
.ai-thinking.compact .ai-orb { width: 34px; height: 34px; }
.ai-thinking.tile { gap: 8px; padding: 10px 6px; } .ai-thinking.tile .ai-orb { width: 30px; height: 30px; } .ai-thinking.tile .ai-orb i { inset: 4px; }
.ai-thinking.tile .ai-word { font-size: 13px; } .ai-thinking.tile .ai-step { font-size: 11px; }
.ai-orb i { position: absolute; z-index: 1; inset: 7px; display: grid; place-items: center; overflow: hidden; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #2B2E31 0, #17191B 70%); }
/* The mark fills only ~72% of its SVG canvas, so 120% makes it cover ~86% of the disc and leaves a thin dark rim. */
.ai-orb img { display: block; width: 120%; height: 120%; max-width: none; object-fit: contain; }
.ai-thinking.compact .ai-orb i { inset: 5px; }
.ai-copy { display: grid; gap: 3px; justify-items: inherit; }
.ai-thinking:not(.compact) .ai-copy { justify-items: center; }
.ai-word { font-size: 19px; font-weight: 700; letter-spacing: .02em;
  background: linear-gradient(90deg, #17191B 0%, #17191B 35%, #C99A4B 50%, #17191B 65%, #17191B 100%); background-size: 220% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent; animation: ai-shimmer 2.2s linear infinite; }
.ai-thinking.compact .ai-word { font-size: 15px; }
.ai-dots i { font-style: normal; color: #B4873D; -webkit-text-fill-color: #B4873D; animation: ai-dot 1.2s ease-in-out infinite; }
.ai-dots i:nth-child(2) { animation-delay: .2s; } .ai-dots i:nth-child(3) { animation-delay: .4s; }
.ai-step { font-size: 13px; color: #5d6779; animation: ai-fade .5s ease both; }
.ai-eta { font-size: 11.5px; color: #8b8f96; }
@keyframes ai-spin { to { transform: rotate(360deg); } }
@keyframes ai-pulse { 0%, 100% { box-shadow: 0 0 18px rgba(180, 135, 61, .35); } 50% { box-shadow: 0 0 34px rgba(180, 135, 61, .7); } }
@keyframes ai-shimmer { from { background-position: 110% 0; } to { background-position: -110% 0; } }
@keyframes ai-dot { 0%, 100% { opacity: .2; } 40% { opacity: 1; } }
@keyframes ai-fade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .ai-orb, .ai-orb::before, .ai-word, .ai-dots i, .ai-step { animation: none; }
  .ai-word { background: none; color: #17191B; }
}
`;
