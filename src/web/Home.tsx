import React, { Suspense, lazy, useEffect, useState } from "react";
import { Link, navigate } from "./router";
import { t, bi } from "./i18n";
import { FAQ, PERSONAS } from "./data";
import { Studio, studioUrl } from "./Studio";
import { PromptLibrary } from "./PromptLibrary";
import { PricingTable } from "./Pricing";
import { api, useAuth } from "./auth";
import type { Preset, ToolId } from "./GeneratePanel";
import { Figure } from "./Figure";
import { ArchIcon } from "./icons";

const HERO_IMGS = ["photo-1600210492486-724fe5c67fb0", "photo-1618221195710-dd6b41faaea6", "photo-1616486338812-3dadae4b4ace", "photo-1600607687939-ce8a6c25118c", "photo-1600585154340-be6161a56a0c"]
  .map((id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`);

function HeroSlides() {
  const [i, setI] = useState(0);
  useEffect(() => { const id = setInterval(() => setI((x) => (x + 1) % HERO_IMGS.length), 3500); return () => clearInterval(id); }, []);
  return (
    <div style={{ position: "relative", aspectRatio: "4/3" }}>
      {HERO_IMGS.map((u, k) => (
        <img key={u} src={u} alt={t("AI redesigned interior", "Nội thất được AI thiết kế lại")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: k === i ? 1 : 0, transition: "opacity .8s ease" }} />
      ))}
    </div>
  );
}

export function FaqList() {
  const l = t("en", "vi") === "vi" ? 1 : 0;
  return (
    <div className="mx-auto max-w-3xl divide-y rounded-2xl border bg-white">
      {FAQ.map((f, i) => (
        <details key={i} className="group p-4">
          <summary className="cursor-pointer list-none font-medium">{f.q[l]}</summary>
          <p className="mt-2 text-sm text-neutral-600">{f.a[l]}</p>
        </details>
      ))}
    </div>
  );
}

type PubItem = { id: string; tool: ToolId; params: Preset; inputUrl: string | null; outputUrl: string };
export function Gallery() {
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
    <section id="gallery" className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="mb-6 text-center text-3xl font-bold">{t("Community gallery", "Thư viện cộng đồng")}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((it) => (
          <figure key={it.id} className="group relative overflow-hidden rounded-xl border">
            <img src={it.outputUrl} loading="lazy" className="aspect-square w-full object-cover transition group-hover:opacity-0" alt="" />
            {it.inputUrl && <img src={it.inputUrl} loading="lazy" className="absolute inset-0 aspect-square w-full object-cover opacity-0 transition group-hover:opacity-100" alt="" />}
            <button onClick={() => navigate(studioUrl(it.tool, it.params))} className="absolute bottom-2 left-2 rounded bg-black/80 px-3 py-1 text-xs text-white">{t("Reuse settings", "Dùng lại cài đặt")}</button>
          </figure>
        ))}
      </div>
      {next && <button disabled={busy} onClick={() => more(next)} className="mx-auto mt-6 block rounded border px-4 py-2 text-sm">{t("Load more", "Xem thêm")}</button>}
    </section>
  );
}

const HERO_WORDS = [["Exteriors", "Ngoại thất"], ["Gardens", "Sân vườn"], ["Interiors", "Nội thất"], ["Terraces", "Sân thượng"]];

function HeroWord() {
  const l = t("en", "vi") === "vi" ? 1 : 0;
  const [i, setI] = useState(0);
  const [show, setShow] = useState(true);
  useEffect(() => {
    let to: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setShow(false);
      to = setTimeout(() => { setI((x) => (x + 1) % HERO_WORDS.length); setShow(true); }, 180);
    }, 2600);
    return () => { clearInterval(id); clearTimeout(to); };
  }, []);
  return <span className="rotating-word" style={{ opacity: show ? 1 : 0, transition: "opacity .18s ease" }}>{HERO_WORDS[i][l]}</span>;
}

export function Home() {
  const { me } = useAuth();
  const l = t("en", "vi") === "vi" ? 1 : 0;
  const pick = (en: string, vi: string) => (l ? vi : en);
  const features: [string, string, string, string, string][] = [
    ["lock", "Structure-Lock", "Khoá cấu trúc", "Keeps your real room", "Giữ nguyên phòng thật"],
    ["swatch", "200+ styles", "200+ phong cách", "Rooms, gardens & exteriors", "Phòng, sân vườn & ngoại thất"],
    ["video", "1-click video", "Video 1 chạm", "Walkthroughs from your photo", "Video từ ảnh của bạn"],
    ["plan3d", "2D to 3D", "2D sang 3D", "Floor plans, instantly", "Mặt bằng tức thì"],
    ["shop", "Shop the look", "Mua theo thiết kế", "Find the real furniture", "Tìm nội thất thật"],
    ["remove", "Empty a room", "Dọn trống phòng", "One-click virtual staging", "Bài trí ảo một chạm"],
    ["sky", "Swap weather", "Đổi thời tiết", "Sky and light changes", "Đổi bầu trời & ánh sáng"],
    ["listing", "Stage listings", "Staging tin đăng", "Empty spaces, furnished", "Không gian trống có nội thất"],
    ["calc", "Budget estimator", "Ước tính ngân sách", "Know before you spend", "Biết chi phí trước khi chi"],
    ["license", "No watermark", "Không watermark", "Commercial license included", "Kèm giấy phép thương mại"],
  ];
  const badList: [string, string][] = [
    ["Reinvents the room, ignoring your real walls", "Tạo phòng mới, bỏ qua tường thật"],
    ["A different app and bill for every job", "Mỗi việc một ứng dụng, một hóa đơn"],
    ["No idea what the new design will cost", "Không biết chi phí thiết kế mới"],
    ["No video or floor plan of your real room", "Không có video hay mặt bằng phòng thật"],
    ["Designers cost $3,000+ and take weeks", "Nhà thiết kế $3.000+ và mất nhiều tuần"],
    ["One change means re-prompting from scratch", "Đổi một chi tiết là phải làm lại từ đầu"],
  ];
  const goodList: [string, string][] = [
    ["Keeps your real walls, windows, and layout", "Giữ nguyên tường, cửa sổ và bố cục thật"],
    ["Every tool you need under one login", "Mọi công cụ trong một tài khoản"],
    ["See the real budget before you spend", "Xem ngân sách trước khi chi"],
    ["Photo to video + 2D-to-3D floor plans", "Ảnh thành video + mặt bằng 2D sang 3D"],
    ["A photoreal redesign in 30 seconds", "Thiết kế chân thực trong 30 giây"],
    ["Change anything by clicking or typing", "Đổi mọi thứ bằng một cú nhấp hoặc gõ"],
  ];
  const steps: [string, string, string, string][] = [
    ["Upload", "Tải lên", "Snap a photo of any room, exterior, garden, sketch or listing image.", "Chụp ảnh phòng, ngoại thất, sân vườn, bản phác hoặc ảnh tin đăng."],
    ["Customize", "Tùy chỉnh", "Try 200+ looks, swap one piece or the whole room. Structure stays locked.", "Thử 200+ phong cách, đổi một món hoặc cả phòng. Cấu trúc luôn được khóa."],
    ["Done", "Hoàn tất", "In 30 seconds you're looking at the finished space. Download it or share it.", "Sau 30 giây bạn có không gian hoàn chỉnh. Tải về hoặc chia sẻ."],
  ];
  const options: { n: [string, string]; h: [string, string]; p: [string, string]; pills: [string[], string[]]; hl?: boolean }[] = [
    { n: ["Option 1", "Lựa chọn 1"], h: ["Hire an interior designer", "Thuê nhà thiết kế nội thất"], p: ["Weeks finding the right pro, $3,296 or more, and no guarantee the result matches your vision.", "Mất nhiều tuần tìm người phù hợp, từ 80 triệu đồng, và không đảm bảo kết quả như ý."], pills: [["Looks polished", "Costs a fortune"], ["Đẹp", "Rất tốn kém"]] },
    { n: ["Option 2", "Lựa chọn 2"], h: ["Do it yourself", "Tự làm"], p: ["Generic AI makes things up: clipped furniture, walls and windows that were never there.", "AI tổng quát tự bịa: nội thất lỗi, tường và cửa sổ không có thật."], pills: [["Cheap", "Glitchy results"], ["Rẻ", "Kết quả lỗi"]] },
    { n: ["Option 3 · Best choice", "Lựa chọn 3 · Tốt nhất"], h: ["Use SOLYC Gen Labs", "Dùng SOLYC Gen Labs"], p: ["Upload a photo, pick a style, click. A photoreal redesign of your actual room in 30 seconds.", "Tải ảnh, chọn phong cách, bấm. Thiết kế chân thực cho căn phòng thật trong 30 giây."], pills: [["Keeps your room", "Video tours"], ["Giữ nguyên phòng", "Video tour"]], hl: true },
  ];
  return (
    <div>
      <section className="hero" id="top">
        <div className="container">
          <div className="hero-grid">
            <div>
              <p className="eyebrow">SOLYC Gen Labs / {t("Material Intelligence", "Trí tuệ vật liệu")}</p>
              <h1>{t("Redesign", "Thiết kế lại")} <HeroWord /><br />{t("with AI, in less than 30 seconds", "bằng AI, trong chưa đầy 30 giây")}</h1>
              <p className="hero-copy">
                <strong>{t("Upload one photo.", "Tải lên một bức ảnh.")}</strong>{" "}
                {t("Get a real redesign in 30 seconds. Your walls, windows and layout stay exactly as they are.", "Nhận thiết kế thật trong 30 giây. Tường, cửa sổ và bố cục giữ nguyên.")}{" "}
                <strong>{t("Only the design changes.", "Chỉ thiết kế thay đổi.")}</strong>
              </p>
              <Link to={"/app"} className="btn hero-cta">{t("Start Now", "Bắt đầu ngay")} <span>→</span></Link>
              <div className="hero-meta"><p className="hero-copy" style={{ margin: 0, fontSize: 13 }}>{t("60+ interior · 25 exterior · 12 garden styles", "60+ phong cách nội thất · 25 ngoại thất · 12 sân vườn")}</p></div>
            </div>
            <div className="hero-visual">
              <div className="hero-image-wrap">
                <HeroSlides />
              </div>
              <div className="hero-image-caption"><span><ArchIcon n="redesign" size={15} /> <b>{t("Real", "Thiết kế")}</b> {t("redesigns", "thật")}</span><span><ArchIcon n="lock" size={15} /> {t("Structure", "Cấu trúc")} <b>{t("locked", "được khóa")}</b></span><span><ArchIcon n="shop" size={15} /> <b>{t("Shop", "Mua")}</b> {t("the look", "theo thiết kế")}</span></div>
              <div className="hero-tools">
                {[["sofa", "Interiors", "Nội thất"], ["house", "Exteriors", "Ngoại thất"], ["garden", "Gardens", "Sân vườn"], ["fill", "Virtual staging", "Staging ảo"], ["video", "Video tours", "Video tour"], ["plan3d", "3D floor plans", "Mặt bằng 3D"]].map(([i, en, vi]) => (
                  <div className="tool-mini" key={en}><span><ArchIcon n={i} size={20} /></span>{pick(en, vi)}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="workflow" id="how">
        <div className="container">
          <div className="workflow-card">
            {[["upload", "Step 1", "Bước 1", "Upload your photo", "Tải ảnh của bạn lên"], ["swatch", "Step 2", "Bước 2", "Set your preferences", "Chọn phong cách"], ["generate", "Step 3", "Bước 3", "Generate and use the result", "Tạo và dùng kết quả"]].map(([ic, a, b, c, d]) => (
              <div className="workflow-step" key={a}><div className="step-icon"><ArchIcon n={ic} size={24} /></div><div><strong>{pick(a, b)}</strong><small>{pick(c, d)}</small></div></div>
            ))}
          </div>
          <div className="hl-row">
            <Figure name="upload" caption={t("01 · Upload", "01 · Tải ảnh")} />
            <Figure name="style" caption={t("02 · Pick a style", "02 · Chọn phong cách")} />
            <Figure name="generate" caption={t("03 · Generate", "03 · Tạo thiết kế")} />
          </div>
        </div>
      </section>

      <section className="feature-band">
        <div className="container">
          <div className="feature-head">
            <div><p className="eyebrow">{t("One login. Every design tool.", "Một tài khoản. Mọi công cụ thiết kế.")}</p><h2 className="section-title">{t("Structure-Lock keeps your", "Khoá cấu trúc giữ nguyên")} <span>{t("real room", "căn phòng thật")}</span></h2></div>
            <p className="section-copy">{t("See the result before you spend. Explore 200+ styles and spaces, while the walls, windows and layout you started with stay exactly where they are.", "Xem kết quả trước khi chi tiền. Khám phá 200+ phong cách trong khi tường, cửa sổ và bố cục vẫn giữ nguyên.")}</p>
          </div>
          <div className="hl-row" style={{ marginBottom: 28 }}>
            <Figure name="lock" caption={t("Structure-Lock · layers held in place", "Khoá cấu trúc · giữ nguyên từng lớp")} />
            <Figure name="walls" caption={t("Walls & windows locked", "Tường & cửa sổ được khoá")} />
            <Figure name="styles" caption={t("200+ styles, one room", "200+ phong cách, một căn phòng")} />
          </div>
          <div className="feature-grid">
            {features.map(([ic, en, vi, den, dvi]) => (
              <div className="feature-tile" key={en}><div className="icon"><ArchIcon n={ic} size={24} /></div><strong>{pick(en, vi)}</strong><span>{pick(den, dvi)}</span></div>
            ))}
          </div>
          <div className="built-for">
            <span className="built-for-label">{t("Built for:", "Dành cho:")}</span>
            <div className="marquee"><div className="marquee-track">
              {[...PERSONAS, ...PERSONAS].map((p, i) => <span key={i}>{p.name[l]}</span>)}
            </div></div>
          </div>
        </div>
      </section>

      <section className="compare">
        <div className="container">
          <div className="compare-intro"><p className="eyebrow">{t("SOLYC Gen Labs vs. everything else", "SOLYC Gen Labs so với các lựa chọn khác")}</p><h2 className="section-title">{t("The smarter way to", "Cách thông minh để")} <span>{t("see it finished", "thấy thành phẩm")}</span></h2></div>
          <div className="compare-grid">
            <article className="compare-card bad"><div className="compare-label">{t("The other options", "Các lựa chọn khác")}</div><h3>{t("ChatGPT, Canva, CAD & designers", "ChatGPT, Canva, CAD & nhà thiết kế")}</h3>
              <ul>{badList.map(([a, b]) => <li key={a}>{pick(a, b)}</li>)}</ul></article>
            <article className="compare-card good"><div className="compare-label">{t("Best choice · The smarter way", "Lựa chọn tốt nhất")}</div><h3>SOLYC Gen Labs</h3>
              <ul>{goodList.map(([a, b]) => <li key={a}>{pick(a, b)}</li>)}</ul>
              <Link to={"/app"} className="btn small mt-6">{t("Get Started", "Bắt đầu")} <span>→</span></Link></article>
          </div>
        </div>
      </section>

      <section className="deep-dive">
        <div className="container">
          <p className="eyebrow">{t("From photo to finished space", "Từ ảnh đến không gian hoàn chỉnh")}</p>
          <h2 className="section-title">{t("AI house design in", "Thiết kế nhà bằng AI chỉ với")} <span>{t("just 3 steps.", "3 bước.")}</span></h2>
          <p className="section-copy">{t("Upload a photo of your house, facade, interior room, or garden. The AI restyles it while keeping your real walls, windows and layout.", "Tải ảnh nhà, mặt tiền, phòng hoặc sân vườn. AI đổi phong cách nhưng giữ nguyên tường, cửa sổ và bố cục.")}</p>
          <div className="deep-dive-layout">
            <div className="story-list">
              {steps.map(([a, b, c, d], i) => (
                <div className="story-step" key={a}><div className="story-number">{i + 1}</div><div><h3>{pick(a, b)}</h3><p>{pick(c, d)}</p></div></div>
              ))}
            </div>
            <Figure name="journey" dark intensity={0.7} caption={t("Photo → style → finished space", "Ảnh → phong cách → thành phẩm")} />
          </div>
        </div>
      </section>

      <section className="generator" id="generate">
        <div className="container">
          <div className="generator-header"><div><p className="eyebrow">{t("Your space, your preferences", "Không gian của bạn, lựa chọn của bạn")}</p><h2 className="section-title">{t("Start redesigning", "Bắt đầu thiết kế lại")} <span>{t("your space", "không gian của bạn")}</span></h2></div><p className="section-copy">{t("Your walls, windows and layout stay exactly as they are. Only the design changes.", "Tường, cửa sổ và bố cục giữ nguyên. Chỉ thiết kế thay đổi.")}</p></div>
          <div style={{ marginTop: 32 }}><Studio /></div>
        </div>
      </section>

      <section className="options">
        <div className="container">
          <div className="section-center"><p className="eyebrow">{t("A clear choice for every project", "Lựa chọn rõ ràng cho mọi dự án")}</p><h2 className="section-title">{t("You've really got", "Thực ra bạn chỉ có")} <span>{t("just 3 options.", "3 lựa chọn.")}</span></h2></div>
          <div className="option-grid">
            {options.map((o) => (
              <article key={o.h[0]} className={`option-card${o.hl ? " highlight" : ""}`} style={{ minHeight: 0 }}>
                <div className="option-num">{pick(...o.n)}</div><h3>{pick(...o.h)}</h3><p>{pick(...o.p)}</p>
                <div className="option-pills">{o.pills[l].map((x) => <span key={x}>{x}</span>)}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pricing" id="buy">
        <div className="container">
          <div className="section-center"><p className="eyebrow">{t("You're one step away", "Chỉ còn một bước")}</p><h2 className="section-title">{t("Pick a plan and see your", "Chọn gói và xem")} <span>{t("full design", "thiết kế đầy đủ")}</span></h2></div>
          <div style={{ marginTop: 40 }}><PricingTable /></div>
        </div>
      </section>

      {me && <PromptLibrary onUse={(tool, styleSlug) => navigate(studioUrl(tool as ToolId, { styleSlug }))} />}
      <Gallery />

      <section className="faq" id="faq">
        <div className="container">
          <div className="section-center" style={{ marginBottom: 40 }}><p className="eyebrow">{t("Got questions?", "Có thắc mắc?")}</p><h2 className="section-title">{t("Frequently", "Câu hỏi")} <span>{t("asked questions", "thường gặp")}</span></h2></div>
          <Figure name="Query" style={{ maxWidth: 300, margin: "0 auto 36px" }} />
          <FaqList />
        </div>
      </section>

      <section className="final-cta">
        <div className="container">
          <h2 className="section-title">{t("AI house design on your", "Thiết kế nhà bằng AI trên")} <span>{t("real space.", "không gian thật.")}</span><br />{t("In the next 30 seconds.", "Trong 30 giây tới.")}</h2>
          <p>{t("One photo in, a finished redesign out. Every tool under one login.", "Một ảnh vào, một thiết kế hoàn chỉnh ra. Mọi công cụ trong một tài khoản.")}</p>
          <Link to={"/app"} className="btn">{t("Start My Redesign", "Bắt đầu thiết kế")} <span>→</span></Link>
          <div className="hl-row" style={{ maxWidth: 760, margin: "48px auto 0" }}>
            <Figure name="room" dark caption={t("Interiors", "Nội thất")} />
            <Figure name="house" dark caption={t("Exteriors", "Ngoại thất")} />
            <Figure name="garden" dark caption={t("Gardens", "Sân vườn")} />
          </div>
        </div>
      </section>
    </div>
  );
}

export { bi };
