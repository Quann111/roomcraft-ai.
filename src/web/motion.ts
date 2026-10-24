import "./motion.css";

// Every visible piece animates on its own: each line of text, button, link, menu item, icon, image and field.
const LEAF = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "dt", "dd", "blockquote", "figcaption", "summary", "label", "small", "strong", "b", "em",
  "a", "button", "img", "picture", "video", "input", "select", "textarea", "td", "th", "svg.icon-svg", ".icon", ".badge", ".chip", ".eyebrow", ".tag",
  "[class*='label']", "[class*='tag']", "[class*='number']", "[class*='icon']", "[class*='avatar']", ".hero-slides", ".hl-figure", ".iso-box",
  "[class*='visual-choice']", "[class*='image']", "[class*='art']", "[class*='upload']", "[class*='before']", "[class*='compare'] img",
].join(",");
const SKIP = ".marquee *, .iso-box *, [data-hairline] *, canvas, [data-no-motion], [data-no-motion] *, .scroll-progress, .zoom-modal, .zoom-modal *, .ba-range, option";
const INTERACTIVE = "[class*='card'], [class*='tile'], .workflow-step, .story-step, .tool-mini, .module-tool, .module-tool-link, .nav-item, .hl-figure, .visual-choice, .space-choice, .chip";
const ATOMIC = "button, a, .chip, .hl-figure, [class*='visual-choice'], [class*='image'], [class*='art']";

const NO_TEXT = new Set(["SCRIPT", "STYLE", "HTML", "BODY", "HEAD", "TITLE", "NOSCRIPT", "OPTION", "TEMPLATE"]);
const ownText = (el: Element) => !NO_TEXT.has(el.tagName) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim() !== "");

const kindOf =(el: Element) =>
  el.matches("img, picture, video, .hl-figure, .iso-box, [class*='image'], [class*='art'], [class*='visual-choice']") ? "media"
  : el.matches("h1, h2, .section-title") ? "title" : "up";

export function installMotion() {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
  const root = document.documentElement;
  root.classList.add("motion");

  // Stagger each batch that enters together, in reading order.
  const io = new IntersectionObserver((entries) => {
    const batch = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
    batch.sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return ra.top - rb.top || ra.left - rb.left; });
    batch.forEach((el, i) => {
      const delay = Math.min(i, 10) * 32;
      reveal(el, delay);
      io.unobserve(el);
    });
  }, { rootMargin: "0px 0px -4% 0px", threshold: 0.01 });

  function reveal(el: HTMLElement, delay: number) {
    el.style.setProperty("--mv-delay", `${delay}ms`);
    el.dataset.mvIn = "";
    // Once revealed, hand the element back to its own hover/active transitions.
    setTimeout(() => (el.dataset.mvDone = ""), delay + 1000);
  }

  let ready = false;
  const inView = (el: Element) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };

  const tag = (el: Element) => {
    if (!(el instanceof HTMLElement || el instanceof SVGElement) || el.hasAttribute("data-mv") || el.hasAttribute("data-mv-wrap") || el.matches(SKIP)) return;
    // Inside something that already animates: ride along with it instead of fading twice.
    if (el.parentElement?.closest("[data-mv]")) return;
    // A text block that holds other pieces (a card link, a heading with a badge) lets the inner pieces animate.
    if (!el.matches(ATOMIC) && !ownText(el) && el.querySelector(LEAF)) return void el.setAttribute("data-mv-wrap", "");
    const h = el as HTMLElement;
    if (ready && inView(el)) {
      // Appeared because of a click while on screen: settle in at once.
      h.dataset.mv = "quick";
      requestAnimationFrame(() => requestAnimationFrame(() => reveal(h, 0)));
      return;
    }
    h.dataset.mv = getComputedStyle(el).transform !== "none" ? "fade" : kindOf(el);
    io.observe(el);
  };

  // Document order, so an outer piece claims its contents before they are visited.
  const candidate = (el: Element) => el.matches(LEAF) || ownText(el);
  const scan = (node: Element | Document) => {
    if (node instanceof Element && candidate(node)) tag(node);
    node.querySelectorAll?.("body *, *").forEach((el) => candidate(el) && tag(el));
  };
  scan(document);
  setTimeout(() => (ready = true), 1200);
  new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => n instanceof Element && scan(n));
  }).observe(document.body, { childList: true, subtree: true });

  // Content inside a closed <details> is never reported as visible, so re-check it when it opens.
  document.addEventListener("toggle", (e) => {
    const d = e.target as HTMLDetailsElement;
    if (d.open) d.querySelectorAll("[data-mv]:not([data-mv-in])").forEach((el) => { io.unobserve(el); io.observe(el); });
  }, true);

  // Cards light up and tilt toward the pointer, like the hairline figures answer it.
  document.addEventListener("pointermove", (e) => {
    const el = (e.target as Element | null)?.closest?.(INTERACTIVE) as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--py", `${((e.clientY - r.top) / r.height) * 100}%`);
    el.style.setProperty("--tx", `${((e.clientX - r.left) / r.width - 0.5) * 2}`);
    el.style.setProperty("--ty", `${((e.clientY - r.top) / r.height - 0.5) * 2}`);
  }, { passive: true });

  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);
  const onScroll = () => {
    const h = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
