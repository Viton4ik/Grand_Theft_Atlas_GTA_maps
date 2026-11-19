// Chapter 03 · GTA 2 (1999): Anywhere, USA - a city with no real-world twin. Search the US → nothing → ANYWHERE stamp
// → retro-future city in three districts, gangs, radio, crosshairs → back to the US: "???" everywhere.
import * as THREE from 'three';
import { ANY } from '../world/maps.js';
import { KM, water, fatLine, flatPoly } from '../world/geo.js';
import { sky, buildMap, bridge } from '../world/env.js';
import { loadWorld, buildWorld } from '../world/world.js';
import { track, win, inv, eio, smooth, lerp, eback, eout, rng } from '../core/util.js';
import { el, show, caption, label, stamp, kmCounter } from '../core/hud.js';
import { cues, captionAt, wordAt } from '../core/tl.js';

const GANG = [
  c => `<svg width="64" height="64" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="${c}" stroke-width="5"/><circle cx="20" cy="20" r="5" fill="${c}"/></svg>`,
  c => `<svg width="64" height="64" viewBox="0 0 40 40"><polygon points="20,4 36,34 4,34" fill="none" stroke="${c}" stroke-width="5"/></svg>`,
  c => `<svg width="64" height="64" viewBox="0 0 40 40"><polygon points="20,3 35,12 35,28 20,37 5,28 5,12" fill="${c}" opacity=".9"/><rect x="14" y="14" width="12" height="12" fill="#000"/></svg>`
];
const XHAIR = `<svg width="120" height="120" viewBox="0 0 60 60"><circle cx="30" cy="30" r="20" fill="none" stroke="#ff2a3a" stroke-width="3"/><path d="M30 2v18M30 40v18M2 30h18M40 30h18" stroke="#ff2a3a" stroke-width="3"/></svg>`;

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, tilt, W, H, project, TL } = ctx;
  const C = cues(TL, 'ch03'), D = C.dur, w = (cue, word) => wordAt(TL, 'ch03', cue, word);
  scene.background = new THREE.Color('#050912');
  // --- real US (search) ---
  const Wd = await loadWorld();
  const world = buildWorld(scene, Wd, { land: '#26323d', foreign: '#1a2028', lights: '#ffc46b', oceanA: '#04101c', oceanB: '#082038', border: '#45576a', coast: '#5fb8ff' });
  // --- Anywhere City (placed far from the US so the two scenes never overlap) ---
  const city = new THREE.Group(); city.position.set(0, 0, 0); scene.add(city);
  const def = ANY();
  city.add(sky('#0b0420', '#3a1060', '#06020f'));
  const wat = water({ deep: '#07031a', shallow: '#160a36', glint: '#b6ff3c', glint2: '#ff3fd2', streaks: 0.18, spark: 0.6, fog: '#1a0830', fogFar: 4200 }); city.add(wat);
  const map = buildMap(city, def, { land: '#18122a', coast: '#b6ff3c', coastW: 2.4, park: '#1f3a2a', side: '#05030b',
    mat: { win: '#ff4fd8', win2: '#7dffb0', night: 0.95, dim: 0.5, trim: 1, trimC: '#b6ff3c', fog: '#1a0830', fogNear: 700, fogFar: 3800, floor: 0.4, light: [-0.5, 0.6, -0.4], glass: '#140a26', skyTop: '#3a1060', skyLow: '#ff3fd2' },
    cars: ['#ffffff', '#ff3fd2', '#b6ff3c', '#ffa53c'], carsPer: 1.6, pitch: 0.11, street: 0.026, tree: '#2a5a3a' });
  def.bridges.forEach(b => city.add(bridge(b.a, b.b, { color: '#3a3050', light: '#b6ff3c' }).group));
  const [cx, cz] = map.center, ext = Math.max(map.bbox[2] - map.bbox[0], map.bbox[3] - map.bbox[1]);
  wat.material.uniforms.uCenter.value.set(cx, cz); wat.material.uniforms.uRadius.value = ext * 0.8;
  const DC = { downtown: '#ff3fd2', residential: '#b6ff3c', industrial: '#ffa53c' }, ORDER = [['downtown', 'L2p2'], ['residential', 'L2p3'], ['industrial', 'L2p4']];
  const zoneFx = ORDER.map(([id]) => { const isl = map.islands[id].isl; const m = flatPoly(isl.poly, DC[id], 0.6, 0); m.material.blending = THREE.AdditiveBlending; city.add(m); return m; });
  const rings = ORDER.map(([id]) => { const c = map.islands[id].city.center; const g = new THREE.Group(); g.position.set(c[0], 3, c[1]); city.add(g);
    const pts = []; for (let i = 0; i <= 64; i++) pts.push([Math.cos(i / 64 * 6.283) * 10, 0, Math.sin(i / 64 * 6.283) * 10]);
    const rs = [0, 1, 2].map(() => { const l = fatLine(pts, DC[id], 3, { opacity: 0 }); g.add(l); return l; }); return { g, rs }; });

  // HUD
  const cap = caption(ui);
  const reticle = el(ui, 'ctr', `<svg width="220" height="220" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="#7fd8ff" stroke-width="2" stroke-dasharray="6 5"/><path d="M50 4v20M50 76v20M4 50h20M76 50h20" stroke="#7fd8ff" stroke-width="2"/></svg><div class="px nm" style="font-size:18px;color:#ff5a5a;margin-top:6px;text-shadow:2px 2px 0 #000">NO MATCH</div>`, { textAlign: 'center' });
  const nm = reticle.querySelector('.nm');
  const st = stamp(ui, 'ANYWHERE, USA', W / 2, H / 2, { rot: -7, big: true, color: '#b6ff3c', normal: true });
  const dLbl = ORDER.map(([id]) => ({ id, set: label(ui, `<span style="color:${DC[id]};font-size:64px">${map.islands[id].isl.name}</span>`, 'mlbl', true) }));
  const gangs = ORDER.flatMap(([id], d) => [0, 1, 2].map(k => ({ id, d, k, e: el(ui, 'ctr', GANG[k](DC[id])) })));
  const xh = ORDER.map(([id]) => ({ id, e: el(ui, 'ctr', XHAIR) }));
  const r = rng(3), qs = Array.from({ length: 20 }, () => [-205000 + r() * 370000, -75000 + r() * 160000]).filter(([x, z]) => true).map(p => ({ p, e: el(ui, 'ctr', '<span style="font:400 54px Bebas;color:#ffd400;text-shadow:0 3px 10px #000">???</span>') }));
  const title = el(ui, '', `<div style="font:700 22px Oswald;letter-spacing:.32em;opacity:.85">GRAND THEFT AUTO 2 · 1999</div><div style="font:400 84px/0.95 Bebas;margin-top:6px">ANYWHERE CITY</div>`, { left: '70px', top: '60px' });
  const logT = (keys, t) => Math.exp(track(keys.map(([a, b, e]) => [a, Math.log(b), e]), t));
  const tCity = C.L2 - 0.2, tBack = C.L3 - 0.2;

  function update(t) {
    const inCity = t >= tCity && t < tBack;
    if (!inCity) {
      const h = t < tCity ? logT([[0, 900000], [tCity, 700000]], t) : logT([[tBack, 600000], [D, 760000]], t);
      const tx = t < tCity ? track([[0, -150000], [tCity, -60000]], t) : -40000, tz = 20000;
      camera.near = Math.max(0.5, h * 0.02); camera.far = h * 40 + 2e5; camera.updateProjectionMatrix(); camera.up.set(0, 0, -1);
      camera.position.set(tx, h, tz + h * 0.3); camera.lookAt(tx, 0, tz);
    } else {
      const ct = t - tCity, yaw = track([[0, 0.5], [tBack - tCity, -0.1]], ct), pitch = track([[0, 70], [3, 46], [tBack - tCity, 38]], ct) * Math.PI / 180;
      const dist = ext * track([[0, 2.6], [3, 1.6], [tBack - tCity, 1.4]], ct);
      const shake = Math.max(0, 1 - Math.abs(t - (C.L2p6 + 0.3)) * 2) * 6;
      const X = cx + Math.sin(t * 37) * shake, Z = cz + Math.cos(t * 41) * shake;
      camera.near = 1; camera.far = 30000; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0);
      camera.position.set(X + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Z + Math.cos(yaw) * Math.cos(pitch) * dist); camera.lookAt(X, 0, Z);
    }
    world.group.visible = !inCity; city.visible = inCity;
    world.lod(1e6, 1); world.lightsMat.uniforms.uTime.value = t;
    Object.values(world.detail).forEach(d => { d.children.forEach(m => m.material && (m.material.opacity = 0)); d.userData.lines.forEach(l => l.material.opacity = 0); });
    map.all.forEach(rec => { rec.city.update(t - tCity, { start: 0.3, speed: 500, dur: 0.9, origin: [cx, cz] }); rec.traffic.update(t, 1); });
    ORDER.forEach(([id, cue], i) => { const a = smooth(inv(C[cue] - 0.05, C[cue] + 0.3, t)); zoneFx[i].material.opacity = 0.32 * a * (0.8 + 0.2 * Math.sin(t * 4 + i)); map.islands[id].coastLine.material.color.set(a > 0.5 ? DC[id] : '#b6ff3c'); });
    const tRadio = w('L2p5', 'radio');
    rings.forEach(({ rs }, i) => rs.forEach((l, k) => { const ph = ((t - tRadio) * 0.8 + k / 3) % 1, on = t > tRadio ? 1 : 0; l.parent.children[k].scale.setScalar(1 + ph * 18); l.material.opacity = on * (1 - ph) * 0.9; }));

    // HUD: search + stamp
    const sp = inv(0.6, C.L1p2, t), path = [[-210000, -60000], [-150000, 40000], [-60000, -30000], [20000, 40000], [90000, -40000], [160000, 30000]];
    const k = Math.min(path.length - 1.001, sp * (path.length - 1)), i0 = Math.floor(k), f = eio(k - i0);
    const P = [lerp(path[i0][0], path[i0 + 1][0], f), lerp(path[i0][1], path[i0 + 1][1], f)]; const [rx, ry] = project(P[0], 0, P[1]);
    reticle.style.left = rx + 'px'; reticle.style.top = ry + 'px'; show(reticle, win(t, 0.5, C.L1p2 + 0.4, .3, .3), 'translate(-50%,-50%)'); nm.style.opacity = Math.floor(t * 3) % 2 ? 1 : 0.2;
    st(inv(w('L1p2', 'anywhere'), w('L1p2', 'anywhere') + 0.5, t) * (t < tCity ? 1 : 0));
    show(title, inCity ? win(t, tCity + 0.3, tBack, .4, .3) : 0, null);
    dLbl.forEach(({ id, set }, i) => { const c = map.islands[id].city.center; const [x, y] = project(c[0], 0, c[1]); set(x, y - 120, inCity ? win(t, C[ORDER[i][1]], tBack, .2, .3) : 0, 1); });
    gangs.forEach(({ id, d, k, e }) => { const c = map.islands[id].city.center, t0 = C.L2p5 + d * 0.25 + k * 0.1; const [x, y] = project(c[0], 0, c[1]);
      e.style.left = x + (k - 1) * 80 + 'px'; e.style.top = y - 40 + 'px'; show(e, inCity ? win(t, t0, tBack, .1, .3) : 0, `translate(-50%,-50%) scale(${eback(inv(t0, t0 + 0.3, t))}) rotate(${t * 30 * (k - 1)}deg)`); });
    xh.forEach(({ id, e }, i) => { const c = map.islands[id].city.center, t0 = C.L2p6 + 0.1 + i * 0.2; const [x, y] = project(c[0], 0, c[1]);
      e.style.left = x + 'px'; e.style.top = y + 30 + 'px'; show(e, inCity ? win(t, t0, tBack, .05, .3) : 0, `translate(-50%,-50%) scale(${lerp(2.2, 1, eout(inv(t0, t0 + 0.25, t)))}) rotate(${t * 40}deg)`); });
    qs.forEach(({ p, e }, i) => { const t0 = C.L3 + 0.2 + i * 0.08, [x, y] = project(p[0], 0, p[1]); const pulse = t > C.L3p2 ? 1 + 0.25 * Math.max(0, Math.sin((t - C.L3p2) * 10)) * Math.exp(-(t - C.L3p2) * 2) : 1;
      e.style.left = x + 'px'; e.style.top = y + 'px'; show(e, !inCity && t > tBack ? win(t, t0, D, .1, .4) : 0, `translate(-50%,-50%) scale(${eback(inv(t0, t0 + 0.3, t)) * pulse})`); });
    cap(captionAt(TL, 'ch03', t));

    // look
    const flash = Math.exp(-Math.pow((t - tCity) * 6, 2)) + Math.exp(-Math.pow((t - tBack) * 6, 2));
    grade.uPixel.value = 0; grade.uScan.value = inCity ? 0.12 : 0; grade.uCA.value = inCity ? 0.003 : 0.001;
    grade.uSat.value = inCity ? 1.25 : 1.05; grade.uVig.value = 0.65; grade.uGrain.value = 0.05; grade.uLift.value.set(inCity ? 0.03 : 0, 0, inCity ? 0.05 : 0.01); grade.uGain.value.set(1, 1, 1.03);
    tilt.uAmt.value = inCity ? 0.45 : 0; bloom.strength = inCity ? 0.95 : 0.7; bloom.threshold = inCity ? 0.62 : 0.6; bloom.radius = 0.6;
    grade.uFade.value = Math.min(inv(0, 0.5, t), 1 - inv(D - 0.5, D, t)) * (1 - 0.9 * flash);
  }
  return { duration: D, stills: [3, 7, 10, 14.8, 17.6, 19.8, 23, 25], update };
}
