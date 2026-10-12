import React, { useEffect, useMemo, useState } from "react";
import "./sxapp.css";
import { navigate, useLocation, Link } from "./router";
import { bi, getLang, setLang, t } from "./i18n";
import { api, useAuth } from "./auth";
import { BeforeAfter, useGenerator, type Preset, type ToolId } from "./GeneratePanel";

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

type ToolDef = { name: string; desc: string; cat: string; photo: string; premium?: boolean; icon: string; spaces?: ToolId[]; popular?: boolean };
const REDESIGN: ToolId[] = ["interior-redesign", "exterior-redesign", "garden-redesign"];
const TOOLS: ToolDef[] = [
  { name: "Magic Redesign", desc: "Type your request and instantly transform any detail from your space with our conversational AI.", cat: "redesign", photo: "photo-1600210492486-724fe5c67fb0", icon: "spark", spaces: REDESIGN },
  { name: "Perfect Redesign", desc: "Complete redesign of your home spaces with enhanced results, while preserving structural elements.", cat: "redesign", photo: "photo-1618221195710-dd6b41faaea6", icon: "spark", spaces: REDESIGN, popular: true },
  { name: "Beautiful Redesign", desc: "Change your room style and refresh your design using our AI model.", cat: "redesign", photo: "photo-1616486338812-3dadae4b4ace", icon: "image", spaces: REDESIGN },
  { name: "Virtual Staging", desc: "Instantly stage spaces with realistic furniture and decor to visualize their potential.", cat: "staging", photo: "photo-1600607687939-ce8a6c25118c", icon: "sofa", spaces: ["interior-staging"] },
  { name: "Creative Redesign", desc: "Allow AI to rearrange furniture and adjust structures for an innovative new look.", cat: "redesign", photo: "photo-1600566753190-17f0baa2a6c3", icon: "spark", spaces: REDESIGN },
  { name: "Sketch to Render", desc: "Transform rough sketches into photorealistic renders for clear visualizations.", cat: "redesign", photo: "photo-1540518614846-7eded433c457", icon: "image", spaces: ["interior-sketch", "exterior-sketch"] },
  { name: "Fill Spaces", desc: "Furnish and decorate empty rooms with AI, tailored to your chosen style and room type.", cat: "furnish", photo: "photo-1600607687920-4e2a09cf159d", icon: "sofa", spaces: ["interior-staging"] },
  { name: "Decor Staging", desc: "Virtually stage furniture and decor in realistic settings for enhanced visual appeal.", cat: "staging", photo: "photo-1600566753086-00f18fb6b3ea", icon: "sofa", spaces: ["interior-staging"], popular: true },
  { name: "Colors & Textures", desc: "Customize colors and textures on design elements using presets or your own choices.", cat: "furnish", photo: "photo-1600121848594-d8644e57abab", icon: "layers", spaces: ["interior-material"] },
  { name: "Furniture Removal", desc: "Effortlessly remove furniture to create a clean slate for new design ideas.", cat: "furnish", photo: "photo-1600607688969-a5bfcd646154", icon: "layers", spaces: ["interior-declutter"] },
  { name: "Sky Colors", desc: "Adjust the sky's color and weather in your images for the perfect atmosphere.", cat: "redesign", photo: "photo-1600585154340-be6161a56a0c", icon: "weather", spaces: ["exterior-sky"] },
  { name: "Material Swap", desc: "Replace materials on surfaces to explore different textures and finishes.", cat: "furnish", photo: "photo-1600566753190-17f0baa2a6c3", icon: "layers", spaces: ["interior-material"] },
  { name: "Paint Visualizer", desc: "Change wall colors using presets or custom colors for interiors and exteriors.", cat: "furnish", photo: "photo-1618220179428-22790b461013", icon: "spark", spaces: ["interior-material"] },
  { name: "Floor Editor", desc: "Replace the flooring in any image with custom materials to see how the new floor would look.", cat: "3d", photo: "photo-1600210492486-724fe5c67fb0", icon: "layers", spaces: ["interior-material"] },
  { name: "Furniture Finder", desc: "Identify and get purchase links for furniture in images and generated designs.", cat: "furnish", photo: "photo-1615874694520-47482239468c", icon: "search" },
  { name: "Room Composer", desc: "Upload your room and elements, and our AI will compose it into a stylish, cohesive space.", cat: "furnish", photo: "photo-1616486338812-3dadae4b4ace", icon: "sofa" },
  { name: "Design Transfer", desc: "Recreate the style of inspiration images by applying their design style to a new space.", cat: "redesign", photo: "photo-1616486338812-3dadae4b4ace", icon: "image" },
  { name: "Text to Design", desc: "Generate complete designs from text descriptions, turning words into beautifully crafted spaces.", cat: "redesign", photo: "photo-1600607687939-ce8a6c25118c", icon: "file" },
  { name: "Business 3D Floorplan", desc: "Upload one 2D plan. AI detects every room and generates consistent, photoreal renders for each space.", cat: "business", photo: "photo-1600607687920-4e2a09cf159d", icon: "house", premium: true },
  { name: "3D Floorplan", desc: "Generate realistic 3D renderings from 2D floorplans. Bring blueprints to life with complete accuracy.", cat: "3d", photo: "photo-1600585154340-be6161a56a0c", icon: "house", premium: true },
  { name: "Video Generation", desc: "Turn design ideas into stunning AI-powered videos and realistic visual presentations.", cat: "business", photo: "photo-1615874694520-47482239468c", icon: "spark", premium: true },
  { name: "Design Critique", desc: "Receive detailed AI-driven feedback on an uploaded room design and expert suggestions to refine it.", cat: "business", photo: "photo-1600566753086-00f18fb6b3ea", icon: "info", premium: true },
  { name: "Design Advisor", desc: "Chat with our AI trained by top designers to get advice tailored to your project and budget.", cat: "business", photo: "photo-1600121848594-d8644e57abab", icon: "headset", premium: true },
];
const SPACE_META: Record<string, { label: [string, string]; icon: string }> = {
  interior: { label: ["Interior", "Nội thất"], icon: "sofa" },
  exterior: { label: ["Exterior", "Ngoại thất"], icon: "house" },
  garden: { label: ["Garden", "Sân vườn"], icon: "garden" },
};
const spaceOf = (id: ToolId) => (id.startsWith("interior") ? "interior" : id.startsWith("exterior") ? "exterior" : "garden");
const toolByName = (n: string) => TOOLS.find((x) => x.name === n);
const toolForId = (id: ToolId) => TOOLS.find((x) => x.spaces?.includes(id) && x.cat !== "xx");
const FILTERS: [string, string, string][] = [["all", "All tools", "Tất cả"], ["redesign", "Redesign", "Thiết kế lại"], ["staging", "Staging", "Staging"], ["furnish", "Furnish & decor", "Nội thất & decor"], ["business", "Business", "Doanh nghiệp"], ["3d", "3D & floorplan", "3D & mặt bằng"]];

/* ---------- Workspace (real generation) ---------- */
function Workspace({ tool: def, initialTool, preset, onCredits }: { tool: ToolDef; initialTool?: ToolId; preset?: Preset; onCredits: () => void }) {
  const spaces = def.spaces!;
  const [tool, setTool] = useState<ToolId>(initialTool && spaces.includes(initialTool) ? initialTool : spaces[0]);
  const g = useGenerator(tool, preset, onCredits);
  const { cfg, meta } = g;
  const [showAll, setShowAll] = useState({ room: false, style: false });
  const [tab, setTab] = useState<"preset" | "extra">("preset");
  const [open, setOpen] = useState<any>(null);
  const [toast, setToast] = useState("");
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
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
    <button key={label + i} type="button" className={`visual-choice ${active ? "active" : ""}`} style={{ backgroundImage: `url('${thumb ?? img(i)}')` }} onClick={onClick}><span>{label}</span></button>
  );

  return (
    <>
      <div className="module-workspace">
        <div className="module-left">
          <label className="upload-zone" style={{ cursor: "pointer", overflow: "hidden" }}>
            {g.preview ? <img src={g.preview} alt="" style={{ maxHeight: 340, width: "100%", objectFit: "contain" }} /> : (
              <div><div className="upload-icon"><Icon n="upload" /></div><span>{t("Drag and drop your image", "Kéo thả ảnh của bạn")}</span><b>{t("Or click here to upload", "Hoặc bấm để tải lên")}</b><p className="helper">{bi(cfg.hint)} · JPG/PNG/WebP ≤10MB</p></div>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => g.pick(e.target.files?.[0])} />
          </label>
          <div className="or">{t("RESULT", "KẾT QUẢ")}</div>
          <section className="gallery-panel">
            {g.gen?.status === "SUCCESS" && g.gen.outputUrl ? (
              <>
                <BeforeAfter before={g.gen.inputUrl} after={g.gen.outputUrl} />
                <div className="row-between" style={{ marginTop: 14, flexWrap: "wrap", gap: 8 }}>
                  <a className="outline-btn" href={g.gen.outputUrl} download={`design-${g.gen.id}.png`}><Icon n="download" /> {t("Download", "Tải xuống")}</a>
                  <button className="outline-btn" onClick={g.togglePublic}><Icon n="globe" /> {g.gen.public ? t("Unpublish", "Gỡ khỏi thư viện") : t("Publish", "Đăng lên thư viện")}</button>
                  <button className="outline-btn" onClick={g.remove_}><Icon n="trash" /> {t("Delete", "Xoá")}</button>
                </div>
              </>
            ) : (
              <p className="helper" style={{ textAlign: "center", padding: "40px 10px" }}>{g.busy ? t("Processing… this takes 1–2 minutes.", "Đang xử lý… mất khoảng 1–2 phút.") : t("Your generated design appears here.", "Thiết kế được tạo sẽ hiện ở đây.")}</p>
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

            {tab === "preset" ? (
              <>
                {cfg.room && (
                  <>
                    <h4>{t("1. Select Room Type", "1. Chọn loại phòng")} <button type="button" className="view-all" onClick={() => setShowAll({ ...showAll, room: !showAll.room })}>{showAll.room ? t("Less", "Thu gọn") : t("View All", "Xem tất cả")}</button></h4>
                    <div className="preset-grid">{list(meta.roomTypes, "room").map((r, i) => choice(bi(r), i, r === g.room, () => g.setRoom(r)))}</div>
                  </>
                )}
                {cfg.scope && (
                  <>
                    <h4>{t("2. Select Design Style", "2. Chọn phong cách")} <button type="button" className="view-all" onClick={() => setShowAll({ ...showAll, style: !showAll.style })}>{showAll.style ? t("Less", "Thu gọn") : t("View All", "Xem tất cả")}</button></h4>
                    <div className="style-grid">{list(g.styles, "style").map((s, i) => choice(bi(s.name), i + 4, s.slug === g.style, () => g.setStyle(s.slug), s.thumb))}</div>
                  </>
                )}
                {cfg.angle && (
                  <><h4>{t("View angle", "Góc nhìn")}</h4>
                    <div className="segmented">{meta.angles.map((a) => <button key={a} type="button" className={a === g.angle ? "active" : ""} onClick={() => g.setAngle(a)}>{bi(a)}</button>)}</div></>
                )}
                {cfg.weather && (
                  <><h4>{t("Change Sky Colors to:", "Đổi bầu trời thành:")}</h4>
                    <div className="weather-grid">{meta.weather.map((w, i) => <button key={w} type="button" className={`weather-card ${w === g.weather ? "active" : ""}`} style={{ backgroundImage: `url('${img(i + 3)}')` }} onClick={() => g.setWeather(w)}><span>{bi(w)}</span></button>)}</div></>
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
                    <h4>{t("Material", "Vật liệu")}</h4>
                    <select className="country" value={g.material} onChange={(e) => g.setMaterial(e.target.value)}>{meta.surfaces[g.surface].map((m) => <option key={m} value={m}>{bi(m)}</option>)}</select></>
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

            <h4>{t("Resolution", "Độ phân giải")}</h4>
            <div className="segmented">{[["1k", 1], ["2k", 2], ["4k", 3]].map(([k, c]) => <button key={k} type="button" className={k === g.res ? "active" : ""} onClick={() => g.setRes(k as string)}>{(k as string).toUpperCase()} · {c} credit</button>)}</div>
            {g.err && <p className="helper" style={{ color: "#b3261e" }}>{bi(g.err)}</p>}
            <button className="generate-btn" disabled={!g.file || g.busy} onClick={g.run} style={!g.file || g.busy ? { opacity: 0.5 } : undefined}>
              <Icon n="spark" />{g.busy ? t("Generating… (1–2 min)", "Đang tạo… (1–2 phút)") : g.file ? t("Generate New Designs", "Tạo thiết kế mới") : t("Upload an image first", "Hãy tải ảnh lên trước")}
            </button>
          </div>
        </div>
      </div>

      <section className="module-latest">
        <div className="latest-head"><h2>{t("Latest Designs", "Thiết kế gần đây")}</h2><span className="latest-count">{done.length}</span></div>
        {done.length === 0 ? <p className="helper">{t("No designs yet — generate your first one above.", "Chưa có thiết kế — hãy tạo thiết kế đầu tiên ở trên.")}</p> : (
          <div className="latest-grid">
            {done.slice(0, 12).map((h, i) => (
              <article className="latest-card" key={h.id} style={{ ["--card-index" as any]: i }}>
                <div className="latest-image" style={{ backgroundImage: `url('${h.outputUrl}')` }} />
                <div className="latest-body">
                  <div className="latest-meta">
                    <span><strong>Tool:</strong> {String(h.tool).replace("-", " · ")}</span>
                    {h.params?.styleSlug && <span><strong>Style:</strong> {h.params.styleSlug}</span>}
                    {h.params?.roomType && <span><strong>Room:</strong> {h.params.roomType}</span>}
                  </div>
                  <div className="latest-actions">
                    <a className="latest-action" title="Download" href={h.outputUrl} download={`design-${h.id}.png`}><Icon n="download" /></a>
                    <button className="latest-action" title="Preview" onClick={() => setOpen(h)}><Icon n="eye" /></button>
                    <button className="latest-action" title="Reuse settings" onClick={() => navigate(`/app?tool=${h.tool}&p=${encodeURIComponent(JSON.stringify(h.params ?? {}))}`)}><Icon n="edit" /></button>
                    <button className="latest-action" title={h.public ? "Unpublish" : "Publish"} onClick={() => publish(h)}><Icon n="globe" /></button>
                    <button className="latest-action" title="Delete" onClick={() => del(h.id)}><Icon n="trash" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {open && (
        <div className="modal-backdrop show" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="modal" style={{ maxWidth: 760 }}>
            <button className="close" onClick={() => setOpen(null)} aria-label="Close">×</button>
            <BeforeAfter before={open.inputUrl} after={open.outputUrl} />
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

  const visible = TOOLS.filter((x) => (filter === "all" || x.cat === filter) && (!q || x.name.toLowerCase().includes(q.toLowerCase())));
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
            <span style={{ color: "#fff", fontWeight: 700, letterSpacing: ".08em", fontSize: 17 }}>SOLYC <span style={{ color: "var(--gold)" }}>GEN LABS</span></span>
            <img className="brand-mark" src="/solyc/symbol-gold.svg" alt="" />
          </a>
          <nav className="nav" aria-label="Primary navigation">
            <a className="nav-item active" href="/app" onClick={(e) => { e.preventDefault(); home(); }}><Icon n="grid" className="nav-icon" /><span className="nav-label">Dashboard</span></a>
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
              <label className="search" aria-label="Search tools"><Icon n="search" /><input type="search" placeholder={t("Search AI tools", "Tìm công cụ AI")} value={q} onChange={(e) => setQ(e.target.value)} /></label>
              <button className="bell" aria-label="Language" onClick={() => { const n = lang === "vi" ? "en" : "vi"; setLang(n); setL(n); }} style={{ width: "auto", padding: "0 12px", fontSize: 12 }}>{lang === "vi" ? "VI · EN" : "EN · VI"}</button>
              <div className="profile"><div className="avatar">{initials}</div><div><strong>{me.email}</strong><small>{credits} credits</small></div></div>
              <button className="outline-btn" onClick={logout}>{t("Log out", "Thoát")}</button>
            </header>

            <section className="hero">
              <div><p className="eyebrow">SOLYC Gen Labs / Material Intelligence</p><h1>Design what’s <span>possible.</span></h1><p>{t("Thiết kế những khả thể mới. Chọn một nhóm công cụ bên dưới.", "Thiết kế những khả thể mới. Chọn một nhóm công cụ bên dưới.")}</p></div>
            </section>

            <div className="chips" role="tablist">
              {FILTERS.map(([k, en, vi]) => <button key={k} className={`chip ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{t(en, vi)}</button>)}
            </div>

            <section className="spotlight">
              <div className="spotlight-copy"><p className="eyebrow">Perfect redesign</p><h2>{t("Bring your next space to life with AI.", "Biến không gian tiếp theo của bạn thành hiện thực bằng AI.")}</h2><p>{t("Upload a photo, pick a style and let AI redesign it while keeping your walls, windows and layout.", "Tải ảnh, chọn phong cách và để AI thiết kế lại trong khi giữ nguyên tường, cửa sổ và bố cục.")}</p><button className="primary-btn" onClick={() => open("Perfect Redesign")}>{t("Start Now", "Bắt đầu ngay")} <span>→</span></button></div>
              <div className="spotlight-art"><span className="spotlight-tag">AI Redesign</span></div>
            </section>

            <section id="tools">
              <div className="section-head"><h2>{t("Explore AI tools", "Khám phá công cụ AI")}</h2><span>{visible.length} {t("solutions", "giải pháp")}</span></div>
              <div className="grid">
                {visible.length === 0 && <div className="empty">{t("No tools matched your search.", "Không có công cụ phù hợp.")}</div>}
                {visible.map((x, i) => (
                  <article className="card" key={x.name} style={{ ["--card-index" as any]: i }}>
                    <div className="card-image"><img loading="lazy" src={U(x.photo)} alt={`${x.name} preview`} />{x.popular && <span className="badge">Most Popular</span>}</div>
                    <div className="card-body">
                      <h3>{x.name}</h3><p>{x.desc}</p>
                      <button className={x.spaces ? "" : "locked"} onClick={() => open(x.name)}>{x.spaces ? `${t("Try", "Dùng")} ${x.name}` : t("Coming soon", "Sắp ra mắt")}</button>
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
                  <button className="module-logo" onClick={home} aria-label="Back to dashboard"><img src="/solyc/symbol-gold.svg" alt="SOLYC" /></button>
                </div>
                <div className="module-tool-list">
                  <h4>Tools</h4>
                  {TOOLS.map((x) => (
                    <button key={x.name} className={`module-tool-link ${x.name === active.name ? "active" : ""}`} onClick={() => open(x.name)}>
                      <span className="module-tool-icon"><Icon n={x.icon} /></span><span className="module-tool-label">{x.name}</span>
                    </button>
                  ))}
                </div>
              </aside>
              <section className="module-content">
                <header className="module-head">
                  <div className="module-title-row"><button className="module-back" onClick={home} aria-label="Back to dashboard"><Icon n="back" /></button><h1>{active.name}</h1></div>
                  <div className="module-actions"><span className="nav-user" style={{ alignSelf: "center" }}>{credits} credits</span><button className="outline-btn" onClick={logout}>{t("Log out", "Thoát")}</button></div>
                </header>
                <div className="module-banner"><span className="info"><Icon n="info" /></span><div><h2>{active.name}</h2><p>{active.desc}</p></div></div>
                <div>
                  {active.spaces ? (
                    <Workspace key={active.name + (toolParam ?? "")} tool={active} initialTool={toolParam ?? undefined} preset={preset} onCredits={reload} />
                  ) : (
                    <div className="control-panel" style={{ margin: "30px 0", textAlign: "center" }}>
                      <h3>{t("This tool is coming soon.", "Công cụ này sắp ra mắt.")}</h3>
                      <p className="helper">{t("Try Perfect Redesign, Virtual Staging, Material Swap, Furniture Removal or Sky Colors in the meantime.", "Hiện bạn có thể dùng Perfect Redesign, Virtual Staging, Material Swap, Furniture Removal hoặc Sky Colors.")}</p>
                      <button className="generate-btn" onClick={() => open("Perfect Redesign")}><Icon n="spark" />Perfect Redesign</button>
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
