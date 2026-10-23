import excelStyles from "../../seed/styles.json" with { type: "json" };
import { CITIES, DIRECTIONS, WINDS, exposureText, type Direction } from "./solar.ts";

export type Style = { slug: string; name: string; scope: "interior" | "exterior" | "garden"; prompt: string; img?: string; photo?: string };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Interior styles come only from the Excel file (seed/styles.json).
const interiorTemplate = (name: string, desc: string) =>
  `Redesign this room in a ${name} interior design style, while keeping the exact same room structure, wall layout, windows, ceiling height, and camera angle. Replace the furniture, lighting, rug, and decor with ${desc}. Keep the room proportions and perspective identical to the original photo — only change the furniture and styling.`;

// [name, description, Unsplash photo id for the style thumbnail]
const EXTERIOR: [string, string, string][] = [
  ["Modern", "clean lines, flat or low-slope rooflines, large glass openings, and a palette of white, charcoal and natural wood", "photo-1748063578185-3d68121b11ff"],
  ["Mediterranean", "stucco walls, terracotta tile roof, arched openings, wrought-iron details and warm earthy colors", "photo-1416331108676-a22ccb276e35"],
  ["Farmhouse", "white board-and-batten siding, a metal roof, a covered porch and black window frames", "photo-1662505899914-1000c566477b"],
  ["Craftsman", "low-pitched gables, exposed rafters, tapered porch columns and earthy muted colors", "photo-1625602812206-5ec545ca1231"],
  ["Victorian", "ornate gingerbread trim, steep gables, a wraparound porch and a painted-lady color scheme", "photo-1655961539194-fc970b063bc5"],
  ["Colonial", "symmetrical facade, shuttered windows, a centered door with pediment and brick or clapboard cladding", "photo-1594348352429-159508d48c57"],
  ["Ranch", "a single-storey long low profile, wide eaves, brick and wood siding and a simple covered entry", "photo-1787094535228-b4861050479a"],
  ["Cottage", "a steep storybook roof, stone and shingle details, flower beds and a cozy arched door", "photo-1562182384-08115de5ee97"],
  ["Industrial", "dark steel framing, brick and concrete surfaces, large black-framed windows and a metal roof", "photo-1708113397538-81a27170f0b8"],
  ["Scandinavian", "simple gabled forms, dark or white timber cladding, minimal trim and large windows", "photo-1780592018279-279aa3e91f8f"],
  ["Tropical", "wide overhanging roofs, timber slats, open verandas and lush palm planting", "photo-1721989518229-3e84837fc398"],
  ["Spanish Colonial", "whitewashed stucco, clay barrel tile roof, carved wooden doors and arched colonnade", "photo-1598635031829-4bfae29d33eb"],
  ["Mid-Century Modern", "low horizontal volumes, butterfly or flat roofs, clerestory windows and warm wood with stone accents", "photo-1735987928098-c512af56d1a9"],
  ["Contemporary", "mixed materials of stone, metal and glass, asymmetrical massing and sleek landscape lighting", "photo-1706808849780-7a04fbac83ef"],
  ["Futuristic", "sculptural curved forms, seamless white surfaces, floor-to-ceiling glass and integrated lighting", "photo-1706189311313-5647687be7c6"],
  ["Japanese", "a low hipped tiled roof, dark timber, shoji-style screens and a zen entry garden", "photo-1577790668485-b3e70d84b462"],
  ["Bohemian", "colorful painted accents, layered plants, handmade textures and eclectic outdoor decor", "photo-1738021825259-4f4fbd88aad4"],
  ["Tudor", "half-timbering, steep cross gables, tall chimneys and leaded-glass windows", "photo-1751050743813-03d46859896c"],
  ["Barn-style", "a gambrel or gable roof, vertical board siding, sliding barn doors and a rustic color palette", "photo-1608429835892-30be51ea4d6c"],
  ["Coastal", "weathered shingle siding, white trim, a widow's walk and soft blue accents", "photo-1768585985311-73cf1b78b3d7"],
  ["Desert Modern", "rammed-earth textures, flat roofs, deep overhangs and a sand and rust palette with cacti planting", "photo-1790198576345-f1f1af9d458b"],
  ["Chalet", "a wide low-pitch roof, carved timber balconies and stone base with stacked logs", "photo-1786684937985-65302858505b"],
  ["Art Deco", "stepped geometric massing, vertical fluting, metal detailing and a bold symmetrical entry", "photo-1579625224451-b0ab6ed101f5"],
  ["Brutalist", "raw board-formed concrete, monolithic blocky volumes and deep-set windows", "photo-1591394197887-b27e1ba3b2f9"],
  ["Minimalist", "pure rectangular volumes, smooth white render, hidden gutters and hairline frames", "photo-1756706718604-ef4af3970e33"],
];
const exteriorTemplate = (name: string, desc: string) =>
  `Redesign this house exterior in a ${name} architectural style, keeping the exact same building footprint, overall shape, roof position, window and door placement, and camera angle. Restyle the facade, cladding, roofing, doors, windows, trim and landscaping with ${desc}. Photorealistic architectural photography, same perspective as the original photo.`;

// [name, description, Unsplash photo id for the style thumbnail]
const GARDEN: [string, string, string][] = [
  ["Japanese Zen", "raked gravel, moss, stone lanterns, maples and a small koi pond", "photo-1672758688257-a110c93de407"],
  ["English Cottage", "overflowing perennial borders, climbing roses, winding paths and a rustic bench", "photo-1713656275767-e8140c59acca"],
  ["Modern Minimalist", "clean geometric paving, structured evergreen planting, a linear water feature and ambient lighting", "photo-1782073425027-e099f12e3433"],
  ["Mediterranean", "terracotta pots, olive trees, lavender, gravel paths and a stone pergola", "photo-1770460063079-4849ef1b876e"],
  ["Tropical Oasis", "lush palms, large-leaf foliage, a lagoon-style pool and bamboo screens", "photo-1667842288007-ea49b67ce9cf"],
  ["Desert Xeriscape", "sculptural succulents, agave, boulders and warm decomposed granite", "photo-1527832808532-c838db1b5014"],
  ["Cottage Vegetable", "raised beds, herb borders, fruit trees and a rustic potting area", "photo-1591857177580-dc82b9ac4e1e"],
  ["Outdoor Entertaining", "a built-in seating area, fire pit, string lighting and a dining pergola", "photo-1778869290979-6f09567a0eee"],
  ["Rooftop / Balcony Garden", "container planting, a compact seating nook, privacy screens and fairy lights", "photo-1527690499469-ef2eff9c6735"],
  ["Formal French", "symmetrical clipped hedges, gravel parterres, a central fountain and topiary", "photo-1778154973201-6f38b24aaed3"],
  ["Wildflower Meadow", "naturalistic native grasses and flowers with a mown path", "photo-1592290435338-682c400cb6f8"],
  ["Pool Garden", "a resort-style swimming pool with sun loungers, planting beds and a stone deck", "photo-1657383543368-7d929944be6a"],
];
const gardenTemplate = (name: string, desc: string) =>
  `Redesign this garden in a ${name} style, keeping the exact same house, boundaries, ground layout and camera angle. Replace the planting, paving, furniture and features with ${desc}. Photorealistic landscape photography, same perspective as the original photo.`;

export const STYLES: Style[] = [
  ...(excelStyles as { slug: string; name: string; prompt: string; img?: string }[]).map((s) => ({ ...s, scope: "interior" as const })),
  ...EXTERIOR.map(([n, d, photo]) => ({ slug: `ext-${slugify(n)}`, name: n, scope: "exterior" as const, prompt: exteriorTemplate(n, d), photo })),
  ...GARDEN.map(([n, d, photo]) => ({ slug: `gar-${slugify(n)}`, name: n, scope: "garden" as const, prompt: gardenTemplate(n, d), photo })),
];

export const ROOM_TYPES = [
  "Living room", "Bedroom", "Bathroom", "Kitchen", "Dining room", "Attic", "Study", "Home office", "Family room",
  "Kids room", "Balcony", "Gaming room", "Hallway", "Laundry room", "Basement", "Nursery", "Walk-in closet",
  "Home gym", "Home theater", "Workshop", "Yoga studio", "Wine cellar",
];

export const INTERVENTION = ["very-low", "low", "medium", "high", "extreme"] as const;
export type Intervention = (typeof INTERVENTION)[number];
const INTERVENTION_TEXT: Record<Intervention, string> = {
  "very-low": "Make only very subtle changes: keep almost all existing furniture and layout, just adjust colors, textiles and small decor toward the style.",
  low: "Make light changes: keep the furniture layout, restyle surfaces, textiles, and decor.",
  medium: "Make a balanced redesign: replace most furniture and decor while keeping the same layout logic.",
  high: "Make a strong redesign: replace all furniture, lighting, and decor with entirely new pieces and rearrange freely.",
  extreme: "Make a complete transformation of the furnishings and finishes, with bold and dramatic design choices.",
};

export const SURFACES: Record<string, string[]> = {
  floor: ["Oak hardwood", "Walnut hardwood", "Herringbone parquet", "Polished concrete", "Porcelain tile", "Marble", "Terrazzo", "Natural stone", "Luxury vinyl plank"],
  walls: ["Warm white paint", "Sage green paint", "Navy paint", "Limewash plaster", "Exposed brick", "Wood paneling", "Wallpaper", "Zellige tile", "Microcement"],
  countertops: ["White quartz", "Carrara marble", "Black granite", "Butcher block", "Concrete", "Soapstone", "Terrazzo"],
  cabinets: ["White shaker", "Walnut slab", "Matte black", "Sage green", "Navy blue", "Natural oak", "Two-tone"],
  ceiling: ["White painted", "Wood plank", "Exposed beams", "Coffered", "Shiplap", "Tin tile"],
};
export const PAINT_COLORS: { name: string; hex: string }[] = [
  { name: "Warm white", hex: "#F2EDE4" }, { name: "Soft greige", hex: "#CFC6B8" }, { name: "Sage green", hex: "#A8B5A0" },
  { name: "Dusty blue", hex: "#8FA3B5" }, { name: "Navy", hex: "#2E3A55" }, { name: "Terracotta", hex: "#C46A4A" },
  { name: "Charcoal", hex: "#3C3F42" }, { name: "Blush pink", hex: "#E6C3C0" }, { name: "Olive", hex: "#7A7A4E" },
  { name: "Butter yellow", hex: "#EFD9A0" }, { name: "Forest green", hex: "#2F4A3A" }, { name: "Soft black", hex: "#1E1E1E" },
];
export const PAINT_FINISHES = ["matte", "eggshell", "satin", "gloss"] as const;
export const WEATHER = ["Golden hour", "Clear blue sky", "Sunset glow", "Overcast", "Twilight", "Fresh snow", "Misty morning", "Dramatic storm clouds"];
export const REMOVE = ["furniture", "clutter", "people", "everything (empty room)"];
export const ANGLES = ["front", "side", "back"];
/** Camera views for turning a 2D floor plan into a 3D render. */
export const PLAN_VIEWS = ["isometric", "top-down"] as const;
const PLAN_VIEW_TEXT: Record<(typeof PLAN_VIEWS)[number], string> = {
  isometric: "Show it like a photograph of a roofless architectural scale model taken diagonally from outside one corner, with the camera only about 30 degrees above the ground, in true 3D perspective. The outer and inner wall faces (cut at about 1.2 m height) and the height of the furniture are clearly visible.",
  "top-down": "Show it like a photograph taken from a drone directly above a roofless home, with the walls extruded with realistic thickness and soft shadows, so the layout reads exactly like the plan.",
};

export const TOOL_IDS = [
  "interior-redesign", "interior-staging", "interior-declutter", "interior-sketch", "interior-material",
  "interior-paint", "interior-floor", "interior-transfer", "interior-text", "interior-floorplan", "interior-compose", "interior-critique", "interior-finder", "interior-video", "exterior-orient", "exterior-orient-render",
  "exterior-redesign", "exterior-sky", "exterior-sketch", "exterior-paint", "exterior-text", "garden-redesign", "garden-text",
] as const;
export type ToolId = (typeof TOOL_IDS)[number];
/** Tools that take a second, style-reference image after the main photo. */
export const REFERENCE_TOOLS: readonly ToolId[] = ["interior-transfer"];
/** Tools that take 1–MAX_ITEMS item photos (furniture, decor) after the main photo. */
export const ITEM_TOOLS: readonly ToolId[] = ["interior-compose"];
export const MAX_ITEMS = 3;
/** Image-to-video tools (Veo 3.1 Fast on RunningHub, 8 s, 720p, with audio); a clip costs VIDEO_COST credits. */
export const VIDEO_TOOLS: readonly ToolId[] = ["interior-video"];
export const VIDEO_COST = 5;
export const MOTIONS = ["push-in", "pan", "orbit", "reveal"] as const;
const MOTION_TEXT: Record<(typeof MOTIONS)[number], string> = {
  "push-in": "a slow, steady dolly push-in toward the center of the space",
  pan: "a slow horizontal pan from left to right",
  orbit: "a gentle arc around the main furniture group",
  reveal: "a slow pull-back that reveals the whole space",
};
/** Tools answered by the LLM with structured text (a critique, a furniture list) instead of an image. */
export const CRITIQUE_TOOLS: readonly ToolId[] = ["interior-critique", "interior-finder", "exterior-orient"];
export const CRITIQUE_MODEL = "google/gemini-3.8-flash";

/** Business 3D Floorplan: the LLM lists the rooms on a plan, then each room is rendered as its own generation. */
export const BIZPLAN_TOOL = "interior-bizplan";
export const MAX_PLAN_ROOMS = 8;
export const PLAN_DETECT_PROMPT = [
  "This image is a 2D floor plan of a home. List every space a buyer would want to see as a photo: living areas, kitchen, dining, bedrooms, bathrooms, study and large balconies. Skip closets, corridors, shafts and storage.",
  `Return at most ${MAX_PLAN_ROOMS} spaces. For each give: "name" (as labelled on the plan, or a clear name such as "Bedroom 2"), and "view": one or two English sentences that let an artist render an eye-level photo of that space from the plan: where it sits on the plan, its shape, which walls have windows or doors, and built-in fixtures (kitchen units, bath, shower).`,
  'Also give "home": a short English description of the whole home (for example "two-bedroom apartment with an open-plan living and kitchen area").',
  'Reply with JSON only: {"home": string, "rooms": [{"name": string, "view": string}]}.',
].join("\n");
export type PlanRoom = { name: string; view: string };
/** Bound the LLM's room list (or a client-edited one) to safe, short values. */
export function cleanRooms(v: unknown): PlanRoom[] {
  return (Array.isArray(v) ? v : []).slice(0, MAX_PLAN_ROOMS)
    .map((r: any) => ({ name: String(r?.name ?? "").trim().slice(0, 40), view: String(r?.view ?? "").trim().slice(0, 400) }))
    .filter((r) => r.name);
}
export function planRoomPrompt(styleSlug: unknown, room: PlanRoom, home: string) {
  const s = styleFor(styleSlug, "interior");
  return [
    `This image is the floor plan of a home${home ? ` (${home})` : ""}. Render a photorealistic eye-level interior photograph of one space from it: the ${room.name}.`,
    room.view && `About this space: ${room.view}`,
    "Keep its shape, proportions, windows and doors as the plan shows them, and furnish it for its purpose at realistic scale.",
    `The whole home shares one consistent ${s.name} interior design: the same flooring, wall color, wood tone, metal finish and lighting style in every room.`,
    "Wide-angle professional interior photography, natural daylight, no people, no text, no plan lines.",
  ].filter(Boolean).join(" ");
}

/** Design Advisor is a chat, not a generation: it has its own endpoint and transcript. */
export const ADVISOR_TOOL = "interior-advisor";
export const ADVISOR_MODEL = "google/gemini-3.8-flash";
export const MAX_ADVISOR_TURNS = 20;
export const BUDGETS = ["Under $500", "$500–2,000", "$2,000–10,000", "$10,000+"] as const;

/** System prompt for the advisor; context comes from the options the client picked. */
export function advisorSystem(p: { lang?: string; roomType?: string; budget?: string; hasPhoto?: boolean }) {
  const vi = p.lang === "vi";
  const context = [
    ROOM_TYPES.includes(p.roomType as any) && `room type: ${String(p.roomType).toLowerCase()}`,
    BUDGETS.includes(p.budget as any) && `total budget: ${p.budget} (USD)`,
    p.hasPhoto && "the client attached a photo of the space in their first message",
  ].filter(Boolean).join("; ");
  return [
    "You are the RoomCraft design advisor, an experienced residential interior designer who helps clients plan real projects: style direction, layout, color palettes, materials, furniture, lighting, priorities and how to split a budget.",
    context && `What the client told us up front: ${context}.`,
    "Tailor every answer to their space, budget and constraints. If something essential is missing (how they use the room, rough size, budget, styles they like), ask at most two short questions before giving detailed advice.",
    "Be concrete: name specific pieces, materials and colors, and give approximate prices when money comes up, splitting a budget into line items. Be honest about trade-offs.",
    "When a photo was shared, refer to what is actually visible in it.",
    "When it helps, suggest one RoomCraft tool the client can try next: Perfect Redesign, Virtual Staging, Material Swap, Paint Visualizer, Floor Editor, Room Composer, 3D Floorplan or Design Critique.",
    "Only help with interior, exterior and garden design and home renovation; politely decline anything else.",
    "Keep each reply under about 180 words, in plain text with short paragraphs and lines starting with \"- \" for lists. No markdown headings, bold or tables.",
    vi ? "Reply in Vietnamese and give prices in VND (convert the budget at about 25,000 VND per USD)." : "Reply in English and give prices in USD unless the client uses another currency.",
  ].filter(Boolean).join("\n");
}
export type Critique = {
  room: string; style: string; score: number; summary: string; strengths: string[];
  improvements: { area: string; issue: string; suggestion: string; priority: "high" | "medium" | "low" }[]; quickWins: string[];
};
/** Coerce the LLM's JSON into a safe, bounded Critique (it may skip or mistype fields). */
export function cleanCritique(r: any): Critique {
  const str = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const list = (v: unknown, max: number): any[] => (Array.isArray(v) ? v.slice(0, max) : []);
  const score = Number(r?.score);
  const c: Critique = {
    room: str(r?.room, 60), style: str(r?.style, 60),
    score: Number.isFinite(score) ? Math.min(10, Math.max(1, Math.round(score * 10) / 10)) : 0,
    summary: str(r?.summary, 800),
    strengths: list(r?.strengths, 4).map((x) => str(x, 300)).filter(Boolean),
    improvements: list(r?.improvements, 5)
      .map((x) => ({ area: str(x?.area, 60), issue: str(x?.issue, 300), suggestion: str(x?.suggestion, 400), priority: (["high", "medium", "low"].includes(x?.priority) ? x.priority : "medium") as Critique["improvements"][number]["priority"] }))
      .filter((x) => x.suggestion),
    quickWins: list(r?.quickWins, 3).map((x) => str(x, 300)).filter(Boolean),
  };
  if (!c.summary || !c.improvements.length) throw new Error("The AI returned an incomplete critique · AI trả về nhận xét chưa đầy đủ");
  return c;
}

export const FINDER_CATEGORIES = ["sofa", "chair", "table", "bed", "storage", "lighting", "rug", "textile", "decor", "plant", "other"] as const;
export type FoundItem = { name: string; category: (typeof FINDER_CATEGORIES)[number]; description: string; query: string; localQuery: string; priceRange: string; box?: [number, number, number, number] };
/** Coerce the LLM's furniture list into bounded items; boxes are [ymin, xmin, ymax, xmax] on a 0–1000 grid. */
export function cleanFinder(r: any): { items: FoundItem[] } {
  const str = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const items = (Array.isArray(r?.items) ? r.items.slice(0, 8) : []).map((x: any): FoundItem => {
    const box = Array.isArray(x?.box) && x.box.length === 4 && x.box.every((n: unknown) => Number.isFinite(Number(n))) ? x.box.map((n: unknown) => Math.min(1000, Math.max(0, Math.round(Number(n))))) as FoundItem["box"] : undefined;
    const query = str(x?.query, 120);
    return { name: str(x?.name, 60), category: (FINDER_CATEGORIES as readonly string[]).includes(x?.category) ? x.category : "other", description: str(x?.description, 300), query, localQuery: str(x?.localQuery, 120) || query, priceRange: str(x?.priceRange, 60), box };
  }).filter((x: FoundItem) => x.name && x.query);
  if (!items.length) throw new Error("No furniture found in this photo · Không tìm thấy đồ nội thất nào trong ảnh");
  return { items };
}
/** Validate the LLM's JSON for a structured-text tool. */
export type OrientResult = {
  summary: string;
  sides: { side: string; direction: Direction; rating: "good" | "mixed" | "harsh"; sun: string; wind: string; impact: string }[];
  recommendations: { area: string; suggestion: string; why: string; priority: "high" | "medium" | "low" }[];
  roomNotes: string[]; renderBrief: string;
};
/** Bound the orientation analysis; renderBrief is kept server-side to drive the illustration. */
export function cleanOrient(r: any): OrientResult {
  const str = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const list = (v: unknown, max: number): any[] => (Array.isArray(v) ? v.slice(0, max) : []);
  const o: OrientResult = {
    summary: str(r?.summary, 800),
    sides: list(r?.sides, 4).map((x) => ({
      side: str(x?.side, 40), direction: (DIRECTIONS as readonly string[]).includes(x?.direction) ? x.direction : "N",
      rating: ["good", "mixed", "harsh"].includes(x?.rating) ? x.rating : "mixed", sun: str(x?.sun, 300), wind: str(x?.wind, 300), impact: str(x?.impact, 400),
    })),
    recommendations: list(r?.recommendations, 7).map((x) => ({ area: str(x?.area, 60), suggestion: str(x?.suggestion, 400), why: str(x?.why, 300), priority: ["high", "medium", "low"].includes(x?.priority) ? x.priority : "medium" })).filter((x) => x.suggestion),
    roomNotes: list(r?.roomNotes, 6).map((x) => str(x, 300)).filter(Boolean),
    renderBrief: str(r?.renderBrief, 600),
  };
  if (!o.summary || !o.recommendations.length) throw new Error("The AI returned an incomplete analysis · AI trả về phân tích chưa đầy đủ");
  return o;
}
export const cleanLlmResult = (tool: string, raw: unknown) => (tool === "interior-finder" ? cleanFinder(raw) : tool === "exterior-orient" ? cleanOrient(raw) : cleanCritique(raw));
export const PLAN_KINDS = ["plan", "facade"] as const;
/** Side names for the prompt; a street photo is read from outside, so its left/right are mirrored vs. the plan convention. */
const facadeLabels = { front: "front (the facade in the photo)", right: "side on the LEFT of the photo", back: "back", left: "side on the RIGHT of the photo" };
/** Tools that generate from a text description alone (no input photo). */
export const TEXT_TOOLS: readonly ToolId[] = ["interior-text", "exterior-text", "garden-text"];

const STRUCTURE_LOCK =
  "Keep the exact same room structure, wall layout, windows, doors, ceiling height, and camera angle. Keep the room proportions and perspective identical to the original photo. Photorealistic, high quality interior photography.";
const EXT_LOCK = "Keep the exact same building structure and camera angle. Photorealistic architectural photography.";

function styleFor(slug: unknown, scope: Style["scope"]) {
  const s = STYLES.find((x) => x.slug === slug && x.scope === scope);
  if (!s) throw new Error("Style not found · Style không tồn tại");
  return s;
}
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | undefined => list.find((x) => x === v);
const custom = (p: any) => {
  const c = String(p.custom ?? "").trim().slice(0, 500);
  return c ? `Additional instructions: ${c}` : "";
};
/** A preset color name, or a custom "#RRGGBB" hex. */
function paintColor(v: unknown) {
  const preset = PAINT_COLORS.find((c) => c.name === v);
  if (preset) return `${preset.name.toLowerCase()} (${preset.hex})`;
  if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) return `the exact color ${v.toUpperCase()}`;
  throw new Error("Pick a paint color · Chọn màu sơn");
}
function description(p: any) {
  const d = String(p.description ?? "").trim().slice(0, 1000).replace(/[.\s]+$/, "");
  if (d.length < 10) throw new Error("Describe the space in a few words (10+ characters) · Hãy mô tả không gian (ít nhất 10 ký tự)");
  return d;
}
/** Style is optional for text-to-design; when given it must match the tool's scope. */
const optionalStyle = (p: any, scope: Style["scope"]) => (p.styleSlug ? `Design style: ${styleFor(p.styleSlug, scope).name}.` : "");
const finish = (p: any) => oneOf(PAINT_FINISHES, p.finish) ?? "matte";
const room = (p: any) => (ROOM_TYPES.includes(p.roomType) ? `The room is a ${String(p.roomType).toLowerCase()}.` : "");

export function buildPrompt(tool: string, p: any): string {
  const join = (...a: string[]) => a.filter(Boolean).join(" ");
  switch (tool as ToolId) {
    case "interior-redesign":
      return join(styleFor(p.styleSlug, "interior").prompt, room(p), INTERVENTION_TEXT[oneOf(INTERVENTION, p.intervention) ?? "medium"], custom(p), STRUCTURE_LOCK);
    case "interior-staging": {
      const s = styleFor(p.styleSlug, "interior");
      return join(
        "Virtually stage this empty room: add realistic, well-proportioned furniture, rug, lighting, art and decor so it looks ready to sell or rent.",
        `Furnish it in the following style — ${s.name}.`, room(p),
        "Do not change the walls, floor, windows, doors or ceiling. Only add furnishings and decor.", custom(p), STRUCTURE_LOCK);
    }
    case "interior-declutter": {
      const sel = Array.isArray(p.remove) ? REMOVE.filter((r) => p.remove.includes(r)) : [];
      if (!sel.length) throw new Error("Pick at least one thing to remove · Chọn ít nhất một thứ cần xoá");
      const what = sel.includes("everything (empty room)")
        ? "Remove all furniture, objects, decor and people so the room is completely empty, showing clean bare walls and floors."
        : `Remove all ${sel.join(", ").replace(/, ([^,]*)$/, " and $1")} from this room, and realistically fill in the walls and floors behind them.`;
      return join(what, "Keep everything else untouched.", custom(p), STRUCTURE_LOCK);
    }
    case "interior-sketch": {
      const s = styleFor(p.styleSlug, "interior");
      return join(
        `Transform this sketch or drawing of a room into a photorealistic interior photograph in a ${s.name} style.`, room(p),
        "Strictly retain the layout, proportions, perspective and placement of every element in the sketch.", custom(p), "High quality interior photography.");
    }
    case "interior-material": {
      const surface = oneOf(Object.keys(SURFACES), p.surface);
      if (!surface) throw new Error("Pick a surface to change · Chọn bề mặt cần đổi");
      if (!SURFACES[surface].includes(p.material)) throw new Error("Invalid material · Vật liệu không hợp lệ");
      return join(
        `Replace only the ${surface === "walls" ? "wall finish" : surface} in this room with ${p.material}.`,
        "Keep all furniture, objects, lighting and every other surface unchanged. Match the original lighting, reflections and perspective.", custom(p), STRUCTURE_LOCK);
    }
    case "interior-paint":
      return join(
        `Repaint only the walls of this room in ${paintColor(p.color)}. Paint finish: ${finish(p)}.`,
        "Keep the ceiling, trim, doors, floor, furniture, artwork and every object unchanged. Preserve the original lighting, shadows and wall texture so the new color looks naturally lit.", custom(p), STRUCTURE_LOCK);
    case "interior-floor": {
      if (!SURFACES.floor.includes(p.material)) throw new Error("Invalid material · Vật liệu không hợp lệ");
      return join(
        `Replace only the flooring in this room with ${p.material}, laid naturally across the whole visible floor with correct perspective, scale and seams.`,
        "Keep all furniture, rugs, walls, skirting and objects unchanged, and keep furniture legs resting realistically on the new floor. Match the original lighting and reflections.", custom(p), STRUCTURE_LOCK);
    }
    case "interior-transfer":
      return join(
        "You are given two images. The first image is the client's room. The second image is a style reference.",
        "Redesign the room in the first image so it adopts the interior design style of the reference: its color palette, materials and finishes, furniture style, lighting mood and decor.",
        "Do not copy the reference room's layout or architecture, and do not paste objects from it verbatim — reinterpret its style for the first room.", room(p),
        INTERVENTION_TEXT[oneOf(INTERVENTION, p.intervention) ?? "medium"], custom(p), STRUCTURE_LOCK);
    case "interior-text":
      return join(
        `A photorealistic interior design photograph of ${description(p)}.`, room(p), optionalStyle(p, "interior"), custom(p),
        "Professional interior photography, natural daylight, realistic materials and proportions, eye-level wide-angle shot, no people, no text.");
    case "interior-compose": {
      const n = Array.isArray(p.itemKeys) ? p.itemKeys.length : 0;
      if (n < 1 || n > MAX_ITEMS) throw new Error(`Add 1–${MAX_ITEMS} item photos · Thêm 1–${MAX_ITEMS} ảnh đồ vật`);
      return join(
        `You are given ${n + 1} images. The first image is the client's room. ${n === 1 ? "The second image shows one furniture or decor item" : `Images 2 to ${n + 1} each show one furniture or decor item`} that the client wants in this room.`,
        `Place ${n === 1 ? "the item" : "every item"} into the room at a natural position for its function, at realistic scale, with the room's perspective, lighting and soft contact shadows.`,
        "Keep each item's exact design: shape, proportions, color, material and details. Ignore the backgrounds of the item photos.",
        "Move or remove existing furniture only where needed to make space, and keep the room looking styled and cohesive.", room(p), custom(p), STRUCTURE_LOCK);
    }
    case "exterior-orient": {
      const city = CITIES.find((c) => c.name === p.city);
      const facing = oneOf(DIRECTIONS, p.facing);
      if (!city || !facing) throw new Error("Pick the direction and the city · Chọn hướng và thành phố");
      const plan = p.kind !== "facade";
      const vi = p.lang === "vi";
      return [
        "You are a climate-responsive architect working in Vietnam.",
        plan
          ? `The image is a 2D floor plan. Its TOP edge faces ${facing}: the top edge is the "front side", the right edge the "right side", the bottom edge the "back side" and the left edge the "left side".`
          : `The image is a street photo of the home's main facade, which faces ${facing}.`,
        `Location: ${city.name}, latitude ${city.lat}°N. Computed direct sun on each side (accurate, use these numbers and do not contradict them):`,
        exposureText(city.lat, facing, plan ? {} : facadeLabels),
        `Prevailing winds: ${WINDS[city.region]}`,
        `Assess how sun and wind affect each side${plan ? " and the rooms along it (read the room labels)" : ""}: overheating and glare from low afternoon sun, pleasant morning light, cross-ventilation, hot dry winds, cold or rain-driven winds.`,
        `Then give concrete recommendations that respond to this orientation: shading (vertical fins, louvres, deep eaves, balconies), the size and type of glazing, wall insulation and color, greenery (trees, green walls, climbing plants), ventilation openings, materials${plan ? ", and moving or swapping rooms" : ""}. Rank them by impact and refer to specific windows, walls${plan ? " and rooms" : ""} you can see.`,
        custom(p) && `Client's goals or constraints: ${String(p.custom).trim().slice(0, 500)}`,
        `Write every text value in ${vi ? "Vietnamese" : "English"}, except renderBrief which is always English.`,
        `Reply with JSON only: {"summary": string (2–3 sentences), "sides": [{"side": string (as named above), "direction": one of ${DIRECTIONS.join(", ")}, "rating": "good" | "mixed" | "harsh", "sun": string, "wind": string, "impact": string}] (the 4 sides), "recommendations": [{"area": string, "suggestion": string, "why": string, "priority": "high" | "medium" | "low"}] (4–7, most important first), "roomNotes": string[] (${plan ? "which rooms are affected and what to change" : "empty array"}), "renderBrief": string (2–3 English sentences listing the visible exterior changes an illustration should show, e.g. vertical timber fins over the west windows, smaller west glazing, a green wall, a shade tree at the southwest corner)}.`,
      ].filter(Boolean).join("\n");
    }
    case "exterior-orient-render": {
      // p.brief / p.kind / p.facing are filled in by the server from the stored analysis, never by the client.
      const brief = String(p.brief ?? "").trim();
      if (!brief) throw new Error("Run the orientation analysis first · Hãy phân tích hướng trước");
      return p.kind === "facade"
        ? join("Edit this photo of the house to show a climate-responsive upgrade. Apply exactly these visible changes:", brief,
          "Keep the building's shape, size, roof, camera angle and surroundings. Photorealistic architectural photography in daylight.")
        // A plan may be an apartment, so show the plan itself in 3D (roofless cutaway) with the features at its outer walls.
        : join("This image is a 2D floor plan. Render it as a photorealistic roofless 3D cutaway seen from an elevated 45-degree angle, furnished, with the same rooms, walls, doors and windows exactly where the plan shows them.",
          "At the outer walls and windows, show these climate-responsive features:", brief,
          "The result contains no text, labels or dimension lines. Architectural visualization in soft daylight.");
    }
    case "interior-video":
      return join(
        "Animate this photo of a room, home or garden into a smooth, cinematic 8-second real-estate video.",
        `Camera movement: ${MOTION_TEXT[oneOf(MOTIONS, p.motion) ?? "push-in"]}.`,
        "Keep every wall, window, piece of furniture, plant, material and color exactly as in the photo; nothing appears, disappears or deforms.",
        "Natural light with subtle life (moving sunlight, curtains or leaves stirring). No people, no text, no logos. Soft ambient room tone, no music, no speech.", custom(p));
    case "interior-finder": {
      const vi = p.lang === "vi";
      return join(
        "You are a furniture sourcing assistant. Identify the distinct furniture, lighting, rugs, textiles and decor pieces visible in this room photo, so the client can buy similar ones.",
        "List at most 8 items, the largest and most important first. Skip walls, floors, windows, doors and other built-in architecture.",
        `For each item give: "name" (short, in ${vi ? "Vietnamese" : "English"}); "category" (one of ${FINDER_CATEGORIES.join(", ")}); "description" (color, material, shape and style, in ${vi ? "Vietnamese" : "English"}); "query" (an English online shopping search of 4–8 words that finds a similar product, e.g. "cognac leather 3 seater sofa mid century"); "localQuery" (${vi ? "the same search in Vietnamese" : "the same as query"}); "priceRange" (a typical retail price range ${vi ? "in VND" : "in USD"}); "box" ([ymin, xmin, ymax, xmax] of the item on a 0–1000 grid of the image).`,
        'Reply with JSON only: {"items": [...]}.',
      );
    }
    case "interior-critique": {
      const vi = p.lang === "vi";
      return join(
        "You are a senior interior designer reviewing a client's photo of their room. Give an honest, specific critique of the design you can see.",
        room(p) && `The client says: ${room(p)}`,
        "Judge layout and flow, lighting, color palette, materials and textures, furniture scale and proportion, styling and decor, and how well the room works for daily life.",
        "Only comment on what is visible in the photo; refer to concrete objects (\"the leather sofa\", \"the gallery wall\"), never generic advice. Do not invent things that are not there.",
        custom(p) && `Client's goals or constraints to take into account: ${String(p.custom).trim().slice(0, 500)}`,
        `Write every text value in ${vi ? "Vietnamese" : "English"}.`,
        'Reply with JSON only, in exactly this shape: {"room": string, "style": string (the style the room currently reads as), "score": number from 1 to 10 with one decimal, "summary": string (2–3 sentences), "strengths": string[] (2–4 items), "improvements": [{"area": string, "issue": string, "suggestion": string, "priority": "high" | "medium" | "low"}] (3–5 items, most important first), "quickWins": string[] (2–3 low-cost changes the client can make this week)}.',
      );
    }
    case "interior-floorplan": {
      const s = styleFor(p.styleSlug, "interior");
      return join(
        `This image is a 2D architectural floor plan. Turn it into a photorealistic 3D rendering of the same floor plan, furnished in a ${s.name} interior style.`,
        "The result is a picture of a real furnished home, not a drawing. Words on the plan only tell you what each room is for and are never drawn: every floor shows only real flooring, rugs and furniture, with no writing, numbers, dimension lines or symbols.",
        PLAN_VIEW_TEXT[oneOf(PLAN_VIEWS, p.view) ?? "isometric"],
        "Follow the plan exactly: the same outline, the same rooms in the same positions and proportions, and every wall, door opening and window where the plan shows it. Do not add, remove, merge or resize rooms.",
        "Furnish each room for its purpose as shown by its label or fixtures (beds in bedrooms, sofa and coffee table in the living room, kitchen units, bathroom fixtures) at realistic scale, with matching floor materials per room.",
        "Soft natural daylight, realistic materials, plain light background around the building, high quality architectural visualization.", custom(p),
        "Final check: the image contains no text of any kind.");
    }
    case "exterior-text":
      return join(
        `A photorealistic architectural photograph of a house exterior: ${description(p)}.`, optionalStyle(p, "exterior"), custom(p),
        "Professional architectural photography, realistic materials and landscaping, clear sky, eye-level shot, no people, no text.");
    case "garden-text":
      return join(
        `A photorealistic landscape design photograph of a garden: ${description(p)}.`, optionalStyle(p, "garden"), custom(p),
        "Professional landscape photography, natural light, realistic planting and hardscape, no people, no text.");
    case "exterior-paint":
      return join(
        `Repaint only the exterior wall surfaces of this house in ${paintColor(p.color)}. Paint finish: ${finish(p)}.`,
        "Keep the roof, windows, doors, trim, stone or brick details, landscaping and sky unchanged. Preserve the original sunlight and shadows on the facade.", custom(p), EXT_LOCK);
    case "exterior-redesign": {
      const s = styleFor(p.styleSlug, "exterior");
      const a = oneOf(ANGLES, p.angle);
      return join(s.prompt, a ? `This photo shows the ${a} of the house.` : "", custom(p), EXT_LOCK);
    }
    case "exterior-sky": {
      const w = WEATHER.find((x) => x === p.weather);
      if (!w) throw new Error("Pick a weather option · Chọn thời tiết");
      return join(`Replace only the sky and lighting of this exterior photo with ${w.toLowerCase()} conditions, adjusting shadows, reflections and ambient light on the building and surroundings to match.`, "Do not change the building or landscaping.", custom(p), EXT_LOCK);
    }
    case "exterior-sketch": {
      const s = styleFor(p.styleSlug, "exterior");
      return join(`Transform this sketch of a building into a photorealistic exterior photograph in a ${s.name} architectural style.`, "Strictly retain the shape, proportions and perspective of the sketch.", custom(p), "High quality architectural photography.");
    }
    case "garden-redesign":
      return join(styleFor(p.styleSlug, "garden").prompt, custom(p));
    default:
      throw new Error("Invalid tool · Tool không hợp lệ");
  }
}
