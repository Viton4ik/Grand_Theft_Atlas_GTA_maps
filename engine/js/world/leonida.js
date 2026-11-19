// Leonida = a stylised schematic built from REAL Florida (Natural Earth), not from any Rockstar map.
// Returns the Florida polygons re-centred and scaled so their land area equals `landKm2`.
import { signedArea } from './morph.js';

export function leonida(Wd, landKm2 = 96, { minPts = 6 } = {}) {
  const s = Wd.layers.states.find(s => s.id === 'Florida');
  const polys = s.hi.map(f => { const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; }).filter(p => p.length >= minPts);
  const main = polys.reduce((a, b) => (b.length > a.length ? b : a));
  let x0 = 1e12, z0 = 1e12, x1 = -1e12, z1 = -1e12;
  polys.forEach(p => p.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }));
  const area = polys.reduce((a, p) => a + Math.abs(signedArea(p)) / 2, 0);     // units² (1 unit = 10 m)
  const k = Math.sqrt(landKm2 * 1e4 / area), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const tf = ([x, z]) => [(x - cx) * k, (z - cz) * k];
  return { polys: polys.map(p => p.map(tf)), main: main.map(tf), k, center: [cx, cz], toLocal: tf,
    size: [(x1 - x0) * k, (z1 - z0) * k] };
}
