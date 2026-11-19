// Chapter 00 · Cold open - timed to the voice-over cues.
// Pixel Liberty City 1997 → sits on real New York → East Coast → Florida lights up as Leonida → title.
import * as THREE from 'three';
import { fatLine, glow } from '../world/geo.js';
import { pixelCity } from '../world/pixelcity.js';
import { loadWorld, buildWorld } from '../world/world.js';
import { track, win, inv, eio, smooth, lerp, eback } from '../core/util.js';
import { el, show, caption, label } from '../core/hud.js';
import { cues, captionAt } from '../core/tl.js';

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, tilt, W, H, project, TL } = ctx;
  const C = cues(TL, 'ch00');
  scene.background = new THREE.Color('#050b12');
  const Wd = await loadWorld();
  const world = buildWorld(scene, Wd, { land: '#26323d', foreign: '#1a2028', city: '#344555', lights: '#ffc46b', oceanA: '#04101c', oceanB: '#082038', border: '#45576a', coast: '#5fb8ff' });
  const [NX, NZ] = Wd.anchors.nyc, [FX, FZ] = Wd.anchors.florida;

  // Leonida glow over Florida
  const fl = world.stateMesh('Florida');
  const flMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uOp: { value: 0 }, uTime: { value: 0 }, uS: { value: new THREE.Vector2(...Wd.anchors.miami) }, uN: { value: FZ - 60000 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uOp; uniform float uTime; uniform vec2 uS; uniform float uN; varying vec3 vW;
      void main(){ float d = distance(vW.xz, uS); vec3 c = mix(vec3(1.0, 0.35, 0.55), vec3(1.0, 0.62, 0.3), smoothstep(0.0, 260000.0, d));
        float sweep = smoothstep(0.0, 0.08, fract((vW.z - uN) / 90000.0 - uTime * 0.25)) * 0.25 + 0.75;
        gl_FragColor = vec4(c * sweep * (0.85 + 0.15 * sin(vW.z * 0.002)), uOp * (0.55 + 0.45 * (1.0 - smoothstep(0.0, 300000.0, d)))); }` });
  const flMesh = new THREE.Mesh(world.polyGeo(fl.lo, 6), flMat); flMesh.renderOrder = 2; scene.add(flMesh);
  const flLines = fl.lo.map(flat => { const l = fatLine(world.toPts(flat).map(([x, z]) => [x, 8, z]), '#ffb36b', 3, { opacity: 0, closed: true }); scene.add(l); return l; });

  const pix = new THREE.Group(); pix.position.set(NX, 8, NZ + 600); scene.add(pix);
  const pc = pixelCity(pix);
  const beacon = glow('#ffd400', 1); scene.add(beacon);
  scene.add(new THREE.HemisphereLight('#ffffff', '#333333', 1.2));

  // HUD
  const arrow = el(ui, 'ctr', `<svg width="120" height="120" viewBox="0 0 12 12" shape-rendering="crispEdges"><g fill="#ffd400" stroke="#000" stroke-width=".5"><polygon points="6,0 11,7 7,7 7,12 5,12 5,7 1,7"/></g></svg>`, { left: W / 2 + 'px', top: '120px' });
  const title = el(ui, 'px ctr', 'LIBERTY CITY<br><span style="font-size:.55em;color:#ffd400">1997</span>', { left: W / 2 + 'px', top: H - 250 + 'px', fontSize: '46px', textAlign: 'center', lineHeight: '1.6', textShadow: '4px 4px 0 #000' });
  const score = el(ui, 'px', '', { right: '70px', top: '60px', fontSize: '30px', color: '#fff', textShadow: '3px 3px 0 #000' });
  const lbNY = label(ui, 'LIBERTY CITY · 1997 <span style="color:#ffd400">= NEW YORK</span>', 'mlbl sm', true);
  const lbFL = label(ui, '<span style="color:#ff7aa2">LEONIDA</span> · 2026', 'mlbl', true);
  const cap = caption(ui);
  const big = el(ui, 'ctr', '<div style="font:400 170px/0.9 Bebas;letter-spacing:.04em;text-shadow:0 10px 60px rgba(0,0,0,.8)">GRAND THEFT <span style="color:#ffcf4a">ATLAS</span></div><div style="font:700 30px Oswald;letter-spacing:.45em;margin-top:18px;opacity:.9">HOW GTA\'S MAPS GREW UP</div>', { left: W / 2 + 'px', top: H / 2 + 'px', textAlign: 'center', width: '1700px' });

  const logT = (keys, t) => Math.exp(track(keys.map(([a, b, e]) => [a, Math.log(b), e]), t));
  const tAll = C.L1p2, tReal = C.L1e + 0.4, tWeather = C.L2p1, tState = C.L2p3, tStory = C.L3, tTitle = C.L3p2, D = C.dur;

  function update(t) {
    const [px, pz] = pc.update(t);
    // camera: log-height path; target glides car → whole pixel city → NYC → East Coast → Florida
    const h = logT([[0, 120], [tAll - 0.2, 160], [tAll + 1.2, 640], [tReal, 700], [tReal + 1.6, 3000], [tReal + 2.5, 9000], [tReal + 3.5, 160000], [tState - 1.2, 400000], [tStory + 2, 430000], [D, 360000]], t);
    const carW = [pix.position.x + px, pix.position.z + pz];
    const tx = track([[tAll - 0.2, carW[0]], [tAll + 1.2, NX], [tReal + 1.6, NX], [tReal + 3.5, NX], [tState - 1.2, (NX + FX) / 2 + 30000], [D, FX + 30000]], t, eio);
    const tz = track([[tAll - 0.2, carW[1]], [tAll + 1.2, NZ + 600], [tReal + 1.6, NZ + 600], [tReal + 3.5, NZ + 600], [tState - 1.2, (NZ + FZ) / 2], [D, (NZ + FZ) / 2 + 20000]], t, eio);
    const lean = smooth(inv(tWeather, tState, t)) * 0.5;
    camera.near = Math.max(0.5, h * 0.02); camera.far = h * 40 + 2e5; camera.updateProjectionMatrix();
    camera.up.set(0, 0, -1);
    camera.position.set(tx, h, tz + h * Math.tan(lean) + 0.01); camera.lookAt(tx, 0, tz);

    // layers by altitude
    const real = smooth(inv(tReal, tReal + 1.6, t));
    [world.countries, world.lakes].forEach(m => m.material.opacity = real);
    const kLo = world.lod(h, real);
    world.borders.forEach(b => b.material.opacity = 0.55 * smooth(inv(tWeather + 1, tWeather + 3, t)));
    Object.values(world.detail).forEach(d => { d.children.forEach(m => m.material && (m.material.opacity = real * (1 - smooth(inv(tWeather + 2, tWeather + 3.5, t))))); d.userData.lines.forEach(l => l.material.opacity = 0.8 * real * (1 - smooth(inv(tWeather + 1, tWeather + 2.5, t)))); });
    const lit = smooth(inv(tWeather + 1, tWeather + 3, t));
    world.lightsMat.uniforms.uOp.value = lit; world.lightsMat.uniforms.uTime.value = t; world.coastGlow.forEach(l => l.material.opacity = 0.6 * lit * kLo); world.coastMid.forEach(l => l.material.opacity *= Math.max(0.3, lit));
    pc.edge.material.opacity = smooth(inv(tAll + 0.4, tAll + 1.2, t));
    // the 1997 city becomes a beacon; it pulses again on "a few hundred pixels of New York"
    const pulse = 1 + 0.6 * Math.exp(-Math.pow((t - (tStory + 2.2)) * 2.2, 2));
    const bs = h * 0.035 * smooth(inv(tWeather + 1, tWeather + 2, t)) * pulse; beacon.scale.set(bs, bs, 1); beacon.position.set(NX, 50, NZ + 600); beacon.material.opacity = 0.9 * smooth(inv(tWeather + 1, tWeather + 2, t));
    const fl1 = smooth(inv(tState - 0.2, tState + 1.0, t)) * (1 + 0.5 * Math.exp(-Math.pow((t - (tStory + 4.6)) * 2, 2)));
    flMat.uniforms.uOp.value = 0.55 * fl1; flMat.uniforms.uTime.value = t; flLines.forEach(l => l.material.opacity = Math.min(1, fl1));

    // HUD
    show(arrow, win(t, 0.3, tReal, .2, .4), `translate(-50%,-50%) rotate(${-25 + 10 * Math.sin(t * 1.3)}deg)`);
    show(title, win(t, 0.6, tReal - 0.2, .2, .3), 'translate(-50%,-50%)');
    show(score, win(t, 0.3, tReal, .2, .4), null); score.textContent = String(Math.floor(t * 12345)).padStart(8, '0');
    { const [x, y] = project(NX, 0, NZ + 600); lbNY(x, y - 70, win(t, tReal + 0.8, tTitle - 0.3, .5, .5)); }
    { const [x, y] = project(FX, 0, FZ); lbFL(x, y - 30, win(t, tState + 0.2, tTitle - 0.3, .5, .5)); }
    const tp = inv(tTitle - 0.05, tTitle + 0.35, t);
    show(big, win(t, tTitle - 0.05, D + 1, .2, .5), `translate(-50%,-50%) scale(${tp < 1 ? lerp(1.35, 1, eback(tp)) : 1 + 0.02 * inv(tTitle, D, t)})`);
    cap(t < tTitle - 0.1 ? captionAt(TL, 'ch00', t) : '');

    // look: CRT at first, modern grade later
    const retro = 1 - smooth(inv(tReal - 0.6, tReal + 1.4, t));
    grade.uPixel.value = retro > 0.05 ? Math.round(lerp(1, 6, retro)) : 0; grade.uScan.value = 0.35 * retro; grade.uCA.value = 0.003 * retro + 0.001;
    grade.uSat.value = 1.15; grade.uVig.value = 0.7; grade.uGrain.value = 0.05;
    grade.uLift.value.set(0, 0, 0.01); grade.uGain.value.set(1, 1, 1.03);
    tilt.uAmt.value = 0.5 * smooth(inv(tReal + 0.5, tReal + 2, t)) * (1 - smooth(inv(tWeather + 1, tWeather + 3, t)));
    bloom.strength = 0.6 + 0.4 * lit; bloom.threshold = 0.6; bloom.radius = 0.6;
    grade.uFade.value = Math.min(inv(0, 0.5, t), 1 - 0.7 * smooth(inv(tTitle - 0.4, tTitle, t)), 1 - inv(D - 0.6, D, t));
  }
  return { duration: D, stills: [3, 8, 14, 19.5, 24, 28.5], update };
}
