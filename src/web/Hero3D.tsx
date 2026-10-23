import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { bi } from "./i18n";

type Palette = { floor: string; wall: string; sofa: string; rug: string; accent: string; wood: string; shade: string; sky: string };
const PALETTES: Record<string, Palette> = {
  Scandinavian: { floor: "#d9c3a0", wall: "#f3f1ec", sofa: "#c9d3cf", rug: "#efe9dd", accent: "#7e9c82", wood: "#caa77a", shade: "#fff3d6", sky: "#cfe6f5" },
  Industrial: { floor: "#5b5753", wall: "#8b8a88", sofa: "#5a3a28", rug: "#2f2f31", accent: "#b5532f", wood: "#3a3330", shade: "#ffb84d", sky: "#9fb2c0" },
  Japandi: { floor: "#cdb48f", wall: "#e9e2d6", sofa: "#bfb6a6", rug: "#8d8576", accent: "#3b3a38", wood: "#a98258", shade: "#f6e7c4", sky: "#dfe9e4" },
  Bohemian: { floor: "#b88c63", wall: "#e8c9a6", sofa: "#b2552f", rug: "#2c6e6a", accent: "#e0a23b", wood: "#7a4a2a", shade: "#ffd28a", sky: "#f3d9b8" },
  "Art Deco": { floor: "#2a2a35", wall: "#14323a", sofa: "#0f6f66", rug: "#c8a24a", accent: "#d9b45a", wood: "#1b1b22", shade: "#ffe6a3", sky: "#6b8fa3" },
  Coastal: { floor: "#e6d9c0", wall: "#f6fbfd", sofa: "#ffffff", rug: "#9ec3d6", accent: "#2f7ea8", wood: "#d8c4a0", shade: "#fff7e0", sky: "#8fd0ef" },
};
const NAMES = Object.keys(PALETTES);

export function Hero3D() {
  const mount = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState(NAMES[0]);
  const [auto, setAuto] = useState(true);
  const [ok, setOk] = useState(true);
  const target = useRef<Palette>(PALETTES[NAMES[0]]);

  useEffect(() => { target.current = PALETTES[style]; }, [style]);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setStyle((s) => NAMES[(NAMES.indexOf(s) + 1) % NAMES.length]), 3800);
    return () => clearInterval(t);
  }, [auto]);

  useEffect(() => {
    const el = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setOk(false); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    const mat = (c: string, rough = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: rough });
    const M = {
      floor: mat("#fff"), wall: mat("#fff", 0.95), sofa: mat("#fff", 0.9), rug: mat("#fff", 1), accent: mat("#fff", 0.6), wood: mat("#fff", 0.6),
      shade: new THREE.MeshStandardMaterial({ color: "#fff", emissive: "#fff", emissiveIntensity: 0.9 }),
      sky: new THREE.MeshBasicMaterial({ color: "#fff" }),
    };
    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; room.add(o); return o;
    };
    const room = new THREE.Group();
    scene.add(room);

    box(7, 0.2, 7, M.floor, 0, -0.1, 0);                 // floor
    box(7, 3.6, 0.2, M.wall, 0, 1.8, -3.4);              // back wall
    box(0.2, 3.6, 7, M.wall, -3.4, 1.8, 0);              // left wall
    box(2.2, 1.5, 0.05, M.sky, 0.6, 2.0, -3.28);         // window glass
    for (const [w, h, x, y] of [[2.4, 0.1, 0.6, 2.8], [2.4, 0.1, 0.6, 1.2], [0.1, 1.7, -0.55, 2], [0.1, 1.7, 1.75, 2], [0.06, 1.5, 0.6, 2]] as number[][])
      box(w, h, 0.1, M.wood, x, y, -3.25);
    box(3.4, 0.03, 2.4, M.rug, 0, 0.02, 0.1);            // rug
    // sofa
    box(3, 0.55, 1.1, M.sofa, 0, 0.3, -2.3);
    box(3, 0.9, 0.3, M.sofa, 0, 0.8, -2.75);
    box(0.3, 0.8, 1.1, M.sofa, -1.65, 0.4, -2.3);
    box(0.3, 0.8, 1.1, M.sofa, 1.65, 0.4, -2.3);
    box(0.7, 0.5, 0.2, M.accent, -0.8, 0.85, -2.45).rotation.z = 0.15; // cushions
    box(0.7, 0.5, 0.2, M.accent, 0.8, 0.85, -2.45).rotation.z = -0.15;
    // coffee table
    box(1.5, 0.1, 0.9, M.wood, 0, 0.5, -0.4);
    for (const [x, z] of [[-0.65, -0.7], [0.65, -0.7], [-0.65, -0.1], [0.65, -0.1]]) box(0.1, 0.45, 0.1, M.wood, x, 0.25, z);
    // art
    box(1.3, 1, 0.06, M.accent, -1.7, 2.3, -3.25);
    box(1.1, 0.8, 0.07, M.wall, -1.7, 2.3, -3.24);
    // floor lamp
    const lamp = new THREE.Group(); lamp.position.set(2.5, 0, -2.5); room.add(lamp);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2), M.wood); pole.position.y = 1.1; lamp.add(pole);
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 24, 1, true), M.shade); sh.position.y = 2.3; sh.material.side = THREE.DoubleSide; lamp.add(sh);
    // plant
    const plant = new THREE.Group(); plant.position.set(-2.6, 0, -1.2); room.add(plant);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 20), M.wood); pot.position.y = 0.25; pot.castShadow = true; plant.add(pot);
    const leafMat = new THREE.MeshStandardMaterial({ color: "#4f8a55", roughness: 0.7 });
    const leaves: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.28 - i * 0.02, 16, 12), leafMat);
      l.position.set(Math.sin(i * 2.4) * 0.22, 0.7 + i * 0.22, Math.cos(i * 2.4) * 0.22); l.castShadow = true; plant.add(l); leaves.push(l);
    }
    // pendant
    const pend = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), M.shade); pend.position.set(0, 2.9, -0.3); room.add(pend);
    box(0.02, 0.9, 0.02, M.wood, 0, 3.4, -0.3);

    scene.add(new THREE.HemisphereLight("#ffffff", "#c9b9a0", 0.7));
    const sun = new THREE.DirectionalLight("#fff4e0", 1.3);
    sun.position.set(4, 7, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); scene.add(sun);
    const glow = new THREE.PointLight("#ffd9a0", 8, 6); glow.position.set(0, 2.7, -0.3); scene.add(glow);

    const cur = Object.fromEntries(Object.entries(PALETTES[NAMES[0]]).map(([k, v]) => [k, new THREE.Color(v)])) as Record<keyof Palette, THREE.Color>;
    const tmp = new THREE.Color();
    const size = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size); ro.observe(el);
    const mouse = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2; mouse.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    el.addEventListener("pointermove", onMove);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0, t0 = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const t = (now - t0) / 1000;
      const tgt = target.current;
      (Object.keys(cur) as (keyof Palette)[]).forEach((k) => cur[k].lerp(tmp.set(tgt[k]), 0.06));
      M.floor.color.copy(cur.floor); M.wall.color.copy(cur.wall); M.sofa.color.copy(cur.sofa); M.rug.color.copy(cur.rug);
      M.accent.color.copy(cur.accent); M.wood.color.copy(cur.wood); M.sky.color.copy(cur.sky);
      M.shade.color.copy(cur.shade); M.shade.emissive.copy(cur.shade); glow.color.copy(cur.shade);
      const ang = reduced ? 0 : Math.sin(t * 0.25) * 0.15;
      camera.position.set(6.2 + mouse.x * 0.8 + ang * 3, 4.6 - mouse.y * 0.5, 7.2);
      camera.lookAt(0, 1.3, -0.5);
      leaves.forEach((l, i) => { l.scale.setScalar(1 + (reduced ? 0 : Math.sin(t * 1.5 + i) * 0.03)); });
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); el.removeEventListener("pointermove", onMove);
      scene.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); } });
      Object.values(M).forEach((m) => m.dispose()); leafMat.dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="relative">
      <div ref={mount} className="aspect-[4/3] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 to-sky-100 shadow-xl [&>canvas]:h-full [&>canvas]:w-full" role="img" aria-label={bi("3D room that changes interior style · Phòng 3D đổi phong cách nội thất")}>
        {!ok && <p className="p-8 text-center text-neutral-500">{bi("WebGL unavailable · Trình duyệt không hỗ trợ WebGL")}</p>}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {NAMES.map((n) => (
          <button key={n} onClick={() => { setAuto(false); setStyle(n); }} className={`rounded-full px-3 py-1 text-xs backdrop-blur ${style === n ? "bg-black text-white" : "border bg-white/80 text-neutral-800"}`} aria-pressed={style === n}>{bi(n)}</button>
        ))}
        <button onClick={() => setAuto(!auto)} className="rounded-full bg-white/80 px-3 py-1 text-xs backdrop-blur" aria-label={bi("Toggle autoplay · Bật/tắt tự chạy")}>{auto ? "⏸" : "▶"}</button>
      </div>
    </div>
  );
}
