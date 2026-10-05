import React, { useEffect, useMemo, useState } from "react";
import { bi } from "./i18n";

type P = { slug: string; name: string; scope: "interior" | "exterior" | "garden"; prompt: string };
const SCOPES = [
  { scope: "interior", label: "Interiors", tool: "interior-redesign" },
  { scope: "exterior", label: "Exteriors", tool: "exterior-redesign" },
  { scope: "garden", label: "Gardens", tool: "garden-redesign" },
] as const;

export function PromptLibrary({ onUse }: { onUse: (tool: string, styleSlug: string) => void }) {
  const [all, setAll] = useState<P[]>([]);
  const [scope, setScope] = useState<(typeof SCOPES)[number]["scope"]>("interior");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/prompts").then((r) => r.json() as Promise<{ prompts?: P[] }>).then((d) => setAll(d.prompts ?? [])).catch(() => {});
  }, []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((p) => p.scope === scope && (!s || `${bi(p.name)} ${p.prompt}`.toLowerCase().includes(s)));
  }, [all, scope, q]);
  const count = (s: string) => all.filter((p) => p.scope === s).length;
  const cur = SCOPES.find((s) => s.scope === scope)!;

  const copy = async (p: P) => {
    try { await navigator.clipboard.writeText(p.prompt); setCopied(p.slug); setTimeout(() => setCopied(null), 1500); } catch { /* clipboard blocked */ }
  };

  if (!all.length) return null;
  return (
    <section id="prompts" className="mx-auto max-w-4xl px-6 pb-16">
      <h2 className="mb-3 text-2xl font-bold">Prompt library · Thư viện prompt</h2>
      <div className="flex flex-wrap items-center gap-2">
        {SCOPES.map((s) => (
          <button key={s.scope} onClick={() => { setScope(s.scope); setOpen(null); }} className={`rounded-full border px-4 py-1 ${scope === s.scope ? "bg-black text-white" : ""}`}>
            {bi(s.label)} ({count(s.scope)})
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search · Tìm kiếm…" className="ml-auto rounded border p-2 text-sm" />
      </div>
      <ul className="mt-4 divide-y rounded-xl border">
        {list.map((p) => (
          <li key={p.slug} className="p-3">
            <div className="flex items-center gap-2">
              <button className="flex-1 text-left font-medium" onClick={() => setOpen(open === p.slug ? null : p.slug)}>
                {bi(p.name)} <span className="text-xs text-neutral-400">{open === p.slug ? "▲" : "▼"}</span>
              </button>
              <button onClick={() => copy(p)} className="rounded border px-2 py-1 text-xs">{copied === p.slug ? "Copied ✓" : "Copy · Sao chép"}</button>
              <button onClick={() => onUse(cur.tool, p.slug)} className="rounded bg-black px-2 py-1 text-xs text-white">Use · Dùng</button>
            </div>
            {open === p.slug && <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">{p.prompt}</p>}
          </li>
        ))}
        {!list.length && <li className="p-4 text-center text-sm text-neutral-500">No results · Không có kết quả</li>}
      </ul>
    </section>
  );
}
