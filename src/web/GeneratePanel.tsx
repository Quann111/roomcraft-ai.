import React, { useEffect, useRef, useState } from "react";
import { bi, getLang, t } from "./i18n";
import { prepareImage, formatBytes, type PreparedImage } from "./imagePrep";
import { AdvisorChat } from "./AdvisorChat";
import { BizPlan } from "./BizPlan";
import { OrientView, DIRS, DIR_NAMES, type Orient } from "./OrientView";

type Meta = {
  styles: { slug: string; name: string; scope: string; thumb?: string }[];
  roomTypes: string[]; intervention: string[];
  surfaces: Record<string, string[]>; paints: { name: string; hex: string }[]; finishes: string[]; weather: string[]; remove: string[]; angles: string[]; planViews: string[]; lockedPlanViews?: string[]; floorTiles?: { code: string; name: string; thumb: string; room?: string }[]; motions: string[]; lighting: string[]; cities: string[];
};
export type Critique = {
  room: string; style: string; score: number; summary: string; strengths: string[];
  improvements: { area: string; issue: string; suggestion: string; priority: "high" | "medium" | "low" }[]; quickWins: string[];
};
export type Finder = { items: { name: string; category: string; description: string; query: string; localQuery: string; priceRange: string; box?: [number, number, number, number] }[] };
type Gen = { id: string; status: string; error?: string; public?: boolean; inputUrl: string | null; outputUrl: string | null; critique?: Critique; finder?: Finder; orient?: Orient; params?: any };
export type Preset = Partial<{ styleSlug: string; roomType: string; intervention: string; surface: string; material: string; weather: string; remove: string[]; angle: string; view: string; color: string; finish: string; description: string }>;

export type ToolId =
  | "interior-redesign" | "interior-staging" | "interior-declutter" | "interior-sketch" | "interior-material"
  | "interior-paint" | "interior-floor" | "interior-transfer" | "interior-text" | "interior-floorplan" | "interior-compose" | "interior-critique" | "interior-advisor" | "interior-bizplan" | "interior-finder" | "interior-video" | "exterior-orient" | "exterior-orient-render" | "interior-lighting"
  | "exterior-redesign" | "exterior-sky" | "exterior-sketch" | "exterior-paint" | "exterior-text" | "garden-redesign" | "garden-text";

type Cfg = { scope?: "interior" | "exterior" | "garden"; room?: boolean; autoRoom?: boolean; intervention?: boolean; remove?: boolean; surface?: boolean; weather?: boolean; angle?: boolean; planView?: boolean; video?: boolean; orient?: boolean; lighting?: boolean; paint?: boolean; floor?: boolean; reference?: boolean; items?: boolean; llm?: boolean; chat?: boolean; bizplan?: boolean; text?: boolean; hint: string };
const CFG: Record<ToolId, Cfg> = {
  "interior-redesign": { scope: "interior", room: true, autoRoom: true, intervention: true, hint: "Room photo to redesign · Ảnh phòng cần thiết kế lại" },
  "interior-staging": { scope: "interior", room: true, hint: "Empty room photo to stage · Ảnh phòng trống cần bài trí" },
  "interior-declutter": { remove: true, hint: "Room photo to declutter · Ảnh phòng cần dọn đồ" },
  "interior-sketch": { scope: "interior", room: true, hint: "Room sketch · Bản phác thảo phòng" },
  "interior-material": { surface: true, hint: "Room photo to retexture · Ảnh phòng cần đổi vật liệu" },
  "interior-paint": { paint: true, hint: "Room photo to repaint · Ảnh phòng cần sơn lại" },
  "interior-floor": { floor: true, hint: "Room photo with a visible floor · Ảnh phòng thấy rõ sàn" },
  "interior-transfer": { reference: true, room: true, intervention: true, hint: "Your room photo · Ảnh phòng của bạn" },
  "interior-text": { text: true, scope: "interior", room: true, hint: "e.g. a bright Scandinavian living room with a big window, oak floor and a green sofa · VD: phòng khách Bắc Âu sáng sủa, cửa sổ lớn, sàn gỗ sồi, sofa xanh lá" },
  "interior-bizplan": { bizplan: true, hint: "2D floor plan · Mặt bằng 2D" },
  "interior-advisor": { chat: true, hint: "Chat with the AI designer · Trò chuyện với nhà thiết kế AI" },
  "exterior-orient": { llm: true, orient: true, hint: "Floor plan or a photo of the facade · Mặt bằng hoặc ảnh mặt tiền" },
  "exterior-orient-render": { hint: "" }, // started from an orientation analysis, not from a form
  "interior-lighting": { lighting: true, hint: "Room photo to relight · Ảnh phòng cần đổi ánh sáng" },
  "interior-video": { video: true, hint: "Room, house or garden photo · Ảnh phòng, nhà hoặc sân vườn" },
  "interior-finder": { llm: true, hint: "Room photo or a generated design · Ảnh phòng hoặc thiết kế đã tạo" },
  "interior-critique": { llm: true, room: true, hint: "Photo of the room to review · Ảnh căn phòng cần nhận xét" },
  "interior-compose": { items: true, room: true, hint: "Photo of your room · Ảnh căn phòng của bạn" },
  "interior-floorplan": { scope: "interior", planView: true, hint: "2D floor plan image or drawing · Ảnh hoặc bản vẽ mặt bằng 2D" },
  "exterior-redesign": { scope: "exterior", angle: true, hint: "House exterior photo · Ảnh mặt ngoài ngôi nhà" },
  "exterior-sky": { weather: true, hint: "House exterior photo · Ảnh mặt ngoài ngôi nhà" },
  "exterior-sketch": { scope: "exterior", hint: "House sketch · Bản phác thảo ngôi nhà" },
  "exterior-paint": { paint: true, hint: "House exterior photo · Ảnh mặt ngoài ngôi nhà" },
  "exterior-text": { text: true, scope: "exterior", hint: "e.g. a two-storey modern house with white render, wood cladding and a flat roof · VD: nhà phố 2 tầng hiện đại, tường trắng, ốp gỗ, mái bằng" },
  "garden-text": { text: true, scope: "garden", hint: "e.g. a small backyard with a wooden deck, lavender borders and string lights · VD: sân sau nhỏ có sàn gỗ, viền hoa oải hương và đèn dây" },
  "garden-redesign": { scope: "garden", hint: "Garden photo · Ảnh khu vườn" },
};

const RES_COST: Record<string, number> = { "1k": 1, "2k": 2, "4k": 3 };
/** Room Composer accepts up to this many item photos (matches MAX_ITEMS in the worker). */
export const MAX_ITEMS = 3;

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as any).error ?? "Error · Lỗi");
  return d as T;
}

export const isVideo = (h: { tool?: string; outputUrl?: string | null }) => h.tool === "interior-video" || !!h.outputUrl?.endsWith(".mp4");
/** Download name for a result: videos are mp4, everything else png. */
export const resultFile = (id: string, url: string) => `design-${id}.${url.endsWith(".mp4") ? "mp4" : "png"}`;

const ZMIN = 1, ZMAX = 8;

/** Large before/after viewer: wheel or +/- to zoom, drag to pan (drag moves the divider at 1x), double-click toggles 2x. */
function ZoomCompare({ before, after }: { before: string | null; after: string }) {
  const [pos, setPos] = useState(50);
  const [v, setV] = useState({ s: 1, x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<null | { kind: "pan" | "split"; px: number; py: number; x: number; y: number }>(null);
  const clamp = (s: number, x: number, y: number) => {
    const r = box.current?.getBoundingClientRect();
    const W = r?.width ?? 0, H = r?.height ?? 0;
    return { s, x: Math.min(0, Math.max(W - W * s, x)), y: Math.min(0, Math.max(H - H * s, y)) };
  };
  const zoomAt = (factor: number, cx?: number, cy?: number) => setV((c) => {
    const r = box.current?.getBoundingClientRect();
    const ax = cx ?? (r ? r.width / 2 : 0), ay = cy ?? (r ? r.height / 2 : 0);
    const s = Math.min(ZMAX, Math.max(ZMIN, c.s * factor));
    return clamp(s, ax - (ax - c.x) * (s / c.s), ay - (ay - c.y) * (s / c.s));
  });
  useEffect(() => {
    const el = box.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const toSplit = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  const layer: React.CSSProperties = { transform: `translate(${v.x}px, ${v.y}px) scale(${v.s})`, transformOrigin: "0 0" };
  const imgCls = "absolute inset-0 h-full w-full select-none object-contain";
  const ctl = "zc-btn";
  return (
    <div className="zc">
      <div className="zc-bar">
        <button className={ctl} onClick={() => zoomAt(1 / 1.4)} aria-label={t("Zoom out", "Thu nhỏ")}>−</button>
        <span className="zc-pct">{Math.round(v.s * 100)}%</span>
        <button className={ctl} onClick={() => zoomAt(1.4)} aria-label={t("Zoom in", "Phóng to")}>+</button>
        <button className={ctl} onClick={() => setV({ s: 1, x: 0, y: 0 })}>{t("Fit", "Vừa khung")}</button>
      </div>
      <div ref={box} className="zc-stage" style={{ cursor: v.s > 1 ? (drag.current ? "grabbing" : "grab") : before ? "ew-resize" : "default" }}
        onDoubleClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); v.s > 1 ? setV({ s: 1, x: 0, y: 0 }) : zoomAt(2.5, e.clientX - r.left, e.clientY - r.top); }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest(".zc-bar")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const onKnob = !!(e.target as HTMLElement).closest(".zc-knob");
          const split = !!before && (v.s === 1 || onKnob);
          drag.current = { kind: split ? "split" : "pan", px: e.clientX, py: e.clientY, x: v.x, y: v.y };
          if (split) toSplit(e.clientX);
        }}
        onPointerMove={(e) => {
          const d = drag.current; if (!d) return;
          if (d.kind === "split") toSplit(e.clientX);
          else setV((c) => clamp(c.s, d.x + e.clientX - d.px, d.y + e.clientY - d.py));
        }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <div className="absolute inset-0" style={layer}><img src={after} className={imgCls} alt="after" draggable={false} /></div>
        {before && <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}><div className="absolute inset-0" style={layer}><img src={before} className={imgCls} alt="before" draggable={false} /></div></div>}
        {before && <>
          <span className="ba-tag ba-tag-l">{bi("Before · Trước")}</span><span className="ba-tag ba-tag-r">{bi("After · Sau")}</span>
          <div className="zc-knob" style={{ left: `${pos}%` }}><span className="ba-knob"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5" /></svg></span></div>
        </>}
      </div>
    </div>
  );
}

export function BeforeAfter({ before, after, zoomable }: { before: string | null; after: string; zoomable?: boolean }) {
  const [pos, setPos] = useState(50);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };
  if (after.endsWith(".mp4")) return <video src={after} poster={before ?? undefined} controls autoPlay muted loop playsInline className="mx-auto block max-w-2xl rounded-xl" style={{ width: "100%" }} />;
  if (zoomable) return <ZoomCompare before={before} after={after} />;
  // Text-to-design results have no input photo: show the output on its own.
  if (!before) return <img src={after} className="mx-auto block max-w-2xl rounded-xl" style={{ width: "100%" }} alt="" />;
  return (
    <div className="ba relative mx-auto max-w-2xl select-none overflow-hidden rounded-xl" style={{ touchAction: "pan-y", cursor: "ew-resize" }}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") move(e); }}>
      <img src={after} className="block w-full" alt="after" />
      <span className="ba-tag ba-tag-l">{bi("Before · Trước")}</span><span className="ba-tag ba-tag-r">{bi("After · Sau")}</span>
      <img src={before} alt="before" className="absolute inset-0 h-full w-full bg-neutral-100 object-contain" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}><span className="ba-knob"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5" /></svg></span></div>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} className="ba-range absolute inset-0 h-full w-full" step={0.5} aria-label={bi("Compare before/after · So sánh trước/sau")} />
    </div>
  );
}

/** History items whose result is written text (a critique or an advisor chat) rather than an image. */
export const isCritique = (h: { tool?: string }) => h.tool === "interior-critique";
export const isFinder = (h: { tool?: string }) => h.tool === "interior-finder";
export const isOrient = (h: { tool?: string }) => h.tool === "exterior-orient";
export const isChat = (h: { tool?: string }) => h.tool === "interior-advisor";
export const isTextResult = (h: { tool?: string }) => isCritique(h) || isFinder(h) || isOrient(h) || isChat(h);

const PRIORITY: Record<Critique["improvements"][number]["priority"], { label: [string, string]; color: string; bg: string }> = {
  high: { label: ["High priority", "Ưu tiên cao"], color: "#9b1c1c", bg: "#fde8e7" },
  medium: { label: ["Medium", "Vừa"], color: "#8a5300", bg: "#fbf0dc" },
  low: { label: ["Nice to have", "Nên có"], color: "#24613f", bg: "#e3f2ea" },
};

/** A written design critique: score, summary, strengths, prioritised improvements and quick wins. */
export function CritiqueView({ photo, c }: { photo: string | null; c: Critique }) {
  const h = { margin: "0 0 6px", fontSize: 15, fontWeight: 600 } as const;
  const ul = { margin: 0, paddingLeft: 18, display: "grid", gap: 4 } as const;
  return (
    <div style={{ display: "grid", gap: 16, textAlign: "left" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        {photo && <img src={photo} alt="" style={{ width: 150, maxWidth: "40%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10 }} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{c.score ? c.score.toFixed(1) : "–"}<span style={{ fontSize: 15, fontWeight: 400, opacity: 0.6 }}> / 10</span></div>
          <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>{[c.room, c.style].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      <p style={{ margin: 0, lineHeight: 1.55 }}>{c.summary}</p>
      {c.strengths.length > 0 && <div><h4 style={h}>{t("What works", "Điểm mạnh")}</h4><ul style={ul}>{c.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>}
      <div>
        <h4 style={h}>{t("What to improve", "Nên cải thiện")}</h4>
        <ol style={{ ...ul, paddingLeft: 0, listStyle: "none", gap: 10 }}>
          {c.improvements.map((x, i) => (
            <li key={i} style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <b>{x.area}</b>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 8px", borderRadius: 999, color: PRIORITY[x.priority].color, background: PRIORITY[x.priority].bg }}>{t(...PRIORITY[x.priority].label)}</span>
              </div>
              {x.issue && <p style={{ margin: "6px 0 0", opacity: 0.75 }}>{x.issue}</p>}
              <p style={{ margin: "6px 0 0" }}>→ {x.suggestion}</p>
            </li>
          ))}
        </ol>
      </div>
      {c.quickWins.length > 0 && <div><h4 style={h}>{t("Quick wins this week", "Thay đổi nhanh trong tuần")}</h4><ul style={ul}>{c.quickWins.map((s) => <li key={s}>{s}</li>)}</ul></div>}
    </div>
  );
}

/** Shopping searches for one found item; Vietnamese users get local stores. */
const shopLinks = (x: Finder["items"][number]): [string, string][] => {
  const q = encodeURIComponent(x.query), lq = encodeURIComponent(x.localQuery || x.query);
  return getLang() === "vi"
    ? [["Google Shopping", `https://www.google.com/search?tbm=shop&q=${lq}`], ["Shopee", `https://shopee.vn/search?keyword=${lq}`], ["IKEA", `https://www.ikea.com/vn/vi/search/?q=${q}`]]
    : [["Google Shopping", `https://www.google.com/search?tbm=shop&q=${q}`], ["Amazon", `https://www.amazon.com/s?k=${q}`], ["IKEA", `https://www.ikea.com/us/en/search/?q=${q}`]];
};

/** Found furniture: numbered markers on the photo and a list of items with shopping links. */
export function FinderView({ photo, f }: { photo: string | null; f: Finder }) {
  return (
    <div style={{ display: "grid", gap: 14, textAlign: "left" }}>
      {photo && (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
          <img src={photo} alt="" style={{ display: "block", width: "100%" }} />
          {f.items.map((x, i) => x.box && (
            <span key={i} aria-hidden style={{ position: "absolute", left: `${(x.box[1] + x.box[3]) / 20}%`, top: `${(x.box[0] + x.box[2]) / 20}%`, transform: "translate(-50%, -50%)", width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", background: "#1c1b19", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 0 0 2px #fff" }}>{i + 1}</span>
          ))}
        </div>
      )}
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
        {f.items.map((x, i) => (
          <li key={i} style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 6 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              <b>{i + 1}. {x.name}</b>
              <span style={{ fontSize: 12, opacity: 0.6 }}>{x.category}</span>
              {x.priceRange && <span style={{ marginLeft: "auto", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{x.priceRange}</span>}
            </div>
            {x.description && <p style={{ margin: 0, opacity: 0.8 }}>{x.description}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
              {shopLinks(x).map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" style={{ padding: "4px 10px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 999, color: "inherit", textDecoration: "none" }}>{label} ↗</a>)}
            </div>
          </li>
        ))}
      </ol>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>{t("Links open a search for similar products; prices are AI estimates.", "Link mở trang tìm sản phẩm tương tự; giá là ước tính của AI.")}</p>
    </div>
  );
}

/** One-line summary of what the optimiser did, plus any warnings. */
export function PrepInfo({ p, className = "helper" }: { p: PreparedImage | null; className?: string }) {
  if (!p) return null;
  const { original: o, output: x } = p;
  const resized = o.width !== x.width;
  return (
    <div className={className} style={{ marginTop: 6 }}>
      <span>✓ {bi("Optimized · Đã tối ưu")}: {resized ? `${o.width}×${o.height} → ` : ""}{x.width}×{x.height} · {formatBytes(o.bytes)} → {formatBytes(x.bytes)} · {bi("frame · khung")} {p.aspectRatio}</span>
      {p.warnings.map((w) => <div key={w} style={{ color: "#b26a00" }}>⚠ {bi(w)}</div>)}
    </div>
  );
}

export function useGenerator(tool: ToolId, preset: Preset | undefined, onCreditsChange: () => void) {
  const cfg = CFG[tool];
  const [meta, setMeta] = useState<Meta | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState("");
  const [prep, setPrep] = useState<PreparedImage | null>(null);
  const [refPrep, setRefPrep] = useState<PreparedImage | null>(null);
  const [items, setItems] = useState<{ file: File; prep: PreparedImage; preview: string }[]>([]);
  const [preparing, setPreparing] = useState(0); // number of images still being optimised
  const [description, setDescription] = useState("");
  const [aspect, setAspect] = useState("16:9");
  const [style, setStyle] = useState("");
  const [room, setRoom] = useState("Living room");
  const [lvl, setLvl] = useState(2);
  const [custom, setCustom] = useState("");
  const [res, setRes] = useState("1k");
  const [remove, setRemove] = useState<string[]>(["furniture"]);
  const [surface, setSurface] = useState("floor");
  const [material, setMaterial] = useState("");
  const [autoCheck, setAutoCheck] = useState(false); // VICOSTONE tiles: optional post-check with one retry, off by default
  const [weather, setWeather] = useState("");
  const [angle, setAngle] = useState("front");
  const [view, setView] = useState("isometric");
  const [motion, setMotion] = useState("push-in");
  const [lighting, setLighting] = useState("golden-hour");
  const [kind, setKind] = useState<"plan" | "facade">("plan");
  const [facing, setFacing] = useState("");
  const [city, setCity] = useState("");
  const [color, setColor] = useState("Sage green");
  const [paintFinish, setPaintFinish] = useState("matte");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [gen, setGen] = useState<Gen | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const timer = useRef<number | undefined>(undefined);

  const loadHistory = () => j<{ items: any[] }>("/api/generations").then((d) => setHistory(d.items)).catch(() => {});
  useEffect(() => {
    j<Meta>("/api/styles").then((m) => { setMeta(m); setWeather(m.weather[0]); });
    loadHistory();
    return () => clearTimeout(timer.current);
  }, []);

  // Reset per-tool state when the user switches tools.
  const styles = meta?.styles.filter((s) => s.scope === cfg.scope) ?? [];
  useEffect(() => {
    clearTimeout(timer.current);
    setGen(null); setErr(""); setBusy(false);
    setStyle(preset?.styleSlug && styles.some((s) => s.slug === preset.styleSlug) ? preset.styleSlug : cfg.text ? "" : styles[0]?.slug ?? "");
    if (preset?.roomType) setRoom(preset.roomType);
    else if (cfg.text || cfg.llm || cfg.autoRoom) setRoom(""); // optional: the description or the photo usually shows the room
    if (preset?.intervention && meta) setLvl(Math.max(0, meta.intervention.indexOf(preset.intervention)));
    if (preset?.remove?.length) setRemove(preset.remove);
    if (preset?.weather) setWeather(preset.weather);
    if (preset?.angle) setAngle(preset.angle);
    if (preset?.view) setView(preset.view);
    if (preset?.surface) setSurface(preset.surface);
    if (cfg.floor) setSurface("floor");
    if (preset?.color) setColor(preset.color);
    if (preset?.finish) setPaintFinish(preset.finish);
    if (preset?.description) setDescription(preset.description);
  }, [tool, meta, preset]);
  useEffect(() => {
    if (!meta) return;
    const list = meta.surfaces[surface];
    setMaterial(preset?.surface === surface && preset.material && list.includes(preset.material) ? preset.material : list[0]);
  }, [surface, meta, preset]);

  const togglePublic = async () => {
    if (!gen) return;
    if (!gen.public && !confirm(bi("Publish to community gallery? · Đăng lên thư viện cộng đồng? Cả ảnh gốc và ảnh kết quả sẽ hiển thị công khai (không kèm email)."))) return;
    try {
      const r = await j<{ public: boolean }>(`/api/generations/${gen.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ public: !gen.public }) });
      setGen({ ...gen, public: r.public }); loadHistory();
    } catch (e: any) { setErr(e.message); }
  };
  const remove_ = async () => {
    if (!gen || !confirm(bi("Delete this design permanently? · Xoá vĩnh viễn thiết kế này?"))) return;
    try { await j(`/api/generations/${gen.id}`, { method: "DELETE" }); setGen(null); loadHistory(); } catch (e: any) { setErr(e.message); }
  };

  /** Optimise a picked image in the browser (orientation, format, size, metadata) before it is used. */
  const prepare = async (f: File, done: (p: PreparedImage) => void, exactAspect = false) => {
    setGen(null); setErr(""); setPreparing((n) => n + 1);
    try { done(await prepareImage(f, { exactAspect })); } catch (e: any) { setErr(e.message); } finally { setPreparing((n) => n - 1); }
  };
  const pick = (f?: File) => {
    if (!f) return;
    // Floor Editor: VICOSTONE tiles run on a model that returns an exact supported frame, so the photo must already be in one.
    prepare(f, (p) => { setFile(p.file); setPrep(p); setPreview(URL.createObjectURL(p.file)); }, !!cfg.floor);
  };

  const pickRef = (f?: File) => {
    if (!f) return;
    prepare(f, (p) => { setRefFile(p.file); setRefPrep(p); setRefPreview(URL.createObjectURL(p.file)); });
  };
  const pickItem = (f?: File) => {
    if (!f) return;
    prepare(f, (p) => setItems((a) => (a.length >= MAX_ITEMS ? a : [...a, { file: p.file, prep: p, preview: URL.createObjectURL(p.file) }])));
  };
  const removeItem = (i: number) => setItems((a) => a.filter((_, k) => k !== i));
  const ready = !preparing && (cfg.text ? description.trim().length >= 10 : !!file && (!cfg.reference || !!refFile) && (!cfg.items || items.length > 0) && (!cfg.orient || (!!facing && !!city)));

  const poll = (id: string) => {
    timer.current = window.setTimeout(async () => {
      try {
        const g = await j<Gen>(`/api/generations/${id}`);
        setGen(g);
        if (g.status === "RUNNING" || g.status === "QUEUED") return poll(id);
        setBusy(false); onCreditsChange(); loadHistory();
        if (g.status === "FAILED") setErr(g.error || "Generation failed (credits refunded) · Tạo ảnh thất bại (đã hoàn credits)");
      } catch (e: any) { setErr(e.message); setBusy(false); }
    }, 4000);
  };

  const run = async () => {
    if (!meta || !ready) return;
    setBusy(true); setErr(""); setGen(null);
    try {
      const upload = (f: File) => j<{ key: string }>("/api/upload", { method: "POST", headers: { "Content-Type": f.type }, body: f }).then((r) => r.key);
      const key = cfg.text || !file ? undefined : await upload(file);
      const refKey = cfg.reference && refFile ? await upload(refFile) : undefined;
      const itemKeys = cfg.items ? await Promise.all(items.map((x) => upload(x.file))) : undefined;
      const g = await j<{ id: string }>("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool, inputKey: key, custom, resolution: res,
          ...(cfg.scope && style ? { styleSlug: style } : {}),
          ...(cfg.text ? { description, aspectRatio: aspect } : prep ? { aspectRatio: prep.aspectRatio } : {}),
          ...(cfg.room && room ? { roomType: room } : {}),
          ...(cfg.intervention ? { intervention: meta.intervention[lvl] } : {}),
          ...(cfg.remove ? { remove } : {}),
          ...(cfg.surface ? { surface, material } : {}),
          ...(cfg.floor ? { surface: "floor", material, ...(autoCheck ? { autoCheck: true } : {}) } : {}),
          ...(cfg.paint ? { color, finish: paintFinish } : {}),
          ...(refKey ? { refKey } : {}),
          ...(itemKeys ? { itemKeys } : {}),
          ...(cfg.llm ? { lang: getLang() } : {}),
          ...(cfg.weather ? { weather } : {}),
          ...(cfg.angle ? { angle } : {}),
          ...(cfg.planView ? { view } : {}),
          ...(cfg.video ? { motion } : {}),
          ...(cfg.lighting ? { lighting } : {}),
          ...(cfg.orient ? { kind, facing, city } : {}),
        }),
      });
      onCreditsChange();
      poll(g.id);
    } catch (e: any) { setErr(e.message); setBusy(false); onCreditsChange(); }
  };

  return { autoCheck, setAutoCheck, cfg, meta, file, preview, style, setStyle, room, setRoom, lvl, setLvl, custom, setCustom, res, setRes, remove, setRemove, surface, setSurface, material, setMaterial, weather, setWeather, angle, setAngle, view, setView, motion, setMotion, lighting, setLighting, kind, setKind, facing, setFacing, city, setCity, color, setColor, paintFinish, setPaintFinish, refPreview, pickRef, items, pickItem, removeItem, prep, refPrep, preparing, ready, description, setDescription, aspect, setAspect, busy, err, gen, setGen, history, styles, pick, run, togglePublic, remove_, loadHistory };
}

export function GeneratePanel({ tool, preset, onCreditsChange }: { tool: ToolId; preset?: Preset; onCreditsChange: () => void }) {
  const { cfg, meta, file, preview, style, setStyle, room, setRoom, lvl, setLvl, custom, setCustom, res, setRes, remove, setRemove, surface, setSurface, material, setMaterial, weather, setWeather, angle, setAngle, view, setView, motion, setMotion, lighting, setLighting, kind, setKind, facing, setFacing, city, setCity, color, setColor, paintFinish, setPaintFinish, refPreview, pickRef, items, pickItem, removeItem, prep, refPrep, preparing, ready, description, setDescription, aspect, setAspect, busy, err, gen, setGen, history, styles, pick, run, togglePublic, remove_, loadHistory } = useGenerator(tool, preset, onCreditsChange);
  if (cfg.chat) return <AdvisorChat onCreditsChange={onCreditsChange} />;
  if (cfg.bizplan) return <BizPlan onCreditsChange={onCreditsChange} />;
  if (!meta) return <p className="mt-8 text-center text-neutral-500">{bi("Loading… · Đang tải…")}</p>;
  const field = "w-full rounded border p-2";
  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        {cfg.text ? (
          <textarea className={field} rows={5} maxLength={1000} placeholder={bi(cfg.hint)} value={description} onChange={(e) => setDescription(e.target.value)} />
        ) : <label className="flex min-h-48 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed">
          {preview ? <img src={preview} className="max-h-72 w-full object-contain" alt="ảnh gốc" /> : <span className="px-4 text-center text-neutral-500">{bi(cfg.hint)} · {bi("any photo, auto-optimized · ảnh bất kỳ, tự động tối ưu")}</span>}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>}
        {!cfg.text && <PrepInfo p={prep} className="text-xs text-neutral-500" />}
        {cfg.reference && (
          <label className="flex min-h-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed">
            {refPreview ? <img src={refPreview} className="max-h-48 w-full object-contain" alt="" /> : <span className="px-4 text-center text-neutral-500">{bi("Style reference image · Ảnh tham khảo phong cách")}</span>}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pickRef(e.target.files?.[0])} />
          </label>
        )}
        {cfg.reference && <PrepInfo p={refPrep} className="text-xs text-neutral-500" />}
        {cfg.items && (
          <div className="grid grid-cols-3 gap-2">
            {items.map((x, i) => (
              <div key={x.preview} className="relative overflow-hidden rounded-xl border">
                <img src={x.preview} className="h-24 w-full object-contain" alt="" />
                <button type="button" onClick={() => removeItem(i)} className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-xs" aria-label={bi("Remove item · Xoá đồ vật")}>✕</button>
              </div>
            ))}
            {items.length < MAX_ITEMS && (
              <label className="flex h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed px-2 text-center text-xs text-neutral-500">
                {bi("+ Item photo · + Ảnh đồ vật")}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { pickItem(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            )}
          </div>
        )}
        {cfg.room && <select className={field} value={room} onChange={(e) => setRoom(e.target.value)}>{(cfg.text || cfg.llm || cfg.autoRoom) && <option value="">{bi(cfg.autoRoom ? "Auto-detect from photo · Tự nhận diện từ ảnh" : "Any room type · Loại phòng bất kỳ")}</option>}{meta.roomTypes.map((r) => <option key={r} value={r}>{bi(r)}</option>)}</select>}
        {cfg.scope && <select className={field} value={style} onChange={(e) => setStyle(e.target.value)}>{cfg.text && <option value="">{bi("Any style · Phong cách bất kỳ")}</option>}{styles.map((s) => <option key={s.slug} value={s.slug}>{bi(s.name)}</option>)}</select>}
        {cfg.angle && <select className={field} value={angle} onChange={(e) => setAngle(e.target.value)}>{meta.angles.map((a) => <option key={a} value={a}>{bi("View · Góc nhìn")}: {bi(a)}</option>)}</select>}
        {cfg.orient && <>
          <select className={field} value={kind} onChange={(e) => setKind(e.target.value as "plan" | "facade")}><option value="plan">{bi("Floor plan · Mặt bằng")}</option><option value="facade">{bi("Facade photo · Ảnh mặt tiền")}</option></select>
          <select className={field} value={facing} onChange={(e) => setFacing(e.target.value)}><option value="">{kind === "plan" ? bi("Top of the plan faces… · Phía trên bản vẽ nhìn hướng…") : bi("The facade faces… · Mặt tiền nhìn hướng…")}</option>{DIRS.map((d) => <option key={d} value={d}>{t(...DIR_NAMES[d])}</option>)}</select>
          <select className={field} value={city} onChange={(e) => setCity(e.target.value)}><option value="">{bi("City · Thành phố")}</option>{meta.cities.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </>}
        {cfg.lighting && <select className={field} value={lighting} onChange={(e) => setLighting(e.target.value)}>{meta.lighting.map((l) => <option key={l} value={l}>{bi("Lighting · Ánh sáng")}: {bi(l)}</option>)}</select>}
        {cfg.video && <select className={field} value={motion} onChange={(e) => setMotion(e.target.value)}>{meta.motions.map((m) => <option key={m} value={m}>{bi("Camera · Camera")}: {bi(m)}</option>)}</select>}
        {cfg.planView && <select className={field} value={view} onChange={(e) => setView(e.target.value)}>{meta.planViews.map((v) => <option key={v} value={v} disabled={meta.lockedPlanViews?.includes(v)}>{bi("View · Góc nhìn")}: {bi(v)}{meta.lockedPlanViews?.includes(v) ? ` (${bi("soon · sắp có")})` : ""}</option>)}</select>}
        {cfg.weather && <select className={field} value={weather} onChange={(e) => setWeather(e.target.value)}>{meta.weather.map((w) => <option key={w} value={w}>{bi(w)}</option>)}</select>}
        {cfg.remove && (
          <div className="flex flex-wrap gap-3 text-sm">
            {meta.remove.map((r) => (
              <label key={r} className="flex items-center gap-1">
                <input type="checkbox" checked={remove.includes(r)} onChange={(e) => setRemove(e.target.checked ? [...remove, r] : remove.filter((x) => x !== r))} />{r}
              </label>
            ))}
          </div>
        )}
        {cfg.surface && (
          <>
            <select className={field} value={surface} onChange={(e) => setSurface(e.target.value)}>{Object.keys(meta.surfaces).map((s) => <option key={s} value={s}>{bi(s)}</option>)}</select>
            <select className={field} value={material} onChange={(e) => setMaterial(e.target.value)}>{meta.surfaces[surface].map((m) => <option key={m} value={m}>{bi(m)}</option>)}</select>
          </>
        )}
        {cfg.floor && <select className={field} value={material} onChange={(e) => setMaterial(e.target.value)}>{meta.surfaces.floor.map((m) => <option key={m} value={m}>{bi(m)}</option>)}{!!meta.floorTiles?.length && <optgroup label="VICOSTONE">{meta.floorTiles.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}</optgroup>}</select>}
        {cfg.paint && (
          <div className="flex flex-wrap items-center gap-2">
            {meta.paints.map((c) => (
              <button key={c.name} type="button" title={bi(c.name)} aria-label={bi(c.name)} onClick={() => setColor(c.name)}
                className={`h-8 w-8 rounded-full border ${color === c.name ? "ring-2 ring-black ring-offset-2" : ""}`} style={{ background: c.hex }} />
            ))}
            <label className="flex items-center gap-1 text-sm">{bi("Custom · Tuỳ chọn")}
              <input type="color" value={color.startsWith("#") ? color : meta.paints.find((c) => c.name === color)?.hex ?? "#ffffff"} onChange={(e) => setColor(e.target.value)} />
            </label>
            <select className={field} value={paintFinish} onChange={(e) => setPaintFinish(e.target.value)}>{meta.finishes.map((f) => <option key={f} value={f}>{bi("Finish · Độ bóng")}: {bi(f)}</option>)}</select>
          </div>
        )}
        {cfg.intervention && (
          <label className="text-sm">{bi("AI intervention · Mức can thiệp AI: ")}<b>{bi(meta.intervention[lvl])}</b>
            <input type="range" min={0} max={4} value={lvl} onChange={(e) => setLvl(+e.target.value)} className="w-full" />
          </label>
        )}
        <textarea className={field} rows={2} maxLength={500} placeholder={bi("Extra instructions (optional) · Yêu cầu thêm (tuỳ chọn)")} value={custom} onChange={(e) => setCustom(e.target.value)} />
        {!cfg.llm && !cfg.video && <select className={field} value={res} onChange={(e) => setRes(e.target.value)}>
          {Object.entries(RES_COST).map(([k, c]) => <option key={k} value={k}>{k.toUpperCase()} · {c} credit{c > 1 ? "s" : ""}</option>)}
        </select>}
        {err && <p className="text-sm text-red-600">{bi(err)}</p>}
        <button disabled={!ready || busy} onClick={run} className="rounded bg-black py-3 text-white disabled:opacity-40">{busy ? bi("Generating… (1–2 min) · Đang tạo…") : preparing ? bi("Optimizing image… · Đang tối ưu ảnh…") : bi("Generate · Tạo thiết kế")}</button>
      </div>
      <div>
        {gen?.status === "SUCCESS" && gen.orient ? (
          <>
            <OrientView photo={gen.inputUrl} o={gen.orient} id={gen.id} params={gen.params ?? { kind, facing, city }} onCredits={onCreditsChange} Compare={BeforeAfter} />
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <button onClick={remove_} className="rounded border px-4 py-2 text-red-600">{bi("Delete · Xoá")}</button>
            </div>
          </>
        ) : gen?.status === "SUCCESS" && gen.finder ? (
          <>
            <FinderView photo={gen.inputUrl} f={gen.finder} />
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <button onClick={remove_} className="rounded border px-4 py-2 text-red-600">{bi("Delete · Xoá")}</button>
            </div>
          </>
        ) : gen?.status === "SUCCESS" && gen.critique ? (
          <>
            <CritiqueView photo={gen.inputUrl} c={gen.critique} />
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <button onClick={remove_} className="rounded border px-4 py-2 text-red-600">{bi("Delete · Xoá")}</button>
            </div>
          </>
        ) : gen?.status === "SUCCESS" && gen.outputUrl ? (
          <>
            <BeforeAfter before={gen.inputUrl} after={gen.outputUrl} />
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href={gen.outputUrl} download={resultFile(gen.id, gen.outputUrl)} className="rounded border px-4 py-2">{bi("Download · Tải ảnh xuống")}</a>
              {!gen.outputUrl.endsWith(".mp4") && <button onClick={togglePublic} className="rounded border px-4 py-2">{gen.public ? bi("Unpublish · Gỡ khỏi thư viện") : bi("Publish · Đăng lên thư viện")}</button>}
              <button onClick={remove_} className="rounded border px-4 py-2 text-red-600">{bi("Delete · Xoá")}</button>
            </div>
          </>
        ) : <div className="flex h-full min-h-48 items-center justify-center rounded-xl border text-neutral-400">{busy ? bi("Processing… · Đang xử lý…") : bi("Result appears here · Kết quả sẽ hiện ở đây")}</div>}
      </div>
      {history.length > 0 && (
        <div className="md:col-span-2">
          <h3 className="mb-2 font-semibold">{bi("History · Lịch sử")}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {history.filter((h) => h.outputUrl && !isChat(h)).map((h) => (
              <button key={h.id} onClick={() => (isTextResult(h) ? j<Gen>(`/api/generations/${h.id}`).then(setGen).catch(() => {}) : setGen({ id: h.id, status: "SUCCESS", public: h.public, inputUrl: h.inputUrl, outputUrl: h.outputUrl }))} className="overflow-hidden rounded-lg border">
                <img src={isTextResult(h) || isVideo(h) ? h.inputUrl : h.outputUrl} loading="lazy" className="aspect-square w-full object-cover" alt={h.tool} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
