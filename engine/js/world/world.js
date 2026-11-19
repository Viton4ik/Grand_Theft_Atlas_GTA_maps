// Real-world layers (Natural Earth 10m + city boundaries), pre-projected to engine units (10 m, Albers, z = south).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fatLine, glowTexture } from './geo.js';

export async function loadWorld(file = 'world.json') { return (await fetch('data/' + file)).json(); }

const toPts = flat => { const o = []; for (let i = 0; i < flat.length; i += 2) o.push([flat[i], flat[i + 1]]); return o; };
function polyGeo(list, y) {
  const gs = [];
  list.forEach(flat => { const pts = toPts(flat); if (pts.length < 3) return; const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); gs.push(g.toNonIndexed()); });
  return gs.length ? mergeGeometries(gs) : new THREE.BufferGeometry();
}
const fade = (color, y = 0, o = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o, depthWrite: false, depthTest: false });

const oceanFrag = /* glsl */`
  uniform vec3 uA; uniform vec3 uB; uniform float uTime; varying vec3 vW;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
  void main(){ float v = n(vW.xz * 0.00002 + uTime * 0.002) * 0.6 + n(vW.xz * 0.0002) * 0.4; gl_FragColor = vec4(mix(uA, uB, v), 1.0); }`;

export function buildWorld(scene, W, o = {}) {
  const g = new THREE.Group(); scene.add(g);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(6e6, 6e6), new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: oceanFrag, uniforms: { uA: { value: new THREE.Color(o.oceanA || '#071624') }, uB: { value: new THREE.Color(o.oceanB || '#0c2236') }, uTime: { value: 0 } } }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -5; ocean.material.depthTest = false; ocean.material.depthWrite = false; ocean.renderOrder = -5; g.add(ocean);
  const countries = new THREE.Mesh(polyGeo(W.layers.countries.flatMap(c => c.p), 0), fade(o.foreign || '#1a2027')); countries.renderOrder = -4; g.add(countries);
  const states = new THREE.Mesh(polyGeo(W.layers.states.flatMap(s => s.lo), 0.5), fade(o.land || '#232c35')); states.renderOrder = -3; g.add(states);
  const eastHi = W.layers.states.filter(s => (o.hiIds || ['New York', 'New Jersey', 'Connecticut', 'Pennsylvania', 'Delaware', 'Maryland', 'Virginia', 'Rhode Island', 'Massachusetts', 'North Carolina', 'South Carolina', 'Georgia', 'Florida']).includes(s.id));
  const statesHi = new THREE.Mesh(polyGeo(eastHi.flatMap(s => s.hi), 0.6), fade(o.land || '#232c35', 0, 0)); statesHi.renderOrder = -3; g.add(statesHi);
  const coastMid = (W.layers.landmid || []).map(flat => { const l = fatLine(toPts(flat).map(([x, z]) => [x, 3, z]), o.coast || '#4fb3ff', 1.6, { opacity: 0, closed: true }); g.add(l); return l; });
  const lakes = new THREE.Mesh(polyGeo(W.layers.lakes, 1), fade(o.oceanB || '#0c2236')); lakes.renderOrder = -2; g.add(lakes);
  // state borders
  const borders = W.layers.states.flatMap(s => s.lo.map(flat => { const l = fatLine(toPts(flat).map(([x, z]) => [x, 2, z]), o.border || '#3d4a58', 1, { opacity: 0.6, closed: true }); g.add(l); return l; }));
  // detailed city-level land, shown only when zoomed in
  const detail = {};
  for (const k of Object.keys(W.layers.coast)) {
    const grp = new THREE.Group();
    const m1 = new THREE.Mesh(polyGeo(W.layers.coast[k], 3), fade(o.land || '#232c35')); m1.renderOrder = -1; grp.add(m1);
    const cityPolys = (W.layers.city[k] || []).flatMap(c => c.p);
    const m2 = new THREE.Mesh(polyGeo(cityPolys, 4), fade(o.city || '#33404c')); m2.renderOrder = -1; grp.add(m2);
    const lines = cityPolys.map(flat => { const l = fatLine(toPts(flat).map(([x, z]) => [x, 5, z]), o.cityLine || '#6f8aa3', 1.2, { opacity: 0.8, closed: true }); grp.add(l); return l; });
    grp.userData.lines = lines; g.add(grp); detail[k] = grp;
  }
  // glowing coastline
  const coastGlow = (W.layers.landlo || []).map(flat => { const l = fatLine(toPts(flat).map(([x, z]) => [x, 3, z]), o.coast || '#4fb3ff', 1.6, { opacity: 0.7, closed: true }); g.add(l); return l; });
  // city lights
  const pts = W.layers.places; const pos = new Float32Array(pts.length * 3), size = new Float32Array(pts.length);
  pts.forEach((p, i) => { pos.set([p[0], 10, p[1]], i * 3); size[i] = Math.min(34, 4 + Math.sqrt(p[2]) * 0.5); });
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const lightsMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTex: { value: glowTexture() }, uColor: { value: new THREE.Color(o.lights || '#ffcf7a') }, uOp: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `attribute float aSize; uniform float uTime; varying float vT; void main(){ vT = fract(sin(dot(position.xz, vec2(1.3, 7.1))) * 43758.0); gl_PointSize = aSize * (0.85 + 0.15 * sin(uTime * 2.0 + vT * 30.0)); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uColor; uniform float uOp; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor * t.a, t.a * uOp); }` });
  const lights = new THREE.Points(pg, lightsMat); lights.frustumCulled = false; g.add(lights);
  const stateMesh = id => { const s = W.layers.states.find(s => s.id === id); return s; };
  // altitude-based level of detail: hi geometry under ~200 km camera height
  // fills that are fully opaque must render in the opaque pass (before 3D content), otherwise they paint over it
  const fills = () => [countries, states, statesHi, lakes, ...Object.values(detail).flatMap(d => d.children.filter(m => m.isMesh))];
  function sync() { fills().forEach(m => { const tr = m.material.opacity < 0.999; m.material.transparent = tr; m.visible = m.material.opacity > 0.001; }); }
  function lod(h, op = 1) { const k = Math.max(0, Math.min(1, (Math.log(h) - Math.log(60000)) / (Math.log(250000) - Math.log(60000)))); states.material.opacity = op * k; statesHi.material.opacity = op * (1 - k); coastMid.forEach(l => l.material.opacity = 0.7 * op * (1 - k)); return k; }
  return { group: g, coastGlow, coastMid, statesHi, lod, sync, ocean, countries, states, lakes, borders, detail, lights, lightsMat, stateMesh, polyGeo, toPts, A: W.anchors };
}
