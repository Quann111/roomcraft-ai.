import React, { useEffect, useMemo, useRef, useState } from "react";
import { AiThinking } from "./AiThinking";
import { DownloadLink } from "./SaveToPhotos";
import { RoomMaterials, type RunRow } from "./RoomMaterials";
import { bi, t } from "./i18n";

type Row = RunRow;
type Room = { name: string; versions: Row[] };
const ink = "#1c1b19", line = "rgba(0,0,0,0.12)";
const link: React.CSSProperties = { padding: 0, border: 0, background: "none", color: "inherit", font: "inherit", textDecoration: "underline", cursor: "pointer" };
const open = (r: Row) => r.status === "RUNNING" || r.status === "QUEUED";

/**
 * One Business 3D Floorplan run: every room with its versions (redraws join the same run), and redrawing chosen rooms with a
 * note each, matched to a reference room of the run. Used on the floor plan page and in the history preview.
 */
export function PlanRun({ batchId, onChange }: { batchId: string; onChange?: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [shown, setShown] = useState<Record<string, number>>({}); // room -> version index the user is looking at
  const [picked, setPicked] = useState<Record<string, string>>({}); // room -> note, for rooms ticked for a redraw
  const [refId, setRefId] = useState<string | null>(null);
  const [autoCheck, setAutoCheck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null); // room open in the material window (by name)
  const timer = useRef<number | undefined>(undefined);

  const load = () => fetch(`/api/bizplan/run/${batchId}`).then((r) => r.json() as Promise<any>).then((d) => setRows(d.items ?? [])).catch(() => setRows((x) => x ?? []));
  useEffect(() => { setRows(null); setShown({}); setPicked({}); setRefId(null); load(); return () => clearTimeout(timer.current); }, [batchId]);

  // Rooms in the order they were first rendered; a redraw is a newer version of the same room.
  const rooms = useMemo<Room[]>(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows ?? []) { const k = String(r.params?.roomType ?? r.id); m.set(k, [...(m.get(k) ?? []), r]); }
    return [...m].map(([name, versions]) => ({ name, versions }));
  }, [rows]);
  const running = (rows ?? []).filter(open);

  // While something renders, ask about each open job (that poll also finishes it on the server), then reload the run.
  useEffect(() => {
    clearTimeout(timer.current);
    if (!running.length) return;
    timer.current = window.setTimeout(async () => {
      const before = running.map((r) => r.id);
      const now = await Promise.all(before.map((id) => fetch(`/api/generations/${id}`).then((r) => r.json() as Promise<any>).catch(() => null)));
      await load();
      if (now.some((g) => g && !open(g))) onChange?.();
    }, 5000);
    return () => clearTimeout(timer.current);
  }, [rows]);

  // The reference the server will use when nobody picks one: the living room, else the first finished room not being redrawn.
  const done = (r?: Row) => !!r && r.status === "SUCCESS" && !!r.outputUrl;
  const latestDone = (room: Room) => [...room.versions].reverse().find(done);
  const autoRef = useMemo(() => {
    const free = rooms.filter((r) => !(r.name in picked)).map(latestDone).filter(done) as Row[];
    return free.find((r) => /living|khách/i.test(String(r.params?.roomType))) ?? free[0] ?? null;
  }, [rooms, picked]);
  // The user's pick in this session, else the reference the last redraw used, else the automatic one.
  const lastRef = [...(rows ?? [])].reverse().find((r) => r.params?.refId)?.params.refId as string | undefined;
  const ref = (refId && rows?.find((r) => r.id === refId && done(r))) || (lastRef && rows?.find((r) => r.id === lastRef && done(r) && !(String(r.params?.roomType) in picked))) || autoRef;

  const toggle = (name: string) => setPicked((p) => { const n = { ...p }; if (name in n) delete n[name]; else n[name] = ""; return n; });
  const count = Object.keys(picked).length;
  const redo = async () => {
    setBusy(true); setErr("");
    try {
      const body = {
        batchId, refId: ref?.id, ...(autoCheck ? { autoCheck: true } : {}),
        rooms: Object.entries(picked).map(([name, note]) => { const room = rooms.find((r) => r.name === name)!; return { id: room.versions[room.versions.length - 1].id, note }; }),
      };
      const r = await fetch("/api/bizplan/redo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d: any = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Error · Lỗi");
      setPicked({}); setShown({}); await load(); onChange?.();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  if (!rows) return <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{t("Loading…", "Đang tải…")}</p>;
  return (
    <div style={{ display: "grid", gap: 12, color: ink }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 230px), 1fr))", gap: 12 }}>
        {rooms.map((room) => {
          const v = room.versions, i = Math.min(shown[room.name] ?? v.length - 1, v.length - 1), r = v[i];
          const isRef = !!ref && ref.id === r.id, ticked = room.name in picked;
          return (
            <figure key={room.name} style={{ margin: 0, minWidth: 0, border: `1px solid ${ticked ? ink : line}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              <div style={{ position: "relative", aspectRatio: "4 / 3", display: "grid", placeItems: "center", background: "#f4f1ea" }}>
                {done(r) ? <button type="button" onClick={() => setEditing(room.name)} title={t("Open large and change materials", "Xem lớn và đổi vật liệu")} style={{ display: "block", width: "100%", height: "100%", padding: 0, border: 0, background: "none", cursor: "zoom-in" }}><img src={r.outputUrl!} alt={room.name} loading="lazy" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} /></button>
                  : r.status === "FAILED" ? <span style={{ fontSize: 13, opacity: 0.7, padding: 10, textAlign: "center" }}>{`${t("Failed (credit refunded)", "Lỗi (đã hoàn credit)")}${r.error ? ` · ${bi(r.error)}` : ""}`}</span> : <AiThinking tile />}
                {isRef && <span style={{ position: "absolute", top: 6, left: 6, padding: "2px 7px", borderRadius: 99, background: "var(--gold, #c9a24b)", color: ink, fontSize: 11, fontWeight: 700 }}>★ {t("Reference", "Ảnh mẫu")}</span>}
                {v.length > 1 && (
                  <span style={{ position: "absolute", right: 6, bottom: 6, display: "flex", alignItems: "center", gap: 4, padding: "2px 4px", borderRadius: 99, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11 }}>
                    <button type="button" aria-label={t("Older version", "Bản trước")} disabled={i === 0} onClick={() => setShown((s) => ({ ...s, [room.name]: i - 1 }))} style={{ ...link, textDecoration: "none", color: "#fff", opacity: i === 0 ? 0.35 : 1, padding: "0 4px" }}>‹</button>
                    {i + 1}/{v.length}
                    <button type="button" aria-label={t("Newer version", "Bản sau")} disabled={i === v.length - 1} onClick={() => setShown((s) => ({ ...s, [room.name]: i + 1 }))} style={{ ...link, textDecoration: "none", color: "#fff", opacity: i === v.length - 1 ? 0.35 : 1, padding: "0 4px" }}>›</button>
                  </span>
                )}
              </div>
              <figcaption style={{ display: "grid", gap: 6, padding: "8px 10px", fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <b style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 }}>{room.name}</b>
                  {done(r) && <DownloadLink url={r.outputUrl!} name={`${room.name}.png`} style={link} phone={t("Save to Photos", "Lưu vào Ảnh")}>{t("Download", "Tải xuống")}</DownloadLink>}
                </div>
                {done(r) && <button type="button" style={{ ...link, justifySelf: "start" }} onClick={() => setEditing(room.name)}>{t("Change materials", "Đổi vật liệu")}</button>}
                {r.params?.changes || r.params?.material ? <span style={{ fontSize: 12, opacity: 0.7 }}>{t("Materials", "Vật liệu")}: {Object.entries(r.params.changes ?? { [r.params.surface ?? "floor"]: r.params.material }).map(([s, m]) => `${bi(s)} · ${bi(String(m))}`).join(", ")}</span> : null}
                {r.params?.note && <span style={{ fontSize: 12, opacity: 0.7 }}>{t("Note", "Ghi chú")}: {r.params.note}</span>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: open(r) ? "default" : "pointer", opacity: open(r) ? 0.5 : 1 }}>
                    <input type="checkbox" checked={ticked} disabled={open(r)} onChange={() => toggle(room.name)} /> {t("Redraw", "Vẽ lại")}
                  </label>
                  {done(r) && !isRef && <button type="button" style={link} onClick={() => setRefId(r.id)} title={t("Redraws match this room's finishes", "Phòng vẽ lại sẽ theo vật liệu của phòng này")}>☆ {t("Use as reference", "Dùng làm ảnh mẫu")}</button>}
                </div>
                {ticked && <input value={picked[room.name]} maxLength={300} onChange={(e) => setPicked((p) => ({ ...p, [room.name]: e.target.value }))} placeholder={t("What should change? (optional) e.g. add a railing", "Cần sửa gì? (không bắt buộc) VD: thêm lan can")} style={{ padding: 7, borderRadius: 8, border: `1px solid ${line}`, font: "inherit", fontSize: 13, minWidth: 0 }} />}
              </figcaption>
            </figure>
          );
        })}
      </div>
      {count > 0 && (
        <div style={{ display: "grid", gap: 8, padding: 12, border: `1px solid ${line}`, borderRadius: 12, background: "#faf8f3" }}>
          <span style={{ fontSize: 13 }}>{ref ? t(`Redraws will match the finishes of “${ref.params?.roomType}”.`, `Phòng vẽ lại sẽ đồng bộ vật liệu với “${ref.params?.roomType}”.`) : t("No finished room to use as a reference yet.", "Chưa có phòng nào xong để làm ảnh mẫu.")}</span>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
            <input type="checkbox" checked={autoCheck} onChange={(e) => setAutoCheck(e.target.checked)} style={{ marginTop: 2 }} />
            <span>{t("Auto-check each room and redo it once if it does not match the plan (no extra credit)", "Tự kiểm tra từng phòng, không khớp bản vẽ thì tự vẽ lại 1 lần (không tốn thêm credit)")}</span>
          </label>
          <button type="button" disabled={busy} onClick={redo} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: ink, color: "#fff", cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, font: "inherit" }}>
            {busy ? t("Starting…", "Đang bắt đầu…") : t(`Redraw ${count} room${count > 1 ? "s" : ""} · ${count} credit${count > 1 ? "s" : ""}`, `Vẽ lại ${count} phòng · ${count} credit`)}
          </button>
        </div>
      )}
      {err && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>{bi(err)}</p>}
      {editing && rooms.some((x) => x.name === editing) && (
        <RoomMaterials batchId={batchId} name={editing} versions={rooms.find((x) => x.name === editing)!.versions} onClose={() => setEditing(null)}
          onStarted={() => { setShown((s) => { const n = { ...s }; delete n[editing]; return n; }); load(); onChange?.(); }} />
      )}
    </div>
  );
}
