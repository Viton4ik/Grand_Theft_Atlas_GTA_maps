// Original stylised schematics of the game maps (NOT traced from Rockstar maps).
// Coarse control points in km (x = east, z = south). Each map is scaled so its
// total land area matches the fan-measured land figure (KeWiS) used in the film.
import { coast, area } from './geo.js';

export function normalise(def, landKm2) {
  const raw = def.islands.reduce((s, i) => s + Math.abs(area(i.pts)), 0);
  const k = Math.sqrt(landKm2 / raw);
  const sc = p => [p[0] * k, p[1] * k];
  def.k = k;
  def.islands.forEach(i => { i.pts = i.pts.map(sc); if (i.airport) i.airport = i.airport.map(sc); (i.zones || []).forEach(z => { z.c = sc(z.c); z.r *= k; }); i.avoid = (i.avoid || []).map(a => a.map(sc)); if (i.sand) i.sand = i.sand.map(sc); if (i.parks) i.parks = i.parks.map(a => a.map(sc)); });
  (def.bridges || []).forEach(b => { b.a = sc(b.a); b.b = sc(b.b); });
  (def.labels || []).forEach(l => l.at = sc(l.at));
  def.islands.forEach((i, n) => i.poly = coast(i.pts, { seed: 11 + n * 7 + (def.seed || 0), wobble: i.wobble ?? 0.07 }));
  return def;
}

/* ---------- GTA III-era Liberty City: three islands ---------- */
export const LC3 = () => normalise({
  seed: 1,
  islands: [
    { id: 'portland', name: 'PORTLAND', pts: [[1.15, -0.55], [1.5, -0.62], [1.7, -0.5], [1.95, -0.72], [2.4, -0.78], [2.7, -0.6], [2.95, -0.25], [2.88, 0.1], [2.95, 0.4], [2.6, 0.72], [2.2, 0.62], [1.9, 0.75], [1.45, 0.62], [1.25, 0.4], [1.1, 0.1]],
      zones: [{ c: [2.2, 0.0], r: 0.9, h: 7 }], base: 2.2, docks: { minZ: -0.2, maxX: 9 }, palette: ['#7a4536', '#8a5a44', '#6e5644', '#5f5a55', '#9a8a72', '#4f4a46'] },
    { id: 'staunton', name: 'STAUNTON ISLAND', pts: [[-0.45, -0.95], [0.1, -1.02], [0.55, -0.95], [0.85, -1.08], [1.0, -0.6], [0.92, -0.2], [1.0, 0.3], [0.9, 0.8], [0.55, 1.0], [0.3, 1.15], [-0.1, 1.0], [-0.5, 0.95], [-0.62, 0.5], [-0.75, 0.0], [-0.62, -0.45]],
      zones: [{ c: [0.3, 0.55], r: 0.75, h: 34 }, { c: [0.6, -0.6], r: 0.5, h: 10 }], base: 3,
      parks: [[[-0.05, -0.55], [0.45, -0.55], [0.45, -0.12], [-0.05, -0.12]]], avoid: [[[-0.05, -0.55], [0.45, -0.55], [0.45, -0.12], [-0.05, -0.12]]],
      palette: ['#8c8f99', '#a3a6ad', '#6f7480', '#b2a48e', '#7a4a3a', '#5c5f66', '#c2b49a'] },
    { id: 'shoreside', name: 'SHORESIDE VALE', pts: [[-3.05, -1.2], [-2.5, -1.35], [-1.9, -1.2], [-1.25, -1.35], [-1.0, -0.9], [-1.08, -0.3], [-0.95, 0.3], [-1.1, 1.0], [-1.5, 1.35], [-2.0, 1.5], [-2.6, 1.4], [-3.15, 1.05], [-3.3, 0.5], [-3.15, 0.0], [-3.35, -0.5]],
      zones: [{ c: [-1.6, -0.7], r: 0.8, h: 5 }, { c: [-2.6, -0.6], r: 0.6, h: 4 }], base: 1.6, avoid: [[[-2.8, 0.4], [-1.55, 0.4], [-1.55, 1.15], [-2.8, 1.15]]],
      airport: [[-2.8, 0.4], [-1.55, 0.4], [-1.55, 1.15], [-2.8, 1.15]], palette: ['#8b8a7c', '#a49a86', '#6f6a60', '#9a7a62', '#c8c0b0'] }
  ],
  bridges: [
    { id: 'callahan', a: [1.18, 0.3], b: [0.93, 0.3] },
    { id: 'lift', a: [-0.68, -0.45], b: [-1.05, -0.45] }
  ]
}, 4.38);

/* ---------- 1986 Vice City: two big islands + bay islands ---------- */
export const VC = () => normalise({
  seed: 2,
  islands: [
    { id: 'mainland', name: 'MAINLAND', pts: [[-3.2, -2.4], [-1.0, -2.5], [-0.7, -1.0], [-0.9, 0.8], [-0.62, 2.2], [-1.6, 2.8], [-3.1, 2.6], [-3.4, 0.2]],
      zones: [{ c: [-1.9, -1.85], r: 0.8, h: 15 }, { c: [-1.3, 0.6], r: 0.9, h: 3 }], base: 1.4,
      avoid: [[[-3.1, 1.3], [-1.6, 1.3], [-1.6, 2.5], [-3.1, 2.5]]], airport: [[-3.1, 1.3], [-1.6, 1.3], [-1.6, 2.5], [-3.1, 2.5]],
      palette: ['#f2c6d8', '#bfe8e6', '#f4e3b8', '#d9c2f0', '#ffd0b0'] },
    { id: 'beach', name: 'VICE BEACH', pts: [[1.2, -2.6], [1.95, -2.7], [2.25, -1.0], [2.15, 1.0], [1.95, 2.7], [1.3, 2.8], [1.0, 1.0], [1.1, -1.0]], wobble: 0.03,
      zones: [{ c: [1.75, -1.8], r: 0.7, h: 6 }, { c: [1.6, 1.6], r: 0.8, h: 8 }], base: 1.6,
      avoid: [[[1.9, -2.7], [2.4, -2.7], [2.4, 2.8], [1.8, 2.8]]],
      palette: ['#ffc4dd', '#b8f0ea', '#fff0b8', '#e2c8ff', '#ffd6b0', '#ffffff'] },
    { id: 'starfish', name: 'STARFISH ISLAND', pts: [[-0.1, 0.3], [0.6, 0.22], [0.72, 0.6], [0.0, 0.76]], base: 1.6, zones: [], palette: ['#ffffff', '#ffe3f0'], wobble: 0.02 },
    { id: 'prawn', name: 'PRAWN ISLAND', pts: [[0.0, -1.62], [0.5, -1.72], [0.56, -1.2], [0.05, -1.1]], base: 2.2, zones: [], palette: ['#e8d8ff', '#ffffff'], wobble: 0.02 },
    { id: 'leaf', name: '', pts: [[-0.2, 1.6], [0.25, 1.55], [0.3, 1.9], [-0.15, 1.95]], base: 1.0, zones: [], palette: ['#c8f0d8'], wobble: 0.02 }
  ],
  bridges: [
    { id: 'm-star', a: [-0.75, 0.5], b: [-0.05, 0.5] }, { id: 'star-b', a: [0.66, 0.42], b: [1.04, 0.42] },
    { id: 'm-prawn', a: [-0.72, -1.4], b: [0.02, -1.4] }, { id: 'prawn-b', a: [0.53, -1.42], b: [1.12, -1.42] },
    { id: 'm-leaf', a: [-0.68, 1.75], b: [-0.18, 1.75] }, { id: 'leaf-b', a: [0.28, 1.72], b: [1.05, 1.72] }
  ]
}, 5.62);

/* ---------- GTA IV Liberty City: four boroughs + Alderney ---------- */
export const LC4 = () => normalise({
  seed: 3,
  islands: [
    { id: 'algonquin', name: 'ALGONQUIN', pts: [[-0.3, -2.6], [0.3, -2.75], [0.55, -1.5], [0.62, 0.5], [0.48, 2.2], [0.12, 2.62], [-0.22, 2.3], [-0.42, 0.5], [-0.46, -1.5]], wobble: 0.025,
      zones: [{ c: [0.08, 1.95], r: 0.75, h: 46 }, { c: [0.08, -0.25], r: 0.85, h: 58 }, { c: [0.0, -2.2], r: 0.6, h: 9 }], base: 5,
      parks: [[[-0.28, -1.65], [0.36, -1.65], [0.4, -0.85], [-0.3, -0.85]]], avoid: [[[-0.28, -1.65], [0.36, -1.65], [0.4, -0.85], [-0.3, -0.85]]],
      palette: ['#8c96a8', '#a8b0bf', '#6f7a8e', '#b9b2a6', '#7f8796', '#c4cad4'], pitch: 0.105, street: 0.022 },
    { id: 'broker', name: 'BROKER · DUKES', pts: [[1.0, -0.8], [2.6, -1.4], [3.6, -0.6], [3.7, 1.2], [3.2, 2.8], [1.9, 3.1], [1.1, 2.4], [0.9, 1.0]],
      zones: [{ c: [1.4, 2.0], r: 0.8, h: 10 }, { c: [2.6, -0.4], r: 1.0, h: 4 }], base: 2.6, palette: ['#7a4a3a', '#8d6a5a', '#6a6460', '#9a8c80', '#5a3a30', '#a89a88'] },
    { id: 'bohan', name: 'BOHAN', pts: [[0.6, -3.6], [2.0, -3.85], [2.4, -2.9], [1.6, -2.2], [0.7, -2.4]], zones: [{ c: [1.3, -3.0], r: 0.7, h: 6 }], base: 3, palette: ['#7d6f66', '#6b6560', '#8a7c70'] },
    { id: 'alderney', name: 'ALDERNEY', pts: [[-3.8, -3.2], [-1.0, -3.0], [-0.9, -1.0], [-1.1, 1.2], [-1.0, 2.8], [-2.3, 3.3], [-3.8, 2.6]],
      zones: [{ c: [-1.5, 0.6], r: 0.8, h: 18 }, { c: [-2.4, -1.8], r: 1.2, h: 4 }], base: 2.4, palette: ['#6f6c66', '#5f6066', '#807a70'] },
    { id: 'happiness', name: '', pts: [[-0.72, 3.0], [-0.5, 2.95], [-0.45, 3.15], [-0.68, 3.22]], base: 0.5, zones: [], palette: ['#7a8a80'], wobble: 0.01 },
    { id: 'charge', name: '', pts: [[0.78, -1.45], [1.0, -1.5], [1.05, -1.25], [0.82, -1.2]], base: 1, zones: [], palette: ['#6f6a66'], wobble: 0.01 }
  ],
  bridges: [
    { id: 'broker-br', a: [0.4, 2.15], b: [1.12, 2.15] }, { id: 'algonquin-br', a: [0.55, 1.4], b: [0.98, 1.4] },
    { id: 'east', a: [0.58, -1.3], b: [0.9, -1.33] }, { id: 'east2', a: [1.0, -1.3], b: [1.6, -1.15] },
    { id: 'north', a: [0.2, -2.68], b: [0.75, -2.5] }, { id: 'tunnel', a: [-0.45, -0.3], b: [-0.95, -0.3] }
  ]
}, 8.06);

/* ---------- silhouettes for the same-scale scoreboard ---------- */
export const SA = () => normalise({ seed: 4, islands: [{ id: 'sa', name: 'SAN ANDREAS', sparse: true, base: 2, zones: [{ c: [2.1, 2.0], r: 1.3, h: 10 }, { c: [-2.3, -1.2], r: 1.0, h: 12 }, { c: [2.0, -2.2], r: 1.1, h: 9 }], palette: ['#c9b48a', '#a89a80', '#e0d0a8'], pts: [[-3, -3.1], [-0.4, -3.3], [0.2, -2.4], [3.1, -3.2], [3.3, -0.2], [3.0, 3.0], [0.3, 3.3], [-3.1, 3.0], [-3.3, 0.1]] }] }, 31.55);
export const V = () => normalise({ seed: 5, islands: [{ id: 'v', name: 'LOS SANTOS + BLAINE', sparse: true, base: 2, zones: [{ c: [0.6, 4.4], r: 2.0, h: 24 }, { c: [0.6, -0.6], r: 0.7, h: 2 }, { c: [-0.8, -5.0], r: 0.7, h: 2 }], palette: ['#b8c4cc', '#d6dde2', '#8c9aa6'], pts: [[-2.4, -6.0], [1.4, -6.6], [3.4, -3.2], [3.0, 0.8], [3.6, 3.8], [1.4, 6.1], [-1.6, 5.6], [-3.1, 2.2], [-2.1, -0.8], [-3.0, -3.4]] }] }, 48.15);

/* ---------- GTA 2 "Anywhere City": three districts, no real-world twin (schematic, unscaled) ---------- */
export const ANY = () => normalise({
  seed: 6,
  islands: [
    { id: 'downtown', name: 'DOWNTOWN', pts: [[-2.4, -2.2], [-0.6, -2.4], [-0.3, -1.4], [-0.5, -0.3], [-1.6, -0.1], [-2.6, -0.6], [-2.8, -1.5]],
      zones: [{ c: [-1.5, -1.3], r: 1.1, h: 34 }], base: 4, palette: ['#3a2e5a', '#4a3a70', '#2e2848', '#5a4a80'] },
    { id: 'residential', name: 'RESIDENTIAL', pts: [[0.4, -1.6], [2.6, -1.9], [3.0, -0.6], [2.7, 0.8], [1.2, 1.0], [0.3, 0.3]],
      zones: [{ c: [1.6, -0.5], r: 1.3, h: 4 }], base: 1.6, palette: ['#3e5a3a', '#4e6a40', '#5a5a48', '#6a7050'], parks: [[[1.0, -1.2], [1.6, -1.2], [1.6, -0.7], [1.0, -0.7]]] },
    { id: 'industrial', name: 'INDUSTRIAL', pts: [[-1.9, 0.6], [0.2, 0.9], [0.9, 1.6], [0.6, 2.8], [-1.0, 3.0], [-2.3, 2.3]],
      zones: [{ c: [-0.7, 1.8], r: 1.2, h: 8 }], base: 2.5, palette: ['#5a4630', '#6a5238', '#4a4440', '#7a6040'] }
  ],
  bridges: [{ id: 'a', a: [-0.4, -1.0], b: [0.35, -1.0] }, { id: 'b', a: [-1.2, -0.15], b: [-1.1, 0.68] }, { id: 'c', a: [0.5, 0.5], b: [0.3, 0.95] }]
}, 9.0);
