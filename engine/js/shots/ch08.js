// Chapter 08 · GTA V (2013) - the big one. Timed to VO cues.
// Real SoCal → dive into Los Santos + Blaine County → tour: Chiliad, Alamo Sea, desert, military base, coastal mansions
// → "down": the camera plunges under the sea (wrecks, caves, shark) → 75.84 km², >9 Liberty Cities → real Los Angeles
// overlaid at true scale (~17×) → satellites North Yankton & Cayo Perico → "Until now": Leonida teaser.
import * as THREE from 'three';
import { normalise } from '../world/maps.js';
import { KM, water, glow, fatLine, centroid, bbox, inside, traffic, flatPoly } from '../world/geo.js';
import { sky, buildMap } from '../world/env.js';
import { terrain, fbm } from '../world/terrain.js';
import { loadWorld, buildWorld } from '../world/world.js';
import { track, win, inv, eout, eio, smooth, clamp, lerp, eback, rng } from '../core/util.js';
import { chapterCard, kmCounter, label, caption, radar, el, show } from '../core/hud.js';
import { cues, captionAt, wordAt } from '../core/tl.js';

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, project, TL, W, H } = ctx; const tiltP = ctx.tilt;
  const C = cues(TL, 'ch08'), D = C.dur, w = (cue, word) => wordAt(TL, 'ch08', cue, word);

  // ---------- island ----------
  const def = normalise({ seed: 5, islands: [{ id: 'v', name: '', sparse: true, base: 3,
    zones: [{ c: [0.7, 4.5], r: 1.5, h: 34 }, { c: [0.6, 3.0], r: 1.2, h: 6 }, { c: [-0.7, -5.6], r: 0.45, h: 2 }, { c: [1.3, -0.5], r: 0.4, h: 1.5 }, { c: [2.3, -2.7], r: 0.35, h: 1.5 }],
    palette: ['#d8d0c0', '#c8c0b0', '#e8e0d0', '#b8b4ac', '#a8b8c8'],
    pts: [[-2.4, -6.0], [-0.8, -6.5], [1.4, -6.6], [2.6, -5.0], [3.4, -3.2], [3.0, 0.8], [3.6, 3.8], [2.6, 5.4], [1.4, 6.1], [-0.4, 5.9], [-1.6, 5.6], [-2.2, 4.2], [-3.1, 2.2], [-2.6, 0.6], [-2.1, -0.8], [-3.0, -3.4]] }] }, 48.15);
  const K = def.k * KM, P = ([x, z]) => [x * K, z * K];
  const F = { ls: P([0.7, 4.5]), vine: P([0.4, 2.6]), chiliad: P([-1.2, -4.6]), alamo: P([0.6, -1.3]), desert: P([2.0, -0.6]), base: P([-2.0, -0.5]), coast: P([-2.3, 2.6]), paleto: P([-0.7, -5.6]), north: P([0.0, -3.0]) };

  scene.add(sky('#4a7ab8', '#ffd8a0', '#2a3a48'));
  scene.background = new THREE.Color('#0a1a28');
  const skyM = scene.children[scene.children.length - 1];
  const wat = water({ deep: '#0c3a5a', shallow: '#1a6a8a', glint: '#ffffff', glint2: '#ffe0a0', streaks: 0.1, spark: 0.9, fog: '#9ab8c8', fogFar: 6500 }); scene.add(wat);
  const map = buildMap(scene, def, { land: '#8a8a50', coast: '#4fd1ff', coastW: 2.0, side: '#2a2418',
    mat: { win: '#ffe0a0', win2: '#ffffff', night: 0.15, dim: 1.05, fog: '#9ab8c8', fogNear: 1200, fogFar: 6000, floor: 0.4, light: [0.5, 0.75, 0.35], glass: '#3a5a7a', skyTop: '#7aa8d8', skyLow: '#ffe0b0' }, shadow: 0.35,
    carsPer: 0, pitch: 0.11, street: 0.026, towerH: 20, hScale: 1.5, sun: '#fff6e0' });
  const isl = map.islands.v, poly = isl.isl.poly, [cx, cz] = map.center, ext = Math.max(map.bbox[2] - map.bbox[0], map.bbox[3] - map.bbox[1]);
  wat.material.uniforms.uCenter.value.set(cx, cz); wat.material.uniforms.uRadius.value = ext * 0.6;

  const gauss = (x, z, p, s) => Math.exp(-((x - p[0]) ** 2 + (z - p[1]) ** 2) / (2 * s * s));
  const lakeR = [0.95 * K, 0.55 * K];
  const inLake = (x, z) => ((x - F.alamo[0]) / lakeR[0]) ** 2 + ((z - F.alamo[1]) / lakeR[1]) ** 2;
  const weights = (x, z) => {
    const city = Math.max(1 - smooth(clamp((Math.hypot(x - F.ls[0], z - F.ls[1]) - 1.2 * K) / (0.5 * K))), 1 - smooth(clamp((Math.abs(x - F.base[0]) + Math.abs(z - F.base[1]) * 1.6 - 0.55 * K) / (0.2 * K))));
    return { city, lake: 1 - smooth(clamp((inLake(x, z) - 0.8) / 0.5)), desert: smooth(clamp(1.3 * gauss(x, z, F.desert, K * 1.0) - 0.2 + 0.3 * fbm(x * 0.01, z * 0.01))),
      forest: smooth(clamp(1.4 * gauss(x, z, P([-0.6, -4.8]), K * 1.3))), peak: gauss(x, z, F.chiliad, K * 0.55), hills: gauss(x, z, F.vine, K * 0.8) + 0.8 * gauss(x, z, F.coast, K * 0.7) };
  };
  const height = (x, z, w) => {
    const base = fbm(x * 0.005 + 7, z * 0.005 - 3) * 34 * (1 - 0.5 * w.desert) + fbm(x * 0.03, z * 0.03) * 6;
    const ridge = (1 - Math.abs(fbm(x * 0.018, z * 0.018) * 2 - 1)) * 30 * w.peak;
    return ((base + 95 * w.peak + ridge + 26 * w.hills) * (1 - w.city)) * (1 - w.lake) - 5 * w.lake;
  };
  const hexc = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  const PAL = { grass: hexc('#a4a058'), forest: hexc('#4a6a32'), desert: hexc('#dcb478'), rock: hexc('#9a8a76'), city: hexc('#8a8478'), lake: hexc('#3a6a5a'), hills: hexc('#8a8a48') };
  const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const color = (x, z, y, w) => { let c = PAL.grass; c = mix3(c, PAL.hills, clamp(w.hills)); c = mix3(c, PAL.forest, w.forest); c = mix3(c, PAL.desert, w.desert); c = mix3(c, PAL.rock, smooth(clamp((y - 45) / 30)));
    c = mix3(c, PAL.city, w.city); c = mix3(c, PAL.lake, w.lake); const n = 0.82 + 0.36 * fbm(x * 0.05, z * 0.05); return c.map(v => v * n); };
  const T = terrain(poly, { res: 240, weights, height, color, light: [0.5, 0.75, 0.35], fog: '#9ab8c8', fogFar: 7000, amb: 0.5, coastFade: 30 }); scene.add(T.mesh);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: '#4f9ab8' })); lake.rotation.x = -Math.PI / 2; lake.scale.set(lakeR[0] * 0.92, lakeR[1] * 0.92, 1); lake.position.set(F.alamo[0], 0.4, F.alamo[1]); scene.add(lake);

  // trees, military base, mansions with pools
  const R = rng(13), [bx0, bz0, bx1, bz1] = bbox(poly), treeP = [];
  for (let i = 0; i < 9000 && treeP.length < 2400; i++) { const x = lerp(bx0, bx1, R()), z = lerp(bz0, bz1, R()); if (!inside([x, z], poly)) continue; const wv = weights(x, z); if (R() > (wv.forest * 0.9 + wv.hills * 0.25) * (1 - wv.city) * (1 - wv.lake)) continue; treeP.push([x, T.heightAt(x, z), z, 0.8 + R() * 0.6]); }
  const tg = new THREE.ConeGeometry(1.6, 5, 5); tg.translate(0, 2.5, 0);
  const trees = new THREE.InstancedMesh(tg, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), treeP.length); trees.frustumCulled = false;
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); treeP.forEach(([x, y, z, s], i) => { m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s)); trees.setMatrixAt(i, m4); trees.setColorAt(i, c.set(R() < 0.5 ? '#4f7a34' : '#3f6a38')); }); }
  scene.add(trees);
  const baseG = new THREE.Group(); baseG.position.set(F.base[0], T.heightAt(...F.base) + 0.3, F.base[1]); scene.add(baseG);
  const rw = new THREE.Mesh(new THREE.BoxGeometry(150, 0.4, 12), new THREE.MeshLambertMaterial({ color: '#4a4a4a' })); rw.rotation.y = 0.2; baseG.add(rw);
  for (let i = 0; i < 4; i++) { const hg = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 18, 12, 1, false, 0, Math.PI), new THREE.MeshLambertMaterial({ color: '#7a7a6a' })); hg.rotation.z = Math.PI / 2; hg.position.set(-40 + i * 22, 0, 22); baseG.add(hg); }
  const fence = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; const x = F.base[0] + Math.cos(a) * 95, z = F.base[1] + Math.sin(a) * 50; fence.push([x, T.heightAt(x, z) + 1.5, z]); }
  const fenceL = fatLine(fence, '#ff5a3a', 2, { dashed: true, opacity: 0 }); scene.add(fenceL);
  const mans = []; for (let i = 0; i < 120 && mans.length < 46; i++) { const x = F.coast[0] + (R() - 0.3) * K * 1.1, z = F.coast[1] + (R() - 0.5) * K * 1.6; if (!inside([x, z], poly) || weights(x, z).city > 0.2) continue; mans.push([x, T.heightAt(x, z), z, R()]); }
  const mansM = new THREE.InstancedMesh(new THREE.BoxGeometry(7, 4, 6).translate(0, 2, 0), new THREE.MeshLambertMaterial({ color: '#f4f0e8' }), mans.length);
  const pools = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 0.3, 2.5), new THREE.MeshBasicMaterial({ color: '#3fe0ff' }), mans.length);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); mans.forEach(([x, y, z, r], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * 3); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); mansM.setMatrixAt(i, m4); m4.compose(new THREE.Vector3(x + 6, y + 0.3, z + 3), q, new THREE.Vector3(1, 1, 1)); pools.setMatrixAt(i, m4); }); }
  scene.add(mansM, pools);
  const fireH = mans[7] || mans[0]; const fire = glow('#ff6a1f', 20); fire.position.set(fireH[0], fireH[1] + 6, fireH[2]); scene.add(fire);
  const segs = isl.segs.filter(s => Math.hypot((s[0][0] + s[1][0]) / 2 - F.ls[0], (s[0][1] + s[1][1]) / 2 - F.ls[1]) < 1.4 * K);
  const tr = traffic(segs, Math.round(segs.length * 1.4), { seed: 77, colors: ['#ffffff', '#ff4b3a', '#ffd166', '#2a2a2a', '#4fa0ff'] }); scene.add(tr.mesh);
  const peakTop = [F.chiliad[0], T.heightAt(...F.chiliad), F.chiliad[1]];

  // ---------- underwater ----------
  const uw = new THREE.Group(); scene.add(uw); uw.visible = false;
  const UWC = new THREE.Color('#0d5a6a'), uwFog = new THREE.Fog('#0d5a6a', 60, 480), dive = [map.bbox[0] - 140, F.coast[1] + 120];   // dive spot off the west coast
  const sb = new THREE.PlaneGeometry(900, 900, 120, 120); sb.rotateX(-Math.PI / 2); sb.translate(dive[0], 0, dive[1]);
  { const p = sb.attributes.position, col = new Float32Array(p.count * 3), a = new THREE.Color('#c8b884'), b = new THREE.Color('#2f6a5a'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), n = fbm(x * 0.012, z * 0.012); p.setY(i, -42 + n * 18 + fbm(x * 0.05, z * 0.05) * 4); c.copy(a).lerp(b, smooth(clamp(n * 1.4 - 0.2))); col.set([c.r, c.g, c.b], i * 3); } sb.setAttribute('color', new THREE.BufferAttribute(col, 3)); sb.computeVertexNormals(); }
  uw.add(new THREE.Mesh(sb, new THREE.MeshLambertMaterial({ vertexColors: true })));
  const sbH = (x, z) => -42 + fbm(x * 0.012, z * 0.012) * 18 + fbm(x * 0.05, z * 0.05) * 4;
  const wreck = new THREE.Group(); wreck.position.set(dive[0] + 60, sbH(dive[0] + 60, dive[1] - 80) + 2, dive[1] - 80); wreck.rotation.set(0.15, 0.6, 0.35); uw.add(wreck);
  const rust = new THREE.MeshLambertMaterial({ color: '#7a4a32' });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(60, 10, 14), rust); wreck.add(hull);
  const bridgeB = new THREE.Mesh(new THREE.BoxGeometry(12, 9, 10), rust); bridgeB.position.set(-14, 9, 0); wreck.add(bridgeB);
  const mastB = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 18), rust); mastB.position.set(10, 12, 0); mastB.rotation.z = 0.4; wreck.add(mastB);
  const rockM = new THREE.MeshLambertMaterial({ color: '#3a4a48', flatShading: true });
  for (let i = 0; i < 5; i++) { const a = new THREE.Mesh(new THREE.TorusGeometry(14 + i * 2, 5, 6, 10, Math.PI), rockM); a.position.set(dive[0] - 70 + i * 8, sbH(dive[0] - 70, dive[1] + 40) - 2, dive[1] + 40 + i * 9); a.rotation.y = 0.5; uw.add(a); }
  for (let i = 0; i < 40; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(2 + R() * 5), rockM); const x = dive[0] + (R() - 0.5) * 500, z = dive[1] + (R() - 0.5) * 500; r.position.set(x, sbH(x, z), z); uw.add(r); }
  const kelp = []; for (let i = 0; i < 70; i++) { const x = dive[0] + (R() - 0.5) * 420, z = dive[1] + (R() - 0.5) * 420, h = 10 + R() * 16; const k = new THREE.Mesh(new THREE.ConeGeometry(0.8, h, 4), new THREE.MeshLambertMaterial({ color: '#3a7a3a' })); k.position.set(x, sbH(x, z) + h / 2, z); k.userData.ph = R() * 6; uw.add(k); kelp.push(k); }
  const shark = new THREE.Group(); uw.add(shark);
  { const sm = new THREE.MeshLambertMaterial({ color: '#4a5a64' }); const body = new THREE.Mesh(new THREE.ConeGeometry(2.6, 16, 8), sm); body.rotation.z = -Math.PI / 2; shark.add(body);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4, 3), sm); fin.position.set(1, 2.6, 0); shark.add(fin); const tail = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5, 3), sm); tail.position.set(-8.5, 0, 0); tail.rotation.z = Math.PI / 2; shark.add(tail); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: '#7fd8e8', transparent: true, opacity: 0.55, side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.set(dive[0], -0.4, dive[1]); uw.add(ceil);
  const rays = []; for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(8, 60), new THREE.MeshBasicMaterial({ color: '#bff6ff', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); r.position.set(dive[0] + (R() - 0.5) * 200, -28, dive[1] + (R() - 0.5) * 200); r.rotation.set(0, R() * 3, 0.25); uw.add(r); rays.push(r); }
  const bubbles = Array.from({ length: 40 }, () => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), new THREE.MeshBasicMaterial({ color: '#dffcff', transparent: true, opacity: 0.6 })); const a = R() * 6.283, rr = 25 + R() * 60; b.userData = { x: Math.cos(a) * rr, z: Math.sin(a) * rr, s: 4 + R() * 6, o: R() * 10 }; uw.add(b); return b; });

  // ---------- real LA overlay & satellites ----------
  const Wd = await loadWorld();
  const world = buildWorld(scene, Wd, { hiIds: ['California', 'Nevada', 'Arizona'], land: '#3a3a2a', foreign: '#2a2a22', lights: '#ffd08a', oceanA: '#0a2a40', oceanB: '#0e3a58', border: '#7a7a5a', coast: '#4fd1ff' });
  world.group.position.set(F.ls[0] - Wd.anchors.la[0], -3, F.ls[1] - Wd.anchors.la[1]);
  const la = Wd.layers.city.la.flatMap(c => c.p).map(f => { const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; });
  const laC = centroid(la.flat()), laG = new THREE.Group(); scene.add(laG);
  const laFill = la.map(pp => { const m = flatPoly(pp.map(([x, z]) => [x - laC[0], z - laC[1]]), '#ff5a5a', 0, 0); m.material.depthTest = false; m.renderOrder = 5; laG.add(m); return m; });
  const laLines = la.map(pp => { const l = fatLine(pp.map(([x, z]) => [x - laC[0], 0, z - laC[1]]), '#ff8a8a', 1.2, { opacity: 0, closed: true }); laG.add(l); return l; });
  laG.position.set(F.ls[0], 60, F.ls[1] - 600);
  const sat = (seed, pts, land, coastC, at) => { const d = normalise({ seed, islands: [{ id: 's', name: '', base: 1.5, zones: [{ c: [0, 0], r: 0.6, h: 4 }], palette: ['#d8d0c0', '#c0b8a8'], pts }] }, 2.2);
    const g = new THREE.Group(); const m = buildMap(g, d, { land, coast: coastC, coastW: 2.5, noLights: true, carsPer: 0, pitch: 0.12, street: 0.03, mat: { night: 0.1, fogNear: 1e6, fogFar: 1e7, light: [0.5, 0.75, 0.35] }, tree: '#2f5a2a', streetTrees: 0.5 });
    g.position.set(at[0] - m.center[0], 0, at[1] - m.center[1]); scene.add(g); return { g, m, at }; };
  const yank = sat(31, [[-1, -0.7], [0.4, -0.9], [1.2, -0.3], [1.0, 0.7], [-0.2, 0.9], [-1.1, 0.4]], '#e8eef4', '#bfe4ff', [map.bbox[0] - ext * 0.55, map.bbox[1] + ext * 0.1]);
  const cayo = sat(41, [[-1.1, -0.4], [-0.3, -1.0], [0.8, -0.8], [1.2, 0.2], [0.5, 1.0], [-0.6, 0.8]], '#3f8a3a', '#3fffd0', [map.bbox[2] + ext * 0.55, map.bbox[3] - ext * 0.15]);
  const snow = Array.from({ length: 60 }, (_, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(1.4, 4, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); s.userData = { x: (R() - 0.5) * 260, z: (R() - 0.5) * 260, o: R() * 40 }; scene.add(s); return s; });

  // ---------- HUD ----------
  const chap = chapterCard(ui, { num: '08', game: 'Grand Theft Auto V · 2013', title: 'THE BIG<br>ONE', acc: '#4fd1ff' });
  const km = kmCounter(ui), cap = caption(ui), rad = radar(ui, 'gps');
  const reg = [['LOS SANTOS', F.ls, '#ffb347'], ['BLAINE COUNTY', F.north, '#a8d070']].map(([txt, p, c]) => ({ p, set: label(ui, `<span style="color:${c};font-size:64px">${txt}</span>`, 'mlbl', true) }));
  const feat = [['MOUNT CHILIAD', 'chiliad', 'L3p1', 'chiliad'], ['ALAMO SEA', 'alamo', 'L3p2', 'salty'], ['DESERT', 'desert', 'L3p2', 'desert'], ['MILITARY BASE', 'base', 'L3p2', 'military'], ['MANSIONS', 'coast', 'L3p3', 'very expensive']]
    .map(([txt, k, cue, word]) => ({ k, t0: w(cue, word), set: label(ui, `<span style="background:rgba(10,20,30,.7);padding:4px 14px">${txt}</span>`, 'mlbl', true) }));
  const bubblesH = ['HEY!', '!!', 'MY POOL!'].map(txt => el(ui, 'ctr', `<div style="background:#fff;color:#111;font:400 30px Bebas;padding:4px 14px;border-radius:14px;box-shadow:0 6px 16px rgba(0,0,0,.4)">${txt}</div>`));
  const down = el(ui, 'ctr', '<div style="font:400 200px/1 Bebas;letter-spacing:.06em;text-shadow:0 10px 40px rgba(0,0,0,.6)">↓ DOWN</div>', { left: W / 2 + 'px', top: H / 2 + 'px' });
  const depth = el(ui, '', '<div style="font:700 18px Oswald;letter-spacing:.35em;color:#7fd8e8">NEW DIMENSION</div><div class="d" style="font:400 90px/1 Bebas">↓ DEPTH</div>', { right: '110px', top: '330px', textAlign: 'right' });
  const dv = depth.querySelector('.d');
  const uwl = [['WRECKS', () => wreck.position], ['CAVES', () => new THREE.Vector3(dive[0] - 60, sbH(dive[0] - 60, dive[1] + 50) + 12, dive[1] + 50)], ['DON\'T.', () => shark.position]].map(([txt, f]) => ({ f, set: label(ui, `<span style="background:rgba(4,30,40,.7);padding:4px 14px">${txt}</span>`, 'mlbl', true) }));
  const nine = el(ui, '', `<div style="font:700 20px Oswald;letter-spacing:.3em;opacity:.85;margin-bottom:12px">MORE THAN 9 × GTA III</div><div class="g" style="display:grid;grid-template-columns:repeat(5,64px);gap:10px"></div>`, { left: '90px', bottom: '140px', padding: '22px 26px', background: 'rgba(8,16,24,.78)', borderRadius: '10px' });
  const tiles = Array.from({ length: 10 }, (_, i) => { const d = document.createElement('div'); d.style.cssText = `height:44px;background:${i < 9 ? '#ff9a3c' : 'linear-gradient(90deg,#ff9a3c 33%,transparent 33%)'};border:2px solid #ff9a3c;border-radius:4px;opacity:0`; nine.querySelector('.g').appendChild(d); return d; });
  const x17 = el(ui, 'ctr', '<div style="font:700 22px Oswald;letter-spacing:.35em;color:#ff8a8a">CITY OF LOS ANGELES · SAME SCALE</div><div style="font:400 150px/1 Bebas;color:#ff8a8a">≈ 17 ×</div>', { left: W / 2 + 'px', top: '170px', textAlign: 'center' });
  const hl = el(ui, 'ctr', '<div style="font:400 84px/1 Bebas;text-shadow:0 6px 30px rgba(0,0,0,.6)">NOT CITIES. <span style="color:#4fd1ff">HIGHLIGHTS.</span></div>', { left: W / 2 + 'px', top: H - 230 + 'px' });
  const yl = label(ui, '<span style="color:#bfe4ff">NORTH YANKTON</span> <span style="font-size:.7em;opacity:.7">· PROLOGUE · 2013</span>', 'mlbl', true);
  const cl = label(ui, '<span style="color:#3fffd0">CAYO PERICO</span> <span style="font-size:.7em;opacity:.7">· GTA ONLINE · 15 DEC 2020</span>', 'mlbl', true);
  const bars = el(ui, '', ['GTA III|#ff9a3c|8.12', 'VICE CITY|#ff3fa4|9.11', 'GTA IV|#9fb4c8|16.14', 'SAN ANDREAS|#ffc24a|38.2', 'GTA V|#4fd1ff|75.84'].map((s, i) => { const [n, c, v] = s.split('|'); return `<div style="display:flex;align-items:center;gap:14px;margin-bottom:8px"><div style="width:170px;font:400 30px Bebas;color:${c}">${n}</div><div class="b${i}" style="height:26px;background:${c}"></div><div style="font:700 20px Mono">${v}</div></div>`; }).join('') +
    '<div class="vi" style="display:flex;align-items:center;gap:14px;margin-top:6px"><div style="width:170px;font:400 30px Bebas;color:#7d8699">GTA VI</div><div style="font:400 36px Bebas;color:#7d8699">???</div></div>',
    { left: '90px', top: '330px', padding: '22px 28px', background: 'rgba(8,16,24,.82)', borderRadius: '10px' });
  const bb = [0, 1, 2, 3, 4].map(i => bars.querySelector('.b' + i)), viRow = bars.querySelector('.vi');

  const logT = (keys, t) => Math.exp(track(keys.map(([a, b, e]) => [a, Math.log(b), e]), t));
  const tUnder = C.L4p2 + 0.1, tUp = C.L6 - 0.3;
  const orbit = (tx, tz, yaw, pitch, dist) => [tx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist];

  function update(t) {
    let pos, look; camera.up.set(0, 1, 0);
    const under = t >= tUnder && t < tUp;
    if (t < C.L2 + 0.4) {                                 // dive from real SoCal
      const h = logT([[0, 60000], [C.L1p2, 20000], [C.L2 + 0.4, ext * 2.0]], t);
      camera.up.set(0, 0, -1); pos = [F.ls[0], h, F.ls[1] - 300 + 0.01]; look = [F.ls[0], 0, F.ls[1] - 300];
    } else if (t < C.L3) {                                 // overview, regions
      const u = eio(inv(C.L2 + 0.4, C.L3, t)); pos = orbit(cx, cz, lerp(0, 0.35, u), lerp(89, 50, u) * Math.PI / 180, ext * lerp(2.0, 1.35, u)); look = [cx, 0, cz];
    } else if (t < C.L4) {                                 // tour
      const K0 = [[C.L3, orbit(cx, cz, 0.35, 0.87, ext * 1.35), [cx, 0, cz]],
        [w('L3p1', 'chiliad') + 0.3, [peakTop[0] + 260, peakTop[1] + 120, peakTop[2] + 220], peakTop],
        [w('L3p2', 'salty') + 0.4, [F.alamo[0] + 120, 160, F.alamo[1] + 320], [F.alamo[0], 0, F.alamo[1]]],
        [w('L3p2', 'desert') + 0.3, [F.desert[0] - 60, 150, F.desert[1] + 300], [F.desert[0], 0, F.desert[1]]],
        [w('L3p2', 'military') + 0.3, [F.base[0] + 180, 140, F.base[1] + 220], [F.base[0], 0, F.base[1]]],
        [C.L3p3 + 0.6, [F.coast[0] + 220, 150, F.coast[1] + 160], [F.coast[0], 20, F.coast[1]]],
        [C.L4, [F.coast[0] - 40, 110, F.coast[1] + 230], [F.coast[0] - 60, 0, F.coast[1] + 80]]];
      let i = 0; while (i < K0.length - 2 && t >= K0[i + 1][0]) i++;
      const u = eio(inv(K0[i][0], K0[i + 1][0], t)); pos = [0, 1, 2].map(j => lerp(K0[i][1][j], K0[i + 1][1][j], u)); look = [0, 1, 2].map(j => lerp(K0[i][2][j], K0[i + 1][2][j], u));
    } else if (t < tUp) {                                  // plunge + swim
      const plunge = eio(inv(C.L4p2 - 0.2, tUnder + 0.6, t));
      const sw = inv(tUnder + 0.6, tUp, t);
      const path = [[dive[0] - 30, -12, dive[1] + 160], [dive[0] + 30, -22, dive[1] + 20], [dive[0] + 110, -26, dive[1] - 40], [dive[0] - 10, -24, dive[1] + 70], [dive[0] - 90, -22, dive[1] + 10]];
      const k = Math.min(path.length - 1.001, sw * (path.length - 1)), i0 = Math.floor(k), f = eio(k - i0);
      const swim = [0, 1, 2].map(j => lerp(path[i0][j], path[i0 + 1][j], f));
      const above = [F.coast[0] - 40, 110, F.coast[1] + 230];
      pos = t < tUnder + 0.6 ? [0, 1, 2].map(j => lerp(above[j], path[0][j], plunge)) : swim;
      const tgt = t < w('L5p1', 'caves') ? wreck.position.toArray() : t < C.L5p2 ? [dive[0] - 60, -30, dive[1] + 50] : shark.position.toArray();
      look = t < tUnder ? [0, 1, 2].map(j => lerp([F.coast[0] - 60, 0, F.coast[1] + 80][j], [dive[0], -40, dive[1]][j], eio(inv(C.L4p2 - 0.4, tUnder, t)))) : tgt;
    } else {                                               // back up: total, LA overlay, satellites, finale
      const hh = track([[tUp, 300], [C.L6 + 1.2, ext * 1.6], [C.L7, ext * 1.7], [C.L7p1e, 9000], [C.L7p3 + 0.4, 9000], [C.L8, ext * 2.6], [C.L9, ext * 2.6], [D, ext * 3.0]], t);
      const tx = track([[tUp, dive[0]], [C.L6 + 1.2, cx], [C.L7, cx], [C.L7p1e, F.ls[0]], [C.L7p3 + 0.4, F.ls[0]], [C.L8, cx], [D, cx]], t), tz = track([[tUp, dive[1]], [C.L6 + 1.2, cz], [C.L7, cz], [C.L7p1e, F.ls[1] - 600], [C.L7p3 + 0.4, F.ls[1] - 600], [C.L8, cz], [D, cz]], t);
      const lean = t < C.L6 + 1.2 ? 0.6 : track([[C.L6 + 1.2, 0.5], [C.L7, 0.4], [C.L7p1e, 0.0], [C.L7p3 + 0.4, 0.0], [C.L8, 0.35], [D, 0.3]], t);
      camera.up.set(0, 0, -1); pos = [tx, hh, tz + hh * Math.tan(lean) + 0.01]; look = [tx, 0, tz];
    }
    camera.position.set(...pos); camera.lookAt(...look);
    const ch = Math.abs(camera.position.y); camera.near = Math.max(0.3, ch * 0.004); camera.far = Math.max(20000, ch * 30); camera.updateProjectionMatrix();

    // ----- layer visibility -----
    const realOn = 1 - smooth(inv(C.L1p2 - 0.6, C.L2 + 0.2, t)); world.group.visible = realOn > 0.01;
    world.lod(Math.max(2000, ch), realOn); world.countries.material.opacity = realOn; world.lakes.material.opacity = realOn; world.lightsMat.uniforms.uOp.value = realOn; world.lightsMat.uniforms.uTime.value = t;
    world.coastGlow.forEach(l => l.material.opacity *= realOn); world.borders.forEach(b => b.material.opacity = 0.5 * realOn); world.sync();
    Object.values(world.detail).forEach(d => { d.children.forEach(m => m.material && (m.material.opacity = 0)); d.userData.lines.forEach(l => l.material.opacity = 0); });
    const top = !under; uw.visible = under;
    [T.mesh, trees, isl.group, tr.mesh, lake, baseG, mansM, pools].forEach(o => o.visible = top && realOn < 0.99); wat.visible = top && ch < 14000; skyM.visible = top && ch < 9000;
    const fogF = Math.max(6500, ch * 3); wat.material.uniforms.uFogFar.value = fogF; T.mesh.material.uniforms.uFogFar.value = fogF * 1.1; isl.city.material.uniforms.uFogFar.value = fogF; isl.city.material.uniforms.uFogNear.value = fogF * 0.2;
    yank.g.visible = cayo.g.visible = top && t > C.L8 - 0.5;
    scene.background.set(under ? UWC : '#0a1a28'); scene.fog = under ? uwFog : null;
    isl.city.update(t, { origin: F.ls, start: C.L1p2, speed: 300, dur: 1.0 }); tr.update(t, 1);
    fenceL.material.opacity = win(t, w('L3p2', 'military'), C.L3p3, .3, .3);
    fire.visible = !under; fire.material.opacity = win(t, w('L3p3', 'bad'), C.L4, .2, .3) * (0.7 + 0.3 * Math.sin(t * 20)); fire.scale.setScalar(20 + 4 * Math.sin(t * 13));
    // underwater animation
    shark.position.set(dive[0] - 40 + Math.cos(t * 0.5) * 70, -22 + Math.sin(t * 0.9) * 3, dive[1] + 20 + Math.sin(t * 0.5) * 70); shark.rotation.y = -t * 0.5 - Math.PI / 2; shark.children[2].rotation.y = Math.sin(t * 6) * 0.4;
    kelp.forEach(k => k.rotation.z = Math.sin(t * 1.2 + k.userData.ph) * 0.12);
    rays.forEach((r, i) => r.material.opacity = 0.08 + 0.06 * Math.sin(t * 0.8 + i));
    bubbles.forEach(b => { const u = ((t + b.userData.o) * 0.25) % 1; b.position.set(camera.position.x + b.userData.x, lerp(-40, 0, u), camera.position.z + b.userData.z); });
    // LA overlay
    const lo = win(t, C.L7 + 0.6, C.L7p3 + 0.6, .5, .5); laFill.forEach(m => { m.material.opacity = 0.18 * lo; m.material.transparent = true; m.visible = lo > 0.01; }); laLines.forEach(l => l.material.opacity = 0.9 * lo);
    snow.forEach(s => { const u = ((t + s.userData.o) * 0.08) % 1; s.position.set(yank.at[0] + s.userData.x, lerp(80, 2, u), yank.at[1] + s.userData.z); s.visible = yank.g.visible; });

    // ----- HUD -----
    chap(win(t, C.L2 + 0.4, D - 0.2, .5, .4), eout(inv(C.L2 + 0.4, C.L2 + 1.4, t)), eio(inv(C.L2 + 4.4, C.L2 + 5.2, t)));
    reg.forEach(({ p, set }, i) => { const [x, y] = project(p[0], 30, p[1]); set(x, y - 30, win(t, C[['L2p2', 'L2p3'][i]] - 0.1, C.L3, .25, .3)); });
    feat.forEach(({ k, t0, set }, i) => { const p = F[k], y3 = k === 'chiliad' ? peakTop[1] + 10 : T.heightAt(p[0], p[1]) + 20; const [x, y] = project(p[0], y3, p[1]); set(x, y - 20, win(t, t0 - 0.1, (feat[i + 1] ? feat[i + 1].t0 : C.L4) - 0.05, .15, .2)); });
    bubblesH.forEach((b, i) => { const m = mans[(i * 9 + 3) % mans.length], [x, y] = project(m[0], m[1] + 10, m[2]), t0 = w('L3p3', 'bad') + i * 0.25; b.style.left = x + 'px'; b.style.top = y - 30 + 'px'; show(b, win(t, t0, C.L4, .1, .3), `translate(-50%,-50%) scale(${eback(inv(t0, t0 + 0.3, t))})`); });
    show(down, win(t, C.L4p2 - 0.1, tUnder + 0.8, .1, .3), `translate(-50%,-50%) translateY(${eio(inv(C.L4p2, tUnder + 0.8, t)) * 300}px)`);
    show(depth, under ? win(t, tUnder + 0.4, tUp, .3, .3) : 0, null); 
    uwl.forEach(({ f, set }, i) => { const p = f(), t0 = [w('L5p1', 'wrecks'), w('L5p1', 'caves'), C.L5p2][i], t1 = [w('L5p1', 'caves'), C.L5p2, tUp][i]; const [x, y] = project(p.x, p.y + 10, p.z); set(x, y - 20, under ? win(t, t0, t1, .15, .2) : 0); });
    const kIn = inv(C.L6, C.L6 + 1.6, t); km(win(t, C.L6, D, .3, .3), 16.14 + 59.7 * eout(kIn), kIn > 0 ? 59.7 * eout(kIn) : null);
    show(nine, win(t, C.L6p2, C.L7, .3, .3), null); tiles.forEach((d, i) => d.style.opacity = inv(C.L6p2 + i * 0.12, C.L6p2 + i * 0.12 + 0.1, t));
    show(x17, win(t, w('L7p1', 'seventeen'), C.L7p3 + 0.6, .2, .3), `translate(-50%,-50%) scale(${eback(inv(w('L7p1', 'seventeen'), w('L7p1', 'seventeen') + 0.35, t))})`);
    show(hl, win(t, C.L7p3, C.L8, .2, .3), 'translate(-50%,-50%)');
    { const [x, y] = project(yank.at[0], 0, yank.at[1]); yl(x, y - 60, win(t, C.L8p2, D - 1.5, .3, .3)); }
    { const [x, y] = project(cayo.at[0], 0, cayo.at[1]); cl(x, y - 60, win(t, C.L8p3, D - 1.5, .3, .3)); }
    show(bars, win(t, C.L9, D, .3, .3), null); [8.12, 9.11, 16.14, 38.2, 75.84].forEach((v, i) => bb[i].style.width = v * 5 * eout(inv(C.L9 + 0.2 + i * 0.15, C.L9 + 0.9 + i * 0.15, t)) + 'px');
    viRow.style.opacity = smooth(inv(C.L9p2, C.L9p2 + 0.3, t)); viRow.style.transform = `scale(${eback(inv(C.L9p2, C.L9p2 + 0.4, t))})`; viRow.style.transformOrigin = 'left center';
    rad(win(t, C.L3, D, .4, .3) * (under ? 0 : 1), 0, t * 10);
    cap(captionAt(TL, 'ch08', t));

    // ----- look -----
    T.mesh.material.uniforms.uCam.value.copy(camera.position);
    bloom.strength = under ? 0.9 : 0.45; bloom.threshold = under ? 0.55 : 0.78; bloom.radius = 0.55;
    grade.uPixel.value = 0; grade.uScan.value = 0; grade.uCA.value = under ? 0.004 : 0.0015;
    if (under) { grade.uLift.value.set(0.0, 0.05, 0.07); grade.uGain.value.set(0.75, 1.05, 1.12); grade.uSat.value = 1.05; }
    else { grade.uLift.value.set(0.02, 0.015, 0.0); grade.uGain.value.set(1.06, 1.02, 0.96); grade.uSat.value = 1.12; }
    grade.uVig.value = under ? 0.8 : 0.55; grade.uGrain.value = 0.04;
    const splash = Math.exp(-Math.pow((t - tUnder) * 5, 2)) + Math.exp(-Math.pow((t - tUp) * 5, 2));
    grade.uFade.value = Math.min(inv(0, 0.4, t), 1 - inv(D - 0.5, D, t)) * (1 - 0.0 * splash) + 0.0;
    grade.uLift.value.addScalar(0.5 * splash);
    tiltP.uAmt.value = under ? 0.3 : 0.35; tiltP.uFocus.value = 0.5; tiltP.uBand.value = 0.22;
  }
  return { duration: D, stills: [2, 8, 13, 17, 21.5, 23, 24.5, 27.5, 31, 34, 39, 42, 50, 54, 60, 66, 72], update };
}
