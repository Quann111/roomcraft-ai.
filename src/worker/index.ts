import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { submitImageToImage, queryTask } from "./runninghub";
import { STYLES, ROOM_TYPES, INTERVENTION, SURFACES, WEATHER, REMOVE, ANGLES, TOOL_IDS, buildPrompt } from "./prompts";

type Env = { DB: D1Database; IMAGES: R2Bucket; DAILY_CREDITS: string; RUNNINGHUB_API_KEY?: string; RUNNINGHUB_BASE?: string };
type User = { id: string; email: string; credits: number; credits_refilled_at: number };
type Vars = { user: User };

const ADMIN_EMAILS = ["qquankun@gmail.com", "admin@gmail.com"];
const isAdmin = (u: User) => ADMIN_EMAILS.includes(u.email.toLowerCase());
const DAY = 86_400_000;
const SESSION_TTL = 30 * DAY;
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

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

const requireAuth = async (c: any, next: () => Promise<void>) => {
  const sid = getCookie(c, "sid");
  if (!sid) return c.json({ error: "unauthorized" }, 401);
  const row = await c.env.DB.prepare(
    "SELECT u.id,u.email,u.credits,u.credits_refilled_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?",
  ).bind(sid, Date.now()).first();
  if (!row) return c.json({ error: "unauthorized" }, 401);
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

app.get("/api/styles", (c) => c.json({ styles: STYLES.map(({ slug, name, scope, img }) => ({ slug, name, scope, thumb: img ? `https://drive.google.com/thumbnail?id=${img}&sz=w600` : undefined })), roomTypes: ROOM_TYPES, intervention: INTERVENTION, surfaces: SURFACES, weather: WEATHER, remove: REMOVE, angles: ANGLES }));

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
  if (typeof b.inputKey !== "string" || !b.inputKey.startsWith(`in/${u.id}/`)) return c.json({ error: "Invalid input image · Ảnh đầu vào không hợp lệ" }, 400);
  if (!isAdmin(u) && !(await allow(c.env, `gen:${u.id}`, 3_600_000, 20))) return c.json({ error: "Limit is 20 generations per hour · Tối đa 20 lượt tạo mỗi giờ" }, 429);
  const busy = await c.env.DB.prepare("SELECT COUNT(*) n FROM generations WHERE user_id=? AND status IN ('QUEUED','RUNNING') AND created_at>?").bind(u.id, Date.now() - 600_000).first<{ n: number }>();
  if ((busy?.n ?? 0) >= 3) return c.json({ error: "3 images are already processing, wait for them to finish · Đang có 3 ảnh xử lý, hãy chờ xong rồi tạo tiếp" }, 429);
  const resolution = RES.includes(b.resolution) ? b.resolution : "1k";
  const aspectRatio = ASPECTS.includes(b.aspectRatio) ? b.aspectRatio : undefined;
  let prompt: string;
  if (!(TOOL_IDS as readonly string[]).includes(b.tool)) return c.json({ error: "Invalid tool · Tool không hợp lệ" }, 400);
  try { prompt = buildPrompt(b.tool, b); } catch (e: any) { return c.json({ error: e.message }, 400); }
  const obj = await c.env.IMAGES.get(b.inputKey);
  if (!obj) return c.json({ error: "Image not found · Không tìm thấy ảnh" }, 400);

  const cost = isAdmin(u) ? 0 : RES_COST[resolution]; // admin: unlimited, no credits charged
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
    const taskId = await submitImageToImage(c.env.RUNNINGHUB_API_KEY, {
      image: await obj.arrayBuffer(), mime: obj.httpMetadata?.contentType ?? "image/jpeg", prompt, aspectRatio, resolution,
    }, c.env.RUNNINGHUB_BASE);
    await c.env.DB.prepare("INSERT INTO generations (id,user_id,tool,params,prompt,status,rh_task_id,input_key,cost,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(id, u.id, b.tool, JSON.stringify({ styleSlug: b.styleSlug, roomType: b.roomType, intervention: b.intervention, surface: b.surface, material: b.material, weather: b.weather, remove: b.remove, angle: b.angle, resolution, aspectRatio }), prompt, "RUNNING", taskId, b.inputKey, cost, now).run();
    return c.json({ id, status: "RUNNING" });
  } catch (e: any) {
    await refund("refund_submit_failed");
    return c.json({ error: `Could not submit request: ${e.message} · Không gửi được yêu cầu: ${e.message}` }, 502);
  }
});

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
        const key = `out/${u.id}/${g.id}.${ext}`;
        await c.env.IMAGES.put(key, await img.arrayBuffer(), { httpMetadata: { contentType: `image/${ext === "jpg" ? "jpeg" : ext}` } });
        await c.env.DB.prepare("UPDATE generations SET status='SUCCESS', output_key=? WHERE id=?").bind(key, g.id).run();
        g.status = "SUCCESS"; g.output_key = key;
      } else if (expired) await fail("Could not download the result image · Không tải được ảnh kết quả");
    } else if (r && r.status !== "QUEUED" && r.status !== "RUNNING" && r.status !== "SUCCESS") {
      await fail(r.errorMessage || "RunningHub reported an error · RunningHub báo lỗi");
    } else if (expired) {
      await fail(pollError || "Timed out (15 minutes) · Hết thời gian chờ (15 phút)");
    }
  }
  return c.json({ id: g.id, status: g.status, error: g.error, public: !!g.is_public, inputUrl: `/api/images/${g.input_key}`, outputUrl: g.output_key ? `/api/images/${g.output_key}` : null });
});

app.get("/api/generations", requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id,tool,params,status,input_key,output_key,is_public,created_at FROM generations WHERE user_id=? ORDER BY created_at DESC LIMIT 50").bind(c.get("user").id).all<any>();
  return c.json({ items: results.map((g) => ({ id: g.id, tool: g.tool, params: JSON.parse(g.params), status: g.status, public: !!g.is_public, createdAt: g.created_at, inputUrl: `/api/images/${g.input_key}`, outputUrl: g.output_key ? `/api/images/${g.output_key}` : null })) });
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
  const r = await c.env.DB.prepare("UPDATE generations SET is_public=? WHERE id=? AND user_id=? AND status='SUCCESS'")
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
    "SELECT id,tool,params,created_at FROM generations WHERE is_public=1 AND status='SUCCESS' AND created_at<? ORDER BY created_at DESC LIMIT 24",
  ).bind(before).all<any>();
  return c.json({
    items: results.map((g) => {
      const { styleSlug, roomType, intervention, surface, material, weather, remove, angle } = JSON.parse(g.params);
      return { id: g.id, tool: g.tool, params: { styleSlug, roomType, intervention, surface, material, weather, remove, angle }, createdAt: g.created_at, inputUrl: `/api/public/${g.id}/in`, outputUrl: `/api/public/${g.id}/out` };
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
