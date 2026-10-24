import React, { useState } from "react";
import { t } from "./i18n";

// A web page cannot write to the phone's photo library; a download lands in Files / Downloads.
// The share sheet can: iOS offers "Save Image", Android offers Google Photos or the gallery app.
// So phones that can share files get this button next to Download; elsewhere it renders nothing.
const canShareFiles = () => {
  try {
    return matchMedia("(pointer: coarse)").matches && typeof navigator.canShare === "function"
      && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] });
  } catch { return false; }
};
const files = new Map<string, File>();

export function SaveToPhotos({ url, name, className, style, icon }: { url: string; name: string; className?: string; style?: React.CSSProperties; icon?: React.ReactNode }) {
  const [state, setState] = useState<"" | "busy" | "again">("");
  if (url.endsWith(".mp4") || !canShareFiles()) return null;
  const save = async () => {
    try {
      let file = files.get(url);
      if (!file) {
        setState("busy");
        const blob = await (await fetch(url)).blob(); // already shown on the page, so usually served from the cache
        const type = blob.type || "image/png", ext = type === "image/jpeg" ? "jpg" : type.split("/")[1];
        file = new File([blob], name.replace(/\.\w+$/, `.${ext}`), { type });
        files.set(url, file);
      }
      await navigator.share({ files: [file] });
      setState("");
    } catch (e: any) {
      // The browser only shares straight after a tap; if loading took too long, the next tap shares the loaded file.
      setState(e?.name === "NotAllowedError" ? "again" : "");
    }
  };
  return (
    <button type="button" className={className} style={style} onClick={save} disabled={state === "busy"}>
      {icon}{state === "busy" ? "…" : state === "again" ? t("Tap again to save", "Chạm lần nữa để lưu") : t("Save to Photos", "Lưu vào Ảnh")}
    </button>
  );
}
