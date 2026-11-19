// Chapter 05 · Vice City (2002) - neon 1986. Timed to VO cues.
// Real Miami + Miami Beach outlines → morph into the two islands → city rises → millionaires' islands ($)
// → art-deco hotels on Ocean Drive (low glide) → bridges closed, Hurricane Hermione → Excuse #2 "weather"
// → no trains/no subway → boats & loud cars → 9.11 km² vs 8.12.
import * as THREE from 'three';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { VC } from '../world/maps.js';
import { KM, water, glow, fatLine, palms, edgePoints, centroid, bbox, area } from '../world/geo.js';
import { sky, buildMap, bridge } from '../world/env.js';
import { blocks, buildingMaterial } from '../world/city.js';
import { loadWorld, buildWorld } from '../world/world.js';
import { resample, align } from '../world/morph.js';
import { track, win, inv, eout, eio, smooth, clamp, lerp, eback, rng } from '../core/util.js';
import { chapterCard, kmCounter, label, caption, stamp, excuseBoard, radar, el, show } from '../core/hud.js';
import { cues, captionAt, wordAt } from '../core/tl.js';

const hurricaneMat = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uFlash: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uTime; uniform float uAmt; uniform float uFlash; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.1; a*=0.5; } return s; }
    void main(){
      vec2 p = vUv - 0.5; float r = length(p) * 2.0, a = atan(p.y, p.x), spin = uTime * 0.35;
      float arms = 0.5 + 0.5 * sin(a * 2.0 + log(r + 0.02) * 7.0 - spin * 2.0);
      float cl = fbm(vec2(a * 2.5 + log(r + 0.05) * 4.0 - spin, r * 3.0));
      float m = smoothstep(0.92, 0.5, r) * smoothstep(0.06, 0.2, r) * (0.35 + 0.65 * arms) * smoothstep(0.25, 0.75, cl);
      vec3 col = mix(vec3(0.55, 0.5, 0.75), vec3(0.95, 0.92, 1.0), cl) + vec3(0.6, 0.7, 1.0) * uFlash * smoothstep(0.4, 0.9, cl);
      gl_FragColor = vec4(col, m * uAmt * 0.85);
    }`
});
const ICON = (svg, txt) => `<div style="text-align:center"><svg width="110" height="110" viewBox="0 0 40 40">${svg}<path d="M6 6L34 34M34 6L6 34" stroke="#ff2a3a" stroke-width="4"/></svg><div style="font:400 34px Bebas;letter-spacing:.12em">${txt}</div></div>`;
const TRAIN = `<rect x="10" y="6" width="20" height="22" rx="4" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="13" y="10" width="14" height="7" fill="#fff"/><circle cx="15" cy="23" r="2" fill="#fff"/><circle cx="25" cy="23" r="2" fill="#fff"/><path d="M12 34l4-6M28 34l-4-6" stroke="#fff" stroke-width="2.5"/>`;
const SUBWAY = `<circle cx="20" cy="20" r="15" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M13 27V13l7 9 7-9v14" fill="none" stroke="#fff" stroke-width="3"/>`;

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, project, TL, W, H } = ctx; const tiltP = ctx.tilt;
  const C = cues(TL, 'ch05'), D = C.dur, w = (cue, word) => wordAt(TL, 'ch05', cue, word);
  const def = VC();
  scene.add(sky('#0d0622', '#6a1f62', '#0b0620'));
  const wat = water({ deep: '#08051a', shallow: '#1a0d36', glint: '#ff3fa4', glint2: '#2ff3ff', streaks: 0.45, spark: 1.0, fog: '#3a1240', fogFar: 4200 });
  scene.add(wat);
  const map = buildMap(scene, def, {
    land: '#1b1626', coast: '#ff3fa4', coastW: 2.4, park: '#1f4a3a', airport: '#2a2533', side: '#05030b',
    mat: { win: '#ff6fc1', win2: '#5ff7ff', night: 0.9, dim: 0.42, fog: '#3a1240', fogNear: 700, fogFar: 3800, floor: 0.55, trim: 1, trimC: '#ff3fa4', light: [0.6, 0.7, -0.2], glass: '#1a1030', skyTop: '#2a1050', skyLow: '#ff4f9a' }, shadow: 0.35, tree: '#1f4a3a',
    cars: ['#ffffff', '#ff3fa4', '#2ff3ff', '#ffe066'], carsPer: 1.8, pitch: 0.12, street: 0.03, hScale: 1.35
  });
  const [cx, cz] = map.center, ext = Math.max(map.bbox[2] - map.bbox[0], map.bbox[3] - map.bbox[1]);
  wat.material.uniforms.uCenter.value.set(cx, cz); wat.material.uniforms.uRadius.value = ext * 0.8;
  map.islands.mainland.coastLine.material.color.set('#2ff3ff');
  const beach = map.islands.beach.isl, bc = centroid(beach.poly);

  // beach strip, palms, Ocean Drive neon
  const eastPts = (step, inset) => edgePoints(beach.poly, step, inset, p => p[0] > bc[0] + 6);
  const sand = fatLine(eastPts(6, 3).map(p => [p[0], 0.3, p[1]]), '#d9b48a', 9, { opacity: 0.55 }); scene.add(sand);
  const palmM = palms(eastPts(7, 6), { color: '#0f2b22', scale: 1.4 }); scene.add(palmM);
  // art-deco hotels: pastel base + stepped tier + neon fin
  const R = rng(86), hp = [], pastel = ['#ffc4dd', '#b8f0ea', '#fff0b8', '#e2c8ff', '#ffd6b0', '#ffffff'];
  eastPts(10, 15).forEach(([x, z], i) => {
    const c = pastel[i % pastel.length], h = 4 + R() * 4, ww = 6 + R() * 2, seed = R();
    hp.push({ x, z, w: ww, d: 6, y0: 0, h, c, type: 0, H: h, seed });
    hp.push({ x, z, w: ww * 0.6, d: 4.4, y0: h, h: 1.4, c, type: 0, H: h + 1.4, seed });
    hp.push({ x: x + 0.5, z, w: 0.8, d: 0.8, y0: h + 1.4, h: 2.4 + R() * 1.5, c: i % 2 ? '#ff3fa4' : '#2ff3ff', type: 2, H: h + 4, seed });
  });
  const hotels = blocks(hp, buildingMaterial({ win: '#ff6fc1', win2: '#5ff7ff', night: 0.9, dim: 0.75, trim: 1.5, trimC: '#ff3fa4', floor: 0.55, light: [0.6, 0.7, -0.2], fog: '#3a1240', fogNear: 700, fogFar: 3800 }));
  scene.add(hotels.mesh);
  const fins = hp.filter(p => p.type === 2).map(p => { const g = glow(p.c, 7); g.position.set(p.x, p.y0 + p.h, p.z); scene.add(g); return g; });
  const ocean = map.islands.beach.segs.filter(s => Math.abs(s[0][0] - s[1][0]) < 3).sort((a, b) => b[0][0] - a[0][0]).slice(0, 2);
  ocean.forEach((s, i) => scene.add(fatLine([[s[0][0], 0.5, s[0][1]], [s[1][0], 0.5, s[1][1]]], i ? '#2ff3ff' : '#ff3fa4', 3.5)));

  // bridges + red closure lights
  const brs = def.bridges.map(b => { const x = bridge(b.a, b.b, { color: '#4a4258', light: '#ff9ad8' }); scene.add(x.group); return x; });
  const stops = brs.map(b => { const s = glow('#ff2a3a', 26); s.position.set(b.mid[0], 4, b.mid[1]); scene.add(s); return s; });

  // hurricane east of the beach
  const hm = hurricaneMat(), hur = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), hm); hur.rotation.x = -Math.PI / 2;
  const hx = map.bbox[2] + ext * 0.42, hz = cz - ext * 0.32; hur.position.set(hx, 60, hz); hur.scale.setScalar(ext * 1.05); scene.add(hur);

  // boats: white hulls with wakes on loops in the bay
  const boats = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 2), new THREE.MeshBasicMaterial({ color: '#ffffff' })); scene.add(m);
    const wake = fatLine([[0, 0.3, 0], [1, 0.3, 0]], '#bfefff', 2, { opacity: 0.7 }); scene.add(wake); return { m, wake, i, r: 40 + (i % 3) * 25, ph: i * 0.9 }; });
  const bayC = [(map.islands.mainland.city.center[0] + map.islands.beach.city.center[0]) / 2, cz];

  // real Florida (world layer) placed so that downtown Miami sits on the Vice City bay; camera dives in from orbit
  const Wd = await loadWorld();
  const world = buildWorld(scene, Wd, { land: '#2a2238', foreign: '#1e1a2a', lights: '#ff9ad8', oceanA: '#08051a', oceanB: '#120a2a', border: '#5a4a78', coast: '#2ff3ff', city: '#3a2e50', cityLine: '#ff7ac8' });
  const MA = Wd.anchors.miami, bay = [(map.islands.mainland.city.center[0] + map.islands.beach.city.center[0]) / 2, cz];
  world.group.position.set(bay[0] - MA[0], -2, bay[1] - MA[1]);
  const pinMiami = glow('#2ff3ff', 1); pinMiami.position.set(bay[0], 20, bay[1]); scene.add(pinMiami);
  const mainLbl = label(ui, 'MIAMI', 'mlbl', true);
  const logT = (keys, t) => Math.exp(track(keys.map(([a, b, e]) => [a, Math.log(b), e]), t));

  // ---------- HUD ----------
  const chap = chapterCard(ui, { num: '05', game: 'Grand Theft Auto: Vice City · 2002', title: 'NEON &amp;<br>HURRICANES', acc: '#ff3fa4' });
  const km = kmCounter(ui), rad = radar(ui, 'round', '#ff3fa4'), cap = caption(ui);
  const board = excuseBoard(ui, [['Bridge blown up', '2001'], ['Hurricane', '1986'], ['?', '…'], ['?', '…']]);
  const st = stamp(ui, 'EXCUSE #2', 1640, 600, { rot: -7 });
  const vcTitle = el(ui, 'neon p ctr', 'VICE CITY', { left: W / 2 + 'px', top: H / 2 + 'px', fontSize: '150px' });
  const year = el(ui, 'ctr', '<span style="font:400 64px Bebas;letter-spacing:.2em;color:#2ff3ff;text-shadow:0 0 20px #2ff3ff">MIAMI · 1986</span>', { left: W / 2 + 'px', top: H / 2 - 150 + 'px' });
  const neon = [['OCEAN BEACH', 'neon p', [1.75, 2.2]], ['VICE POINT', 'neon c', [1.55, -1.9]], ['LITTLE HAVANA', 'neon p', [-1.6, 0.4]], ['DOWNTOWN', 'neon c', [-2.1, -1.9]]]
    .map(([txt, cls, at]) => ({ at: [at[0] * def.k * KM, at[1] * def.k * KM], set: label(ui, txt, cls) }));
  const money = ['starfish', 'prawn', 'leaf'].map(id => ({ id, set: label(ui, '<span style="font:400 64px Bebas;color:#7dffb0;text-shadow:0 0 18px #2bff8a">$$$</span>', 'mlbl') }));
  const deco = el(ui, '', '<div style="font:700 20px Oswald;letter-spacing:.35em;color:#2ff3ff">OCEAN DRIVE</div><div class="neon p" style="font-size:64px;margin-top:6px">ART DECO</div>', { right: '110px', bottom: '170px', textAlign: 'right' });
  const start = label(ui, '<span style="background:#ff3fa4;color:#140a24;padding:4px 16px;font:400 40px Bebas;letter-spacing:.12em;text-shadow:none">START HERE</span>', 'mlbl', true);
  const hurLbl = label(ui, 'HURRICANE HERMIONE', 'mlbl');
  const why = el(ui, 'ctr', '<span style="font:400 220px Bebas;color:#fff;text-shadow:0 0 40px #ff3fa4">?</span>', { left: W / 2 + 'px', top: H / 2 + 'px' });
  const noTrain = el(ui, 'ctr', ICON(TRAIN, 'NO TRAINS'), { left: W / 2 - 160 + 'px', top: H / 2 + 'px' });
  const noSub = el(ui, 'ctr', ICON(SUBWAY, 'NO SUBWAY'), { left: W / 2 + 160 + 'px', top: H / 2 + 'px' });
  const notes = Array.from({ length: 10 }, () => el(ui, 'ctr', '<span style="font:400 40px Inter;color:#ffe066;text-shadow:0 0 12px #ff3fa4">♪</span>'));
  const bars = el(ui, '', `<div style="font:700 18px Oswald;letter-spacing:.3em;opacity:.8;margin-bottom:12px">TOTAL AREA · FAN-MEASURED</div>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px"><div style="width:150px;font:400 32px Bebas;color:#ff9a3c">GTA III</div><div class="b1" style="height:30px;background:#ff9a3c"></div><div style="font:700 22px Mono">8.12</div></div>
    <div style="display:flex;align-items:center;gap:14px"><div style="width:150px;font:400 32px Bebas;color:#ff3fa4">VICE CITY</div><div class="b2" style="height:30px;background:#ff3fa4"></div><div style="font:700 22px Mono">9.11</div></div>`,
    { left: '90px', bottom: '150px', padding: '22px 28px', background: 'rgba(10,6,24,.75)', borderRadius: '10px' });
  const b1 = bars.querySelector('.b1'), b2 = bars.querySelector('.b2');

  const tGame = C.L1p2 + 0.3, tDeco = C.L2p2;
  function update(t) {
    // ----- camera -----
    const flat = 1 - eio(inv(C.L2, C.L2 + 2.4, t)), tGame0 = C.L1p2 + 0.3;
    const pitch = (flat * 89.5 + (1 - flat) * track([[C.L2, 48], [tDeco, 42], [tDeco + 1.5, 26], [C.L3 - 0.3, 24], [C.L3 + 1.2, 44], [D, 38]], t)) * Math.PI / 180;
    const yaw = track([[0, 0], [tGame0 + 1.2, 0], [C.L2, 0.3], [tDeco, 0.18], [tDeco + 1.5, 1.35], [C.L3 - 0.3, 1.55], [C.L3 + 1.2, 0.25], [C.L5, 0.15], [D, 0.0]], t);
    const dist = track([[0, ext * 2.2], [tGame0 + 1.2, ext * 2.2], [C.L2, ext * 2.0], [tDeco, ext * 1.7], [tDeco + 1.5, ext * 0.4], [C.L3 - 0.3, ext * 0.38], [C.L3 + 1.2, ext * 1.75], [C.L6p2, ext * 1.8], [D, ext * 3.2]], t);
    const hotelZ = track([[tDeco, -0.3], [C.L3, 0.45]], t) * ext;
    const tx = track([[0, cx], [tDeco, cx], [tDeco + 1.5, map.bbox[2] - 45], [C.L3 - 0.3, map.bbox[2] - 45], [C.L3 + 1.2, cx + ext * 0.12], [C.L4, cx + ext * 0.2], [C.L5, cx + ext * 0.05], [D, cx]], t);
    const tz = track([[0, cz], [tDeco, cz], [tDeco + 1.5, cz + hotelZ], [C.L3 - 0.3, cz + hotelZ], [C.L3 + 1.2, cz], [D, cz]], t);
    const dive = logT([[0, 90000], [C.L1p2 - 0.2, 9000], [tGame + 1.2, ext * 2.2]], t);
    camera.near = Math.max(1, dive * 0.01); camera.far = Math.max(30000, dive * 40); camera.updateProjectionMatrix();
    if (t < tGame + 1.2) { camera.up.set(0, 0, -1); camera.position.set(bay[0], dive, bay[1] + 0.01); camera.lookAt(bay[0], 0, bay[1]); }
    else { camera.up.set(0, 1, 0); camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist); camera.lookAt(tx, 0, tz); }

    const game = smooth(inv(tGame, tGame + 1.4, t));
    map.all.forEach(rec => { rec.city.update(t, { origin: [cx, cz], start: C.L2 + 0.4, speed: 260, dur: 1.0 }); rec.traffic.update(t, smooth(inv(C.L2, C.L2 + 1.5, t))); rec.group.visible = game > 0.01; rec.coastLine.material.opacity = 0.9 * game; });
    hotels.update(smooth(inv(C.L2 + 1.0, C.L2 + 2.5, t))); hotels.mesh.visible = palmM.visible = sand.visible = t > C.L2 + 1.0; brs.forEach(b => b.group.visible = game > 0.5); fins.forEach(f => f.material.opacity = smooth(inv(C.L2 + 2.0, C.L2 + 2.8, t)) * (0.7 + 0.3 * Math.sin(t * 5 + f.position.z)));

    { const o = 1 - smooth(inv(tGame - 0.4, tGame + 0.8, t)); world.group.visible = o > 0.01; world.lod(Math.max(1000, camera.position.y), o);
      world.countries.material.opacity = o; world.lakes.material.opacity = o; world.lightsMat.uniforms.uOp.value = o; world.lightsMat.uniforms.uTime.value = t;
      world.coastGlow.forEach(l => l.material.opacity *= o); world.borders.forEach(b => b.material.opacity = 0.4 * o); world.sync();
      Object.values(world.detail).forEach(d => { d.children.forEach(m => m.material && (m.material.opacity = 0)); d.userData.lines.forEach(l => l.material.opacity = 0); });
      const ps = camera.position.y * 0.03; pinMiami.scale.set(ps, ps, 1); pinMiami.material.opacity = o * smooth(inv(0.5, 1, t));
      const [x, y] = project(bay[0], 0, bay[1]); mainLbl(x, y - 60, win(t, 0.8, tGame - 0.3, .3, .3)); }
    wat.visible = t > tGame - 0.6;
    show(year, win(t, 0.6, C.L1p2 + 0.3, .3, .3), 'translate(-50%,-50%)');
    show(vcTitle, win(t, C.L1p2 + 0.5, C.L2 + 0.4, .25, .4), `translate(-50%,-50%) scale(${lerp(1.2, 1, eout(inv(C.L1p2 + 0.5, C.L1p2 + 1, t)))})`);
    vcTitle.style.opacity = parseFloat(vcTitle.style.opacity || 0) * (Math.sin(t * 31) > -0.85 ? 1 : 0.4);

    // storm, closures, boats
    const storm = smooth(inv(C.L3p2, C.L3p3 + 0.6, t)) * (1 - 0.6 * smooth(inv(C.L5, C.L5 + 1, t)));
    hm.uniforms.uAmt.value = storm; hm.uniforms.uTime.value = t; hm.uniforms.uFlash.value = storm > 0.5 && Math.max(0, Math.sin(t * 9) * Math.sin(t * 2.3)) > 0.85 ? 1 : 0;
    stops.forEach((s, i) => { s.material.opacity = smooth(inv(C.L3 + 2.0 + i * 0.12, C.L3 + 2.4 + i * 0.12, t)) * (0.75 + 0.25 * Math.sin(t * 6 + i)); s.scale.setScalar(26 + 6 * Math.sin(t * 6 + i)); });
    boats.forEach(b => { const on = smooth(inv(w('L5p2', 'boats') - 0.3, w('L5p2', 'boats') + 0.3, t)), a = t * 0.35 + b.ph;
      const x = bayC[0] + Math.cos(a) * b.r * 0.6, z = bayC[1] + Math.sin(a) * b.r * 2.2; b.m.position.set(x, 0.5, z); b.m.rotation.y = -Math.atan2(Math.cos(a) * 2.2, -Math.sin(a) * 0.6); b.m.visible = on > 0.01;
      const arr = []; for (let k = 0; k < 10; k++) { const aa = a - k * 0.03; arr.push(bayC[0] + Math.cos(aa) * b.r * 0.6, 0.3, bayC[1] + Math.sin(aa) * b.r * 2.2); }
      b.wake.geometry.dispose(); const g = new LineGeometry(); g.setPositions(arr); b.wake.geometry = g; b.wake.material.opacity = 0.7 * on; });

    // labels & HUD
    neon.forEach(({ at, set }, i) => { const [x, y] = project(at[0], 8, at[1]); set(x, y, win(t, C.L2 + 2.2 + i * 0.2, tDeco, .3, .3) + win(t, C.L5, C.L6, .3, .3), 0.9); });
    money.forEach(({ id, set }, i) => { const c = map.islands[id].city.center, [x, y] = project(c[0], 10, c[1]); set(x, y - 30, win(t, w('L2p1', 'millionaires') + i * 0.2, tDeco, .2, .3), eback(inv(w('L2p1', 'millionaires') + i * 0.2, w('L2p1', 'millionaires') + i * 0.2 + 0.3, t))); });
    show(deco, win(t, tDeco + 1.0, C.L3 - 0.3, .3, .3), null);
    { const [x, y] = project(bc[0], 0, bc[1]); start(x, y - 120, win(t, C.L3 + 1.0, C.L3p2, .2, .3)); }
    { const [x, y] = project(hx, 60, hz); hurLbl(x - 160, y + 40, win(t, C.L3p3, C.L4, .2, .3)); }
    show(why, win(t, C.L3p2, C.L3p3, .1, .2), `translate(-50%,-50%) scale(${eback(inv(C.L3p2, C.L3p2 + 0.3, t))})`);
    chap(win(t, 0.2, D - 0.2, .5, .4) * (t > C.L2 ? 1 : 0), eout(inv(C.L2, C.L2 + 1, t)), eio(inv(C.L2 + 3.6, C.L2 + 4.4, t)));
    board(win(t, C.L4, C.L5 - 0.1, .4, .3), 4, eout(inv(C.L4, C.L4 + 0.6, t)));
    st(inv(C.L4p2, C.L4p2 + 0.35, t) * (t < C.L5 - 0.1 ? 1 : 0));
    show(noTrain, win(t, C.L5, C.L5p2, .15, .3), `translate(-50%,-50%) scale(${eback(inv(C.L5, C.L5 + 0.3, t))})`);
    show(noSub, win(t, w('L5p1', 'subway') - 0.1, C.L5p2, .15, .3), `translate(-50%,-50%) scale(${eback(inv(w('L5p1', 'subway') - 0.1, w('L5p1', 'subway') + 0.2, t))})`);
    const stereo = w('L5p2', 'stereos') - 0.6;
    notes.forEach((n, i) => { const p = ((t - stereo) * 0.8 + i / 10) % 1; show(n, win(t, stereo, C.L6, .2, .3), `translate(-50%,-50%) translate(${W * (0.2 + 0.6 * ((i * 0.37) % 1))}px, ${H * (0.75 - 0.5 * p)}px)`); n.style.left = '0'; n.style.top = '0'; n.style.opacity = parseFloat(n.style.opacity) * (1 - p); });
    const kIn = inv(C.L6, C.L6 + 1.2, t); km(win(t, C.L6, D, .3, .3), 8.12 + 0.99 * eout(kIn), kIn > 0 ? 0.99 * eout(kIn) : null);
    show(bars, win(t, C.L6 + 0.4, D, .3, .3), null); b1.style.width = 8.12 * 34 * eout(inv(C.L6 + 0.5, C.L6 + 1.3, t)) + 'px'; b2.style.width = 9.11 * 34 * eout(inv(C.L6 + 0.8, C.L6 + 1.6, t)) + 'px';
    rad(win(t, C.L2 + 2, D, .4, .3), 30 - t * 4, t * 12);
    cap(captionAt(TL, 'ch05', t));

    bloom.strength = 0.45 + 0.4 * game; bloom.threshold = 0.74; bloom.radius = 0.55;
    grade.uPixel.value = 0; grade.uScan.value = 0; grade.uCA.value = 0.0015;
    grade.uLift.value.set(0.03, 0.0, 0.04); grade.uGain.value.set(1.05, 0.97, 1.08); grade.uSat.value = 0.85 + 0.35 * game; grade.uVig.value = 0.6; grade.uGrain.value = 0.04;
    grade.uFade.value = Math.min(inv(0, 0.4, t), 1 - inv(D - 0.5, D, t));
    tiltP.uAmt.value = 0.45 * (1 - flat); tiltP.uFocus.value = 0.5; tiltP.uBand.value = 0.2;
  }
  return { duration: D, stills: [2, 5.5, 9, 11, 14.5, 18, 22.5, 25.5, 28, 31.5, 37, 41.5], update };
}
