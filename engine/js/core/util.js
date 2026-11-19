// Small deterministic helpers. Nothing here may depend on wall-clock time:
// every frame is a pure function of film time t.
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, p) => a + (b - a) * p;
export const inv = (a, b, v) => clamp((v - a) / (b - a));
export const smooth = p => { p = clamp(p); return p * p * (3 - 2 * p); };
export const eio = p => { p = clamp(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
export const eout = p => 1 - Math.pow(1 - clamp(p), 3);
export const ein = p => Math.pow(clamp(p), 3);
export const eback = p => { p = clamp(p); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
export const eexpo = p => { p = clamp(p); return p === 1 ? 1 : 1 - Math.pow(2, -10 * p); };

// mulberry32 seeded PRNG
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const hash = (x, y = 0) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

// keyframe track: [[t, value], ...] with easing between keys; value may be number or array
export function track(keys, t, ease = eio) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1, e] = keys[i + 1];
    if (t <= t1) {
      const p = (e || ease)((t - t0) / (t1 - t0));
      return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], p)) : lerp(v0, v1, p);
    }
  }
  return keys[keys.length - 1][1];
}
// fade-in/out window: 0 before a, ramps in over fi, holds, ramps out over fo before b
export const win = (t, a, b, fi = .4, fo = .4) => Math.min(inv(a, a + fi, t), 1 - inv(b - fo, b, t));
