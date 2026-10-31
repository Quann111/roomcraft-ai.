/**
 * VASTA ESSENTIALS large-format slabs (2800 × 1200 × 9 mm) offered for kitchen worktops and the island top in Material Swap.
 * Swatches live in public/materials/slabs/<file>.jpg: the whole slab laid landscape (sent to the model next to the photo),
 * with <file>-thumb.jpg for the picker. "-DM" products are matte (honed), "-DP" polished; a design sold in both finishes
 * shares one image. The display name doubles as the `material` value, so history labels need no lookup.
 */
export const SLAB_BRAND = "VASTA ESSENTIALS";
export const SLAB_SIZE = "280 × 120 cm";
const LIST: { code: string; name: string; look: string; file?: string }[] = [
  { code: "APU09E-DP", name: "Apuan Luxe", look: "bright white marble look with thin gold-brown and grey veins" },
  { code: "ARB09E-DM", name: "Armani Beige", look: "warm cream-beige marble look with soft pale veins" },
  { code: "ARB09E-DP", name: "Armani Beige", look: "warm cream-beige marble look with soft pale veins" },
  { code: "ARC09E-DM", name: "Armani Charcoal", look: "dark charcoal grey stone with clearly visible thin white veins and a lighter grey vein band running diagonally" },
  { code: "ARC09E-DP", name: "Armani Charcoal", look: "dark charcoal grey stone with clearly visible thin white veins and a lighter grey vein band running diagonally" },
  { code: "ARM09E-DP", name: "Armani Moonlit", look: "very pale off-white grey stone with faint soft veins" },
  { code: "ARU09E-DP", name: "Armani Umber", look: "deep umber brown stone with lighter taupe veins" },
  { code: "", name: "Calacata Grey", look: "bright white marble look with bold grey veins running diagonally", file: "CALACATA-GREY" },
  { code: "CEM09E-DM", name: "Cemento", look: "plain warm grey concrete look with soft cloudy shading and no veins" },
  { code: "GAG09E-DM", name: "Garni Gorge", look: "grey-brown stone with dramatic flowing layered bands" },
  { code: "GRS09E-DM", name: "Gravel Stone", look: "dark charcoal grey stone with a fine gravel-like speckle" },
  { code: "GRA09E-DM", name: "Granito Azzurro", look: "blue-grey quartzite look with strong dark diagonal veins and small rust accents" },
  { code: "MAB09E-DM", name: "Marvel Bernini", look: "white marble look with fine grey web-like veins" },
  { code: "MAB09E-DP", name: "Marvel Bernini", look: "white marble look with fine grey web-like veins" },
  { code: "NOM09L-DP", name: "Nobile Marfil", look: "warm ivory cream marble look with fine gold-beige veins" },
  { code: "STB09E-DP", name: "Statuary Bianco", look: "bright white marble look with clear grey veins running diagonally across the slab" },
  { code: "TEB09E-DM", name: "Terra Beige", look: "plain sand-beige stone with soft cloudy shading and no veins" },
  { code: "TEG09E-DM", name: "Terra Grey", look: "plain mid-grey stone with soft cloudy shading and no veins" },
  { code: "TRG09E-DM", name: "Travertino Grey", look: "grey travertine look with fine parallel wavy bands running along the slab's length" },
  { code: "TRI09E-DM", name: "Travertino Ivory", look: "ivory travertine look with fine parallel wavy bands running along the slab's length" },
  { code: "TRS09E-DM", name: "Travertino Sand", look: "warm sand-beige travertine look with fine parallel wavy bands running along the slab's length" },
];
/** matte for -DM, polished for -DP; Calacata Grey came without a code and is treated as polished. */
const finishOfCode = (code: string) => (code.endsWith("-DM") ? "matte" : "polished") as "matte" | "polished";
export const SLABS = LIST.map((s) => {
  const file = s.file ?? s.code;
  return { ...s, finish: finishOfCode(s.code), name: `${SLAB_BRAND} ${s.name}${s.code ? ` ${s.code}` : ""}`, title: s.name, swatch: `/materials/slabs/${file}.jpg`, thumb: `/materials/slabs/${file}-thumb.jpg` };
});
export const slabOf = (material: unknown) => SLABS.find((s) => s.name === material);
/** Surfaces a slab can go on: the wall-side worktops and the island top. */
export const SLAB_SURFACES = ["countertops", "island"] as const;
