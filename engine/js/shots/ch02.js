// Chapter 02 · London 1969 / 1961 - the only real city. Real London → pixel London (drive on the left)
// → 1969 flips to 1961 → Manchester multiplayer map → rain, implied.
import * as THREE from 'three';
import { glow, traffic } from '../world/geo.js';
import { pixelCity } from '../world/pixelcity.js';
import { loadWorld, buildWorld } from '../world/world.js';
import { track, win, inv, eio, smooth, lerp, eback, eout } from '../core/util.js';
import { el, show, caption, label, stamp, rain } from '../core/hud.js';
import { cues, captionAt, wordAt } from '../core/tl.js';

const KEEP_LEFT = `<svg width="210" height="210" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#1d4fb8" stroke="#fff" stroke-width="5"/><path d="M62 72 L36 46 L36 62 M36 46 L52 46" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const plate = (t, d) => `<div style="background:#fff;color:#111;border:4px solid #111;border-radius:6px;padding:6px 16px 4px;font:700 30px Oswald;letter-spacing:.06em;box-shadow:0 8px 20px rgba(0,0,0,.5)">${t}<div style="font:400 14px Oswald;color:#c21f2e;letter-spacing:.1em">${d}</div></div>`;

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, tilt, W, H, project, TL } = ctx;
  const C = cues(TL, 'ch02'), D = C.dur, w = (cue, word) => wordAt(TL, 'ch02', cue, word);
  scene.background = new THREE.Color('#060b12');
  const Wd = await loadWorld('uk.json');
  const world = buildWorld(scene, Wd, { hiIds: ['GBR', 'IRL', 'IMN'], land: '#2b333c', foreign: '#1f252d', city: '#36414d', cityLine: '#8fa6bd', lights: '#ffd08a', oceanA: '#050e18', oceanB: '#0a1b2b', border: '#4a5868', coast: '#7fc4ff' });
  const A = Wd.anchors; scene.add(new THREE.HemisphereLight('#ffffff', '#333333', 1.2));

  const pix = new THREE.Group(); pix.position.set(A.london[0], 12, A.london[1]); scene.add(pix);
  const pc = pixelCity(pix, { seed: 69, side: 'left', palette: ['#8a5a4a', '#a07060', '#6e6e70', '#9a9488', '#5f6a5f', '#b8b0a0', '#7a4038'], land: '#4a4c50', plate: '#5c5e62', lines: '#e8e4d8',
    cars: ['#f2f2f2', '#1a1a1a', '#2e6b3a', '#c9b037', '#3a5fa8'], parks: [[[-1.1, -0.75], [-0.55, -0.75], [-0.55, -0.35], [-1.1, -0.35]]] });
  const buses = traffic(pc.segs, 8, { seed: 11, colors: ['#d8261c'], size: 3.4, speed: 9, y: 1.6, side: 'left' }); pix.add(buses.mesh);
  const picc = [20, -40];  // Piccadilly Circus spot on the pixel map (local units)
  const pin = glow('#ffd400', 1); scene.add(pin);
  const pinMan = glow('#7fd8ff', 1); scene.add(pinMan);

  // HUD
  const cap = caption(ui);
  const st = stamp(ui, 'REAL NAME · REAL CITY', W / 2, H * 0.62, { rot: -6, big: true, color: '#ff2a3a', normal: true });
  const ldn = el(ui, 'px ctr', 'LONDON<br><span style="font-size:.55em;color:#ffd400">1969</span>', { left: W / 2 + 'px', top: H - 230 + 'px', fontSize: '46px', textAlign: 'center', lineHeight: '1.6', textShadow: '4px 4px 0 #000' });
  const lbPicc = label(ui, '<span class="px" style="font-size:20px;color:#ffd400">PICCADILLY CIRCUS</span>', 'mlbl sm', true);
  const plates = [['PICCADILLY', 'W1'], ['THE STRAND', 'WC2'], ['OXFORD STREET', 'W1']].map(([a, b], i) => ({ e: el(ui, 'ctr', plate(a, b)), x: [380, 1540, 420][i], y: [380, 330, 720][i], r: [-4, 3, -2][i] }));
  const keep = el(ui, 'ctr', KEEP_LEFT + '<div style="font:400 44px Bebas;letter-spacing:.12em;margin-top:6px;text-shadow:0 2px 10px #000">KEEP LEFT</div>', { left: W - 260 + 'px', top: H / 2 + 'px', textAlign: 'center' });
  const mission = el(ui, 'ctr', `<div class="px" style="font-size:24px;color:#ffd400">MISSION</div><div class="px" style="font-size:34px;margin-top:14px">DRIVE ON THE LEFT</div><div style="font-size:54px;margin-top:10px;color:#ff4040;letter-spacing:.08em">★★★★★</div><div class="px" style="font-size:16px;opacity:.8">DIFFICULTY</div>`,
    { left: W / 2 + 'px', top: H / 2 + 'px', textAlign: 'center', padding: '30px 50px', background: 'rgba(0,0,0,.72)', border: '4px solid #ffd400' });
  const cal = el(ui, 'ctr', `<div style="font:700 20px Oswald;letter-spacing:.35em;color:#7fd8ff">FREE ADD-ON</div><div class="yr" style="font:400 190px/0.9 Bebas"></div><div style="font:700 22px Mono;opacity:.7">8 YEARS EARLIER</div>`, { left: W - 330 + 'px', top: H / 2 - 40 + 'px', textAlign: 'center', background: 'rgba(8,12,18,.78)', padding: '24px 40px', borderRadius: '10px', border: '2px solid rgba(255,255,255,.15)' });
  const yr = cal.querySelector('.yr');
  const lbMan = label(ui, 'MANCHESTER <span style="color:#7fd8ff">· MULTIPLAYER MAP</span>', 'mlbl', true);
  const players = ['#ff4040', '#40a0ff', '#40ff80', '#ffd040'].map(c => el(ui, 'ctr', '', { width: '18px', height: '18px', borderRadius: '50%', background: c, boxShadow: `0 0 14px ${c}` }));
  const cloud = el(ui, 'ctr', `<svg width="220" height="140" viewBox="0 0 110 70"><path d="M25 60h60a18 18 0 0 0 0-36 26 26 0 0 0-49-6A20 20 0 0 0 25 60z" fill="#c8d2de" stroke="#fff" stroke-width="3"/></svg><div class="nt" style="font:700 26px Oswald;letter-spacing:.2em">RAIN: <span style="color:#ff5a5a;text-decoration:line-through">NOT INCLUDED</span></div>`, { left: W / 2 + 'px', top: '260px', textAlign: 'center' });
  const nt = cloud.querySelector('.nt');
  const rainFx = rain(ui, W, H);

  const logT = (keys, t) => Math.exp(track(keys.map(([a, b, e]) => [a, Math.log(b), e]), t));
  const tPix = C.L2 + 1.6, tUp = C.L3p2 - 0.4;

  function update(t) {
    const [px, pz] = pc.update(t, 0.05); buses.update(t, 1);
    const carW = [pix.position.x + px, pix.position.z + pz], L = A.london, M = A.manchester;
    const h = logT([[0, 700000], [C.L1p2, 450000], [C.L1e - 0.3, 9000], [C.L2 + 0.4, 2600], [tPix, 2200], [C.L2p2, 420], [C.L3p2 - 0.6, 420], [tUp + 2.2, 260000], [D, 300000]], t);
    const tx = track([[0, -120000], [C.L1p2, 0], [C.L1e - 0.3, L[0]], [tPix, L[0]], [C.L2p2, carW[0]], [C.L3p2 - 0.6, carW[0]], [tUp + 2.2, (L[0] + M[0]) / 2], [D, (L[0] + M[0]) / 2]], t, eio);
    const tz = track([[0, 20000], [C.L1p2, 0], [C.L1e - 0.3, L[1]], [tPix, L[1]], [C.L2p2, carW[1]], [C.L3p2 - 0.6, carW[1]], [tUp + 2.2, (L[1] + M[1]) / 2], [D, (L[1] + M[1]) / 2]], t, eio);
    const lean = 0.42 * (1 - smooth(inv(C.L1p2, C.L1e, t))) + 0.3 * smooth(inv(tUp + 1, tUp + 2.5, t));
    camera.near = Math.max(0.5, h * 0.02); camera.far = h * 40 + 2e5; camera.updateProjectionMatrix();
    camera.up.set(0, 0, -1); camera.position.set(tx, h, tz + h * Math.tan(lean) + 0.01); camera.lookAt(tx, 0, tz);

    // layers
    const pixOn = smooth(inv(C.L2 - 0.2, C.L2 + 0.8, t)) * (1 - smooth(inv(tUp + 0.6, tUp + 1.6, t)));
    pix.visible = pixOn > 0.01; pix.scale.setScalar(Math.max(0.01, pixOn));
    const kLo = world.lod(h, 1); [world.countries].forEach(m => m.material.opacity = 1);
    const lit = 1 - smooth(inv(C.L1e - 1.0, C.L1e, t)) + smooth(inv(tUp + 1, tUp + 2.5, t));
    world.lightsMat.uniforms.uOp.value = Math.min(1, lit); world.lightsMat.uniforms.uTime.value = t; world.coastGlow.forEach(l => l.material.opacity = 0.6 * kLo);
    const det = smooth(inv(C.L1p2 + 1, C.L1e - 0.5, t)) * (1 - smooth(inv(tUp + 1.2, tUp + 2.2, t)));
    Object.values(world.detail).forEach(d => { d.children.forEach(m => m.material && (m.material.opacity = det)); d.userData.lines.forEach(l => l.material.opacity = 0.9 * det); });
    world.borders.forEach(b => b.material.opacity = 0.3);
    pc.edge.material.opacity = smooth(inv(C.L2, C.L2 + 0.6, t)) * 0.9;
    world.sync();
    // pins
    { const s = h * 0.03 * eback(inv(C.L2p2, C.L2p2 + 0.4, t)); pin.scale.set(s, s, 1); pin.position.set(pix.position.x + picc[0], 30, pix.position.z + picc[1]); pin.material.opacity = win(t, C.L2p2, C.L3p2 - 0.6, .2, .3); }
    { const s = h * 0.035 * eback(inv(C.L3p2 + 1.2, C.L3p2 + 1.6, t)); pinMan.scale.set(s, s, 1); pinMan.position.set(M[0], 30, M[1]); pinMan.material.opacity = smooth(inv(C.L3p2 + 1.2, C.L3p2 + 1.5, t)); }

    // HUD
    st(inv(w('L1p2', 'real name'), w('L1p2', 'real name') + 0.5, t) * (t < C.L1e + 0.4 ? 1 : 0));
    show(ldn, win(t, C.L2 + 0.2, C.L2p2 + 0.2, .3, .4), 'translate(-50%,-50%)');
    { const [x, y] = project(pix.position.x + picc[0], 0, pix.position.z + picc[1]); lbPicc(x, y - 70, win(t, C.L2p2, w('L2p2', 'real street') + 0.2, .2, .3)); }
    plates.forEach((p, i) => { const t0 = w('L2p2', 'real street') + i * 0.18, a = inv(t0, t0 + 0.3, t); p.e.style.left = p.x + 'px'; p.e.style.top = p.y + 'px'; show(p.e, win(t, t0, w('L2p2', 'driving') + 0.2, .1, .3), `translate(-50%,-50%) rotate(${p.r}deg) scale(${eback(a)})`); });
    show(keep, win(t, w('L2p2', 'driving'), C.L2p3 + 0.3, .1, .3), `translate(-50%,-50%) scale(${eback(inv(w('L2p2', 'driving'), w('L2p2', 'driving') + 0.35, t))})`);
    show(mission, win(t, C.L2p3 + 0.3, C.L3 - 0.1, .15, .3), `translate(-50%,-50%) scale(${eback(inv(C.L2p3 + 0.3, C.L2p3 + 0.7, t))})`);
    { const flip = w('L3p1', '1961'); yr.textContent = t < flip ? '1969' : '1961'; const f = Math.abs(Math.sin(Math.min(1, Math.max(0, (t - flip + 0.15) / 0.3)) * Math.PI));
      yr.style.transform = `scaleY(${1 - f * 0.95})`; yr.style.color = t < flip ? '#fff' : '#ffd400';
      show(cal, win(t, C.L3 + 0.1, C.L3p2 + 0.4, .3, .4), `translate(-50%,-50%) translateX(${(1 - eout(inv(C.L3 + 0.1, C.L3 + 0.6, t))) * 500}px)`); }
    { const [x, y] = project(M[0], 0, M[1]); lbMan(x, y - 80, win(t, C.L3p2 + 1.4, D, .3, .4));
      players.forEach((p, i) => { const a = t * 2 + i * Math.PI / 2; p.style.left = x + Math.cos(a) * 46 + 'px'; p.style.top = y + Math.sin(a) * 22 + 'px'; show(p, win(t, C.L3p2 + 1.6 + i * 0.1, D, .2, .4), 'translate(-50%,-50%)'); }); }
    const rk = smooth(inv(C.L3p4, C.L3p4 + 0.6, t));
    nt.style.opacity = 1 - rk; show(cloud, win(t, C.L3p3, D, .25, .3), `translate(-50%,-50%) translateY(${Math.sin(t * 2) * 6}px) scale(${eback(inv(C.L3p3, C.L3p3 + 0.35, t))})`);
    rainFx(rk, t);
    cap(captionAt(TL, 'ch02', t));

    // look: cold London grade; CRT while in the pixel city
    const retro = smooth(inv(tPix - 0.6, tPix + 0.6, t)) * (1 - smooth(inv(tUp - 0.2, tUp + 0.8, t)));
    grade.uPixel.value = retro > 0.05 ? Math.round(lerp(1, 6, retro)) : 0; grade.uScan.value = 0.35 * retro; grade.uCA.value = 0.001 + 0.002 * retro;
    grade.uSat.value = 0.92 - 0.25 * rk; grade.uVig.value = 0.7; grade.uGrain.value = 0.05; grade.uLift.value.set(0.0, 0.01, 0.03); grade.uGain.value.set(0.97, 1.0, 1.06 + 0.05 * rk);
    tilt.uAmt.value = 0.45 * det * (1 - retro); bloom.strength = 0.7; bloom.threshold = 0.6; bloom.radius = 0.6;
    grade.uFade.value = Math.min(inv(0, 0.5, t), 1 - inv(D - 0.5, D, t)) * (1 - 0.25 * rk);
  }
  return { duration: D, stills: [2, 6.2, 9, 12.5, 14.2, 17, 20.5, 27, 29.5, 32], update };
}
