// Chapter 01 · GTA (1997): The view from above - timed to VO cues.
// Dundee → arc across the Atlantic → three real cities in fake moustaches → dive into Miami → pixel Vice City,
// pigeon, "no minimap", the arrow, locked streets, "Remember this".
import * as THREE from 'three';
import { fatLine, glow, flatPoly } from '../world/geo.js';
import { pixelCity } from '../world/pixelcity.js';
import { loadWorld, buildWorld } from '../world/world.js';
import { track, win, inv, eio, smooth, lerp, eback, eout, clamp } from '../core/util.js';
import { el, show, caption, label, stamp } from '../core/hud.js';
import { cues, captionAt } from '../core/tl.js';

const MOUSTACHE = `<svg width="120" height="44" viewBox="0 0 120 44"><path d="M60 14c-6-10-20-14-32-8C16 12 10 24 2 22c4 12 22 18 38 10 8-4 14-10 20-14 6 4 12 10 20 14 16 8 34 2 38-10-8 2-14-10-26-16-12-6-26-2-32 8z" fill="#1b120c" stroke="#fff" stroke-width="3"/></svg>`;
const PIGEON = f => `<svg width="264" height="168" viewBox="0 0 22 14" shape-rendering="crispEdges"><g fill="#8d93a3"><rect x="8" y="6" width="9" height="4"/><rect x="16" y="5" width="3" height="3"/><rect x="5" y="7" width="3" height="2"/></g>
  <rect x="19" y="6" width="2" height="1" fill="#ffb000"/><rect x="17" y="5" width="1" height="1" fill="#000"/><g fill="#6c7282">${f ? '<rect x="9" y="1" width="5" height="5"/>' : '<rect x="9" y="10" width="5" height="3"/>'}</g></svg>`;
const LOCK = `<svg width="64" height="72" viewBox="0 0 16 18" shape-rendering="crispEdges"><path d="M4 8V5a4 4 0 0 1 8 0v3" fill="none" stroke="#ffd400" stroke-width="2"/><rect x="2" y="8" width="12" height="9" fill="#ffd400" stroke="#000" stroke-width="1"/><rect x="7" y="11" width="2" height="3" fill="#000"/></svg>`;

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, tilt, W, H, project, TL } = ctx;
  const C = cues(TL, 'ch01'), D = C.dur;
  scene.background = new THREE.Color('#050b12');
  const Wd = await loadWorld();
  const world = buildWorld(scene, Wd, { land: '#2a3440', foreign: '#1e252e', city: '#344555', lights: '#ffc46b', oceanA: '#04101c', oceanB: '#082038', border: '#4a5c70', coast: '#5fb8ff' });
  const A = Wd.anchors;
  scene.add(new THREE.HemisphereLight('#ffffff', '#333333', 1.2));

  // Dundee → USA arc
  const arcPts = [];
  const from = A.dundee, to = [A.nyc[0] - 60000, A.nyc[1] + 40000];
  for (let i = 0; i <= 80; i++) { const u = i / 80; arcPts.push([lerp(from[0], to[0], u), 20 + Math.sin(u * Math.PI) * 140000, lerp(from[1], to[1], u) - Math.sin(u * Math.PI) * 60000]); }
  const arc = fatLine(arcPts, '#ffd400', 3, { dashed: true, opacity: 0.95 }); scene.add(arc);
  arc.material.dashSize = 9; arc.material.gapSize = 7;
  const head = glow('#ffd400', 1); scene.add(head);
  const pins = ['dundee', 'nyc', 'sf', 'miami'].map(k => { const g = glow(k === 'dundee' ? '#7fd8ff' : '#ffd400', 1); scene.add(g); return { k, g }; });

  // pixel Vice City, sitting off real Miami
  const pix = new THREE.Group(); pix.position.set(A.miamibeach[0] + 2500, 8, A.miamibeach[1]); scene.add(pix);
  const pc = pixelCity(pix, { seed: 86, palette: ['#b88a9a', '#8ab0aa', '#c4b890', '#a493b8', '#c49a86', '#9a9a9a', '#8aa8b8'], land: '#4a4652', plate: '#5a5664', lines: '#cfc8e0', cars: ['#ff4fa0', '#4ff0ff', '#ffffff', '#ffe066'] });
  // locked zones
  const zones = [[[20, -100], [140, -100], [140, 10], [20, 10]], [[-150, 20], [-40, 20], [-40, 110], [-150, 110]]];
  const zMeshes = zones.map(z => { const m = flatPoly(z, '#ff2a3a', 3.5, 0.0); m.material.blending = THREE.AdditiveBlending; pix.add(m); return m; });
  const zLines = zones.map(z => { const l = fatLine(z.map(([x, zz]) => [x, 4, zz]), '#ff3344', 3, { closed: true, opacity: 0, dashed: true }); pix.add(l); return l; });

  // ---------- HUD ----------
  const cap = caption(ui);
  const dma = el(ui, 'ctr', `<div style="font:700 20px Oswald;letter-spacing:.35em;color:#7fd8ff">DUNDEE · SCOTLAND</div><div style="font:400 72px/0.95 Bebas;letter-spacing:.04em">DMA DESIGN</div><div style="font:700 24px Mono;color:#ffd400">1997</div>`, { textAlign: 'center' });
  const ms = ['nyc', 'sf', 'miami'].map(k => ({ k, e: el(ui, 'ctr', MOUSTACHE) }));
  const cards = [['nyc', 'LIBERTY CITY', 'NEW YORK', 'L2'], ['sf', 'SAN ANDREAS', 'SAN FRANCISCO', 'L2p2'], ['miami', 'VICE CITY', 'MIAMI', 'L2p3']].map(([k, a, b, cue]) => ({ k, cue,
    e: el(ui, 'ctr', `<div class="px" style="font-size:26px;color:#ffd400;text-shadow:3px 3px 0 #000">${a}</div><div style="font:400 50px/1 Bebas;letter-spacing:.12em;margin-top:8px;text-shadow:0 2px 12px #000">= ${b}</div>`, { textAlign: 'center', whiteSpace: 'nowrap' }) }));
  const pigeon = el(ui, '', '', {});
  const nomap = el(ui, '', `<div style="width:230px;height:230px;border:4px dashed rgba(255,255,255,.7);border-radius:8px;position:relative"><svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%"><path d="M12 12L88 88M88 12L12 88" stroke="#ff3344" stroke-width="7"/></svg></div><div class="px" style="font-size:16px;margin-top:14px;text-shadow:2px 2px 0 #000">NO MINIMAP</div>`, { left: '70px', bottom: '70px' });
  const arrow = el(ui, 'ctr', `<svg width="150" height="150" viewBox="0 0 12 12" shape-rendering="crispEdges"><g fill="#ffd400" stroke="#000" stroke-width=".5"><polygon points="6,0 11,7 7,7 7,12 5,12 5,7 1,7"/></g></svg>`, { left: W / 2 + 'px', top: '150px' });
  const believe = el(ui, 'px ctr', 'THE ARROW BELIEVED IN YOU <span style="color:#ff4f7a">♥</span>', { left: W / 2 + 'px', top: '275px', fontSize: '26px', textShadow: '3px 3px 0 #000', whiteSpace: 'nowrap' });
  const locks = zones.flatMap((z, zi) => [0, 1, 2].map(i => ({ zi, i, at: [lerp(z[0][0], z[1][0], 0.2 + i * 0.3), lerp(z[0][1], z[2][1], 0.3 + (i % 2) * 0.35)], e: el(ui, 'ctr', LOCK) })));
  const note = el(ui, '', `<div style="font:400 58px/1 Marker;color:#1d1a16">REMEMBER<br>THIS IDEA.</div><div class="yrs" style="margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px 10px;justify-items:start"></div>`,
    { right: '110px', top: '170px', width: '440px', padding: '30px 30px 34px', background: '#ffe766', boxShadow: '0 30px 60px rgba(0,0,0,.55)', borderRadius: '4px' });
  const yrs = note.querySelector('.yrs');
  const years = ['2001', '2002', '2004', '2008'].map(y => { const s = document.createElement('div'); s.className = 'stamp'; s.style.cssText = 'font-size:24px;border-width:4px;padding:0 8px;transform:rotate(-6deg);opacity:0'; s.textContent = '🔒 ' + y; yrs.appendChild(s); return s; });

  const logT = (keys, t) => Math.exp(track(keys.map(([a, b, e]) => [a, Math.log(b), e]), t));
  const tDive = C.L3, tPix = C.L3 + 2.0;

  function update(t) {
    const [px, pz] = pc.update(t, 0.06);
    // ----- camera -----
    const atl = [(A.dundee[0] + A.nyc[0]) / 2 - 20000, (A.dundee[1] + A.nyc[1]) / 2 - 60000];
    const us = [-10000, 25000], mi = [pix.position.x, pix.position.z];
    const carW = [pix.position.x + px, pix.position.z + pz];
    const h = logT([[0, 1150000], [C.L1p2 - 0.4, 1000000], [C.L1p2 + 1.6, 700000], [tDive, 640000], [tPix, 520], [C.L4 - 0.2, 260], [C.L4 + 1.4, 640], [D, 700]], t);
    const tx = track([[0, atl[0] + 60000], [C.L1p2 - 0.4, atl[0]], [C.L1p2 + 1.6, us[0]], [tDive, us[0]], [tDive + 1.6, mi[0]], [tPix, mi[0]], [tPix + 1.2, carW[0]], [C.L4 - 0.2, carW[0]], [C.L4 + 1.4, mi[0]]], t, eio);
    const tz = track([[0, atl[1]], [C.L1p2 - 0.4, atl[1]], [C.L1p2 + 1.6, us[1]], [tDive, us[1]], [tDive + 1.6, mi[1]], [tPix, mi[1]], [tPix + 1.2, carW[1]], [C.L4 - 0.2, carW[1]], [C.L4 + 1.4, mi[1]]], t, eio);
    const lean = 0.35 * (1 - smooth(inv(tDive, tDive + 1.4, t)));
    camera.near = Math.max(0.5, h * 0.02); camera.far = h * 40 + 2e5; camera.updateProjectionMatrix();
    camera.up.set(0, 0, -1);
    camera.position.set(tx, h, tz + h * Math.tan(lean) + 0.01); camera.lookAt(tx, 0, tz);

    // ----- world layers -----
    const real = 1 - smooth(inv(tDive + 1.0, tPix - 0.3, t));
    [world.countries, world.lakes].forEach(m => m.material.opacity = real);
    const kLo = world.lod(h, real);
    world.borders.forEach(b => b.material.opacity = 0.5 * real);
    Object.values(world.detail).forEach(d => { d.children.forEach(m => m.material && (m.material.opacity = 0)); d.userData.lines.forEach(l => l.material.opacity = 0); });
    world.lightsMat.uniforms.uOp.value = real; world.lightsMat.uniforms.uTime.value = t; world.coastGlow.forEach(l => l.material.opacity = 0.6 * real * kLo);

    // arc draw: hide the tail beyond progress by shrinking instance count
    const ap = eio(inv(4.2, C.L1p2 + 0.2, t));
    arc.geometry.instanceCount = Math.max(1, Math.floor(ap * 80)); arc.material.opacity = 0.95 * (1 - smooth(inv(C.L2 - 0.5, C.L2 + 0.5, t)));
    const hi = Math.min(80, Math.floor(ap * 80)); head.position.set(...arcPts[hi]); const hs = h * 0.03; head.scale.set(hs, hs, 1); head.material.opacity = ap > 0 && ap < 1 ? 1 : 0;
    pins.forEach(({ k, g }, i) => {
      const t0 = k === 'dundee' ? 2.6 : C.L1p2 + 0.5 + i * 0.35, o = smooth(inv(t0, t0 + 0.4, t)) * real * (k === 'dundee' ? 1 - smooth(inv(C.L1p2 + 0.6, C.L1p2 + 1.6, t)) : 1);
      const P = A[k]; g.position.set(P[0], 40, P[1]); const s = h * 0.03 * (1 + 0.5 * eback(inv(t0, t0 + 0.5, t)) * (1 - inv(t0 + 0.5, t0 + 1, t))); g.scale.set(s, s, 1); g.material.opacity = o;
    });
    { const [x, y] = project(A.dundee[0], 0, A.dundee[1]); dma.style.left = x + 'px'; dma.style.top = y - 120 + 'px'; show(dma, win(t, 2.8, C.L1p2 + 1.2, .4, .5), `translate(-50%,-50%) scale(${lerp(0.9, 1, eout(inv(2.8, 3.4, t)))})`); }
    ms.forEach(({ k, e }, i) => {
      const t0 = C.L1p2 + 0.7 + i * 0.35, [x, y] = project(A[k][0], 0, A[k][1]);
      const wig = Math.sin((t - C.L1p2) * 14 + i) * 8 * Math.exp(-Math.pow(t - (C.L1p2 + 3.0), 2) * 1.5);
      e.style.left = x + 'px'; e.style.top = y + 30 + 'px'; show(e, win(t, t0, C.L2 + 0.4, .3, .4), `translate(-50%,-50%) rotate(${wig}deg) scale(${eback(inv(t0, t0 + 0.4, t))})`);
    });
    cards.forEach(({ k, cue, e }) => {
      const t0 = C[cue] - 0.05, [x, y] = project(A[k][0], 0, A[k][1]);
      const off = k === 'sf' ? [0, -110] : k === 'nyc' ? [-40, -120] : [-160, -40];
      e.style.left = x + off[0] + 'px'; e.style.top = y + off[1] + 'px'; show(e, win(t, t0, tDive + 0.5, .25, .4), `translate(-50%,-50%) scale(${eback(inv(t0, t0 + 0.35, t))})`);
    });
    // pigeon flies across during the "pigeon with a criminal record" phrase
    { const p = inv(tPix + 0.2, C.L3p2, t); pigeon.innerHTML = PIGEON(Math.floor(t * 8) % 2); show(pigeon, p > 0 && p < 1 ? 1 : 0, `translate(${lerp(-200, W + 100, p)}px, ${360 + Math.sin(p * 9) * 30}px)`); }
    show(nomap, win(t, C.L3p2 - 0.05, C.L4, .2, .4), `scale(${eback(inv(C.L3p2 - 0.05, C.L3p2 + 0.3, t))})`);
    { const a = inv(C.L3p3 - 0.05, C.L3p3 + 0.35, t), wob = t > C.L3p4 ? Math.sin(t * 9) * 12 * Math.exp(-(t - C.L3p4) * 0.6) : 0;
      show(arrow, win(t, C.L3p3 - 0.05, C.L4 + 0.6, .1, .4), `translate(-50%,-50%) scale(${lerp(2.4, 1, eback(a))}) rotate(${-20 + wob}deg)`); }
    show(believe, win(t, C.L3p4, C.L4 + 0.6, .2, .4), 'translate(-50%,-50%)');
    // locked zones
    zMeshes.forEach((m, i) => m.material.opacity = 0.28 * smooth(inv(C.L4 + 1.2 + i * 0.6, C.L4 + 1.8 + i * 0.6, t)) * (0.8 + 0.2 * Math.sin(t * 5)));
    zLines.forEach((l, i) => l.material.opacity = smooth(inv(C.L4 + 1.2 + i * 0.6, C.L4 + 1.8 + i * 0.6, t)));
    locks.forEach(({ zi, i, at, e }) => { const t0 = C.L4 + 1.6 + zi * 0.6 + i * 0.18, [x, y] = project(pix.position.x + at[0], 10, pix.position.z + at[1]);
      const d = eout(inv(t0, t0 + 0.3, t)); e.style.left = x + 'px'; e.style.top = y - 60 * (1 - d) + 'px'; show(e, win(t, t0, D, .1, .4), `translate(-50%,-50%) scale(${lerp(1.6, 1, d)})`); });
    show(note, win(t, C.L4p2 - 0.1, D, .3, .4), `translateX(${(1 - eout(inv(C.L4p2 - 0.1, C.L4p2 + 0.4, t))) * 600}px) rotate(-3deg)`);
    years.forEach((y, i) => { const t0 = C.L4p4 + i * 0.22, p = inv(t0, t0 + 0.2, t); y.style.opacity = p > 0 ? 1 : 0; y.style.transform = `rotate(-6deg) scale(${p > 0 ? lerp(2, 1, eout(p)) : 0})`; });
    cap(captionAt(TL, 'ch01', t));

    // ----- look -----
    const retro = smooth(inv(tPix - 1.0, tPix + 0.2, t));
    grade.uPixel.value = retro > 0.05 ? Math.round(lerp(1, 6, retro)) : 0; grade.uScan.value = 0.35 * retro; grade.uCA.value = 0.001 + 0.002 * retro;
    grade.uSat.value = 1.15; grade.uVig.value = 0.65; grade.uGrain.value = 0.05; grade.uLift.value.set(0, 0, 0.01); grade.uGain.value.set(1, 1, 1.02);
    tilt.uAmt.value = 0;
    bloom.strength = 0.8; bloom.threshold = 0.6; bloom.radius = 0.6;
    grade.uFade.value = Math.min(inv(0, 0.5, t), 1 - inv(D - 0.5, D, t), 1 - 0.85 * Math.exp(-Math.pow((t - (tPix - 0.6)) * 3, 2)));
  }
  return { duration: D, stills: [3.5, 10.5, 19, 23, 28, 33, 40.5], update };
}
