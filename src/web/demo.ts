// Offline demo backend: only installed when the single-file export is opened via file://.
import { STYLES, ROOM_TYPES, INTERVENTION, SURFACES, WEATHER, REMOVE, ANGLES } from "../worker/prompts";

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json" } });
const svg = (a: string, b: string, label: string) =>
  "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="158" font-family="sans-serif" font-size="22" fill="#fff" text-anchor="middle">${label}</text></svg>`);

const PALETTES: [string, string][] = [["#d6c3a5", "#8c6d4f"], ["#9bb7c4", "#3f6579"], ["#c9d6b5", "#6b8a52"], ["#e3b7a0", "#a45a3c"], ["#bfb5d6", "#5e4f8c"], ["#d9d9d9", "#6b6b6b"]];
const gallery = Array.from({ length: 12 }, (_, i) => {
  const s = STYLES[i % STYLES.length];
  const [a, b] = PALETTES[i % PALETTES.length];
  return { id: `demo${i}`, tool: "interior-redesign", params: { styleSlug: s.slug }, createdAt: Date.now() - i * 1e6, inputUrl: svg("#bbb", "#777", "Before"), outputUrl: svg(a, b, s.name) };
});

type G = { id: string; tool: string; params: any; status: string; public: boolean; createdAt: number; inputUrl: string; outputUrl: string | null };
const gens: G[] = [];
let user: { email: string; credits: number } | null = null;
let pendingImg = "";
const DAY = 86_400_000;

async function handle(url: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const path = url.split("?")[0];
  const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
  if (path === "/api/gallery") return json({ items: gallery, next: null });
  if (path === "/api/styles") return json({ styles: STYLES.map(({ slug, name, scope }) => ({ slug, name, scope })), roomTypes: ROOM_TYPES, intervention: INTERVENTION, surfaces: SURFACES, weather: WEATHER, remove: REMOVE, angles: ANGLES });
  if (path === "/api/auth/login" || path === "/api/auth/signup") { user = { email: body?.email || "demo@example.com", credits: 3 }; return json({ ok: true }); }
  if (path === "/api/auth/logout") { user = null; return json({ ok: true }); }
  if (!user) return json({ error: "Chưa đăng nhập (bản demo)" }, 401);
  if (path === "/api/me") return json({ ...user, nextRefillAt: Date.now() + DAY });
  if (path === "/api/prompts") return json({ prompts: STYLES.map(({ slug, name, scope, prompt }) => ({ slug, name, scope, prompt })) });
  if (path === "/api/upload") {
    const blob = init!.body as Blob;
    pendingImg = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob); });
    return json({ key: "demo" });
  }
  if (path === "/api/generate") {
    const id = "g" + Date.now();
    gens.unshift({ id, tool: body.tool, params: body, status: "RUNNING", public: false, createdAt: Date.now(), inputUrl: pendingImg, outputUrl: null });
    user.credits = Math.max(0, user.credits - 1);
    setTimeout(() => { const g = gens.find((x) => x.id === id); if (g) { g.status = "SUCCESS"; g.outputUrl = g.inputUrl; } }, 2500); // demo: echoes the input
    return json({ id });
  }
  if (path === "/api/generations") return json({ items: gens });
  const m = path.match(/^\/api\/generations\/([^/]+)(\/publish)?$/);
  if (m) {
    const g = gens.find((x) => x.id === m[1]);
    if (!g) return json({ error: "not found" }, 404);
    if (m[2]) { g.public = !!body?.public; return json({ ok: true, public: g.public }); }
    if (method === "DELETE") { gens.splice(gens.indexOf(g), 1); return json({ ok: true }); }
    return json(g);
  }
  return json({ error: "not found" }, 404);
}

export function installDemo() {
  const real = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return url.startsWith("/api/") ? handle(url, init) : real(input, init);
  };
}
