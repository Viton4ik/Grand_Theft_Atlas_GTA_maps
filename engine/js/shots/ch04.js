// Chapter 04 · GTA III (2001) - "The camera drops". Timed to VO cues.
// Flat top-down → tilt into 3D, the city rises → real Brooklyn/Manhattan/Staten Island outlines morph into
// Portland/Staunton/Shoreside → Callahan blown up, lift bridge "broken", tunnel "under construction" → Excuse Board #1
// → arrow becomes a radar ("not where to go") → 8.12 km².
import * as THREE from 'three';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LC3 } from '../world/maps.js';
import { KM, water, glow, fatLine, bbox } from '../world/geo.js';
import { sky, buildMap, bridge } from '../world/env.js';
import { loadWorld } from '../world/world.js';
import { resample, align } from '../world/morph.js';
import { track, win, inv, eout, eio, smooth, rng, clamp, lerp, eback } from '../core/util.js';
import { chapterCard, kmCounter, label, caption, stamp, excuseBoard, radar, el, show } from '../core/hud.js';
import { cues, captionAt, wordAt } from '../core/tl.js';

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, project, TL, W, H } = ctx; const tiltP = ctx.tilt;
  const C = cues(TL, 'ch04'), D = C.dur, w = (cue, word) => wordAt(TL, 'ch04', cue, word);
  const def = LC3();
  scene.add(sky('#1a1622', '#3a2a2a', '#0c0a0e'));
  const wat = water({ deep: '#050d16', shallow: '#0e2638', glint: '#ffb066', glint2: '#ff7a3c', streaks: 0.14, spark: 0.6, fog: '#1c1519', fogFar: 3800 });
  scene.add(wat);
  const map = buildMap(scene, def, {
    land: '#262321', coast: '#ff9a3c', park: '#2c4a2a', airport: '#34363b',
    mat: { win: '#ffcf7a', win2: '#ffe9c0', night: 0.55, fog: '#2a2026', fogNear: 700, fogFar: 3600, floor: 0.42, light: [-0.45, 0.42, -0.75], glass: '#1a2230', skyTop: '#3a3048', skyLow: '#ff9a50' }, shadow: 0.45, tree: '#3a5a2e',
    cars: ['#fff1c2', '#ff4b3a', '#ffd166'], carsPer: 1.6, pitch: 0.11, street: 0.026, hScale: 1.3
  });
  const [cx, cz] = map.center, ext = Math.max(map.bbox[2] - map.bbox[0], map.bbox[3] - map.bbox[1]);
  wat.material.uniforms.uCenter.value.set(cx, cz); wat.material.uniforms.uRadius.value = ext * 0.75;
  const br = {}; def.bridges.forEach(b => { br[b.id] = bridge(b.a, b.b, { color: '#8d8a86', light: '#ffcf7a' }); scene.add(br[b.id].group); });
  const cal = br.callahan, lift = br.lift, boomPos = new THREE.Vector3(cal.mid[0], 3, cal.mid[1]);
  const boom = glow('#ffb347', 60), boom2 = glow('#ff4d1f', 60), fire = glow('#ff6a1f', 50), fire2 = glow('#ffd27a', 22);
  [boom, boom2, fire, fire2].forEach(g => { g.position.copy(boomPos); scene.add(g); });
  const r = rng(9), debris = [], dmat = new THREE.MeshBasicMaterial({ color: '#ffb066' });
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), dmat); m.userData.v = [(r() - .5) * 40, 20 + r() * 30, (r() - .5) * 40]; scene.add(m); debris.push(m); }
  const tape = fatLine([[lift.mid[0], 3.4, lift.mid[1] - 4], [lift.mid[0], 3.4, lift.mid[1] + 4]], '#ffd400', 3, { dashed: true }); scene.add(tape);
  // tunnel: dashed underwater line Portland↔Staunton, south of Callahan
  const tun = [[cal.mid[0] + 18, 0.4, cal.mid[1] + 34], [cal.mid[0] - 18, 0.4, cal.mid[1] + 34]];
  const tunnel = fatLine(tun, '#ffd400', 4, { dashed: true, opacity: 0 }); scene.add(tunnel);

  // real outlines → game islands (lines-only morph)
  const Wd = await loadWorld(); const nyc = Wd.layers.city.nyc;
  const big = id => { const c = nyc.find(c => c.id === id); const f = c.p.reduce((a, b) => (b.length > a.length ? b : a)); const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; };
  const real = { portland: big('Brooklyn'), staunton: big('Manhattan'), shoreside: big('Staten Island') };
  const all = Object.values(real).flat(), [rx0, rz0, rx1, rz1] = bbox(all), [sx0, sz0, sx1, sz1] = map.bbox;
  const sc = Math.min((sx1 - sx0) / (rx1 - rx0), (sz1 - sz0) / (rz1 - rz0)) * 0.95;
  const toLocal = ([x, z]) => [(x - (rx0 + rx1) / 2) * sc + (sx0 + sx1) / 2, (z - (rz0 + rz1) / 2) * sc + (sz0 + sz1) / 2];
  const N = 160;
  const morphs = [['portland', 'BROOKLYN', 'L2p2'], ['staunton', 'MANHATTAN', 'L2p3'], ['shoreside', 'STATEN ISLAND', 'L2p4']].map(([id, rname, cue]) => {
    const A = resample(real[id].map(toLocal), N), B = align(A, resample(map.islands[id].isl.poly, N));
    const line = fatLine([[0, 2, 0], [1, 2, 0]], '#ffffff', 3, { opacity: 0 }); scene.add(line);
    return { id, rname, cue, A, B, line, lbl: label(ui, `<span style="opacity:.7">${rname}</span> <span style="color:#ff9a3c">→ ${map.islands[id].isl.name}</span>`, 'mlbl sm', true) };
  });

  // ---------- HUD ----------
  const chap = chapterCard(ui, { num: '04', game: 'Grand Theft Auto III · 2001', title: 'THE CAMERA<br>DROPS', acc: '#ff9a3c' });
  const km = kmCounter(ui);
  const rad = radar(ui, 'round', '#ff9a3c'), radArrow = radar(ui, 'arrow', '#ffcf4a');
  const cap = caption(ui);
  const board = excuseBoard(ui, [['Bridge blown up', '2001'], ['?', '…'], ['?', '…'], ['?', '…']]);
  const st1 = stamp(ui, 'EXCUSE #1', 1640, 560, { rot: -9 });
  const yrs = el(ui, '', '<div style="font:400 64px Bebas;letter-spacing:.06em">2001 <span style="color:#ff9a3c">→</span> 2026</div><div style="font:700 18px Oswald;letter-spacing:.3em;opacity:.7">25 YEARS OF EXCUSES</div>', { right: '110px', top: '760px', textAlign: 'right' });
  const lbls = map.all.filter(i => i.isl.name).map(i => ({ rec: i, set: label(ui, i.isl.name, 'mlbl', true) }));
  const lblCal = label(ui, 'CALLAHAN BRIDGE · <span style="color:#ff5a3a">BLOWN UP</span>', 'mlbl sm');
  const lblLift = label(ui, 'LIFT BRIDGE · <span style="color:#ffd400">"BROKEN"</span>', 'mlbl sm');
  const lblTun = label(ui, '<span style="background:repeating-linear-gradient(45deg,#ffd400 0 14px,#111 14px 28px);color:#111;padding:4px 14px;font:400 30px Bebas;letter-spacing:.1em;text-shadow:none;border:3px solid #111"><span style="background:#ffd400;padding:0 8px">TUNNEL · UNDER CONSTRUCTION</span></span>', 'mlbl sm');
  const noRoute = el(ui, '', '<svg width="230" height="230" viewBox="-100 -100 200 200"><path d="M0 0 L40 -30 L40 -90" stroke="#ffffff" stroke-width="6" stroke-dasharray="10 8" fill="none"/><path d="M14 -76 L66 -24 M66 -76 L14 -24" stroke="#ff3344" stroke-width="10"/></svg>', { left: '70px', bottom: '70px' });
  const radLbl = el(ui, '', '<div style="font:700 18px Oswald;letter-spacing:.3em;color:#ff9a3c">FIRST RADAR · 2001</div>', { left: '72px', bottom: '320px' });

  function update(t) {
    // camera: top-down flat → tilt (L1) → orbit for the islands (L2) → bridge close-up (L3) → frame for board (L4) → wide (L6)
    const tilt = eio(inv(2.0, C.L1p2, t));
    const dist = track([[0, ext * 1.75], [C.L1p2, ext * 1.15], [C.L2, ext * 1.1], [C.L2p4 + 1, ext * 1.05], [C.L3p2, ext * 0.62], [C.L3p4 + 1.5, ext * 0.62], [C.L4p2, ext * 0.95], [C.L6, ext * 1.0], [D, ext * 1.15]], t);
    const pitch = THREE.MathUtils.lerp(89.5, 38, tilt) * Math.PI / 180 + track([[C.L3, 0], [C.L3p2, 0.08], [C.L4, 0.08], [C.L4p2, 0]], t);
    const yaw = track([[0, 0], [C.L1p2, -0.22], [C.L2p4, -0.42], [C.L3p2, -0.25], [C.L4, -0.3], [D, -0.5]], t);
    const tx = cx + track([[0, 0], [C.L2, 0], [C.L3p2, cal.mid[0] - cx - 40], [C.L3p3, lift.mid[0] - cx + 60], [C.L3p4, cal.mid[0] - cx - 20], [C.L4, cal.mid[0] - cx], [C.L4p2, ext * 0.26], [C.L6, ext * 0.05], [D, 0]], t);
    const tz = cz + track([[0, 0], [C.L3p2, cal.mid[1] - cz], [C.L3p3, lift.mid[1] - cz], [C.L3p4, cal.mid[1] - cz + 30], [C.L4, 0], [D, 0]], t);
    camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(tx, 0, tz);

    map.all.forEach(rec => { rec.city.update(t, { origin: [cx * 0.2, cz], start: 2.6, speed: 200, dur: 1.1 }); rec.traffic.update(t, smooth(inv(3, 5, t))); });
    map.all.forEach(rec => rec.city.material.uniforms.uNight.value = 0.25 + 0.4 * smooth(inv(C.L1p2 - 0.3, C.L1p2 + 0.6, t)));

    // morph lines
    morphs.forEach(m => {
      const t0 = C[m.cue] - 0.3, p = eio(inv(t0, t0 + 1.3, t)), o = win(t, t0 - 0.1, t0 + 2.6, .2, .6);
      m.line.visible = o > 0.01;
      if (m.line.visible) { const arr = []; for (let i = 0; i <= N; i++) { const a = m.A[i % N], b = m.B[i % N]; arr.push(lerp(a[0], b[0], p), 3 + 8 * (1 - p), lerp(a[1], b[1], p)); }
        m.line.geometry.dispose(); const g = new LineGeometry(); g.setPositions(arr); m.line.geometry = g; m.line.material.opacity = o; m.line.material.color.set(p < 1 ? '#ffffff' : '#ff9a3c'); }
      const c = map.islands[m.id].city.center, [x, y] = project(c[0], 0, c[1]); m.lbl(x, y - 150, win(t, t0, t0 + 2.6, .2, .4));
      map.islands[m.id].coastLine.material.opacity = 0.9 * (1 - 0.6 * o);
    });

    // bridges & tunnel
    const blast = t - w('L3p2', 'blown');
    cal.segs.forEach((s, i) => { s.visible = !((i === 2 || i === 1) && blast > 0.05); });
    boom.material.opacity = blast > 0 ? Math.max(0, 1 - blast / 1.6) : 0; boom.scale.setScalar(20 + 70 * eout(clamp(blast / 0.8)));
    boom2.material.opacity = blast > 0 ? 0.8 * Math.max(0, 1 - blast / 2.4) : 0; boom2.scale.setScalar(40 + 120 * eout(clamp(blast / 1.4)));
    { const on = blast > 0.3 ? 1 : 0, fl = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.3); fire.material.opacity = on * 0.9 * fl; fire.scale.setScalar(on * 40 * (0.9 + 0.2 * fl) + 0.01); fire2.material.opacity = on * fl; fire2.scale.setScalar(on * 18 + 0.01); fire.position.y = 2.5; }
    debris.forEach(d => { const [vx, vy, vz] = d.userData.v, tt = Math.max(0, blast); d.visible = blast > 0 && blast < 3; d.position.set(boomPos.x + vx * tt, boomPos.y + vy * tt - 30 * tt * tt, boomPos.z + vz * tt); d.rotation.set(tt * 5, tt * 3, 0); });
    const liftA = eback(inv(w('L3p3', 'broken') - 0.3, w('L3p3', 'broken') + 0.6, t)) * 0.55;
    lift.segs[2].rotation.z = liftA; lift.segs[2].position.y = 1.6 + liftA * 10;
    tape.material.opacity = smooth(inv(w('L3p3', 'broken'), w('L3p3', 'broken') + 0.4, t));
    tunnel.material.opacity = smooth(inv(C.L3p4, C.L3p4 + 0.4, t)) * (0.6 + 0.4 * Math.sin(t * 8));
    { const [x, y] = project(cal.mid[0], 12, cal.mid[1]); lblCal(x, y - 70, win(t, w('L3p2', 'blown'), C.L4, .2, .4)); }
    { const [x, y] = project(lift.mid[0], 14, lift.mid[1]); lblLift(x, y + 60, win(t, w('L3p3', 'broken'), C.L4, .2, .4)); }
    { const [x, y] = project((tun[0][0] + tun[1][0]) / 2, 0, tun[0][2]); lblTun(x, y + 50, win(t, C.L3p4, C.L4, .2, .4), eback(inv(C.L3p4, C.L3p4 + 0.4, t))); }

    // island labels (only while nothing else is on screen)
    lbls.forEach(({ rec, set }) => { const c = rec.city.center; const [x, y] = project(c[0], 0, c[1]); set(x, y - 60 - 120 * tilt, Math.max(win(t, 0.6, C.L2p2 - 0.4, .6, .3), win(t, C.L6, D, .4, .4))); });

    // HUD
    chap(win(t, 0.2, D - 0.2, .5, .4), eout(inv(0.2, 1.2, t)), eio(inv(4.2, 5.0, t)));
    board(win(t, C.L4 + 0.2, C.L5 - 0.2, .5, .4), 4, eout(inv(C.L4 + 0.2, C.L4 + 0.9, t)));
    st1(inv(C.L4p2, C.L4p2 + 0.4, t) * (t < C.L5 - 0.2 ? 1 : 0));
    show(yrs, win(t, w('L4p3', 'twenty'), C.L5 - 0.2, .3, .4), null);
    radArrow(1 - smooth(inv(C.L5 + 0.6, C.L5 + 1.2, t)), track([[0, 0], [C.L5, 40]], t));
    const rp = 1 + 0.25 * Math.exp(-Math.pow((t - C.L5p3 - 0.2) * 4, 2));
    rad(smooth(inv(C.L5 + 1.0, C.L5 + 1.8, t)), -t * 6, t * 9);
    show(radLbl, win(t, C.L5 + 1.4, C.L6, .3, .4), null);
    show(noRoute, win(t, C.L5p2, C.L5p3 + 0.6, .1, .3), `scale(${rp})`);
    const kIn = inv(C.L6, C.L6 + 1.6, t); km(win(t, C.L6, D, .3, .3), 8.12 * eout(kIn));

    const c = captionAt(TL, 'ch04', t); cap(c);
    bloom.strength = 0.6 + 0.3 * smooth(inv(C.L1p2 - 0.3, C.L1p2 + 0.6, t)); bloom.threshold = 0.62; bloom.radius = 0.6;
    grade.uPixel.value = 0; grade.uScan.value = 0; grade.uCA.value = 0.0015;
    grade.uLift.value.set(0.02, 0.012, 0.01); grade.uGain.value.set(1.06, 1.0, 0.94); grade.uSat.value = 1.05; grade.uVig.value = 0.6; grade.uGrain.value = 0.04;
    grade.uFade.value = Math.min(inv(0, 0.4, t), 1 - inv(D - 0.5, D, t));
    tiltP.uAmt.value = 0.5 * tilt; tiltP.uFocus.value = 0.52; tiltP.uBand.value = 0.2;
  }
  return { duration: D, stills: [1.5, 5.5, 8, 14.4, 15.6, 22.6, 25.6, 28, 34.3, 37.5, 46, 51], update };
}
