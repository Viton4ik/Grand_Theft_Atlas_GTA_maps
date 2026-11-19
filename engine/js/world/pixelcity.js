// The 1997-style top-down pixel city (used in the cold open and chapter 01).
import * as THREE from 'three';
import { coast, streets, traffic, landMesh, fatLine } from './geo.js';
import { city } from './city.js';

export function pixelCity(parent, { seed = 97, palette, land = '#55575b', plate = '#6a6c70', cars, lines = '#d8d8c8', side = null, parks = null } = {}) {
  const poly = coast([[-1.3, -0.9], [-0.2, -1.0], [1.3, -0.85], [1.35, 0.2], [1.2, 0.95], [0.1, 1.0], [-1.25, 0.9], [-1.4, 0.0]], { seed, wobble: 0.04, iters: 2 });
  parent.add(landMesh(poly, land, { depth: 1 }));
  const c = city(poly, { seed, parks, tree: '#5aa050', pitch: 0.13, street: 0.04, base: 1.2, hScale: 0.5, zones: [{ c: [0.2, -0.2], r: 0.6, h: 4 }], plate, streetTrees: 0,
    palette: palette || ['#7a6a5c', '#8c8476', '#6b6f74', '#5e5a55', '#a08f78', '#7d5a48', '#5a6b5a', '#9a9a92'], mat: { night: 0, dim: 1.1, light: [0.3, 1, 0.4], floor: 0.9, fogFar: 1e9, fogNear: 1e9 }, shadow: 0.25 });
  parent.add(c.mesh);
  const segs = streets(poly, c);
  segs.forEach(sg => parent.add(fatLine([[sg[0][0], 0.2, sg[0][1]], [sg[1][0], 0.2, sg[1][1]]], lines, 2, { dashed: true, opacity: 0.85 })));
  const tr = traffic(segs, 90, { seed: seed + 5, colors: cars || ['#ffe14a', '#3fd0ff', '#ffffff', '#7dff6a', '#ff9a2a'], size: 2.6, speed: 14, y: 1.2, side }); parent.add(tr.mesh);
  const main = segs.slice().sort((a, b) => Math.hypot(b[1][0] - b[0][0], b[1][1] - b[0][1]) - Math.hypot(a[1][0] - a[0][0], a[1][1] - a[0][1]))[0];
  const car = new THREE.Mesh(new THREE.BoxGeometry(7, 2, 3.6), new THREE.MeshBasicMaterial({ color: '#ff2020' })); parent.add(car);
  const edge = fatLine(poly.map(([x, z]) => [x, 2, z]), '#ffd400', 3, { closed: true, opacity: 0 }); parent.add(edge);
  function update(t, speed = 0.05) {
    const u = (0.15 + t * speed) % 1;
    const px = main[0][0] + (main[1][0] - main[0][0]) * u, pz = main[0][1] + (main[1][1] - main[0][1]) * u;
    car.position.set(px, 1.4, pz); car.rotation.y = -Math.atan2(main[1][1] - main[0][1], main[1][0] - main[0][0]);
    c.update(1e6); tr.update(t, 1);
    return [px, pz];
  }
  return { poly, segs, car, edge, update, city: c };
}
