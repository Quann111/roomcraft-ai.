import excelStyles from "../../seed/styles.json" with { type: "json" };

export type Style = { slug: string; name: string; scope: "interior" | "exterior" | "garden"; prompt: string; img?: string };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Interior styles come only from the Excel file (seed/styles.json).
const interiorTemplate = (name: string, desc: string) =>
  `Redesign this room in a ${name} interior design style, while keeping the exact same room structure, wall layout, windows, ceiling height, and camera angle. Replace the furniture, lighting, rug, and decor with ${desc}. Keep the room proportions and perspective identical to the original photo — only change the furniture and styling.`;

const EXTERIOR: [string, string][] = [
  ["Modern", "clean lines, flat or low-slope rooflines, large glass openings, and a palette of white, charcoal and natural wood"],
  ["Mediterranean", "stucco walls, terracotta tile roof, arched openings, wrought-iron details and warm earthy colors"],
  ["Farmhouse", "white board-and-batten siding, a metal roof, a covered porch and black window frames"],
  ["Craftsman", "low-pitched gables, exposed rafters, tapered porch columns and earthy muted colors"],
  ["Victorian", "ornate gingerbread trim, steep gables, a wraparound porch and a painted-lady color scheme"],
  ["Colonial", "symmetrical facade, shuttered windows, a centered door with pediment and brick or clapboard cladding"],
  ["Ranch", "a single-storey long low profile, wide eaves, brick and wood siding and a simple covered entry"],
  ["Cottage", "a steep storybook roof, stone and shingle details, flower beds and a cozy arched door"],
  ["Industrial", "dark steel framing, brick and concrete surfaces, large black-framed windows and a metal roof"],
  ["Scandinavian", "simple gabled forms, dark or white timber cladding, minimal trim and large windows"],
  ["Tropical", "wide overhanging roofs, timber slats, open verandas and lush palm planting"],
  ["Spanish Colonial", "whitewashed stucco, clay barrel tile roof, carved wooden doors and arched colonnade"],
  ["Mid-Century Modern", "low horizontal volumes, butterfly or flat roofs, clerestory windows and warm wood with stone accents"],
  ["Contemporary", "mixed materials of stone, metal and glass, asymmetrical massing and sleek landscape lighting"],
  ["Futuristic", "sculptural curved forms, seamless white surfaces, floor-to-ceiling glass and integrated lighting"],
  ["Japanese", "a low hipped tiled roof, dark timber, shoji-style screens and a zen entry garden"],
  ["Bohemian", "colorful painted accents, layered plants, handmade textures and eclectic outdoor decor"],
  ["Tudor", "half-timbering, steep cross gables, tall chimneys and leaded-glass windows"],
  ["Barn-style", "a gambrel or gable roof, vertical board siding, sliding barn doors and a rustic color palette"],
  ["Coastal", "weathered shingle siding, white trim, a widow's walk and soft blue accents"],
  ["Desert Modern", "rammed-earth textures, flat roofs, deep overhangs and a sand and rust palette with cacti planting"],
  ["Chalet", "a wide low-pitch roof, carved timber balconies and stone base with stacked logs"],
  ["Art Deco", "stepped geometric massing, vertical fluting, metal detailing and a bold symmetrical entry"],
  ["Brutalist", "raw board-formed concrete, monolithic blocky volumes and deep-set windows"],
  ["Minimalist", "pure rectangular volumes, smooth white render, hidden gutters and hairline frames"],
];
const exteriorTemplate = (name: string, desc: string) =>
  `Redesign this house exterior in a ${name} architectural style, keeping the exact same building footprint, overall shape, roof position, window and door placement, and camera angle. Restyle the facade, cladding, roofing, doors, windows, trim and landscaping with ${desc}. Photorealistic architectural photography, same perspective as the original photo.`;

const GARDEN: [string, string][] = [
  ["Japanese Zen", "raked gravel, moss, stone lanterns, maples and a small koi pond"],
  ["English Cottage", "overflowing perennial borders, climbing roses, winding paths and a rustic bench"],
  ["Modern Minimalist", "clean geometric paving, structured evergreen planting, a linear water feature and ambient lighting"],
  ["Mediterranean", "terracotta pots, olive trees, lavender, gravel paths and a stone pergola"],
  ["Tropical Oasis", "lush palms, large-leaf foliage, a lagoon-style pool and bamboo screens"],
  ["Desert Xeriscape", "sculptural succulents, agave, boulders and warm decomposed granite"],
  ["Cottage Vegetable", "raised beds, herb borders, fruit trees and a rustic potting area"],
  ["Outdoor Entertaining", "a built-in seating area, fire pit, string lighting and a dining pergola"],
  ["Rooftop / Balcony Garden", "container planting, a compact seating nook, privacy screens and fairy lights"],
  ["Formal French", "symmetrical clipped hedges, gravel parterres, a central fountain and topiary"],
  ["Wildflower Meadow", "naturalistic native grasses and flowers with a mown path"],
  ["Pool Garden", "a resort-style swimming pool with sun loungers, planting beds and a stone deck"],
];
const gardenTemplate = (name: string, desc: string) =>
  `Redesign this garden in a ${name} style, keeping the exact same house, boundaries, ground layout and camera angle. Replace the planting, paving, furniture and features with ${desc}. Photorealistic landscape photography, same perspective as the original photo.`;

export const STYLES: Style[] = [
  ...(excelStyles as { slug: string; name: string; prompt: string; img?: string }[]).map((s) => ({ ...s, scope: "interior" as const })),
  ...EXTERIOR.map(([n, d]) => ({ slug: `ext-${slugify(n)}`, name: n, scope: "exterior" as const, prompt: exteriorTemplate(n, d) })),
  ...GARDEN.map(([n, d]) => ({ slug: `gar-${slugify(n)}`, name: n, scope: "garden" as const, prompt: gardenTemplate(n, d) })),
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

export const TOOL_IDS = [
  "interior-redesign", "interior-staging", "interior-declutter", "interior-sketch", "interior-material",
  "interior-paint", "interior-floor",
  "exterior-redesign", "exterior-sky", "exterior-sketch", "exterior-paint", "garden-redesign",
] as const;
export type ToolId = (typeof TOOL_IDS)[number];

const STRUCTURE_LOCK =
  "Keep the exact same room structure, wall layout, windows, doors, ceiling height, and camera angle. Keep the room proportions and perspective identical to the original photo. Photorealistic, high quality interior photography.";
const EXT_LOCK = "Keep the exact same building structure and camera angle. Photorealistic architectural photography.";

function styleFor(slug: unknown, scope: Style["scope"]) {
  const s = STYLES.find((x) => x.slug === slug && x.scope === scope);
  if (!s) throw new Error("Style không tồn tại");
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
      if (!sel.length) throw new Error("Chọn ít nhất một thứ cần xoá");
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
      if (!surface) throw new Error("Chọn bề mặt cần đổi");
      if (!SURFACES[surface].includes(p.material)) throw new Error("Vật liệu không hợp lệ");
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
      if (!w) throw new Error("Chọn thời tiết");
      return join(`Replace only the sky and lighting of this exterior photo with ${w.toLowerCase()} conditions, adjusting shadows, reflections and ambient light on the building and surroundings to match.`, "Do not change the building or landscaping.", custom(p), EXT_LOCK);
    }
    case "exterior-sketch": {
      const s = styleFor(p.styleSlug, "exterior");
      return join(`Transform this sketch of a building into a photorealistic exterior photograph in a ${s.name} architectural style.`, "Strictly retain the shape, proportions and perspective of the sketch.", custom(p), "High quality architectural photography.");
    }
    case "garden-redesign":
      return join(styleFor(p.styleSlug, "garden").prompt, custom(p));
    default:
      throw new Error("Tool không hợp lệ");
  }
}
