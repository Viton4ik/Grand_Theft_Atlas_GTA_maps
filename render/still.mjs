// usage: node render/still.mjs <shot> <t1,t2,...> [w] [h]
import { chromium } from 'playwright-core'; import { serve } from './serve.mjs'; import path from 'path'; import fs from 'fs';
const [shot, ts, w = 1920, h = 1080] = process.argv.slice(2);
const root = path.resolve('engine'); const srv = await serve(root, 8790);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); }); p.on('pageerror', e => console.log('pageerror:', e.message, e.stack));
await p.goto(`http://localhost:8790/?shot=${shot}&w=${w}&h=${h}${process.env.CAM ? "&cam=" + process.env.CAM : ""}`); await p.waitForFunction('window.READY === true', null, { timeout: 60000 });
fs.mkdirSync('out/stills', { recursive: true });
for (const t of ts.split(',').map(Number)) { const t0 = Date.now(); await p.evaluate(t => window.renderAt(t), t); await p.screenshot({ path: `out/stills/${shot}_${t}.png` }); console.log(`${shot} t=${t} ${Date.now() - t0}ms`); }
await b.close(); srv.close();
