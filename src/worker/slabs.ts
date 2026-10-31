/**
 * VASTA ESSENTIALS large-format slabs (2800 × 1200 × 9 mm) offered for kitchen worktops and the island top in Material Swap.
 * Swatches live in public/materials/slabs/<file>.jpg: the whole slab laid landscape (sent to the model next to the photo),
 * with <file>-thumb.jpg for the picker. The sheen is picked on the shared finish scale (Mờ … Bóng); with none picked the
 * design shows the finish it is sold in (-DP polished, otherwise matte). The display name doubles as the `material` value.
 */
export const SLAB_BRAND = "VASTA ESSENTIALS";
export const SLAB_SIZE = "280 × 120 cm";
// sold: the product finishes in the catalogue (DM matte / DP polished); Calacata Grey came without a code.
const LIST: { code: string; name: string; look: string; sold: ("DM" | "DP")[]; file?: string }[] = [
  { code: "APU09E", name: "Apuan Luxe", look: "bright white marble look with thin gold-brown and grey veins", sold: ["DP"] },
  { code: "ARB09E", name: "Armani Beige", look: "warm cream-beige marble look with soft pale veins", sold: ["DM", "DP"] },
  { code: "ARC09E", name: "Armani Charcoal", look: "dark charcoal grey stone with clearly visible thin white veins and a lighter grey vein band running diagonally", sold: ["DM", "DP"] },
  { code: "ARM09E", name: "Armani Moonlit", look: "very pale off-white grey stone with faint soft veins", sold: ["DP"] },
  { code: "ARU09E", name: "Armani Umber", look: "deep umber brown stone with lighter taupe veins", sold: ["DP"] },
  { code: "", name: "Calacata Grey", look: "bright white marble look with bold grey veins running diagonally", sold: ["DP"], file: "CALACATA-GREY" },
  { code: "CEM09E", name: "Cemento", look: "plain warm grey concrete look with soft cloudy shading and no veins", sold: ["DM"] },
  { code: "GAG09E", name: "Garni Gorge", look: "grey-brown stone with dramatic flowing layered bands", sold: ["DM"] },
  { code: "GRS09E", name: "Gravel Stone", look: "dark charcoal grey stone with a fine gravel-like speckle", sold: ["DM"] },
  { code: "GRA09E", name: "Granito Azzurro", look: "blue-grey quartzite look with strong dark diagonal veins and small rust accents", sold: ["DM"] },
  { code: "MAB09E", name: "Marvel Bernini", look: "white marble look with fine grey web-like veins", sold: ["DM", "DP"] },
  { code: "NOM09L", name: "Nobile Marfil", look: "warm ivory cream marble look with fine gold-beige veins", sold: ["DP"] },
  { code: "STB09E", name: "Statuary Bianco", look: "bright white marble look with clear grey veins running diagonally across the slab", sold: ["DP"] },
  { code: "TEB09E", name: "Terra Beige", look: "plain sand-beige stone with soft cloudy shading and no veins", sold: ["DM"] },
  { code: "TEG09E", name: "Terra Grey", look: "plain mid-grey stone with soft cloudy shading and no veins", sold: ["DM"] },
  { code: "TRG09E", name: "Travertino Grey", look: "grey travertine look with fine parallel wavy bands running along the slab's length", sold: ["DM"] },
  { code: "TRI09E", name: "Travertino Ivory", look: "ivory travertine look with fine parallel wavy bands running along the slab's length", sold: ["DM"] },
  { code: "TRS09E", name: "Travertino Sand", look: "warm sand-beige travertine look with fine parallel wavy bands running along the slab's length", sold: ["DM"] },
];
export const SLABS = LIST.map((s) => {
  const file = s.file ?? s.code;
  return { ...s, name: `${SLAB_BRAND} ${s.name}${s.code ? ` ${s.code}` : ""}`, title: s.name, soldFinish: (s.sold.includes("DP") ? "polished" : "matte") as "matte" | "polished",
    swatch: `/materials/slabs/${file}.jpg`, thumb: `/materials/slabs/${file}-thumb.jpg` };
});
/** A slab by material value; names saved before the finish scale ("… ARC09E-DM") still resolve, with their finish. */
export const slabOf = (material: unknown) => {
  if (typeof material !== "string") return undefined;
  const old = material.match(/^(.*)-(DM|DP)$/);
  const s = SLABS.find((x) => x.name === (old ? old[1] : material));
  return s && { ...s, legacyFinish: old ? (old[2] === "DP" ? "gloss" : "matte") as "gloss" | "matte" : undefined };
};
/** Surfaces a slab can go on: the wall-side worktops and the island top. */
export const SLAB_SURFACES = ["countertops", "island"] as const;
