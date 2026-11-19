// Projects Natural Earth + city GeoJSON into engine units (1 unit = 10 m, Albers equal-area, z = south).
import fs from 'fs'; import { geoAlbers } from 'd3-geo'; import simplify from 'simplify-js';
const RAW = '/home/claude/geo-raw/';
const R = 637100; // earth radius in units
const proj = geoAlbers().parallels([29.5, 45.5]).rotate([96, 0]).center([0, 38]).scale(R).translate([0, 0]);
const load = f => JSON.parse(fs.readFileSync(RAW + f));
const rnd = v => Math.round(v * 10) / 10;
function ringsOf(geom) { if (!geom) return []; if (geom.type === 'Polygon') return [geom.coordinates]; if (geom.type === 'MultiPolygon') return geom.coordinates; return []; }
// returns list of polygons; each polygon = outer ring only (holes dropped) as flat [x,z,x,z...]
function clip(pts, [x0, y0, x1, y1]) {
  const edges = [[p => p.x >= x0, (a, b) => ({ x: x0, y: a.y + (b.y - a.y) * (x0 - a.x) / (b.x - a.x) })], [p => p.x <= x1, (a, b) => ({ x: x1, y: a.y + (b.y - a.y) * (x1 - a.x) / (b.x - a.x) })],
    [p => p.y >= y0, (a, b) => ({ y: y0, x: a.x + (b.x - a.x) * (y0 - a.y) / (b.y - a.y) })], [p => p.y <= y1, (a, b) => ({ y: y1, x: a.x + (b.x - a.x) * (y1 - a.y) / (b.y - a.y) })]];
  for (const [ins, cut] of edges) { const o = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (ins(b)) { if (!ins(a)) o.push(cut(a, b)); o.push(b); } else if (ins(a)) o.push(cut(a, b)); } pts = o; if (!pts.length) break; }
  return pts;
}
function polys(geom, tol, minArea = 0, bbox = null) {
  const out = [];
  for (const poly of ringsOf(geom)) {
    const ring = poly[0];
    if (bbox && !ring.some(([lo, la]) => lo > bbox[0] && lo < bbox[2] && la > bbox[1] && la < bbox[3])) continue;
    let pts = ring.map(p => { const q = proj(p); return { x: q[0], y: q[1] }; }).filter(p => isFinite(p.x));
    if (bbox) { const c = [proj([bbox[0], bbox[1]]), proj([bbox[2], bbox[3]]), proj([bbox[0], bbox[3]]), proj([bbox[2], bbox[1]])];
      pts = clip(pts, [Math.min(...c.map(q => q[0])), Math.min(...c.map(q => q[1])), Math.max(...c.map(q => q[0])), Math.max(...c.map(q => q[1]))]); }
    pts = simplify(pts, tol, true);
    if (pts.length < 4) continue;
    let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; }
    if (Math.abs(a / 2) < minArea) continue;
    out.push(pts.flatMap(p => [rnd(p.x), rnd(p.y)]));
  }
  return out;
}
const W = { units: '1 unit = 10 m; Albers equal-area (29.5/45.5, lon0 -96, lat0 38); z = south', layers: {} };

// countries (context) - low detail
const cn = load('ne_10m_admin_0_countries.geojson');
W.layers.countries = cn.features.filter(f => ['CAN', 'MEX', 'CUB', 'BHS', 'GTM', 'BLZ', 'HTI', 'DOM', 'JAM', 'HND', 'NIC', 'SLV', 'GBR', 'IRL', 'FRA', 'ISL', 'GRL', 'NOR', 'SWE', 'DNK', 'DEU', 'NLD', 'BEL', 'ESP', 'PRT', 'CHE', 'ITA', 'AUT', 'POL', 'CZE', 'FIN', 'LUX', 'MAR', 'DZA', 'TUN', 'FRO'].includes(f.properties.ADM0_A3))
  .map(f => ({ id: f.properties.ADM0_A3, p: polys(f.geometry, 300, 4e6) }));
// US states - two LODs
const st = load('ne_10m_admin_1_states_provinces.geojson').features.filter(f => f.properties.adm0_a3 === 'USA' && !['Alaska', 'Hawaii'].includes(f.properties.name));
W.layers.states = st.map(f => ({ id: f.properties.name, lo: polys(f.geometry, 250, 2e6), hi: polys(f.geometry, 25, 2e4) }));
// lakes (Great Lakes etc)
W.layers.lakes = load('ne_10m_lakes.geojson').features.filter(f => (f.properties.scalerank ?? 9) <= 3).map(f => polys(f.geometry, 250, 5e6, [-130, 20, -60, 55])).flat();
// detailed coast near the prototype cities from ne_10m_land
const land = load('ne_10m_land.geojson'), minor = load('ne_10m_minor_islands.geojson');
W.layers.landlo = land.features.flatMap(f => polys(f.geometry, 200, 3e6, [-135, 12, -50, 62]));
W.layers.landmid = [...land.features, ...minor.features].flatMap(f => polys(f.geometry, 30, 2e4, [-83, 24, -69, 42.5]));
const boxes = { nyc: [-74.6, 40.3, -73.4, 41.1], miami: [-80.6, 25.3, -79.9, 26.2], sf: [-123.0, 37.3, -121.8, 38.2], la: [-118.9, 33.6, -117.6, 34.4], lv: [-115.5, 35.9, -114.9, 36.4] };
W.layers.coast = {};
for (const [k, b] of Object.entries(boxes)) W.layers.coast[k] = [...land.features, ...minor.features].flatMap(f => polys(f.geometry, 8, 1e3, b));
// city-level polygons
W.layers.city = {};
const cityF = { nyc: 'new-york-city-boroughs.geojson', sf: 'san-francisco.geojson', miami: 'miami.geojson', la: 'los-angeles.geojson', lv: 'las-vegas.geojson' };
for (const [k, f] of Object.entries(cityF)) W.layers.city[k] = load(f).features.map(ft => ({ id: ft.properties.name || ft.properties.boro_name || '', p: polys(ft.geometry, 3, 100) }));
// city lights (populated places)
W.layers.places = load('ne_10m_populated_places_simple.geojson').features.filter(f => ['US', 'CA', 'MX', 'CU', 'BS'].includes(f.properties.iso_a2) && f.properties.pop_max > 15000)
  .map(f => { const q = proj(f.geometry.coordinates); return [rnd(q[0]), rnd(q[1]), Math.round(f.properties.pop_max / 1000), f.properties.name]; });
// anchor points
const P = { nyc: [-74.0, 40.71], sf: [-122.42, 37.77], miami: [-80.19, 25.77], miamibeach: [-80.13, 25.79], la: [-118.24, 34.05], lv: [-115.14, 36.17], dundee: [-2.97, 56.46], london: [-0.12, 51.5], manchester: [-2.24, 53.48], florida: [-81.7, 28.1] };
W.anchors = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, proj(v).map(rnd)]));
fs.writeFileSync('engine/data/world.json', JSON.stringify(W));
const c = l => JSON.stringify(l).length;
console.log('world.json', (fs.statSync('engine/data/world.json').size / 1e6).toFixed(1), 'MB; states', c(W.layers.states), 'coast', c(W.layers.coast), 'city', c(W.layers.city), 'places', W.layers.places.length);
console.log('anchors', W.anchors);
