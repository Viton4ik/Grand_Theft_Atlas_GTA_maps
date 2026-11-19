// Chapter 11 · Outro - the cold open in reverse.
// L1: the real USA at night, every real city wearing its game name, little "explosions" on the word.
// L2: dive back into New York → the 1997 pixel Liberty City → the arrow → end card with disclaimers.
import * as THREE from 'three';
import { glow } from '../world/geo.js';
import { pixelCity } from '../world/pixelcity.js';
import { loadWorld, buildWorld } from '../world/world.js';
import { track, win, inv, eio, smooth, lerp, eback, eout } from '../core/util.js';
import { el, show, caption, label } from '../core/hud.js';
import { cues, captionAt, wordAt } from '../core/tl.js';

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, tilt, W, H, project, TL } = ctx;
  const C = cues(TL, 'ch11'), D = C.dur, w = (cue, word) => wordAt(TL, 'ch11', cue, word);
  scene.background = new THREE.Color('#050b12');
  const Wd = await loadWorld(), A = Wd.anchors;
  const world = buildWorld(scene, Wd, { land: '#26323d', foreign: '#1a2028', city: '#344555', lights: '#ffc46b', oceanA: '#04101c', oceanB: '#082038', border: '#45576a', coast: '#5fb8ff' });
  const [NX, NZ] = A.nyc;
  const pix = new THREE.Group(); pix.position.set(NX, 8, NZ + 600); scene.add(pix);
  const pc = pixelCity(pix);
  scene.add(new THREE.HemisphereLight('#ffffff', '#333333', 1.2));

  const CITIES = [
    ['nyc', 'LIBERTY CITY', 'NEW YORK', '#ff9a3c', [0, -1]],
    ['miami', 'VICE CITY', 'MIAMI', '#ff3fa4', [1, 0]],
    ['la', 'LOS SANTOS', 'LOS ANGELES', '#4fd1ff', [0, 1]],
    ['sf', 'SAN FIERRO', 'SAN FRANCISCO', '#ffc24a', [-1, -1]],
    ['lv', 'LAS VENTURAS', 'LAS VEGAS', '#b26bff', [1, -1]]
  ].map(([k, g, r, c, off], i) => ({ k, c, off, i,
    beacon: (() => { const b = glow(c, 1); scene.add(b); return b; })(),
    boom: (() => { const b = glow('#ffe0a0', 1); scene.add(b); return b; })(),
    lab: label(ui, `<span style="color:${c}">${g}</span><br><span style="font-size:.6em;opacity:.8">${r}</span>`, 'mlbl sm', false) }));
  // the London chapter gets a nod: a tag off the east edge
  const london = el(ui, 'ctr', `<span style="color:#7fd8ff">← LONDON 1969</span>`, { font: '400 30px Bebas', letterSpacing: '.18em', textShadow: '0 2px 12px #000', whiteSpace: 'nowrap' });

  const cap = caption(ui);
  const arrow = el(ui, 'ctr', `<svg width="140" height="140" viewBox="0 0 12 12" shape-rendering="crispEdges"><g fill="#ffd400" stroke="#000" stroke-width=".5"><polygon points="6,0 11,7 7,7 7,12 5,12 5,7 1,7"/></g></svg>`, { left: W / 2 + 'px', top: '150px' });
  const believe = el(ui, 'px ctr', 'THE ARROW BELIEVED IN YOU <span style="color:#ff4f7a">♥</span>', { left: W / 2 + 'px', top: '270px', fontSize: '26px', textShadow: '3px 3px 0 #000', whiteSpace: 'nowrap' });
  const end = el(ui, 'ctr', `<div style="font:400 150px/0.9 Bebas;letter-spacing:.04em">GRAND THEFT <span style="color:#ffcf4a">ATLAS</span></div>
    <div style="font:700 26px Oswald;letter-spacing:.45em;margin-top:14px;opacity:.9">1997 → 2026</div>
    <div style="font:400 17px/1.6 Mono;color:#8a93a6;margin-top:46px">Unofficial fan-made documentary. Not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.<br>
    All game maps shown are original stylised schematics, not official maps or game assets. Areas: fan measurements (KeWiS).<br>
    Real-world geography: Natural Earth · city boundaries: click_that_hood (CC). Narration: synthetic voice (Kokoro).</div>`,
    { left: W / 2 + 'px', top: H / 2 + 'px', textAlign: 'center', width: '1700px' });

  const logT = (keys, t) => Math.exp(track(keys.map(([a, b, e]) => [a, Math.log(b), e]), t));
  const tBoom = w('L1p2', 'explosions'), tDive = C.L2 - 0.3, tPix = C.L2p2 - 0.2, tEnd = C.L2e + 0.5;
  const us = [-20000, 30000];

  function update(t) {
    pc.update(t);
    const h = logT([[0, 1250000], [C.L1e, 1050000], [tDive, 1000000], [tDive + 1.2, 160000], [tPix, 700], [C.L2p3, 420], [tEnd, 380], [D, 360]], t);
    const tx = track([[0, us[0]], [tDive, us[0]], [tDive + 1.4, NX], [D, NX]], t, eio);
    const tz = track([[0, us[1]], [tDive, us[1]], [tDive + 1.4, NZ + 600], [D, NZ + 600]], t, eio);
    const lean = 0.32 * (1 - smooth(inv(tDive, tPix, t)));
    camera.near = Math.max(0.5, h * 0.02); camera.far = h * 40 + 2e5; camera.updateProjectionMatrix();
    camera.up.set(0, 0, -1);
    camera.position.set(tx, h, tz + h * Math.tan(lean) + 0.01); camera.lookAt(tx, 0, tz);

    const real = 1 - smooth(inv(tPix - 1.2, tPix, t));
    [world.countries, world.lakes].forEach(m => m.material.opacity = real);
    const kLo = world.lod(h, real);
    world.borders.forEach(b => b.material.opacity = 0.45 * real);
    Object.values(world.detail).forEach(d => { d.children.forEach(m => m.material && (m.material.opacity = 0)); d.userData.lines.forEach(l => l.material.opacity = 0); });
    world.lightsMat.uniforms.uOp.value = real; world.lightsMat.uniforms.uTime.value = t; world.coastGlow.forEach(l => l.material.opacity = 0.6 * real * kLo);
    pc.edge.material.opacity = smooth(inv(tPix, tPix + 0.8, t));

    CITIES.forEach(cy => {
      const P = A[cy.k], t0 = 0.6 + cy.i * 0.45, o = smooth(inv(t0, t0 + 0.5, t)) * (1 - smooth(inv(tDive, tDive + 0.6, t)));
      const s = h * 0.03 * (1 + 0.4 * eback(inv(t0, t0 + 0.5, t)) * (1 - inv(t0 + 0.5, t0 + 1, t)));
      cy.beacon.position.set(P[0], 40, P[1]); cy.beacon.scale.set(s, s, 1); cy.beacon.material.opacity = o;
      const tb = tBoom + cy.i * 0.12, bp = inv(tb, tb + 0.7, t), bs = h * 0.09 * eout(bp);
      cy.boom.position.set(P[0], 60, P[1]); cy.boom.scale.set(bs, bs, 1); cy.boom.material.opacity = bp > 0 && bp < 1 ? (1 - bp) * 0.95 : 0;
      const [x, y] = project(P[0], 0, P[1]);
      cy.lab(x + cy.off[0] * 120, y + cy.off[1] * 62, o, 1 + 0.15 * Math.exp(-Math.pow((t - tb - 0.15) * 5, 2)));
    });
    { const [x, y] = project(A.nyc[0] + 160000, 0, A.nyc[1] + 40000); london.style.left = Math.min(W - 160, x) + 'px'; london.style.top = y + 'px'; show(london, win(t, 3.0, tDive, .5, .5), 'translate(-50%,-50%)'); }

    { const a = inv(C.L2p3 - 0.1, C.L2p3 + 0.3, t), wob = Math.sin(t * 9) * 10 * Math.exp(-Math.max(0, t - C.L2p3) * 0.8);
      show(arrow, win(t, C.L2p3 - 0.1, tEnd - 0.1, .1, .4), `translate(-50%,-50%) scale(${lerp(2.4, 1, eback(a))}) rotate(${-20 + wob}deg)`); }
    show(believe, win(t, w('L2p3', 'believed') - 0.1, tEnd - 0.1, .2, .4), 'translate(-50%,-50%)');
    show(end, inv(tEnd, tEnd + 0.6, t), `translate(-50%,-50%) scale(${lerp(1.08, 1, eout(inv(tEnd, D, t)))})`);
    cap(t < tEnd ? captionAt(TL, 'ch11', t) : '');

    const retro = smooth(inv(tPix - 0.8, tPix + 0.3, t));
    grade.uPixel.value = retro > 0.05 ? Math.round(lerp(1, 6, retro)) : 0; grade.uScan.value = 0.35 * retro; grade.uCA.value = 0.001 + 0.002 * retro;
    grade.uSat.value = 1.15; grade.uVig.value = 0.7; grade.uGrain.value = 0.05; grade.uLift.value.set(0, 0, 0.01); grade.uGain.value.set(1, 1, 1.03);
    tilt.uAmt.value = 0;
    bloom.strength = 0.85; bloom.threshold = 0.55; bloom.radius = 0.6;
    grade.uFade.value = Math.min(inv(0, 0.5, t), 1 - 0.78 * smooth(inv(tEnd - 0.4, tEnd + 0.2, t)), 1 - inv(D - 0.5, D, t));
  }
  return { duration: D, stills: [2.5, 6.5, 10, 12.8, 15.5], update };
}
