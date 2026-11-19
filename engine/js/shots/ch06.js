// Chapter 06 · San Andreas (2004) - a whole state. Timed to VO cues.
// Real California/Nevada/Arizona with LA·SF·LV → fly into the island → glorious nothing: forests, farms, desert,
// dam, radio telescope, Mount Chiliad (someone falls off) → real states squeeze onto the island → wanted-star borders,
// Excuse #3 → first custom waypoint → 38.2 km².
import * as THREE from 'three';
import { normalise } from '../world/maps.js';
import { KM, water, glow, fatLine, coast, centroid, bbox, inside, streets, traffic } from '../world/geo.js';
import { sky, buildMap } from '../world/env.js';
import { terrain, fbm } from '../world/terrain.js';
import { loadWorld, buildWorld } from '../world/world.js';
import { track, win, inv, eout, eio, smooth, clamp, lerp, eback, rng } from '../core/util.js';
import { chapterCard, kmCounter, label, caption, stamp, excuseBoard, radar, el, show } from '../core/hud.js';
import { cues, captionAt, wordAt } from '../core/tl.js';

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, project, TL, W, H } = ctx; const tiltP = ctx.tilt;
  const C = cues(TL, 'ch06'), D = C.dur, w = (cue, word) => wordAt(TL, 'ch06', cue, word);

  // ---------- the island ----------
  const CITY = { ls: { c: [1.85, 1.95], r: 0.95, h: 15, name: 'LOS SANTOS', real: 'la', col: '#ffb347' }, sf: { c: [-2.35, -0.45], r: 0.75, h: 12, name: 'SAN FIERRO', real: 'sf', col: '#7fd8ff' }, lv: { c: [2.0, -2.1], r: 0.85, h: 11, name: 'LAS VENTURAS', real: 'lv', col: '#ff5fd2' } };
  const F = { forest: [-1.0, 1.7], farms: [1.8, 0.1], desert: [-0.4, -2.2], dam: [-0.6, -0.9], dish: [0.6, -2.5], chiliad: [-2.1, 1.95] };
  const def = normalise({ seed: 4, islands: [{ id: 'sa', name: '', sparse: true, base: 3.5,
    zones: Object.values(CITY).map(c => ({ c: c.c, r: c.r, h: c.h })), palette: ['#c9b48a', '#a89a80', '#e0d0a8', '#b8a080', '#d8c8a8'],
    pts: [[-3.0, -3.0], [-0.6, -3.2], [0.3, -2.7], [1.4, -3.2], [3.0, -3.0], [3.2, -1.2], [2.9, 0.2], [3.2, 1.4], [3.0, 3.0], [1.0, 3.2], [-0.4, 2.8], [-1.6, 3.2], [-3.0, 2.9], [-3.1, 1.2], [-3.4, 0.6], [-2.9, 0.0], [-3.4, -0.8], [-3.0, -1.8]] }] }, 31.55);
  const K = def.k * KM, P = ([x, z]) => [x * K, z * K];
  Object.values(CITY).forEach(c => { c.p = P(c.c); c.R = c.r * K; });
  Object.keys(F).forEach(k => F[k] = P(F[k]));

  scene.background = new THREE.Color('#0a1622'); const skyM = sky('#2a1830', '#d07040', '#1a0e10'); scene.add(skyM);
  const wat = water({ deep: '#0a1622', shallow: '#173246', glint: '#ffb060', glint2: '#ff7a40', streaks: 0.15, spark: 0.7, fog: '#5a3a38', fogFar: 5200 }); scene.add(wat);
  const map = buildMap(scene, def, { land: '#6a6a40', coast: '#ffc24a', coastW: 2.2, side: '#1a1410',
    mat: { win: '#ffd27a', win2: '#fff0c8', night: 0.35, dim: 1.0, fog: '#5a3a38', fogNear: 800, fogFar: 4200, floor: 0.45, light: [0.7, 0.45, 0.4], glass: '#2a2a34', skyTop: '#6a5a7a', skyLow: '#ffb070' }, shadow: 0.4,
    carsPer: 0, pitch: 0.12, street: 0.03, towerH: 18, hScale: 1.7 });
  const isl = map.islands.sa, poly = isl.isl.poly, [cx, cz] = map.center, ext = Math.max(map.bbox[2] - map.bbox[0], map.bbox[3] - map.bbox[1]);
  wat.material.uniforms.uCenter.value.set(cx, cz); wat.material.uniforms.uRadius.value = ext * 0.7;

  // terrain: zone weights → height & colour
  const gauss = (x, z, p, s) => Math.exp(-((x - p[0]) ** 2 + (z - p[1]) ** 2) / (2 * s * s));
  const weights = (x, z) => {
    let city = 0; Object.values(CITY).forEach(c => { city = Math.max(city, 1 - smooth(clamp((Math.hypot(x - c.p[0], z - c.p[1]) - c.R * 0.75) / (c.R * 0.6)))); });
    return { city, desert: smooth(clamp(1.3 * gauss(x, z, F.desert, K * 0.85) + 0.7 * gauss(x, z, P([-2.3, -2.3]), K * 0.6) - 0.25 + 0.3 * fbm(x * 0.01, z * 0.01))), forest: smooth(clamp(1.5 * gauss(x, z, F.forest, K * 1.1) + 1.2 * gauss(x, z, F.chiliad, K * 0.9))),
      farm: smooth(clamp(1.6 * gauss(x, z, F.farms, K * 0.75))), peak: gauss(x, z, F.chiliad, K * 0.42) };
  };
  const height = (x, z, w) => {
    const hills = (fbm(x * 0.006 + 3, z * 0.006 - 2) * 30 + fbm(x * 0.03, z * 0.03) * 6) * (1 - 0.5 * w.desert) * (1 - 0.75 * w.farm);
    const ridge = (1 - Math.abs(fbm(x * 0.02, z * 0.02) * 2 - 1)) * 28 * w.peak;
    const dunes = fbm(x * 0.03, z * 0.012) * 3 * w.desert;
    return (hills + dunes + 70 * w.peak + ridge) * (1 - w.city);
  };
  const hexc = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  const PAL = { grass: hexc('#7a8a44'), forest: hexc('#3a5a2a'), desert: hexc('#cf9e5e'), farmA: hexc('#8a9a3a'), farmB: hexc('#b8a050'), farmC: hexc('#5a7a2a'), rock: hexc('#7a6658'), snow: hexc('#e8e2d8'), city: hexc('#5a5650'), sand: hexc('#e0c890') };
  const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const color = (x, z, y, w) => {
    let c = PAL.grass;
    c = mix3(c, PAL.forest, w.forest);
    const cell = (Math.floor(x / 14) * 7 + Math.floor(z / 10) * 13) % 3, farmC = [PAL.farmA, PAL.farmB, PAL.farmC][(cell + 3) % 3];
    c = mix3(c, farmC, w.farm * 0.9);
    c = mix3(c, PAL.desert, w.desert);
    c = mix3(c, PAL.rock, smooth(clamp((y - 30) / 25)));
    c = mix3(c, PAL.snow, smooth(clamp((y - 70) / 12)));
    c = mix3(c, PAL.city, w.city);
    const n = 0.8 + 0.4 * fbm(x * 0.05, z * 0.05) * (0.7 + 0.3 * fbm(x * 0.3, z * 0.3)); return c.map(v => v * n);
  };
  const T = terrain(poly, { res: 230, weights, height, color, light: [0.7, 0.45, 0.4], fog: '#5a3a38', fogFar: 5200, amb: 0.42, coastFade: 30 });
  scene.add(T.mesh);

  // trees (instanced low-poly cones on forest weight)
  const R = rng(5), treeP = []; const [bx0, bz0, bx1, bz1] = bbox(poly);
  for (let i = 0; i < 9000 && treeP.length < 2600; i++) { const x = lerp(bx0, bx1, R()), z = lerp(bz0, bz1, R()); if (!inside([x, z], poly)) continue; const wv = weights(x, z); if (R() > wv.forest * 0.9 * (1 - wv.city) || wv.peak > 0.55) continue; treeP.push([x, T.heightAt(x, z), z, 0.8 + R() * 0.7]); }
  const tg = new THREE.ConeGeometry(1.6, 5, 5); tg.translate(0, 2.5, 0);
  const trees = new THREE.InstancedMesh(tg, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), treeP.length); trees.frustumCulled = false;
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); treeP.forEach(([x, y, z, s], i) => { m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.9 + R() * 0.5), s)); trees.setMatrixAt(i, m4); trees.setColorAt(i, c.set(R() < 0.5 ? '#3f6a2c' : '#2f5a30').multiplyScalar(0.85 + R() * 0.4)); }); }
  scene.add(trees);
  // dam + reservoir, radio telescope dish
  const damY = T.heightAt(...F.dam);
  const dam = new THREE.Mesh(new THREE.BoxGeometry(36, 16, 5), new THREE.MeshLambertMaterial({ color: '#cfc6b4' })); dam.position.set(F.dam[0], damY - 2, F.dam[1]); dam.rotation.y = 0; scene.add(dam);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(30, 40), new THREE.MeshBasicMaterial({ color: '#2f6a8a' })); lake.rotation.x = -Math.PI / 2; lake.position.set(F.dam[0], damY + 4, F.dam[1] - 30); lake.scale.set(0.75, 1, 1); scene.add(lake);
  const dishG = new THREE.Group(); const dishY = T.heightAt(...F.dish); dishG.position.set(F.dish[0], dishY, F.dish[1]); scene.add(dishG);
  const dishM = new THREE.Mesh(new THREE.SphereGeometry(16, 28, 10, 0, Math.PI * 2, 0, 0.75), new THREE.MeshLambertMaterial({ color: '#eeeeea', side: THREE.DoubleSide })); dishM.rotation.x = Math.PI * 0.82; dishM.position.y = 18; dishG.add(dishM);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 14, 6), new THREE.MeshLambertMaterial({ color: '#bdbdb8' })); mast.position.y = 7; dishG.add(mast);
  // desert dressing: cacti + rocks
  const dp = []; for (let i = 0; i < 6000 && dp.length < 380; i++) { const x = lerp(bx0, bx1, R()), z = lerp(bz0, bz1, R()); if (!inside([x, z], poly)) continue; const wv = weights(x, z); if (R() > wv.desert * (1 - wv.city) || Math.hypot(x - F.dam[0], z - F.dam[1] + 30) < 40) continue; dp.push([x, T.heightAt(x, z), z, R()]); }
  const cg = new THREE.CylinderGeometry(0.7, 0.9, 6, 6); cg.translate(0, 3, 0);
  const cacti = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), dp.length); cacti.frustumCulled = false;
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); dp.forEach(([x, y, z, r], i) => { const rock = r < 0.55; m4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(new THREE.Euler(rock ? r * 3 : 0, r * 6, rock ? r * 2 : 0)), rock ? new THREE.Vector3(1.3, 0.3, 1.1) : new THREE.Vector3(0.55, 0.35 + r * 0.4, 0.55)); cacti.setMatrixAt(i, m4); cacti.setColorAt(i, c.set(rock ? '#9a7a5a' : '#4f7a3a')); }); }
  scene.add(cacti);
  // highways between the cities
  const hw = [['ls', 'lv'], ['ls', 'sf'], ['sf', 'lv']].map(([a, b], i) => { const A = CITY[a].p, B = CITY[b].p, pts = [];
    for (let k = 0; k <= 60; k++) { const u = k / 60, bend = Math.sin(u * Math.PI) * [60, -70, 50][i]; const nx = -(B[1] - A[1]), nz = B[0] - A[0], L = Math.hypot(nx, nz);
      const x = lerp(A[0], B[0], u) + nx / L * bend, z = lerp(A[1], B[1], u) + nz / L * bend; pts.push([x, T.heightAt(x, z) + 1.2, z]); }
    const l = fatLine(pts, '#f0dcb0', 2.6, { opacity: 0.85 }); scene.add(l); return l; });
  // city traffic only
  const segs = isl.segs.filter(s => Object.values(CITY).some(c => Math.hypot((s[0][0] + s[1][0]) / 2 - c.p[0], (s[0][1] + s[1][1]) / 2 - c.p[1]) < c.R * 0.8));
  const tr = traffic(segs, Math.round(segs.length * 1.2), { seed: 66, colors: ['#fff1c2', '#ff4b3a', '#ffd166', '#ffffff'] }); scene.add(tr.mesh);
  // the unlucky player rolling down Chiliad
  const dude = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 2), new THREE.MeshBasicMaterial({ color: '#ff3030' })); scene.add(dude);
  const peakTop = [F.chiliad[0], T.heightAt(...F.chiliad), F.chiliad[1]];

  // ---------- real states (squeeze) ----------
  const Wd = await loadWorld();
  const world = buildWorld(scene, Wd, { hiIds: ['California', 'Nevada', 'Arizona'], land: '#3a2c26', foreign: '#2a2220', lights: '#ffc46b', oceanA: '#0a1622', oceanB: '#122a3a', border: '#7a6050', coast: '#ffb060' });
  const realC = ['la', 'sf', 'lv'].map(k => Wd.anchors[k]), gameC = ['ls', 'sf', 'lv'].map(k => CITY[k].p);
  const rc = centroid(realC), gc = centroid(gameC), per = a => Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) + Math.hypot(a[1][0] - a[2][0], a[1][1] - a[2][1]) + Math.hypot(a[2][0] - a[0][0], a[2][1] - a[0][1]);
  const S1 = per(gameC) / per(realC);
  const states = ['California', 'Nevada', 'Arizona'].map(id => Wd.layers.states.find(s => s.id === id));
  const squeeze = new THREE.Group(); scene.add(squeeze);
  const sqLines = states.flatMap(st => st.hi.map(flat => { const pts = []; for (let i = 0; i < flat.length; i += 2) pts.push([flat[i] - rc[0], 0, flat[i + 1] - rc[1]]); const l = fatLine(pts, '#ffd27a', 2.5, { opacity: 0, closed: true }); squeeze.add(l); return l; }));
  const realDots = ['la', 'sf', 'lv'].map((k, i) => { const g = glow(Object.values(CITY)[i].col, 1); scene.add(g); return g; });

  // ---------- HUD ----------
  const chap = chapterCard(ui, { num: '06', game: 'Grand Theft Auto: San Andreas · 2004', title: 'A WHOLE<br>STATE', acc: '#ffc24a' });
  const km = kmCounter(ui), cap = caption(ui), rad = radar(ui, 'round', '#ffc24a');
  const board = excuseBoard(ui, [['Bridge blown up', '2001'], ['Hurricane', '1986'], ['"Because we said so"', '2004'], ['?', '…']]);
  const st = stamp(ui, 'EXCUSE #3', 1640, 640, { rot: -8 });
  const cityLbl = Object.entries(CITY).map(([k, c]) => ({ k, c, set: label(ui, `<span style="color:${c.col}">${c.name}</span>`, 'mlbl', true) }));
  const realLbl = [['la', 'LOS ANGELES', 'L2p2', 'LOS SANTOS'], ['sf', 'SAN FRANCISCO', 'L2p3', 'SAN FIERRO'], ['lv', 'LAS VEGAS', 'L2p4', 'LAS VENTURAS']].map(([k, real, cue, game]) => ({ k, cue, set: label(ui, `${real} <span style="color:#ffc24a">= ${game}</span>`, 'mlbl sm', true) }));
  const states3 = el(ui, 'ctr', '<div style="font:700 22px Oswald;letter-spacing:.4em;color:#ffc24a">CALIFORNIA · NEVADA · ARIZONA</div>', { left: W / 2 + 'px', top: '120px' });
  const nothing = el(ui, 'ctr', '<div style="font:400 120px/1 Bebas;letter-spacing:.06em;text-shadow:0 6px 30px rgba(0,0,0,.6)">GLORIOUS <span style="color:#ffc24a">NOTHING</span></div>', { left: W / 2 + 'px', top: H * 0.3 + 'px' });
  const feat = [['FORESTS', 'forest', 'forests'], ['FARMS', 'farms', 'farms'], ['DESERT', 'desert', 'desert'], ['A DAM', 'dam', 'dam'], ['A GIANT RADIO TELESCOPE', 'dish', 'radio'], ['MOUNT CHILIAD', 'chiliad', 'mountain']]
    .map(([txt, k, word]) => ({ k, t0: w(word === 'mountain' ? 'L4p2' : 'L4p1', word), set: label(ui, `<span style="background:rgba(20,12,6,.75);padding:4px 14px">${txt}</span>`, 'mlbl', true) }));
  const oof = el(ui, 'ctr', '<div style="font:700 18px Oswald;letter-spacing:.3em;color:#ff5a5a">FALLEN OFF CHILIAD</div><div style="font:400 64px Bebas">EVERY PLAYER · AT LEAST ONCE</div>', { left: W / 2 + 'px', top: H - 230 + 'px', textAlign: 'center' });
  const sqTag = el(ui, 'ctr', '<div style="font:700 22px Oswald;letter-spacing:.35em;color:#ffc24a">3 REAL STATES → 1 ISLAND</div><div class="pct" style="font:400 90px Bebas"></div>', { left: W / 2 + 'px', top: '150px', textAlign: 'center' });
  const pct = sqTag.querySelector('.pct');
  const borders = [[[0.5, 3.2], [0.7, 1.4], [1.0, 0.75], [2.0, 0.85], [3.2, 0.9]], [[-3.4, 0.6], [-1.6, 0.4], [-0.5, -0.3], [0.9, -1.0], [2.0, -1.0], [3.2, -1.2]]].map(b => b.map(P).map(([x, z]) => [x, T.heightAt(x, z) + 3, z]));
  const bLines = borders.map(b => { const l = fatLine(b, '#ff2a3a', 4, { dashed: true, opacity: 0 }); scene.add(l); return l; });
  const starPts = borders.flatMap((b, bi) => { const out = []; for (let i = 0; i < b.length - 1; i++) for (let k = 0; k < 3; k++) { const u = (k + 0.5) / 3; out.push({ bi, p: [lerp(b[i][0], b[i + 1][0], u), b[i][1], lerp(b[i][2], b[i + 1][2], u)] }); } return out; });
  const stars = starPts.map(() => el(ui, 'ctr', '<span style="font-size:34px;color:#ffd400;text-shadow:0 0 10px #000">★</span>'));
  const cops = starPts.filter((_, i) => i % 2 === 0).map((s, i) => { const g = glow(i % 2 ? '#ff2a3a' : '#2a6aff', 14); g.position.set(...s.p); scene.add(g); return g; });
  const flag = el(ui, 'ctr', '<svg width="70" height="90" viewBox="0 0 28 36"><path d="M4 34V2" stroke="#fff" stroke-width="3"/><path d="M5 3h18l-5 6 5 6H5z" fill="#ff3fa4"/></svg>');
  const wpPill = el(ui, 'pill ctr', 'WAYPOINT SET · <span style="color:#ff8aa8">NO ROUTE</span>');
  const ring = (() => { const pts = []; for (let i = 0; i <= 48; i++) pts.push([Math.cos(i / 48 * 6.283) * 10, 0, Math.sin(i / 48 * 6.283) * 10]); const l = fatLine(pts, '#ff3fa4', 3, { opacity: 0 }); const g = new THREE.Group(); g.add(l); scene.add(g); return { g, l }; })();
  const wp = P([0.2, -1.9]);
  const bars = el(ui, '', ['GTA III|#ff9a3c|8.12', 'VICE CITY|#ff3fa4|9.11', 'SAN ANDREAS|#ffc24a|38.2'].map((s, i) => { const [n, c, v] = s.split('|'); return `<div style="display:flex;align-items:center;gap:14px;margin-bottom:10px"><div style="width:190px;font:400 32px Bebas;color:${c}">${n}</div><div class="b${i}" style="height:30px;background:${c}"></div><div style="font:700 22px Mono">${v}</div></div>`; }).join(''),
    { left: '90px', bottom: '140px', padding: '22px 28px', background: 'rgba(20,12,8,.78)', borderRadius: '10px' });
  const bb = [0, 1, 2].map(i => bars.querySelector('.b' + i));
  const x4 = el(ui, 'ctr', '<span style="font:400 200px Bebas;color:#ffc24a;text-shadow:0 8px 40px rgba(0,0,0,.6)">×4</span>', { left: W / 2 + 'px', top: H / 2 + 'px' });

  const logT = (keys, t) => Math.exp(track(keys.map(([a, b, e]) => [a, Math.log(b), e]), t));
  const toGame = ([x, z], s) => [gc[0] + (x - rc[0]) * s, gc[1] + (z - rc[1]) * s];

  function update(t) {
    // ----- camera phases -----
    let pos, look;
    const tIn = C.L3 - 0.3;                                   // real map → island
    if (t < tIn + 0.9) {
      const s = 1; world.group.position.set(gc[0] - rc[0], -3, gc[1] - rc[1]);
      const h = logT([[0, 240000], [C.L2, 210000], [C.L2p4 + 1.2, 190000], [tIn + 0.9, ext * 2.2]], t);
      const lean = 0.35 * (1 - smooth(inv(tIn, tIn + 0.9, t)));
      pos = [gc[0], h, gc[1] + h * Math.tan(lean) + 0.01]; look = [gc[0], 0, gc[1]];
      camera.up.set(0, 0, -1);
    } else if (t < C.L5 - 0.2) {                               // low flight over the countryside
      camera.up.set(0, 1, 0);
      const k = [[tIn + 0.9, [cx, ext * 1.0, cz + ext * 0.9], [cx, 0, cz]],
        [C.L3p2, [F.forest[0] + 60, 190, F.forest[1] + 300], F.forest],
        [w('L4p1', 'forests') + 0.4, [F.forest[0] + 80, 140, F.forest[1] + 220], F.forest],
        [w('L4p1', 'farms') + 0.3, [F.farms[0] - 160, 150, F.farms[1] + 200], F.farms],
        [w('L4p1', 'desert') + 0.3, [F.desert[0] + 120, 150, F.desert[1] + 230], F.desert],
        [w('L4p1', 'dam') + 0.3, [F.dam[0] + 90, damY + 90, F.dam[1] + 160], F.dam],
        [w('L4p1', 'radio') + 0.5, [F.dish[0] + 90, dishY + 75, F.dish[1] + 130], F.dish],
        [C.L4p2 + 0.6, [F.chiliad[0] + 170, 140, F.chiliad[1] + 160], F.chiliad],
        [C.L4e + 0.2, [F.chiliad[0] + 150, 120, F.chiliad[1] + 120], F.chiliad]];
      const T0 = k.map(r => r[0]), i = Math.max(0, Math.min(k.length - 2, T0.findIndex((tt, j) => j < T0.length - 1 && t >= tt && t < T0[j + 1]) === -1 ? (t < T0[0] ? 0 : k.length - 2) : T0.findIndex((tt, j) => j < T0.length - 1 && t >= tt && t < T0[j + 1])));
      const u = eio(inv(k[i][0], k[i + 1][0], t));
      pos = [0, 1, 2].map(j => lerp(k[i][1][j], k[i + 1][1][j], u));
      const la = (q, j) => q[2].length === 3 ? q[2][j] : [q[2][0], 0, q[2][1]][j];
      look = [0, 1, 2].map(j => lerp(la(k[i], j), la(k[i + 1], j), u));
      if (look[1] === 0) look[1] = T.heightAt(look[0], look[2]);
    } else {                                                   // squeeze, borders, waypoint, total
      camera.up.set(0, 0, -1);
      const s = Math.exp(lerp(Math.log(1), Math.log(S1), eio(inv(C.L5 + 0.2, C.L5e, t))));
      const h = t < C.L6 ? Math.max(ext * 1.7, 85000 * s) : track([[C.L6, ext * 1.7], [C.L6 + 1, ext * 1.5], [C.L7, ext * 1.5], [C.L8, ext * 1.6], [D, ext * 1.9]], t);
      const lean = t < C.L5 + 0.2 ? 0 : 0.5 * smooth(inv(C.L5e - 1.2, C.L6 + 0.5, t));
      if (t < C.L5 + 0.2) { const hh = logT([[C.L5 - 0.2, ext * 1.0], [C.L5 + 0.2, 85000]], t); pos = [gc[0], hh, gc[1] + 0.01]; }
      else pos = [cx, h, cz + h * Math.tan(lean) + 0.01];
      look = [pos[0], 0, pos[2] - h * Math.tan(lean)];
      squeeze.scale.setScalar(s); squeeze.position.set(gc[0], 4, gc[1]);
    }
    camera.position.set(...pos); camera.lookAt(...look);
    wat.visible = skyM.visible = camera.position.y < 9000;
    const ch = camera.position.y; camera.near = Math.max(0.5, ch * 0.01); camera.far = Math.max(40000, ch * 40); camera.updateProjectionMatrix();

    // ----- layers -----
    const realOn = 1 - smooth(inv(tIn, tIn + 0.8, t));
    world.group.visible = realOn > 0.01; world.lod(Math.max(2000, ch), realOn); world.countries.material.opacity = realOn; world.lakes.material.opacity = realOn;
    world.lightsMat.uniforms.uOp.value = realOn; world.lightsMat.uniforms.uTime.value = t; world.coastGlow.forEach(l => l.material.opacity *= realOn); world.borders.forEach(b => b.material.opacity = 0.5 * realOn); world.sync();
    Object.values(world.detail).forEach(d => { d.children.forEach(m => m.material && (m.material.opacity = 0)); d.userData.lines.forEach(l => l.material.opacity = 0); });
    // highlight CA/NV/AZ during L1-L2: brighter fill on the hi meshes isn't separable, so use the squeeze outlines at scale 1
    const sqO = Math.max(win(t, C.L1p2 - 0.2, tIn + 0.6, .5, .5), win(t, C.L5 + 0.1, C.L5e + 0.6, .3, .6));
    if (t < C.L5) { squeeze.scale.setScalar(1); squeeze.position.set(gc[0], 4, gc[1]); }
    sqLines.forEach(l => l.material.opacity = sqO);
    ['la', 'sf', 'lv'].forEach((k, i) => { const g = realDots[i], s = t < C.L5 ? 1 : squeeze.scale.x, p = toGame(Wd.anchors[k], s);
      const m = t < C.L5 ? 0 : eio(inv(C.L5e - 1.5, C.L5e, t)), q = [lerp(p[0], gameC[i][0], m), lerp(p[1], gameC[i][1], m)];
      g.position.set(q[0], 30, q[1]); const sz = ch * 0.03 * (1 + 0.5 * eback(inv(C[['L2p2', 'L2p3', 'L2p4'][i]], C[['L2p2', 'L2p3', 'L2p4'][i]] + 0.4, t)) * (t < C.L3 ? 1 : 0)); g.scale.set(sz, sz, 1);
      g.material.opacity = Math.max(smooth(inv(C[['L2p2', 'L2p3', 'L2p4'][i]] - 0.1, C[['L2p2', 'L2p3', 'L2p4'][i]] + 0.2, t)) * realOn, sqO * (t > C.L5 ? 1 : 0)); });
    const island = smooth(inv(tIn - 0.2, tIn + 0.8, t)); [T.mesh, trees, cacti, isl.group, tr.mesh, dam, lake, dishG, ...hw].forEach(o => o.visible = island > 0.01);
    isl.city.update(t, { origin: CITY.ls.p, start: tIn + 0.3, speed: 300, dur: 1.0 }); tr.update(t, 1);
    // rolling player
    { const t0 = w('L4p2', 'fallen') - 0.2, u = clamp((t - t0) / 1.8), ang = -0.9, dist = u * 110;
      const x = peakTop[0] + Math.cos(ang) * dist, z = peakTop[2] + Math.sin(ang) * dist, y = T.heightAt(x, z) + 2.5 + Math.abs(Math.sin(u * 18)) * 6 * (1 - u);
      dude.position.set(x, y, z); dude.rotation.set(u * 30, 0, u * 22); dude.visible = t > t0 && t < C.L5; }
    // borders & cops
    const bo = win(t, C.L6 + 0.3, C.L7, .4, .4);
    bLines.forEach((l, i) => l.material.opacity = bo * smooth(inv(C.L6p3 + i * 0.4, C.L6p3 + i * 0.4 + 0.5, t)));
    cops.forEach((g, i) => { g.material.opacity = bo * smooth(inv(C.L6p3 + 0.3, C.L6p3 + 0.8, t)) * (Math.floor(t * 6 + i) % 2 ? 1 : 0.25); g.scale.setScalar(ch * 0.02); });
    stars.forEach((e, i) => { const s = starPts[i], [x, y] = project(...s.p), t0 = C.L6p3 + s.bi * 0.4 + (i % 15) * 0.04; e.style.left = x + 'px'; e.style.top = y + 'px'; show(e, bo * smooth(inv(t0, t0 + 0.2, t)), `translate(-50%,-50%) scale(${0.9 + 0.2 * Math.sin(t * 8 + i)})`); });
    // waypoint
    { const t0 = C.L7 + 0.5, wy = T.heightAt(...wp), [x, y] = project(wp[0], wy, wp[1]), d = eout(inv(t0, t0 + 0.4, t));
      flag.style.left = x + 'px'; flag.style.top = y - 45 - 120 * (1 - d) + 'px'; show(flag, win(t, t0, C.L8, .1, .3), 'translate(-50%,-50%)');
      ring.g.position.set(wp[0], wy + 1.5, wp[1]); const rp = ((t - t0) * 0.8) % 1; ring.g.scale.setScalar(1 + rp * 3); ring.l.material.opacity = t > t0 + 0.4 && t < C.L8 ? 1 - rp : 0;
      wpPill.style.left = x + 'px'; wpPill.style.top = y - 140 + 'px'; show(wpPill, win(t, C.L7p2, C.L8, .2, .3), 'translate(-50%,-50%)'); }

    // ----- HUD -----
    show(states3, win(t, C.L1p2 - 0.2, C.L2, .4, .3), 'translate(-50%,-50%)');
    realLbl.forEach(({ k, cue, set }) => { const [x, y] = project(Wd.anchors[k][0] + world.group.position.x, 0, Wd.anchors[k][1] + world.group.position.z); set(x, y - 60, win(t, C[cue] - 0.1, tIn, .25, .3)); });
    cityLbl.forEach(({ c, set }) => { const [x, y] = project(c.p[0], 20, c.p[1]); set(x, y - 50, Math.max(win(t, tIn + 0.8, C.L3p2, .3, .3), win(t, C.L5e + 0.2, C.L6p3, .3, .3))); });
    show(nothing, win(t, C.L3p2 - 0.05, C.L4, .2, .4), `translate(-50%,-50%) scale(${lerp(1.15, 1, eout(inv(C.L3p2, C.L3p2 + 0.5, t)))})`);
    feat.forEach(({ k, t0, set }, i) => { const p = F[k], [x, y] = project(p[0], k === 'chiliad' ? peakTop[1] : T.heightAt(p[0], p[1]) + (k === 'dish' ? 34 : 14), p[1]); set(x, y - 30, win(t, t0 - 0.1, (feat[i + 1] ? feat[i + 1].t0 : C.L4e) - 0.05, .15, .2)); });
    show(oof, win(t, w('L4p2', 'every'), C.L5 - 0.2, .2, .3), 'translate(-50%,-50%)');
    { const s = squeeze.scale.x, a = 1 / Math.max(s, 1e-9); pct.innerHTML = 'DISTANCES <span style="color:#ffc24a">÷' + Math.round(1 / S1) + '</span>'; show(sqTag, win(t, C.L5e - 0.6, C.L6 + 0.6, .3, .4), 'translate(-50%,-50%)'); }
    chap(win(t, 0.2, D - 0.2, .5, .4), eout(inv(0.2, 1.2, t)), eio(inv(4.2, 5.0, t)));
    board(win(t, w('L6p4', 'excuse') - 0.6, C.L7 - 0.1, .4, .3), 4, eout(inv(w('L6p4', 'excuse') - 0.6, w('L6p4', 'excuse'), t)));
    st(inv(w('L6p4', 'because'), w('L6p4', 'because') + 0.35, t) * (t < C.L7 - 0.1 ? 1 : 0));
    rad(win(t, C.L7, D, .4, .3), -t * 5, t * 8);
    const kIn = inv(C.L8, C.L8 + 1.4, t); km(win(t, C.L8, D, .3, .3), 9.11 + 29.09 * eout(kIn), kIn > 0 ? 29.09 * eout(kIn) : null);
    show(bars, win(t, C.L8 + 0.3, D, .3, .3), null); [8.12, 9.11, 38.2].forEach((v, i) => bb[i].style.width = v * 13 * eout(inv(C.L8 + 0.4 + i * 0.25, C.L8 + 1.2 + i * 0.25, t)) + 'px');
    show(x4, win(t, C.L8p2, D, .2, .3), `translate(-50%,-50%) scale(${eback(inv(C.L8p2, C.L8p2 + 0.4, t))})`);
    cap(captionAt(TL, 'ch06', t));

    // ----- look -----
    T.mesh.material.uniforms.uCam.value.copy(camera.position);
    bloom.strength = 0.5; bloom.threshold = 0.75; bloom.radius = 0.5;
    grade.uPixel.value = 0; grade.uScan.value = 0; grade.uCA.value = 0.0015;
    grade.uLift.value.set(0.035, 0.015, 0.0); grade.uGain.value.set(1.08, 1.0, 0.9); grade.uSat.value = 1.1; grade.uVig.value = 0.6; grade.uGrain.value = 0.045;
    grade.uFade.value = Math.min(inv(0, 0.4, t), 1 - inv(D - 0.5, D, t));
    tiltP.uAmt.value = 0.35 * island * (t > C.L5 ? 0.5 : 1); tiltP.uFocus.value = 0.5; tiltP.uBand.value = 0.22;
  }
  return { duration: D, stills: [2, 8, 15, 19, 22.5, 25, 26.5, 28, 29.5, 31.5, 36, 38.5, 46, 51, 56, 63], update };
}
