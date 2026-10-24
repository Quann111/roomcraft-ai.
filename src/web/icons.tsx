// Architectural line icons, 24×24, drawn with currentColor strokes.
// Isometric room: floor, two back walls, a window on the right wall.
const ROOM = '<path d="M3 16.5 12 21l9-4.5L12 12z"/><path d="M3 16.5v-9L12 3v9M12 3l9 4.5v9"/>';
const WIN = '<path d="M15 8.6v3.2l3 1.5v-3.2z"/>';

export const ARCH: Record<string, string> = {
  room: ROOM + WIN,
  redesign: ROOM + WIN + '<path d="M7.5 8.2v3.2M5.9 9.8h3.2"/>',
  generate: ROOM + WIN + '<path d="M7.5 8.2v3.2M5.9 9.8h3.2M20.5 1v2.6M19.2 2.3h2.6"/>',
  magic: '<path d="m4 20 10-10"/><path d="m12.5 8.5 2-2 3 3-2 2z"/><path d="M7 3v3M5.5 4.5h3M19 14v3M17.5 15.5h3M15 2.5v1.5M14.25 3.25h1.5"/>',
  frame: '<rect x="3" y="4" width="18" height="16" rx="1"/><rect x="6" y="7" width="12" height="10"/><path d="m8 15 3-3 2 2 3-3"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.2-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  sketch: '<path d="M3 20v-9l7-6 7 6v2" stroke-dasharray="2 2.2"/><path d="M3 20h8"/><path d="M13.5 21v-2.5L19.5 12.5 22 15l-6 6z"/>',
  fill: ROOM + '<path d="M9 16.6v-1.8l3-1.5 3 1.5v1.8l-3 1.5z"/><path d="m9 14.8 3 1.5 3-1.5M12 16.3v1.8"/>',
  decor: '<path d="M9 21h6M9.8 21c-1.8-1.8-1.8-5.5 0-7.5h4.4c1.8 2 1.8 5.7 0 7.5"/><path d="M12 13.5V8"/><path d="M12 9c-3 0-4.5-2-4.5-5 3 0 4.5 2 4.5 5Zm0 2c2.5 0 4-1.6 4-4.2-2.5 0-4 1.6-4 4.2Z"/>',
  swatch: '<rect x="3" y="3" width="6" height="18" rx="1"/><path d="m9 7 4.3-2.4 4.4 8.2L9 17.5"/><path d="m9 18.5 10.6-5.7 1.2 2.4L9 21"/><circle cx="6" cy="17.5" r="1"/>',
  remove: '<path d="M6 12V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" stroke-dasharray="2 2"/><path d="M4 12h16v4H4zM6 16v3m12-3v3" stroke-dasharray="2 2"/><path d="m3 3 18 18"/>',
  sky: '<path d="M3 21v-7l6-5 6 5v7z"/><path d="M8 21v-4h2v4"/><circle cx="18" cy="6" r="2.5"/><path d="M18 1.5v1M18 9.5v1M13.5 6h1M21.5 6h1M14.8 2.8l.7.7M20.5 8.5l.7.7"/>',
  material: '<rect x="3" y="3" width="8" height="8"/><path d="M3 7h8M7 3v8"/><rect x="13" y="13" width="8" height="8"/><path d="M13 16h8M13 19h8"/><path d="M15 5h3a2 2 0 0 1 2 2v3m0 0-1.6-1.6M20 10l1.6-1.6M9 19H6a2 2 0 0 1-2-2v-3m0 0 1.6 1.6M4 14l-1.6 1.6"/>',
  roller: '<rect x="4" y="3" width="14" height="5" rx="1"/><path d="M18 5.5h2v5h-8v3"/><rect x="10.5" y="13.5" width="3" height="7.5" rx="1"/>',
  floor: '<path d="M2 20 7 8h10l5 12z"/><path d="M9.6 8 8.2 20M14.4 8l1.4 12M4.6 14h14.8"/>',
  finder: '<path d="M4 13V8a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2"/><path d="M3 13h9M4 13v5m7-5v1"/><circle cx="16.5" cy="15.5" r="3.5"/><path d="m19 18 3 3"/>',
  composer: '<rect x="3" y="3" width="18" height="18" rx="1"/><rect x="6" y="6" width="7" height="4"/><rect x="15.5" y="6" width="2.5" height="2.5"/><circle cx="15.5" cy="15.5" r="2.5"/><rect x="6" y="13" width="4" height="5"/>',
  transfer: '<rect x="2" y="5" width="8" height="10" rx="1"/><rect x="14" y="9" width="8" height="10" rx="1"/><path d="M11 10h3.5m-1.6-1.6 1.6 1.6-1.6 1.6"/><path d="m4 12.5 2-2 2 2M16 16.5l2-2 2 2"/>',
  textdesign: '<path d="M3 5h8M3 9h6M3 13h8"/><path d="M13 21v-6l4-3.5 4 3.5v6z"/><path d="M16 21v-3h2v3"/>',
  daynight: '<circle cx="8" cy="12" r="3.5"/><path d="M8 4.5v1.5M8 18v1.5M.8 12h1.5M2.9 6.9 4 8M2.9 17.1 4 16"/><path d="M17 4a8 8 0 1 0 4.8 14.4A6.5 6.5 0 0 1 17 4Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>',
  plan3d: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z"/><path d="m3 8 9 5 9-5M12 13v8M7.5 5.5l9 5"/>',
  bizplan: '<path d="M3 21V9l9-5 9 5v12"/><path d="M2 21h20"/><path d="M8 17v-3M12 17v-6M16 17v-4"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/><path d="M6 15v-2.5L9 10l3 2.5V15z"/>',
  critique: '<rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 4V2.5h6V4"/><path d="m9 13 2 2 4-4"/>',
  advisor: '<circle cx="12" cy="5" r="2"/><path d="M11 7 5 21M13 7l6 14M7.6 15h8.8"/>',
  lock: '<path d="M3 21V10l9-7 9 7v11z"/><rect x="8.5" y="13" width="7" height="6" rx="1"/><path d="M10 13v-1.5a2 2 0 0 1 4 0V13"/>',
  shop: '<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9.5 17.5v-3h5v3M9.5 14.5V12"/>',
  listing: '<path d="M2 21h20"/><path d="M4 21v-8l5-4 5 4v8"/><path d="M18 21V9"/><rect x="15" y="10" width="7" height="4"/>',
  calc: '<rect x="5" y="2" width="14" height="20" rx="2"/><rect x="8" y="5" width="8" height="4"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01"/>',
  license: '<rect x="3" y="3" width="18" height="13" rx="1"/><path d="M7 7h10M7 10h6"/><circle cx="16" cy="16" r="3"/><path d="m14.4 18.6-.9 3.4 2.5-1.4 2.5 1.4-.9-3.4"/>',
  upload: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="m6 18 4-4 3 3 2-2 3 3"/><path d="M12 11V2m0 0-3 3m3-3 3 3"/>',
  sofa: '<path d="M5 13V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4"/><path d="M4 12h16a2 2 0 0 1 2 2v4H2v-4a2 2 0 0 1 2-2ZM5 18v2m14-2v2"/>',
  house: '<path d="m3 11 9-7 9 7v9H3v-9Z"/><path d="M9 20v-6h6v6"/>',
  garden: '<path d="M12 21v-9M8 21h8"/><path d="M12 12c-3.5 0-6-2.5-6-6.5 4 0 6 2.5 6 6.5Zm0 2c3 0 5-2.2 5-5.5-3 0-5 2.2-5 5.5Z"/>',
};

export function ArchIcon({ n, size = 22, className = "arch-icon" }: { n: string; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ARCH[n] ?? ARCH.room }} />;
}
