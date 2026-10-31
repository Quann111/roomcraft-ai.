import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { TILE_EDIT, PLAN_EDIT, submitImageToImage, submitTextToImage, submitImageToVideo, queryTask, chatJson, chatText, imagePart, type ChatMessage } from "./runninghub";
import { CITIES, DIRECTIONS } from "./solar";
import { FLOOR_TILES, floorTile } from "./floorTiles";
import { recordCost, llmUsd, modelOf, kindOf, estimateUsd, parseCsv, rhTime } from "./costs";
import { SLABS } from "./slabs";
import { STYLES, ROOM_TYPES, INTERVENTION, SURFACES, PAINT_COLORS, PAINT_FINISHES, WEATHER, REMOVE, ANGLES, PLAN_VIEWS, LOCKED_PLAN_VIEWS, TOOL_IDS, REFERENCE_TOOLS, ITEM_TOOLS, CRITIQUE_TOOLS, CRITIQUE_MODEL, cleanLlmResult, ADVISOR_TOOL, ADVISOR_MODEL, MAX_ADVISOR_TURNS, BUDGETS, advisorSystem, BIZPLAN_TOOL, MAX_PLAN_ROOMS, COMPARE_TOOLS, MAX_COMPARE, VIDEO_TOOLS, VIDEO_COST, MOTIONS, LIGHTING, PLAN_DETECT_PROMPT, FLOOR_SCOUT_PROMPT, cleanFloorScout, type FloorScout, FLOOR_QA_PROMPT, floorQaVerdict, floorRetryNote, type FloorQa, cleanRooms, planRoomPrompt, TEXT_TOOLS, buildPrompt, PLAN_READ_PROMPT, PLAN_POLISH_PROMPT, cleanPlanFacts, type PlanFacts, cleanChanges, cleanFinishes, finishOf, changeSwatches, KITCHEN_SCOUT_PROMPT, cleanKitchenScout, type KitchenScout, SLAB_QA_PROMPT, slabQaVerdict, PALETTE_PROMPT, cleanPalette, roomRedoLines, planQaPrompt, planQaVerdict, roomQaPrompt, roomQaVerdict, type PlanRoom } from "./prompts";

type Env = { DB: D1Database; IMAGES: R2Bucket; ASSETS: Fetcher; DAILY_CREDITS: string; OPEN_ACCESS?: string; RUNNINGHUB_API_KEY?: string; RUNNINGHUB_BASE?: string };
type User = { id: string; email: string; credits: number; credits_refilled_at: number };
type Vars = { user: User };

const ADMIN_EMAILS = ["qquankun@gmail.com", "admin@gmail.com"];
const isAdmin = (u: User) => ADMIN_EMAILS.includes(u.email.toLowerCase());
const DAY = 86_400_000;
const SESSION_TTL = 30 * DAY;
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

/** Runs a background write without delaying the response (falls back to fire-and-forget outside a request context). */
const later = (c: any, p: Promise<unknown>) => { try { c.executionCtx.waitUntil(p); } catch { p.catch(() => {}); } };
/** onUsage callback that records what one LLM call cost. */
const llmCost = (c: any, tool: string, generationId: string | null, userId?: string) => (u: { input: number; output: number }) =>
  later(c, recordCost(c.env.DB, { id: `llm:${crypto.randomUUID()}`, kind: "llm", model: CRITIQUE_MODEL, tool, generationId, userId: userId ?? c.get("user")?.id,
    usd: llmUsd(CRITIQUE_MODEL, u.input, u.output), tokensIn: u.input, tokensOut: u.output }));

/** A swatch image (VICOSTONE tile, VASTA slab) from the static assets. */
async function assetSwatch(c: any, path: string) {
  const r = await c.env.ASSETS.fetch(new URL(path, c.req.url));
  if (!r.ok) throw new Error(`Swatch missing: ${path}`);
  return { bytes: await r.arrayBuffer(), mime: "image/jpeg" };
}
/** A VICOSTONE tile swatch, when the floor material is one of the tiles. Tile jobs run on TILE_EDIT. */
async function tileSwatch(c: any, material: unknown) {
  const tile = floorTile(material);
  return tile ? assetSwatch(c, tile.swatch) : null;
}

const NO_FLOOR = "No bare floor is visible in this photo, so there is nothing to tile. Upload a photo that shows the floor · Ảnh này không thấy rõ mặt sàn nên không lát gạch được. Hãy tải ảnh có thấy mặt sàn";
/**
 * Reads the photo before a tile edit: is there bare floor, is it a close-up, which rugs/people/objects must stay. Takes its own
 * copy of the R2 object (a body can be read once). Returns null when the model is slow or fails, and the edit then runs on
 * the general prompt alone.
 */
async function floorScout(c: any, key: string): Promise<FloorScout | null> {
  const o = await c.env.IMAGES.get(key);
  if (!o) return null;
  const call = chatJson(c.env.RUNNINGHUB_API_KEY, { model: CRITIQUE_MODEL, prompt: FLOOR_SCOUT_PROMPT, image: { bytes: await o.arrayBuffer(), mime: o.httpMetadata?.contentType ?? "image/jpeg" }, onUsage: llmCost(c, "interior-floor", null) })
    .then(cleanFloorScout, () => null);
  // Median ~12 s, but about one photo in ten takes 30-45 s; past 45 s the edit runs without the scout.
  return Promise.race([call, new Promise<null>((r) => setTimeout(() => r(null), 45_000))]);
}

/** Reads a kitchen photo before a VASTA slab edit: is there an island, what stands on the tops, what the backsplash is. */
async function kitchenScout(c: any, key: string): Promise<KitchenScout | null> {
  const o = await c.env.IMAGES.get(key);
  if (!o) return null;
  const call = chatJson(c.env.RUNNINGHUB_API_KEY, { model: CRITIQUE_MODEL, prompt: KITCHEN_SCOUT_PROMPT, image: { bytes: await o.arrayBuffer(), mime: o.httpMetadata?.contentType ?? "image/jpeg" }, onUsage: llmCost(c, "interior-material", null) })
    .then(cleanKitchenScout, () => null);
  return Promise.race([call, new Promise<null>((r) => setTimeout(() => r(null), 45_000))]);
}
const NO_ISLAND = "No kitchen island is visible in this photo. Pick the worktops instead, or upload a photo that shows the island · Ảnh này không thấy đảo bếp. Hãy chọn mặt bàn bếp, hoặc tải ảnh có đảo bếp";

/**
 * Reads a floor plan before a 2D -> 3D render: footprint, every space in order (stairs, elevator, light wells included) and the
 * rooms the floor does not have; the render prompt then enforces them. Null when the model is slow or unsure, and the render
 * runs on the general prompt.
 */
async function planRead(c: any, key: string): Promise<PlanFacts | null> {
  const o = await c.env.IMAGES.get(key);
  if (!o) return null;
  const call = chatJson(c.env.RUNNINGHUB_API_KEY, { model: CRITIQUE_MODEL, prompt: PLAN_READ_PROMPT, image: { bytes: await o.arrayBuffer(), mime: o.httpMetadata?.contentType ?? "image/jpeg" }, onUsage: llmCost(c, "interior-floorplan", null) })
    .then(cleanPlanFacts, () => null);
  // Dense CAD plans take 20-40 s to read.
  return Promise.race([call, new Promise<null>((r) => setTimeout(() => r(null), 60_000))]);
}

/** Plan readings are kept next to the upload, so the render reuses the reading the browser asked for to turn the plan. */
const factsKey = (inputKey: string) => `facts/${inputKey}.json`;
async function cachedPlanFacts(c: any, inputKey: string): Promise<PlanFacts | null> {
  if (typeof inputKey !== "string" || !inputKey.startsWith(`in/${c.get("user").id}/`)) return null;
  return c.env.IMAGES.get(factsKey(inputKey)).then((o: any) => o?.json()).then(cleanPlanFacts, () => null).catch(() => null);
}

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));

/** Fixed-window counter in D1. Returns false once `max` hits in the window are exceeded. */
async function allow(env: Env, key: string, windowMs: number, max: number) {
  const w = Math.floor(Date.now() / windowMs);
  const row = await env.DB.prepare("INSERT INTO rate_limits (k,n,exp) VALUES (?,1,?) ON CONFLICT(k) DO UPDATE SET n=n+1 RETURNING n")
    .bind(`${key}:${w}`, (w + 1) * windowMs).first<{ n: number }>();
  if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM rate_limits WHERE exp<?").bind(Date.now()).run();
  return (row?.n ?? 1) <= max;
}
const ip = (c: any) => c.req.header("cf-connecting-ip") ?? "local";

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
});

async function hashPw(pw: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 100_000 },
    key,
    256,
  );
  return b64(bits);
}

async function createSession(c: any, userId: string) {
  const id = crypto.randomUUID() + crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)")
    .bind(id, userId, Date.now() + SESSION_TTL).run();
  setCookie(c, "sid", id, { httpOnly: true, secure: new URL(c.req.url).protocol === "https:", sameSite: "Lax", path: "/", maxAge: SESSION_TTL / 1000 });
}

/** Lazy daily refill: top up to DAILY_CREDITS once 24h have passed since the last refill. */
async function refillCredits(env: Env, u: User): Promise<User> {
  const max = Number(env.DAILY_CREDITS) || 3;
  const now = Date.now();
  if (now - u.credits_refilled_at < DAY) return u;
  const credits = Math.max(u.credits, max);
  if (credits !== u.credits) {
    await env.DB.prepare("INSERT INTO credit_ledger (user_id,delta,reason,created_at) VALUES (?,?,?,?)")
      .bind(u.id, credits - u.credits, "daily_refill", now).run();
  }
  await env.DB.prepare("UPDATE users SET credits=?, credits_refilled_at=? WHERE id=?").bind(credits, now, u.id).run();
  return { ...u, credits, credits_refilled_at: now };
}

// Temporary open access: visitors without a session act as the shared admin account. Set OPEN_ACCESS="0" to restore login.
async function sharedAdmin(env: Env): Promise<User> {
  const email = "admin@gmail.com";
  const sel = "SELECT id,email,credits,credits_refilled_at FROM users WHERE email=?";
  let row = await env.DB.prepare(sel).bind(email).first();
  if (!row) {
    const now = Date.now();
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    await env.DB.prepare("INSERT OR IGNORE INTO users (id,email,pw_hash,pw_salt,credits,credits_refilled_at,created_at) VALUES (?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), email, await hashPw(crypto.randomUUID(), salt), salt, Number(env.DAILY_CREDITS) || 3, now, now).run();
    row = await env.DB.prepare(sel).bind(email).first();
  }
  return row as User;
}

const requireAuth = async (c: any, next: () => Promise<void>) => {
  const sid = getCookie(c, "sid");
  const row = sid ? await c.env.DB.prepare(
    "SELECT u.id,u.email,u.credits,u.credits_refilled_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?",
  ).bind(sid, Date.now()).first() : null;
  if (!row) {
    if (c.env.OPEN_ACCESS !== "1") return c.json({ error: "unauthorized" }, 401);
    c.set("user", await sharedAdmin(c.env));
    return next();
  }
  c.set("user", await refillCredits(c.env, row as User));
  await next();
};

app.post("/api/auth/signup", async (c) => {
  if (!(await allow(c.env, `signup:${ip(c)}`, 3_600_000, 5))) return c.json({ error: "Too many sign-ups, please try again later · Quá nhiều lần đăng ký, thử lại sau" }, 429);
  const { email, password } = await c.req.json<{ email?: string; password?: string }>().catch(() => ({} as any));
  const e = (email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || (password ?? "").length < 8)
    return c.json({ error: "Invalid email or password shorter than 8 characters · Email không hợp lệ hoặc mật khẩu < 8 ký tự" }, 400);
  if (await c.env.DB.prepare("SELECT 1 FROM users WHERE email=?").bind(e).first())
    return c.json({ error: "Email already registered · Email đã tồn tại" }, 409);
  const id = crypto.randomUUID();
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const now = Date.now();
  await c.env.DB.prepare("INSERT INTO users (id,email,pw_hash,pw_salt,credits,credits_refilled_at,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(id, e, await hashPw(password!, salt), salt, Number(c.env.DAILY_CREDITS) || 3, now, now).run();
  await createSession(c, id);
  return c.json({ id, email: e });
});

app.post("/api/auth/login", async (c) => {
  if (!(await allow(c.env, `login:${ip(c)}`, 600_000, 10))) return c.json({ error: "Too many attempts, try again in 10 minutes · Quá nhiều lần thử, thử lại sau 10 phút" }, 429);
  const { email, password } = await c.req.json<{ email?: string; password?: string }>().catch(() => ({} as any));
  const row: any = await c.env.DB.prepare("SELECT id,pw_hash,pw_salt FROM users WHERE email=?")
    .bind((email ?? "").trim().toLowerCase()).first();
  if (!row || (await hashPw(password ?? "", row.pw_salt)) !== row.pw_hash)
    return c.json({ error: "Wrong email or password · Sai email hoặc mật khẩu" }, 401);
  await createSession(c, row.id);
  return c.json({ ok: true });
});

app.post("/api/auth/logout", async (c) => {
  const sid = getCookie(c, "sid");
  if (sid) await c.env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(sid).run();
  deleteCookie(c, "sid", { path: "/" });
  return c.json({ ok: true });
});

app.get("/api/me", requireAuth, (c) => {
  const u = c.get("user");
  return c.json({ id: u.id, email: u.email, credits: u.credits, unlimited: isAdmin(u), nextRefillAt: u.credits_refilled_at + DAY });
});

// ---------- Phase 2: generation ----------
const MAX_UPLOAD = 10 * 1024 * 1024;
const MIMES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const ASPECTS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5", "21:9"];
const RES = ["1k", "2k", "4k"] as const;
const RES_COST: Record<string, number> = { "1k": 1, "2k": 2, "4k": 3 };

app.get("/api/styles", (c) => c.json({ styles: STYLES.map(({ slug, name, scope, img, photo }) => ({ slug, name, scope, thumb: img ? `https://drive.google.com/thumbnail?id=${img}&sz=w600` : photo ? `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=600&q=80` : undefined })), roomTypes: ROOM_TYPES, intervention: INTERVENTION, surfaces: SURFACES, paints: PAINT_COLORS, finishes: PAINT_FINISHES, weather: WEATHER, remove: REMOVE, angles: ANGLES, planViews: PLAN_VIEWS, lockedPlanViews: LOCKED_PLAN_VIEWS, floorTiles: FLOOR_TILES.map(({ code, name, swatch, room }) => ({ code, name, thumb: swatch.replace(".jpg", "-thumb.jpg"), room: room ? swatch.replace(".jpg", "-room.jpg") : undefined })), slabs: SLABS.map(({ code, name, title, thumb }) => ({ code, name, title, thumb })), budgets: BUDGETS, motions: MOTIONS, lighting: LIGHTING, cities: CITIES.map((c) => c.name), directions: DIRECTIONS }));

app.post("/api/upload", requireAuth, async (c) => {
  const mime = (c.req.header("content-type") ?? "").split(";")[0];
  const ext = MIMES[mime];
  if (!ext) return c.json({ error: "Only JPG, PNG and WebP are supported · Chỉ hỗ trợ JPG, PNG, WebP" }, 400);
  const body = await c.req.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX_UPLOAD) return c.json({ error: "Image must be 10MB or smaller · Ảnh tối đa 10MB" }, 400);
  const key = `in/${c.get("user").id}/${crypto.randomUUID()}.${ext}`;
  await c.env.IMAGES.put(key, body, { httpMetadata: { contentType: mime } });
  return c.json({ key });
});

app.post("/api/generate", requireAuth, async (c) => {
  const u = c.get("user");
  const b = await c.req.json<any>().catch(() => ({}));
  if (!c.env.RUNNINGHUB_API_KEY) return c.json({ error: "Server is missing RUNNINGHUB_API_KEY · Server chưa cấu hình RUNNINGHUB_API_KEY" }, 500);
  const textOnly = TEXT_TOOLS.includes(b.tool);
  // A material edit of a room in a Business 3D Floorplan run: the room's render is the input and the result joins that run
  // as a new version of the room (it keeps the room's plan facts, so a later redraw still works).
  let fromRun: any = null;
  if (b.planRun && (b.tool === "interior-material" || b.tool === "interior-floor")) {
    const src: any = await c.env.DB.prepare("SELECT params,output_key FROM generations WHERE id=? AND user_id=? AND status='SUCCESS' AND output_key IS NOT NULL").bind(String(b.planRun.id ?? ""), u.id).first();
    const sp = src ? JSON.parse(src.params) : null;
    if (!sp || !sp.batchId || sp.batchId !== b.planRun.batchId) return c.json({ error: "Room not found · Không tìm thấy phòng" }, 404);
    fromRun = { batchId: sp.batchId, roomType: sp.roomType, room: sp.room, cropKey: sp.cropKey, home: sp.home, styleSlug: sp.styleSlug, editOf: String(b.planRun.id) };
    b.inputKey = src.output_key;
  }
  if (!textOnly && (typeof b.inputKey !== "string" || !(b.inputKey.startsWith(`in/${u.id}/`) || (fromRun && b.inputKey.startsWith(`out/${u.id}/`))))) return c.json({ error: "Invalid input image · Ảnh đầu vào không hợp lệ" }, 400);
  if (!isAdmin(u) && !(await allow(c.env, `gen:${u.id}`, 3_600_000, 20))) return c.json({ error: "Limit is 20 generations per hour · Tối đa 20 lượt tạo mỗi giờ" }, 429);
  const busy = await c.env.DB.prepare("SELECT COUNT(*) n FROM generations WHERE user_id=? AND status IN ('QUEUED','RUNNING') AND created_at>?").bind(u.id, Date.now() - 600_000).first<{ n: number }>();
  if ((busy?.n ?? 0) >= 3) return c.json({ error: "3 images are already processing, wait for them to finish · Đang có 3 ảnh xử lý, hãy chờ xong rồi tạo tiếp" }, 429);
  const critique = CRITIQUE_TOOLS.includes(b.tool); // answered by the LLM as text: always 1 credit
  const resolution = !critique && RES.includes(b.resolution) ? b.resolution : "1k";
  const aspectRatio = ASPECTS.includes(b.aspectRatio) ? b.aspectRatio : undefined;
  let prompt: string;
  if (!(TOOL_IDS as readonly string[]).includes(b.tool)) return c.json({ error: "Invalid tool · Tool không hợp lệ" }, 400);
  if (b.tool === "exterior-orient-render") {
    // The illustration is driven by the stored analysis, so the client cannot inject its own prompt.
    const src: any = await c.env.DB.prepare("SELECT params,input_key,output_key FROM generations WHERE id=? AND user_id=? AND tool='exterior-orient' AND status='SUCCESS'").bind(String(b.sourceId ?? ""), u.id).first();
    const analysis: any = src ? await c.env.IMAGES.get(src.output_key).then((o) => o?.json()).catch(() => null) : null;
    if (!analysis) return c.json({ error: "Run the orientation analysis first · Hãy phân tích hướng trước" }, 400);
    const sp = JSON.parse(src.params);
    Object.assign(b, { brief: analysis.renderBrief, kind: sp.kind, facing: sp.facing, inputKey: src.input_key, custom: undefined });
  }
  delete b.plan; // plan facts only ever come from planRead below
  try { prompt = buildPrompt(b.tool, b); } catch (e: any) { return c.json({ error: e.message }, 400); }
  const obj = textOnly ? null : await c.env.IMAGES.get(b.inputKey);
  if (!textOnly && !obj) return c.json({ error: "Image not found · Không tìm thấy ảnh" }, 400);
  const needsRef = REFERENCE_TOOLS.includes(b.tool);
  if (needsRef && (typeof b.refKey !== "string" || !b.refKey.startsWith(`in/${u.id}/`))) return c.json({ error: "Upload a style reference image · Hãy tải ảnh tham khảo phong cách" }, 400);
  const ref = needsRef ? await c.env.IMAGES.get(b.refKey) : null;
  if (needsRef && !ref) return c.json({ error: "Reference image not found · Không tìm thấy ảnh tham khảo" }, 400);
  const needsItems = ITEM_TOOLS.includes(b.tool); // buildPrompt above already checked there are 1–MAX_ITEMS
  if (needsItems && !b.itemKeys.every((k: unknown) => typeof k === "string" && k.startsWith(`in/${u.id}/`))) return c.json({ error: "Invalid item image · Ảnh đồ vật không hợp lệ" }, 400);
  const items = needsItems ? await Promise.all((b.itemKeys as string[]).map((k) => c.env.IMAGES.get(k))) : [];
  if (items.some((o) => !o)) return c.json({ error: "Item image not found · Không tìm thấy ảnh đồ vật" }, 400);
  // Material Swap edits sent as `changes`: several surfaces at once, or one VASTA slab (slabs and tiles always run on GPT).
  const changes = b.tool === "interior-material" && b.changes ? cleanChanges(b.changes, 1) : null;
  if (changes) b.changes = changes;
  const tileMaterial = b.tool === "interior-floor" ? b.material : changes?.floor;
  const slabEdit = !!changes && changeSwatches(changes).some((x) => x.includes("/slabs/"));
  // Tiles and slabs: read the photo first (before charging) so the edit knows what to keep, and refuse photos without floor or island.
  let [scout, kitchen] = await Promise.all([
    floorTile(tileMaterial) && (b.tool === "interior-floor" || changes) ? floorScout(c, b.inputKey) : null,
    slabEdit ? kitchenScout(c, b.inputKey) : null,
  ]);
  // Nothing to change: a lone edit is refused; a combined edit skips that surface and changes the others.
  const skipped: string[] = [];
  if (scout && !scout.bare_floor_visible) {
    if (!changes || Object.keys(changes).length === 1) return c.json({ error: NO_FLOOR }, 422);
    delete changes.floor; skipped.push("floor"); scout = null;
  }
  if (kitchen && changes?.island && !kitchen.island) {
    if (Object.keys(changes).length === 1) return c.json({ error: NO_ISLAND }, 422);
    delete changes.island; skipped.push("island");
  }
  const tileUsed = changes ? changes.floor : tileMaterial;
  if (skipped.length || scout || kitchen) prompt = buildPrompt(b.tool, { ...b, scout, kitchen });
  const floorplan = b.tool === "interior-floorplan";
  // The browser usually asked for the reading already (/api/floorplan/read) to turn the plan; reuse it, else read now.
  const plan = floorplan ? await cachedPlanFacts(c, b.inputKey) ?? await planRead(c, b.inputKey) : null;
  // Perspective view: the camera wall guide the browser drew (image 1), the upright plan as image 2.
  const guide = floorplan && plan && b.view !== "top-down" ? await ownImage(c, b.guideKey) : null;
  if (plan) prompt = buildPrompt(b.tool, { ...b, plan, guide: !!guide });

  const video = VIDEO_TOOLS.includes(b.tool);
  const cost = isAdmin(u) ? 0 : video ? VIDEO_COST : RES_COST[resolution]; // admin: unlimited, no credits charged
  const id = crypto.randomUUID();
  const now = Date.now();
  const paid = await c.env.DB.prepare("UPDATE users SET credits=credits-? WHERE id=? AND credits>=?").bind(cost, u.id, cost).run();
  if (!paid.meta.changes) return c.json({ error: "Out of credits. Credits refill after 24 hours. · Hết credits. Credits được nạp lại sau 24 giờ." }, 402);
  const refund = (reason: string) => c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET credits=credits+? WHERE id=?").bind(cost, u.id),
    c.env.DB.prepare("INSERT INTO credit_ledger (user_id,delta,reason,generation_id,created_at) VALUES (?,?,?,?,?)").bind(u.id, cost, reason, id, Date.now()),
  ]);
  await c.env.DB.prepare("INSERT INTO credit_ledger (user_id,delta,reason,generation_id,created_at) VALUES (?,?,?,?,?)").bind(u.id, -cost, "generate", id, now).run();
  try {
    if (critique) {
      const result = cleanLlmResult(b.tool, await chatJson(c.env.RUNNINGHUB_API_KEY, { model: CRITIQUE_MODEL, prompt, image: { bytes: await obj!.arrayBuffer(), mime: obj!.httpMetadata?.contentType ?? "image/jpeg" }, onUsage: llmCost(c, b.tool, id) }));
      const outKey = `out/${u.id}/${id}.json`;
      await c.env.IMAGES.put(outKey, JSON.stringify(result), { httpMetadata: { contentType: "application/json" } });
      await c.env.DB.prepare("INSERT INTO generations (id,user_id,tool,params,prompt,status,input_key,output_key,cost,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(id, u.id, b.tool, JSON.stringify({ roomType: b.roomType, lang: b.lang === "vi" ? "vi" : "en", kind: b.kind, facing: b.facing, city: b.city, resolution }), prompt, "SUCCESS", b.inputKey, outKey, cost, now).run();
      return c.json({ id, status: "SUCCESS" });
    }
    const images = guide ? [guide, obj!] : obj ? [obj, ...(ref ? [ref] : []), ...items.map((o) => o!)] : [];
    const swatches = changes ? await Promise.all(changeSwatches(changes).map((p) => assetSwatch(c, p))) : b.tool === "interior-floor" ? [await tileSwatch(c, tileUsed)].filter((x) => !!x) as Img[] : [];
    const swatch = swatches.length > 0;
    const taskId = video
      ? await submitImageToVideo(c.env.RUNNINGHUB_API_KEY, { image: { bytes: await obj!.arrayBuffer(), mime: obj!.httpMetadata?.contentType ?? "image/jpeg" }, prompt, aspectRatio: ["9:16", "2:3", "3:4", "4:5"].includes(aspectRatio ?? "") ? "9:16" : "16:9" }, c.env.RUNNINGHUB_BASE)
      : textOnly
      ? await submitTextToImage(c.env.RUNNINGHUB_API_KEY, { prompt, aspectRatio: aspectRatio ?? "16:9", resolution }, c.env.RUNNINGHUB_BASE)
      : await submitImageToImage(c.env.RUNNINGHUB_API_KEY, {
        images: [...await Promise.all(images.map(async (o) => ({ bytes: await o.arrayBuffer(), mime: o.httpMetadata?.contentType ?? "image/jpeg" }))), ...swatches],
        prompt, aspectRatio: guide ? "16:9" : swatch || floorplan || changes ? aspectRatio ?? "4:3" : aspectRatio, resolution, model: swatch || changes ? TILE_EDIT : floorplan ? PLAN_EDIT : undefined,
      }, c.env.RUNNINGHUB_BASE);
    await c.env.DB.prepare("INSERT INTO generations (id,user_id,tool,params,prompt,status,rh_task_id,input_key,cost,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(id, u.id, b.tool, JSON.stringify({ styleSlug: b.styleSlug, roomType: b.roomType, intervention: b.intervention, surface: changes ? undefined : b.surface, material: changes ? undefined : b.material, changes: changes ?? undefined, finishes: changes ? cleanFinishes(b.finishes, changes) : undefined, skipped: skipped.length ? skipped : undefined, ...(fromRun ? { ...fromRun, planRoom: true } : {}), weather: b.weather, remove: b.remove, angle: b.angle, view: b.view, motion: video ? b.motion : undefined, lighting: b.tool === "interior-lighting" ? b.lighting : undefined, sourceId: b.tool === "exterior-orient-render" ? b.sourceId : undefined, scout: scout ?? undefined, kitchen: kitchen ?? undefined, plan: plan ?? undefined, guideKey: guide ? b.guideKey : undefined, polish: guide ? true : undefined, engine: floorplan || changes ? "gpt25" : undefined, autoCheck: (swatch || plan) && b.autoCheck === true ? true : undefined, color: b.color, finish: finishOf(b.finish) ?? undefined, refKey: needsRef ? b.refKey : undefined, itemKeys: needsItems ? b.itemKeys : undefined, description: textOnly ? String(b.description ?? "").trim().slice(0, 1000) : undefined, resolution, aspectRatio }), prompt, "RUNNING", taskId, textOnly ? null : b.inputKey, cost, now).run();
    return c.json({ id, status: "RUNNING" });
  } catch (e: any) {
    await refund("refund_submit_failed");
    return c.json({ error: `Could not submit request: ${e.message} · Không gửi được yêu cầu: ${e.message}` }, 502);
  }
});

// 2D -> 3D: read the plan (free) so the browser can crop it and project it through a camera before the render.
app.post("/api/floorplan/read", requireAuth, async (c) => {
  const u = c.get("user");
  const b = await c.req.json<any>().catch(() => ({}));
  if (!c.env.RUNNINGHUB_API_KEY) return c.json({ error: "Server is missing RUNNINGHUB_API_KEY · Server chưa cấu hình RUNNINGHUB_API_KEY" }, 500);
  if (typeof b.inputKey !== "string" || !b.inputKey.startsWith(`in/${u.id}/`)) return c.json({ error: "Invalid input image · Ảnh đầu vào không hợp lệ" }, 400);
  if (!isAdmin(u) && !(await allow(c.env, `plan:${u.id}`, 3_600_000, 30))) return c.json({ error: "Limit is 30 plan scans per hour · Tối đa 30 lần đọc mặt bằng mỗi giờ" }, 429);
  const facts = await cachedPlanFacts(c, b.inputKey) ?? await planRead(c, b.inputKey);
  if (facts) await c.env.IMAGES.put(factsKey(b.inputKey), JSON.stringify(facts), { httpMetadata: { contentType: "application/json" } });
  return c.json({ crop: facts?.crop ?? null, read: !!facts, longM: facts ? Math.max(facts.length, facts.depth) : undefined });
});

// ---------- Business 3D Floorplan: detect rooms, then one render per room ----------
const ownImage = async (c: any, key: unknown) =>
  typeof key === "string" && key.startsWith(`in/${c.get("user").id}/`) ? await c.env.IMAGES.get(key) : null;

app.post("/api/bizplan/detect", requireAuth, async (c) => {
  const u = c.get("user");
  const b = await c.req.json<any>().catch(() => ({}));
  if (!c.env.RUNNINGHUB_API_KEY) return c.json({ error: "Server is missing RUNNINGHUB_API_KEY · Server chưa cấu hình RUNNINGHUB_API_KEY" }, 500);
  if (!isAdmin(u) && !(await allow(c.env, `plan:${u.id}`, 3_600_000, 30))) return c.json({ error: "Limit is 30 plan scans per hour · Tối đa 30 lần đọc mặt bằng mỗi giờ" }, 429);
  const plan = await ownImage(c, b.inputKey);
  if (!plan) return c.json({ error: "Upload a floor plan first · Hãy tải mặt bằng lên trước" }, 400);
  try {
    const r = await chatJson(c.env.RUNNINGHUB_API_KEY, { model: CRITIQUE_MODEL, prompt: PLAN_DETECT_PROMPT, image: { bytes: await plan.arrayBuffer(), mime: plan.httpMetadata?.contentType ?? "image/jpeg" }, onUsage: llmCost(c, BIZPLAN_TOOL, null) });
    const rooms = cleanRooms(r?.rooms);
    if (!rooms.length) return c.json({ error: "No rooms found — is this a floor plan? · Không tìm thấy phòng nào — ảnh này có phải mặt bằng không?" }, 422);
    return c.json({ home: String(r?.home ?? "").trim().slice(0, 200), rooms });
  } catch (e: any) {
    return c.json({ error: `Could not read the plan: ${e.message} · Không đọc được mặt bằng: ${e.message}` }, 502);
  }
});

type Job = { prompt: string; params: Record<string, unknown>; label: string; extra?: { bytes: ArrayBuffer; mime: string }[]; model?: string };
/**
 * Several generations from one uploaded image in a single request (Business 3D Floorplan, material comparison).
 * Credits for every job are charged up front; a job whose submission fails is refunded at once. Each job becomes a
 * normal generation row, so polling, refunds on failure, downloads and history work as for single generations.
 */
async function runBatch(c: any, o: { tool: string; inputKey: string; image: { bytes: ArrayBuffer; mime: string }; jobs: Job[]; each: number; resolution: "1k" | "2k" | "4k"; aspectRatio?: string; batchId?: string }) {
  const u = c.get("user");
  if (!isAdmin(u)) for (const _ of o.jobs) if (!(await allow(c.env, `gen:${u.id}`, 3_600_000, 20))) return { error: "Limit is 20 generations per hour · Tối đa 20 lượt tạo mỗi giờ", status: 429 as const };
  const total = o.each * o.jobs.length;
  const paid = await c.env.DB.prepare("UPDATE users SET credits=credits-? WHERE id=? AND credits>=?").bind(total, u.id, total).run();
  if (!paid.meta.changes) return { error: `This needs ${total} credits · Cần ${total} credit`, status: 402 as const };
  const batchId = o.batchId ?? crypto.randomUUID(); // a redraw joins the run it came from
  const items = await Promise.all(o.jobs.map(async (job) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    await c.env.DB.prepare("INSERT INTO credit_ledger (user_id,delta,reason,generation_id,created_at) VALUES (?,?,?,?,?)").bind(u.id, -o.each, "generate", id, now).run();
    try {
      const taskId = await submitImageToImage(c.env.RUNNINGHUB_API_KEY!, { images: [o.image, ...(job.extra ?? [])], prompt: job.prompt, aspectRatio: job.model ? o.aspectRatio ?? "4:3" : o.aspectRatio, model: job.model, resolution: o.resolution }, c.env.RUNNINGHUB_BASE);
      await c.env.DB.prepare("INSERT INTO generations (id,user_id,tool,params,prompt,status,rh_task_id,input_key,cost,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(id, u.id, o.tool, JSON.stringify({ ...job.params, batchId, resolution: o.resolution, aspectRatio: o.aspectRatio }), job.prompt, "RUNNING", taskId, o.inputKey, o.each, now).run();
      return { id, label: job.label };
    } catch (e: any) {
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE users SET credits=credits+? WHERE id=?").bind(o.each, u.id),
        c.env.DB.prepare("INSERT INTO credit_ledger (user_id,delta,reason,generation_id,created_at) VALUES (?,?,?,?,?)").bind(u.id, o.each, "refund_submit_failed", id, Date.now()),
      ]);
      return { label: job.label, error: e.message as string };
    }
  }));
  return { batchId, items };
}

// Charges 1 credit per room up front; each room is a normal generation.
app.post("/api/bizplan/render", requireAuth, async (c) => {
  const u = c.get("user");
  const b = await c.req.json<any>().catch(() => ({}));
  if (!c.env.RUNNINGHUB_API_KEY) return c.json({ error: "Server is missing RUNNINGHUB_API_KEY · Server chưa cấu hình RUNNINGHUB_API_KEY" }, 500);
  const rooms = cleanRooms(b.rooms);
  if (!rooms.length || (Array.isArray(b.rooms) && b.rooms.length > MAX_PLAN_ROOMS)) return c.json({ error: `Pick 1–${MAX_PLAN_ROOMS} rooms · Chọn 1–${MAX_PLAN_ROOMS} phòng` }, 400);
  const home = String(b.home ?? "").trim().slice(0, 200);
  // The browser cuts each room's part of the plan from the detector's box and uploads it; a room without one uses the whole plan.
  const crops = await Promise.all((b.rooms as any[]).slice(0, rooms.length).map(async (r) => {
    const o = await ownImage(c, r?.cropKey);
    return o ? { key: r.cropKey as string, img: { bytes: await o.arrayBuffer(), mime: o.httpMetadata?.contentType ?? "image/jpeg" } } : null;
  }));
  let jobs: Job[];
  try {
    jobs = rooms.map((r, i) => ({
      prompt: planRoomPrompt(b.styleSlug, r, home, !!crops[i]), label: r.name, model: PLAN_EDIT, extra: crops[i] ? [crops[i]!.img] : undefined,
      params: { styleSlug: b.styleSlug, roomType: r.name, engine: "gpt25", room: r, home, cropKey: crops[i]?.key, autoCheck: b.autoCheck === true ? true : undefined },
    }));
  } catch (e: any) { return c.json({ error: e.message }, 400); }
  const plan = await ownImage(c, b.inputKey);
  if (!plan) return c.json({ error: "Upload a floor plan first · Hãy tải mặt bằng lên trước" }, 400);
  const r = await runBatch(c, {
    tool: BIZPLAN_TOOL, inputKey: b.inputKey, image: { bytes: await plan.arrayBuffer(), mime: plan.httpMetadata?.contentType ?? "image/jpeg" },
    jobs, each: isAdmin(u) ? 0 : 1, resolution: "1k", aspectRatio: ASPECTS.includes(b.aspectRatio) ? b.aspectRatio : "4:3",
  });
  if ("error" in r) return c.json({ error: r.error }, r.status);
  return c.json({ batchId: r.batchId, items: r.items.map(({ label, ...x }) => ({ ...x, room: label })) });
});

// ---------- Business 3D Floorplan: one run (all rooms and their redraws) and redrawing chosen rooms ----------
async function runRows(c: any, batchId: string): Promise<any[]> {
  const r = await c.env.DB.prepare(
    // Renders, redraws and material edits of the run (edits are other tools, so the batch id alone selects the run).
    "SELECT id,tool,params,status,error,input_key,output_key,created_at FROM generations WHERE user_id=? AND json_extract(params,'$.batchId')=? AND (tool=? OR json_extract(params,'$.planRoom')=1) ORDER BY created_at",
  ).bind(c.get("user").id, batchId, BIZPLAN_TOOL).all();
  return r.results;
}

app.get("/api/bizplan/run/:batchId", requireAuth, async (c) => {
  const rows = await runRows(c, c.req.param("batchId"));
  return c.json({ items: rows.map((g) => ({ id: g.id, params: JSON.parse(g.params), status: g.status, error: g.error, createdAt: g.created_at,
    inputUrl: g.input_key ? `/api/images/${g.input_key}` : null, outputUrl: g.output_key ? `/api/images/${g.output_key}` : null })) });
});

/**
 * Redraws chosen rooms of a run, 1 credit each, as new generations in the same batch (older versions stay). Each redraw reuses the
 * room's stored plan facts and crop, gets the user's note, and is shown a reference room from the run (the user's pick, else the
 * living room or the first finished room) plus Gemini's list of that room's finishes, so it matches the rest of the home.
 */
app.post("/api/bizplan/redo", requireAuth, async (c) => {
  const u = c.get("user");
  const b = await c.req.json<any>().catch(() => ({}));
  if (!c.env.RUNNINGHUB_API_KEY) return c.json({ error: "Server is missing RUNNINGHUB_API_KEY · Server chưa cấu hình RUNNINGHUB_API_KEY" }, 500);
  const rows = typeof b.batchId === "string" ? await runRows(c, b.batchId) : [];
  if (!rows.length) return c.json({ error: "Render run not found · Không tìm thấy lần render" }, 404);
  const byId = new Map<string, any>(rows.map((g) => [g.id, { ...g, p: JSON.parse(g.params) }]));
  const asked: { id: string; note: string }[] = (Array.isArray(b.rooms) ? b.rooms : []).slice(0, MAX_PLAN_ROOMS)
    .map((r: any) => ({ id: String(r?.id ?? ""), note: String(r?.note ?? "").trim().slice(0, 300) })).filter((r: any) => byId.has(r.id));
  if (!asked.length) return c.json({ error: "Pick the rooms to redraw · Hãy chọn phòng cần vẽ lại" }, 400);
  const done = (g: any) => g && g.status === "SUCCESS" && g.output_key;
  const redoing = new Set(asked.map((r) => byId.get(r.id)!.p.roomType));
  const candidates = [...byId.values()].filter((g) => done(g) && !redoing.has(g.p.roomType));
  const ref = (typeof b.refId === "string" && done(byId.get(b.refId)) ? byId.get(b.refId) : null)
    ?? candidates.find((g) => /living|khách/i.test(String(g.p.roomType))) ?? candidates[0] ?? null;
  const first = rows[0];
  const plan = await c.env.IMAGES.get(first.input_key);
  if (!plan) return c.json({ error: "Floor plan image not found · Không tìm thấy ảnh mặt bằng" }, 400);
  const refImg = ref ? await c.env.IMAGES.get(ref.output_key).then(async (o: any) => o && { bytes: await o.arrayBuffer(), mime: o.httpMetadata?.contentType ?? "image/png" }) : null;
  const palette = refImg ? await Promise.race([
    chatJson(c.env.RUNNINGHUB_API_KEY, { model: CRITIQUE_MODEL, prompt: PALETTE_PROMPT, image: refImg, onUsage: llmCost(c, BIZPLAN_TOOL, null) }).then(cleanPalette, () => null),
    new Promise<null>((r) => setTimeout(() => r(null), 40_000)),
  ]) : null;
  let jobs: Job[];
  try {
    jobs = await Promise.all(asked.map(async ({ id, note }) => {
      const g = byId.get(id)!, p = g.p;
      const room = p.room ?? { name: String(p.roomType ?? ""), view: "" };
      const crop = p.cropKey ? await c.env.IMAGES.get(p.cropKey).then(async (o: any) => o && { bytes: await o.arrayBuffer(), mime: o.httpMetadata?.contentType ?? "image/jpeg" }) : null;
      const extra = [...(crop ? [crop] : []), ...(refImg ? [refImg] : [])];
      const prompt = `${planRoomPrompt(p.styleSlug, room, String(p.home ?? ""), !!crop)} ${roomRedoLines({ room: `${p.roomType ?? ""} ${room.name}`, refIndex: refImg ? extra.length + 1 : undefined, palette, note })}`.trim();
      return { prompt, label: String(p.roomType ?? room.name), model: PLAN_EDIT, extra,
        params: { styleSlug: p.styleSlug, roomType: p.roomType, engine: "gpt25", room, home: p.home, cropKey: p.cropKey, redoOf: id, refId: ref?.id, note: note || undefined, autoCheck: b.autoCheck === true ? true : undefined } };
    }));
  } catch (e: any) { return c.json({ error: e.message }, 400); }
  const r = await runBatch(c, {
    tool: BIZPLAN_TOOL, inputKey: first.input_key, image: { bytes: await plan.arrayBuffer(), mime: plan.httpMetadata?.contentType ?? "image/jpeg" },
    jobs, each: isAdmin(u) ? 0 : 1, resolution: "1k", aspectRatio: first.params ? JSON.parse(first.params).aspectRatio ?? "4:3" : "4:3", batchId: b.batchId,
  });
  if ("error" in r) return c.json({ error: r.error }, r.status);
  return c.json({ batchId: r.batchId, refId: ref?.id ?? null, items: r.items.map(({ label, ...x }) => ({ ...x, room: label })) });
});

// Material comparison: the same photo with 2–MAX_COMPARE materials on one surface, one generation each.
app.post("/api/compare", requireAuth, async (c) => {
  const u = c.get("user");
  const b = await c.req.json<any>().catch(() => ({}));
  if (!c.env.RUNNINGHUB_API_KEY) return c.json({ error: "Server is missing RUNNINGHUB_API_KEY · Server chưa cấu hình RUNNINGHUB_API_KEY" }, 500);
  if (!COMPARE_TOOLS.includes(b.tool)) return c.json({ error: "Invalid tool · Tool không hợp lệ" }, 400);
  const materials: string[] = Array.isArray(b.materials) ? [...new Set<string>(b.materials.map(String))] : [];
  if (materials.length < 2 || materials.length > MAX_COMPARE) return c.json({ error: `Pick 2–${MAX_COMPARE} materials · Chọn 2–${MAX_COMPARE} vật liệu` }, 400);
  const surface = b.tool === "interior-floor" ? "floor" : b.surface;
  let jobs: Job[];
  try { jobs = materials.map((m) => ({ prompt: buildPrompt(b.tool, { surface, material: m, custom: b.custom }), params: { surface, material: m }, label: m })); } catch (e: any) { return c.json({ error: e.message }, 400); }
  const photo = await ownImage(c, b.inputKey);
  if (!photo) return c.json({ error: "Invalid input image · Ảnh đầu vào không hợp lệ" }, 400);
  if (b.tool === "interior-floor" && materials.some((m) => floorTile(m))) {
    const scout = await floorScout(c, b.inputKey); // once for the photo, shared by every tile in the comparison
    if (scout && !scout.bare_floor_visible) return c.json({ error: NO_FLOOR }, 422);
    for (const job of jobs) {
      const s = await tileSwatch(c, job.label);
      if (!s) continue;
      Object.assign(job, { extra: [s], model: TILE_EDIT });
      if (b.autoCheck === true) job.params = { ...job.params, autoCheck: true };
      if (scout) Object.assign(job, { prompt: buildPrompt(b.tool, { surface, material: job.label, custom: b.custom, scout }), params: { ...job.params, scout } });
      if (b.autoCheck === true) job.params = { ...job.params, autoCheck: true };
    }
  }
  const resolution = RES.includes(b.resolution) ? b.resolution : "1k";
  const r = await runBatch(c, {
    tool: b.tool, inputKey: b.inputKey, image: { bytes: await photo.arrayBuffer(), mime: photo.httpMetadata?.contentType ?? "image/jpeg" },
    jobs, each: isAdmin(u) ? 0 : RES_COST[resolution], resolution, aspectRatio: ASPECTS.includes(b.aspectRatio) ? b.aspectRatio : undefined,
  });
  if ("error" in r) return c.json({ error: r.error }, r.status);
  return c.json({ batchId: r.batchId, items: r.items.map(({ label, ...x }) => ({ ...x, material: label })) });
});

// ---------- Design Advisor: a chat whose transcript lives in R2 ----------
// The first message opens a conversation (1 credit, MAX_ADVISOR_TURNS questions); later messages pass its id.
type Turn = { role: "user" | "assistant"; text: string };
app.post("/api/advisor", requireAuth, async (c) => {
  const u = c.get("user");
  const b = await c.req.json<any>().catch(() => ({}));
  if (!c.env.RUNNINGHUB_API_KEY) return c.json({ error: "Server is missing RUNNINGHUB_API_KEY · Server chưa cấu hình RUNNINGHUB_API_KEY" }, 500);
  const message = String(b.message ?? "").trim().slice(0, 1000);
  if (message.length < 2) return c.json({ error: "Type a question · Hãy nhập câu hỏi" }, 400);
  if (!isAdmin(u) && !(await allow(c.env, `chat:${u.id}`, 3_600_000, 60))) return c.json({ error: "Limit is 60 messages per hour · Tối đa 60 tin nhắn mỗi giờ" }, 429);

  let row: any = null, turns: Turn[] = [], opts: any = {};
  if (b.id) {
    row = await c.env.DB.prepare("SELECT * FROM generations WHERE id=? AND user_id=? AND tool=?").bind(String(b.id), u.id, ADVISOR_TOOL).first();
    if (!row) return c.json({ error: "Conversation not found · Không tìm thấy cuộc trò chuyện" }, 404);
    turns = ((await c.env.IMAGES.get(row.output_key).then((o) => o?.json()).catch(() => null)) as any)?.messages ?? [];
    opts = JSON.parse(row.params);
    if (turns.filter((t) => t.role === "user").length >= MAX_ADVISOR_TURNS) return c.json({ error: `This conversation reached ${MAX_ADVISOR_TURNS} questions — start a new one · Cuộc trò chuyện đã đủ ${MAX_ADVISOR_TURNS} câu hỏi — hãy bắt đầu cuộc mới` }, 429);
  } else {
    if (b.inputKey != null && (typeof b.inputKey !== "string" || !b.inputKey.startsWith(`in/${u.id}/`))) return c.json({ error: "Invalid input image · Ảnh đầu vào không hợp lệ" }, 400);
    opts = { lang: b.lang === "vi" ? "vi" : "en", roomType: ROOM_TYPES.includes(b.roomType) ? b.roomType : undefined, budget: BUDGETS.includes(b.budget) ? b.budget : undefined };
  }
  const inputKey: string | null = row ? row.input_key : b.inputKey ?? null;
  const photo = inputKey ? await c.env.IMAGES.get(inputKey) : null;
  if (inputKey && !photo) return c.json({ error: "Image not found · Không tìm thấy ảnh" }, 400);

  // A new conversation is paid up front and refunded if the first answer fails.
  const id = row?.id ?? crypto.randomUUID();
  const cost = row || isAdmin(u) ? 0 : 1;
  if (cost) {
    const paid = await c.env.DB.prepare("UPDATE users SET credits=credits-? WHERE id=? AND credits>=?").bind(cost, u.id, cost).run();
    if (!paid.meta.changes) return c.json({ error: "Out of credits. Credits refill after 24 hours. · Hết credits. Credits được nạp lại sau 24 giờ." }, 402);
    await c.env.DB.prepare("INSERT INTO credit_ledger (user_id,delta,reason,generation_id,created_at) VALUES (?,?,?,?,?)").bind(u.id, -cost, "advisor", id, Date.now()).run();
  }
  try {
    const all: Turn[] = [...turns, { role: "user", text: message }];
    const img = photo ? imagePart({ bytes: await photo.arrayBuffer(), mime: photo.httpMetadata?.contentType ?? "image/jpeg" }) : null;
    const messages: ChatMessage[] = [
      { role: "system", content: advisorSystem({ ...opts, hasPhoto: !!img }) },
      ...all.map((t, i): ChatMessage => (i === 0 && t.role === "user" && img ? { role: "user", content: [{ type: "text", text: t.text }, img] } : { role: t.role, content: t.text })),
    ];
    const reply = (await chatText(c.env.RUNNINGHUB_API_KEY, { model: ADVISOR_MODEL, messages, onUsage: llmCost(c, ADVISOR_TOOL, id) })).slice(0, 4000);
    all.push({ role: "assistant", text: reply });
    const outKey = row?.output_key ?? `out/${u.id}/${id}.json`;
    await c.env.IMAGES.put(outKey, JSON.stringify({ messages: all }), { httpMetadata: { contentType: "application/json" } });
    if (!row)
      await c.env.DB.prepare("INSERT INTO generations (id,user_id,tool,params,prompt,status,input_key,output_key,cost,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(id, u.id, ADVISOR_TOOL, JSON.stringify(opts), message, "SUCCESS", inputKey, outKey, cost, Date.now()).run();
    return c.json({ id, reply, turnsLeft: MAX_ADVISOR_TURNS - all.filter((t) => t.role === "user").length });
  } catch (e: any) {
    if (cost) await c.env.DB.batch([
      c.env.DB.prepare("UPDATE users SET credits=credits+? WHERE id=?").bind(cost, u.id),
      c.env.DB.prepare("INSERT INTO credit_ledger (user_id,delta,reason,generation_id,created_at) VALUES (?,?,?,?,?)").bind(u.id, cost, "refund_advisor_failed", id, Date.now()),
    ]);
    return c.json({ error: `The advisor could not answer: ${e.message} · Trợ lý chưa trả lời được: ${e.message}` }, 502);
  }
});

type Img = { bytes: ArrayBuffer; mime: string };
const imgOf = async (o: any): Promise<Img> => ({ bytes: await o.arrayBuffer(), mime: o.httpMetadata?.contentType ?? "image/jpeg" });
type Check = { judge: (out: Img) => Promise<FloorQa | null>; inputs: () => Promise<Img[]>; model: string };
/** What "Tự kiểm tra" checks for each tool, and the images a redraw is sent with (the input first, as for the first attempt). */
async function checkFor(c: any, g: any, params: any): Promise<Check | null> {
  const input = await c.env.IMAGES.get(g.input_key);
  if (!input) return null;
  const plan = await imgOf(input);
  const ask = (prompt: string, images: Img[], verdict: (r: any) => FloorQa | null) => {
    const call = chatJson(c.env.RUNNINGHUB_API_KEY, { model: CRITIQUE_MODEL, prompt, images, onUsage: llmCost(c, g.tool, g.id, g.user_id) }).then(verdict, () => null);
    return Promise.race([call, new Promise<null>((r) => setTimeout(() => r(null), 45_000))]);
  };
  const tileMaterial = g.tool === "interior-floor" ? params.material : params.changes?.floor;
  const slabPaths = g.tool === "interior-material" && params.changes ? changeSwatches(params.changes).filter((x) => x.includes("/slabs/")) : [];
  if (slabPaths.length) {
    const swatches = await Promise.all(changeSwatches(params.changes).map((p) => assetSwatch(c, p))).catch(() => null);
    const where = [params.changes.countertops && "the wall-side kitchen worktops", params.changes.island && "the kitchen island top", ...Object.keys(params.changes).filter((k) => k !== "countertops" && k !== "island").map((k) => `the ${k}`)].filter(Boolean).join(", ");
    return swatches && { model: TILE_EDIT, inputs: async () => [plan, ...swatches], judge: (out) => ask(SLAB_QA_PROMPT(`${where} change to the new materials`), [plan, out, ...swatches], slabQaVerdict) };
  }
  if (g.tool === "interior-floor" || (g.tool === "interior-material" && floorTile(tileMaterial))) {
    const swatch = await tileSwatch(c, tileMaterial).catch(() => null);
    return swatch && { model: TILE_EDIT, inputs: async () => [plan, swatch], judge: (out) => ask(FLOOR_QA_PROMPT, [plan, out, swatch], (r) => floorQaVerdict(r, params.scout?.floor_closeup === true)) };
  }
  if (g.tool === "interior-floorplan" && params.plan) {
    const guideKey = params.guideKey ?? params.isoKey;
    const guide = guideKey ? await c.env.IMAGES.get(guideKey).then((o: any) => o && imgOf(o)) : null;
    return { model: PLAN_EDIT, inputs: async () => (guide ? [guide, plan] : [plan]), judge: (out) => ask(planQaPrompt(params.plan), [plan, out], (r) => planQaVerdict(r, params.plan)) };
  }
  if (g.tool === BIZPLAN_TOOL && params.room) {
    const crop = params.cropKey ? await c.env.IMAGES.get(params.cropKey).then((o: any) => o && imgOf(o)) : null;
    return { model: PLAN_EDIT, inputs: async () => (crop ? [plan, crop] : [plan]), judge: (out) => ask(roomQaPrompt(params.room as PlanRoom), [crop ?? plan, out], roomQaVerdict) };
  }
  return null;
}
/**
 * Optional post-check (the user ticks "Tự kiểm tra"): VICOSTONE tile edits, 2D -> 3D plans and Business rooms. A Gemini judge
 * compares input and result; when it finds a serious mistake (a lost rug, a missing staircase, an invented room...) the job is
 * resubmitted once with a note about the mistake, and the better of the two attempts is kept. No extra credit is charged.
 * Returns done:false while a retry runs or another poll holds the check; a judge error accepts the result as it is.
 */
async function qaCheck(c: any, g: any, params: any, out: Img): Promise<{ done: false } | { done: true; bytes?: ArrayBuffer; params?: any }> {
  const qa: { attempts: (FloorQa & { task: string })[] } = params.qa ?? { attempts: [] };
  if (qa.attempts.some((a) => a.task === g.rh_task_id)) return { done: true };
  // One poll judges each attempt; concurrent polls see the claim and keep waiting.
  const claim = await c.env.DB.prepare("UPDATE generations SET params=json_set(params,'$.qaLock',?) WHERE id=? AND coalesce(json_extract(params,'$.qaLock'),'')<>?")
    .bind(g.rh_task_id, g.id, g.rh_task_id).run();
  if (!claim.meta.changes) return { done: false };
  const check = await checkFor(c, g, params);
  const verdict = check ? await check.judge(out) : null;
  if (!verdict || !check) return { done: true, params: { ...params, qa: { ...qa, skipped: true } } };
  qa.attempts.push({ ...verdict, task: g.rh_task_id });
  const next = { ...params, qa };
  if (verdict.pass || qa.attempts.length >= 2) {
    // Keep the attempt with fewer failed checks (ties go to the newer one).
    const [first, second] = qa.attempts;
    const try1 = `out/${g.user_id}/${g.id}-try1`;
    const saved = second && first.failed.length < second.failed.length ? await c.env.IMAGES.get(try1) : null;
    const bytes = saved ? await saved.arrayBuffer() : undefined;
    if (second) await c.env.IMAGES.delete(try1);
    return { done: true, bytes, params: { ...next, qa: { ...qa, kept: bytes ? 1 : qa.attempts.length } } };
  }
  try {
    await c.env.IMAGES.put(`out/${g.user_id}/${g.id}-try1`, out.bytes, { httpMetadata: { contentType: out.mime } });
    const task = await submitImageToImage(c.env.RUNNINGHUB_API_KEY, {
      images: await check.inputs(), prompt: `${g.prompt} ${floorRetryNote(verdict.problems)}`, aspectRatio: params.guideKey || params.isoKey ? "16:9" : params.aspectRatio ?? "4:3", resolution: params.resolution ?? "1k", model: check.model,
    }, c.env.RUNNINGHUB_BASE);
    await c.env.DB.prepare("UPDATE generations SET rh_task_id=?, params=? WHERE id=?").bind(task, JSON.stringify(next), g.id).run();
    return { done: false };
  } catch {
    return { done: true, params: { ...next, qa: { ...qa, retryFailed: true } } };
  }
}

/**
 * 2D -> 3D second pass: the accepted GPT render goes to Gemini flash for fresher light (PLAN_POLISH_PROMPT). The GPT image is
 * kept as a draft so a failed or late polish still finishes with it. Returns true when the polish is running.
 */
async function startPolish(c: any, g: any, params: any, out: Img): Promise<boolean> {
  // One poll starts it; a concurrent poll sees the claim and waits.
  const claim = await c.env.DB.prepare("UPDATE generations SET params=json_set(params,'$.polishLock',?) WHERE id=? AND coalesce(json_extract(params,'$.polishLock'),'')<>?")
    .bind(g.rh_task_id, g.id, g.rh_task_id).run();
  if (!claim.meta.changes) return true;
  try {
    const draft = `out/${g.user_id}/${g.id}-draft`;
    await c.env.IMAGES.put(draft, out.bytes, { httpMetadata: { contentType: out.mime } });
    const task = await submitImageToImage(c.env.RUNNINGHUB_API_KEY, { images: [out], prompt: PLAN_POLISH_PROMPT, aspectRatio: "16:9", resolution: params.resolution ?? "1k" }, c.env.RUNNINGHUB_BASE);
    await c.env.DB.prepare("UPDATE generations SET rh_task_id=?, params=? WHERE id=? AND status IN ('QUEUED','RUNNING')")
      .bind(task, JSON.stringify({ ...params, polishTask: task, draftKey: draft, draftMime: out.mime }), g.id).run();
    return true;
  } catch {
    return false;
  }
}

/**
 * Brings a QUEUED/RUNNING generation up to date with RunningHub: on success stores the result (running the optional
 * auto-check first), on an error or after 15 minutes marks it failed and refunds the credit. Called by the page while it
 * polls and, once a minute, by the scheduled handler for jobs whose page was closed. `c` only needs env and executionCtx.
 */
async function settle(c: any, g: any) {
  let pollError = "";
  const r = await queryTask(c.env.RUNNINGHUB_API_KEY, g.rh_task_id, c.env.RUNNINGHUB_BASE).catch((e: Error) => { pollError = e.message; return null; });
  if (r && g.rh_task_id && r.status !== "QUEUED" && r.status !== "RUNNING") {
    const billed = r.usage?.thirdPartyConsumeMoney;
    const p0 = JSON.parse(g.params), params = p0.polishTask === g.rh_task_id ? { ...p0, engine: undefined } : p0, model = modelOf(g.tool, params);
    later(c, recordCost(c.env.DB, { id: `task:${g.rh_task_id}`, kind: kindOf(model) === "video" ? "video" : "image", model, tool: g.tool, generationId: g.id, userId: g.user_id,
      usd: billed != null && Number.isFinite(Number(billed)) ? Number(billed) : estimateUsd(g.tool, params, r.status), estimated: billed == null || !Number.isFinite(Number(billed)) }));
  }
  // status guard makes the refund happen exactly once even with concurrent polls
  const fail = async (msg: string) => {
    const upd = await c.env.DB.prepare("UPDATE generations SET status='FAILED', error=? WHERE id=? AND status IN ('QUEUED','RUNNING')").bind(msg, g.id).run();
    if (upd.meta.changes) {
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE users SET credits=credits+? WHERE id=?").bind(g.cost, g.user_id),
        c.env.DB.prepare("INSERT INTO credit_ledger (user_id,delta,reason,generation_id,created_at) VALUES (?,?,?,?,?)").bind(g.user_id, g.cost, "refund_failed", g.id, Date.now()),
      ]);
    }
    g.status = "FAILED"; g.error = msg;
  };
  const expired = Date.now() - g.created_at > 15 * 60_000;
  const p = JSON.parse(g.params), polishing = !!p.polishTask && p.polishTask === g.rh_task_id;
  // Stores the result and marks the job done; only the poll that still holds the current task does, so a late poll cannot
  // overwrite a newer redraw.
  const finish = async (bytes: ArrayBuffer, mime: string, ext: string, params: any) => {
    const key = `out/${g.user_id}/${g.id}.${ext}`;
    await c.env.IMAGES.put(key, bytes, { httpMetadata: { contentType: mime } });
    await c.env.DB.prepare("UPDATE generations SET status='SUCCESS', output_key=?, params=? WHERE id=? AND status IN ('QUEUED','RUNNING') AND rh_task_id=?").bind(key, JSON.stringify(params), g.id, g.rh_task_id).run();
    if (params.draftKey) await c.env.IMAGES.delete(params.draftKey);
    g.status = "SUCCESS"; g.output_key = key; g.params = JSON.stringify(params);
  };
  // A polish that fails or runs late finishes with the GPT render it started from.
  const keepDraft = async () => {
    const d = await c.env.IMAGES.get(p.draftKey).catch(() => null);
    if (!d) return false;
    const mime = p.draftMime ?? "image/png";
    await finish(await d.arrayBuffer(), mime, mime === "image/jpeg" ? "jpg" : mime.split("/")[1] ?? "png", { ...p, polishFailed: true });
    return true;
  };
  if (r?.status === "SUCCESS" && r.results?.[0]) {
    const img = await fetch(r.results[0].url).catch(() => null);
    if (img?.ok) {
      const ext = r.results[0].outputType || "png";
      const mime = ext === "mp4" ? "video/mp4" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      let bytes = await img.arrayBuffer();
      const check = p.autoCheck && !polishing ? await qaCheck(c, g, p, { bytes, mime }) : { done: true as const };
      if (check.done) {
        if (check.bytes) bytes = check.bytes;
        const params = check.params ?? p;
        if (params.polish && !polishing && await startPolish(c, g, params, { bytes, mime })) return;
        await finish(bytes, mime, ext, params);
      }
    } else if (expired) {
      if (!(polishing && await keepDraft())) await fail("Could not download the result image · Không tải được ảnh kết quả");
    }
  } else if (r && r.status !== "QUEUED" && r.status !== "RUNNING" && r.status !== "SUCCESS") {
    if (!(polishing && await keepDraft())) await fail(r.errorMessage || "RunningHub reported an error · RunningHub báo lỗi");
  } else if (expired) {
    if (!(polishing && await keepDraft())) await fail(pollError || "Timed out (15 minutes) · Hết thời gian chờ (15 phút)");
  }
}

app.get("/api/generations/:id", requireAuth, async (c) => {
  const u = c.get("user");
  const g: any = await c.env.DB.prepare("SELECT * FROM generations WHERE id=? AND user_id=?").bind(c.req.param("id"), u.id).first();
  if (!g) return c.json({ error: "not found" }, 404);
  if ((g.status === "RUNNING" || g.status === "QUEUED") && c.env.RUNNINGHUB_API_KEY) await settle(c, g);
  // Written critiques and advisor transcripts are stored as JSON in place of an output image.
  const json: any = g.status === "SUCCESS" && String(g.output_key).endsWith(".json") ? await c.env.IMAGES.get(g.output_key).then((o) => o?.json()).catch(() => null) : undefined;
  return c.json({ id: g.id, tool: g.tool, params: JSON.parse(g.params), status: g.status, error: g.error, public: !!g.is_public, critique: g.tool === "interior-critique" ? json : undefined, finder: g.tool === "interior-finder" ? json : undefined, orient: g.tool === "exterior-orient" ? json : undefined, chat: g.tool === ADVISOR_TOOL ? json?.messages : undefined, inputUrl: g.input_key ? `/api/images/${g.input_key}` : null, outputUrl: g.output_key ? `/api/images/${g.output_key}` : null });
});

// ---------- Admin: API cost page ----------
/**
 * Only a real login of an admin email. Under OPEN_ACCESS every visitor runs as the shared admin account, so requireAuth
 * and isAdmin alone would show the cost page to anyone.
 */
async function realAdmin(c: any) {
  const sid = getCookie(c, "sid");
  if (!sid) return null;
  const row: any = await c.env.DB.prepare("SELECT u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?").bind(sid, Date.now()).first();
  return row && ADMIN_EMAILS.includes(String(row.email).toLowerCase()) ? row : null;
}
const VN_OFFSET = 7 * 3_600_000; // days on the cost page are Vietnam calendar days
const vnDay = (t: number) => new Date(t + VN_OFFSET).toISOString().slice(0, 10);

// Recorded charges plus list-price estimates for generations that have none (older rows, or no amount reported).
app.get("/api/admin/costs", async (c) => {
  if (!(await realAdmin(c))) return c.json({ error: "Log in with an admin account to see API costs · Đăng nhập bằng tài khoản admin để xem chi phí API" }, 403);
  const days = [7, 30, 90].includes(Number(c.req.query("days"))) ? Number(c.req.query("days")) : 30;
  const now = Date.now();
  const since = Date.parse(vnDay(now - (days - 1) * DAY) + "T00:00:00Z") - VN_OFFSET; // start of the first VN day in range
  let tracked: any[] = [], trackingReady = true;
  try {
    tracked = (await c.env.DB.prepare("SELECT kind,model,tool,generation_id,usd,estimated,tokens_in,tokens_out,created_at FROM api_costs WHERE created_at>=? ORDER BY created_at DESC").bind(since).all()).results;
  } catch { trackingReady = false; } // migration 0003 not applied yet: everything below is an estimate
  const gens: any[] = (await c.env.DB.prepare("SELECT g.id,g.tool,g.params,g.status,g.created_at,u.email FROM generations g LEFT JOIN users u ON u.id=g.user_id WHERE g.created_at>=? AND g.status IN ('SUCCESS','FAILED')").bind(since).all()).results;
  const email = new Map(gens.map((g) => [g.id, g.email]));
  const covered = new Set(tracked.map((r) => r.generation_id).filter(Boolean));
  type Row = { at: number; tool: string; model: string; kind: string; usd: number; estimated: boolean; user?: string };
  const rows: Row[] = tracked.map((r) => ({ at: r.created_at, tool: r.tool ?? "", model: r.model, kind: r.kind, usd: r.usd, estimated: !!r.estimated, user: email.get(r.generation_id) }));
  for (const g of gens) {
    if (covered.has(g.id)) continue;
    const params = JSON.parse(g.params), model = modelOf(g.tool, params);
    rows.push({ at: g.created_at, tool: g.tool, model, kind: kindOf(model), usd: estimateUsd(g.tool, params, g.status), estimated: true, user: g.email });
  }
  rows.sort((x, y) => y.at - x.at);
  const sum = (list: Row[]) => list.reduce((a, r) => a + r.usd, 0);
  const group = (key: (r: Row) => string) => {
    const m = new Map<string, Row[]>();
    for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
    return [...m].map(([k, list]) => ({ key: k, count: list.length, usd: sum(list), estimatedUsd: sum(list.filter((r) => r.estimated)) })).sort((x, y) => y.usd - x.usd);
  };
  const byDay = Array.from({ length: days }, (_, i) => vnDay(since + i * DAY)).map((day) => {
    const list = rows.filter((r) => vnDay(r.at) === day);
    return { day, exact: sum(list.filter((r) => !r.estimated)), estimated: sum(list.filter((r) => r.estimated)), count: list.length };
  });
  const today = vnDay(now);
  const images = rows.filter((r) => r.kind !== "llm" && r.usd > 0);
  return c.json({
    days, since, trackingReady,
    totals: { usd: sum(rows), estimatedUsd: sum(rows.filter((r) => r.estimated)), today: sum(rows.filter((r) => vnDay(r.at) === today)), last7: sum(rows.filter((r) => r.at >= now - 7 * DAY)),
      count: rows.length, perImage: images.length ? sum(images) / images.length : 0, llmUsd: sum(rows.filter((r) => r.kind === "llm")) },
    byDay, byTool: group((r) => r.tool || "—"), byModel: group((r) => r.model), recent: rows.slice(0, 50),
  });
});

// Billing CSV from the RunningHub console: replaces tracked/estimated amounts with what was actually charged. Tasks that
// match no generation (other apps on the same key, test scripts) are kept with no tool and shown as outside the app.
app.post("/api/admin/costs/import", async (c) => {
  if (!(await realAdmin(c))) return c.json({ error: "Log in with an admin account · Đăng nhập bằng tài khoản admin" }, 403);
  const text = (await c.req.text()).replace(/^\uFEFF/, "");
  if (!text || text.length > 5_000_000) return c.json({ error: "Upload the RunningHub billing CSV (max 5 MB) · Hãy tải file CSV hoá đơn RunningHub (tối đa 5 MB)" }, 400);
  const [head, ...body] = parseCsv(text);
  const col = (name: string) => head?.indexOf(name) ?? -1;
  const ix = { id: col("Task ID"), name: col("Task Name"), status: col("Task Status"), usd: col("Wallet Amount"), at: col("Created Time") };
  if (Object.values(ix).some((i) => i < 0)) return c.json({ error: "This is not a RunningHub billing CSV · Đây không phải file CSV hoá đơn RunningHub" }, 400);
  const tasks = body.map((r) => ({ id: r[ix.id], model: r[ix.name], usd: Number(r[ix.usd]) || 0, at: rhTime(r[ix.at]) })).filter((t) => /^\d+$/.test(t.id) && t.model && Number.isFinite(t.at));
  try { await c.env.DB.prepare("SELECT 1 FROM api_costs LIMIT 1").first(); } catch { return c.json({ error: "Run migration 0003_api_costs first · Cần chạy migration 0003_api_costs trước" }, 500); }
  const gens = new Map<string, any>();
  for (let i = 0; i < tasks.length; i += 80) {
    const ids = tasks.slice(i, i + 80).map((t) => t.id);
    const { results } = await c.env.DB.prepare(`SELECT id,tool,user_id,rh_task_id FROM generations WHERE rh_task_id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all<any>();
    for (const g of results) gens.set(g.rh_task_id, g);
  }
  const stmt = c.env.DB.prepare("INSERT OR REPLACE INTO api_costs (id,kind,model,tool,generation_id,user_id,usd,estimated,tokens_in,tokens_out,created_at) VALUES (?,?,?,?,?,?,?,0,NULL,NULL,?)");
  for (let i = 0; i < tasks.length; i += 50) {
    await c.env.DB.batch(tasks.slice(i, i + 50).map((t) => {
      const g = gens.get(t.id);
      return stmt.bind(`task:${t.id}`, kindOf(t.model) === "video" ? "video" : "image", t.model, g?.tool ?? null, g?.id ?? null, g?.user_id ?? null, t.usd, t.at);
    }));
  }
  return c.json({ imported: tasks.length, matched: tasks.filter((t) => gens.has(t.id)).length, usd: tasks.reduce((a, t) => a + t.usd, 0),
    from: Math.min(...tasks.map((t) => t.at)), to: Math.max(...tasks.map((t) => t.at)) });
});

// History, newest first. ?limit= (1–500, default 50), ?tool= (one tool id), ?before= (createdAt cursor from `next`).
// Under OPEN_ACCESS every visitor shares one account, so a fixed 50 pushed older runs out of view within hours.
app.get("/api/generations", requireAuth, async (c) => {
  const limit = Math.min(500, Math.max(1, Number(c.req.query("limit")) || 50));
  const tool = c.req.query("tool"), before = Number(c.req.query("before"));
  const where = ["user_id=?"], args: unknown[] = [c.get("user").id];
  if (tool && /^[a-z-]{3,40}$/.test(tool)) { where.push("tool=?"); args.push(tool); } // bound parameter; bizplan and advisor are not in TOOL_IDS
  if (Number.isFinite(before) && before > 0) { where.push("created_at<?"); args.push(before); }
  const { results } = await c.env.DB.prepare(`SELECT id,tool,params,status,input_key,output_key,is_public,created_at FROM generations WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ?`).bind(...args, limit).all<any>();
  return c.json({ next: results.length === limit ? results[results.length - 1].created_at : null, items: results.map((g) => ({ id: g.id, tool: g.tool, params: JSON.parse(g.params), status: g.status, public: !!g.is_public, createdAt: g.created_at, inputUrl: g.input_key ? `/api/images/${g.input_key}` : null, outputUrl: g.output_key ? `/api/images/${g.output_key}` : null })) });
});

app.get("/api/images/:kind/:uid/:file", requireAuth, async (c) => {
  const { kind, uid, file } = c.req.param();
  if (uid !== c.get("user").id || (kind !== "in" && kind !== "out")) return c.json({ error: "forbidden" }, 403);
  const obj = await c.env.IMAGES.get(`${kind}/${uid}/${file}`);
  if (!obj) return c.json({ error: "not found" }, 404);
  return new Response(obj.body, { headers: { "Content-Type": obj.httpMetadata?.contentType ?? "image/png", "Cache-Control": "private, max-age=3600" } });
});

// ---------- Phase 4: gallery, deletion, rate limiting ----------
app.post("/api/generations/:id/publish", requireAuth, async (c) => {
  const { public: pub } = await c.req.json<{ public?: boolean }>().catch(() => ({} as any));
  const r = await c.env.DB.prepare("UPDATE generations SET is_public=? WHERE id=? AND user_id=? AND status='SUCCESS' AND output_key NOT LIKE '%.json' AND output_key NOT LIKE '%.mp4'")
    .bind(pub ? 1 : 0, c.req.param("id"), c.get("user").id).run();
  return r.meta.changes ? c.json({ ok: true, public: !!pub }) : c.json({ error: "not found" }, 404);
});

app.delete("/api/generations/:id", requireAuth, async (c) => {
  const u = c.get("user");
  const g: any = await c.env.DB.prepare("SELECT input_key,output_key,status FROM generations WHERE id=? AND user_id=?").bind(c.req.param("id"), u.id).first();
  if (!g) return c.json({ error: "not found" }, 404);
  if (g.status === "RUNNING" || g.status === "QUEUED") return c.json({ error: "Still processing, cannot delete yet · Đang xử lý, chưa thể xoá" }, 409);
  await c.env.IMAGES.delete([g.input_key, g.output_key].filter(Boolean));
  await c.env.DB.prepare("DELETE FROM generations WHERE id=? AND user_id=?").bind(c.req.param("id"), u.id).run();
  return c.json({ ok: true });
});

// Public: only fields safe to expose (no prompt, no user id, no storage keys).
app.get("/api/gallery", async (c) => {
  const before = Number(c.req.query("before")) || Date.now() + 1;
  const { results } = await c.env.DB.prepare(
    "SELECT id,tool,params,input_key,created_at FROM generations WHERE is_public=1 AND status='SUCCESS' AND created_at<? ORDER BY created_at DESC LIMIT 24",
  ).bind(before).all<any>();
  return c.json({
    items: results.map((g) => {
      const { styleSlug, roomType, intervention, surface, material, weather, remove, angle } = JSON.parse(g.params);
      return { id: g.id, tool: g.tool, params: { styleSlug, roomType, intervention, surface, material, weather, remove, angle }, createdAt: g.created_at, inputUrl: g.input_key ? `/api/public/${g.id}/in` : null, outputUrl: `/api/public/${g.id}/out` };
    }),
    next: results.length === 24 ? results[results.length - 1].created_at : null,
  });
});

app.get("/api/public/:id/:kind", async (c) => {
  const kind = c.req.param("kind");
  if (kind !== "in" && kind !== "out") return c.json({ error: "not found" }, 404);
  const g: any = await c.env.DB.prepare("SELECT input_key,output_key FROM generations WHERE id=? AND is_public=1 AND status='SUCCESS'").bind(c.req.param("id")).first();
  const key = g && (kind === "in" ? g.input_key : g.output_key);
  const obj = key && (await c.env.IMAGES.get(key));
  if (!obj) return c.json({ error: "not found" }, 404);
  return new Response(obj.body, { headers: { "Content-Type": obj.httpMetadata?.contentType ?? "image/png", "Cache-Control": "public, max-age=3600" } });
});

/** Jobs started in the last 20 minutes and still open: anything older was already past the 15-minute limit. */
const SETTLE_WINDOW = 20 * 60_000, SETTLE_BATCH = 8;
/**
 * Once a minute (wrangler "triggers.crons"): finish recent jobs nobody is polling because the page was closed, so the
 * result still lands in the history and failures are refunded. Small batches keep each run under the subrequest limit.
 */
async function settleOpenJobs(env: Env, ctx: ExecutionContext) {
  if (!env.RUNNINGHUB_API_KEY) return;
  const { results } = await env.DB.prepare("SELECT * FROM generations WHERE status IN ('QUEUED','RUNNING') AND rh_task_id IS NOT NULL AND created_at>? ORDER BY created_at LIMIT ?")
    .bind(Date.now() - SETTLE_WINDOW, SETTLE_BATCH).all<any>();
  // tileSwatch resolves swatch paths against c.req.url; the ASSETS binding ignores the host.
  const c = { env, executionCtx: ctx, get: () => undefined, req: { url: "https://assets.local/" } };
  await Promise.allSettled(results.map((g) => settle(c, g)));
}

export default {
  fetch: app.fetch,
  scheduled: (_event, env, ctx) => ctx.waitUntil(settleOpenJobs(env, ctx)),
} satisfies ExportedHandler<Env>;
