// Polygon morphing helpers (real outline → game schematic).
// resample a closed polygon to n points by arc length
export function resample(poly, n) {
  const P = [...poly, poly[0]], L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const out = []; let j = 1;
  for (let k = 0; k < n; k++) { const d = L[L.length - 1] * k / n; while (L[j] < d) j++; const f = (d - L[j - 1]) / (L[j] - L[j - 1] || 1); out.push([P[j - 1][0] + (P[j][0] - P[j - 1][0]) * f, P[j - 1][1] + (P[j][1] - P[j - 1][1]) * f]); }
  return out;
}
export const signedArea = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a; };
export function align(a, b) {   // same winding + best cyclic shift of b onto a
  if (Math.sign(signedArea(a)) !== Math.sign(signedArea(b))) b = b.slice().reverse();
  let best = 0, bd = Infinity; const n = a.length;
  for (let s = 0; s < n; s += 2) { let d = 0; for (let i = 0; i < n; i += 4) { const q = b[(i + s) % n]; d += (a[i][0] - q[0]) ** 2 + (a[i][1] - q[1]) ** 2; } if (d < bd) { bd = d; best = s; } }
  return b.map((_, i) => b[(i + best) % n]);
}

