import http from 'http'; import fs from 'fs'; import path from 'path';
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png' };
export function serve(root, port) {
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
      r.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f));
    }).listen(port, () => res(s));
  });
}
