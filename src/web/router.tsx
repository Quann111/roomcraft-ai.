import React, { useSyncExternalStore } from "react";

const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
window.addEventListener("popstate", emit);
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
// Opened from file:// (single-file export): keep the route in the hash, e.g. index.html#/pricing
const FILE = location.protocol === "file:";
const fileUrl = () => new URL(location.hash.startsWith("#/") ? location.hash.slice(1) : "/", "http://x");
if (FILE) window.addEventListener("hashchange", emit);
const snap = () => (FILE ? location.hash : location.pathname + location.search + location.hash);

export function navigate(to: string) {
  const hash = to.split("#")[1];
  if (FILE) {
    location.hash = to.split("#")[0] || "/";
    setTimeout(() => (hash ? document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }) : window.scrollTo(0, 0)), 30);
    return;
  }
  history.pushState(null, "", to);
  emit();
  setTimeout(() => (hash ? document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }) : window.scrollTo(0, 0)), 30);
}

export function useLocation() {
  useSyncExternalStore(subscribe, snap);
  if (FILE) { const u = fileUrl(); return { path: u.pathname.replace(/\/+$/, "") || "/", search: u.searchParams }; }
  return { path: location.pathname.replace(/\/+$/, "") || "/", search: new URLSearchParams(location.search) };
}

export function Link({ to, children, className, onClick }: { to: string; children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <a href={FILE ? "#" + to : to} className={className} onClick={(e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault(); onClick?.(); navigate(to);
    }}>{children}</a>
  );
}
