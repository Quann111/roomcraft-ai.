const DEFAULT_BASE = "https://www.runninghub.ai/openapi/v2";

export type RhStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";
export type RhResult = { taskId?: string; status: RhStatus; errorMessage?: string; results?: { url: string; outputType: string }[] | null };

function toDataUri(bytes: ArrayBuffer, mime: string) {
  const u8 = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(s)}`;
}

async function rh(apiKey: string, url: string, body: unknown): Promise<RhResult> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { /* non-JSON error body */ }
  if (!r.ok) throw new Error(data.errorMessage || data.message || `RunningHub ${r.status}`);
  return data as RhResult;
}

export async function submitImageToImage(apiKey: string, o: { image: ArrayBuffer; mime: string; prompt: string; aspectRatio?: string; resolution: "1k" | "2k" | "4k" }, base = DEFAULT_BASE) {
  const res = await rh(apiKey, `${base}/rhart-image-n-g31-flash/image-to-image`, {
    imageUrls: [toDataUri(o.image, o.mime)],
    prompt: o.prompt,
    resolution: o.resolution,
    ...(o.aspectRatio ? { aspectRatio: o.aspectRatio } : {}),
  });
  if (!res.taskId) throw new Error(res.errorMessage || "RunningHub returned no taskId · RunningHub không trả taskId");
  return res.taskId;
}

export const queryTask = (apiKey: string, taskId: string, base = DEFAULT_BASE) => rh(apiKey, `${base}/query`, { taskId });
