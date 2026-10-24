// Isometric line figures in the hairline style, drawn for interior/exterior design scenes.
type V3 = [number, number, number];
type Prim = { pts: V3[]; fill: boolean; cls?: string };
type Mode = "lift" | "drop" | "grow" | "pick" | "static";
type Part = { prims: Prim[]; anchor: V3; mode: Mode; amp: number };
export type SceneName = keyof typeof SCENES;

// ---------- primitives ----------
const q = (...pts: V3[]): Prim => ({ pts, fill: true });
const ln = (cls: string, ...pts: V3[]): Prim => ({ pts, fill: false, cls });

function box([x, y, z]: V3, [w, d, h]: V3): Prim[] {
  const X = x + w, Y = y + d, Z = z + h;
  return [q([x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]), q([X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]), q([x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z])];
}
function ring(cx: number, cy: number, z: number, r: number, n = 16): V3[] {
  return Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z] as V3; });
}
function cyl(cx: number, cy: number, z: number, r: number, h: number, n = 16): Prim[] {
  const b = ring(cx, cy, z, r, n), t = ring(cx, cy, z + h, r, n);
  const sides: Prim[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    if (Math.cos(a) + Math.sin(a) > -0.2) sides.push(q(b[i], b[(i + 1) % n], t[(i + 1) % n], t[i]));
  }
  return [...sides, q(...t)];
}
function cone(cx: number, cy: number, z: number, r: number, h: number, n = 14): Prim[] {
  const b = ring(cx, cy, z, r, n), apex: V3 = [cx, cy, z + h];
  const out: Prim[] = [];
  for (let i = 0; i < n; i++) { const a = ((i + 0.5) / n) * Math.PI * 2; if (Math.cos(a) + Math.sin(a) > -0.3) out.push(q(b[i], b[(i + 1) % n], apex)); }
  return out;
}
const rect = (cls: string, a: V3, b: V3, c: V3, d: V3) => ln(cls, a, b, c, d, a);

// ---------- furniture & architecture ----------
const F = 0.3; // floor top
function shell(win = true): Prim[] {
  const p = [...box([0, 0, 0], [10, 10, F]), ...box([0, 0, F], [0.3, 10, 6]), ...box([0.3, 0, F], [9.7, 0.3, 6])];
  if (win) {
    p.push(rect("in", [2, 0.31, 2.2], [5.4, 0.31, 2.2], [5.4, 0.31, 4.8], [2, 0.31, 4.8]), ln("in", [3.7, 0.31, 2.2], [3.7, 0.31, 4.8]), ln("lo", [2, 0.31, 3.5], [5.4, 0.31, 3.5]));
    p.push(rect("in", [0.31, 6, F], [0.31, 8, F], [0.31, 8, 4.4], [0.31, 6, 4.4]), ln("lo", [0.31, 6.3, 2.4], [0.31, 6.3, 2.8]));
  }
  return p;
}
const sofa = (x: number, y: number, w = 4.2, back = 1.1): Prim[] => [
  ...box([x, y, F], [2, w, 0.8]), ...box([x, y + 0.5, F + 0.8], [0.6, w - 1, back]),
  ...box([x, y, F + 0.8], [2, 0.5, 0.6]), ...box([x, y + w - 0.5, F + 0.8], [2, 0.5, 0.6]),
  ln("lo", [x + 2, y + w / 2, F + 0.8], [x + 0.6, y + w / 2, F + 0.8]),
];
const armchair = (x: number, y: number): Prim[] => [...box([x, y, F], [1.8, 1.8, 0.7]), ...box([x, y, F + 0.7], [0.5, 1.8, 1.2]), ...box([x + 0.5, y, F + 0.7], [1.3, 0.35, 0.5]), ...box([x + 0.5, y + 1.45, F + 0.7], [1.3, 0.35, 0.5])];
const roundChair = (x: number, y: number): Prim[] => [...cyl(x, y, F, 0.15, 0.5, 8), ...cyl(x, y, F + 0.5, 1, 0.5), ...cyl(x - 0.45, y - 0.45, F + 1, 0.45, 0.9, 10)];
const table = (x: number, y: number, s = 1.8): Prim[] => [...box([x + s / 2 - 0.12, y + s / 2 - 0.12, F], [0.24, 0.24, 0.6]), ...box([x, y, F + 0.6], [s, s, 0.15])];
const roundTable = (x: number, y: number): Prim[] => [...cyl(x, y, F, 0.15, 0.7, 8), ...cyl(x, y, F + 0.7, 1, 0.12)];
const plant = (x: number, y: number, h = 2.2): Prim[] => [...cyl(x, y, F, 0.45, 0.7, 12), ...cone(x, y, F + 0.7, 0.9, h)];
const lamp = (x: number, y: number): Prim[] => [...cyl(x, y, F, 0.35, 0.08, 10), ...box([x - 0.05, y - 0.05, F], [0.1, 0.1, 3.4]), ...cyl(x, y, F + 3.4, 0.6, 0.6, 12)];
const rug = (x: number, y: number, w: number, d: number): Prim[] => [q([x, y, F + 0.01], [x + w, y, F + 0.01], [x + w, y + d, F + 0.01], [x, y + d, F + 0.01]), rect("lo", [x + 0.3, y + 0.3, F + 0.02], [x + w - 0.3, y + 0.3, F + 0.02], [x + w - 0.3, y + d - 0.3, F + 0.02], [x + 0.3, y + d - 0.3, F + 0.02])];
const shelf = (x: number): Prim[] => [...box([x, 0.3, F], [2.4, 0.8, 4]), ln("in", [x, 1.1, F + 1.3], [x + 2.4, 1.1, F + 1.3]), ln("in", [x, 1.1, F + 2.6], [x + 2.4, 1.1, F + 2.6])];
const art = (y: number): Prim[] => [rect("in", [0.32, y, 3], [0.32, y + 2, 3], [0.32, y + 2, 4.4], [0.32, y, 4.4]), ln("lo", [0.32, y + 0.3, 3.3], [0.32, y + 1, 4], [0.32, y + 1.4, 3.6], [0.32, y + 1.7, 3.9])];
const bed = (x: number, y: number): Prim[] => [...box([x, y, F], [4.6, 3.4, 0.7]), ...box([x, y, F], [0.35, 3.4, 2.2]), ...box([x + 0.4, y + 0.3, F + 0.7], [0.9, 1.2, 0.35]), ...box([x + 0.4, y + 1.9, F + 0.7], [0.9, 1.2, 0.35]), ln("in", [x + 2, y, F + 0.7], [x + 2, y + 3.4, F + 0.7])];
const nightstand = (x: number, y: number): Prim[] => [...box([x, y, F], [1, 1, 0.9]), ...cyl(x + 0.5, y + 0.5, F + 0.9, 0.25, 0.7, 10)];
const counter = (): Prim[] => [...box([0.3, 0.3, F], [9.4, 1.4, 1.4]), ...box([0.3, 1.7, F], [1.4, 6, 1.4]), ...box([0.3, 0.3, 3.4], [6, 0.8, 1.4]), ln("in", [2.5, 1.7, F], [2.5, 1.7, F + 1.4]), ln("in", [5, 1.7, F], [5, 1.7, F + 1.4]), ln("in", [7.5, 1.7, F], [7.5, 1.7, F + 1.4])];
const island = (): Prim[] => [...box([4, 4, F], [3.6, 2, 1.4]), ln("lo", [4, 6, F + 0.6], [7.6, 6, F + 0.6])];
const stool = (x: number, y: number): Prim[] => [...cyl(x, y, F, 0.1, 1, 8), ...cyl(x, y, F + 1, 0.4, 0.15, 10)];
const pendant = (x: number, y: number): Prim[] => [ln("lo", [x, y, 6.3], [x, y, 4.6]), ...cone(x, y, 4.1, 0.5, 0.6)];

function house(): Prim[] {
  const p = [...box([2.5, 2.5, 0.3], [5.5, 4.5, 3.4])];
  p.push(q([2.5, 4.75, 5.6], [8, 4.75, 5.6], [8.3, 7.3, 3.6], [2.2, 7.3, 3.6]), q([8, 2.5, 3.7], [8, 7, 3.7], [8, 4.75, 5.6]));
  p.push(...box([3.4, 3.6, 4.4], [0.6, 0.6, 1.8]));
  p.push(rect("in", [4.6, 7.01, 0.3], [5.8, 7.01, 0.3], [5.8, 7.01, 2.4], [4.6, 7.01, 2.4]));
  p.push(rect("in", [3, 7.01, 1.4], [4, 7.01, 1.4], [4, 7.01, 2.6], [3, 7.01, 2.6]), rect("in", [6.4, 7.01, 1.4], [7.4, 7.01, 1.4], [7.4, 7.01, 2.6], [6.4, 7.01, 2.6]));
  p.push(rect("in", [8.01, 3.3, 1.4], [8.01, 4.5, 1.4], [8.01, 4.5, 2.6], [8.01, 3.3, 2.6]), rect("in", [8.01, 5.2, 1.4], [8.01, 6.4, 1.4], [8.01, 6.4, 2.6], [8.01, 5.2, 2.6]));
  return p;
}
const ground = (): Prim[] => box([0, 0, 0], [10, 10, F]);
const tree = (x: number, y: number, h = 3): Prim[] => [...box([x - 0.12, y - 0.12, F], [0.24, 0.24, 1]), ...cone(x, y, F + 0.8, 1, h)];
const hedge = (x: number, y: number, w: number, d: number): Prim[] => box([x, y, F], [w, d, 0.9]);
const path = (): Prim[] => [0, 1, 2, 3].map((i) => q([5 + 0.0, 7.4 + i * 0.65, F + 0.01], [5.6, 7.4 + i * 0.65, F + 0.01], [5.6, 7.9 + i * 0.65, F + 0.01], [5, 7.9 + i * 0.65, F + 0.01]));

// ---------- scenes ----------
const P = (prims: Prim[], anchor: V3, mode: Mode = "lift", amp = 1.6): Part => ({ prims, anchor, mode, amp });
const S = (prims: Prim[]): Part => P(prims, [0, 0, 0], "static", 0);

function photo(y: number, pic: Prim[]): Part {
  return P([...box([4, y, 1.2], [0.25, 2.8, 3.4]), rect("in", [4.26, y + 0.25, 1.5], [4.26, y + 2.55, 1.5], [4.26, y + 2.55, 4.3], [4.26, y + 0.25, 4.3]), ...pic], [4, y + 1.4, 3], "lift", 2.4);
}
const picRoom = (y: number) => [ln("in", [4.27, y + 0.5, 2], [4.27, y + 2.3, 2]), ln("in", [4.27, y + 0.6, 2], [4.27, y + 0.6, 2.7], [4.27, y + 2.2, 2.7], [4.27, y + 2.2, 2])];
const picHouse = (y: number) => [ln("in", [4.27, y + 0.6, 1.8], [4.27, y + 0.6, 2.9], [4.27, y + 1.4, 3.6], [4.27, y + 2.2, 2.9], [4.27, y + 2.2, 1.8], [4.27, y + 0.6, 1.8])];
const picTree = (y: number) => [ln("in", [4.27, y + 1.4, 1.7], [4.27, y + 1.4, 2.4]), ln("in", [4.27, y + 0.7, 2.4], [4.27, y + 1.4, 3.9], [4.27, y + 2.1, 2.4], [4.27, y + 0.7, 2.4])];

const tray = (): Prim[] => [...box([1.5, 0, 0], [6, 10, 0.5]), ...box([2, 0.5, 0.5], [5, 9, 0.7])];

export const SCENES = {
  upload: () => [S(tray()), photo(0.7, picRoom(0.7)), photo(3.6, picHouse(3.6)), photo(6.5, picTree(6.5)), P([ln("in", [6.5, 5, 6], [6.5, 5, 8]), ln("in", [6.5, 4.4, 7.4], [6.5, 5, 8], [6.5, 5.6, 7.4])], [6.5, 5, 7], "lift", 1)],
  style: () => [S([...shell(), ...rug(3, 1.5, 6, 7.5)]), P(sofa(3.3, 1.3, 2.6), [4.3, 2.6, 1], "pick", 1.8), P(armchair(3.6, 4.6), [4.5, 5.5, 1], "pick", 1.8), P(roundChair(4.6, 8.2), [4.6, 8.2, 1], "pick", 1.8)],
  generate: () => [S(shell()), P(rug(3, 2, 5.5, 6), [5.7, 5, F], "drop", 3), P(sofa(1, 2.4), [2, 4.5, 1], "drop", 4), P(table(4.2, 4), [5, 4.9, 1], "drop", 3.5), P(plant(8.2, 1.4), [8.2, 1.4, 1], "drop", 4.5), P(lamp(1.2, 8.3), [1.2, 8.3, 2], "drop", 5), P(art(2.6), [0.3, 3.6, 3.7], "drop", 2)],
  lock: () => [S([...shell(), rect("lo", [1, 2.3, F + 0.02], [3, 2.3, F + 0.02], [3, 6.5, F + 0.02], [1, 6.5, F + 0.02]), rect("lo", [4.2, 4, F + 0.02], [6, 4, F + 0.02], [6, 5.8, F + 0.02], [4.2, 5.8, F + 0.02])]), P([...sofa(1, 2.3), ...table(4.2, 4), ...plant(8, 1.6)], [4.5, 4.5, 1.5], "lift", 3.2), P(cyl(8.6, 0.32, 3, 0.55, 0.3), [8.6, 0.3, 3], "lift", 0.6)],
  walls: () => {
    const fy = 6.21;
    const body = [...box([3.2, 5, F], [3, 1.2, 2.8]), ln("in", [4.7, fy, F + 1.7], [4.7, fy, F + 0.9]), rect("in", [4.45, fy, F + 1.7], [4.95, fy, F + 1.7], [4.95, fy, F + 2.1], [4.45, fy, F + 2.1])];
    const shackle = [ln("in", [3.7, 5.6, F + 2.8], [3.7, 5.6, F + 4.2], [4.2, 5.6, F + 4.9], [5.2, 5.6, F + 4.9], [5.7, 5.6, F + 4.2], [5.7, 5.6, F + 2.8])];
    return [S([...shell(), ...rug(2.2, 3.4, 5.6, 4)]), S(body), P(shackle, [4.6, 5.3, 4.5], "lift", 1.3)];
  },
  styles: () => {
    const parts: Part[] = [S(box([0, 0, 0], [10, 10, 0.3]))];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      const x = 0.5 + i * 1.55, y = 0.5 + j * 1.55, z = 0.3, kind = (i + j) % 3;
      const tex = kind === 0 ? [0.35, 0.7, 1.05].map((o) => ln("lo", [x + o, y, z + 0.5], [x + o, y + 1.3, z + 0.5])) : kind === 1 ? [ln("lo", [x + 0.65, y, z + 0.5], [x + 0.65, y + 1.3, z + 0.5]), ln("lo", [x, y + 0.65, z + 0.5], [x + 1.3, y + 0.65, z + 0.5])] : [ln("lo", [x + 0.2, y + 0.2, z + 0.5], [x + 1.1, y + 1.1, z + 0.5])];
      parts.push(P([...box([x, y, z], [1.3, 1.3, 0.5]), ...tex], [x + 0.65, y + 0.65, 0.6], "lift", 2.2));
    }
    return parts;
  },
  journey: () => [
    S(box([0, 0, 0], [14, 5, 0.3])),
    P([...box([1, 1.2, F], [0.25, 2.6, 3.2]), rect("in", [1.26, 1.45, 0.6], [1.26, 3.55, 0.6], [1.26, 3.55, 3.2], [1.26, 1.45, 3.2]), ...picRoom(1.2).map((p) => ({ ...p, pts: p.pts.map(([x, y, z]) => [x - 3.01, y, z - 0.9] as V3) }))], [1, 2.5, 2], "lift", 1.8),
    P([0, 1, 2].flatMap((k) => box([5 + k * 0.15, 1.4 + k * 0.15, F + k * 0.45], [2.2, 2.2, 0.4])), [6, 2.5, 1], "lift", 1.8),
    P([...box([9.5, 0.6, F], [3.8, 3.8, 0.2]), ...box([9.5, 0.6, F], [0.2, 3.8, 2.4]), ...box([9.7, 0.6, F], [3.6, 0.2, 2.4]), ...box([10.2, 1.4, F + 0.2], [1, 2.2, 0.5]), ...box([10.2, 1.4, F + 0.7], [0.3, 2.2, 0.6]), ...cone(12.6, 3.6, F + 0.2, 0.4, 1.3)], [11.4, 2.5, 1.2], "lift", 1.8),
    S([ln("lo", [2.6, 2.5, 1.5], [4.6, 2.5, 1.5]), ln("lo", [7.8, 2.5, 1.5], [9.2, 2.5, 1.5])]),
  ],
  room: () => [S([...shell(), ...rug(3, 2, 5.5, 6)]), P(sofa(1, 2.4), [2, 4.5, 1], "lift", 1.6), P(table(4.2, 4), [5, 4.9, 1], "lift", 1.6), P(armchair(6.8, 6.6), [7.7, 7.5, 1], "lift", 1.6), P(plant(8.2, 1.4), [8.2, 1.4, 1.5], "lift", 1.6), P(lamp(1.2, 8.3), [1.2, 8.3, 2], "lift", 1.6), P(shelf(6), [7.2, 0.7, 2], "lift", 1), P(art(2.6), [0.3, 3.6, 3.7], "lift", 0.8)],
  bedroom: () => [S([...shell(), ...rug(1.5, 2, 6.5, 6.5)]), P(bed(0.3, 3), [2.6, 4.7, 1], "lift", 1.4), P(nightstand(0.4, 1.7), [0.9, 2.2, 1], "lift", 1.6), P(nightstand(0.4, 6.6), [0.9, 7.1, 1], "lift", 1.6), P(box([5.6, 0.3, F], [3.6, 1.2, 5]), [7.4, 0.9, 2.5], "lift", 0.9), P(plant(8.4, 8.4), [8.4, 8.4, 1.5], "lift", 1.6)],
  kitchen: () => [S([...shell(false), ...counter()]), P(island(), [5.8, 5, 1], "lift", 1.2), P(stool(4.8, 7), [4.8, 7, 1], "lift", 1.6), P(stool(6.8, 7), [6.8, 7, 1], "lift", 1.6), P(pendant(4.8, 5), [4.8, 5, 4.4], "lift", 0.8), P(pendant(6.8, 5), [6.8, 5, 4.4], "lift", 0.8), P(plant(8.6, 8.6, 1.6), [8.6, 8.6, 1.5], "lift", 1.6)],
  house: () => [S([...ground(), ...path()]), P(house(), [5.2, 4.7, 3], "lift", 0.9), P(tree(1.2, 1.5), [1.2, 1.5, 2], "lift", 1.4), P(tree(9, 2), [9, 2, 2], "lift", 1.4), P(tree(1.5, 8.6, 2.4), [1.5, 8.6, 2], "lift", 1.4), P(hedge(7, 8, 2.6, 0.8), [8.3, 8.4, 0.6], "lift", 1.2)],
  garden: () => [S([...ground(), ...path(), rect("lo", [1, 1, F + 0.01], [4.4, 1, F + 0.01], [4.4, 4.4, F + 0.01], [1, 4.4, F + 0.01])]), P(tree(2.7, 2.7, 3.6), [2.7, 2.7, 2], "lift", 1.4), P(tree(8, 1.6), [8, 1.6, 2], "lift", 1.4), P(hedge(0.4, 6, 3.6, 0.8), [2.2, 6.4, 0.6], "lift", 1.2), P(hedge(6.6, 4.6, 0.8, 3.6), [7, 6.4, 0.6], "lift", 1.2), P([...box([1.2, 8, F], [3, 1, 0.5]), ...box([1.2, 8.7, F + 0.5], [3, 0.3, 0.8])], [2.7, 8.5, 0.8], "lift", 1.4), P(plant(8.6, 8.6, 1.4), [8.6, 8.6, 1], "lift", 1.6)],
  floorplan: () => {
    const walls: [V3, V3][] = [[[0, 0, F], [10, 0.3, 4]], [[0, 0.3, F], [0.3, 9.7, 4]], [[0.3, 5, F], [4, 0.3, 4]], [[5.6, 5, F], [4.4, 0.3, 4]], [[5, 0.3, F], [0.3, 3, 4]], [[5, 6.5, F], [0.3, 3.5, 4]]];
    const plan = walls.map(([[x, y], [w, d]]) => rect("lo", [x, y, F + 0.01], [x + w, y, F + 0.01], [x + w, y + d, F + 0.01], [x, y + d, F + 0.01]));
    return [S([...box([0, 0, 0], [10, 10, F]), ...plan]), ...walls.map(([p, s]) => P(box(p, s), [p[0] + s[0] / 2, p[1] + s[1] / 2, F], "grow", 1))];
  },
  credits: () => [S(box([0, 0, 0], [10, 10, 0.3])), ...[[3.4, 1], [4.8, 2], [6.4, 3]].map(([s, k], i) => P([...box([1 + i * 0.5, 1 + i * 0.5, F + i * 1.2], [s, s, 0.25]), rect("in", [1.2 + i * 0.5, 1.2 + i * 0.5, F + i * 1.2 + 0.26], [0.8 + i * 0.5 + s, 1.2 + i * 0.5, F + i * 1.2 + 0.26], [0.8 + i * 0.5 + s, 0.8 + i * 0.5 + s, F + i * 1.2 + 0.26], [1.2 + i * 0.5, 0.8 + i * 0.5 + s, F + i * 1.2 + 0.26])], [1 + i * 0.5 + s / 2, 1 + i * 0.5 + s / 2, F + i * 1.2], "lift", 1.2 + k * 0.2))],
  refund: () => [S(box([0, 0, 0], [10, 10, 0.3])), ...[[3, 3], [3, 6.5], [6.5, 4.8]].map(([x, y], s) => P(Array.from({ length: 4 + s }, (_, k) => cyl(x, y, F + k * 0.45, 1.3, 0.4)).flat(), [x, y, 1.5], "lift", 1.8))],
  refill: () => [S([...box([0, 0, 0], [10, 10, 0.3]), ...cyl(5, 5, F, 1.4, 0.4)]), ...[0, 1, 2, 3].map((k) => P(cyl(5, 5, F + 0.45 + k * 0.45, 1.4, 0.4), [5, 5, 1 + k], "drop", 3 + k))],
  empty: () => [S([...shell(), rect("lo", [3, 3, F + 0.02], [7, 3, F + 0.02], [7, 7, F + 0.02], [3, 7, F + 0.02])]), P(armchair(4.2, 4.2), [5, 5, 1], "drop", 3.5)],
};

// ---------- engine ----------
const project = ([x, y, z]: V3): [number, number] => [(x - y) * 0.866, (x + y) * 0.5 - z];
const depth = (pts: V3[]) => Math.min(...pts.map(([x, y]) => x + y)) + Math.min(...pts.map((p) => p[2])) * 0.5;

export function mountIso(el: HTMLElement, name: SceneName, { intensity = 0.6, play = true } = {}) {
  const parts = SCENES[name]();
  const W = 400, H = 320, pad = 26;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of parts) for (const pr of p.prims) for (const v of pr.pts) for (const dz of [0, p.mode === "drop" ? p.amp : p.mode === "static" || p.mode === "grow" ? 0 : p.amp]) {
    const [sx, sy] = project([v[0], v[1], v[2] + dz]);
    minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
  }
  const k = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY));
  const ox = (W - (maxX - minX) * k) / 2 - minX * k, oy = (H - (maxY - minY) * k) / 2 - minY * k;
  const scr = (v: V3) => { const [a, b] = project(v); return [a * k + ox, b * k + oy] as const; };
  const anchors = parts.map((p) => scr(p.anchor));
  const val: number[] = parts.map((p) => (p.mode === "grow" ? 0.15 : 0));

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("iso");
  el.appendChild(svg);

  let ptr: [number, number] | null = null, lastPtr = -1e9, t0 = performance.now(), raf = 0, visible = false;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sigma = 55 + intensity * 70;
  const onMove = (e: PointerEvent) => { const r = svg.getBoundingClientRect(); ptr = [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; lastPtr = performance.now(); kick(); };
  const onLeave = () => { ptr = null; kick(); };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);

  function draw() {
    const items: { d: number; s: string }[] = [];
    parts.forEach((p, i) => {
      const v = val[i], hi = p.mode !== "static" && p.mode !== "grow" && v > 0.35 ? " hi" : "";
      const tf = (pt: V3): V3 => {
        if (p.mode === "lift" || p.mode === "pick") return [pt[0], pt[1], pt[2] + v * p.amp];
        if (p.mode === "drop") return [pt[0], pt[1], pt[2] + (1 - v) * p.amp];
        if (p.mode === "grow") return [pt[0], pt[1], F + (pt[2] - F) * v];
        return pt;
      };
      for (const pr of p.prims) {
        const pts = pr.pts.map(tf);
        const s = pts.map((v3) => scr(v3).map((n) => n.toFixed(1)).join(",")).join(" ");
        const cls = (pr.fill ? "f" : `l ${pr.cls ?? "in"}`) + hi + (p.mode === "drop" && v < 0.5 ? " ghost" : "");
        items.push({ d: depth(pts) + (pr.fill ? 0 : 0.002), s: pr.fill ? `<polygon class="${cls}" points="${s}"/>` : `<polyline class="${cls}" points="${s}"/>` });
      }
    });
    items.sort((a, b) => a.d - b.d);
    svg.innerHTML = items.map((x) => x.s).join("");
  }

  function step(now: number) {
    raf = 0;
    let target = ptr;
    const idle = !ptr && now - lastPtr > 1500;
    if (idle && play && !reduced) { const t = (now - t0) / 1000; target = [W / 2 + Math.sin(t * 0.55) * W * 0.38, H * 0.55 + Math.sin(t * 0.83 + 1) * H * 0.28]; }
    let nearest = -1, best = Infinity;
    if (target) parts.forEach((p, i) => { if (p.mode === "pick") { const d = Math.hypot(anchors[i][0] - target![0], anchors[i][1] - target![1]); if (d < best) { best = d; nearest = i; } } });
    let moving = false;
    parts.forEach((p, i) => {
      if (p.mode === "static") return;
      let goal: number = p.mode === "grow" ? 0.15 : 0;
      if (target) {
        const d = Math.hypot(anchors[i][0] - target[0], anchors[i][1] - target[1]);
        const g = Math.exp(-((d / sigma) ** 2));
        goal = p.mode === "pick" ? (i === nearest ? 1 : 0) : p.mode === "grow" ? 0.15 + 0.85 * Math.min(1, g * 1.6) : g;
      }
      const nv = val[i] + (goal - val[i]) * 0.11;
      if (Math.abs(nv - val[i]) > 0.0005) moving = true;
      val[i] = nv;
    });
    draw();
    if (visible && (moving || (play && !reduced))) raf = requestAnimationFrame(step);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(step); }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
  io.observe(el);
  draw();
  return () => { io.disconnect(); cancelAnimationFrame(raf); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); svg.remove(); };
}

const TOPICS: [RegExp, SceneName][] = [
  [/floor editor|chỉnh sửa sàn/i, "styles"],
  [/floor ?plan|2d|3d|blueprint|mặt bằng|bản vẽ/i, "floorplan"],
  [/business|bizplan|budget|estimat|cost|kinh doanh|dự toán/i, "credits"],
  [/garden|landscap|backyard|patio|terrace|pool|vườn|cảnh quan|sân|hồ bơi/i, "garden"],
  [/exterior|facade|house|home front|roof|curb|sky|day ?& ?night|lighting|sun ?& ?wind|weather|ngoại thất|mặt tiền|bầu trời|nhà phố|biệt thự/i, "house"],
  [/kitchen|bếp/i, "kitchen"],
  [/bed ?room|phòng ngủ/i, "bedroom"],
  [/empty|declutter|remov|xoá|dọn/i, "empty"],
  [/stag|furnish|fill|decor|composer|bày trí|lấp đầy|trang trí/i, "generate"],
  [/style|phong cách|color|màu|texture|material|vật liệu|paint|sơn|floor|sàn|swap/i, "styles"],
  [/sketch|render|photo to|upload|phác/i, "upload"],
  [/price|pricing|bảng giá|credit/i, "credits"],
  [/agent|realtor|môi giới|listing|tin đăng|investor|chủ đầu tư/i, "house"],
  [/finder|shop|advisor|chat|tìm/i, "style"],
  [/designer|architect|redesign|kiến trúc|thiết kế/i, "lock"],
];
export const scenefor = (s: string): SceneName => TOPICS.find(([re]) => re.test(s))?.[1] ?? "room";
