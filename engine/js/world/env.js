import * as THREE from 'three';
import { KM, landMesh, flatPoly, fatLine, ring, streets, traffic, bbox, edgePoints, centroid, area, landMaterial } from './geo.js';
import { city } from './city.js';

export function sky(top, mid, bottom) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTop: { value: new THREE.Color(top) }, uMid: { value: new THREE.Color(mid) }, uBot: { value: new THREE.Color(bottom) } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; varying vec3 vD;
      void main(){ float y = vD.y; vec3 c = y > 0.0 ? mix(uMid, uTop, pow(clamp(y * 2.2, 0.0, 1.0), 0.7)) : mix(uMid, uBot, clamp(-y * 6.0, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0); }`
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), mat); m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

// Build every island of a map definition: land, parks, airport, coast glow, city, traffic.
export function buildMap(scene, def, o) {
  const out = { islands: {}, all: [] };
  if (!o.noLights) {
    const L = (o.mat && o.mat.light) || [0.5, 0.8, 0.3];
    const dl = new THREE.DirectionalLight(o.sun || '#fff4e0', 1.6); dl.position.set(L[0] * 100, L[1] * 100, L[2] * 100); scene.add(dl);
    scene.add(new THREE.HemisphereLight(o.skyLight || '#b8c8e0', o.groundLight || '#2a2620', 1.1));
  }
  def.islands.forEach((isl, n) => {
    const g = new THREE.Group();
    const land = landMesh(isl.poly, o.land, { side: o.side || '#05070b', depth: o.depth || 2, material: landMaterial(o.land, o.landFx) });
    g.add(land);
    (isl.parks || []).forEach(pk => g.add(flatPoly(pk.map(([x, z]) => [x * KM, z * KM]), o.park || '#284a2c', 0.06)));
    if (isl.sand) g.add(flatPoly(isl.sand.map(([x, z]) => [x * KM, z * KM]), o.sand || '#e9d7a8', 0.07));
    if (isl.airport) {
      const a = isl.airport.map(([x, z]) => [x * KM, z * KM]);
      g.add(flatPoly(a, o.airport || '#3a3c40', 0.07));
      const [x0, z0, x1, z1] = bbox(a), zc = (z0 + z1) / 2;
      g.add(flatPoly([[x0 + 8, zc - 5], [x1 - 8, zc - 5], [x1 - 8, zc + 1], [x0 + 8, zc + 1]], o.runway || '#5b5e66', 0.09));
      g.add(fatLine([[x0 + 10, 0.2, zc - 2], [x1 - 10, 0.2, zc - 2]], '#ffffff', 1.5, { opacity: 0.8, dashed: true }));
    }
    const coastLine = fatLine(ring(isl.poly, 0.25), o.coast, o.coastW || 2.2, { opacity: o.coastO ?? 0.9, closed: true });
    g.add(coastLine);
    if (isl.docks) {
      const dm = new THREE.MeshBasicMaterial({ color: o.dock || '#5a534b' }), P = isl.poly; let acc = 0;
      for (let i = 0; i < P.length; i++) {
        const A = P[i], B = P[(i + 1) % P.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]); acc += L;
        if (acc < 26) continue; acc = 0;
        if (A[1] > isl.docks.minZ * KM * def.k) continue;
        const nx = (B[1] - A[1]) / L, nz = -(B[0] - A[0]) / L;   // outward normal for CW polygon in screen space
        const sgn = (area(P) > 0 ? -1 : 1), len = 9 + (i % 3) * 3;
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.8, 2.6), dm);
        m.position.set(A[0] + sgn * nx * len * 0.45, 0.1, A[1] + sgn * nz * len * 0.45); m.rotation.y = -Math.atan2(sgn * nz, sgn * nx); g.add(m);
      }
    }
    const c = city(isl.poly, { seed: 20 + n, hScale: o.hScale, sparse: isl.sparse, parks: isl.parks, streetTrees: o.streetTrees ?? 0.25, plate: o.plate, tree: o.tree, shadow: o.shadow, towerH: o.towerH, midH: o.midH, zones: isl.zones, base: isl.base, avoid: isl.avoid, palette: isl.palette, pitch: isl.pitch || o.pitch, street: isl.street || o.street, angle: isl.angle ?? o.angle ?? 0, mat: o.mat, material: o.material });
    g.add(c.mesh);
    const segs = streets(isl.poly, c);
    const tr = traffic(segs, Math.round(segs.length * (o.carsPer ?? 1.2)), { seed: 40 + n, colors: o.cars, speed: o.carSpeed || 9 });
    g.add(tr.mesh);
    scene.add(g);
    const rec = { isl, group: g, land, coastLine, city: c, segs, traffic: tr };
    out.islands[isl.id] = rec; out.all.push(rec);
  });
  const xs = def.islands.flatMap(i => i.poly.map(p => p[0])), zs = def.islands.flatMap(i => i.poly.map(p => p[1]));
  out.bbox = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
  out.center = [(out.bbox[0] + out.bbox[2]) / 2, (out.bbox[1] + out.bbox[3]) / 2];
  return out;
}

// Simple bridge: deck + two pylons. Returns group; parts named for animation.
export function bridge(a, b, { color = '#9aa0aa', light = '#ffd27a', width = 2.6, y = 1.6 } = {}) {
  const A = [a[0] * KM, a[1] * KM], B = [b[0] * KM, b[1] * KM];
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]), ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
  const g = new THREE.Group(); g.position.set((A[0] + B[0]) / 2, 0, (A[1] + B[1]) / 2); g.rotation.y = -ang;
  const mat = new THREE.MeshBasicMaterial({ color });
  const parts = [];
  const nSeg = 5;
  for (let i = 0; i < nSeg; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(L / nSeg * 1.02, 0.6, width), mat);
    s.position.set(-L / 2 + L / nSeg * (i + 0.5), y, 0); g.add(s); parts.push(s);
  }
  [-0.3, 0.3].forEach(f => { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, 1.2), mat); p.position.set(L * f, 4.5, 0); g.add(p); parts.push(p); });
  const lights = fatLine([[-L / 2, y + 0.5, width / 2], [L / 2, y + 0.5, width / 2]], light, 1.6, { opacity: 0.9, dashed: true });
  const lights2 = fatLine([[-L / 2, y + 0.5, -width / 2], [L / 2, y + 0.5, -width / 2]], light, 1.6, { opacity: 0.9, dashed: true });
  g.add(lights, lights2);
  return { group: g, segs: parts.slice(0, nSeg), pylons: parts.slice(nSeg), lights: [lights, lights2], L, mid: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2] };
}
