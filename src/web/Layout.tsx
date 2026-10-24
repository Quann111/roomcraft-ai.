import React, { useState } from "react";
import { Link } from "./router";
import { useAuth } from "./auth";
import { getLang, setLang, t } from "./i18n";
import { FEATURES, PERSONAS, USE_CASES } from "./data";

function LangToggle() {
  const l = getLang();
  return (
    <button onClick={() => setLang(l === "vi" ? "en" : "vi")} className="btn small ghost" aria-label={t("Language", "Ngôn ngữ")}>
      {l === "vi" ? "VI · EN" : "EN · VI"}
    </button>
  );
}

export function Header() {
  const { me, loaded, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = [
    ["/app", t("Redesign", "Thiết kế")],
    ["/ai-features", t("Features", "Tính năng")],
    ["/design-styles", t("Styles", "Phong cách")],
    ["/pricing", t("Pricing", "Bảng giá")],
  ] as const;
  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <div className={`container header-inner${open ? " menu-open" : ""}`}>
        <Link to="/" className="brand" aria-label="SOLYC Gen Labs"><img src="/solyc/logo.png" alt="SOLYC Gen Labs" style={{ height: 46, width: "auto" }} /></Link>
        <nav className="top-nav" aria-label={t("Primary navigation", "Điều hướng chính")}>
          {nav.map(([to, label]) => <Link key={to} to={to} onClick={close}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <LangToggle />
          <Link to="/projects" className="btn small ghost">{t("My projects", "Dự án")}</Link>
          <Link to="/app" className="btn small">{t("Start", "Bắt đầu")}</Link>
        </div>
        <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label={t("Menu", "Menu")} aria-expanded={open}>☰</button>
      </div>
    </header>
  );
}

export function Footer() {
  const col = (title: string, links: [string, string][]) => (
    <div>
      <h4>{title}</h4>
      {links.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
    </div>
  );
  const lang = getLang() === "vi" ? 1 : 0;
  return (
    <footer>
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <img src="/solyc/logo.png" alt="SOLYC Gen Labs" style={{ height: 56, width: "auto", background: "#fff", borderRadius: 4, padding: "6px 10px" }} />
            <p>{t("Material Intelligence Platform for Architecture, Construction & Interiors.", "Nền tảng trí tuệ vật liệu cho Kiến trúc, Xây dựng & Nội thất.")}<br /><span style={{ color: "var(--gold)", letterSpacing: ".1em" }}>{t("DESIGN WHAT’S POSSIBLE.", "THIẾT KẾ NHỮNG KHẢ THỂ MỚI.")}</span></p>
          </div>
          <div className="footer-links">
            {col(t("Product", "Sản phẩm"), [["/redesign", t("Redesign tool", "Công cụ thiết kế")], ["/pricing", t("Pricing", "Bảng giá")], ["/projects", t("My projects", "Dự án của tôi")], ["/free-ai-tools", t("Free tools", "Công cụ miễn phí")]])}
            {col(t("Features", "Tính năng"), FEATURES.slice(0, 5).map((f) => [`/${f.slug}`, f.name[lang]] as [string, string]).concat([["/ai-features", t("All features →", "Tất cả →")]]))}
            {col(t("Built for", "Dành cho"), PERSONAS.map((p) => [`/${p.slug}`, p.name[lang]] as [string, string]))}
            {col(t("Company", "Công ty"), [["/about-us", t("About", "Giới thiệu")], ["/terms-of-service", t("Terms of Service", "Điều khoản dịch vụ")], ["/privacy-policy", t("Privacy Policy", "Chính sách bảo mật")], ["/refund-policy", t("Refund Policy", "Chính sách hoàn tiền")]])}
          </div>
        </div>
      </div>
    </footer>
  );
}
