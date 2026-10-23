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

type InputImage = { bytes: ArrayBuffer; mime: string };

/** `images[0]` is the photo being edited; any further images are references the prompt refers to. */
export async function submitImageToImage(apiKey: string, o: { images: InputImage[]; prompt: string; aspectRatio?: string; resolution: "1k" | "2k" | "4k" }, base = DEFAULT_BASE) {
  const res = await rh(apiKey, `${base}/rhart-image-n-g31-flash/image-to-image`, {
    imageUrls: o.images.map((i) => toDataUri(i.bytes, i.mime)),
    prompt: o.prompt,
    resolution: o.resolution,
    ...(o.aspectRatio ? { aspectRatio: o.aspectRatio } : {}),
  });
  if (!res.taskId) throw new Error(res.errorMessage || "RunningHub returned no taskId · RunningHub không trả taskId");
  return res.taskId;
}

export async function submitTextToImage(apiKey: string, o: { prompt: string; aspectRatio?: string; resolution: "1k" | "2k" | "4k" }, base = DEFAULT_BASE) {
  const res = await rh(apiKey, `${base}/rhart-image-n-g31-flash/text-to-image`, {
    prompt: o.prompt,
    resolution: o.resolution,
    ...(o.aspectRatio ? { aspectRatio: o.aspectRatio } : {}),
  });
  if (!res.taskId) throw new Error(res.errorMessage || "RunningHub không trả taskId");
  return res.taskId;
}

/** Veo 3.1 Fast image-to-video (8 s, 720p, native audio); the result is an mp4. */
export async function submitImageToVideo(apiKey: string, o: { image: InputImage; prompt: string; aspectRatio: "16:9" | "9:16" }, base = DEFAULT_BASE) {
  const res = await rh(apiKey, `${base}/rhart-video-v3.1-fast/image-to-video`, {
    prompt: o.prompt, aspectRatio: o.aspectRatio, imageUrls: [toDataUri(o.image.bytes, o.image.mime)], duration: "8", resolution: "720p",
  });
  if (!res.taskId) throw new Error(res.errorMessage || "RunningHub returned no taskId · RunningHub không trả taskId");
  return res.taskId;
}

export const queryTask = (apiKey: string, taskId: string, base = DEFAULT_BASE) => rh(apiKey, `${base}/query`, { taskId });

const LLM_BASE = "https://llm.runninghub.ai/v1";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[] };

/** Image part for a chat message. */
export const imagePart = (img: InputImage) => ({ type: "image_url" as const, image_url: { url: toDataUri(img.bytes, img.mime) } });

/** One chat completion; returns the assistant's text. */
export async function chatText(apiKey: string, o: { model: string; messages: ChatMessage[] }, base = LLM_BASE): Promise<string> {
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: o.model, messages: o.messages }),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error?.message || data.message || `RunningHub LLM ${r.status}`);
  const text = String(data.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error("The AI returned an empty answer · AI không trả lời");
  return text;
}

/** One vision chat call that must answer with a JSON object; returns the parsed object. */
export async function chatJson(apiKey: string, o: { model: string; prompt: string; image: InputImage }, base = LLM_BASE): Promise<any> {
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: o.model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [{ type: "text", text: o.prompt }, { type: "image_url", image_url: { url: toDataUri(o.image.bytes, o.image.mime) } }] }],
    }),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error?.message || data.message || `RunningHub LLM ${r.status}`);
  const text = String(data.choices?.[0]?.message?.content ?? "").replace(/^```(?:json)?\s*|\s*```$/g, "");
  try { return JSON.parse(text); } catch { throw new Error("The AI returned an unreadable answer · AI trả về kết quả không đọc được"); }
}
