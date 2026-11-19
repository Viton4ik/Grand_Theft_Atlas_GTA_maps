// usage: node render/video.mjs <shot> <frame0> <frame1> <fps> <out.mp4> [w] [h] [port]   (frames are absolute indices; t = f / fps)
// Deterministic frame-by-frame capture piped into ffmpeg (H.264, yuv420p).
import { chromium } from 'playwright-core'; import { serve } from './serve.mjs'; import { spawn } from 'child_process'; import path from 'path';
const [shot, f0, f1, fps, out, w = 1920, h = 1080, port = 8791] = process.argv.slice(2);
const t0 = f0 / fps;
const srv = await serve(path.resolve('engine'), +port);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('pageerror', e => console.log('pageerror:', e.message));
await p.goto(`http://localhost:${port}/?shot=${shot}&w=${w}&h=${h}&t=${t0}`); await p.waitForFunction('window.READY === true', null, { timeout: 120000 });
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', fps, '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
const n = f1 - f0, T = Date.now();
for (let i = 0; i < n; i++) {
  const t = (+f0 + i) / fps;
  await p.evaluate(t => window.renderAt(t), t);
  const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 30 === 0) console.log(`${i}/${n} ${((Date.now() - T) / (i + 1)).toFixed(0)} ms/frame`);
}
ff.stdin.end(); await new Promise(r => ff.on('close', r));
await b.close(); srv.close(); console.log('done', out, ((Date.now() - T) / 1000).toFixed(0) + 's');
