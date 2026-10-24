import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { TILE_EDIT, submitImageToImage, submitTextToImage, submitImageToVideo, queryTask, chatJson, chatText, imagePart, type ChatMessage } from "./runninghub";
import { CITIES, DIRECTIONS } from "./solar";
import { FLOOR_TILES, floorTile } from "./floorTiles";
import { STYLES, ROOM_TYPES, INTERVENTION, SURFACES, PAINT_COLORS, PAINT_FINISHES, WEATHER, REMOVE, ANGLES, PLAN_VIEWS, TOOL_IDS, REFERENCE_TOOLS, ITEM_TOOLS, CRITIQUE_TOOLS, CRITIQUE_MODEL, cleanLlmResult, ADVISOR_TOOL, ADVISOR_MODEL, MAX_ADVISOR_TURNS, BUDGETS, advisorSystem, BIZPLAN_TOOL, MAX_PLAN_ROOMS, COMPARE_TOOLS, MAX_COMPARE, VIDEO_TOOLS, VIDEO_COST, MOTIONS, LIGHTING, PLAN_DETECT_PROMPT, FLOOR_SCOUT_PROMPT, cleanFloorScout, type FloorScout, FLOOR_QA_PROMPT, floorQaVerdict, floorRetryNote, type FloorQa, cleanRooms, planRoomPrompt, TEXT_TOOLS, buildPrompt } from "./prompts";

type Env = { DB: D1Database; IMAGES: R2Bucket; ASSETS: Fetcher; DAILY_CREDITS: string; OPEN_ACCESS?: string; RUNNINGHUB_API_KEY?: string; RUNNINGHUB_BASE?: string };
type User = { id: string; email: string; credits: number; credits_refilled_at: number };
type Vars = { user: User };

const ADMIN_EMAILS = ["qquankun@gmail.com", "admin@gmail.com"];
const isAdmin = (u: User) => ADMIN_EMAILS.includes(u.email.toLowerCase());
const DAY = 86_400_000;
const SESSION_TTL = 30 * DAY;
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

/** A VICOSTONE tile swatch from the static assets, when the floor material is one of the tiles. Tile jobs run on TILE_EDIT. */
async function tileSwatch(c: any, material: unknown) {
  const tile = floorTile(material);
  if (!tile) return null;
  const r = await c.env.ASSETS.fetch(new URL(tile.swatch, c.req.url));
  if (!r.ok) throw new Error(`Tile swatch missing: ${tile.code}`);
  return { bytes: await r.arrayBuffer(), mime: "image/jpeg" };
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
  const call = chatJson(c.env.RUNNINGHUB_API_KEY, { model: CRITIQUE_MODEL, prompt: FLOOR_SCOUT_PROMPT, image: { bytes: await o.arrayBuffer(), mime: o.httpMetadata?.contentType ?? "image/jpeg" } })
    .then(cleanFloorScout, () => null);
  // Median ~12 s, but about one photo in ten takes 30-45 s; past 45 s the edit runs without the scout.
  return Promise.race([call, new Promise<null>((r) => setTimeout(() => r(null), 45_000))]);
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

app.get("/api/styles", (c) => c.json({ styles: STYLES.map(({ slug, name, scope, img, photo }) => ({ slug, name, scope, thumb: img ? `https://drive.google.com/thumbnail?id=${img}&sz=w600` : photo ? `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=600&q=80` : undefined })), roomTypes: ROOM_TYPES, intervention: INTERVENTION, surfaces: SURFACES, paints: PAINT_COLORS, finishes: PAINT_FINISHES, weather: WEATHER, remove: REMOVE, angles: ANGLES, planViews: PLAN_VIEWS, floorTiles: FLOOR_TILES.map(({ code, name, swatch, room }) => ({ code, name, thumb: swatch.replace(".jpg", "-thumb.jpg"), room: room ? swatch.replace(".jpg", "-room.jpg") : undefined })), budgets: BUDGETS, motions: MOTIONS, lighting: LIGHTING, cities: CITIES.map((c) => c.name), directions: DIRECTIONS }));
app.get("/api/prompts", requireAuth, (c) => c.json({ prompts: STYLES.map(({ slug, name, scope, prompt }) => ({ slug, name, scope, prompt })) }));

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
  if (!textOnly && (typeof b.inputKey !== "string" || !b.inputKey.startsWith(`in/${u.id}/`))) return c.json({ error: "Invalid input image · Ảnh đầu vào không hợp lệ" }, 400);
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
  // VICOSTONE tiles: read the photo first (before charging) so the edit knows what to keep, and refuse photos without floor.
  const scout = b.tool === "interior-floor" && floorTile(b.material) ? await floorScout(c, b.inputKey) : null;
  if (scout && !scout.bare_floor_visible) return c.json({ error: NO_FLOOR }, 422);
  if (scout) prompt = buildPrompt(b.tool, { ...b, scout });

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
      const result = cleanLlmResult(b.tool, await chatJson(c.env.RUNNINGHUB_API_KEY, { model: CRITIQUE_MODEL, prompt, image: { bytes: await obj!.arrayBuffer(), mime: obj!.httpMetadata?.contentType ?? "image/jpeg" } }));
      const outKey = `out/${u.id}/${id}.json`;
      await c.env.IMAGES.put(outKey, JSON.stringify(result), { httpMetadata: { contentType: "application/json" } });
      await c.env.DB.prepare("INSERT INTO generations (id,user_id,tool,params,prompt,status,input_key,output_key,cost,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(id, u.id, b.tool, JSON.stringify({ roomType: b.roomType, lang: b.lang === "vi" ? "vi" : "en", kind: b.kind, facing: b.facing, city: b.city, resolution }), prompt, "SUCCESS", b.inputKey, outKey, cost, now).run();
      return c.json({ id, status: "SUCCESS" });
    }
    const images = obj ? [obj, ...(ref ? [ref] : []), ...items.map((o) => o!)] : [];
    const swatch = b.tool === "interior-floor" ? await tileSwatch(c, b.material) : null;
    const taskId = video
      ? await submitImageToVideo(c.env.RUNNINGHUB_API_KEY, { image: { bytes: await obj!.arrayBuffer(), mime: obj!.httpMetadata?.contentType ?? "image/jpeg" }, prompt, aspectRatio: ["9:16", "2:3", "3:4", "4:5"].includes(aspectRatio ?? "") ? "9:16" : "16:9" }, c.env.RUNNINGHUB_BASE)
      : textOnly
      ? await submitTextToImage(c.env.RUNNINGHUB_API_KEY, { prompt, aspectRatio: aspectRatio ?? "16:9", resolution }, c.env.RUNNINGHUB_BASE)
      : await submitImageToImage(c.env.RUNNINGHUB_API_KEY, {
        images: [...await Promise.all(images.map(async (o) => ({ bytes: await o.arrayBuffer(), mime: o.httpMetadata?.contentType ?? "image/jpeg" }))), ...(swatch ? [swatch] : [])],
        prompt, aspectRatio: swatch ? aspectRatio ?? "4:3" : aspectRatio, resolution, model: swatch ? TILE_EDIT : undefined,
      }, c.env.RUNNINGHUB_BASE);
    await c.env.DB.prepare("INSERT INTO generations (id,user_id,tool,params,prompt,status,rh_task_id,input_key,cost,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(id, u.id, b.tool, JSON.stringify({ styleSlug: b.styleSlug, roomType: b.roomType, intervention: b.intervention, surface: b.surface, material: b.material, weather: b.weather, remove: b.remove, angle: b.angle, view: b.view, motion: video ? b.motion : undefined, lighting: b.tool === "interior-lighting" ? b.lighting : undefined, sourceId: b.tool === "exterior-orient-render" ? b.sourceId : undefined, scout: scout ?? undefined, autoCheck: swatch && b.autoCheck === true ? true : undefined, color: b.color, finish: b.finish, refKey: needsRef ? b.refKey : undefined, itemKeys: needsItems ? b.itemKeys : undefined, description: textOnly ? String(b.description ?? "").trim().slice(0, 1000) : undefined, resolution, aspectRatio }), prompt, "RUNNING", taskId, textOnly ? null : b.inputKey, cost, now).run();
    return c.json({ id, status: "RUNNING" });
  } catch (e: any) {
    await refund("refund_submit_failed");
    return c.json({ error: `Could not submit request: ${e.message} · Không gửi được yêu cầu: ${e.message}` }, 502);
  }
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
    const r = await chatJson(c.env.RUNNINGHUB_API_KEY, { model: CRITIQUE_MODEL, prompt: PLAN_DETECT_PROMPT, image: { bytes: await plan.arrayBuffer(), mime: plan.httpMetadata?.contentType ?? "image/jpeg" } });
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
async function runBatch(c: any, o: { tool: string; inputKey: string; image: { bytes: ArrayBuffer; mime: string }; jobs: Job[]; each: number; resolution: "1k" | "2k" | "4k"; aspectRatio?: string }) {
  const u = c.get("user");
  if (!isAdmin(u)) for (const _ of o.jobs) if (!(await allow(c.env, `gen:${u.id}`, 3_600_000, 20))) return { error: "Limit is 20 generations per hour · Tối đa 20 lượt tạo mỗi giờ", status: 429 as const };
  const total = o.each * o.jobs.length;
  const paid = await c.env.DB.prepare("UPDATE users SET credits=credits-? WHERE id=? AND credits>=?").bind(total, u.id, total).run();
  if (!paid.meta.changes) return { error: `This needs ${total} credits · Cần ${total} credit`, status: 402 as const };
  const batchId = crypto.randomUUID();
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
  let jobs: Job[];
  try { jobs = rooms.map((r) => ({ prompt: planRoomPrompt(b.styleSlug, r, home), params: { styleSlug: b.styleSlug, roomType: r.name }, label: r.name })); } catch (e: any) { return c.json({ error: e.message }, 400); }
  const plan = await ownImage(c, b.inputKey);
  if (!plan) return c.json({ error: "Upload a floor plan first · Hãy tải mặt bằng lên trước" }, 400);
  const r = await runBatch(c, {
    tool: BIZPLAN_TOOL, inputKey: b.inputKey, image: { bytes: await plan.arrayBuffer(), mime: plan.httpMetadata?.contentType ?? "image/jpeg" },
    jobs, each: isAdmin(u) ? 0 : 1, resolution: "1k", aspectRatio: ASPECTS.includes(b.aspectRatio) ? b.aspectRatio : "4:3",
  });
  if ("error" in r) return c.json({ error: r.error }, r.status);
  return c.json({ batchId: r.batchId, items: r.items.map(({ label, ...x }) => ({ ...x, room: label })) });
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
    const reply = (await chatText(c.env.RUNNINGHUB_API_KEY, { model: ADVISOR_MODEL, messages })).slice(0, 4000);
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
/**
 * Optional post-check for VICOSTONE tile edits (the user ticks "Tự kiểm tra"): a Gemini judge compares original, result and
 * swatch; when a rug, person or object was lost or the framing changed, the edit is resubmitted once with a note about the
 * mistake, and the better of the two attempts is kept. No extra credit is charged. Returns done:false while a retry runs or
 * another poll holds the check; a judge error accepts the result as it is.
 */
async function tileCheck(c: any, g: any, params: any, out: Img): Promise<{ done: false } | { done: true; bytes?: ArrayBuffer; params?: any }> {
  const qa: { attempts: (FloorQa & { task: string })[] } = params.qa ?? { attempts: [] };
  if (qa.attempts.some((a) => a.task === g.rh_task_id)) return { done: true };
  // One poll judges each attempt; concurrent polls see the claim and keep waiting.
  const claim = await c.env.DB.prepare("UPDATE generations SET params=json_set(params,'$.qaLock',?) WHERE id=? AND coalesce(json_extract(params,'$.qaLock'),'')<>?")
    .bind(g.rh_task_id, g.id, g.rh_task_id).run();
  if (!claim.meta.changes) return { done: false };
  const input = await c.env.IMAGES.get(g.input_key);
  const swatch = await tileSwatch(c, params.material).catch(() => null);
  let verdict: FloorQa | null = null;
  if (input && swatch) {
    const call = chatJson(c.env.RUNNINGHUB_API_KEY, { model: CRITIQUE_MODEL, prompt: FLOOR_QA_PROMPT, images: [{ bytes: await input.arrayBuffer(), mime: input.httpMetadata?.contentType ?? "image/jpeg" }, out, swatch] })
      .then((r) => floorQaVerdict(r, params.scout?.floor_closeup === true), () => null);
    verdict = await Promise.race([call, new Promise<null>((r) => setTimeout(() => r(null), 45_000))]);
  }
  if (!verdict) return { done: true, params: { ...params, qa: { ...qa, skipped: true } } };
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
      images: [{ bytes: await (await c.env.IMAGES.get(g.input_key)).arrayBuffer(), mime: input!.httpMetadata?.contentType ?? "image/jpeg" }, swatch!],
      prompt: `${g.prompt} ${floorRetryNote(verdict.problems)}`, aspectRatio: params.aspectRatio ?? "4:3", resolution: params.resolution ?? "1k", model: TILE_EDIT,
    }, c.env.RUNNINGHUB_BASE);
    await c.env.DB.prepare("UPDATE generations SET rh_task_id=?, params=? WHERE id=?").bind(task, JSON.stringify(next), g.id).run();
    return { done: false };
  } catch {
    return { done: true, params: { ...next, qa: { ...qa, retryFailed: true } } };
  }
}

app.get("/api/generations/:id", requireAuth, async (c) => {
  const u = c.get("user");
  const g: any = await c.env.DB.prepare("SELECT * FROM generations WHERE id=? AND user_id=?").bind(c.req.param("id"), u.id).first();
  if (!g) return c.json({ error: "not found" }, 404);
  if ((g.status === "RUNNING" || g.status === "QUEUED") && c.env.RUNNINGHUB_API_KEY) {
    let pollError = "";
    const r = await queryTask(c.env.RUNNINGHUB_API_KEY, g.rh_task_id, c.env.RUNNINGHUB_BASE).catch((e: Error) => { pollError = e.message; return null; });
    // status guard makes the refund happen exactly once even with concurrent polls
    const fail = async (msg: string) => {
      const upd = await c.env.DB.prepare("UPDATE generations SET status='FAILED', error=? WHERE id=? AND status IN ('QUEUED','RUNNING')").bind(msg, g.id).run();
      if (upd.meta.changes) {
        await c.env.DB.batch([
          c.env.DB.prepare("UPDATE users SET credits=credits+? WHERE id=?").bind(g.cost, u.id),
          c.env.DB.prepare("INSERT INTO credit_ledger (user_id,delta,reason,generation_id,created_at) VALUES (?,?,?,?,?)").bind(u.id, g.cost, "refund_failed", g.id, Date.now()),
        ]);
      }
      g.status = "FAILED"; g.error = msg;
    };
    const expired = Date.now() - g.created_at > 15 * 60_000;
    if (r?.status === "SUCCESS" && r.results?.[0]) {
      const img = await fetch(r.results[0].url).catch(() => null);
      if (img?.ok) {
        const ext = r.results[0].outputType || "png";
        const mime = ext === "mp4" ? "video/mp4" : `image/${ext === "jpg" ? "jpeg" : ext}`;
        let bytes = await img.arrayBuffer();
        const params = JSON.parse(g.params);
        const check = params.autoCheck ? await tileCheck(c, g, params, { bytes, mime }) : { done: true as const };
        if (check.done) {
          if (check.bytes) bytes = check.bytes;
          const key = `out/${u.id}/${g.id}.${ext}`;
          await c.env.IMAGES.put(key, bytes, { httpMetadata: { contentType: mime } });
          await c.env.DB.prepare("UPDATE generations SET status='SUCCESS', output_key=?, params=? WHERE id=?").bind(key, JSON.stringify(check.params ?? params), g.id).run();
          g.status = "SUCCESS"; g.output_key = key; g.params = JSON.stringify(check.params ?? params);
        }
      } else if (expired) await fail("Could not download the result image · Không tải được ảnh kết quả");
    } else if (r && r.status !== "QUEUED" && r.status !== "RUNNING" && r.status !== "SUCCESS") {
      await fail(r.errorMessage || "RunningHub reported an error · RunningHub báo lỗi");
    } else if (expired) {
      await fail(pollError || "Timed out (15 minutes) · Hết thời gian chờ (15 phút)");
    }
  }
  // Written critiques and advisor transcripts are stored as JSON in place of an output image.
  const json: any = g.status === "SUCCESS" && String(g.output_key).endsWith(".json") ? await c.env.IMAGES.get(g.output_key).then((o) => o?.json()).catch(() => null) : undefined;
  return c.json({ id: g.id, tool: g.tool, params: JSON.parse(g.params), status: g.status, error: g.error, public: !!g.is_public, critique: g.tool === "interior-critique" ? json : undefined, finder: g.tool === "interior-finder" ? json : undefined, orient: g.tool === "exterior-orient" ? json : undefined, chat: g.tool === ADVISOR_TOOL ? json?.messages : undefined, inputUrl: g.input_key ? `/api/images/${g.input_key}` : null, outputUrl: g.output_key ? `/api/images/${g.output_key}` : null });
});

app.get("/api/generations", requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id,tool,params,status,input_key,output_key,is_public,created_at FROM generations WHERE user_id=? ORDER BY created_at DESC LIMIT 50").bind(c.get("user").id).all<any>();
  return c.json({ items: results.map((g) => ({ id: g.id, tool: g.tool, params: JSON.parse(g.params), status: g.status, public: !!g.is_public, createdAt: g.created_at, inputUrl: g.input_key ? `/api/images/${g.input_key}` : null, outputUrl: g.output_key ? `/api/images/${g.output_key}` : null })) });
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

export default app;
