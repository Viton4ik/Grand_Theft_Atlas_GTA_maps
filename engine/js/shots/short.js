// Vertical Short (1080×1920) · every 3D GTA map at the same scale, timed to its own VO ("short" in timeline.json).
// Pops in release order with the km² counter (GTA IV dip in red), then the camera pulls back for Leonida (estimate*).
import * as THREE from 'three';
import { LC3, VC, LC4, SA, V } from '../world/maps.js';
import { buildMap } from '../world/env.js';
import { loadWorld } from '../world/world.js';
import { leonida } from '../world/leonida.js';
import { fatLine, flatPoly } from '../world/geo.js';
import { track, win, inv, eout, eio, smooth, eback, lerp } from '../core/util.js';
import { el, show, caption } from '../core/hud.js';
import { cues, captionAt, wordAt } from '../core/tl.js';

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, project, TL, W, H } = ctx;
  const C = cues(TL, 'short'), D = C.dur, w = (cue, word) => wordAt(TL, 'short', cue, word);
  scene.background = new THREE.Color('#07090f');
  const grid = new THREE.GridHelper(60000, 300, '#1b2233', '#121827'); grid.position.y = -1; scene.add(grid);
  const L = [
    { def: LC3(), name: 'GTA III', year: 2001, km: 8.12, acc: '#ff9a3c', land: '#2a2622', at: [-600, -723], t0: C.L2p1 },
    { def: VC(), name: 'VICE CITY', year: 2002, km: 9.11, acc: '#ff3fa4', land: '#221a2c', at: [-150, -723], t0: C.L2p2 },
    { def: SA(), name: 'SAN ANDREAS', year: 2004, km: 38.2, acc: '#ffc24a', land: '#4a3d22', at: [-400, -45], t0: C.L2p3 },
    { def: LC4(), name: 'GTA IV', year: 2008, km: 16.14, acc: '#9fb4c8', land: '#1d2129', at: [367, -723], t0: C.L2p4 },
    { def: V(), name: 'GTA V', year: 2013, km: 75.84, acc: '#4fd1ff', land: '#2c3a26', at: [417, 260], t0: C.L2p6 }
  ];
  L.forEach(m => {
    const g = new THREE.Group();
    const built = buildMap(g, m.def, { land: m.land, coast: m.acc, coastW: 3, side: '#05060a', depth: 3, noLights: true, mat: { night: 0.6, dim: 0.9, win: m.acc, win2: '#ffffff', fogNear: 1e6, fogFar: 1e6, floor: 0.9 },
      cars: [m.acc, '#ffffff'], carsPer: 0.6, pitch: 0.2, street: 0.06, hScale: 0.7 });
    g.position.set(m.at[0] - built.center[0], 0, m.at[1] - built.center[1]);
    scene.add(g); m.g = g; m.built = built;
    m.chip = el(ui, 'chip ctr', `${m.name} · ${m.year}`, { background: m.acc, whiteSpace: 'nowrap' });
    m.kmTag = el(ui, 'ctr', `${m.km.toFixed(2)} km²`, { font: '700 30px Mono', color: m.acc, whiteSpace: 'nowrap' });
  });
  // Leonida (GTA VI): REAL Florida outline at our estimated land area (~96 km² land ≈ 150 km² total), below the others
  const LE = leonida(await loadWorld(), 96), LZ = 900 + LE.size[1] / 2;
  const lg = new THREE.Group(); lg.position.set(-160, 0, LZ); scene.add(lg);
  const lFill = LE.polys.map(p => { const m = flatPoly(p, '#ff3fa4', 0.5, 0); lg.add(m); return m; });
  const lLines = LE.polys.filter(p => p.length > 20).map(p => { const l = fatLine(p.map(([a, b]) => [a, 2, b]), '#ff7aa2', 3, { closed: true, dashed: true, opacity: 0 }); l.material.dashSize = 34; l.material.gapSize = 24; lg.add(l); return l; });

  const title = el(ui, 'vt-title', `<div class="k">25 YEARS · SAME SCALE</div><div class="h">HOW BIG ARE<br>GTA MAPS?</div>`);
  const count = el(ui, 'vt-count', `<div class="g"></div><div class="v"></div>`, { top: '1250px', left: '290px' });
  const cg = count.querySelector('.g'), cv = count.querySelector('.v');
  const shrank = el(ui, 'ctr', '<span style="font:400 64px Bebas;color:#ff4a5a;text-shadow:0 4px 20px #000">▼ YES, IT SHRANK</span>', { left: '290px', top: '1480px', whiteSpace: 'nowrap' });
  const fine = el(ui, '', 'Silhouettes: land area to scale · km²: total incl. water (fan-measured, KeWiS)<br>Stylised schematics, not official maps · GTA VI: estimate, not an official figure', { left: '0px', width: '1080px', top: '1848px', textAlign: 'center', font: '400 17px Mono', color: '#5d6578', lineHeight: '1.4' });
  const vi = el(ui, 'ctr', `<div style="font:400 64px Bebas;letter-spacing:.1em;color:#ff7aa2">GTA VI · LEONIDA</div><div class="n" style="font:400 150px/0.9 Bebas;color:#ff7aa2;white-space:nowrap">??? km²</div><div class="f" style="font:700 24px Mono;color:#c9b37a;margin-top:8px">Rockstar: no official number</div>`, { left: '540px', textAlign: 'center' });
  const vn = vi.querySelector('.n'), vf = vi.querySelector('.f');
  const cta = el(ui, 'ctr', '<div style="font:400 74px/1 Bebas;letter-spacing:.04em;text-align:center">FULL STORY:<br><span style="color:#ffcf4a">GRAND THEFT ATLAS</span></div>', { left: '540px', top: '1640px' });
  const capE = el(ui, 'ctr', '', { left: '540px', top: '1720px', width: '940px', textAlign: 'center', font: '700 40px/1.25 Oswald', color: '#fff', textShadow: '0 3px 0 #000, 0 0 18px rgba(0,0,0,.9)' });   // burned-in captions: Shorts are watched muted

  function update(t) {
    camera.fov = 40; camera.updateProjectionMatrix();
    const pull = eio(inv(C.L3 - 0.2, C.L3p2 + 0.4, t));
    const z = lerp(track([[0, 20], [C.L3, 60]], t), 820, pull), h = lerp(track([[0, 3850], [C.L3, 4000]], t), 8800, pull);
    camera.position.set(0, h, z + 900 * h / 3850); camera.lookAt(0, 0, z);
    let cur = 0, prev = 0, curName = '', last = null;
    [0, 1, 2, 3, 4].forEach(k => {
      const m = L[k], t0 = m.t0 - 0.1, p = eback(inv(t0, t0 + 0.8, t)), a = inv(t0, t0 + 0.3, t) * (1 - 0.6 * pull);
      m.g.scale.setScalar(Math.max(0.001, p)); m.g.visible = t > t0;
      m.built.all.forEach(r => { r.city.update(t, { start: t0 + 0.2, speed: 600, dur: 0.6 }); r.traffic.update(t, 1); });
      const [x, y] = project(m.at[0], 0, m.at[1]);
      const r = Math.sqrt(m.km) * 26 * 3850 / h, off = r + 30;
      show(m.chip, a, `translate(-50%,-50%) translateY(${off}px) scale(${lerp(1, 0.7, pull)})`); m.chip.style.left = x + 'px'; m.chip.style.top = y + 'px';
      show(m.kmTag, a, `translate(-50%,-50%) translateY(${off + 48 * lerp(1, 0.7, pull)}px) scale(${lerp(1, 0.7, pull)})`); m.kmTag.style.left = x + 'px'; m.kmTag.style.top = y + 'px';
      if (t > t0) { prev = cur; cur = m.km; curName = m.name; last = m; }
    });
    const ease = last ? eout(inv(last.t0 - 0.1, last.t0 + 0.9, t)) : 0;
    const val = prev + (cur - prev) * ease;
    show(count, win(t, C.L2p1 - 0.1, C.L3, .3, .4), 'translateX(-50%)');
    cg.textContent = curName; cg.style.color = last ? last.acc : '#fff';
    cv.innerHTML = val.toFixed(2) + '<small> km²</small>';
    cv.style.color = cur < prev ? '#ff5a5a' : '#fff';
    show(shrank, win(t, C.L2p5 - 0.05, C.L2p6, .2, .3), `translate(-50%,-50%) scale(${eback(inv(C.L2p5 - 0.05, C.L2p5 + 0.3, t))})`);
    show(title, win(t, 0.1, C.L3, .4, .5), 'translateX(-50%)');
    // Leonida
    const lo = smooth(inv(C.L3p1, C.L3p1 + 1.0, t));
    lLines.forEach(l => l.material.opacity = lo * (0.8 + 0.2 * Math.sin(t * 4))); lFill.forEach(m => m.material.opacity = lo * lerp(0.12, 0.35, smooth(inv(C.L3p4, C.L3p4 + 0.8, t))));
    { const [, y] = project(0, 0, LZ); vi.style.top = Math.min(1500, y) + 'px'; }
    show(vi, win(t, C.L3p1 + 0.3, C.L4 + 0.2, .4, .4), 'translate(-50%,-50%)');
    if (t < C.L3p4) { vn.textContent = '??? km²'; vf.textContent = 'Rockstar: no official number'; }
    else { const k = eout(inv(C.L3p4, C.L3p4 + 0.9, t)); vn.innerHTML = '~' + Math.round(lerp(76, 150, k)) + ' km²' + (t > C.L3p5 ? '<span style="color:#ffcf4a">*</span>' : ''); vf.textContent = t > C.L3p5 ? '* our estimate · "twice GTA V"' : 'our best guess'; }
    show(cta, win(t, C.L4 - 0.1, D + 1, .3, .4), `translate(-50%,-50%) scale(${eback(inv(C.L4 - 0.1, C.L4 + 0.3, t))})`);
    show(fine, 1, null);
    { const tx = t < C.L4 - 0.1 ? captionAt(TL, 'short', t) || '' : ''; if (capE.textContent !== tx) capE.textContent = tx; show(capE, tx ? 1 : 0, 'translate(-50%,-50%)'); }
    bloom.strength = 0.7; bloom.threshold = 0.7; bloom.radius = 0.5;
    grade.uVig.value = 0.5; grade.uGrain.value = 0.04; grade.uSat.value = 1.1; grade.uFade.value = Math.min(inv(0, 0.3, t), 1 - inv(D - 0.4, D, t));
  }
  return { duration: D, stills: [2, 10, 15, 17.5, 21, 25, 29], update };
}
