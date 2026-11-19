// Chapter 04 · GTA III (2001) - "The camera drops": flat schematic tilts into 3D,
// the city rises, Callahan bridge blows up, Excuse Board #1, radar appears, km² counter.
import * as THREE from 'three';
import { LC3 } from '../world/maps.js';
import { KM, water, glow, fatLine } from '../world/geo.js';
import { sky, buildMap, bridge } from '../world/env.js';
import { track, win, inv, eout, eio, smooth, rng, clamp } from '../core/util.js';
import { chapterCard, kmCounter, label, caption, stamp, excuseBoard, radar } from '../core/hud.js';

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, project } = ctx; const tiltP = ctx.tilt;
  const def = LC3();
  scene.add(sky('#1a1622', '#3a2a2a', '#0c0a0e'));
  scene.fog = null;
  const wat = water({ deep: '#050d16', shallow: '#0e2638', glint: '#ffb066', glint2: '#ff7a3c', streaks: 0.3, spark: 0.8, fog: '#1c1519', fogFar: 3800 });
  scene.add(wat);
  const map = buildMap(scene, def, {
    land: '#262321', coast: '#ff9a3c', park: '#2c4a2a', airport: '#34363b',
    mat: { win: '#ffcf7a', win2: '#ffe9c0', night: 0.55, fog: '#2a2026', fogNear: 700, fogFar: 3600, floor: 0.42, light: [-0.45, 0.42, -0.75], glass: '#1a2230', skyTop: '#3a3048', skyLow: '#ff9a50' }, shadow: 0.45, tree: '#3a5a2e',
    cars: ['#fff1c2', '#ff4b3a', '#ffd166'], carsPer: 1.6, pitch: 0.11, street: 0.026, hScale: 1.3
  });
  const [cx, cz] = map.center;
  const ext = Math.max(map.bbox[2] - map.bbox[0], map.bbox[3] - map.bbox[1]);
  wat.material.uniforms.uCenter.value.set(cx, cz); wat.material.uniforms.uRadius.value = ext * 0.75;
  const fire = glow('#ff6a1f', 50); scene.add(fire); const fire2 = glow('#ffd27a', 22); scene.add(fire2);

  const br = {};
  def.bridges.forEach(b => { br[b.id] = bridge(b.a, b.b, { color: '#8d8a86', light: '#ffcf7a' }); scene.add(br[b.id].group); });
  // explosion on Callahan
  const cal = br.callahan, boomPos = new THREE.Vector3(cal.mid[0], 3, cal.mid[1]);
  const boom = glow('#ffb347', 60); boom.position.copy(boomPos); scene.add(boom);
  const boom2 = glow('#ff4d1f', 60); boom2.position.copy(boomPos); scene.add(boom2);
  const r = rng(9), debris = [];
  const dmat = new THREE.MeshBasicMaterial({ color: '#ffb066' });
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), dmat); m.userData.v = [(r() - .5) * 40, 20 + r() * 30, (r() - .5) * 40]; scene.add(m); debris.push(m); }
  // raised lift bridge: tilt the middle deck sections
  const lift = br.lift;
  const tape = fatLine([[lift.mid[0], 3.4, lift.mid[1] - 4], [lift.mid[0], 3.4, lift.mid[1] + 4]], '#ffd400', 3, { dashed: true });
  scene.add(tape);

  // ---------- HUD ----------
  const chap = chapterCard(ui, { num: '04', game: 'Grand Theft Auto III · 2001', title: 'THE CAMERA<br>DROPS', acc: '#ff9a3c' });
  const km = kmCounter(ui);
  const rad = radar(ui, 'round', '#ff9a3c');
  const radArrow = radar(ui, 'arrow', '#ffcf4a');
  const cap = caption(ui);
  const board = excuseBoard(ui, [['Bridge blown up', '2001'], ['', ''], ['', ''], ['', '']]);
  const st1 = stamp(ui, 'EXCUSE #1', 1640, 560, { rot: -9 });
  const labels = map.all.filter(i => i.isl.name).map(i => ({ rec: i, set: label(ui, i.isl.name, 'mlbl', true) }));
  const lblCal = label(ui, 'CALLAHAN BRIDGE', 'mlbl sm');
  const lblLift = label(ui, 'LIFT BRIDGE · "BROKEN"', 'mlbl sm');

  const caps = [
    [0.3, 4.2, 'In 2001, the camera came down from the sky and landed behind your shoulder.'],
    [4.4, 8.4, 'Liberty City returned in full 3D, built across three islands.'],
    [8.6, 13, 'The bridge to Staunton had just been blown up.']
  ];

  function update(t) {
    // camera: top-down schematic → tilted 3D
    const tilt = eio(inv(1.5, 6.5, t));
    const dist = track([[0, ext * 1.75], [6.5, ext * 1.2], [13, ext * 1.08]], t);
    const pitch = THREE.MathUtils.lerp(89.5, 38, tilt) * Math.PI / 180;
    const yaw = track([[0, 0], [6.5, -0.22], [13, -0.36]], t);
    const tx = cx + track([[0, 0], [6.5, ext * 0.05], [9, ext * 0.2], [10, ext * 0.3], [13, ext * 0.34]], t), tz = cz + track([[0, 0], [6.5, 10], [13, 0]], t);
    camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(tx, 0, tz);

    // city rises from Staunton outward
    map.all.forEach(rec => rec.city.update(t, { origin: [cx * 0.2, cz], start: 2.2, speed: 220, dur: 1.1 }));
    map.all.forEach(rec => rec.traffic.update(t, smooth(inv(3, 4.5, t))));

    // bridges
    const blast = t - 8.6;
    cal.segs.forEach((s, i) => { const k = i === 2 || i === 1; s.visible = !(k && blast > 0.05); });
    boom.material.opacity = blast > 0 ? Math.max(0, 1 - blast / 1.6) : 0; boom.scale.setScalar(20 + 70 * eout(clamp(blast / 0.8)));
    boom2.material.opacity = blast > 0 ? 0.8 * Math.max(0, 1 - blast / 2.4) : 0; boom2.scale.setScalar(40 + 120 * eout(clamp(blast / 1.4)));
    fire.position.set(boomPos.x, 2.5, boomPos.z); fire2.position.set(boomPos.x + 2, 2, boomPos.z);
    { const on = blast > 0.3 ? 1 : 0, fl = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.3); fire.material.opacity = on * 0.9 * fl; fire.scale.setScalar(on * 40 * (0.9 + 0.2 * fl)); fire2.material.opacity = on * fl; fire2.scale.setScalar(on * 18); }
    debris.forEach(d => { const [vx, vy, vz] = d.userData.v, tt = Math.max(0, blast); d.visible = blast > 0 && blast < 3; d.position.set(boomPos.x + vx * tt, boomPos.y + vy * tt - 30 * tt * tt, boomPos.z + vz * tt); d.rotation.set(tt * 5, tt * 3, 0); });
    const liftA = smooth(inv(5.5, 7, t)) * 0.55;
    lift.segs[2].rotation.z = liftA; lift.segs[2].position.y = 1.6 + liftA * 10;
    tape.material.opacity = smooth(inv(6.5, 7, t));

    // labels
    labels.forEach(({ rec, set }) => { const c = rec.city.center; const [x, y] = project(c[0], 0, c[1]); set(x, y - 60 - 120 * tilt, win(t, 0.6, 12.6, .6, .4)); });
    { const [x, y] = project(cal.mid[0], 12, cal.mid[1]); lblCal(x, y - 60, win(t, 7.6, 12.6)); }
    { const [x, y] = project(lift.mid[0], 14, lift.mid[1]); lblLift(x, y + 70, win(t, 7.0, 12.6)); }

    // HUD
    chap(win(t, 0.2, 12.8, .5, .4), eout(inv(0.2, 1.2, t)), eio(inv(4.2, 5.0, t)));
    const kmIn = inv(10.5, 11.5, t);
    km(kmIn, 8.12 * eout(kmIn));
    radArrow(1 - smooth(inv(4.5, 5.2, t)), track([[0, 0], [5, 40]], t));
    rad(smooth(inv(5, 5.8, t)), -t * 6, t * 9);
    board(win(t, 9.2, 13, .5, .4), 1, eout(inv(9.2, 9.9, t)));
    st1(inv(10.0, 10.5, t) * (t < 12.8 ? 1 : 0));
    const c = caps.find(c => t >= c[0] && t < c[1]); cap(c ? c[2] : '', 1);

    // look
    bloom.strength = 0.85; bloom.threshold = 0.62; bloom.radius = 0.6;
    grade.uLift.value.set(0.02, 0.012, 0.01); grade.uGain.value.set(1.06, 1.0, 0.94); grade.uSat.value = 1.05; grade.uVig.value = 0.6; grade.uGrain.value = 0.04;
    grade.uFade.value = Math.min(inv(0, 0.4, t), 1 - inv(12.6, 13, t));
    tiltP.uAmt.value = 0.55 * tilt; tiltP.uFocus.value = 0.52; tiltP.uBand.value = 0.2;
  }
  return { duration: 13, stills: [5.6, 9.4, 11.2], update };
}
