import React, { useEffect, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./solyc.css";
import { installDemo } from "./demo";
import { getLang, subscribeLang } from "./i18n";
import { AuthProvider } from "./auth";
import { useLocation, navigate } from "./router";
import { Header, Footer } from "./Layout";
import { Home } from "./Home";
import { App as SolycApp } from "./App";
import { PricingPage } from "./Pricing";
import { FEATURES, PERSONAS, USE_CASES } from "./data";
import {
  AuthPage, DOC_SLUGS, DocPage, FeaturePage, FeaturesHub, NotFound, PersonaPage, ProjectsPage, RedesignPage, StylePage, StylesHub, UseCaseHandler,
} from "./Pages";

function ToApp() {
  const { search } = useLocation();
  useEffect(() => { navigate("/app" + (search.toString() ? "?" + search.toString() : "")); }, []);
  return null;
}

function Routes() {
  const { path } = useLocation();
  const seg = path.split("/").filter(Boolean);
  const slug = seg[0] ?? "";
  if (path === "/") return <Home />;
  if (seg.length === 1) {
    if (slug === "redesign") return <ToApp />;
    if (slug === "pricing") return <PricingPage />;
    if (slug === "login") return <AuthPage mode="login" />;
    if (slug === "register") return <AuthPage mode="signup" />;
    if (slug === "projects") return <ProjectsPage />;
    if (slug === "ai-features") return <FeaturesHub />;
    if (slug === "design-styles") return <StylesHub />;
    if (slug === "ai-use-cases") return <UseCaseHandler hub />;
    if (slug === "free-ai-tools") return <UseCaseHandler hub free />;
    if (DOC_SLUGS.includes(slug)) return <DocPage slug={slug} />;
    if (FEATURES.some((f) => f.slug === slug)) return <FeaturePage slug={slug} />;
    if (USE_CASES.some((u) => u.slug === slug)) return <UseCaseHandler slug={slug} />;
    if (PERSONAS.some((p) => p.slug === slug)) return <PersonaPage slug={slug} />;
  }
  if (seg[0] === "design-styles" && seg.length === 3) return <StylePage scope={seg[1]} slug={seg[2]} />;
  return <NotFound />;
}

function App() {
  useSyncExternalStore(subscribeLang, getLang); // re-render everything on language change
  const { path } = useLocation();
  useEffect(() => { document.documentElement.lang = getLang(); }, []);
  useEffect(() => {
    const h = location.hash.slice(1);
    if (h) setTimeout(() => document.getElementById(h)?.scrollIntoView(), 80);
  }, [path]);
  if (path === "/app") return <AuthProvider><SolycApp /></AuthProvider>;
  return (
    <AuthProvider>
      <div className="solyc flex min-h-screen flex-col">
        <Header />
        <main className="flex-1"><Routes /></main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

if (location.protocol === "file:") installDemo();

createRoot(document.getElementById("root")!).render(<App />);
