import React, { useState } from "react";
import { createPortal } from "react-dom";
import { t } from "./i18n";

// A web page cannot write to the phone's photo library; a download lands in Files / Downloads.
// The share sheet can: iOS offers "Save Image", Android offers Google Photos or the gallery app.
// Where sharing files is not possible (in-app browsers, older phones), the image is shown full screen
// instead, since long-pressing an image offers "Save to Photos" in every phone browser.
const isPhone = () => { try { return matchMedia("(pointer: coarse)").matches; } catch { return false; } };
const files = new Map<string, File>();

function useSave(url: string, name: string) {
  const [state, setState] = useState<"" | "busy" | "again">("");
  const [hold, setHold] = useState(false);
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
  const overlay = hold && createPortal( // on body: a card's transform and overflow would clip a fixed overlay
    <div className="zoom-modal" style={{ zIndex: 2000 }} onClick={() => setHold(false)}>
      <div className="zoom-box" onClick={(e) => e.stopPropagation()}>
        <img src={url} alt="" style={{ WebkitTouchCallout: "default", WebkitUserSelect: "auto" } as React.CSSProperties} />
        <div className="zoom-cap"><b style={{ fontSize: 14 }}>{t("Press and hold the image, then tap “Save to Photos”.", "Nhấn giữ ảnh, rồi chọn “Lưu vào Ảnh”.")}</b><button type="button" onClick={() => setHold(false)} aria-label={t("Close", "Đóng")}>✕</button></div>
      </div>
    </div>, document.body
  );
  return { save, state, overlay };
}

type Props = { url: string; name: string; className?: string; style?: React.CSSProperties; title?: string; children: React.ReactNode; phone: React.ReactNode };

/** Desktop: the Download link (`children`). Phones: a Save to Photos button (`phone`) instead, which opens the share sheet. */
export function DownloadLink({ url, name, className, style, title, children, phone }: Props) {
  const s = useSave(url, name);
  if (url.endsWith(".mp4") || !isPhone()) return <a className={className} style={style} title={title} href={url} download={name}>{children}</a>;
  const again = s.state === "again";
  return (
    <>
      <button type="button" className={className} style={style} title={again ? t("Tap again to save", "Chạm lần nữa để lưu") : t("Save to Photos", "Lưu vào Ảnh")} onClick={s.save} disabled={s.state === "busy"}>
        {again ? t("Tap again to save", "Chạm lần nữa để lưu") : phone}
      </button>
      {s.overlay}
    </>
  );
}
