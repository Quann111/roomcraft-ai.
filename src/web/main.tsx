import React, { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { bi } from "./i18n";
import { PromptLibrary } from "./PromptLibrary";

// three.js is ~500KB; load it only for the landing hero.
const Hero3D = lazy(() => import("./Hero3D").then((m) => ({ default: m.Hero3D })));
import { GeneratePanel, type ToolId, type Preset } from "./GeneratePanel";

const TOOL_ID: Record<string, ToolId> = {
  "Interiors/Redesign": "interior-redesign", "Interiors/Virtual Staging": "interior-staging", "Interiors/Declutter": "interior-declutter",
  "Interiors/Sketch to Render": "interior-sketch", "Interiors/Material Swap": "interior-material",
  "Exteriors/Redesign": "exterior-redesign", "Exteriors/Sky & Weather Swap": "exterior-sky", "Exteriors/Sketch to Render": "exterior-sketch",
  "Gardens/Redesign": "garden-redesign",
};

type Me = { email: string; credits: number; nextRefillAt: number };

async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as any).error ?? "Lỗi");
  return data as T;
}

const TOOLS = {
  Interiors: ["Redesign", "Virtual Staging", "Declutter", "Sketch to Render", "Material Swap", "Video Walkthrough", "2D to 3D Floor Plan"],
  Exteriors: ["Redesign", "Sky & Weather Swap", "Sketch to Render", "Video Walkthrough"],
  Gardens: ["Redesign"],
} as const;

function AuthForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api(`/api/auth/${mode}`, { email, password }); onDone(); } catch (x: any) { setErr(x.message); }
  };
  return (
    <form onSubmit={submit} className="mx-auto mt-6 flex max-w-sm flex-col gap-3 rounded-2xl border p-6">
      <h3 className="text-lg font-semibold">{mode === "signup" ? "Create account (3 free credits) · Tạo tài khoản (3 credits miễn phí)" : "Log in · Đăng nhập"}</h3>
      <input className="rounded border p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="rounded border p-2" type="password" placeholder="Password (≥ 8 chars) · Mật khẩu (≥ 8 ký tự)" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="rounded bg-black py-2 text-white">{mode === "signup" ? "Sign up · Đăng ký" : "Log in · Đăng nhập"}</button>
      <button type="button" className="text-sm underline" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
        {mode === "signup" ? "Have an account? Log in · Đã có tài khoản? Đăng nhập" : "No account? Sign up · Chưa có tài khoản? Đăng ký"}
      </button>
    </form>
  );
}

function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [cat, setCat] = useState<keyof typeof TOOLS>("Interiors");
  const [tool, setTool] = useState("Redesign");
  const load = () => api<Me>("/api/me").then(setMe).catch(() => setMe(null)).finally(() => setLoaded(true));
  const [preset, setPreset] = useState<Preset | undefined>();
  useEffect(() => { load(); }, []);
  const useTool = (toolId: string, p: Preset) => {
    const hit = Object.entries(TOOL_ID).find(([, v]) => v === toolId);
    if (!hit) return;
    const [c, t] = hit[0].split("/");
    setCat(c as keyof typeof TOOLS); setTool(t); setPreset(p);
    document.getElementById("generate")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen text-neutral-900">
      <header className="flex items-center justify-between px-6 py-4">
        <b className="text-xl">RoomCraft AI</b>
        {me && (
          <div className="flex items-center gap-3 text-sm">
            <span>{me.email} · {me.credits} credits</span>
            <button className="underline" onClick={async () => { await api("/api/auth/logout", {}); setMe(null); }}>Log out · Thoát</button>
          </div>
        )}
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-2 md:py-20">
        <div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Redesign any room with AI<br /><span className="text-2xl font-medium text-neutral-500 sm:text-3xl">Thiết kế lại mọi căn phòng bằng AI</span></h1>
          <p className="mt-5 max-w-md text-neutral-600">Keep the room structure, change only the furniture and style. · Giữ nguyên cấu trúc phòng, chỉ thay nội thất và phong cách.</p>
          <div className="mt-7 flex gap-3">
            <a href="#generate" className="rounded-full bg-black px-6 py-3 text-white">Get started · Bắt đầu</a>
            <a href="#how" className="rounded-full border px-6 py-3">How it works · Cách hoạt động</a>
          </div>
          <p className="mt-4 text-sm text-neutral-500">60+ interior · 25 exterior · 12 garden styles · 60+ phong cách nội thất, 25 ngoại thất, 12 sân vườn</p>
        </div>
        <Suspense fallback={<div className="aspect-[4/3] animate-pulse rounded-3xl bg-neutral-200" />}><Hero3D /></Suspense>
      </section>
      <section id="how" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Upload a photo", "Tải ảnh lên", "A room, house or garden — or just a sketch. · Phòng, nhà, sân vườn hoặc bản phác thảo."],
            ["2", "Pick a style", "Chọn phong cách", "Scandinavian, Japandi, Industrial and 90+ more. · Bắc Âu, Japandi, Công nghiệp và hơn 90 style khác."],
            ["3", "Get your design", "Nhận thiết kế", "Same structure, new look. Compare before/after and download. · Giữ nguyên cấu trúc, diện mạo mới."],
          ].map(([n, en, vi, d]) => (
            <div key={n} className="rounded-2xl border bg-white/60 p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">{n}</div>
              <h3 className="font-semibold">{en} · {vi}</h3>
              <p className="mt-2 text-sm text-neutral-600">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          {["Redesign", "Virtual Staging", "Declutter", "Sketch to Render", "Material Swap", "Sky & Weather Swap"].map((t) => <span key={t} className="rounded-full border px-3 py-1">{bi(t)}</span>)}
        </div>
      </section>
      <section id="generate" className="mx-auto max-w-4xl px-6 pb-24">
        <div className="flex gap-2">
          {(Object.keys(TOOLS) as (keyof typeof TOOLS)[]).map((k) => (
            <button key={k} onClick={() => { setCat(k); setTool(TOOLS[k][0]); setPreset(undefined); }} className={`rounded-full border px-4 py-1 ${cat === k ? "bg-black text-white" : ""}`}>{bi(k)}</button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOOLS[cat].map((t) => (
            <button key={t} onClick={() => { setTool(t); setPreset(undefined); }} className={`rounded border px-3 py-1 text-sm ${tool === t ? "border-black font-semibold" : ""}`}>{bi(t)}</button>
          ))}
        </div>
        {!loaded ? null : me ? (
          TOOL_ID[`${cat}/${tool}`] ? <GeneratePanel key={`${cat}/${tool}`} tool={TOOL_ID[`${cat}/${tool}`]} preset={preset} onCreditsChange={load} /> : <p className="mt-8 rounded-2xl border p-8 text-center text-neutral-500">Tool “{bi(tool)}” coming soon · sắp có.</p>
        ) : (
          <AuthForm onDone={load} />
        )}
      </section>
      {me && <PromptLibrary onUse={(toolId, styleSlug) => useTool(toolId, { styleSlug })} />}
      <Gallery onReuse={useTool} />
      <footer className="px-6 py-10 text-center text-sm text-neutral-500">AI-generated results are for reference only. · Kết quả do AI tạo ra, chỉ mang tính tham khảo.</footer>
    </div>
  );
}

type PubItem = { id: string; tool: ToolId; params: Preset; inputUrl: string; outputUrl: string };

function Gallery({ onReuse }: { onReuse: (t: ToolId, p: Preset) => void }) {
  const [items, setItems] = useState<PubItem[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const more = async (before?: number) => {
    setBusy(true);
    try {
      const d = await api<{ items: PubItem[]; next: number | null }>(`/api/gallery${before ? `?before=${before}` : ""}`);
      setItems((x) => (before ? [...x, ...d.items] : d.items)); setNext(d.next);
    } catch { /* gallery is optional */ }
    setBusy(false);
  };
  useEffect(() => { more(); }, []);
  if (!items.length) return null;
  return (
    <section id="gallery" className="mx-auto max-w-5xl px-6 pb-16">
      <h2 className="mb-4 text-2xl font-bold">Community · Cộng đồng</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((it) => (
          <figure key={it.id} className="group relative overflow-hidden rounded-xl border">
            <img src={it.outputUrl} loading="lazy" className="aspect-square w-full object-cover transition group-hover:opacity-0" alt="kết quả" />
            <img src={it.inputUrl} loading="lazy" className="absolute inset-0 aspect-square w-full object-cover opacity-0 transition group-hover:opacity-100" alt="ảnh gốc" />
            <button onClick={() => onReuse(it.tool, it.params)} className="absolute bottom-2 left-2 rounded bg-black/80 px-3 py-1 text-xs text-white">Reuse settings · Dùng lại cài đặt</button>
          </figure>
        ))}
      </div>
      {next && <button disabled={busy} onClick={() => more(next)} className="mx-auto mt-6 block rounded border px-4 py-2 text-sm">Load more · Xem thêm</button>}
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
