// Chapter 07 · GTA IV (2008) - smaller, taller, denser. Timed to VO cues.
// Counter drops 38.2→16.14 → old city crumbles, new one rebuilt → real boroughs morph into Broker/Dukes/Bohan/Algonquin,
// Alderney across the river → Algonquin skyscrapers rise → Staten Island "not invited" → bridges closed, terror alert,
// Excuse #4 → GPS route + "Recalculating" + talking nav → Chinatown Wars: Alderney drifts away.
import * as THREE from 'three';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LC4 } from '../world/maps.js';
import { KM, water, glow, fatLine, bbox, centroid } from '../world/geo.js';
import { sky, buildMap, bridge } from '../world/env.js';
import { loadWorld } from '../world/world.js';
import { resample, align } from '../world/morph.js';
import { track, win, inv, eout, eio, smooth, clamp, lerp, eback } from '../core/util.js';
import { chapterCard, kmCounter, label, caption, stamp, excuseBoard, radar, el, show } from '../core/hud.js';
import { cues, captionAt, wordAt } from '../core/tl.js';

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, project, TL, W, H } = ctx; const tiltP = ctx.tilt;
  const C = cues(TL, 'ch07'), D = C.dur, w = (cue, word) => wordAt(TL, 'ch07', cue, word);
  const def = LC4();
  scene.add(sky('#232a36', '#5a6472', '#151a22'));
  const wat = water({ deep: '#0a1017', shallow: '#1a2833', glint: '#d8e8ff', glint2: '#ffd9a0', streaks: 0.3, spark: 0.6, fog: '#3b4452', fogFar: 4200 }); scene.add(wat);
  const map = buildMap(scene, def, {
    land: '#1b1f26', coast: '#9fb4c8', coastW: 1.8, coastO: 0.7, park: '#22372a', side: '#07090c',
    mat: { win: '#ffd9a0', win2: '#e6f2ff', night: 0.7, dim: 0.8, fog: '#3b4452', fogNear: 600, fogFar: 3600, floor: 0.38, light: [-0.4, 0.6, -0.6], glass: '#1c2632', skyTop: '#6a7a8e', skyLow: '#b8c0c8' }, shadow: 0.4, tree: '#2c4a30', towerH: 22,
    cars: ['#fff3d6', '#ff4040'], carsPer: 1.8, pitch: 0.11, street: 0.024
  });
  const [cx, cz] = map.center, ext = Math.max(map.bbox[2] - map.bbox[0], map.bbox[3] - map.bbox[1]);
  wat.material.uniforms.uCenter.value.set(cx, cz); wat.material.uniforms.uRadius.value = ext * 0.8;
  const brs = def.bridges.map(b => { const x = bridge(b.a, b.b, { color: '#6c7480', light: '#ffe2b0' }); scene.add(x.group); return x; });
  const stops = brs.map(b => { const s = glow('#ff2a3a', 24); s.position.set(b.mid[0], 5, b.mid[1]); scene.add(s); return s; });
  const alg = map.islands.algonquin, ac = alg.city.center, ald = map.islands.alderney;

  // real NYC boroughs → game islands
  const Wd = await loadWorld(); const nyc = Wd.layers.city.nyc;
  const big = id => { const c = nyc.find(c => c.id === id); const f = c.p.reduce((a, b) => (b.length > a.length ? b : a)); const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; };
  const R = { Manhattan: big('Manhattan'), Brooklyn: big('Brooklyn'), Queens: big('Queens'), Bronx: big('Bronx'), Staten: big('Staten Island') };
  const [rx0, rz0, rx1, rz1] = bbox([...R.Manhattan, ...R.Brooklyn, ...R.Bronx]);
  const gb = bbox([...alg.isl.poly, ...map.islands.broker.isl.poly, ...map.islands.bohan.isl.poly]);
  const sc = Math.min((gb[2] - gb[0]) / (rx1 - rx0), (gb[3] - gb[1]) / (rz1 - rz0));
  const toLocal = ([x, z]) => [(x - (rx0 + rx1) / 2) * sc + (gb[0] + gb[2]) / 2, (z - (rz0 + rz1) / 2) * sc + (gb[1] + gb[3]) / 2];
  const N = 160;
  const mk = (realPoly, gameId, col) => { const A = resample(realPoly.map(toLocal), N), B = gameId ? align(A, resample(map.islands[gameId].isl.poly, N)) : A; const line = fatLine([[0, 2, 0], [1, 2, 0]], col, 3, { opacity: 0 }); scene.add(line); return { A, B, line }; };
  const M = { Broker: { ...mk(R.Brooklyn, 'broker', '#ffd9a0'), cue: 'L3p2', real: 'BROOKLYN', id: 'broker' }, Dukes: { ...mk(R.Queens, null, '#ffd9a0'), cue: 'L3p3', real: 'QUEENS', id: 'broker' },
    Bohan: { ...mk(R.Bronx, 'bohan', '#ffd9a0'), cue: 'L3p4', real: 'BRONX', id: 'bohan' }, Algonquin: { ...mk(R.Manhattan, 'algonquin', '#ffd9a0'), cue: 'L3p5', real: 'MANHATTAN', id: 'algonquin' } };
  const staten = fatLine(R.Staten.map(toLocal).map(([x, z]) => [x, 2, z]), '#ff4a4a', 3, { opacity: 0, closed: true, dashed: true }); scene.add(staten);
  const stC = centroid(R.Staten.map(toLocal));
  const setLine = (line, pts) => { line.geometry.dispose(); const g = new LineGeometry(); g.setPositions(pts.flat()); line.geometry = g; line.computeLineDistances(); };

  // GPS route through Algonquin
  const vs = alg.segs.filter(s => Math.abs(s[0][0] - s[1][0]) < 2).sort((a, b) => Math.abs((a[0][0] + a[1][0]) / 2 - ac[0] - 15) - Math.abs((b[0][0] + b[1][0]) / 2 - ac[0] - 15));
  const av = vs[0], zS = Math.max(av[0][1], av[1][1]) - 30, zT = ac[1] - 40;
  const hs = alg.segs.filter(s => Math.abs(s[0][1] - s[1][1]) < 2).sort((a, b) => Math.abs(a[0][1] - zT) - Math.abs(b[0][1] - zT))[0];
  const zt = hs[0][1], xEnd = Math.min(hs[0][0], hs[1][0]) + 6;
  const route = [[av[0][0], zS], [av[0][0], zt], [xEnd, zt], [xEnd, zt - 70]];
  const rL = []; for (let i = 0; i < route.length - 1; i++) rL.push(Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]));
  const total = rL.reduce((a, b) => a + b, 0);
  const routeAt = d => { let acc = 0; for (let i = 0; i < rL.length; i++) { if (d <= acc + rL[i]) { const p = (d - acc) / rL[i]; return [route[i][0] + (route[i + 1][0] - route[i][0]) * p, route[i][1] + (route[i + 1][1] - route[i][1]) * p]; } acc += rL[i]; } return route[route.length - 1]; };
  const gps = fatLine([[0, 1, 0], [1, 1, 0]], '#b26bff', 7); scene.add(gps); const gpsHead = glow('#d7b3ff', 26); scene.add(gpsHead);
  const car = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 2.6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); scene.add(car);

  // ---------- HUD ----------
  const chap = chapterCard(ui, { num: '07', game: 'Grand Theft Auto IV · 2008', title: 'SMALLER, TALLER,<br>DENSER', acc: '#9fb4c8' });
  const km = kmCounter(ui), rad = radar(ui, 'gps'), cap = caption(ui);
  const board = excuseBoard(ui, [['Bridge blown up', '2001'], ['Hurricane', '1986'], ['"Because we said so"', '2004'], ['Terror alert', '2008']]);
  const st = stamp(ui, 'EXCUSE #4', 1640, 680, { rot: -6 });
  const halfTag = el(ui, 'ctr', '<div style="font:400 120px/1 Bebas;color:#ff5a5a;text-shadow:0 6px 30px rgba(0,0,0,.6)">&lt; ½ SAN ANDREAS</div>', { left: W / 2 + 'px', top: H * 0.7 + 'px' });
  const rage = el(ui, 'ctr', '<div style="font:700 20px Oswald;letter-spacing:.35em;color:#9fb4c8">NEW ENGINE · 2008</div><div style="font:400 96px/1 Bebas">REBUILT FROM SCRATCH</div>', { left: W / 2 + 'px', top: H * 0.3 + 'px', textAlign: 'center' });
  const blbl = Object.entries(M).map(([game, m]) => ({ game, m, set: label(ui, `<span style="opacity:.65">${m.real}</span> <span style="color:#ffd9a0">→ ${game.toUpperCase()}</span>`, 'mlbl sm', true) }));
  const aldL = label(ui, '<span style="opacity:.65">NEW JERSEY</span> <span style="color:#ffd9a0">→ ALDERNEY</span> <span style="font-size:.7em;opacity:.7">· SEPARATE STATE</span>', 'mlbl sm', true);
  const upTag = el(ui, '', '<div style="font:700 20px Oswald;letter-spacing:.35em;color:#9fb4c8">NEW DIMENSION</div><div style="font:400 90px/1 Bebas">↑ HEIGHT</div>', { right: '110px', top: '330px', textAlign: 'right' });
  const notInv = el(ui, 'ctr', 'STATEN ISLAND · NOT INVITED', { background: '#ff3a3a', color: '#111', padding: '6px 16px', font: '400 40px Bebas', letterSpacing: '.1em', whiteSpace: 'nowrap' });
  const pill = el(ui, 'pill ctr', 'RECALCULATING…');
  const talk = el(ui, 'ctr', '<div style="display:flex;align-items:center;gap:14px;background:rgba(14,16,24,.85);border:2px solid #b26bff;border-radius:40px;padding:10px 22px"><svg width="40" height="40" viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="#e7d4ff"/><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" stroke="#e7d4ff" stroke-width="2" fill="none"/></svg><span style="font:700 26px Mono;color:#e7d4ff">"IN 200 FEET, TURN LEFT"</span></div>', { left: W / 2 + 'px', top: H - 210 + 'px' });
  const cw = el(ui, '', '<div style="font:700 20px Oswald;letter-spacing:.35em;color:#ff5f8f">2009 · HANDHELD</div><div style="font:400 80px/1 Bebas">CHINATOWN WARS</div><div style="font:700 22px Mono;opacity:.75">ALDERNEY: <span style="color:#ff5f8f">CUT</span></div>', { left: '90px', bottom: '330px' });

  function update(t) {
    // ----- camera -----
    const yaw = track([[0, -0.1], [C.L3, -0.1], [C.L3p6, 0.12], [C.L4, 0.25], [C.L5, 0.0], [C.L6, 0.18], [C.L7, 0.1], [D, -0.05]], t);
    const pitch = track([[0, 70], [C.L2p2, 55], [C.L3, 50], [C.L3p5, 30], [C.L3p6, 42], [C.L4p2, 55], [C.L5, 48], [C.L6, 28], [C.L6p4 + 1, 24], [C.L7, 52], [D, 60]], t) * Math.PI / 180;
    const dist = track([[0, ext * 1.6], [C.L3, ext * 1.4], [C.L3p5, ext * 0.75], [C.L3p6, ext * 1.25], [C.L4p2, ext * 1.9], [C.L4p3 + 1, ext * 1.9], [C.L5, ext * 1.25], [C.L6, ext * 0.62], [C.L6p4 + 1, ext * 0.55], [C.L7, ext * 1.4], [D, ext * 1.7]], t);
    const tx = track([[0, cx], [C.L3, cx], [C.L3p5, ac[0]], [C.L3p6, cx - ext * 0.1], [C.L4p2, (cx + stC[0]) / 2], [C.L4p3 + 1, (cx + stC[0]) / 2], [C.L5, cx], [C.L6, ac[0] + 20], [C.L7, cx], [D, cx]], t);
    const tz = track([[0, cz], [C.L3, cz], [C.L3p5, ac[1] + 40], [C.L3p6, cz], [C.L4p2, (cz + stC[1]) / 2], [C.L4p3 + 1, (cz + stC[1]) / 2], [C.L5, cz], [C.L6, ac[1] + 20], [C.L7, cz], [D, cz]], t);
    camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist); camera.lookAt(tx, 0, tz);

    // ----- city: old one crumbles (L1), rebuilt (L2), Algonquin extra tall wave (L3p1) -----
    const crumble = smooth(inv(C.L1p2, C.L1p2 + 1.2, t)), rebuild = C.L2 + 0.6;
    map.all.forEach(rec => {
      const isA = rec === alg;
      if (t < rebuild) rec.city.update(1e6, { grow: 1 - 0.95 * crumble }); else rec.city.update(t, { origin: isA ? [ac[0], ac[1] + 150] : rec.city.center, start: rebuild + (isA ? 1.0 : 0), speed: 260, dur: 1.4, grow: isA ? lerp(0.35, 1, smooth(inv(C.L3, C.L3 + 1.5, t))) : 1 });
      rec.traffic.update(t, 1);
    });
    const drift = eio(inv(C.L7p2 - 0.4, C.L7p2 + 2.2, t)); ald.group.position.set(-drift * ext * 0.9, 0, drift * ext * 0.1); ald.group.rotation.y = drift * 0.15;

    // ----- morphs -----
    Object.values(M).forEach(m => {
      const t0 = C[m.cue] - 0.2, p = eio(inv(t0, t0 + 1.1, t)), o = win(t, t0 - 0.1, t0 + 2.4, .2, .6);
      m.line.visible = o > 0.01;
      if (m.line.visible) { setLine(m.line, Array.from({ length: N + 1 }, (_, i) => { const a = m.A[i % N], b = m.B[i % N]; return [lerp(a[0], b[0], p), 3, lerp(a[1], b[1], p)]; })); m.line.material.opacity = o; }
    });
    blbl.forEach(({ m, set }) => { const c = centroid(m.B), [x, y] = project(c[0], 0, c[1]); set(x, y - 50, win(t, C[m.cue] - 0.1, C[m.cue] + 2.3, .2, .3)); });
    { const c = ald.city.center, [x, y] = project(c[0] + ald.group.position.x, 0, c[1]); aldL(x, y - 60, win(t, C.L3p6 + 0.1, C.L4 + 0.5, .25, .3)); }
    staten.material.opacity = win(t, C.L4p2 - 0.2, C.L5, .2, .4) * (Math.floor(t * 4) % 2 ? 1 : 0.35);
    { const [x, y] = project(stC[0], 0, stC[1]); notInv.style.left = x + 'px'; notInv.style.top = y - 40 + 'px'; show(notInv, win(t, C.L4p3, C.L5, .15, .3), `translate(-50%,-50%) scale(${eback(inv(C.L4p3, C.L4p3 + 0.35, t))}) rotate(-4deg)`); }

    // ----- bridges, GPS -----
    stops.forEach((s, i) => { s.material.opacity = win(t, C.L5p2 + i * 0.1, C.L6, .2, .4) * (0.7 + 0.3 * Math.sin(t * 6 + i)); });
    const g = eio(inv(w('L6p2', 'gps') - 0.2, C.L6p2e, t)) * total, pts = [route[0]]; let acc = 0;
    for (let i = 0; i < rL.length; i++) { if (g >= acc + rL[i]) { pts.push(route[i + 1]); acc += rL[i]; } else { pts.push(routeAt(g)); break; } }
    const arr = pts.map(p => [p[0], 1.2, p[1]]); if (arr.length < 2) arr.push([arr[0][0] + 0.01, 1.2, arr[0][2]]);
    setLine(gps, arr); gps.visible = t > C.L6p2 - 0.2 && t < C.L7; const hp = routeAt(g); gpsHead.position.set(hp[0], 2, hp[1]); gpsHead.material.opacity = gps.visible ? 0.9 : 0;
    // car ignores the route at "recalculated"
    { const off = smooth(inv(C.L6p3, C.L6p3 + 0.8, t)) * 22; const cp = routeAt(Math.min(total, g * 0.85)); car.position.set(cp[0] + off, 1.4, cp[1] - off * 0.3); car.visible = gps.visible; }
    { const [x, y] = project(hp[0], 0, hp[1]); pill.style.left = x + 'px'; pill.style.top = y - 90 + 'px'; show(pill, win(t, C.L6p3, C.L6p4, .1, .3) * (Math.floor(t * 3) % 2 ? 1 : 0.55), 'translate(-50%,-50%)'); }
    show(talk, win(t, C.L6p4, C.L7, .2, .3), `translate(-50%,-50%) scale(${eback(inv(C.L6p4, C.L6p4 + 0.35, t))})`);

    // ----- HUD -----
    chap(win(t, 0.2, D - 0.2, .5, .4), eout(inv(0.2, 1.2, t)), eio(inv(4.2, 5.0, t)));
    const d = eout(inv(C.L1p2, C.L1p2 + 1.6, t)); km(win(t, 0.6, D, .3, .3), 38.2 - 22.06 * d, d > 0 ? -22.06 * d : null);
    show(rage, win(t, C.L2 + 0.2, C.L2p2, .3, .3), 'translate(-50%,-50%)');
    show(halfTag, win(t, C.L2p3, C.L3, .2, .3), `translate(-50%,-50%) scale(${eback(inv(C.L2p3, C.L2p3 + 0.35, t))})`);
    show(upTag, win(t, C.L3 + 0.3, C.L3p2 + 0.4, .3, .3), null);
    board(win(t, C.L5p3 - 0.5, C.L6 - 0.1, .4, .3), 4, eout(inv(C.L5p3 - 0.5, C.L5p3, t)));
    st(inv(C.L5p4, C.L5p4 + 0.35, t) * (t < C.L6 - 0.1 ? 1 : 0));
    rad(win(t, C.L6, D, .4, .3), 0, t * 10);
    show(cw, win(t, C.L7, D, .4, .3), null);
    cap(captionAt(TL, 'ch07', t));

    bloom.strength = 0.7; bloom.threshold = 0.72; bloom.radius = 0.5;
    grade.uPixel.value = 0; grade.uScan.value = 0; grade.uCA.value = 0.0015;
    grade.uLift.value.set(0.0, 0.01, 0.02); grade.uGain.value.set(0.98, 1.0, 1.05); grade.uSat.value = 0.85 - 0.25 * crumble * (t < rebuild ? 1 : 0); grade.uVig.value = 0.65; grade.uGrain.value = 0.045;
    grade.uFade.value = Math.min(inv(0, 0.4, t), 1 - inv(D - 0.5, D, t));
    tiltP.uAmt.value = 0.45; tiltP.uFocus.value = 0.52; tiltP.uBand.value = 0.2;
  }
  return { duration: D, stills: [2, 6, 10, 16, 20.5, 26, 29.5, 33, 38.5, 45.5, 52, 56, 58.5, 63, 66.5], update };
}
