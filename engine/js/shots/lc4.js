// Chapter 07 · GTA IV (2008) - the map shrinks, but grows UP. Algonquin rises, GPS draws the route.
import * as THREE from 'three';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LC4 } from '../world/maps.js';
import { KM, water, glow, fatLine } from '../world/geo.js';
import { sky, buildMap, bridge } from '../world/env.js';
import { track, win, inv, eout, eio, smooth } from '../core/util.js';
import { chapterCard, kmCounter, label, caption, radar, el, show } from '../core/hud.js';

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, project, tilt } = ctx;
  const def = LC4();
  scene.add(sky('#232a36', '#5a6472', '#151a22'));
  const wat = water({ deep: '#0a1017', shallow: '#1a2833', glint: '#d8e8ff', glint2: '#ffd9a0', streaks: 0.5, spark: 0.6, fog: '#3b4452', fogFar: 4200 });
  scene.add(wat);
  const map = buildMap(scene, def, {
    land: '#1b1f26', coast: '#9fb4c8', coastW: 1.8, coastO: 0.7, park: '#22372a', side: '#07090c',
    mat: { win: '#ffd9a0', win2: '#e6f2ff', night: 0.7, dim: 0.8, fog: '#3b4452', fogNear: 600, fogFar: 3600, floor: 0.38, light: [-0.4, 0.6, -0.6], glass: '#1c2632', skyTop: '#6a7a8e', skyLow: '#b8c0c8' }, shadow: 0.4, tree: '#2c4a30', towerH: 22,
    cars: ['#fff3d6', '#ff4040'], carsPer: 1.8, pitch: 0.11, street: 0.024
  });
  const [cx, cz] = map.center, ext = Math.max(map.bbox[2] - map.bbox[0], map.bbox[3] - map.bbox[1]);
  wat.material.uniforms.uCenter.value.set(cx, cz); wat.material.uniforms.uRadius.value = ext * 0.8;
  def.bridges.forEach(b => { const x = bridge(b.a, b.b, { color: '#6c7480', light: '#ffe2b0' }); scene.add(x.group); });

  // GPS route through Algonquin streets
  const alg = map.islands.algonquin, ac = alg.city.center;
  const vs = alg.segs.filter(s => Math.abs(s[0][0] - s[1][0]) < 2).sort((a, b) => Math.abs((a[0][0] + a[1][0]) / 2 - ac[0] - 15) - Math.abs((b[0][0] + b[1][0]) / 2 - ac[0] - 15));
  const av = vs[0];
  const zS = Math.max(av[0][1], av[1][1]) - 30, zT = ac[1] - 40;
  const hs = alg.segs.filter(s => Math.abs(s[0][1] - s[1][1]) < 2).sort((a, b) => Math.abs(a[0][1] - zT) - Math.abs(b[0][1] - zT))[0];
  const zt = hs[0][1], xEnd = Math.min(hs[0][0], hs[1][0]) + 6;
  const route = [[av[0][0], zS], [av[0][0], zt], [xEnd, zt], [xEnd, zt - 70]];
  const rL = []; for (let i = 0; i < route.length - 1; i++) rL.push(Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]));
  const total = rL.reduce((a, b) => a + b, 0);
  const gps = fatLine([[0, 1, 0], [1, 1, 0]], '#b26bff', 7); scene.add(gps);
  const gpsHead = glow('#d7b3ff', 26); scene.add(gpsHead);
  const routeAt = d => { let acc = 0; for (let i = 0; i < rL.length; i++) { if (d <= acc + rL[i]) { const p = (d - acc) / rL[i]; return [route[i][0] + (route[i + 1][0] - route[i][0]) * p, route[i][1] + (route[i + 1][1] - route[i][1]) * p]; } acc += rL[i]; } return route[route.length - 1]; };
  const lg = new LineGeometry();

  // HUD
  const chap = chapterCard(ui, { num: '07', game: 'Grand Theft Auto IV · 2008', title: 'SMALLER, TALLER,<br>DENSER', acc: '#9fb4c8' });
  const km = kmCounter(ui);
  const rad = radar(ui, 'gps');
  const cap = caption(ui);
  const pill = el(ui, 'pill ctr', 'RECALCULATING…');
  const lbls = [['ALGONQUIN', 'algonquin', 0, -50], ['BROKER · DUKES', 'broker', 0, 0], ['BOHAN', 'bohan', 0, 0], ['ALDERNEY', 'alderney', 0, 0]]
    .map(([txt, id, ox, oz]) => ({ rec: map.islands[id], ox, oz, set: label(ui, txt, 'mlbl', true) }));
  const caps = [[0.3, 4.5, 'And then, for the first time in GTA history, the map got smaller.'], [4.6, 8.8, 'But it grew upwards.'], [8.9, 13, 'Set a waypoint, and GPS drew the route for you.']];

  function update(t) {
    const yaw = track([[0, -0.1], [13, 0.18]], t), pitch = track([[0, 55], [6, 30], [13, 24]], t) * Math.PI / 180;
    const dist = track([[0, ext * 1.5], [6, ext * 0.75], [13, ext * 0.6]], t);
    const tx = ac[0] + track([[0, (cx - ac[0])], [6, 20], [13, 30]], t), tz = ac[1] + track([[0, cz - ac[1]], [6, 40], [13, -10]], t);
    camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(tx, 0, tz);

    map.all.forEach(rec => { rec.city.update(t, { origin: rec === alg ? [ac[0], ac[1] + 150] : rec.city.center, start: rec === alg ? 3.2 : 2.5, speed: 260, dur: 1.4 }); rec.traffic.update(t, 1); });

    // GPS draw
    const g = eio(inv(8.8, 11.2, t)) * total;
    const pts = [route[0]]; let acc = 0;
    for (let i = 0; i < rL.length; i++) { if (g >= acc + rL[i]) { pts.push(route[i + 1]); acc += rL[i]; } else { pts.push(routeAt(g)); break; } }
    const arr = []; pts.forEach(p => arr.push(p[0], 1.2, p[1])); if (arr.length < 6) arr.push(arr[0] + 0.01, 1.2, arr[2]);
    gps.geometry.dispose(); const ng = new LineGeometry(); ng.setPositions(arr); gps.geometry = ng; gps.computeLineDistances();
    gps.visible = t > 8.8; const hp = routeAt(g); gpsHead.position.set(hp[0], 2, hp[1]); gpsHead.material.opacity = t > 8.8 ? 0.9 : 0;

    lbls.forEach(({ rec, ox, oz, set }) => { const c = rec.city.center; const [x, y] = project(c[0] + ox, 0, c[1] + oz); set(x, y - 80, win(t, 1.0, 8.4)); });
    { const [x, y] = project(hp[0], 0, hp[1]); pill.style.left = x + 'px'; pill.style.top = y - 90 + 'px'; show(pill, win(t, 10.2, 12.8, .2, .3) * (Math.floor(t * 3) % 2 ? 1 : 0.55), 'translate(-50%,-50%)'); }

    chap(win(t, 0.2, 12.8, .5, .4), eout(inv(0.2, 1.2, t)), eio(inv(4.2, 5.0, t)));
    const d = eout(inv(1.0, 3.0, t));
    km(win(t, 0.6, 13), 38.2 - 22.06 * d, d > 0 ? -22.06 * d : null);
    rad(win(t, 1, 13), 0, t * 10);
    const c = caps.find(c => t >= c[0] && t < c[1]); cap(c ? c[2] : '');

    bloom.strength = 0.75; bloom.threshold = 0.72; bloom.radius = 0.5;
    grade.uLift.value.set(0.0, 0.01, 0.02); grade.uGain.value.set(0.98, 1.0, 1.05); grade.uSat.value = 0.85; grade.uVig.value = 0.65; grade.uGrain.value = 0.045;
    grade.uFade.value = Math.min(inv(0, 0.4, t), 1 - inv(12.6, 13, t));
    tilt.uAmt.value = 0.5; tilt.uFocus.value = 0.52; tilt.uBand.value = 0.2;
  }
  return { duration: 13, stills: [6.5, 11.5], update };
}
