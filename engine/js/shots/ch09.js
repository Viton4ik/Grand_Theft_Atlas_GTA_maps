// Chapter 09 · GTA VI (2026) - "The Leonida case file". Timed to VO cues.
// L1-L2 real Florida at night → Leonida lights up, six regions pinned on the real geography
// L3-L6 the case-file stage: GTA V at the same scale next to a Leonida silhouette (built from REAL Florida),
//        Rockstar's riddles, the fans' guesses spinning the counter and resizing the silhouette, our estimate*
// L7-L8 back to the real Keys: the bridge is open, the story asks you to stay → Excuse #5: no excuse.
import * as THREE from 'three';
import { V } from '../world/maps.js';
import { glow, fatLine, landMesh, flatPoly } from '../world/geo.js';
import { buildMap } from '../world/env.js';
import { loadWorld, buildWorld } from '../world/world.js';
import { leonida } from '../world/leonida.js';
import { track, win, inv, eio, eout, smooth, lerp, eback, clamp } from '../core/util.js';
import { chapterCard, caption, label, stamp, excuseBoard, el, show } from '../core/hud.js';
import { cues, captionAt, wordAt } from '../core/tl.js';

const LAND_EST = 96;          // our estimate of Leonida's LAND (×2 GTA V's 48.15) → ~150 km² total on the film's scale
const REG = [   // [label, world coords (Albers, units), colour, cue]
  ['LEONIDA KEYS', [147931, 137417], '#3fffd0', 'L2p3'],
  ['VICE CITY', [159021, 123054], '#ff3fa4', 'L2p4'],
  ['GRASSRIVERS', [151827, 122895], '#7dd96a', 'L2p5'],
  ['AMBROSIA', [150048, 113686], '#ffc24a', 'L2p6'],
  ['PORT GELLHORN', [99075, 82391], '#4fd1ff', 'L2p7'],
  ['MOUNT KALAGA', [105754, 76701], '#b8e07a', 'L2p8']
];
const HWY = [[145243, 138825], [148420, 137231], [151977, 136120], [154246, 134758], [156254, 133098], [157764, 130958], [157979, 129140], [156819, 127102]];

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, project, TL, W, H } = ctx; const tiltP = ctx.tilt;
  const C = cues(TL, 'ch09'), D = C.dur, w = (cue, word) => wordAt(TL, 'ch09', cue, word);
  scene.background = new THREE.Color('#050b12');
  scene.add(new THREE.HemisphereLight('#ffffff', '#222233', 1.1));

  // ---------- real world ----------
  const Wd = await loadWorld(), A = Wd.anchors;
  const world = buildWorld(scene, Wd, { land: '#26323d', foreign: '#1a2028', city: '#344555', lights: '#ffc46b', oceanA: '#04101c', oceanB: '#082038', border: '#45576a', coast: '#5fb8ff' });
  const fl = world.stateMesh('Florida');
  const flMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uOp: { value: 0 }, uTime: { value: 0 }, uS: { value: new THREE.Vector2(...A.miami) } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uOp; uniform float uTime; uniform vec2 uS; varying vec3 vW;
      void main(){ float d = distance(vW.xz, uS); vec3 c = mix(vec3(1.0, 0.3, 0.6), vec3(1.0, 0.6, 0.3), smoothstep(0.0, 300000.0, d));
        float sweep = 0.8 + 0.2 * sin(d * 0.00008 - uTime * 2.0);
        gl_FragColor = vec4(c * sweep, uOp * (0.5 + 0.5 * (1.0 - smoothstep(0.0, 320000.0, d)))); }` });
  const flMesh = new THREE.Mesh(world.polyGeo(fl.hi, 6), flMat); flMesh.renderOrder = 2; scene.add(flMesh);
  const flLines = fl.lo.map(flat => { const l = fatLine(world.toPts(flat).map(([x, z]) => [x, 8, z]), '#ffb36b', 3, { opacity: 0, closed: true }); scene.add(l); return l; });
  const pins = REG.map(([name, p, c, cue]) => { const g = glow(c, 1); g.position.set(p[0], 60, p[1]); scene.add(g);
    return { name, p, c, t0: C[cue], g, set: label(ui, `<span style="color:${c}">${name}</span>`, 'mlbl sm', true) }; });
  const OFF = [[-150, 40], [150, -30], [-170, -10], [-150, -60], [0, -60], [40, -100]];
  const hwy = fatLine(HWY.map(([x, z]) => [x, 20, z]), '#3dff7a', 4, { opacity: 0 }); scene.add(hwy);
  const car = glow('#ffffff', 1); scene.add(car);
  const hwyLen = HWY.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - HWY[i][0], p[1] - HWY[i][1]), 0);
  const along = u => { let d = u * hwyLen; for (let i = 1; i < HWY.length; i++) { const s = Math.hypot(HWY[i][0] - HWY[i - 1][0], HWY[i][1] - HWY[i - 1][1]); if (d <= s) { const f = d / s; return [lerp(HWY[i - 1][0], HWY[i][0], f), lerp(HWY[i - 1][1], HWY[i][1], f)]; } d -= s; } return HWY[HWY.length - 1]; };

  // ---------- the case-file stage (at the origin, far from the world layer) ----------
  const stage = new THREE.Group(); scene.add(stage);
  const grid = new THREE.GridHelper(20000, 100, '#1b2233', '#111726'); grid.position.y = -2; stage.add(grid);
  const vg = new THREE.Group(); stage.add(vg);
  const vm = buildMap(vg, V(), { land: '#2c3a26', coast: '#4fd1ff', coastW: 3, side: '#05060a', depth: 3, noLights: true,
    mat: { night: 0.6, dim: 0.9, win: '#4fd1ff', win2: '#ffffff', fogNear: 1e6, fogFar: 1e6, floor: 0.9 }, cars: ['#4fd1ff', '#ffffff'], carsPer: 0.6, pitch: 0.2, street: 0.06, hScale: 0.7 });
  const VX = -1500; vg.position.set(VX - vm.center[0], 0, -vm.center[1]);
  const LE = leonida(Wd, LAND_EST), LX = 600;
  const lg = new THREE.Group(); lg.position.set(LX, 0, 0); stage.add(lg);
  LE.polys.forEach(p => { const m = landMesh(p, '#2a1f33', { depth: 3, side: '#05030b' }); lg.add(m); });
  const lCoast = LE.polys.filter(p => p.length > 20).map(p => { const l = fatLine(p.map(([x, z]) => [x, 2, z]), '#ff3fa4', 3, { closed: true }); lg.add(l); return l; });
  const viceL = LE.toLocal(REG[1][1]), viceG = glow('#ff3fa4', 260); viceG.position.set(viceL[0], 6, viceL[1]); lg.add(viceG);
  // ghost outlines for the guesses (drawn as dashed rings of the main coast at each scale)
  const scaleFor = km => Math.sqrt(km / LAND_EST);

  // ---------- HUD ----------
  const chap = chapterCard(ui, { num: '09', game: 'Grand Theft Auto VI · 2026', title: 'THE LEONIDA<br>CASE FILE', acc: '#ff3fa4' });
  const cap = caption(ui);
  const small = el(ui, 'ctr', '<div style="font:400 64px/1 Bebas;letter-spacing:.06em;text-shadow:0 4px 24px #000">VICE CITY = <span style="color:#ff3fa4">THE SMALL PART</span></div>', { left: W / 2 + 'px', top: H - 210 + 'px' });
  const welcome = el(ui, 'ctr', '<div style="font:700 22px Oswald;letter-spacing:.45em;color:#ffb36b">WELCOME TO</div><div style="font:400 150px/0.9 Bebas;letter-spacing:.05em;color:#ff7aa2;text-shadow:0 8px 40px rgba(255,60,140,.45)">LEONIDA</div><div style="font:700 20px Mono;opacity:.75">= ROCKSTAR\'S FLORIDA</div>', { left: '470px', top: '250px', textAlign: 'center' });
  const nonum = el(ui, 'ctr', '<div style="font:700 24px Oswald;letter-spacing:.4em;color:#7d8699">OFFICIAL AREA</div><div style="font:400 240px/0.85 Bebas;color:#ff3fa4">???</div><div style="font:700 22px Mono;color:#7d8699">km² · not published</div>', { left: '1440px', top: '250px', textAlign: 'center' });
  const riddles = [['×2', 'GTA V', '#4fd1ff'], ['×3', 'RED DEAD REDEMPTION 2', '#d08a4a'], ['VICE CITY ×2', 'LOS SANTOS', '#ff3fa4'], ['≈ IV + V + RDR2', 'LAND, COMBINED', '#ffcf4a']].map(([a, b, c], i) =>
    el(ui, '', `<div style="font:700 15px Oswald;letter-spacing:.35em;color:#1d1a16;opacity:.6">ROCKSTAR SAYS</div><div style="font:400 64px/1 Bebas;color:${c};-webkit-text-stroke:1px #1d1a16">${a}</div><div style="font:400 26px/1.1 Marker;color:#1d1a16">${b}</div>`,
      { left: (70 + i * 455) + 'px', top: '60px', width: '400px', padding: '16px 22px 18px', background: '#f3ead2', borderRadius: '6px', boxShadow: '0 20px 40px rgba(0,0,0,.5)' }));
  const sources = el(ui, '', 'Rockstar quotes: Edge · Game Informer previews, 2026', { right: '70px', bottom: '40px', font: '400 16px Mono', color: '#5d6578' });
  // the slot-machine counter
  const ctr = el(ui, 'ctr', `<div class="s" style="font:700 22px Oswald;letter-spacing:.35em;color:#7d8699;white-space:nowrap">LEONIDA · LAND</div><div class="v" style="font:400 170px/0.9 Bebas;white-space:nowrap"></div><div class="t" style="font:700 24px Mono;margin-top:4px"></div>`, { left: '1500px', top: '170px', textAlign: 'center' });
  const cS = ctr.querySelector('.s'), cV = ctr.querySelector('.v'), cT = ctr.querySelector('.t');
  const guesses = [[83, 'THE LEAK', '#9fb4c8', 'L5p2'], [85.6, 'MAPPING PROJECT v16', '#7dd96a', 'L5p3'], [125, 'THE OVERLAYS', '#ffc24a', 'L5p4'], [300, 'THE INTERNET', '#ff4a5a', 'L5p5']].map(([km, who, c, cue]) => ({ km, who, c, t0: C[cue] }));
  const vTag = el(ui, 'ctr', '<span style="background:#4fd1ff;color:#000;padding:4px 14px;font:700 22px Oswald;letter-spacing:.1em">GTA V · 48 km² LAND</span>', { whiteSpace: 'nowrap' });
  const star = el(ui, 'ctr', '<span style="font:400 420px/1 Bebas;color:#ffcf4a;text-shadow:0 0 60px rgba(255,207,74,.5)">*</span>', {});
  const foot = el(ui, '', '* estimate, not an official figure: Rockstar\'s "twice GTA V" applied to the same fan-measured scale as every other game in this film.<br>Land ≈ 96 km² · total incl. water ≈ 150 km². This number will be updated when the measured maps arrive.',
    { left: '70px', right: '70px', bottom: '60px', font: '400 19px/1.5 Mono', color: '#c9b37a', textAlign: 'center' });
  const open = label(ui, '<span style="color:#3dff7a">BRIDGE: OPEN ✓</span>', 'mlbl', true);
  const please = el(ui, 'ctr', '<div style="background:#fff;color:#111;font:400 38px/1.05 Marker;padding:16px 26px;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.5);text-align:center">Please stay.<br><span style="font-size:24px;opacity:.7">- the story (first ~30%)</span></div>', {});
  const board = excuseBoard(ui, [['Bridge blown up', '2001'], ['Hurricane', '1986'], ['"Because we said so"', '2004'], ['Terror alert', '2008'], ['No excuse. Open.', '2026']]);
  const sus = stamp(ui, 'SUSPICIOUS', 560, 760, { big: true, rot: -8, normal: true, color: '#ffcf4a' });

  const logT = (keys, t) => Math.exp(track(keys.map(([a, b, e]) => [a, Math.log(b), e]), t));
  const tS = C.L3 - 0.2, tB = C.L7 - 0.2;                  // stage in / back to the world
  const FLc = [A.florida[0] + 5000, A.florida[1] + 12000];
  const keysC = [153500, 133000];

  function update(t) {
    const onStage = t >= tS && t < tB;
    stage.visible = onStage; world.group.visible = !onStage; flMesh.visible = flLines[0].visible = !onStage;
    // ----- camera -----
    if (!onStage) {
      const late = t >= tB;
      const h = late ? logT([[tB, 420000], [tB + 2.2, 70000], [C.L7p3, 42000], [D, 36000]], t)
                     : logT([[0, 1000000], [C.L1p2, 620000], [C.L2 + 1.2, 240000], [C.L2p6, 225000], [tS, 215000]], t);
      const tx = late ? track([[tB, FLc[0]], [tB + 2.2, keysC[0]], [D, keysC[0] + 1500]], t) : track([[0, A.miami[0]], [C.L1p2, A.miami[0] - 20000], [C.L2 + 1, FLc[0]], [tS, FLc[0]]], t);
      const tz = late ? track([[tB, FLc[1]], [tB + 2.2, keysC[1]], [D, keysC[1] - 1000]], t) : track([[0, A.miami[1]], [C.L1p2, A.miami[1] - 30000], [C.L2 + 1, FLc[1]], [tS, FLc[1]]], t);
      const lean = late ? 0.45 : 0.15 + 0.2 * smooth(inv(C.L2, tS, t));
      camera.fov = 40; camera.near = Math.max(1, h * 0.02); camera.far = h * 40 + 2e5; camera.updateProjectionMatrix();
      camera.up.set(0, 0, -1); camera.position.set(tx, h, tz + h * Math.tan(lean)); camera.lookAt(tx, 0, tz);
      const kLo = world.lod(h, 1);
      world.borders.forEach(b => b.material.opacity = 0.45);
      Object.values(world.detail).forEach(d => { d.children.forEach(m => m.material && (m.material.opacity = 0)); d.userData.lines.forEach(l => l.material.opacity = 0); });
      world.lightsMat.uniforms.uOp.value = 1; world.lightsMat.uniforms.uTime.value = t; world.coastGlow.forEach(l => l.material.opacity = 0.6 * kLo);
      world.sync();
    } else {
      const fov = 36; camera.fov = fov; camera.near = 5; camera.far = 1e6; camera.updateProjectionMatrix();
      const big = smooth(inv(C.L5p5 - 0.2, C.L5p5 + 0.8, t)) * (1 - smooth(inv(C.L6, C.L6 + 1.4, t)));
      const hh = track([[tS, 4300], [C.L4, 3900], [C.L5, 3800], [C.L6p2, 3700], [tB, 3500]], t) * (1 + 0.55 * big);
      const fx = track([[tS, -200], [C.L5, -200], [C.L6, 0], [tB, 0]], t) + 500 * big;
      camera.up.set(0, 1, 0); camera.position.set(fx, hh, hh * 0.45 - 250); camera.lookAt(fx, 0, -330);
    }
    // ----- Florida → Leonida -----
    const lit = smooth(inv(C.L1p2, C.L1p2 + 1.2, t)) * (1 + 0.3 * Math.exp(-Math.pow((t - C.L2) * 3, 2)));
    flMat.uniforms.uOp.value = 0.5 * lit * (t >= tB ? 0.35 : 1); flMat.uniforms.uTime.value = t; flLines.forEach(l => l.material.opacity = Math.min(1, lit));
    { const h = camera.position.y;
      pins.forEach((p, i) => { const a = win(t, p.t0 - 0.1, tS, .25, .4) * (i === 1 || t > C.L2 ? 1 : 0), s = h * 0.03 * (1 + 0.5 * eback(inv(p.t0, p.t0 + 0.4, t)) * (1 - inv(p.t0 + 0.4, p.t0 + 0.9, t)));
        const vEarly = i === 1 ? win(t, 0.4, C.L2, .4, .3) * (1 - 0.6 * smooth(inv(C.L1p2, C.L1p2 + 1, t))) : 0;
        const o = Math.max(a, vEarly); p.g.scale.set(s, s, 1); p.g.material.opacity = o;
        const [x, y] = project(p.p[0], 0, p.p[1]), of = OFF[i]; p.set(x + of[0], y + of[1], Math.max(a, vEarly * 0.0)); }); }
    show(small, win(t, C.L1p2, C.L2 + 0.4, .3, .4), 'translate(-50%,-50%)');
    show(welcome, win(t, C.L2 - 0.1, C.L2p3 - 0.1, .3, .4), `translate(-50%,-50%) scale(${lerp(0.9, 1, eout(inv(C.L2, C.L2 + 0.6, t)))})`);
    chap(win(t, 0.3, tS, .5, .4), eout(inv(0.3, 1.3, t)), eio(inv(C.L2 - 0.6, C.L2, t)));

    // ----- stage: riddles, guesses, estimate -----
    show(nonum, win(t, C.L3 + 0.2, C.L4 - 0.2, .3, .4), `translate(-50%,-50%) scale(${lerp(1.2, 1, eback(inv(C.L3 + 0.2, C.L3 + 0.7, t)))})`);
    const rT = [C.L4, C.L4p2, C.L4p3, C.L4p4];
    riddles.forEach((e, i) => show(e, win(t, rT[i], C.L5 + 0.1, .25, .4), `translateY(${(1 - eout(inv(rT[i], rT[i] + 0.4, t))) * 120}px) rotate(${[-2, 1.5, -1, 2][i]}deg)`));
    show(sources, win(t, C.L4, C.L5 + 0.1, .3, .4), null);
    vg.visible = lg.visible = t > C.L3p2;
    { const sIn = eback(inv(C.L3p2, C.L3p2 + 0.8, t)); vg.scale.setScalar(Math.max(0.001, sIn));
      vm.all.forEach(r => { r.city.update(t, { start: C.L3p2, speed: 700, dur: 0.6 }); r.traffic.update(t, 1); });
      // Leonida silhouette: starts at the leak's size, follows the guesses, settles on our estimate
      let km = 83, col = '#ff3fa4'; let cur = null, prev = null;
      guesses.forEach(g => { if (t >= g.t0) { prev = cur; cur = g; } });
      if (cur) { const p = eout(inv(cur.t0, cur.t0 + 0.6, t)); km = lerp(prev ? prev.km : 83, cur.km, p); col = cur.c; }
      if (t >= C.L6) km = lerp(300, LAND_EST, eio(inv(C.L6, C.L6 + 1.6, t)));
      const wob = cur && cur.km === 300 && t < C.L6 ? 1 + 0.03 * Math.sin(t * 18) : 1;
      lg.scale.setScalar(Math.max(0.001, inv(C.L3p2 + 0.3, C.L3p2 + 1.1, t) > 0 ? eback(inv(C.L3p2 + 0.3, C.L3p2 + 1.1, t)) * scaleFor(km) * wob : 0.001));
      lCoast.forEach(l => l.material.color.set(t >= C.L6 ? '#ff3fa4' : col));
      viceG.material.opacity = 0.8;
      // counter
      const ko = win(t, C.L5 - 0.2, tB, .3, .3);
      show(ctr, ko, 'translate(-50%,-50%)');
      if (t < C.L5p2) { cV.textContent = String(Math.floor(hash(Math.floor(t * 20)) * 900)).padStart(3, '0'); cV.style.color = '#7d8699'; cT.textContent = 'spinning…'; cT.style.color = '#7d8699'; }
      else if (t < C.L6) { const jit = t - cur.t0 < 0.35 ? Math.floor(hash(Math.floor(t * 30)) * 300) : null; cV.innerHTML = (jit ?? (cur.km % 1 ? cur.km.toFixed(1) : cur.km)) + '<small style="font-size:.4em"> km²</small>'; cV.style.color = cur.c; cT.textContent = '- ' + cur.who; cT.style.color = cur.c; }
      else { cV.innerHTML = '~150<small style="font-size:.4em"> km²</small>'; cV.style.color = '#ffcf4a'; cS.textContent = 'OUR ESTIMATE · TOTAL AREA'; cT.textContent = 'same scale as GTA V\'s 75.84'; cT.style.color = '#ffcf4a'; }
      if (t < C.L6) cS.textContent = 'LEONIDA · LAND';
      const [vx, vy] = project(VX, 0, vm.bbox[3] - vm.center[1] + 120); vTag.style.left = vx + 'px'; vTag.style.top = vy + 'px'; show(vTag, win(t, C.L3p2 + 0.5, tB, .3, .3), 'translate(-50%,-50%)');
      show(star, win(t, w('L6p3', 'asterisk') - 0.1, tB, .1, .3), `translate(-50%,-50%) scale(${eback(inv(w('L6p3', 'asterisk') - 0.1, w('L6p3', 'asterisk') + 0.3, t))}) rotate(${t * 20}deg)`);
      star.style.left = '1790px'; star.style.top = '210px';
      show(foot, win(t, C.L6p3, tB, .4, .3), null);
    }

    // ----- back in the Keys: the bridge is open -----
    const ho = smooth(inv(C.L7p2, C.L7p2 + 0.8, t)); hwy.material.opacity = ho; hwy.geometry.instanceCount = Math.max(1, Math.floor(eio(inv(C.L7p2, C.L7p3 + 0.6, t)) * (HWY.length - 1)));
    { const u = eout(inv(C.L7p3, C.L7p4 + 0.4, t)) * 0.82; const [x, z] = along(u); car.position.set(x, 30, z); const s = camera.position.y * 0.025; car.scale.set(s, s, 1); car.material.opacity = t > C.L7p3 && t < D ? 1 : 0;
      const [sx, sy] = project(x, 0, z); please.style.left = sx + 'px'; please.style.top = sy - 120 + 'px'; show(please, win(t, C.L7p4 + 0.3, C.L8 + 1.0, .25, .4), `translate(-50%,-50%) scale(${eback(inv(C.L7p4 + 0.3, C.L7p4 + 0.7, t))})`); }
    { const e = HWY[HWY.length - 1], [x, y] = project(e[0], 0, e[1]); open(x, y - 70, win(t, C.L7p3, C.L8 + 1.0, .3, .4)); }
    board(win(t, C.L8 - 0.2, D + 1, .4, .4), t < C.L8p2 ? 4 : 5, eout(inv(C.L8 - 0.2, C.L8 + 0.4, t)));
    sus(inv(C.L8p3, C.L8p3 + 1, t));

    cap(captionAt(TL, 'ch09', t));
    bloom.strength = onStage ? 0.7 : 0.85; bloom.threshold = onStage ? 0.7 : 0.55; bloom.radius = 0.6; tiltP.uAmt.value = 0;
    grade.uSat.value = 1.15; grade.uVig.value = 0.6; grade.uGrain.value = 0.045; grade.uPixel.value = 0; grade.uScan.value = 0; grade.uCA.value = 0.001;
    grade.uLift.value.set(0, 0, 0.01); grade.uGain.value.set(1, 1, 1.02);
    const dip = tt => 1 - Math.exp(-Math.pow((t - tt) * 4, 2));
    grade.uFade.value = Math.min(inv(0, 0.5, t), 1 - inv(D - 0.5, D, t), dip(tS), dip(tB));
  }
  const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  return { duration: D, stills: [4, 8, 14, 21, 26, 34, 40, 46, 54, 58, 64, 70, 75, 82], update };
}
