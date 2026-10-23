// Sun exposure of a building's four sides, from latitude and the direction its front faces.
// Simple solar geometry (declination + hour angle, local solar time); accurate enough to rank facades.

export const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type Direction = (typeof DIRECTIONS)[number];
const azOf = (d: Direction) => DIRECTIONS.indexOf(d) * 45;
const dirOf = (az: number) => DIRECTIONS[Math.round((((az % 360) + 360) % 360) / 45) % 8];

/** Cities offered in the UI, with latitude and the region used for prevailing winds. */
export const CITIES: { name: string; lat: number; region: "north" | "central" | "south-central" | "south" | "highlands" }[] = [
  { name: "Hà Nội", lat: 21.03, region: "north" },
  { name: "Hải Phòng", lat: 20.86, region: "north" },
  { name: "Vinh", lat: 18.68, region: "central" },
  { name: "Huế", lat: 16.46, region: "central" },
  { name: "Đà Nẵng", lat: 16.05, region: "central" },
  { name: "Nha Trang", lat: 12.24, region: "south-central" },
  { name: "Đà Lạt", lat: 11.94, region: "highlands" },
  { name: "TP. Hồ Chí Minh", lat: 10.82, region: "south" },
  { name: "Cần Thơ", lat: 10.03, region: "south" },
];

/** Prevailing seasonal winds by region (general climatology, English, for the prompt). */
export const WINDS: Record<(typeof CITIES)[number]["region"], string> = {
  north: "Summer (May–Sep): cooling southeast monsoon breezes. Winter (Nov–Mar): cold, dry northeast monsoon. Hot, dry westerly 'Lào' winds can reach the area in early summer.",
  central: "Summer (Apr–Aug): hot, dry west–southwest 'Lào' (foehn) winds, the main overheating risk. Autumn–winter (Sep–Dec): northeast monsoon with heavy rain and typhoons from the east.",
  "south-central": "Summer (May–Sep): southwest monsoon. Winter (Nov–Apr): strong northeast monsoon; coastal salt air and typhoon season in Oct–Nov.",
  highlands: "Cool all year. Rainy season (May–Oct): southwest monsoon. Dry season (Nov–Apr): northeast winds, cool nights.",
  south: "Rainy season (May–Oct): southwest monsoon with afternoon storms. Dry season (Dec–Apr): northeast to southeast breezes ('gió chướng'). Hot all year.",
};

const rad = Math.PI / 180;
function sun(lat: number, day: number, hour: number) {
  const decl = 23.44 * Math.sin(rad * (360 / 365) * (day - 81));
  const h = 15 * (hour - 12);
  const sinAlt = Math.sin(lat * rad) * Math.sin(decl * rad) + Math.cos(lat * rad) * Math.cos(decl * rad) * Math.cos(h * rad);
  const alt = Math.asin(sinAlt) / rad;
  const cosAz = (Math.sin(decl * rad) - sinAlt * Math.sin(lat * rad)) / (Math.cos(alt * rad) * Math.cos(lat * rad));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) / rad;
  if (h > 0) az = 360 - az;
  return { alt, az };
}

const SEASONS = [["summer (late June)", 172], ["equinox (March/September)", 80], ["winter (late December)", 355]] as const;
const SIDES = [["front", 0], ["right", 90], ["back", 180], ["left", 270]] as const;

export type SideExposure = { side: string; direction: Direction; seasons: { season: string; morning: number; afternoon: number; load: number }[] };

/** Hours of direct sun on each side (sun above 5°, hitting the wall face) and a relative heat load. */
export function exposure(lat: number, front: Direction): SideExposure[] {
  return SIDES.map(([side, offset]) => {
    const normal = azOf(front) + offset;
    return {
      side, direction: dirOf(normal),
      seasons: SEASONS.map(([season, day]) => {
        let morning = 0, afternoon = 0, load = 0;
        for (let t = 6; t < 18; t += 0.25) {
          const s = sun(lat, day, t + 0.125);
          const diff = Math.abs(((s.az - normal + 540) % 360) - 180);
          if (s.alt <= 5 || diff >= 90) continue;
          if (t < 12) morning += 0.25; else afternoon += 0.25;
          // Vertical-wall irradiance ~ cos(altitude)·cos(azimuth difference); afternoon sun counts more (hotter air).
          load += Math.cos(s.alt * rad) * Math.cos(diff * rad) * 0.25 * (t >= 12 ? 1.4 : 1);
        }
        return { season, morning, afternoon, load: Math.round(load * 10) / 10 };
      }),
    };
  });
}

/** Plain-English table of the exposure for the prompt; `labels` renames the sides (e.g. for a street photo). */
export function exposureText(lat: number, front: Direction, labels: Record<string, string> = {}) {
  return exposure(lat, front).map((x) => `- ${labels[x.side] ?? `${x.side} side`} faces ${x.direction}: ` +
    x.seasons.map((s) => `${s.season} ${s.morning}h morning + ${s.afternoon}h afternoon sun (heat load ${s.load})`).join("; ")).join("\n");
}
