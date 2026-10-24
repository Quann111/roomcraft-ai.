import React, { useEffect, useMemo, useState } from "react";
import "./sxapp.css";
import { navigate, useLocation, Link } from "./router";
import { bi, getLang, setLang, t } from "./i18n";
import { api, useAuth } from "./auth";
import { AdvisorChat, Transcript } from "./AdvisorChat";
import { BizPlan } from "./BizPlan";
import { ToolGuide } from "./ToolGuide";
import { CompareResults, MAX_COMPARE, useCompare } from "./MaterialCompare";
import { OrientView, DIRS, DIR_NAMES } from "./OrientView";
import { BeforeAfter, CritiqueView, FinderView, isChat, isTextResult, isVideo, resultFile, MAX_ITEMS, PrepInfo, useGenerator, type Preset, type ToolId } from "./GeneratePanel";

/* ---------- icons ---------- */
const ICONS: Record<string, string> = {
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m5 17 4-4 3 3 3-4 4 5"/>',
  headset: '<path d="M5 13v-2a7 7 0 0 1 14 0v2"/><path d="M5 13H4a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1v-5Zm14 0h1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1v-5Z"/>',
  upload: '<path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
  spark: '<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z"/><path d="m19 16 .6 2.1L22 19l-2.4.9L19 22l-.6-2.1L16 19l2.4-.9L19 16Z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 5 5"/>',
  sofa: '<path d="M5 13V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4"/><path d="M4 12h16a2 2 0 0 1 2 2v4H2v-4a2 2 0 0 1 2-2ZM5 18v2m14-2v2"/>',
  house: '<path d="m3 11 9-7 9 7v9H3v-9Z"/><path d="M9 20v-6h6v6"/>',
  garden: '<path d="M12 20V9M8 20h8M12 9c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 3c3 0 5-2 5-5-3 0-5 2-5 5Z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  weather: '<path d="M7 18h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 7 8.5 4.5 4.5 0 0 0 7 18Z"/><path d="M12 4V2m-5 4L5.5 4.5M17 6l1.5-1.5"/>',
  download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',
  eye: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  edit: '<path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6m-6 4h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
  lock: '<path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6z"/>',
};
const Icon = ({ n, className = "icon-svg" }: { n: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[n] ?? ICONS.spark }} />
);

/* ---------- catalog ---------- */
const U = (id: string, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
const IMGS = ["photo-1600607688969-a5bfcd646154", "photo-1600210492486-724fe5c67fb0", "photo-1618221195710-dd6b41faaea6", "photo-1616486338812-3dadae4b4ace", "photo-1600607687939-ce8a6c25118c", "photo-1586023492125-27b2c045efd7", "photo-1600566753086-00f18fb6b3ea", "photo-1600585154340-be6161a56a0c"];
const img = (i: number) => U(IMGS[i % IMGS.length]);
/** Per-option thumbnails for room types and sky presets (keys match ROOM_TYPES / WEATHER in the worker). */
const ROOM_PHOTOS: Record<string, string> = {
  "Living room": "photo-1631679706909-1844bbd07221", Bedroom: "photo-1616486029423-aaa4789e8c9a", Bathroom: "photo-1631889993959-41b4e9c6e3c5",
  Kitchen: "photo-1628745277862-bc0b2d68c50c", "Dining room": "photo-1593136596203-7212b076f4d2", Attic: "photo-1534595038511-9f219fe0c979",
  Study: "photo-1782248765552-e80331b41abe", "Home office": "photo-1777896193454-8b4863264f0b", "Family room": "photo-1560449752-3fd4bdbe7df0",
  "Kids room": "photo-1505692795793-20f543407193", Balcony: "photo-1774685110793-e427dfa87467", "Gaming room": "photo-1723792306904-c417c0da40e3",
  Hallway: "photo-1771354959667-96360bf59eab", "Laundry room": "photo-1626806819282-2c1dc01a5e0c", Basement: "photo-1778731660506-0a6776b869e8",
  Nursery: "photo-1774578342155-8d7e44a18bfd", "Walk-in closet": "photo-1649361811423-a55616f7ab11", "Home gym": "photo-1627257058769-0a99529e4312",
  "Home theater": "photo-1756729924301-4e55f111e986", Workshop: "photo-1597960194599-22929afc25b1", "Yoga studio": "photo-1588286840104-8957b019727f",
  "Wine cellar": "photo-1724882207681-9e7e8c3dd45c",
};
const WEATHER_PHOTOS: Record<string, string> = {
  "Golden hour": "photo-1625638627981-8a052b2684b6", "Clear blue sky": "photo-1629185064294-09c2014a1329", "Sunset glow": "photo-1472224371017-08207f84aaae",
  Overcast: "photo-1762359365240-8c96c225165a", Twilight: "photo-1568605115459-4b731184f961", "Fresh snow": "photo-1583381707695-676570b40d38",
  "Misty morning": "photo-1672995912321-6faba4f7876f", "Dramatic storm clouds": "photo-1748701821466-0b9f8bf839ac",
};
/** Colour swatches for the lighting moods (sky colours at that time of day). */
const LIGHT_SWATCH: Record<string, string> = {
  morning: "linear-gradient(135deg, #cfe3f5, #f6e7c8)", midday: "linear-gradient(135deg, #7fb7ea, #e9f3fb)",
  "golden-hour": "linear-gradient(135deg, #f2a65a, #f7d48b)", dusk: "linear-gradient(135deg, #1f3a6e, #e8a35c)",
  night: "linear-gradient(135deg, #0d1424, #3b3220)", overcast: "linear-gradient(135deg, #8d949c, #c9ced3)",
};
const thumbOf = (map: Record<string, string>, key: string) => (map[key] ? U(map[key], 600) : undefined);

type ToolDef = { name: string; desc: string; cat: string; photo: string; premium?: boolean; icon: string; spaces?: ToolId[]; popular?: boolean };
const REDESIGN: ToolId[] = ["interior-redesign", "exterior-redesign", "garden-redesign"];
const TOOLS: ToolDef[] = [
  { name: "Magic Redesign", desc: "Type your request and instantly transform any detail from your space with our conversational AI.", cat: "redesign", photo: "photo-1600210492486-724fe5c67fb0", icon: "spark", spaces: REDESIGN },
  { name: "Perfect Redesign", desc: "Complete redesign of your home spaces with enhanced results, while preserving structural elements.", cat: "redesign", photo: "photo-1618221195710-dd6b41faaea6", icon: "spark", spaces: REDESIGN, popular: true },
  { name: "Beautiful Redesign", desc: "Change your room style and refresh your design using our AI model.", cat: "redesign", photo: "photo-1616486338812-3dadae4b4ace", icon: "image", spaces: REDESIGN },
  { name: "Virtual Staging", desc: "Instantly stage spaces with realistic furniture and decor to visualize their potential.", cat: "staging", photo: "photo-1600607687939-ce8a6c25118c", icon: "sofa", spaces: ["interior-staging"] },
  { name: "Creative Redesign", desc: "Allow AI to rearrange furniture and adjust structures for an innovative new look.", cat: "redesign", photo: "photo-1783961859503-2f6cd85f6e87", icon: "spark", spaces: REDESIGN },
  { name: "Sketch to Render", desc: "Transform rough sketches into photorealistic renders for clear visualizations.", cat: "redesign", photo: "photo-1643569941917-95185f728355", icon: "image", spaces: ["interior-sketch", "exterior-sketch"] },
  { name: "Fill Spaces", desc: "Furnish and decorate empty rooms with AI, tailored to your chosen style and room type.", cat: "furnish", photo: "photo-1757742690834-aa581b9f53b2", icon: "sofa", spaces: ["interior-staging"] },
  { name: "Decor Staging", desc: "Virtually stage furniture and decor in realistic settings for enhanced visual appeal.", cat: "staging", photo: "photo-1628152371231-936cf45eb8f3", icon: "sofa", spaces: ["interior-staging"], popular: true },
  { name: "Colors & Textures", desc: "Customize colors and textures on design elements using presets or your own choices.", cat: "furnish", photo: "photo-1770970831074-6e88b6cc260b", icon: "layers", spaces: ["interior-material"] },
  { name: "Furniture Removal", desc: "Effortlessly remove furniture to create a clean slate for new design ideas.", cat: "furnish", photo: "photo-1779119507174-377fd3d44785", icon: "layers", spaces: ["interior-declutter"] },
  { name: "Sky Colors", desc: "Adjust the sky's color and weather in your images for the perfect atmosphere.", cat: "redesign", photo: "photo-1544984243-ec57ea16fe25", icon: "weather", spaces: ["exterior-sky"] },
  { name: "Material Swap", desc: "Replace materials on surfaces to explore different textures and finishes.", cat: "furnish", photo: "photo-1749212387838-c4c4e6e58348", icon: "layers", spaces: ["interior-material"] },
  { name: "Paint Visualizer", desc: "Change wall colors using presets or custom colors for interiors and exteriors.", cat: "furnish", photo: "photo-1562259949-e8e7689d7828", icon: "spark", spaces: ["interior-paint", "exterior-paint"] },
  { name: "Floor Editor", desc: "Replace the flooring in any image with custom materials to see how the new floor would look.", cat: "3d", photo: "photo-1761053130711-2515ef532bb5", icon: "layers", spaces: ["interior-floor"] },
  { name: "Furniture Finder", desc: "Identify and get purchase links for furniture in images and generated designs.", cat: "furnish", photo: "photo-1580480055273-228ff5388ef8", icon: "search", spaces: ["interior-finder"] },
  { name: "Room Composer", desc: "Upload your room and elements, and our AI will compose it into a stylish, cohesive space.", cat: "furnish", photo: "photo-1674058924341-a79eed7e9a89", icon: "sofa", spaces: ["interior-compose"] },
  { name: "Design Transfer", desc: "Recreate the style of inspiration images by applying their design style to a new space.", cat: "redesign", photo: "photo-1615529182904-14819c35db37", icon: "image", spaces: ["interior-transfer"] },
  { name: "Text to Design", desc: "Generate complete designs from text descriptions, turning words into beautifully crafted spaces.", cat: "redesign", photo: "photo-1757344454333-cc666252e596", icon: "file", spaces: ["interior-text", "exterior-text", "garden-text"] },
  { name: "Day & Night Lighting", desc: "See your room in morning sun, golden hour, at dusk or at night with the lights on.", cat: "redesign", photo: "photo-1618221195710-dd6b41faaea6", icon: "weather", spaces: ["interior-lighting"] },
  { name: "Sun & Wind Analysis", desc: "Tell us which way your home faces: AI reads the sun and wind on every side and suggests climate-smart design changes.", cat: "3d", photo: "photo-1568605115459-4b731184f961", icon: "weather", spaces: ["exterior-orient"] },
  { name: "Business 3D Floorplan", desc: "Upload one 2D plan. AI detects every room and generates consistent, photoreal renders for each space.", cat: "business", photo: "photo-1721244654210-a505a99661e9", icon: "house", premium: true, spaces: ["interior-bizplan"] },
  { name: "3D Floorplan", desc: "Generate realistic 3D renderings from 2D floorplans. Bring blueprints to life with complete accuracy.", cat: "3d", photo: "photo-1786550860329-f813516e9705", icon: "house", premium: true, spaces: ["interior-floorplan"] },
  { name: "Video Generation", desc: "Turn design ideas into stunning AI-powered videos and realistic visual presentations.", cat: "business", photo: "photo-1743463685519-469d9ebe1b7f", icon: "spark", premium: true, spaces: ["interior-video"] },
  { name: "Design Critique", desc: "Receive detailed AI-driven feedback on an uploaded room design and expert suggestions to refine it.", cat: "business", photo: "photo-1781888679143-01d758aedbe6", icon: "info", premium: true, spaces: ["interior-critique"] },
  { name: "Design Advisor", desc: "Chat with our AI trained by top designers to get advice tailored to your project and budget.", cat: "business", photo: "photo-1664638413302-d1ca29ac885b", icon: "headset", premium: true, spaces: ["interior-advisor"] },
];
const SPACE_META: Record<string, { label: [string, string]; icon: string }> = {
  interior: { label: ["Interior", "Nội thất"], icon: "sofa" },
  exterior: { label: ["Exterior", "Ngoại thất"], icon: "house" },
  garden: { label: ["Garden", "Sân vườn"], icon: "garden" },
};
const spaceOf = (id: ToolId) => (id.startsWith("interior") ? "interior" : id.startsWith("exterior") ? "exterior" : "garden");
const toolByName = (n: string) => TOOLS.find((x) => x.name === n);
const KIND: Record<string, string> = { redesign: "Redesign", staging: "Virtual Staging", declutter: "Declutter", material: "Material Swap", sketch: "Sketch to Render", sky: "Sky & Weather Swap" };
const toolLabel = (id: string) => { const [sp, k] = id.split("-"); return `${bi(sp === "interior" ? "Interiors" : sp === "exterior" ? "Exteriors" : "Gardens")} · ${bi(KIND[k] ?? k)}`; };
const styleName = (styles: { slug: string; name: string }[] | undefined, slug: string) => { const n = styles?.find((x) => x.slug === slug)?.name; return n ? bi(n) : slug; };
const toolForId = (id: ToolId) => TOOLS.find((x) => x.spaces?.includes(id) && x.cat !== "xx");
const FILTERS: [string, string, string][] = [["all", "All tools", "Tất cả"], ["redesign", "Redesign", "Thiết kế lại"], ["staging", "Staging", "Bài trí ảo"], ["furnish", "Furnish & decor", "Nội thất & trang trí"], ["business", "Business", "Doanh nghiệp"], ["3d", "3D & floorplan", "3D & mặt bằng"]];

/* ---------- Workspace (real generation) ---------- */
function Workspace({ tool: def, initialTool, preset, onCredits }: { tool: ToolDef; initialTool?: ToolId; preset?: Preset; onCredits: () => void }) {
  const spaces = def.spaces!;
  const [tool, setTool] = useState<ToolId>(initialTool && spaces.includes(initialTool) ? initialTool : spaces[0]);
  const g = useGenerator(tool, preset, onCredits);
  // Material comparison (surface tools only): several materials on the same photo, side by side.
  const canCompare = !!(g.cfg.surface || g.cfg.floor);
  const [compare, setCompare] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const cmp = useCompare(onCredits);
  useEffect(() => { setPicked([]); cmp.reset(); }, [g.surface, tool]);
  const togglePick = (m: string) => setPicked((a) => (a.includes(m) ? a.filter((x) => x !== m) : a.length >= MAX_COMPARE ? a : [...a, m]));
  const cost = ({ "1k": 1, "2k": 2, "4k": 3 } as Record<string, number>)[g.res] ?? 1;
  const runCompare = () => g.file && cmp.run({ tool, file: g.file, surface: g.cfg.floor ? "floor" : g.surface, materials: picked, resolution: g.res, aspectRatio: g.prep?.aspectRatio, custom: g.custom });
  const comparing = compare && canCompare;
  const modeSwitch = canCompare && (
    <div className="segmented" style={{ marginBottom: 10 }}>
      <button type="button" className={!compare ? "active" : ""} onClick={() => setCompare(false)}>{t("One material", "Một vật liệu")}</button>
      <button type="button" className={compare ? "active" : ""} onClick={() => setCompare(true)}>{t(`Compare up to ${MAX_COMPARE}`, `So sánh tối đa ${MAX_COMPARE}`)}</button>
    </div>
  );
  const pickGrid = (list: string[]) => (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{list.map((m) => <button key={m} type="button" className={`outline-btn ${picked.includes(m) ? "active" : ""}`} style={picked.includes(m) ? { background: "#1c1b19", color: "#fff" } : undefined} onClick={() => togglePick(m)}>{bi(m)}</button>)}</div>
      <p className="helper">{t(`${picked.length} selected · pick 2–${MAX_COMPARE}; each material is one image (${cost} credit each).`, `Đã chọn ${picked.length} · chọn 2–${MAX_COMPARE}; mỗi vật liệu là một ảnh (${cost} credit mỗi ảnh).`)}</p>
    </>
  );
  const { cfg, meta } = g;
  const [showAll, setShowAll] = useState({ room: false, style: false });
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);
  // VICOSTONE tile swatches for Floor Editor; the tile's name is its material value.
  const tileGrid = (active: (name: string) => boolean, pick: (name: string) => void) => !!meta?.floorTiles?.length && (
    <><h4>{t("VICOSTONE tiles · 120 × 120 cm, polished", "Gạch VICOSTONE · 120 × 120 cm, bóng kiếng")}</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8 }}>
        {meta.floorTiles.map((x) => (
          <div key={x.name} style={{ minWidth: 0 }}>
            <button type="button" title={x.name} aria-pressed={active(x.name)} onClick={() => pick(x.name)}
              style={{ display: "block", width: "100%", padding: 0, borderRadius: 8, overflow: "hidden", background: "#fff", cursor: "pointer", textAlign: "left", border: "1px solid #e2ded6", outline: active(x.name) ? "2px solid #1c1b19" : "none", outlineOffset: -1 }}>
              <img src={x.thumb} alt="" loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "1", objectFit: "cover" }} />
              <span style={{ display: "block", padding: "4px 6px", fontSize: 11, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.code}</span>
            </button>
            {x.room && <button type="button" className="link-btn" style={{ fontSize: 11, padding: "2px 0", background: "none", border: 0, color: "#6b665d", textDecoration: "underline", cursor: "pointer" }} onClick={() => setZoom({ src: x.room!, label: x.name })}>{t("See installed", "Xem ảnh mẫu")}</button>}
          </div>
        ))}
      </div></>
  );
  const [tab, setTab] = useState<"preset" | "extra">("preset");
  const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  const [open, setOpen] = useState<any>(null);
  const [toast, setToast] = useState("");
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const copyCritique = (c: NonNullable<typeof g.gen>["critique"] & {}) => {
    const text = [`${c.score}/10 · ${c.room} · ${c.style}`, c.summary, ...c.strengths.map((x) => `+ ${x}`), ...c.improvements.map((x) => `- ${x.area}: ${x.issue} → ${x.suggestion}`), ...c.quickWins.map((x) => `* ${x}`)].join("\n");
    navigator.clipboard.writeText(text).then(() => say("Copied · Đã sao chép"), () => say("Copy failed · Không sao chép được"));
  };
  const done = useMemo(() => g.history.filter((h) => h.outputUrl), [g.history]);

  const del = async (id: string) => {
    if (!confirm(bi("Delete this design permanently? · Xoá vĩnh viễn thiết kế này?"))) return;
    try { await fetch(`/api/generations/${id}`, { method: "DELETE" }); if (g.gen?.id === id) g.setGen(null); setOpen(null); g.loadHistory(); } catch (e: any) { say(e.message); }
  };
  const publish = async (h: any) => {
    if (!h.public && !confirm(bi("Publish to community gallery? · Đăng lên thư viện cộng đồng? Cả ảnh gốc và ảnh kết quả sẽ hiển thị công khai (không kèm email)."))) return;
    try { await api(`/api/generations/${h.id}/publish`, { public: !h.public }); g.loadHistory(); say(h.public ? "Unpublished" : "Published"); } catch (e: any) { say(e.message); }
  };

  if (!meta) return <p className="helper" style={{ padding: 40 }}>{bi("Loading… · Đang tải…")}</p>;
  const list = <T,>(arr: T[], k: "room" | "style") => (showAll[k] ? arr : arr.slice(0, 8));
  const choice = (label: string, i: number, active: boolean, onClick: () => void, thumb?: string) => (
    <div key={label + i} className="choice-wrap">
      <button type="button" className={`visual-choice ${active ? "active" : ""}`} style={{ backgroundImage: `url('${thumb ?? img(i)}')` }} onClick={onClick}><span>{label}</span></button>
      <button type="button" className="zoom-btn" aria-label={`${t("Zoom", "Phóng to")} ${label}`} title={t("Zoom", "Phóng to")} onClick={() => setZoom({ src: thumb ?? img(i), label })}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v6M8 11h6" /></svg>
      </button>
    </div>
  );

  return (
    <>
      {zoom && (
        <div className="zoom-modal" onClick={() => setZoom(null)}>
          <div className="zoom-box" onClick={(e) => e.stopPropagation()}>
            <img src={zoom.src} alt={zoom.label} />
            <div className="zoom-cap"><b>{zoom.label}</b><button type="button" onClick={() => setZoom(null)} aria-label={t("Close", "Đóng")}>✕</button></div>
          </div>
        </div>
      )}
      <div className="module-workspace">
        <div className="module-left">
          {cfg.text ? (
            <div className="upload-zone" style={{ alignItems: "stretch", textAlign: "left" }}>
              <div style={{ width: "100%" }}>
                <b>{t("Describe the space you want", "Mô tả không gian bạn muốn")}</b>
                <textarea className="textarea" style={{ marginTop: 10, minHeight: 150 }} maxLength={1000} placeholder={bi(cfg.hint)} value={g.description} onChange={(e) => g.setDescription(e.target.value)} />
                <p className="helper">{g.description.trim().length}/1000 · {t("Mention room type, colors, materials, furniture and mood.", "Nêu loại phòng, màu sắc, vật liệu, đồ nội thất và cảm giác mong muốn.")}</p>
              </div>
            </div>
          ) : <label className="upload-zone" style={{ cursor: "pointer", overflow: "hidden" }}>
            {g.preview ? <img src={g.preview} alt="" style={{ maxHeight: 340, width: "100%", objectFit: "contain" }} /> : (
              <div><div className="upload-icon"><Icon n="upload" /></div><span>{t("Drag and drop your image", "Kéo thả ảnh của bạn")}</span><b>{t("Or click here to upload", "Hoặc bấm để tải lên")}</b><p className="helper">{bi(cfg.hint)} · {t("Any photo — we fix orientation, size and format automatically", "Ảnh bất kỳ — tự động xoay, thu nhỏ và đổi định dạng")}</p></div>
            )}
            <input type="file" accept="image/*" hidden onChange={(e) => g.pick(e.target.files?.[0])} />
          </label>}
          {!cfg.text && <PrepInfo p={g.prep} />}
          <div className="or">{t("RESULT", "KẾT QUẢ")}</div>
          <section className="gallery-panel">
            {comparing && cmp.items.length > 0 && g.preview ? (
              <CompareResults original={g.preview} items={cmp.items} Compare={BeforeAfter} />
            ) : g.gen?.status === "SUCCESS" && g.gen.orient ? (
              <>
                <OrientView photo={g.gen.inputUrl} o={g.gen.orient} id={g.gen.id} params={g.gen.params ?? { kind: g.kind, facing: g.facing, city: g.city }} onCredits={onCredits} Compare={BeforeAfter} />
                <div className="row-between" style={{ marginTop: 14, flexWrap: "wrap", gap: 8 }}>
                  <button className="outline-btn" onClick={g.remove_}><Icon n="trash" /> {t("Delete", "Xoá")}</button>
                </div>
              </>
            ) : g.gen?.status === "SUCCESS" && g.gen.finder ? (
              <>
                <FinderView photo={g.gen.inputUrl} f={g.gen.finder} />
                <div className="row-between" style={{ marginTop: 14, flexWrap: "wrap", gap: 8 }}>
                  <button className="outline-btn" onClick={g.remove_}><Icon n="trash" /> {t("Delete", "Xoá")}</button>
                </div>
              </>
            ) : g.gen?.status === "SUCCESS" && g.gen.critique ? (
              <>
                <CritiqueView photo={g.gen.inputUrl} c={g.gen.critique} />
                <div className="row-between" style={{ marginTop: 14, flexWrap: "wrap", gap: 8 }}>
                  <button className="outline-btn" onClick={() => copyCritique(g.gen!.critique!)}><Icon n="file" /> {t("Copy text", "Sao chép")}</button>
                  <button className="outline-btn" onClick={g.remove_}><Icon n="trash" /> {t("Delete", "Xoá")}</button>
                </div>
              </>
            ) : g.gen?.status === "SUCCESS" && g.gen.outputUrl ? (
              <>
                <BeforeAfter before={g.gen.inputUrl} after={g.gen.outputUrl} />
                <div className="row-between" style={{ marginTop: 14, flexWrap: "wrap", gap: 8 }}>
                  <a className="outline-btn" href={g.gen.outputUrl} download={resultFile(g.gen.id, g.gen.outputUrl)}><Icon n="download" /> {t("Download", "Tải xuống")}</a>
                  {!g.gen.outputUrl.endsWith(".mp4") && <button className="outline-btn" onClick={g.togglePublic}><Icon n="globe" /> {g.gen.public ? t("Unpublish", "Gỡ khỏi thư viện") : t("Publish", "Đăng lên thư viện")}</button>}
                  <button className="outline-btn" onClick={g.remove_}><Icon n="trash" /> {t("Delete", "Xoá")}</button>
                </div>
              </>
            ) : (
              <p className="helper" style={{ textAlign: "center", padding: "40px 10px" }}>{g.busy ? (cfg.video ? t("Rendering your video… about 1–3 minutes.", "Đang tạo video… khoảng 1–3 phút.") : cfg.llm ? t("Analyzing your photo… about 20–30 seconds.", "Đang phân tích ảnh… khoảng 20–30 giây.") : t("Processing… this takes 1–2 minutes.", "Đang xử lý… mất khoảng 1–2 phút.")) : t("Your generated design appears here.", "Thiết kế được tạo sẽ hiện ở đây.")}</p>
            )}
          </section>
        </div>

        <div className="module-right">
          <div className="control-panel">
            {spaces.length > 1 && (
              <>
                <h3>{t("Select what kind of space you are generating", "Chọn loại không gian bạn muốn thiết kế")}</h3>
                <div className="space-choices">
                  {spaces.map((s) => (
                    <button key={s} type="button" className={`space-choice ${s === tool ? "active" : ""}`} onClick={() => setTool(s)}>
                      <Icon n={SPACE_META[spaceOf(s)].icon} /><span>{t(...SPACE_META[spaceOf(s)].label)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="control-tabs" style={{ marginTop: 22 }}>
              <button className={tab === "preset" ? "active" : ""} onClick={() => setTab("preset")}>{t("Preset Settings", "Cài đặt sẵn")}</button>
              <button className={tab === "extra" ? "active" : ""} onClick={() => setTab("extra")}>{t("Additional Instructions", "Yêu cầu thêm")}</button>
            </div>

            {cfg.reference && (
              <>
                <h4>{t("Style reference", "Ảnh tham khảo phong cách")}</h4>
                <label className="upload-zone" style={{ cursor: "pointer", overflow: "hidden", minHeight: 150 }}>
                  {g.refPreview ? <img src={g.refPreview} alt="" style={{ maxHeight: 220, width: "100%", objectFit: "contain" }} /> : (
                    <div><div className="upload-icon"><Icon n="image" /></div><b>{t("Upload an inspiration photo", "Tải ảnh mẫu bạn thích")}</b><p className="helper">{t("We'll apply its colors, materials and furniture style to your room.", "AI sẽ áp màu sắc, vật liệu và kiểu nội thất của ảnh này vào phòng bạn.")}</p></div>
                  )}
                  <input type="file" accept="image/*" hidden onChange={(e) => g.pickRef(e.target.files?.[0])} />
                </label>
                <PrepInfo p={g.refPrep} />
              </>
            )}
            {cfg.items && (
              <>
                <h4>{t(`Items to add (up to ${MAX_ITEMS})`, `Đồ vật cần thêm (tối đa ${MAX_ITEMS})`)}</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  {g.items.map((x, i) => (
                    <div key={x.preview} className="upload-zone" style={{ position: "relative", minHeight: 110, padding: 6, overflow: "hidden" }}>
                      <img src={x.preview} alt="" style={{ maxHeight: 100, width: "100%", objectFit: "contain" }} />
                      <button type="button" className="view-all" style={{ position: "absolute", top: 4, right: 6 }} onClick={() => g.removeItem(i)} aria-label={t("Remove item", "Xoá đồ vật")}>✕</button>
                    </div>
                  ))}
                  {g.items.length < MAX_ITEMS && (
                    <label className="upload-zone" style={{ cursor: "pointer", minHeight: 110, padding: 6 }}>
                      <div><div className="upload-icon"><Icon n="upload" /></div><b>{t("Add item", "Thêm đồ vật")}</b></div>
                      <input type="file" accept="image/*" hidden onChange={(e) => { g.pickItem(e.target.files?.[0]); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
                <p className="helper">{t("Photos of furniture or decor you want in the room — product photos work best. Use Additional Instructions to say where each piece should go.", "Ảnh đồ nội thất hoặc decor bạn muốn đặt vào phòng — ảnh sản phẩm cho kết quả tốt nhất. Dùng mục Yêu cầu thêm để nói vị trí đặt từng món.")}</p>
              </>
            )}
            {tab === "preset" ? (
              <>
                {cfg.room && (
                  <>
                    <h4>{t("1. Select Room Type", "1. Chọn loại phòng")} <button type="button" className="view-all" onClick={() => setShowAll({ ...showAll, room: !showAll.room })}>{showAll.room ? t("Less", "Thu gọn") : t("View All", "Xem tất cả")}</button></h4>
                    <div className="preset-grid">{list(meta.roomTypes, "room").map((r, i) => choice(bi(r), i, r === g.room, () => g.setRoom((cfg.text || cfg.llm) && r === g.room ? "" : r), thumbOf(ROOM_PHOTOS, r)))}</div>
                  </>
                )}
                {cfg.scope && (
                  <>
                    <h4>{t("2. Select Design Style", "2. Chọn phong cách")} <button type="button" className="view-all" onClick={() => setShowAll({ ...showAll, style: !showAll.style })}>{showAll.style ? t("Less", "Thu gọn") : t("View All", "Xem tất cả")}</button></h4>
                    <div className="style-grid">{list(g.styles, "style").map((s, i) => choice(bi(s.name), i + 4, s.slug === g.style, () => g.setStyle(cfg.text && s.slug === g.style ? "" : s.slug), s.thumb))}</div>
                    {cfg.text && <p className="helper">{t("Room type and style are optional — click a selected card again to clear it.", "Loại phòng và phong cách không bắt buộc — bấm lại thẻ đã chọn để bỏ chọn.")}</p>}
                  </>
                )}
                {cfg.lighting && (
                  <><h4>{t("Time of day", "Thời điểm trong ngày")}</h4>
                    <div className="weather-grid">{meta.lighting.map((l) => <button key={l} type="button" className={`weather-card ${l === g.lighting ? "active" : ""}`} style={{ backgroundImage: LIGHT_SWATCH[l] }} onClick={() => g.setLighting(l)}><span>{bi(l)}</span></button>)}</div>
                    <p className="helper">{t("Only the light changes; furniture, materials and the camera stay the same.", "Chỉ ánh sáng thay đổi; nội thất, vật liệu và góc chụp giữ nguyên.")}</p></>
                )}
                {cfg.orient && (
                  <>
                    <h4>{t("What are you uploading?", "Bạn tải lên gì?")}</h4>
                    <div className="segmented">{([["plan", "Floor plan", "Mặt bằng"], ["facade", "Facade photo", "Ảnh mặt tiền"]] as const).map(([k, en, vi]) => <button key={k} type="button" className={g.kind === k ? "active" : ""} onClick={() => g.setKind(k)}>{t(en, vi)}</button>)}</div>
                    <h4>{g.kind === "plan" ? t("The top of the plan faces", "Phía trên bản vẽ nhìn về hướng") : t("The facade faces", "Mặt tiền nhìn về hướng")}</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, maxWidth: 300 }}>
                      {["NW", "N", "NE", "W", "", "E", "SW", "S", "SE"].map((d, i) => d ? <button key={d} type="button" className={`outline-btn ${g.facing === d ? "active" : ""}`} style={g.facing === d ? { background: "#1c1b19", color: "#fff" } : undefined} onClick={() => g.setFacing(d)}>{t(...DIR_NAMES[d])}</button> : <span key={i} style={{ display: "grid", placeItems: "center", fontSize: 20 }}>🧭</span>)}
                    </div>
                    <h4>{t("City", "Thành phố")}</h4>
                    <select className="country" value={g.city} onChange={(e) => g.setCity(e.target.value)}><option value="">{t("Choose a city", "Chọn thành phố")}</option>{meta.cities.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                    <p className="helper">{t("We compute the sun on each side from the city's latitude, then the AI assesses sun and wind and suggests changes. 1 credit; the illustration is 1 more.", "Hệ thống tính nắng trên từng mặt theo vĩ độ thành phố, rồi AI đánh giá nắng gió và đề xuất. 1 credit; ảnh minh hoạ thêm 1 credit.")}</p>
                  </>
                )}
                {cfg.video && (
                  <><h4>{t("Camera movement", "Chuyển động camera")}</h4>
                    <div className="segmented">{meta.motions.map((m) => <button key={m} type="button" className={m === g.motion ? "active" : ""} onClick={() => g.setMotion(m)}>{bi(m)}</button>)}</div></>
                )}
                {cfg.angle && (
                  <><h4>{t("View angle", "Góc nhìn")}</h4>
                    <div className="segmented">{meta.angles.map((a) => <button key={a} type="button" className={a === g.angle ? "active" : ""} onClick={() => g.setAngle(a)}>{bi(a)}</button>)}</div></>
                )}
                {cfg.planView && (
                  <><h4>{t("3D view", "Góc nhìn 3D")}</h4>
                    <div className="segmented">{meta.planViews.map((v) => <button key={v} type="button" className={v === g.view ? "active" : ""} onClick={() => g.setView(v)}>{bi(v)}</button>)}</div></>
                )}
                {cfg.weather && (
                  <><h4>{t("Change Sky Colors to:", "Đổi bầu trời thành:")}</h4>
                    <div className="weather-grid">{meta.weather.map((w, i) => <button key={w} type="button" className={`weather-card ${w === g.weather ? "active" : ""}`} style={{ backgroundImage: `url('${thumbOf(WEATHER_PHOTOS, w) ?? img(i + 3)}')` }} onClick={() => g.setWeather(w)}><span>{bi(w)}</span></button>)}</div></>
                )}
                {cfg.remove && (
                  <><h4>{t("Remove from the image", "Xoá khỏi ảnh")}</h4>
                    {meta.remove.map((r) => (
                      <label key={r} className="switch" style={{ display: "flex", marginTop: 8 }}>
                        <input type="checkbox" checked={g.remove.includes(r)} onChange={(e) => g.setRemove(e.target.checked ? [...g.remove, r] : g.remove.filter((x) => x !== r))} /> {r}
                      </label>
                    ))}</>
                )}
                {cfg.surface && (
                  <><h4>{t("Surface", "Bề mặt")}</h4>
                    <div className="segmented">{Object.keys(meta.surfaces).map((s) => <button key={s} type="button" className={s === g.surface ? "active" : ""} onClick={() => g.setSurface(s)}>{bi(s)}</button>)}</div>
                    <h4>{comparing ? t("Materials to compare", "Vật liệu cần so sánh") : t("Material", "Vật liệu")}</h4>
                    {modeSwitch}
                    {comparing ? pickGrid(meta.surfaces[g.surface]) : <select className="country" value={g.material} onChange={(e) => g.setMaterial(e.target.value)}>{meta.surfaces[g.surface].map((m) => <option key={m} value={m}>{bi(m)}</option>)}</select>}</>
                )}
                {cfg.floor && (
                  <><h4>{comparing ? t("Floors to compare", "Các loại sàn cần so sánh") : t("Flooring material", "Vật liệu sàn")}</h4>
                    {modeSwitch}
                    {comparing ? pickGrid(meta.surfaces.floor) : <div className="segmented">{meta.surfaces.floor.map((m) => <button key={m} type="button" className={m === g.material ? "active" : ""} onClick={() => g.setMaterial(m)}>{bi(m)}</button>)}</div>}
                    {comparing ? tileGrid((n) => picked.includes(n), togglePick) : tileGrid((n) => n === g.material, g.setMaterial)}</>
                )}
                {cfg.paint && (
                  <><h4>{t("Wall color", "Màu sơn tường")}</h4>
                    <div className="paint-grid">
                      {meta.paints.map((c) => (
                        <button key={c.name} type="button" className={`paint-swatch ${g.color === c.name ? "active" : ""}`} onClick={() => g.setColor(c.name)}>
                          <i style={{ background: c.hex }} /><span>{bi(c.name)}</span>
                        </button>
                      ))}
                      <label className={`paint-swatch ${g.color.startsWith("#") ? "active" : ""}`}>
                        <input type="color" value={g.color.startsWith("#") ? g.color : meta.paints.find((c) => c.name === g.color)?.hex ?? "#ffffff"} onChange={(e) => g.setColor(e.target.value)} />
                        <span>{g.color.startsWith("#") ? g.color.toUpperCase() : t("Custom color", "Màu tuỳ chọn")}</span>
                      </label>
                    </div>
                    <h4>{t("Finish", "Độ bóng")}</h4>
                    <div className="segmented" style={{ textTransform: "capitalize" }}>{meta.finishes.map((f) => <button key={f} type="button" className={f === g.paintFinish ? "active" : ""} onClick={() => g.setPaintFinish(f)}>{bi(f)}</button>)}</div></>
                )}
                {cfg.intervention && (
                  <><h4>{t("AI Intervention", "Mức can thiệp AI")}</h4>
                    <input className="range" type="range" min={0} max={4} value={g.lvl} onChange={(e) => g.setLvl(+e.target.value)} />
                    <div className="range-labels">{meta.intervention.map((x) => <span key={x}>{bi(x)}</span>)}</div></>
                )}
              </>
            ) : (
              <>
                <h4>{t("Enter your prompt below:", "Nhập yêu cầu của bạn:")}</h4>
                <textarea className="textarea" maxLength={500} placeholder={t("What do you want to change on this image?", "Bạn muốn thay đổi điều gì trên bức ảnh?")} value={g.custom} onChange={(e) => g.setCustom(e.target.value)} />
              </>
            )}

            {cfg.text && (
              <><h4>{t("Image shape", "Khung ảnh")}</h4>
                <div className="segmented">{[["16:9", "Wide", "Ngang rộng"], ["4:3", "Landscape", "Ngang"], ["1:1", "Square", "Vuông"], ["3:4", "Portrait", "Dọc"]].map(([r, en, vi]) => <button key={r} type="button" className={r === g.aspect ? "active" : ""} onClick={() => g.setAspect(r)}>{t(en, vi)} · {r}</button>)}</div></>
            )}
            {cfg.video ? <p className="helper">{t("Each clip costs 5 credits · 8 seconds, 720p, with ambient sound.", "Mỗi clip tốn 5 credit · 8 giây, 720p, có âm thanh nền.")}</p> : cfg.llm ? <p className="helper">{t("Each analysis costs 1 credit.", "Mỗi lần phân tích tốn 1 credit.")}</p> : <>
              <h4>{t("Resolution", "Độ phân giải")}</h4>
              <div className="segmented">{[["1k", 1], ["2k", 2], ["4k", 3]].map(([k, c]) => <button key={k} type="button" className={k === g.res ? "active" : ""} onClick={() => g.setRes(k as string)}>{(k as string).toUpperCase()} · {c} credit</button>)}</div>
            </>}
            {g.err && <p className="helper" style={{ color: "#b3261e" }}>{bi(g.err)}</p>}
            {comparing ? <>
              {cmp.err && <p className="helper" style={{ color: "#b3261e" }}>{bi(cmp.err)}</p>}
              <button className="generate-btn" disabled={!g.file || g.preparing > 0 || picked.length < 2 || cmp.busy} onClick={runCompare} style={!g.file || picked.length < 2 || cmp.busy ? { opacity: 0.5 } : undefined}>
                <Icon n="spark" />{cmp.busy ? t("Rendering the comparison…", "Đang render so sánh…") : !g.file ? t("Upload an image first", "Hãy tải ảnh lên trước") : picked.length < 2 ? t("Pick at least 2 materials", "Hãy chọn ít nhất 2 vật liệu") : t(`Compare ${picked.length} materials · ${picked.length * cost} credits`, `So sánh ${picked.length} vật liệu · ${picked.length * cost} credit`)}
              </button>
            </> : <button className="generate-btn" disabled={!g.ready || g.busy} onClick={g.run} style={!g.ready || g.busy ? { opacity: 0.5 } : undefined}>
              <Icon n="spark" />{g.busy ? t("Generating… (1–2 min)", "Đang tạo… (1–2 phút)") : g.preparing ? t("Optimizing image…", "Đang tối ưu ảnh…") : g.ready ? t("Generate New Designs", "Tạo thiết kế mới") : cfg.text ? t("Describe your space first", "Hãy mô tả không gian trước") : !g.file ? t("Upload an image first", "Hãy tải ảnh lên trước") : cfg.items && !g.items.length ? t("Add an item photo", "Hãy thêm ảnh đồ vật") : cfg.orient ? t("Pick the direction and the city", "Hãy chọn hướng và thành phố") : t("Add a style reference", "Hãy thêm ảnh tham khảo")}
            </button>}
          </div>
        </div>
      </div>

      <section className="module-latest">
        <div className="latest-head"><h2>{t("Latest Designs", "Thiết kế gần đây")}</h2><span className="latest-count">{done.length}</span></div>
        {done.length === 0 ? <p className="helper">{t("No designs yet — generate your first one above.", "Chưa có thiết kế — hãy tạo thiết kế đầu tiên ở trên.")}</p> : (
          <div className="latest-grid">
            {done.slice(0, 12).map((h, i) => (
              <article className="latest-card" key={h.id} style={{ ["--card-index" as any]: i }}>
                <div className="latest-image" style={isChat(h) && !h.inputUrl ? { display: "grid", placeItems: "center", background: "#f4f1ea" } : { backgroundImage: `url('${isTextResult(h) || isVideo(h) ? h.inputUrl : h.outputUrl}')`, ...(isVideo(h) ? { display: "grid", placeItems: "center" } : {}) }}>{isChat(h) && !h.inputUrl && <Icon n="headset" />}{isVideo(h) && <span style={{ width: 44, height: 44, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 18 }}>▶</span>}</div>
                <div className="latest-body">
                  <div className="latest-meta">
                    <span><strong>{t("Tool", "Công cụ")}:</strong> {toolLabel(String(h.tool))}</span>
                    {h.params?.styleSlug && <span><strong>{t("Style", "Phong cách")}:</strong> {styleName(g.styles, h.params.styleSlug)}</span>}
                    {h.params?.roomType && <span><strong>{t("Room", "Phòng")}:</strong> {bi(h.params.roomType)}</span>}
                  </div>
                  <div className="latest-actions">
                    {!isTextResult(h) && <a className="latest-action" title={t("Download", "Tải xuống")} href={h.outputUrl} download={resultFile(h.id, h.outputUrl)}><Icon n="download" /></a>}
                    <button className="latest-action" title={t("Preview", "Xem trước")} onClick={() => (isTextResult(h) ? api(`/api/generations/${h.id}`).then((d: any) => setOpen({ ...h, critique: d.critique, finder: d.finder, orient: d.orient, params: d.params, chat: d.chat })).catch((e: any) => say(e.message)) : setOpen(h))}><Icon n="eye" /></button>
                    <button className="latest-action" title={t("Reuse settings", "Dùng lại cài đặt")} onClick={() => navigate(`/app?tool=${h.tool}&p=${encodeURIComponent(JSON.stringify(h.params ?? {}))}`)}><Icon n="edit" /></button>
                    {!isTextResult(h) && !isVideo(h) && <button className="latest-action" title={h.public ? t("Unpublish", "Gỡ đăng") : t("Publish", "Đăng công khai")} onClick={() => publish(h)}><Icon n="globe" /></button>}
                    <button className="latest-action" title={t("Delete", "Xoá")} onClick={() => del(h.id)}><Icon n="trash" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {open && (
        <div className="modal-backdrop show" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className={`modal${open.chat || open.orient || open.finder || open.critique ? "" : " modal-xl"}`} style={open.chat || open.orient || open.finder || open.critique ? { maxWidth: 560, maxHeight: "92vh", overflowY: "auto" } : undefined}>
            <button className="close" onClick={() => setOpen(null)} aria-label={t("Close", "Đóng")}>×</button>
            {open.chat ? <><h3 style={{ marginTop: 0 }}>{t("Design Advisor", "Tư vấn thiết kế")}</h3>{open.inputUrl && <img src={open.inputUrl} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 10, marginBottom: 12 }} />}<Transcript turns={open.chat} /></>
              : open.orient ? <OrientView photo={open.inputUrl} o={open.orient} id={open.id} params={open.params ?? {}} Compare={BeforeAfter} />
              : open.finder ? <FinderView photo={open.inputUrl} f={open.finder} />
              : open.critique ? <CritiqueView photo={open.inputUrl} c={open.critique} /> : <BeforeAfter before={open.inputUrl} after={open.outputUrl} zoomable />}
          </div>
        </div>
      )}
      {toast && <div className="module-toast show">{bi(toast)}</div>}
    </>
  );
}

/* ---------- App shell ---------- */
export function App() {
  const { me, loaded, reload, logout } = useAuth();
  const { search } = useLocation();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [lang, setL] = useState(getLang());

  useEffect(() => { if (loaded && !me) navigate("/login"); }, [loaded, me]);

  const toolParam = search.get("tool") as ToolId | null;
  let preset: Preset | undefined;
  try { const p = search.get("p"); if (p) preset = JSON.parse(p); } catch { /* ignore */ }
  const moduleName = search.get("m") ?? (toolParam ? toolForId(toolParam)?.name : null) ?? null;
  const active = moduleName ? toolByName(moduleName) : undefined;

  const visible = TOOLS.filter((x) => (filter === "all" || x.cat === filter) && (!q || `${x.name} ${bi(x.name)}`.toLowerCase().includes(q.toLowerCase())));
  const open = (name: string) => navigate(`/app?m=${encodeURIComponent(name)}`);
  const home = () => navigate("/app");
  const scrollTools = () => { if (active) home(); setTimeout(() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" }), 60); };

  if (!loaded || !me) return <div className="sxapp" style={{ display: "grid", placeItems: "center" }}><p>…</p></div>;
  const initials = me.email.slice(0, 2).toUpperCase();
  const credits = me.unlimited ? "∞" : me.credits;

  return (
    <div className="sxapp">
      <div className={`app ${active ? "module-mode" : ""}`}>
        <aside className="sidebar">
          <a className="brand" href="/app" onClick={(e) => { e.preventDefault(); home(); }} aria-label="SOLYC Gen Labs">
            <img src="/solyc/logo.png" alt="SOLYC Gen Labs" style={{ background: "#fff", borderRadius: 4, padding: "8px 10px", width: "100%", boxSizing: "border-box" }} />
            <img className="brand-mark" src="/solyc/symbol-gold.svg" alt="" />
          </a>
          <nav className="nav" aria-label={t("Primary navigation", "Điều hướng chính")}>
            <a className="nav-item active" href="/app" onClick={(e) => { e.preventDefault(); home(); }}><Icon n="grid" className="nav-icon" /><span className="nav-label">{t("Dashboard", "Bảng điều khiển")}</span></a>
            <a className="nav-item" href="#tools" onClick={(e) => { e.preventDefault(); scrollTools(); }}><Icon n="image" className="nav-icon" /><span className="nav-label">{t("All Tools", "Tất cả công cụ")}</span></a>
            <Link to="/projects" className="nav-item"><Icon n="image" className="nav-icon" /><span className="nav-label">{t("Image Gallery", "Thư viện ảnh")}</span></Link>
            <Link to="/design-styles" className="nav-item"><Icon n="layers" className="nav-icon" /><span className="nav-label">{t("Design styles", "Phong cách")}</span></Link>
            <Link to="/about-us" className="nav-item"><Icon n="headset" className="nav-icon" /><span className="nav-label">{t("Support", "Hỗ trợ")}</span></Link>
          </nav>
          <div className="sidebar-spacer" />
          <Link to="/pricing" className="upgrade"><span>{t("Upgrade Now", "Nâng cấp")}</span><i className="crown"><Icon n="spark" /></i></Link>
          <div className="workshop"><b>{t("Your credits", "Credit của bạn")}</b><strong>{credits}</strong><p>{t("Free credits refill every 24 hours.", "Credit miễn phí nạp lại sau mỗi 24 giờ.")}</p></div>
        </aside>

        {!active && (
          <main className="main" id="top">
            <header className="topbar">
              <label className="search" aria-label={t("Search tools", "Tìm công cụ")}><Icon n="search" /><input type="search" placeholder={t("Search AI tools", "Tìm công cụ AI")} value={q} onChange={(e) => setQ(e.target.value)} /></label>
              <button className="bell" aria-label={t("Language", "Ngôn ngữ")} onClick={() => { const n = lang === "vi" ? "en" : "vi"; setLang(n); setL(n); }} style={{ width: "auto", padding: "0 12px", fontSize: 12 }}>{lang === "vi" ? "VI · EN" : "EN · VI"}</button>
              <div className="profile"><div className="avatar">{initials}</div><div><strong>{me.email}</strong><small>{credits} {t("credits", "credit")}</small></div></div>
              <button className="outline-btn" onClick={() => navigate("/")}>{t("Log out", "Thoát")}</button>
            </header>

            <section className="hero">
              <div><p className="eyebrow">SOLYC Gen Labs / {t("Material Intelligence", "Trí tuệ vật liệu")}</p><h1>{t("Design what’s", "Thiết kế những")} <span>{t("possible.", "khả thể mới.")}</span></h1><p>{t("Design new possibilities. Pick a group of tools below.", "Thiết kế những khả thể mới. Chọn một nhóm công cụ bên dưới.")}</p></div>
            </section>

            <div className="chips" role="tablist">
              {FILTERS.map(([k, en, vi]) => <button key={k} className={`chip ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{t(en, vi)}</button>)}
            </div>

            <section className="spotlight">
              <div className="spotlight-copy"><p className="eyebrow">{bi("Perfect Redesign")}</p><h2>{t("Bring your next space to life with AI.", "Biến không gian tiếp theo của bạn thành hiện thực bằng AI.")}</h2><p>{t("Upload a photo, pick a style and let AI redesign it while keeping your walls, windows and layout.", "Tải ảnh, chọn phong cách và để AI thiết kế lại trong khi giữ nguyên tường, cửa sổ và bố cục.")}</p><button className="primary-btn" onClick={() => open("Perfect Redesign")}>{t("Start Now", "Bắt đầu ngay")} <span>→</span></button></div>
              <div className="spotlight-art"><span className="spotlight-tag">{t("AI Redesign", "Thiết kế lại bằng AI")}</span></div>
            </section>

            <section id="tools">
              <div className="section-head"><h2>{t("Explore AI tools", "Khám phá công cụ AI")}</h2><span>{visible.length} {t("solutions", "giải pháp")}</span></div>
              <div className="grid">
                {visible.length === 0 && <div className="empty">{t("No tools matched your search.", "Không có công cụ phù hợp.")}</div>}
                {visible.map((x, i) => (
                  <article className="card" key={x.name} style={{ ["--card-index" as any]: i }}>
                    <div className="card-image"><img loading="lazy" src={U(x.photo)} alt={bi(x.name)} onError={(e) => { e.currentTarget.src = U(IMGS[i % IMGS.length]); }} />{x.popular && <span className="badge">{t("Most Popular", "Phổ biến nhất")}</span>}</div>
                    <div className="card-body">
                      <h3>{bi(x.name)}</h3><p>{bi(x.desc)}</p>
                      <button className={x.spaces ? "" : "locked"} onClick={() => open(x.name)}>{x.spaces ? (getLang() === "vi" ? "Dùng thử" : `Try ${x.name}`) : t("Coming soon", "Sắp ra mắt")}</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>
        )}

        {active && (
          <main className="module-main" style={{ display: "block" }}>
            <div className="module-layout">
              <aside className="module-rail">
                <div className="module-icons">
                  <button className="module-logo" onClick={home} aria-label={t("Back to dashboard", "Về bảng điều khiển")}><img src="/solyc/symbol-gold.svg" alt="SOLYC" /></button>
                </div>
                <div className="module-tool-list">
                  <h4>{t("Tools", "Công cụ")}</h4>
                  {TOOLS.map((x) => (
                    <button key={x.name} className={`module-tool-link ${x.name === active.name ? "active" : ""}`} onClick={() => open(x.name)}>
                      <span className="module-tool-icon"><Icon n={x.icon} /></span><span className="module-tool-label">{bi(x.name)}</span>
                    </button>
                  ))}
                </div>
              </aside>
              <section className="module-content">
                <header className="module-head">
                  <div className="module-title-row"><button className="module-back" onClick={home} aria-label={t("Back to dashboard", "Về bảng điều khiển")}><Icon n="back" /></button><h1>{bi(active.name)}</h1></div>
                  <div className="module-actions"><span className="nav-user" style={{ alignSelf: "center" }}>{credits} {t("credits", "credit")}</span><button className="outline-btn" onClick={() => navigate("/")}>{t("Log out", "Thoát")}</button></div>
                </header>
                <div className="module-banner"><span className="info"><Icon n="info" /></span><div><h2>{bi(active.name)}</h2><p>{bi(active.desc)}</p></div></div>
                <ToolGuide key={active.name} name={active.name} />
                <div>
                  {active.spaces?.[0] === "interior-bizplan" ? (
                    <div className="control-panel" style={{ margin: "20px 0" }}><BizPlan onCreditsChange={reload} /></div>
                  ) : active.spaces?.[0] === "interior-advisor" ? (
                    <div className="control-panel" style={{ margin: "20px 0" }}><AdvisorChat onCreditsChange={reload} /></div>
                  ) : active.spaces ? (
                    <Workspace key={active.name + (toolParam ?? "")} tool={active} initialTool={toolParam ?? undefined} preset={preset} onCredits={reload} />
                  ) : (
                    <div className="control-panel" style={{ margin: "30px 0", textAlign: "center" }}>
                      <h3>{t("This tool is coming soon.", "Công cụ này sắp ra mắt.")}</h3>
                      <p className="helper">{t("Try Perfect Redesign, Virtual Staging, Material Swap, Furniture Removal or Sky Colors in the meantime.", "Hiện bạn có thể dùng Thiết kế hoàn hảo, Bài trí ảo, Đổi vật liệu, Xoá đồ nội thất hoặc Đổi màu bầu trời.")}</p>
                      <button className="generate-btn" onClick={() => open("Perfect Redesign")}><Icon n="spark" />{bi("Perfect Redesign")}</button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
