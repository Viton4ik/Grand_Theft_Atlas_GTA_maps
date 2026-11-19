// Chapter 10 · The scoreboard. Every 3D map at the same scale, in release order, with a ghost slot for Leonida.
// L1 maps pop in · L2 trend line 8→76 with the GTA IV dip, IV towers stretch ("taller beats wider")
// L3 camera evolution (sky → shoulder → ocean floor) and radar evolution (arrow → radar → GPS)
// L4 the Excuse Board with an empty #5 slot, "STILL CLOSED".
import * as THREE from 'three';
import { LC3, VC, LC4, SA, V } from '../world/maps.js';
import { buildMap } from '../world/env.js';
import { loadWorld } from '../world/world.js';
import { leonida } from '../world/leonida.js';
import { fatLine, flatPoly } from '../world/geo.js';
import { track, win, inv, eout, eio, smooth, eback, lerp, clamp } from '../core/util.js';
import { el, show, caption, stamp, excuseBoard, radar } from '../core/hud.js';
import { cues, captionAt, wordAt } from '../core/tl.js';

const ICON = {
  sky: c => `<svg viewBox="0 0 120 120" width="150" height="150"><g stroke="${c}" stroke-width="5" fill="none"><rect x="14" y="58" width="92" height="50" rx="4" stroke-dasharray="8 6"/><path d="M60 10v34M48 32l12 12 12-12"/></g><rect x="52" y="76" width="16" height="10" fill="${c}"/></svg>`,
  shoulder: c => `<svg viewBox="0 0 120 120" width="150" height="150"><g fill="${c}"><circle cx="60" cy="40" r="17"/><path d="M24 112c0-26 16-44 36-44s36 18 36 44z"/></g><path d="M8 20h22M8 20v22" stroke="${c}" stroke-width="5" fill="none"/></svg>`,
  ocean: c => `<svg viewBox="0 0 120 120" width="150" height="150"><g stroke="${c}" stroke-width="5" fill="none"><path d="M6 26c12-10 24 10 36 0s24 10 36 0 24 10 36 0"/><path d="M6 108c18-16 30-6 48-12s30-18 60 0"/></g><g fill="${c}"><ellipse cx="54" cy="66" rx="18" ry="9"/><path d="M70 66l14-9v18z"/><circle cx="92" cy="44" r="3"/><circle cx="98" cy="34" r="2"/></g></svg>`
};

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, project, TL, W, H } = ctx; const tiltP = ctx.tilt;
  const C = cues(TL, 'ch10'), D = C.dur, w = (cue, word) => wordAt(TL, 'ch10', cue, word);
  scene.background = new THREE.Color('#07090f');
  const grid = new THREE.GridHelper(80000, 400, '#1b2233', '#111726'); grid.position.y = -1; scene.add(grid);
  scene.add(new THREE.HemisphereLight('#ffffff', '#222233', 1.0));

  const L = [
    { def: LC3(), name: 'GTA III', year: 2001, km: 8.12, acc: '#ff9a3c', land: '#2a2622' },
    { def: VC(), name: 'VICE CITY', year: 2002, km: 9.11, acc: '#ff3fa4', land: '#221a2c' },
    { def: SA(), name: 'SAN ANDREAS', year: 2004, km: 38.2, acc: '#ffc24a', land: '#4a3d22' },
    { def: LC4(), name: 'GTA IV', year: 2008, km: 16.14, acc: '#9fb4c8', land: '#1d2129' },
    { def: V(), name: 'GTA V', year: 2013, km: 75.84, acc: '#4fd1ff', land: '#2c3a26' }
  ];
  // lay the maps out in a row, bottoms aligned, same scale
  const GAP = 330; let x = 0;
  L.forEach(m => {
    const g = new THREE.Group();
    m.built = buildMap(g, m.def, { land: m.land, coast: m.acc, coastW: 3, side: '#05060a', depth: 3, noLights: true,
      mat: { night: 0.6, dim: 0.9, win: m.acc, win2: '#ffffff', fogNear: 1e6, fogFar: 1e6, floor: 0.9 },
      cars: [m.acc, '#ffffff'], carsPer: 0.6, pitch: 0.2, street: 0.06, hScale: 0.7 });
    const [x0, z0, x1, z1] = m.built.bbox, wdt = x1 - x0;
    g.position.set(x + wdt / 2 - (x0 + x1) / 2, 0, -z1);     // z1 → 0 (bottom edge on the baseline)
    m.cx = x + wdt / 2; m.top = -(z1 - z0); m.w = wdt; x += wdt + GAP;
    scene.add(g); m.g = g;
  });
  // ghost slot for GTA VI (Leonida): dashed outline, filled after release
  // GTA VI · Leonida: dashed silhouette from REAL Florida at our estimated land area (see ch09), filled in once measured
  const LE = leonida(await loadWorld(), 96);
  const ghostW = LE.size[0]; const ghost = { cx: x + ghostW / 2, top: -LE.size[1], km: 150 };
  const gz = -LE.size[1] / 2;
  const ghostG = new THREE.Group(); ghostG.position.set(ghost.cx, 0, gz); scene.add(ghostG);
  const ghostFill = LE.polys.map(p => { const m = flatPoly(p, '#ff3fa4', 0.5, 0.0); ghostG.add(m); return m; });
  const ghostLines = LE.polys.filter(p => p.length > 20).map(p => { const l = fatLine(p.map(([a, b]) => [a, 2, b]), '#ff7aa2', 2.5, { closed: true, dashed: true, opacity: 0 }); l.material.dashSize = 30; l.material.gapSize = 22; ghostG.add(l); return l; });
  const ghostLine = { material: { set opacity(v) { ghostLines.forEach(l => l.material.opacity = v); ghostFill.forEach(m => m.material.opacity = v * 0.18); } } };
  const rowW = x + ghostW, rowCx = rowW / 2 - GAP / 2;

  // ---------- HUD ----------
  const cap = caption(ui);
  const title = el(ui, 'ctr', `<div style="font:700 22px Oswald;letter-spacing:.42em;color:#ffcf4a">10 · THE SCOREBOARD</div><div style="font:400 92px/0.9 Bebas;letter-spacing:.03em;margin-top:6px">SAME SCALE. SAME KM.</div>`, { left: W / 2 + 'px', top: '120px', textAlign: 'center' });
  L.forEach(m => {
    m.chip = el(ui, 'chip ctr', `${m.name} · ${m.year}`, { background: m.acc, fontSize: '20px', whiteSpace: 'nowrap' });
    m.kmTag = el(ui, 'ctr', `${m.km.toFixed(2)} km²`, { font: '700 28px Mono', color: m.acc, whiteSpace: 'nowrap' });
  });
  const vi = el(ui, 'ctr', `<div style="font:400 44px Bebas;letter-spacing:.1em;color:#ff7aa2">GTA VI · LEONIDA · 2026</div><div style="font:400 86px/0.9 Bebas;color:#ff7aa2">~150 km²<span style="color:#ffcf4a">*</span></div><div style="font:700 18px Mono;color:#c9b37a;margin-top:6px">* estimate · official figure not published</div>`, { textAlign: 'center', whiteSpace: 'nowrap' });
  // trend line (km² over release order)
  const svg = el(ui, '', `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"><polyline class="a" fill="none" stroke="#ffffff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><polyline class="b" fill="none" stroke="#ff4a5a" stroke-width="7" stroke-linecap="round"/><polyline class="c" fill="none" stroke="#ff7aa2" stroke-width="5" stroke-dasharray="14 12"/><text class="q" font-family="Bebas" font-size="64" fill="#ff7aa2" text-anchor="middle">?</text><g class="dots"></g></svg>`, { left: '0', top: '0' });
  const plA = svg.querySelector('.a'), plB = svg.querySelector('.b'), plC = svg.querySelector('.c'), qm = svg.querySelector('.q'), dots = svg.querySelector('.dots');
  const dip = el(ui, 'ctr', `<div style="font:400 64px/1 Bebas;color:#ff4a5a;text-shadow:0 2px 14px #000">▼ −58%</div><div style="font:700 22px Oswald;letter-spacing:.2em;text-shadow:0 2px 10px #000">TALLER &gt; WIDER</div>`, { textAlign: 'center', whiteSpace: 'nowrap' });
  const range = el(ui, 'ctr', `<span style="color:#ff9a3c">8</span> <span style="opacity:.5">→</span> <span style="color:#4fd1ff">76</span><small style="font-size:.45em;opacity:.7"> km²</small>`, { font: '400 120px/1 Bebas', left: W / 2 + 'px', top: '125px', whiteSpace: 'nowrap', textShadow: '0 4px 20px #000' });

  // L3 panel: camera + radar evolution
  const panel = el(ui, '', '', { left: '0', top: '0', width: W + 'px', height: H + 'px', background: 'radial-gradient(ellipse at 50% 55%, rgba(8,10,18,.95), rgba(4,5,10,.98))' });
  const camRow = [['sky', 'FROM THE SKY', '1997', '#ffd400'], ['shoulder', 'OVER THE SHOULDER', '2001', '#ff9a3c'], ['ocean', 'TO THE OCEAN FLOOR', '2013', '#4fd1ff']].map(([k, t, y, c], i) =>
    ({ e: el(ui, 'ctr', `${ICON[k](c)}<div style="font:400 42px/1 Bebas;letter-spacing:.08em;margin-top:8px">${t}</div><div style="font:700 20px Mono;color:${c}">${y}</div>`, { left: (W / 2 + (i - 1) * 520) + 'px', top: '330px', textAlign: 'center', whiteSpace: 'nowrap' }) }));
  const camHdr = el(ui, 'ctr', 'THE CAMERA', { font: '700 22px Oswald', letterSpacing: '.42em', color: '#7d8699', left: W / 2 + 'px', top: '150px' });
  const radHdr = el(ui, 'ctr', 'THE NAVIGATION', { font: '700 22px Oswald', letterSpacing: '.42em', color: '#7d8699', left: W / 2 + 'px', top: '590px' });
  const rads = [['arrow', '#ffd400', 'THE ARROW', '1997'], ['round', '#ff9a3c', 'THE RADAR', '2001'], ['gps', '#b26bff', 'THE GPS', '2008']].map(([k, c, t, y], i) => {
    const f = radar(ui, k, c), e = ui.lastElementChild;
    Object.assign(e.style, { left: (W / 2 + (i - 1) * 520 - 95) + 'px', top: '650px', bottom: 'auto', width: '190px', height: '190px' });
    const lab = el(ui, 'ctr', `<div style="font:400 42px/1 Bebas;letter-spacing:.08em">${t}</div><div style="font:700 20px Mono;color:${c}">${y}</div>`, { left: (W / 2 + (i - 1) * 520) + 'px', top: '900px', textAlign: 'center' });
    return { f, e, lab };
  });
  const arrows = [0, 1].map(i => el(ui, 'ctr', '→', { font: '400 90px Bebas', color: '#4a5266', left: (W / 2 + (i - 0.5) * 520) + 'px' }));

  const board = excuseBoard(ui, [['Bridge blown up', '2001'], ['Hurricane', '1986'], ['"Because we said so"', '2004'], ['Terror alert', '2008'], ['No excuse. Open.', '2026']]);
  const boardEl = ui.querySelector('.board'); boardEl.style.top = '250px';
  const still = stamp(ui, 'OPEN', 600, 300, { big: true, rot: -9, normal: true, color: '#3dff7a' });

  // phases
  const tP3 = C.L3 - 0.3, tP4 = C.L4 - 0.2;

  function update(t) {
    // ----- camera: fit the row, slow drift; zoom to the IV/V pair on the dip -----
    const fov = 34; camera.fov = fov; camera.near = 5; camera.far = 1e6; camera.updateProjectionMatrix();
    const aspect = W / H, fitH = (rowW * 1.22) / (2 * Math.tan(fov / 2 * Math.PI / 180) * aspect);
    const iv = L[3], focus = (iv.cx + L[2].cx) / 2;
    const fx = track([[0, rowCx - 400], [C.L1e, rowCx], [C.L2p2 - 0.3, rowCx], [C.L2p3, focus], [C.L2e + 0.2, focus], [tP3, rowCx], [D, rowCx + 150]], t);
    const hh = track([[0, fitH * 0.95], [C.L1e, fitH], [C.L2p2 - 0.3, fitH], [C.L2p3, fitH * 0.55], [C.L2e + 0.2, fitH * 0.52], [tP3, fitH * 1.02], [D, fitH * 1.08]], t);
    const lookZ = -650;
    camera.up.set(0, 1, 0);
    const lean = track([[0, 0.42], [C.L2p2 - 0.3, 0.42], [C.L2p3, 0.9], [C.L2e + 0.2, 0.95], [tP3, 0.42]], t);
    camera.position.set(fx, hh, lookZ + hh * lean); camera.lookAt(fx, 0, lookZ - 1000); camera.setViewOffset(W, H, 0, -28, W, H);

    // ----- maps pop in, release order -----
    L.forEach((m, k) => {
      const t0 = 0.5 + k * 0.62, p = eback(inv(t0, t0 + 0.7, t));
      m.g.visible = t > t0; m.g.scale.set(Math.max(0.001, p), Math.max(0.001, p) * (k === 3 ? lerp(1, 2.6, eout(inv(w('L2p3', 'taller') - 0.1, w('L2p3', 'taller') + 0.9, t))) : 1), Math.max(0.001, p));
      m.built.all.forEach(r => { r.city.update(t, { start: t0 + 0.15, speed: 700, dur: 0.6 }); r.traffic.update(t, 1); });
      const [sx, sy] = project(m.cx, 0, 30), a = win(t, t0 + 0.1, tP3 + 0.4, .3, .4);
      show(m.chip, a, 'translate(-50%,-50%)'); m.chip.style.left = sx + 'px'; m.chip.style.top = sy + 34 + 'px';
      show(m.kmTag, a, 'translate(-50%,-50%)'); m.kmTag.style.left = sx + 'px'; m.kmTag.style.top = sy + 80 + 'px';
      const [tx, ty] = project(m.cx, 0, m.top - 60); m.tp = [tx, ty]; m.sx = sx; m.sy = sy;
    });
    { const tg = 0.5 + 5 * 0.62; ghostLine.material.opacity = 0.8 * win(t, tg, tP3 + 0.4, .5, .4) * (0.75 + 0.25 * Math.sin(t * 4));
      const [gx, gy] = project(ghost.cx, 0, 30); vi.style.left = gx + 'px'; vi.style.top = gy + 90 + 'px'; show(vi, win(t, tg, tP3 + 0.4, .5, .4), 'translate(-50%,-50%)'); }
    show(title, win(t, 0.2, C.L2 + 0.1, .5, .4), 'translate(-50%,-50%)');

    // ----- trend line over the maps -----
    const lp = clamp((t - C.L2) / (C.L2p2 - C.L2)), lo = win(t, C.L2 - 0.2, tP3 + 0.2, .3, .4);
    const ys = L.map(m => m.sy - 110 - m.km * 3.2), xs = L.map(m => m.sx);
    const n = lp * (L.length - 1), pts = [];
    for (let i = 0; i <= Math.floor(n); i++) pts.push([xs[i], ys[i]]);
    if (n < L.length - 1) { const i = Math.floor(n), f = n - i; pts.push([lerp(xs[i], xs[i + 1], f), lerp(ys[i], ys[i + 1], f)]); }
    plA.setAttribute('points', pts.map(p => p.join(',')).join(' ')); plA.style.opacity = lo; dots.style.opacity = lo;
    const dp = smooth(inv(C.L2p2, C.L2p2 + 0.5, t));
    { const [gx] = project(ghost.cx, 0, 30), gy = L[4].sy - 110 - ghost.km * 3.2, cp = smooth(inv(C.L2p2 - 0.6, C.L2p2, t));
      plC.setAttribute('points', `${xs[4]},${ys[4]} ${lerp(xs[4], gx, cp)},${lerp(ys[4], gy, cp)}`); plC.style.opacity = lo * (cp > 0 ? 1 : 0);
      qm.setAttribute('x', gx); qm.setAttribute('y', gy - 20); qm.style.opacity = lo * cp; }
    plB.setAttribute('points', `${xs[2]},${ys[2]} ${lerp(xs[2], xs[3], dp)},${lerp(ys[2], ys[3], dp)}`); plB.style.opacity = lo * (dp > 0 ? 1 : 0);
    dots.innerHTML = L.map((m, i) => i <= n + 0.01 ? `<circle cx="${xs[i]}" cy="${ys[i]}" r="11" fill="${m.acc}" stroke="#000" stroke-width="3"/>` : '').join('');
    show(dip, win(t, C.L2p2 + 0.2, tP3 + 0.2, .25, .4), `translate(-50%,-50%) scale(${eback(inv(C.L2p2 + 0.2, C.L2p2 + 0.6, t))})`);
    dip.style.left = (xs[2] + xs[3]) / 2 + 'px'; dip.style.top = (ys[2] + ys[3]) / 2 - 90 + 'px';
    show(range, win(t, C.L2 + 0.3, C.L2p2 - 0.1, .3, .4), `translate(-50%,-50%) scale(${lerp(0.9, 1, eout(inv(C.L2, C.L2 + 0.5, t)))})`);

    // ----- L3: camera & navigation evolution -----
    const po = win(t, tP3, tP4 + 0.2, .5, .5);
    show(panel, po, null); show(camHdr, po, 'translate(-50%,-50%)'); show(radHdr, win(t, C.L3p4 - 0.3, tP4 + 0.2, .4, .5), 'translate(-50%,-50%)');
    [C.L3p1, C.L3p2, C.L3p3].forEach((t0, i) => {
      const a = win(t, t0, tP4 + 0.2, .25, .5), hl = (i === 2 ? 1 : 1 - smooth(inv([C.L3p2, C.L3p3, C.L3p4][i] - 0.1, [C.L3p2, C.L3p3, C.L3p4][i] + 0.3, t)) * 0.55);
      const bob = i === 2 ? Math.sin(t * 2.4) * 6 : 0;
      show(camRow[i].e, a * hl, `translate(-50%,-50%) translateY(${bob}px) scale(${eback(inv(t0, t0 + 0.4, t))})`);
    });
    const rT = [C.L3p4, w('L3p4', 'radar') - 0.05, w('L3p5', 'GPS') - 0.05];
    rads.forEach((r, i) => { const a = win(t, rT[i], tP4 + 0.2, .2, .5); r.f(a, i === 0 ? Math.sin(t * 2) * 25 : (t - rT[i]) * 18, t * 30); r.e.style.transform = `scale(${eback(inv(rT[i], rT[i] + 0.35, t))})`; show(r.lab, a, 'translate(-50%,-50%)'); });
    arrows.forEach((e, i) => { e.style.top = '745px'; show(e, win(t, rT[i + 1] - 0.1, tP4 + 0.2, .2, .5), 'translate(-50%,-50%)'); });

    // ----- L4: the bridges -----
    const bo = win(t, tP4, D + 1, .5, .4), nRows = t < C.L4p3 ? 4 : 5;
    board(bo, nRows, eout(inv(tP4, tP4 + 0.6, t)));
    still(inv(w('L4p3', 'open') - 0.05, w('L4p3', 'open') + 0.95, t));
    if (t > C.L4p3) { const r5 = boardEl.querySelectorAll('.row')[4]; r5.style.opacity = 0.55 + 0.45 * Math.abs(Math.sin((t - C.L4p3) * 3)); }

    cap(captionAt(TL, 'ch10', t));
    bloom.strength = 0.7; bloom.threshold = 0.7; bloom.radius = 0.5; tiltP.uAmt.value = 0;
    grade.uVig.value = 0.55; grade.uGrain.value = 0.04; grade.uSat.value = 1.12; grade.uPixel.value = 0; grade.uScan.value = 0; grade.uCA.value = 0.001;
    grade.uFade.value = Math.min(inv(0, 0.5, t), 1 - 0.7 * inv(D - 0.6, D, t));
  }
  return { duration: D, stills: [3.5, 7.5, 11.5, 13.5, 19, 23.5, 27.5, 31], update };
}
