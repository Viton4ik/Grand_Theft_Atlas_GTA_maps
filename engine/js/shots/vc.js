// Chapter 05 · Vice City (2002) - neon 1986, two islands, hurricane closes the bridges, Excuse #2.
import * as THREE from 'three';
import { VC } from '../world/maps.js';
import { KM, water, glow, fatLine, palms, edgePoints, centroid } from '../world/geo.js';
import { sky, buildMap, bridge } from '../world/env.js';
import { track, win, inv, eout, eio, smooth, clamp } from '../core/util.js';
import { chapterCard, kmCounter, label, caption, stamp, excuseBoard, radar } from '../core/hud.js';

const hurricaneMat = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uFlash: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uTime; uniform float uAmt; uniform float uFlash; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.1; a*=0.5; } return s; }
    void main(){
      vec2 p = vUv - 0.5; float r = length(p) * 2.0, a = atan(p.y, p.x);
      float spin = uTime * 0.35;
      float arms = 0.5 + 0.5 * sin(a * 2.0 + log(r + 0.02) * 7.0 - spin * 2.0);
      float cl = fbm(vec2(a * 2.5 + log(r + 0.05) * 4.0 - spin, r * 3.0)) ;
      float m = smoothstep(0.92, 0.5, r) * smoothstep(0.06, 0.2, r) * (0.35 + 0.65 * arms) * smoothstep(0.25, 0.75, cl);
      vec3 col = mix(vec3(0.55, 0.5, 0.75), vec3(0.95, 0.92, 1.0), cl) + vec3(0.6, 0.7, 1.0) * uFlash * smoothstep(0.4, 0.9, cl);
      gl_FragColor = vec4(col, m * uAmt * 0.85);
    }`
});

export async function create(ctx) {
  const { scene, camera, ui, bloom, grade, project, tilt } = ctx;
  const def = VC();
  scene.add(sky('#0d0622', '#6a1f62', '#0b0620'));
  const wat = water({ deep: '#08051a', shallow: '#1a0d36', glint: '#ff3fa4', glint2: '#2ff3ff', streaks: 0.9, spark: 1.0, fog: '#3a1240', fogFar: 4200 });
  scene.add(wat);
  const map = buildMap(scene, def, {
    land: '#1b1626', coast: '#ff3fa4', coastW: 2.4, sand: '#6e5a52', park: '#1f4a3a', airport: '#2a2533', side: '#05030b',
    mat: { win: '#ff6fc1', win2: '#5ff7ff', night: 0.9, dim: 0.42, fog: '#3a1240', fogNear: 700, fogFar: 3800, floor: 0.55, trim: 1, trimC: '#ff3fa4', light: [0.6, 0.7, -0.2], glass: '#1a1030', skyTop: '#2a1050', skyLow: '#ff4f9a' }, shadow: 0.35, tree: '#1f4a3a',
    cars: ['#ffffff', '#ff3fa4', '#2ff3ff', '#ffe066'], carsPer: 1.8, pitch: 0.12, street: 0.03, hScale: 1.35
  });
  const [cx, cz] = map.center, ext = Math.max(map.bbox[2] - map.bbox[0], map.bbox[3] - map.bbox[1]);
  wat.material.uniforms.uCenter.value.set(cx, cz); wat.material.uniforms.uRadius.value = ext * 0.8;
  // cyan coast for the mainland, pink for the beach side
  map.islands.mainland.coastLine.material.color.set('#2ff3ff');

  // palms along the beach + sand
  const beach = map.islands.beach.isl;
  const pts = edgePoints(beach.poly, 7, 6, p => p[0] > centroid(beach.poly)[0] + 6);
  scene.add(fatLine(edgePoints(beach.poly, 6, 3, p => p[0] > centroid(beach.poly)[0] + 6).map(p => [p[0], 0.3, p[1]]), '#d9b48a', 9, { opacity: 0.55 }));
  scene.add(palms(pts, { color: '#0f2b22', scale: 2.2 }));
  // Ocean Drive neon strip
  const bs = map.islands.beach.segs.filter(s => Math.abs(s[0][0] - s[1][0]) < 3).sort((a, b) => b[0][0] - a[0][0]).slice(0, 2);
  bs.forEach((s, i) => scene.add(fatLine([[s[0][0], 0.5, s[0][1]], [s[1][0], 0.5, s[1][1]]], i ? '#2ff3ff' : '#ff3fa4', 3.5)));

  // bridges + red closure lights
  const brs = def.bridges.map(b => { const x = bridge(b.a, b.b, { color: '#4a4258', light: '#ff9ad8' }); scene.add(x.group); return x; });
  const stops = [];
  brs.forEach(b => { const s = glow('#ff2a3a', 26); s.position.set(b.mid[0], 4, b.mid[1]); scene.add(s); stops.push(s); });

  // hurricane over the ocean, east of the beach
  const hm = hurricaneMat();
  const hur = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), hm); hur.rotation.x = -Math.PI / 2;
  const hx = map.bbox[2] + ext * 0.42, hz = cz - ext * 0.32; hur.position.set(hx, 60, hz); hur.scale.setScalar(ext * 1.05); scene.add(hur);

  // ---------- HUD ----------
  const chap = chapterCard(ui, { num: '05', game: 'Grand Theft Auto: Vice City · 2002', title: 'NEON &amp;<br>HURRICANES', acc: '#ff3fa4' });
  const km = kmCounter(ui);
  const rad = radar(ui, 'round', '#ff3fa4');
  const cap = caption(ui);
  const board = excuseBoard(ui, [['Bridge blown up', '2001'], ['Hurricane', '1986'], ['', ''], ['', '']]);
  const st = stamp(ui, 'EXCUSE #2', 1640, 600, { rot: -7 });
  const neon = [
    ['OCEAN BEACH', 'neon p', [1.75, 2.2]], ['VICE POINT', 'neon c', [1.55, -1.9]], ['STARFISH ISLAND', 'mlbl sm', [0.3, 0.5]],
    ['LITTLE HAVANA', 'neon p', [-1.6, 0.4]], ['DOWNTOWN', 'neon c', [-2.1, -1.9]]
  ].map(([txt, cls, at]) => ({ at: [at[0] * def.k * KM, at[1] * def.k * KM], set: label(ui, txt, cls) }));
  const hurLbl = label(ui, 'HURRICANE HERMIONE', 'mlbl');
  const caps = [[0.3, 4.5, 'One year later: Miami, 1986. Or, as the game calls it, Vice City.'], [4.6, 9, 'Every bridge to the mainland is closed. Why?'], [9.1, 13, 'Hurricane Hermione.']];

  function update(t) {
    const yaw = track([[0, 0.35], [13, 0.12]], t), pitch = track([[0, 52], [13, 40]], t) * Math.PI / 180, dist = track([[0, ext * 2.2], [13, ext * 1.75]], t);
    const tx = cx + track([[0, ext * 0.05], [13, ext * 0.18]], t), tz = cz + track([[0, 0], [13, ext * 0.05]], t);
    camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(tx, 0, tz);
    map.all.forEach(rec => { rec.city.update(1e6); rec.traffic.update(t, 1); });

    const storm = smooth(inv(3.5, 6.5, t));
    hm.uniforms.uAmt.value = storm; hm.uniforms.uTime.value = t;
    hm.uniforms.uFlash.value = Math.max(0, Math.sin(t * 9) * Math.sin(t * 2.3)) > 0.85 ? 1 : 0;
    stops.forEach((s, i) => { s.material.opacity = smooth(inv(5 + i * 0.12, 5.4 + i * 0.12, t)) * (0.75 + 0.25 * Math.sin(t * 6 + i)); s.scale.setScalar(26 + 6 * Math.sin(t * 6 + i)); });

    neon.forEach(({ at, set }, i) => { const [x, y] = project(at[0], 8, at[1]); set(x, y, win(t, 0.8 + i * 0.25, 12.6, .3, .4), 0.9); });
    { const [x, y] = project(hx, 70, hz); hurLbl(x - 160, y + 40, win(t, 5.5, 8.2)); }

    chap(win(t, 0.2, 12.8, .5, .4), eout(inv(0.2, 1.2, t)), eio(inv(4.2, 5.0, t)));
    const kmIn = inv(10.4, 11.4, t); km(win(t, 1.5, 13), 8.12 + 0.99 * eout(kmIn), kmIn > 0 ? 0.99 * eout(kmIn) : null);
    rad(win(t, 1, 13), 30 - t * 4, t * 12);
    board(win(t, 7.6, 13, .5, .4), 2, eout(inv(7.6, 8.3, t)));
    st(inv(8.5, 9.0, t) * (t < 12.8 ? 1 : 0));
    const c = caps.find(c => t >= c[0] && t < c[1]); cap(c ? c[2] : '');

    bloom.strength = 0.8; bloom.threshold = 0.78; bloom.radius = 0.55;
    grade.uLift.value.set(0.03, 0.0, 0.04); grade.uGain.value.set(1.05, 0.97, 1.08); grade.uSat.value = 1.2; grade.uVig.value = 0.6; grade.uGrain.value = 0.04;
    grade.uFade.value = Math.min(inv(0, 0.4, t), 1 - inv(12.6, 13, t));
    tilt.uAmt.value = 0.45; tilt.uFocus.value = 0.52; tilt.uBand.value = 0.2;
  }
  return { duration: 13, stills: [6.5, 10.5], update };
}
