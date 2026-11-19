// Geometry builders for stylised game maps: islands, city blocks, water, traffic, lines.
// World units: 1 unit = 10 m. Map definitions are written in km (×100 here).
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, hash, smooth, clamp } from '../core/util.js';

export const KM = 100;

/* ---------- polygon helpers (2D, [x, z]) ---------- */
export function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return a / 2; }
export function centroid(p) { let x = 0, y = 0; p.forEach(q => { x += q[0]; y += q[1]; }); return [x / p.length, y / p.length]; }
export function inside(pt, poly) {
  let c = false; const [x, y] = pt;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
  }
  return c;
}
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1;
  const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l);
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
export function edgeDist(pt, poly) { let d = Infinity; for (let i = 0; i < poly.length; i++) d = Math.min(d, segDist(pt, poly[i], poly[(i + 1) % poly.length])); return d; }
export const insideBy = (pt, poly, m) => inside(pt, poly) && edgeDist(pt, poly) > m;
export function bbox(p) { const xs = p.map(q => q[0]), ys = p.map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }

// Organic coastline: Chaikin smoothing of coarse control points + seeded wobble.
export function coast(pts, { seed = 1, wobble = 0.03, iters = 3, scale = KM } = {}) {
  let p = pts.map(q => [q[0] * scale, q[1] * scale]);
  const r = rng(seed);
  for (let k = 0; k < iters; k++) {
    const n = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      n.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
    }
    p = n;
    if (k < iters - 1) p = p.map(q => [q[0] + (r() - .5) * wobble * scale, q[1] + (r() - .5) * wobble * scale]);
  }
  return p;
}
export const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

/* ---------- land ---------- */
const lVert = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const lFrag = /* glsl */`
  uniform vec3 uC; uniform vec3 uC2; uniform vec3 uCam; uniform vec3 uFog; uniform float uFogFar; uniform float uGrain;
  varying vec3 vW;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
  void main(){
    float v = n(vW.xz * 0.004) * 0.6 + n(vW.xz * 0.03) * 0.3 + n(vW.xz * 0.4) * 0.1;
    vec3 col = mix(uC, uC2, v) * (1.0 + (h(floor(vW.xz * 2.0)) - 0.5) * uGrain);
    col = mix(col, uFog, smoothstep(uFogFar * 0.35, uFogFar, distance(uCam, vW)));
    gl_FragColor = vec4(col, 1.0);
  }`;
export function landMaterial(color, fx = {}) {
  const c = new THREE.Color(color);
  return new THREE.ShaderMaterial({ vertexShader: lVert, fragmentShader: lFrag, uniforms: {
    uC: { value: c.clone().multiplyScalar(fx.lo ?? 0.8) }, uC2: { value: new THREE.Color(fx.c2 || color).multiplyScalar(fx.hi ?? 1.2) }, uCam: { value: new THREE.Vector3() },
    uFog: { value: new THREE.Color(fx.fog || '#000000') }, uFogFar: { value: fx.fogFar ?? 1e7 }, uGrain: { value: fx.grain ?? 0.08 } } });
}
export function landMesh(poly, color, { depth = 1.2, y = 0, side = '#0b0f17', material = null } = {}) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, y - depth, 0);
  const m = new THREE.Mesh(g, [material || new THREE.MeshBasicMaterial({ color }), new THREE.MeshBasicMaterial({ color: side })]);
  return m;
}
export function flatPoly(poly, color, y = 0.05, opacity = 1) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
}

/* ---------- fat glowing lines ---------- */
export const lineMats = [];
export function fatLine(pts3, color, width = 3, { opacity = 1, closed = false, dashed = false } = {}) {
  const arr = []; const p = closed ? [...pts3, pts3[0]] : pts3;
  p.forEach(v => arr.push(v[0], v[1], v[2]));
  const g = new LineGeometry(); g.setPositions(arr);
  const m = new LineMaterial({ color, linewidth: width, transparent: true, opacity, dashed, dashSize: 6, gapSize: 4, worldUnits: false });
  lineMats.push(m);
  const l = new Line2(g, m); l.computeLineDistances();
  return l;
}
export const ring = (poly, y = 0.3) => poly.map(([x, z]) => [x, y, z]);

/* ---------- city blocks ---------- */
const bVert = /* glsl */`
  attribute float aSeed;
  varying vec3 vN; varying vec3 vW; varying vec3 vC; varying float vSeed; varying float vH;
  void main(){
    mat4 im = instanceMatrix;
    vec4 w = modelMatrix * im * vec4(position, 1.0);
    vW = w.xyz; vSeed = aSeed;
    vN = normalize(mat3(modelMatrix) * mat3(im) * normal);
    vC = instanceColor; vH = im[1][1];
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const bFrag = /* glsl */`
  uniform vec3 uLight; uniform vec3 uWin; uniform vec3 uWin2; uniform float uNight; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
  uniform vec3 uCam; uniform float uFloor; uniform float uTrim; uniform vec3 uTrimC; uniform float uTime; uniform float uDim;
  varying vec3 vN; varying vec3 vW; varying vec3 vC; varying float vSeed; varying float vH;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  void main(){
    vec3 n = normalize(vN);
    float dif = 0.38 + 0.62 * max(dot(n, normalize(uLight)), 0.0);
    float top = step(0.5, n.y);
    vec3 col = vC * dif * uDim;
    col *= mix(0.55, 1.0, clamp(vW.y / max(vH, 0.001), 0.0, 1.0)) * (1.0 - top) + top * 1.15;
    // windows on side faces
    if (top < 0.5 && vH > 0.6) {
      float u = abs(n.x) > 0.5 ? vW.z : vW.x;
      vec2 cell = vec2(floor(u / 0.9), floor(vW.y / uFloor));
      vec2 f = vec2(fract(u / 0.9), fract(vW.y / uFloor));
      float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.3, f.y) * step(f.y, 0.75);
      float lit = step(0.55 - 0.25 * uNight, h(cell + vSeed * 13.0));
      float flick = 0.85 + 0.15 * sin(uTime * 0.7 + h(cell) * 40.0);
      vec3 wc = mix(uWin, uWin2, h(cell * 1.7 + vSeed));
      col = mix(col, wc * flick * (0.6 + 1.6 * uNight), win * lit * (0.25 + 0.75 * uNight));
      // neon trim at the roof line
      float trim = uTrim * smoothstep(0.35, 0.0, abs(vW.y - vH + 0.25)) * step(0.6, h(vec2(vSeed, 3.0)));
      col += uTrimC * trim * 2.2;
    }
    float d = distance(uCam, vW);
    col = mix(col, uFog, smoothstep(uFogNear, uFogFar, d));
    gl_FragColor = vec4(col, 1.0);
  }`;

export function buildingMaterial(o = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: bVert, fragmentShader: bFrag,
    uniforms: {
      uLight: { value: new THREE.Vector3(...(o.light || [0.5, 0.8, 0.3])) },
      uWin: { value: new THREE.Color(o.win || '#ffd27a') }, uWin2: { value: new THREE.Color(o.win2 || '#9fd3ff') },
      uNight: { value: o.night ?? 0.5 }, uFog: { value: new THREE.Color(o.fog || '#0a0e18') },
      uFogNear: { value: o.fogNear ?? 600 }, uFogFar: { value: o.fogFar ?? 2600 },
      uCam: { value: new THREE.Vector3() }, uFloor: { value: o.floor ?? 0.65 },
      uTrim: { value: o.trim ?? 0 }, uDim: { value: o.dim ?? 1 }, uTrimC: { value: new THREE.Color(o.trimC || '#ff3fa4') }, uTime: { value: 0 }
    }
  });
}

/*  City generator.
    zones: [{c:[xkm,zkm], r:km, h:units}] height peaks; base: min height; avoid: polys (km) with no buildings.
    Returns {mesh, items, update(t, opts)} where update grows buildings with a wave. */
export function city(poly, o) {
  const r = rng(o.seed || 7);
  const pitch = (o.pitch || 0.13) * KM, street = (o.street || 0.028) * KM, margin = (o.margin || 0.05) * KM;
  const [x0, z0, x1, z1] = bbox(poly);
  const ang = o.angle || 0, ca = Math.cos(ang), sa = Math.sin(ang);
  const [cx, cz] = centroid(poly);
  const rot = (x, z) => [cx + (x - cx) * ca - (z - cz) * sa, cz + (x - cx) * sa + (z - cz) * ca];
  const avoid = (o.avoid || []).map(a => a.map(([x, z]) => [x * KM, z * KM]));
  const zones = (o.zones || []).map(zn => ({ c: [zn.c[0] * KM, zn.c[1] * KM], r: zn.r * KM, h: zn.h }));
  const palette = (o.palette || ['#8a8f9c']).map(c => new THREE.Color(c));
  const items = [];
  const ext = Math.max(x1 - x0, z1 - z0) * 0.8;
  for (let gx = cx - ext; gx < cx + ext; gx += pitch) {
    for (let gz = cz - ext; gz < cz + ext; gz += pitch) {
      const bw = pitch - street;
      const nx = 1 + Math.floor(r() * 2), nz = 1 + Math.floor(r() * 2);
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        if (r() < (o.gap ?? 0.08)) continue;
        const lw = bw / nx, ld = bw / nz;
        const lx = gx + i * lw + lw / 2, lz = gz + j * ld + ld / 2;
        const [wx, wz] = rot(lx, lz);
        const fw = lw * (0.72 + r() * 0.22), fd = ld * (0.72 + r() * 0.22);
        if (!insideBy([wx, wz], poly, margin + Math.max(fw, fd) * 0.5)) continue;
        if (avoid.some(a => inside([wx, wz], a))) continue;
        let hgt = o.base ?? 1.5;
        if (o.sparse && !zones.some(zn => Math.hypot(wx - zn.c[0], wz - zn.c[1]) < zn.r) && r() > 0.03) continue;
        zones.forEach(zn => { const d = Math.hypot(wx - zn.c[0], wz - zn.c[1]) / zn.r; if (d < 1) hgt += zn.h * Math.pow(1 - d, 1.6) * (0.35 + 0.65 * r() * r() * 1.4); });
        hgt *= (0.7 + r() * 0.6) * (o.hScale || 1);
        items.push({ x: wx, z: wz, w: fw, d: fd, h: Math.max(0.6, hgt), c: palette[Math.floor(r() * palette.length)], seed: r() });
      }
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const seeds = new Float32Array(items.length); items.forEach((it, i) => seeds[i] = it.seed);
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  const mat = o.material || buildingMaterial(o.mat || {});
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  mesh.frustumCulled = false;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, items.length) * 3), 3);
  if (!items.length) { mesh.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0)); seeds.length; geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(1), 1)); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang), s = new THREE.Vector3(), p = new THREE.Vector3();
  items.forEach((it, i) => mesh.setColorAt(i, it.c));
  function update(t, { origin = [cx, cz], start = 0, speed = 400, dur = 0.8, grow = 1 } = {}) {
    items.forEach((it, i) => {
      const delay = Math.hypot(it.x - origin[0], it.z - origin[1]) / speed + it.seed * 0.25;
      const g = grow * smooth((t - start - delay) / dur);
      const over = 1 + 0.08 * Math.sin(clamp((t - start - delay) / dur) * Math.PI); // slight overshoot "pop"
      s.set(it.w, Math.max(0.02, it.h * g * (g < 1 ? over : 1)), it.d); p.set(it.x, 0, it.z);
      m4.compose(p, q, s); mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(1e6);
  return { mesh, items, update, material: mat, rot, pitch, street, center: [cx, cz] };
}

/* ---------- street grid segments clipped to island (for traffic + GPS) ---------- */
export function streets(poly, c, { margin = 4 } = {}) {
  const segs = []; const [x0, z0, x1, z1] = bbox(poly);
  const ext = Math.max(x1 - x0, z1 - z0) * 0.8, [cx, cz] = c.center, half = c.street / 2;
  for (let axis = 0; axis < 2; axis++) {
    for (let k = -ext; k < ext; k += c.pitch) {
      let run = null;
      for (let s = -ext; s <= ext; s += 4) {
        const lx = axis ? cx + k - half : cx + s, lz = axis ? cz + s : cz + k - half;
        const w = c.rot(lx, lz), ok = insideBy(w, poly, margin);
        if (ok && !run) run = [w, w]; else if (ok) run[1] = w;
        else if (run) { if (Math.hypot(run[1][0] - run[0][0], run[1][1] - run[0][1]) > 30) segs.push(run); run = null; }
      }
      if (run && Math.hypot(run[1][0] - run[0][0], run[1][1] - run[0][1]) > 30) segs.push(run);
    }
  }
  return segs;
}

/* ---------- traffic: little glowing cars moving along streets ---------- */
export function traffic(segs, n, { seed = 3, colors = ['#fff3c4', '#ff4b4b'], size = 1.1, speed = 9, y = 0.45, side = null } = {}) {
  const r = rng(seed);
  const cars = [];
  for (let i = 0; i < n && segs.length; i++) {
    const s = segs[Math.floor(r() * segs.length)];
    const v = (0.5 + r()) * speed * (r() < .5 ? -1 : 1);
    cars.push({ s, off: r(), v, c: new THREE.Color(colors[Math.floor(r() * colors.length)]), lane: side === 'left' ? -Math.sign(v) * size * 1.1 : side === 'right' ? Math.sign(v) * size * 1.1 : (r() - .5) * 1.0 });
  }
  const geo = new THREE.BoxGeometry(size * 1.8, size * 0.7, size);
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, cars.length)); mesh.frustumCulled = false;
  cars.forEach((c, i) => mesh.setColorAt(i, c.c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  function update(t, vis = 1) {
    cars.forEach((c, i) => {
      const [a, b] = c.s, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let u = ((c.off * L + c.v * t) % L + L) % L / L;
      const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
      p.set(a[0] + (b[0] - a[0]) * u - dz * c.lane, y, a[1] + (b[1] - a[1]) * u + dx * c.lane);
      q.setFromAxisAngle(up, -Math.atan2(dz, dx));
      sc.setScalar(vis);
      m4.compose(p, q, sc); mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { mesh, update };
}

/* ---------- water ---------- */
const wVert = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const wFrag = /* glsl */`
  uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uGlint; uniform vec3 uGlint2; uniform float uTime; uniform vec3 uCam; uniform vec3 uFog; uniform float uFogFar;
  uniform float uStreaks; uniform vec2 uLightDir; uniform vec2 uCenter; uniform float uRadius; uniform float uSpark;
  varying vec3 vW;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
  void main(){
    vec2 p = vW.xz;
    float big = fbm(p * 0.0025 + uTime * 0.01);
    vec3 col = mix(uDeep, uShallow, smoothstep(0.3, 0.75, big));
    // fine ripples: thin bright crests drifting
    float warp = fbm(p * 0.012 + uTime * 0.03) * 9.0;
    float crest = pow(0.5 + 0.5 * sin(p.y * 0.55 + p.x * 0.12 + warp + uTime * 1.3), 22.0) * smoothstep(0.35, 0.8, fbm(p * 0.03 - uTime * 0.05));
    float dc = distance(p, uCenter);
    float near = 1.0 - smoothstep(uRadius * 0.35, uRadius * 0.9, dc);
    col += mix(uGlint, uGlint2, n(p * 0.01)) * crest * (0.05 + uSpark * 0.35 * near);
    // warm city glow on the water close to the islands
    col += uGlint * near * near * uStreaks * 0.18 * (0.7 + 0.3 * big);
    // grazing-angle sheen
    vec3 v = normalize(uCam - vW);
    col += uGlint2 * pow(1.0 - clamp(v.y, 0.0, 1.0), 6.0) * 0.25 * uStreaks;
    float d = distance(uCam, vW);
    col = mix(col, uFog, smoothstep(uFogFar * 0.35, uFogFar, d));
    gl_FragColor = vec4(col, 1.0);
  }`;
export function water(o = {}) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: wVert, fragmentShader: wFrag,
    uniforms: {
      uDeep: { value: new THREE.Color(o.deep || '#06101f') }, uShallow: { value: new THREE.Color(o.shallow || '#0d2440') },
      uGlint: { value: new THREE.Color(o.glint || '#7fd8ff') }, uGlint2: { value: new THREE.Color(o.glint2 || '#ff5fb8') },
      uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color(o.fog || '#05070e') },
      uFogFar: { value: o.fogFar ?? 4000 }, uStreaks: { value: o.streaks ?? 0 }, uLightDir: { value: new THREE.Vector2(1, 0) },
      uCenter: { value: new THREE.Vector2(...(o.center || [0, 0])) }, uRadius: { value: o.radius ?? 600 }, uSpark: { value: o.spark ?? 0.6 }
    }
  });
  const g = new THREE.PlaneGeometry(o.size || 20000, o.size || 20000, 1, 1); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.y = -0.6;
  return m;
}

/* ---------- palms (for beaches) ---------- */
export function palms(points, { seed = 5, color = '#1d3b2a', trunk = '#3b2a20', scale = 1 } = {}) {
  const parts = [];
  const tr = new THREE.CylinderGeometry(0.12, 0.2, 3.2, 5); tr.translate(0, 1.6, 0);
  parts.push(tr);
  for (let i = 0; i < 6; i++) {
    const f = new THREE.ConeGeometry(0.35, 2.2, 4); f.rotateZ(Math.PI / 2.4); f.translate(1.0, 3.0, 0); f.rotateY(i / 6 * Math.PI * 2);
    parts.push(f);
  }
  const geo = mergeGeometries(parts.map(g => g.toNonIndexed()));
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color }), points.length);
  const r = rng(seed), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  points.forEach((p, i) => { q.setFromAxisAngle(up, r() * 6.28); const s = scale * (0.8 + r() * 0.5); m4.compose(new THREE.Vector3(p[0], 0, p[1]), q, new THREE.Vector3(s, s, s)); mesh.setMatrixAt(i, m4); });
  return mesh;
}

// points along a polygon edge, offset inward (for beach palms, coast lights)
export function edgePoints(poly, step, inset = 3, filter = () => true) {
  const out = []; const [cx, cz] = centroid(poly);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = 0; s < L; s += step) {
      const x = a[0] + (b[0] - a[0]) * s / L, z = a[1] + (b[1] - a[1]) * s / L;
      const dx = cx - x, dz = cz - z, dl = Math.hypot(dx, dz) || 1;
      const p = [x + dx / dl * inset, z + dz / dl * inset];
      if (filter(p)) out.push(p);
    }
  }
  return out;
}

/* ---------- glow sprite (explosions, hotspots) ---------- */
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c); return glowTex;
}
export function glow(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1); return s;
}
