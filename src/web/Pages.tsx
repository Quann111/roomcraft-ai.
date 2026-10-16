import React, { useEffect, useState } from "react";
import { Link, navigate, useLocation } from "./router";
import { bi, t } from "./i18n";
import { FEATURES, GROUPS, PERSONAS, USE_CASES, type L2 } from "./data";
import { AuthForm, Studio, studioUrl } from "./Studio";
import { BeforeAfter, type Preset, type ToolId } from "./GeneratePanel";
import { api, useAuth } from "./auth";
import { FaqList } from "./Home";

const idx = () => (t("en", "vi") === "vi" ? 1 : 0);
const pick = (x: L2) => x[idx()];

function Hero({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-4xl px-4 pt-14 pb-8 text-center">
      <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
      {sub && <p className="mx-auto mt-4 max-w-2xl text-neutral-600">{sub}</p>}
      {children}
    </section>
  );
}

function StudioSection({ tool, preset }: { tool: ToolId; preset?: Preset }) {
  return (
    <section id="generate" className="mx-auto max-w-4xl px-4 pb-20">
      <Studio key={tool + JSON.stringify(preset ?? {})} tool={tool} preset={preset} />
    </section>
  );
}

export function RedesignPage() {
  const { search } = useLocation();
  const tool = (search.get("tool") as ToolId) || "interior-redesign";
  let preset: Preset | undefined;
  try { const p = search.get("p"); if (p) preset = JSON.parse(p); } catch { /* bad preset */ }
  return (
    <>
      <Hero title={t("Redesign studio", "Studio thiết kế")} sub={t("Upload a photo, pick a style, generate.", "Tải ảnh lên, chọn phong cách, tạo thiết kế.")} />
      <StudioSection tool={tool} preset={preset} />
    </>
  );
}

export function FeaturesHub() {
  const groups = Object.keys(GROUPS) as (keyof typeof GROUPS)[];
  return (
    <>
      <Hero title={t("AI features", "Tính năng AI")} sub={t("Everything you need to redesign, edit and stage spaces.", "Mọi thứ bạn cần để thiết kế lại, chỉnh sửa và bài trí không gian.")} />
      <div className="mx-auto max-w-6xl space-y-10 px-4 pb-20">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="mb-3 text-xl font-semibold">{pick(GROUPS[g])}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.filter((f) => f.group === g).map((f) => (
                <Link key={f.slug} to={`/${f.slug}`} className="rounded-2xl border bg-white p-5 transition hover:shadow">
                  <div className="text-2xl">{f.icon}</div>
                  <h3 className="mt-2 font-semibold">{pick(f.name)} {!f.tool && <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-normal text-neutral-500">{t("soon", "sắp có")}</span>}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{pick(f.desc)}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

export function FeaturePage({ slug }: { slug: string }) {
  const f = FEATURES.find((x) => x.slug === slug)!;
  return (
    <>
      <Hero title={pick(f.name)} sub={pick(f.desc)} />
      {f.tool ? <StudioSection tool={f.tool} /> : (
        <div className="mx-auto max-w-xl px-4 pb-20 text-center">
          <p className="rounded-2xl border bg-white p-8 text-neutral-600">{t("This feature is coming soon. Try the available tools meanwhile.", "Tính năng này sắp ra mắt. Hãy thử các công cụ hiện có trong lúc chờ.")}</p>
          <Link to="/ai-features" className="mt-4 inline-block underline">{t("← All features", "← Tất cả tính năng")}</Link>
        </div>
      )}
    </>
  );
}

export function UseCasesHub({ free }: { free?: boolean }) {
  const list = USE_CASES.filter((u) => !!u.free === !!free);
  return (
    <>
      <Hero title={free ? t("Free AI design tools", "Công cụ thiết kế AI miễn phí") : t("Use cases", "Ứng dụng")} sub={free ? t("Sign up and get free daily credits.", "Đăng ký và nhận credit miễn phí mỗi ngày.") : undefined} />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((u) => (
          <Link key={u.slug} to={`/${u.slug}`} className="rounded-2xl border bg-white p-5 transition hover:shadow">
            <h3 className="font-semibold">{pick(u.name)}</h3>
            <p className="mt-1 text-sm text-neutral-600">{pick(u.intro)}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

export function UseCasePage({ slug }: { slug: string }) {
  const u = USE_CASES.find((x) => x.slug === slug)!;
  return (
    <>
      <Hero title={pick(u.name)} sub={pick(u.intro)} />
      <ul className="mx-auto mb-8 flex max-w-4xl flex-wrap justify-center gap-3 px-4 text-sm">
        {u.bullets.map((b, i) => <li key={i} className="rounded-full border bg-white px-4 py-1.5">✓ {pick(b)}</li>)}
      </ul>
      <StudioSection tool={u.tool} preset={u.preset} />
      <section className="bg-white py-14"><FaqList /></section>
    </>
  );
}

export function PersonaPage({ slug }: { slug: string }) {
  const p = PERSONAS.find((x) => x.slug === slug)!;
  return (
    <>
      <p className="pt-10 text-center text-sm font-medium text-emerald-700">{t("For", "Dành cho")} {pick(p.name)}</p>
      <Hero title={pick(p.headline)} sub={pick(p.sub)} />
      <div className="mx-auto mb-10 grid max-w-4xl gap-4 px-4 sm:grid-cols-3">
        {p.points.map((x, i) => <div key={i} className="rounded-2xl border bg-white p-5 text-center text-sm font-medium">{pick(x)}</div>)}
      </div>
      <StudioSection tool={p.tool} />
      <section className="bg-white py-14"><FaqList /></section>
    </>
  );
}

type StyleMeta = { slug: string; name: string; scope: "interior" | "exterior" | "garden" };
const SCOPE_TOOL: Record<string, ToolId> = { interior: "interior-redesign", exterior: "exterior-redesign", garden: "garden-redesign" };
const SCOPE_LABEL: Record<string, string> = { interior: "Interiors", exterior: "Exteriors", garden: "Gardens" };

function useStyles() {
  const [styles, setStyles] = useState<StyleMeta[] | null>(null);
  useEffect(() => { api<{ styles: StyleMeta[] }>("/api/styles").then((d) => setStyles(d.styles)).catch(() => setStyles([])); }, []);
  return styles;
}

export function StylesHub() {
  const styles = useStyles();
  const [scope, setScope] = useState<StyleMeta["scope"]>("interior");
  const [q, setQ] = useState("");
  const list = (styles ?? []).filter((s) => s.scope === scope && bi(s.name).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Hero title={t("Design styles", "Phong cách thiết kế")} sub={t("Browse styles and open the studio with one preselected.", "Duyệt phong cách và mở studio với phong cách đã chọn sẵn.")} />
      <div className="mx-auto max-w-5xl px-4 pb-20">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["interior", "exterior", "garden"] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)} className={`rounded-full border px-4 py-1.5 text-sm ${scope === s ? "bg-black text-white" : "bg-white"}`}>{bi(SCOPE_LABEL[s])} ({(styles ?? []).filter((x) => x.scope === s).length})</button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search…", "Tìm kiếm…")} className="ml-auto rounded border bg-white p-2 text-sm" />
        </div>
        {styles === null ? <p className="text-center text-neutral-500">…</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => (
              <Link key={s.slug} to={`/design-styles/${s.scope}/${s.slug}`} className="rounded-xl border bg-white p-4 hover:shadow">{bi(s.name)}</Link>
            ))}
            {!list.length && <p className="col-span-full text-center text-neutral-500">{t("No results", "Không có kết quả")}</p>}
          </div>
        )}
      </div>
    </>
  );
}

export function StylePage({ scope, slug }: { scope: string; slug: string }) {
  const styles = useStyles();
  if (styles === null) return <p className="p-20 text-center text-neutral-500">…</p>;
  const s = styles.find((x) => x.slug === slug && x.scope === scope);
  if (!s) return <NotFound />;
  const tool = SCOPE_TOOL[s.scope];
  return (
    <>
      <Hero title={bi(s.name)} sub={t(`Apply the ${s.name} style to your ${s.scope === "interior" ? "room" : s.scope === "exterior" ? "home exterior" : "garden"} while keeping its structure.`, `Áp dụng phong cách ${bi(s.name)} cho ${s.scope === "interior" ? "căn phòng" : s.scope === "exterior" ? "ngoại thất" : "khu vườn"} của bạn mà vẫn giữ nguyên cấu trúc.`)}>
        <Link to="/design-styles" className="mt-3 inline-block text-sm underline">{t("← All styles", "← Tất cả phong cách")}</Link>
      </Hero>
      <StudioSection tool={tool} preset={{ styleSlug: s.slug }} />
    </>
  );
}

type Item = { id: string; tool: string; params: Preset; status: string; public: boolean; createdAt: number; inputUrl: string | null; outputUrl: string | null };
export function ProjectsPage() {
  const { me, loaded } = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState<Item | null>(null);
  const load = () => api<{ items: Item[] }>("/api/generations").then((d) => setItems(d.items)).catch(() => setItems([]));
  useEffect(() => { if (me) load(); }, [me]);
  if (!loaded) return null;
  if (!me) return <LoginGate />;
  const del = async (g: Item) => {
    if (!confirm(t("Delete this design permanently?", "Xoá vĩnh viễn thiết kế này?"))) return;
    await fetch(`/api/generations/${g.id}`, { method: "DELETE" }); setOpen(null); load();
  };
  const toggle = async (g: Item) => {
    if (!g.public && !confirm(t("Publish to the community gallery? Both original and result become public (no email).", "Đăng lên thư viện cộng đồng? Cả ảnh gốc và kết quả sẽ công khai (không kèm email)."))) return;
    await api(`/api/generations/${g.id}/publish`, { public: !g.public }); setOpen(null); load();
  };
  const done = (items ?? []).filter((g) => g.outputUrl);
  return (
    <>
      <Hero title={t("My projects", "Dự án của tôi")} sub={`${me.email} · ${me.unlimited ? "∞" : me.credits} credits`} />
      <div className="mx-auto max-w-5xl px-4 pb-20">
        {open?.outputUrl && (
          <div className="mb-6 rounded-2xl border bg-white p-4">
            <BeforeAfter before={open.inputUrl} after={open.outputUrl} />
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
              <a href={open.outputUrl} download={`design-${open.id}.png`} className="rounded border px-4 py-2">{t("Download", "Tải xuống")}</a>
              <button onClick={() => toggle(open)} className="rounded border px-4 py-2">{open.public ? t("Unpublish", "Gỡ khỏi thư viện") : t("Publish", "Đăng lên thư viện")}</button>
              <button onClick={() => navigate(studioUrl(open.tool as ToolId, open.params))} className="rounded border px-4 py-2">{t("Reuse settings", "Dùng lại cài đặt")}</button>
              <button onClick={() => del(open)} className="rounded border px-4 py-2 text-red-600">{t("Delete", "Xoá")}</button>
              <button onClick={() => setOpen(null)} className="rounded border px-4 py-2">{t("Close", "Đóng")}</button>
            </div>
          </div>
        )}
        {items === null ? <p className="text-center text-neutral-500">…</p> : done.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center">
            <p className="text-neutral-600">{t("No designs yet.", "Chưa có thiết kế nào.")}</p>
            <Link to="/redesign#generate" className="mt-4 inline-block rounded-full bg-black px-6 py-2.5 text-white">{t("Create your first design", "Tạo thiết kế đầu tiên")}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {done.map((g) => (
              <button key={g.id} onClick={() => { setOpen(g); window.scrollTo(0, 0); }} className="relative overflow-hidden rounded-lg border">
                <img src={g.outputUrl!} loading="lazy" className="aspect-square w-full object-cover" alt="" />
                {g.public && <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1.5 text-[10px] text-white">public</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function LoginGate() {
  return (
    <div className="px-4 py-16 text-center">
      <p className="mb-4 text-neutral-600">{t("Please log in to continue.", "Vui lòng đăng nhập để tiếp tục.")}</p>
      <Link to="/login" className="rounded-full bg-black px-6 py-2.5 text-white">{t("Log in", "Đăng nhập")}</Link>
    </div>
  );
}

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { me, reload } = useAuth();
  useEffect(() => { if (me) navigate("/app"); }, [me]);
  return <div className="px-4 py-16"><AuthForm mode={mode} onDone={() => reload().then(() => navigate("/app"))} /></div>;
}

const DOCS: Record<string, { title: L2; body: L2[] }> = {
  "about-us": { title: ["SOLYC GEN LABS", "SOLYC GEN LABS"], body: [
    ["Material Intelligence Platform for Architecture, Construction & Interiors", "Nền tảng trí tuệ vật liệu cho Kiến trúc, Xây dựng & Nội thất"],
    ["SOLYC GEN LABS is a material intelligence platform for architecture, construction and interiors. We help materials move beyond catalogues and become part of the design process, allowing architects, designers, developers and material brands to explore how they look, feel and perform within real project contexts.", "SOLYC GEN LABS là nền tảng trí tuệ vật liệu dành cho kiến trúc, xây dựng và nội thất. Chúng tôi đưa vật liệu vượt ra ngoài những catalogue rời rạc để trở thành một phần của quá trình thiết kế, giúp kiến trúc sư, nhà thiết kế, chủ đầu tư và thương hiệu vật liệu khám phá cách vật liệu hiện diện, tạo cảm xúc và phát huy giá trị trong bối cảnh dự án thực tế."],
    ["Materials shape more than surfaces. They shape experience.", "Vật liệu không chỉ tạo nên bề mặt. Vật liệu tạo nên trải nghiệm."],
    ["DESIGN WHAT’S POSSIBLE.", "Thiết kế những khả thể mới."],
  ] },
  "terms-of-service": { title: ["Terms of Service", "Điều khoản dịch vụ"], body: [
    ["By using SOLYC Gen Labs you agree to use the service lawfully and only upload images you have the right to use.", "Khi sử dụng SOLYC Gen Labs, bạn đồng ý dùng dịch vụ đúng pháp luật và chỉ tải lên ảnh bạn có quyền sử dụng."],
    ["Results are generated by AI, provided as-is, and may be inaccurate. Free credits may change at any time.", "Kết quả do AI tạo ra, cung cấp nguyên trạng và có thể không chính xác. Credit miễn phí có thể thay đổi bất cứ lúc nào."],
    ["This is a draft template; have it reviewed before launch.", "Đây là bản nháp mẫu; hãy nhờ chuyên gia pháp lý rà soát trước khi ra mắt."],
  ] },
  "privacy-policy": { title: ["Privacy Policy", "Chính sách bảo mật"], body: [
    ["We store your email, uploaded photos and generated results to run the service. Photos are private unless you publish them to the community gallery.", "Chúng tôi lưu email, ảnh tải lên và kết quả để vận hành dịch vụ. Ảnh ở chế độ riêng tư trừ khi bạn đăng lên thư viện cộng đồng."],
    ["You can delete any design at any time from My projects. Images are processed by a third-party AI provider to generate results.", "Bạn có thể xoá bất kỳ thiết kế nào trong Dự án của tôi. Ảnh được xử lý bởi nhà cung cấp AI bên thứ ba để tạo kết quả."],
    ["This is a draft template; have it reviewed before launch.", "Đây là bản nháp mẫu; hãy nhờ chuyên gia pháp lý rà soát trước khi ra mắt."],
  ] },
  "refund-policy": { title: ["Refund Policy", "Chính sách hoàn tiền"], body: [
    ["Credits spent on a failed generation are refunded automatically. Paid plans are not yet available.", "Credit đã dùng cho lượt tạo ảnh thất bại được hoàn tự động. Gói trả phí hiện chưa mở bán."],
    ["This is a draft template; have it reviewed before launch.", "Đây là bản nháp mẫu; hãy nhờ chuyên gia pháp lý rà soát trước khi ra mắt."],
  ] },
};
export const DOC_SLUGS = Object.keys(DOCS);
export function DocPage({ slug }: { slug: string }) {
  const d = DOCS[slug];
  return (
    <section style={{ padding: "72px 0 96px" }}>
      <div className="container" style={{ maxWidth: 780 }}>
        <p className="eyebrow">SOLYC Gen Labs</p>
        <h1 className="section-title">{pick(d.title)}</h1>
        <div style={{ marginTop: 28, display: "grid", gap: 18 }}>
          {d.body.map((p, i) => {
            const about = slug === "about-us";
            const st: React.CSSProperties = { margin: 0, color: "var(--muted)", fontSize: 16, lineHeight: 1.7 };
            if (about && i === 0) Object.assign(st, { color: "var(--gold-deep)", fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase" });
            if (about && i === 2) Object.assign(st, { color: "var(--ink)", fontWeight: 700, fontSize: 24, lineHeight: 1.35 });
            if (about && i === 3) Object.assign(st, { color: "var(--gold-deep)", letterSpacing: ".12em" });
            return <p key={i} style={st}>{pick(p)}</p>;
          })}
        </div>
      </div>
    </section>
  );
}

export function NotFound() {
  return (
    <div className="px-4 py-24 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="mt-3 text-neutral-600">{t("Page not found.", "Không tìm thấy trang.")}</p>
      <Link to="/" className="mt-6 inline-block underline">{t("Back to home", "Về trang chủ")}</Link>
    </div>
  );
}

export function UseCaseHandler({ slug, hub, free }: { slug?: string; hub?: boolean; free?: boolean }) {
  return hub ? <UseCasesHub free={free} /> : <UseCasePage slug={slug!} />;
}
