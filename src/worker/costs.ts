// API cost tracking for the admin cost page: what each RunningHub image/video task and LLM call cost in USD.
import { floorTile } from "./floorTiles";
import { ADVISOR_TOOL, CRITIQUE_MODEL, CRITIQUE_TOOLS, TEXT_TOOLS, VIDEO_TOOLS } from "./prompts";

/** USD per 1M tokens (input, output) on RunningHub's LLM endpoint. */
const LLM_PRICES: Record<string, [number, number]> = { "google/gemini-3.8-flash": [0.375, 1.875] };
export const llmUsd = (model: string, tokensIn: number, tokensOut: number) => {
  const [i, o] = LLM_PRICES[model] ?? LLM_PRICES[CRITIQUE_MODEL];
  return (tokensIn * i + tokensOut * o) / 1e6;
};

/** The RunningHub model a generation ran on (the generations table does not store it), named as in RunningHub's billing export. */
export function modelOf(tool: string, params: any) {
  if ((VIDEO_TOOLS as readonly string[]).includes(tool)) return "veo3.1-fast/image-to-video";
  if ((CRITIQUE_TOOLS as readonly string[]).includes(tool) || tool === ADVISOR_TOOL) return CRITIQUE_MODEL;
  if (tool === "interior-floor" && floorTile(params?.material)) return "gpt-image-2.5/sunburst/image-to-image/economy";
  return (TEXT_TOOLS as readonly string[]).includes(tool) ? "nano-banana-2/text-to-image/economy" : "nano-banana-2/image-to-image/economy";
}
export const kindOf = (model: string) => (/video/.test(model) ? "video" : model.startsWith("google/") ? "llm" : "image");

/** List-price estimate for a generation with no recorded charge (older rows, or RunningHub reported no amount). */
export function estimateUsd(tool: string, params: any, status: string) {
  if (status !== "SUCCESS") return 0;
  const model = modelOf(tool, params);
  if (kindOf(model) === "video") return 0.2;
  if (kindOf(model) === "llm") return 0.002;
  if (model.startsWith("gpt-image-2.5/")) return 0.05;
  return params?.resolution === "4k" ? 0.043 : 0.027;
}

/** RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF. Returns rows of cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = ""; if (row.some((x) => x !== "")) rows.push(row); row = [];
    } else cell += ch;
  }
  row.push(cell); if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}
/** RunningHub's billing export writes local China time (UTC+8), e.g. "2026-10-24 16:03:52". */
export const rhTime = (s: string) => Date.parse(s.trim().replace(" ", "T") + "+08:00");

export type CostRow = {
  id: string; kind: "image" | "video" | "llm"; model: string; tool?: string | null; generationId?: string | null; userId?: string | null;
  usd: number; estimated?: boolean; tokensIn?: number; tokensOut?: number;
};
/** Records one charge. Never throws: tracking must not break a generation, e.g. before migration 0003 is applied. */
export async function recordCost(db: D1Database, r: CostRow) {
  try {
    await db.prepare("INSERT OR IGNORE INTO api_costs (id,kind,model,tool,generation_id,user_id,usd,estimated,tokens_in,tokens_out,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .bind(r.id, r.kind, r.model, r.tool ?? null, r.generationId ?? null, r.userId ?? null, r.usd, r.estimated ? 1 : 0, r.tokensIn ?? null, r.tokensOut ?? null, Date.now()).run();
  } catch { /* table missing or D1 hiccup: the cost page falls back to estimates */ }
}
