// UK / Europe layers in a local equal-area projection centred on Britain (1 unit = 10 m, z = south).
import fs from 'fs'; import { geoAlbers } from 'd3-geo'; import simplify from 'simplify-js';
const RAW = '/home/claude/geo-raw/', R = 637100;
const proj = geoAlbers().parallels([50, 58]).rotate([2, 0]).center([0, 54]).scale(R).translate([0, 0]);
const load = f => JSON.parse(fs.readFileSync(RAW + f)); const rnd = v => Math.round(v * 10) / 10;
const rings = g => !g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
function clip(pts, [x0, y0, x1, y1]) {
  const E = [[p => p.x >= x0, (a, b) => ({ x: x0, y: a.y + (b.y - a.y) * (x0 - a.x) / (b.x - a.x) })], [p => p.x <= x1, (a, b) => ({ x: x1, y: a.y + (b.y - a.y) * (x1 - a.x) / (b.x - a.x) })],
    [p => p.y >= y0, (a, b) => ({ y: y0, x: a.x + (b.x - a.x) * (y0 - a.y) / (b.y - a.y) })], [p => p.y <= y1, (a, b) => ({ y: y1, x: a.x + (b.x - a.x) * (y1 - a.y) / (b.y - a.y) })]];
  for (const [ins, cut] of E) { const o = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (ins(b)) { if (!ins(a)) o.push(cut(a, b)); o.push(b); } else if (ins(a)) o.push(cut(a, b)); } pts = o; if (!pts.length) break; }
  return pts;
}
function polys(g, tol, minA = 0, bb = null) {
  const out = [];
  for (const poly of rings(g)) {
    let pts = poly[0].map(p => { const q = proj(p); return { x: q[0], y: q[1] }; }).filter(p => isFinite(p.x));
    if (bb) { const c = [proj([bb[0], bb[1]]), proj([bb[2], bb[3]]), proj([bb[0], bb[3]]), proj([bb[2], bb[1]])]; pts = clip(pts, [Math.min(...c.map(q => q[0])), Math.min(...c.map(q => q[1])), Math.max(...c.map(q => q[0])), Math.max(...c.map(q => q[1]))]); }
    pts = simplify(pts, tol, true); if (pts.length < 4) continue;
    let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; }
    if (Math.abs(a / 2) < minA) continue; out.push(pts.flatMap(p => [rnd(p.x), rnd(p.y)]));
  }
  return out;
}
const W = { units: '1 unit = 10 m; Albers (50/58, lon0 -2, lat0 54); z = south', layers: {} };
const cn = load('ne_10m_admin_0_countries.geojson').features;
W.layers.countries = cn.filter(f => ['FRA', 'BEL', 'NLD', 'DEU', 'DNK', 'NOR', 'LUX', 'CHE', 'ESP', 'FRO', 'ISL', 'SWE', 'POL', 'CZE', 'AUT', 'ITA'].includes(f.properties.ADM0_A3)).map(f => ({ id: f.properties.ADM0_A3, p: polys(f.geometry, 300, 4e6, [-50, 20, 50, 78]) }));
const uk = cn.filter(f => ['GBR', 'IRL', 'IMN'].includes(f.properties.ADM0_A3));
W.layers.states = uk.map(f => ({ id: f.properties.ADM0_A3, lo: polys(f.geometry, 120, 1e5), hi: polys(f.geometry, 25, 2e3) }));
W.layers.lakes = [];
const land = load('ne_10m_land.geojson').features, minor = load('ne_10m_minor_islands.geojson').features;
W.layers.landlo = land.flatMap(f => polys(f.geometry, 200, 3e6, [-50, 20, 50, 78]));
W.layers.landmid = [...land, ...minor].flatMap(f => polys(f.geometry, 30, 2e4, [-11, 49.5, 2.5, 59.5]));
W.layers.coast = { london: [...land, ...minor].flatMap(f => polys(f.geometry, 8, 1e3, [-0.7, 51.25, 0.45, 51.75])) };
W.layers.city = { london: load('london.geojson').features.map(f => ({ id: f.properties.name || '', p: polys(f.geometry, 3, 100) })) };
W.layers.places = load('ne_10m_populated_places_simple.geojson').features.filter(f => ['GB', 'IE', 'FR', 'BE', 'NL', 'DE', 'DK', 'NO', 'ES'].includes(f.properties.iso_a2) && f.properties.pop_max > 15000)
  .map(f => { const q = proj(f.geometry.coordinates); return [rnd(q[0]), rnd(q[1]), Math.round(f.properties.pop_max / 1000), f.properties.name]; });
const P = { london: [-0.118, 51.509], piccadilly: [-0.134, 51.51], manchester: [-2.244, 53.483], dundee: [-2.97, 56.46], thames: [-0.06, 51.5] };
W.anchors = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, proj(v).map(rnd)]));
fs.writeFileSync('engine/data/uk.json', JSON.stringify(W));
console.log('uk.json', (fs.statSync('engine/data/uk.json').size / 1e6).toFixed(2), 'MB', 'boroughs', W.layers.city.london.length, W.anchors);
