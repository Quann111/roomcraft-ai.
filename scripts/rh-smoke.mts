// Smoke test: one generation per tool straight against RunningHub, using the app's own buildPrompt.
// Usage: node scripts/rh-smoke.mts --out <dir> [--only tool1,tool2]
// Reads RUNNINGHUB_API_KEY from .dev.vars (never printed).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildPrompt, TEXT_TOOLS, type ToolId } from "../src/worker/prompts.ts";

const BASE = "https://www.runninghub.ai/openapi/v2";
const MODEL = "rhart-image-n-g31-flash";
const KEY = readFileSync(".dev.vars", "utf8").match(/^RUNNINGHUB_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) throw new Error("RUNNINGHUB_API_KEY missing in .dev.vars");

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const OUT = arg("out") ?? "rh-smoke-out";
const ONLY = arg("only")?.split(",");
mkdirSync(OUT, { recursive: true });

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=85`;
const ROOM = U("photo-1600210492486-724fe5c67fb0");
const REFERENCE = U("photo-1618221195710-dd6b41faaea6");
const HOUSE = U("photo-1568605115459-4b731184f961");
const GARDEN = U("photo-1713656275767-e8140c59acca");
const EMPTY_ROOM = U("photo-1757742690834-aa581b9f53b2");
const EMPTY_ROOM_2 = U("photo-1783125126700-f7426cd71a40");

type Case = { id: string; tool?: ToolId; params?: any; prompt?: string; images?: (string | { from: string })[]; textOnly?: boolean };
// Helper generations (sketches) are plain text-to-image prompts so the sketch tools get a real line drawing.
const CASES: Case[] = [
  { id: "helper-interior-sketch", textOnly: true, prompt: "A black pencil line sketch of a living room interior with a sofa, armchair, coffee table and large window, hand-drawn architectural perspective on white paper, no color, no shading." },
  { id: "helper-exterior-sketch", textOnly: true, prompt: "A black pencil line sketch of a two-storey house facade with a gabled roof, front door and windows, hand-drawn architectural perspective on white paper, no color, no shading." },
  { id: "interior-redesign", tool: "interior-redesign", params: { styleSlug: "japandi", roomType: "Living room", intervention: "medium" }, images: [ROOM] },
  { id: "interior-declutter", tool: "interior-declutter", params: { remove: ["everything (empty room)"] }, images: [ROOM] },
  { id: "interior-staging", tool: "interior-staging", params: { styleSlug: "scandinavia", roomType: "Living room" }, images: [{ from: "interior-declutter" }] },
  { id: "interior-sketch", tool: "interior-sketch", params: { styleSlug: "urban-modern", roomType: "Living room" }, images: [{ from: "helper-interior-sketch" }] },
  { id: "interior-material", tool: "interior-material", params: { surface: "walls", material: "Limewash plaster" }, images: [ROOM] },
  { id: "interior-paint", tool: "interior-paint", params: { color: "Sage green", finish: "matte" }, images: [ROOM] },
  { id: "interior-floor", tool: "interior-floor", params: { material: "Herringbone parquet" }, images: [ROOM] },
  { id: "interior-transfer", tool: "interior-transfer", params: { roomType: "Living room", intervention: "medium" }, images: [ROOM, REFERENCE] },
  { id: "interior-text", tool: "interior-text", params: { description: "a cosy reading nook with a window seat, built-in bookshelves and warm lamps", roomType: "Study", styleSlug: "japandi" } },
  { id: "exterior-redesign", tool: "exterior-redesign", params: { styleSlug: "ext-modern", angle: "front" }, images: [HOUSE] },
  { id: "exterior-sky", tool: "exterior-sky", params: { weather: "Clear blue sky" }, images: [HOUSE] },
  { id: "exterior-sketch", tool: "exterior-sketch", params: { styleSlug: "ext-farmhouse" }, images: [{ from: "helper-exterior-sketch" }] },
  { id: "exterior-paint", tool: "exterior-paint", params: { color: "Navy", finish: "satin" }, images: [HOUSE] },
  { id: "interior-staging-empty", tool: "interior-staging", params: { styleSlug: "scandinavia", roomType: "Living room" }, images: [EMPTY_ROOM] },
  { id: "interior-staging-empty-2", tool: "interior-staging", params: { styleSlug: "japandi", roomType: "Bedroom" }, images: [EMPTY_ROOM_2] },
  { id: "interior-declutter-2", tool: "interior-declutter", params: { remove: ["everything (empty room)"] }, images: [REFERENCE] },
  { id: "exterior-paint-navy-b", tool: "exterior-paint", params: { color: "Navy", finish: "satin" }, images: [HOUSE] },
  { id: "exterior-paint-2", tool: "exterior-paint", params: { color: "Warm white", finish: "matte" }, images: [HOUSE] },
  { id: "exterior-text", tool: "exterior-text", params: { description: "a two-storey brick townhouse with black steel windows and a small front garden" } },
  { id: "garden-redesign", tool: "garden-redesign", params: { styleSlug: "gar-japanese-zen" }, images: [GARDEN] },
  { id: "garden-text", tool: "garden-text", params: { description: "a small courtyard with olive trees, gravel and a stone bench", styleSlug: "gar-mediterranean" } },
];

async function rh(path: string, body: unknown) {
  const r = await fetch(`${BASE}/${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) });
  const text = await r.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
  if (!r.ok) throw new Error(data.errorMessage || data.message || data.msg || `HTTP ${r.status}`);
  return data;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const done = new Map<string, any>();

async function run(c: Case) {
  const textOnly = c.textOnly || (c.tool && TEXT_TOOLS.includes(c.tool));
  const prompt = c.prompt ?? buildPrompt(c.tool!, c.params);
  const images = (c.images ?? []).map((x) => (typeof x === "string" ? x : done.get(x.from)?.outputUrl));
  const rec: any = { id: c.id, tool: c.tool ?? "helper", params: c.params, prompt, inputs: images, resolution: "1k" };
  if (images.some((x) => !x)) { rec.status = "SKIPPED"; rec.error = "dependency failed"; done.set(c.id, rec); return rec; }
  const t0 = Date.now();
  try {
    const sub = textOnly
      ? await rh(`${MODEL}/text-to-image`, { prompt, resolution: "1k", aspectRatio: "16:9" })
      : await rh(`${MODEL}/image-to-image`, { imageUrls: images, prompt, resolution: "1k" });
    if (!sub.taskId) throw new Error(sub.errorMessage || "no taskId");
    rec.taskId = sub.taskId;
    for (;;) {
      await sleep(5000);
      const q = await rh("query", { taskId: sub.taskId });
      if (q.status === "SUCCESS") {
        const res = q.results?.[0];
        rec.outputUrl = res?.url;
        rec.billing = Object.fromEntries(Object.entries(q).filter(([k]) => /consume|cost|money|coin|price|usage/i.test(k)));
        const img = await fetch(res.url);
        const file = `${c.id}.${res.outputType || "png"}`;
        writeFileSync(join(OUT, file), Buffer.from(await img.arrayBuffer()));
        rec.file = file; rec.status = "SUCCESS"; break;
      }
      if (q.status !== "QUEUED" && q.status !== "RUNNING") { rec.status = "FAILED"; rec.error = q.errorMessage || q.status; break; }
      if (Date.now() - t0 > 10 * 60_000) { rec.status = "FAILED"; rec.error = "timeout 10 min"; break; }
    }
  } catch (e: any) { rec.status = "FAILED"; rec.error = e.message; }
  rec.seconds = Math.round((Date.now() - t0) / 1000);
  console.log(`${rec.status.padEnd(7)} ${c.id} (${rec.seconds}s)${rec.error ? " — " + rec.error : ""}`);
  done.set(c.id, rec);
  return rec;
}

// Run in waves so dependent cases see their inputs; at most 3 tasks in flight.
async function pool(list: Case[], n = 3) {
  const q = [...list];
  await Promise.all(Array.from({ length: n }, async () => { while (q.length) await run(q.shift()!); }));
}
const selected = CASES.filter((c) => !ONLY || ONLY.includes(c.id));
const needs = (c: Case) => (c.images ?? []).some((x) => typeof x !== "string");
await pool(selected.filter((c) => !needs(c)));
await pool(selected.filter(needs));

const results = selected.map((c) => done.get(c.id));
writeFileSync(join(OUT, "results.json"), JSON.stringify(results, null, 2));
const ok = results.filter((r) => r.status === "SUCCESS").length;
console.log(`\n${ok}/${results.length} succeeded · results in ${OUT}`);
