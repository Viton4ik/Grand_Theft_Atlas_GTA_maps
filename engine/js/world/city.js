// City generator v2: building archetypes (low-rise, mid-rise, glass towers with setbacks and crowns),
// rooftop machinery, lot plates, fake sun shadows, street trees. All deterministic (seeded).
import * as THREE from 'three';
import { KM, bbox, centroid, inside, insideBy } from './geo.js';
import { rng, smooth, clamp } from '../core/util.js';

const vert = /* glsl */`
  attribute float aSeed; attribute float aType; attribute float aH;
  varying vec3 vN; varying vec3 vW; varying vec3 vC; varying float vSeed; varying float vType; varying float vTop; varying float vBH; varying vec3 vL;
  void main(){
    mat4 im = instanceMatrix;
    vec4 w = modelMatrix * im * vec4(position, 1.0);
    vW = w.xyz; vSeed = aSeed; vType = aType; vBH = aH;
    vN = normalize(mat3(modelMatrix) * mat3(im) * normal);
    vC = instanceColor; vTop = (modelMatrix * im * vec4(0.0, 1.0, 0.0, 1.0)).y;
    vL = position;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const frag = /* glsl */`
  uniform vec3 uLight; uniform vec3 uWin; uniform vec3 uWin2; uniform float uNight; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
  uniform vec3 uCam; uniform float uFloor; uniform float uTrim; uniform vec3 uTrimC; uniform float uTime; uniform float uDim;
  uniform vec3 uSkyTop; uniform vec3 uSkyLow; uniform vec3 uGlass;
  varying vec3 vN; varying vec3 vW; varying vec3 vC; varying float vSeed; varying float vType; varying float vTop; varying float vBH; varying vec3 vL;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
  void main(){
    vec3 n = normalize(vN);
    vec3 L = normalize(uLight);
    float ndl = max(dot(n, L), 0.0);
    float top = step(0.5, n.y);
    vec3 V = normalize(uCam - vW);
    float u = abs(n.x) > 0.5 ? vW.z : vW.x;
    float rel = clamp(vW.y / max(vBH, 0.01), 0.0, 1.0);
    vec3 col;
    if (top > 0.5) {
      // roofs: gravel / membrane with noise and a lighter parapet edge
      float g = n2(vW.xz * 1.7) * 0.18 + n2(vW.xz * 0.21) * 0.12;
      vec3 roof = mix(vec3(0.33, 0.33, 0.34), vC * 0.7, 0.35) * (0.82 + g);
      float edge = max(smoothstep(0.42, 0.5, abs(vL.x)), smoothstep(0.42, 0.5, abs(vL.z)));
      col = mix(roof, roof * 1.35, edge) * (0.75 + 0.35 * ndl);
      if (vType > 1.5) col *= 0.75;
    } else if (vType > 0.5 && vType < 1.5) {
      // glass curtain wall: sky reflection + fresnel + mullions + floor bands
      float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
      vec3 refl = mix(uSkyLow, uSkyTop, clamp(rel * 0.8 + 0.2 * n2(vec2(u * 0.05, vW.y * 0.02)), 0.0, 1.0));
      col = mix(uGlass, refl, 0.12 + 0.6 * fres);
      col *= 0.7 + 0.45 * ndl;
      float mul = smoothstep(0.06, 0.0, abs(fract(u / 0.75) - 0.5) - 0.44);
      float band = smoothstep(0.05, 0.0, abs(fract(vW.y / uFloor) - 0.5) - 0.42);
      col = mix(col, col * 0.55, max(mul, band) * 0.7);
      vec2 cell = vec2(floor(u / 0.75), floor(vW.y / uFloor));
      float lit = step(0.62 - 0.3 * uNight, h(cell + vSeed * 17.0));
      col += mix(uWin, uWin2, h(cell.yx + vSeed)) * lit * uNight * 0.7 * (1.0 - max(mul, band));
    } else {
      // masonry / concrete with punched windows
      float ns = n2(vec2(u * 0.4, vW.y * 0.4)) * 0.12;
      col = vC * (0.32 + 0.62 * ndl) * (0.88 + ns);
      if (vType < 0.5 && vBH > 0.8) {
        vec2 cell = vec2(floor(u / 0.9), floor(vW.y / uFloor));
        vec2 f = vec2(fract(u / 0.9), fract(vW.y / uFloor));
        float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.28, f.y) * step(f.y, 0.78);
        float sill = step(0.2, f.x) * step(f.x, 0.8) * step(0.22, f.y) * step(f.y, 0.28);
        vec3 glassDay = mix(uSkyLow, uSkyTop, 0.4) * 0.55;
        float lit = step(0.55 - 0.25 * uNight, h(cell + vSeed * 13.0));
        float flick = 0.88 + 0.12 * sin(uTime * 0.7 + h(cell) * 40.0);
        vec3 wc = mix(uWin, uWin2, h(cell * 1.7 + vSeed)) * flick;
        vec3 wcol = mix(glassDay, wc * (0.45 + 1.0 * uNight), lit * (0.1 + 0.9 * uNight));
        col = mix(col, wcol, win);
        col = mix(col, col * 1.25, sill);
        // ground floor shopfronts
        float shop = step(vW.y, uFloor * 1.1) * step(0.12, f.x) * step(f.x, 0.88);
        col = mix(col, mix(vec3(0.15), uWin * 1.3, uNight), shop * 0.8);
      }
      // neon trim along the roof line
      col += uTrimC * uTrim * smoothstep(0.35, 0.0, abs(vW.y - vTop + 0.25)) * step(0.55, h(vec2(vSeed, 3.0))) * 2.2;
    }
    // fake ambient occlusion at street level, slight darkening of lower floors
    col *= 0.55 + 0.45 * smoothstep(0.0, 2.5, vW.y);
    col *= uDim;
    float d = distance(uCam, vW);
    col = mix(col, uFog, smoothstep(uFogNear, uFogFar, d));
    gl_FragColor = vec4(col, 1.0);
  }`;

export function buildingMaterial(o = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: {
      uLight: { value: new THREE.Vector3(...(o.light || [0.5, 0.8, 0.3])) },
      uWin: { value: new THREE.Color(o.win || '#ffd27a') }, uWin2: { value: new THREE.Color(o.win2 || '#9fd3ff') },
      uNight: { value: o.night ?? 0.5 }, uFog: { value: new THREE.Color(o.fog || '#0a0e18') },
      uFogNear: { value: o.fogNear ?? 600 }, uFogFar: { value: o.fogFar ?? 2600 },
      uCam: { value: new THREE.Vector3() }, uFloor: { value: o.floor ?? 0.4 },
      uTrim: { value: o.trim ?? 0 }, uTrimC: { value: new THREE.Color(o.trimC || '#ff3fa4') }, uTime: { value: 0 }, uDim: { value: o.dim ?? 1 },
      uSkyTop: { value: new THREE.Color(o.skyTop || '#8fb4d8') }, uSkyLow: { value: new THREE.Color(o.skyLow || '#d8c8b0') }, uGlass: { value: new THREE.Color(o.glass || '#22303d') }
    }
  });
}

/*  zones: [{c:[xkm,zkm], r:km, h:units}] height peaks; avoid: polys (km); parks: polys (km) get trees.
    Returns { mesh(group), update(t,{origin,start,speed,dur}), center, rot, pitch, street } */
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
  const towerH = o.towerH ?? 16, midH = o.midH ?? 5;
  const buildings = [], plates = [];
  const ext = Math.max(x1 - x0, z1 - z0) * 0.8;
  for (let gx = cx - ext; gx < cx + ext; gx += pitch) {
    for (let gz = cz - ext; gz < cz + ext; gz += pitch) {
      const bw = pitch - street;
      const [bx, bz] = rot(gx + bw / 2, gz + bw / 2);
      if (!insideBy([bx, bz], poly, margin + bw * 0.5)) continue;
      if (avoid.some(a => inside([bx, bz], a))) continue;
      let zoneW = 0; zones.forEach(zn => { const d = Math.hypot(bx - zn.c[0], bz - zn.c[1]) / zn.r; if (d < 1) zoneW = Math.max(zoneW, 1 - d); });
      if (o.sparse && zoneW <= 0 && r() > 0.03) continue;
      plates.push({ x: bx, z: bz, w: bw + street * 0.35, d: bw + street * 0.35 });
      // tall blocks get 1 building; low blocks get subdivided into 2-6 lots
      let peak = o.base ?? 1.5; zones.forEach(zn => { const d = Math.hypot(bx - zn.c[0], bz - zn.c[1]) / zn.r; if (d < 1) peak += zn.h * Math.pow(1 - d, 1.6); });
      const tallBlock = peak * (o.hScale || 1) > towerH * 0.8 && r() < 0.7;
      const nx = tallBlock ? 1 : 1 + Math.floor(r() * 3), nz = tallBlock ? 1 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2);
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        if (r() < (o.gap ?? 0.06)) continue;
        const lw = bw / nx, ld = bw / nz;
        const [wx, wz] = rot(gx + i * lw + lw / 2, gz + j * ld + ld / 2);
        const fw = lw * (0.78 + r() * 0.2), fd = ld * (0.78 + r() * 0.2);
        if (!insideBy([wx, wz], poly, margin)) continue;
        let hgt = o.base ?? 1.5;
        zones.forEach(zn => { const d = Math.hypot(wx - zn.c[0], wz - zn.c[1]) / zn.r; if (d < 1) hgt += zn.h * Math.pow(1 - d, 1.6) * (0.3 + 0.7 * r() * r() * 1.5); });
        hgt *= (0.7 + r() * 0.6) * (o.hScale || 1);
        buildings.push({ x: wx, z: wz, w: fw, d: fd, h: Math.max(0.7, hgt), c: palette[Math.floor(r() * palette.length)], seed: r() });
      }
    }
  }
  // explode buildings into parts
  const parts = [];
  buildings.forEach((b, bi) => {
    const kind = b.h > towerH ? 2 : b.h > midH ? 1 : 0;
    const glassy = kind === 2 ? (r() < 0.75 ? 1 : 0) : kind === 1 ? (r() < 0.25 ? 1 : 0) : 0;
    const P = (dx, dz, w, d, y0, h, type) => parts.push({ b: bi, x: b.x + dx, z: b.z + dz, w, d, y0, h, type, c: b.c, seed: b.seed, H: b.h });
    if (kind === 2) {
      const pod = b.h * (0.1 + r() * 0.08), shaft = b.h * (0.55 + r() * 0.15), set = b.h - pod - shaft;
      P(0, 0, b.w, b.d, 0, pod, 0);
      const sw = 0.62 + r() * 0.2;
      P(0, 0, b.w * sw, b.d * sw, pod, shaft, glassy);
      const s2 = sw * (0.6 + r() * 0.2);
      P(0, 0, b.w * s2, b.d * s2, pod + shaft, set * 0.85, glassy);
      if (r() < 0.55) P(0, 0, b.w * 0.06, b.d * 0.06, b.h - set * 0.15, set * 0.15 + b.h * 0.12, 2);   // antenna / spire
      else P(0, 0, b.w * s2 * 0.6, b.d * s2 * 0.6, pod + shaft + set * 0.85, set * 0.25, 2);         // mechanical crown
    } else {
      P(0, 0, b.w, b.d, 0, b.h, glassy);
      // rooftop machinery / water tanks
      const k = r() < 0.75 ? 1 + Math.floor(r() * 2) : 0;
      for (let q = 0; q < k; q++) { const s = 0.18 + r() * 0.2; P((r() - .5) * b.w * 0.5, (r() - .5) * b.d * 0.5, b.w * s, b.d * s, b.h, 0.25 + r() * 0.5, 2); }
    }
  });

  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const N = Math.max(1, parts.length);
  const aSeed = new Float32Array(N), aType = new Float32Array(N), aH = new Float32Array(N);
  parts.forEach((p, i) => { aSeed[i] = p.seed; aType[i] = p.type; aH[i] = p.H; });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
  geo.setAttribute('aType', new THREE.InstancedBufferAttribute(aType, 1));
  geo.setAttribute('aH', new THREE.InstancedBufferAttribute(aH, 1));
  const mat = o.material || buildingMaterial(o.mat || {});
  const mesh = new THREE.InstancedMesh(geo, mat, N); mesh.frustumCulled = false;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  parts.forEach((p, i) => mesh.setColorAt(i, p.c));
  if (!parts.length) mesh.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0));
  g.add(mesh);

  // lot plates (sidewalk slabs) under each block
  const plateMat = new THREE.MeshBasicMaterial({ color: o.plate || '#3a3c40' });
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), plateMat, Math.max(1, plates.length)); pm.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang), s = new THREE.Vector3(), p = new THREE.Vector3();
  plates.forEach((pl, i) => { m4.compose(p.set(pl.x, 0.06, pl.z), q, s.set(pl.w, 0.12, pl.d)); pm.setMatrixAt(i, m4); });
  if (!plates.length) pm.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0));
  g.add(pm);

  // fake sun shadows: dark quads stretched away from the light
  const L = new THREE.Vector3(...((o.mat && o.mat.light) || [0.5, 0.8, 0.3])).normalize();
  const sl = Math.min(1.0, Math.hypot(L.x, L.z) / Math.max(0.25, L.y)) * (o.shadowLen ?? 1);
  const sdx = -L.x / (Math.hypot(L.x, L.z) || 1), sdz = -L.z / (Math.hypot(L.x, L.z) || 1);
  const shMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: o.shadow ?? 0.32, depthWrite: false });
  const shGeo = new THREE.PlaneGeometry(1, 1); shGeo.rotateX(-Math.PI / 2);
  const sh = new THREE.InstancedMesh(shGeo, shMat, Math.max(1, buildings.length)); sh.frustumCulled = false; sh.renderOrder = 1;
  g.add(sh);

  // trees in parks and along some streets
  const treePts = [];
  (o.parks || []).forEach(pk => { const P2 = pk.map(([x, z]) => [x * KM, z * KM]); const [a0, b0, a1, b1] = bbox(P2); for (let k = 0; k < (a1 - a0) * (b1 - b0) / 9; k++) { const tp = [a0 + r() * (a1 - a0), b0 + r() * (b1 - b0)]; if (inside(tp, P2)) treePts.push([...tp, 0.9 + r() * 0.8]); } });
  if (o.streetTrees) plates.forEach(pl => { if (r() < o.streetTrees) { const e = pl.w / 2 + street * 0.25; for (let k = -1; k <= 1; k++) treePts.push([pl.x + k * pl.w / 3, pl.z + e, 0.55 + r() * 0.3]); } });
  const tGeo = new THREE.IcosahedronGeometry(1, 0); tGeo.translate(0, 1.1, 0);
  const tMat = new THREE.MeshLambertMaterial({ color: o.tree || '#2f5a32', flatShading: true });
  const trees = new THREE.InstancedMesh(tGeo, tMat, Math.max(1, treePts.length)); trees.frustumCulled = false;
  const tc = new THREE.Color();
  treePts.forEach((tp, i) => { m4.compose(p.set(tp[0], 0.1, tp[1]), new THREE.Quaternion(), s.set(tp[2] * 1.6, tp[2] * 1.4, tp[2] * 1.6)); trees.setMatrixAt(i, m4); trees.setColorAt(i, tc.set(o.tree || '#2f5a32').multiplyScalar(0.75 + r() * 0.5)); });
  if (!treePts.length) trees.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0));
  g.add(trees);

  function update(t, { origin = [cx, cz], start = 0, speed = 400, dur = 0.8, grow = 1 } = {}) {
    const G = buildings.map(b => {
      const delay = Math.hypot(b.x - origin[0], b.z - origin[1]) / speed + b.seed * 0.25;
      const x = clamp((t - start - delay) / dur);
      return grow * smooth(x) * (x < 1 ? 1 + 0.07 * Math.sin(x * Math.PI) : 1);
    });
    parts.forEach((pt, i) => { const gg = G[pt.b]; m4.compose(p.set(pt.x, pt.y0 * gg, pt.z), q, s.set(pt.w, Math.max(0.01, pt.h * gg), pt.d)); mesh.setMatrixAt(i, m4); });
    mesh.instanceMatrix.needsUpdate = true;
    buildings.forEach((b, i) => {
      const len = b.h * G[i] * sl;
      m4.compose(p.set(b.x + sdx * len / 2, 0.14, b.z + sdz * len / 2), q, s.set(b.w + Math.abs(sdx) * len, 1, b.d + Math.abs(sdz) * len));
      sh.setMatrixAt(i, m4);
    });
    sh.instanceMatrix.needsUpdate = true;
  }
  update(1e6);
  return { mesh: g, buildingMesh: mesh, items: buildings, update, material: mat, rot, pitch, street, center: [cx, cz] };
}

// Free-form building parts → one instanced mesh with the city shader. parts: [{x,z,w,d,y0,h,c,type,H,seed,rot}]
export function blocks(parts, material) {
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const N = Math.max(1, parts.length), aSeed = new Float32Array(N), aType = new Float32Array(N), aH = new Float32Array(N);
  parts.forEach((p, i) => { aSeed[i] = p.seed ?? 0.5; aType[i] = p.type ?? 0; aH[i] = p.H ?? p.h; });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1)); geo.setAttribute('aType', new THREE.InstancedBufferAttribute(aType, 1)); geo.setAttribute('aH', new THREE.InstancedBufferAttribute(aH, 1));
  const mesh = new THREE.InstancedMesh(geo, material, N); mesh.frustumCulled = false;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(), p = new THREE.Vector3();
  function update(g = 1) { parts.forEach((pt, i) => { q.setFromAxisAngle(up, pt.rot || 0); m4.compose(p.set(pt.x, pt.y0 * g, pt.z), q, s.set(pt.w, Math.max(0.01, pt.h * g), pt.d)); mesh.setMatrixAt(i, m4); }); mesh.instanceMatrix.needsUpdate = true; }
  parts.forEach((pt, i) => mesh.setColorAt(i, new THREE.Color(pt.c)));
  update(1);
  return { mesh, update };
}
