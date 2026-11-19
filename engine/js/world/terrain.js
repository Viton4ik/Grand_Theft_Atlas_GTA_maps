// Displaced, vertex-coloured terrain clipped to an island polygon (CPU-built, deterministic).
import * as THREE from 'three';
import { inside, edgeDist, bbox } from './geo.js';
import { smooth, clamp } from '../core/util.js';

const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return (h2(i, j) * (1 - u) + h2(i + 1, j) * u) * (1 - v) + (h2(i, j + 1) * (1 - u) + h2(i + 1, j + 1) * u) * v; }
export function fbm(x, y, o = 4) { let a = 0.5, s = 0; for (let k = 0; k < o; k++) { s += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; }

/* o: { res, height(x,z,w) → units, color(x,z,y,w) → [r,g,b], weights(x,z) → object passed to both } */
export function terrain(poly, o) {
  const [x0, z0, x1, z1] = bbox(poly), res = o.res || 220;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, res, res); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3), ins = new Float32Array(n);
  const H = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), z = pos.getZ(i), inn = inside([x, z], poly);
    const w = o.weights(x, z), coast = inn ? smooth(clamp(edgeDist([x, z], poly) / (o.coastFade || 25))) : 0;
    const y = inn ? 0.15 + o.height(x, z, w) * coast : -1.5;
    pos.setY(i, y); H[i] = y; ins[i] = inn ? 1 : 0;
    const c = o.color(x, z, y, w); col.set(c, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aIn', new THREE.BufferAttribute(ins, 1));
  g.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    vertexColors: true,
    uniforms: { uLight: { value: new THREE.Vector3(...(o.light || [0.5, 0.7, 0.3])).normalize() }, uFog: { value: new THREE.Color(o.fog || '#000') }, uFogFar: { value: o.fogFar ?? 1e7 }, uCam: { value: new THREE.Vector3() }, uAmb: { value: o.amb ?? 0.45 } },
    vertexShader: `attribute float aIn; varying float vIn; varying vec3 vC; varying vec3 vN; varying vec3 vW;
      void main(){ vIn = aIn; vC = color; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uLight; uniform vec3 uFog; uniform float uFogFar; uniform vec3 uCam; uniform float uAmb; varying float vIn; varying vec3 vC; varying vec3 vN; varying vec3 vW;
      void main(){ if (vIn < 0.5) discard; float d = uAmb + (1.0 - uAmb) * max(dot(normalize(vN), uLight), 0.0);
        vec3 c = vC * d; c = mix(c, uFog, smoothstep(uFogFar * 0.35, uFogFar, distance(uCam, vW))); gl_FragColor = vec4(c, 1.0); }`
  });
  const mesh = new THREE.Mesh(g, mat);
  const heightAt = (x, z) => { if (!inside([x, z], poly)) return 0; const w = o.weights(x, z); return 0.15 + o.height(x, z, w) * smooth(clamp(edgeDist([x, z], poly) / (o.coastFade || 25))); };
  return { mesh, heightAt };
}
