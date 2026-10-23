import React, { useState } from "react";
import { bi, t } from "./i18n";
import { GeneratePanel, type ToolId, type Preset } from "./GeneratePanel";
import { api, useAuth } from "./auth";
import { Link, navigate } from "./router";

export const TOOLS = {
  Interiors: ["Redesign", "Virtual Staging", "Declutter", "Sketch to Render", "Material Swap", "Room Composer", "Design Critique", "Video Walkthrough", "2D to 3D Floor Plan"],
  Exteriors: ["Redesign", "Sky & Weather Swap", "Sketch to Render", "Video Walkthrough"],
  Gardens: ["Redesign"],
} as const;
type Cat = keyof typeof TOOLS;

export const TOOL_ID: Record<string, ToolId> = {
  "Interiors/Redesign": "interior-redesign", "Interiors/Virtual Staging": "interior-staging", "Interiors/Declutter": "interior-declutter",
  "Interiors/Sketch to Render": "interior-sketch", "Interiors/Material Swap": "interior-material", "Interiors/2D to 3D Floor Plan": "interior-floorplan", "Interiors/Room Composer": "interior-compose", "Interiors/Design Critique": "interior-critique",
  "Exteriors/Redesign": "exterior-redesign", "Exteriors/Sky & Weather Swap": "exterior-sky", "Exteriors/Sketch to Render": "exterior-sketch",
  "Gardens/Redesign": "garden-redesign",
};
const fromId = (id?: string): [Cat, string] => {
  const hit = Object.entries(TOOL_ID).find(([, v]) => v === id);
  return hit ? (hit[0].split("/") as [Cat, string]) : ["Interiors", "Redesign"];
};

/** Link to the studio with a tool (and optional preset) preselected. */
export const studioUrl = (tool: ToolId, preset?: Preset) =>
  `/app?tool=${tool}${preset && Object.keys(preset).length ? `&p=${encodeURIComponent(JSON.stringify(preset))}` : ""}`;

export function AuthForm({ mode, onDone, onSwitch }: { mode: "login" | "signup"; onDone: () => void; onSwitch?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { await api(`/api/auth/${mode}`, { email, password }); onDone(); } catch (x: any) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="auth-card">
      <h2 className="text-xl font-semibold">{mode === "signup" ? t("Create your account", "Tạo tài khoản") : t("Welcome back", "Chào mừng quay lại")}</h2>
      {mode === "signup" && <p className="text-sm text-neutral-500">{t("3 free credits, refilled every 24 hours.", "3 credit miễn phí, nạp lại sau mỗi 24 giờ.")}</p>}
      <input className="rounded border p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      <input className="rounded border p-2" type="password" placeholder={t("Password (8+ characters)", "Mật khẩu (từ 8 ký tự)")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
      {err && <p className="text-sm text-red-600">{bi(err)}</p>}
      <button type="submit" disabled={busy} className="disabled:opacity-50">{mode === "signup" ? t("Sign up", "Đăng ký") : t("Log in", "Đăng nhập")}</button>
      {(() => {
        const label = mode === "signup" ? t("Have an account? Log in", "Đã có tài khoản? Đăng nhập") : t("No account? Sign up", "Chưa có tài khoản? Đăng ký");
        return onSwitch
          ? <button type="button" onClick={onSwitch} className="text-center text-sm underline">{label}</button>
          : <Link to={mode === "signup" ? "/login" : "/register"} className="text-center text-sm underline">{label}</Link>;
      })()}
    </form>
  );
}

/** The design tool: category tabs + tool chips + generator (or sign-up gate). */
export function Studio({ tool: initial, preset }: { tool?: ToolId; preset?: Preset }) {
  const { me, loaded, reload } = useAuth();
  const [init] = useState(() => fromId(initial));
  const [cat, setCat] = useState<Cat>(init[0]);
  const [tool, setTool] = useState(init[1]);
  const [p, setP] = useState<Preset | undefined>(preset);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const id = TOOL_ID[`${cat}/${tool}`];
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TOOLS) as Cat[]).map((k) => (
          <button key={k} onClick={() => { setCat(k); setTool(TOOLS[k][0]); setP(undefined); }} className={`rounded-full border px-4 py-1.5 text-sm ${cat === k ? "border-black bg-black text-white" : "bg-white"}`}>{bi(k)}</button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {TOOLS[cat].map((x) => (
          <button key={x} onClick={() => { setTool(x); setP(undefined); }} className={`rounded border px-3 py-1 text-sm ${tool === x ? "border-black font-semibold" : "bg-white"}`}>{bi(x)}</button>
        ))}
      </div>
      {!loaded ? null : me ? (
        id ? <GeneratePanel key={id} tool={id} preset={p} onCreditsChange={reload} /> : <p className="mt-8 rounded-2xl border bg-white p-8 text-center text-neutral-500">{t("This tool is coming soon.", "Công cụ này sắp ra mắt.")}</p>
      ) : (
        <div className="lock-panel">
          <p>🔒 {t("Log in to open the generator and redesign by style.", "Đăng nhập để mở phần tạo ảnh theo phong cách.")}</p>
          <AuthForm mode={mode} onDone={reload} onSwitch={() => setMode(mode === "login" ? "signup" : "login")} />
        </div>
      )}
    </div>
  );
}

export const goStudio = (tool: ToolId, preset?: Preset) => navigate(studioUrl(tool, preset));
