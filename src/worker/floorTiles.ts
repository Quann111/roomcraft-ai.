/**
 * VICOSTONE porcelain floor tiles offered in Floor Editor. Swatch images live in public/materials/floor/<code>.jpg
 * (sent to the model as a second image), with <code>-thumb.jpg for the picker and <code>-room.jpg as an installed
 * example where the catalog has one. The display name doubles as the `material` value, so history and comparison
 * labels need no lookup.
 */
export const TILE_BRAND = "VICOSTONE";
export const TILE_SIZE = "120 × 120 cm";
const TILES: { code: string; look: string; room?: boolean }[] = [
  { code: "AZ26-P121221", look: "off-white light grey with a very fine, uniform granular speckle" },
  { code: "AZ26-P121222", look: "warm ivory cream with a very fine, uniform speckle", room: true },
  { code: "CA26-P121221", look: "light grey-white with soft diagonal stone veining and fine thin veins" },
  { code: "CA26-P121222", look: "light-to-medium grey marble with diagonal veining and thin white veins", room: true },
  { code: "CA26-P121223", look: "warm beige cream with soft diagonal veining", room: true },
  { code: "CA26-P121224", look: "bright cool white with a very faint cloudy marble pattern" },
  { code: "NY26-P121221", look: "light cool grey with a soft cloudy stone texture", room: true },
  { code: "NY26-P121222", look: "warm cream to light beige with a soft cloudy stone texture" },
];
export const FLOOR_TILES = TILES.map((t) => ({ ...t, name: `Gạch ${TILE_BRAND} ${t.code}`, swatch: `/materials/floor/${t.code}.jpg` }));
export const floorTile = (material: unknown) => FLOOR_TILES.find((t) => t.name === material);
