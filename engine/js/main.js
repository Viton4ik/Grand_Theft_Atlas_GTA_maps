// Boot: builds renderer + post chain, loads a shot module, exposes window.renderAt(t).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { lineMats } from './world/geo.js';

const P = new URLSearchParams(location.search);
const W = +P.get('w') || 1920, H = +P.get('h') || 1080;
const shotName = P.get('shot') || 'lc3';

const wrap = document.getElementById('wrap'), ui = document.getElementById('ui');
ui.style.width = W + 'px'; ui.style.height = H + 'px';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
wrap.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, W / H, 1, 30000);

// Final grade: colour lift/gain, saturation, vignette, film grain, optional pixelation + scanlines (1997 look)
const Grade = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) },
    uVig: { value: 0.55 }, uGrain: { value: 0.05 }, uPixel: { value: 0 }, uScan: { value: 0 },
    uLift: { value: new THREE.Vector3(0, 0, 0) }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uSat: { value: 1 }, uCA: { value: 0.0015 }, uFade: { value: 1 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; uniform float uVig; uniform float uGrain; uniform float uPixel; uniform float uScan;
    uniform vec3 uLift; uniform vec3 uGain; uniform float uSat; uniform float uCA; uniform float uFade; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      if (uPixel > 0.5) { vec2 b = uRes / uPixel; uv = (floor(uv * b) + 0.5) / b; }
      vec2 dc = uv - 0.5;
      vec3 c;
      c.r = texture2D(tDiffuse, uv + dc * uCA).r; c.g = texture2D(tDiffuse, uv).g; c.b = texture2D(tDiffuse, uv - dc * uCA).b;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = uLift + c * uGain;
      if (uScan > 0.0) { float s = 0.5 + 0.5 * sin(vUv.y * uRes.y * 3.14159 / 3.0); c *= 1.0 - uScan * (1.0 - s); }
      c *= 1.0 - uVig * smoothstep(0.35, 0.95, length(dc * vec2(1.0, uRes.y / uRes.x) * 1.6));
      c += (h(vUv * uRes + fract(uTime * 7.13) * 100.0) - 0.5) * uGrain;
      gl_FragColor = vec4(c * uFade, 1.0);
    }`
};

// Tilt-shift: blur away from a horizontal focus band (miniature / diorama feel)
const Tilt = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(W, H) }, uAmt: { value: 0 }, uFocus: { value: 0.5 }, uBand: { value: 0.22 } },
  vertexShader: Grade.vertexShader,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uAmt; uniform float uFocus; uniform float uBand; varying vec2 vUv;
    void main(){
      float b = smoothstep(uBand, uBand + 0.3, abs(vUv.y - uFocus)) * uAmt;
      if (b < 0.01) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec4 acc = vec4(0.0); float wsum = 0.0;
      for (int i = 0; i < 12; i++) { float a = float(i) * 2.39996; float r = sqrt(float(i) + 0.5) / 3.5;
        vec2 o = vec2(cos(a), sin(a)) * r * b * 9.0 / uRes; acc += texture2D(tDiffuse, vUv + o); wsum += 1.0; }
      gl_FragColor = acc / wsum;
    }`
};
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.9, 0.55, 0.72);
composer.addPass(bloom);
const tilt = new ShaderPass(Tilt); composer.addPass(tilt);
const out = new OutputPass(); composer.addPass(out);
const grade = new ShaderPass(Grade); composer.addPass(grade);

const ctx = { THREE, scene, camera, renderer, ui, W, H, bloom, grade: grade.uniforms, tilt: tilt.uniforms, P };

// project a world point to overlay pixels
const v = new THREE.Vector3();
ctx.project = (x, y, z) => { camera.updateMatrixWorld(); v.set(x, y, z).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z < 1]; };

ctx.TL = await (await fetch('data/timeline.json')).json();
const mod = await import(`./shots/${shotName}.js`);
const shot = await mod.create(ctx);

window.FILM = { duration: shot.duration, stills: shot.stills || [] };
window.renderAt = t => {
  shot.update(t);
  if (P.get('cam')) { const c = P.get('cam').split(',').map(Number); camera.position.set(c[0], c[1], c[2]); camera.lookAt(c[3], c[4], c[5]); }
  grade.uniforms.uTime.value = t;
  lineMats.forEach(m => m.resolution.set(W, H));
  scene.traverse(o => { const u = o.material && o.material.uniforms; if (u) { if (u.uTime) u.uTime.value = t; if (u.uCam) u.uCam.value.copy(camera.position); } });
  composer.render();
  return true;
};
await document.fonts.ready;
window.renderAt(+P.get('t') || 0);
window.READY = true;
