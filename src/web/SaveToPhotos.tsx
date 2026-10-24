import React, { useState } from "react";
import { createPortal } from "react-dom";
import { t } from "./i18n";

// A web page cannot write to the phone's photo library; a download lands in Files / Downloads.
// The share sheet can: iOS offers "Save Image", Android offers Google Photos or the gallery app.
// Where sharing files is not possible (in-app browsers, older phones), the button shows the image
// full screen instead, since long-pressing an image offers "Save to Photos" in every phone browser.
const isPhone = () => { try { return matchMedia("(pointer: coarse)").matches; } catch { return false; } };
const files = new Map<string, File>();

/** `label: false` renders the icon only, for the small action buttons on history cards. */
export function SaveToPhotos({ url, name, className, style, icon, label = true }: { url: string; name: string; className?: string; style?: React.CSSProperties; icon?: React.ReactNode; label?: boolean }) {
  const [state, setState] = useState<"" | "busy" | "again">("");
  const [hold, setHold] = useState(false);
  if (url.endsWith(".mp4") || !isPhone()) return null;
  const save = async () => {
    if (typeof navigator.share !== "function") return setHold(true);
    try {
      let file = files.get(url);
      if (!file) {
        setState("busy");
        const blob = await (await fetch(url)).blob(); // already shown on the page, so usually served from the cache
        const type = blob.type || "image/png", ext = type === "image/jpeg" ? "jpg" : type.split("/")[1];
        file = new File([blob], name.replace(/\.\w+$/, `.${ext}`), { type });
        files.set(url, file);
      }
      if (navigator.canShare && !navigator.canShare({ files: [file] })) { setState(""); return setHold(true); }
      await navigator.share({ files: [file] });
      setState("");
    } catch (e: any) {
      // The browser only shares straight after a tap; if loading took too long, the next tap shares the loaded file.
      if (e?.name === "NotAllowedError" && state !== "again") return setState("again");
      setState("");
      if (e?.name !== "AbortError") setHold(true);
    }
  };
  const text = state === "busy" ? "…" : state === "again" ? t("Tap again to save", "Chạm lần nữa để lưu") : t("Save to Photos", "Lưu vào Ảnh");
  return (
    <>
      <button type="button" className={className} style={style} onClick={save} disabled={state === "busy"} title={t("Save to Photos", "Lưu vào Ảnh")} aria-label={label ? undefined : text}>
        {icon}{label && text}
      </button>
      {hold && createPortal( // on body: a card's transform and overflow would clip a fixed overlay
        <div className="zoom-modal" style={{ zIndex: 2000 }} onClick={() => setHold(false)}>
          <div className="zoom-box" onClick={(e) => e.stopPropagation()}>
            <img src={url} alt="" style={{ WebkitTouchCallout: "default", WebkitUserSelect: "auto" } as React.CSSProperties} />
            <div className="zoom-cap"><b style={{ fontSize: 14 }}>{t("Press and hold the image, then tap “Save to Photos”.", "Nhấn giữ ảnh, rồi chọn “Lưu vào Ảnh”.")}</b><button type="button" onClick={() => setHold(false)} aria-label={t("Close", "Đóng")}>✕</button></div>
          </div>
        </div>, document.body
      )}
    </>
  );
}
