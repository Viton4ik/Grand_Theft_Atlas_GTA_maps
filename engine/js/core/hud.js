// DOM overlay helpers. Every setter is idempotent and driven only by film time.
export function el(parent, cls, html = '', style = {}) {
  const e = document.createElement('div');
  e.className = 'abs ' + cls; e.innerHTML = html; Object.assign(e.style, style);
  parent.appendChild(e); return e;
}
export const show = (e, o, extra = '') => { e.style.opacity = o; e.style.visibility = o <= 0.001 ? 'hidden' : 'visible'; if (extra !== null) e.style.transform = extra; };

export function chapterCard(ui, { num, game, title, acc }) {
  const e = el(ui, 'chap', `<div class="num">${num}</div><div class="meta"><div class="game">${game}</div><div class="title">${title}</div><div class="bar"></div></div>`);
  e.style.setProperty('--acc', acc);
  const bar = e.querySelector('.bar');
  e.style.transformOrigin = '0 0';
  return (o, slide = 0, compact = 0) => { const sc = 1 - 0.55 * compact; show(e, o, `translate(${-40 * (1 - slide) - 30 * compact}px, ${-24 * compact}px) scale(${sc})`); bar.style.transform = `scaleX(${slide})`; };
}

export function kmCounter(ui) {
  const e = el(ui, 'km', `<div class="lbl">TOTAL AREA</div><div class="val"></div><div class="delta"></div><div class="note">fan-measured · incl. water</div>`);
  const val = e.querySelector('.val'), d = e.querySelector('.delta');
  return (o, v, delta = null) => {
    show(e, o, null);
    val.innerHTML = v.toFixed(2) + '<small>km²</small>';
    if (delta == null) d.textContent = '';
    else { d.className = 'delta ' + (delta >= 0 ? 'up' : 'down'); d.textContent = (delta >= 0 ? '▲ +' : '▼ ') + delta.toFixed(2); }
  };
}

export function label(ui, text, cls = 'mlbl', tick = false) {
  const e = el(ui, cls + ' ctr', text + (tick ? '<div class="tick"></div>' : ''));
  return (x, y, o, s = 1) => { e.style.left = x + 'px'; e.style.top = y + 'px'; show(e, o, `translate(-50%,-50%) scale(${s})`); };
}

export function caption(ui) {
  const e = el(ui, 'cap', '');
  // burned-in captions only when ?caps=1; the delivered film uses separate, switchable subtitle tracks (SRT)
  const on = new URLSearchParams(location.search).get('caps') === '1';
  return (text, o = 1) => { if (!on) text = ''; if (e.textContent !== text) e.textContent = text; show(e, text ? o : 0, null); };
}

export function stamp(ui, text, x, y, { rot = -8, big = false, color, normal = false } = {}) {
  const e = el(ui, 'stamp ctr' + (big ? ' big' : ''), text, { left: x + 'px', top: y + 'px' });
  if (normal) { e.style.mixBlendMode = 'normal'; e.style.background = 'rgba(0,0,0,.35)'; e.style.textShadow = '0 0 18px ' + (color || '#d1172b'); e.style.boxShadow = '0 0 30px ' + (color || '#d1172b'); }
  if (color) { e.style.color = color; e.style.borderColor = color; }
  // p: 0 → hidden, slams in from 2.4× scale
  return p => { const s = p <= 0 ? 0 : 1 + 1.4 * Math.pow(1 - Math.min(1, p * 3), 3); show(e, p > 0 ? Math.min(1, p * 4) : 0, `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`); };
}

export function excuseBoard(ui, rows) {
  const e = el(ui, 'board', `<h4>WHY IS THE BRIDGE <span>CLOSED?</span></h4>` + rows.map((r, i) => `<div class="row"><b>#${i + 1}</b>${r[0]}<i>${r[1]}</i></div>`).join(''));
  const rs = [...e.querySelectorAll('.row')];
  return (o, n, slide = 1) => { show(e, o, `translateX(${(1 - slide) * 560}px) rotate(1.5deg)`); rs.forEach((r, i) => r.style.opacity = i < n ? 1 : 0); };
}

// Stylised radars per era (original drawings, not game assets).
export function radar(ui, kind, accent = '#ffcf4a') {
  const e = el(ui, 'radar', '');
  const svgs = {
    arrow: `<svg viewBox="-100 -100 200 200"><polygon points="0,-80 46,30 0,8 -46,30" fill="${accent}" stroke="#000" stroke-width="8"/></svg>`,
    round: `<svg viewBox="-100 -100 200 200"><defs><clipPath id="rc0"><circle r="90"/></clipPath></defs><circle r="92" fill="rgba(10,14,20,.72)" stroke="#fff" stroke-width="5"/><g clip-path="url(#rc0)"><g class="map"></g></g>
            <circle r="92" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/><text y="-70" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="22" fill="#fff">N</text>
            <polygon points="0,-14 10,12 0,6 -10,12" fill="${accent}" stroke="#000" stroke-width="2"/></svg>`,
    gps: `<svg viewBox="-100 -100 200 200"><defs><clipPath id="rc"><circle r="90"/></clipPath></defs><circle r="92" fill="rgba(14,16,24,.8)" stroke="#d9dde6" stroke-width="4"/>
            <g clip-path="url(#rc)"><g class="map"></g><path class="route" d="M0,0 L0,-40 L36,-40 L36,-110" stroke="#b26bff" stroke-width="9" fill="none" stroke-linejoin="round"/></g>
            <polygon points="0,-14 10,12 0,6 -10,12" fill="#fff" stroke="#000" stroke-width="2"/></svg>`
  };
  e.innerHTML = svgs[kind];
  const map = e.querySelector('.map');
  if (map) { let s = ''; for (let i = -6; i <= 6; i++) s += `<line x1="${i * 18}" y1="-120" x2="${i * 18}" y2="120" stroke="rgba(255,255,255,.18)" stroke-width="3"/><line x1="-120" y1="${i * 18}" x2="120" y2="${i * 18}" stroke="rgba(255,255,255,.18)" stroke-width="3"/>`; map.innerHTML = s; }
  return (o, rot = 0, drift = 0) => { show(e, o, null); if (map) map.setAttribute('transform', `rotate(${rot}) translate(0 ${drift % 18})`); if (kind === 'arrow') e.querySelector('svg').style.transform = `rotate(${rot}deg)`; };
}

// deterministic rain overlay (canvas), intensity 0..1
export function rain(ui, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'abs'; c.style.left = '0'; c.style.top = '0'; ui.appendChild(c);
  const g = c.getContext('2d');
  return (k, t) => {
    g.clearRect(0, 0, W, H); if (k <= 0) return;
    g.strokeStyle = 'rgba(200,220,255,0.55)'; g.lineWidth = 2;
    const n = Math.floor(420 * k);
    for (let i = 0; i < n; i++) {
      const sx = (Math.sin(i * 12.9898) * 43758.5453) % 1, sy = (Math.sin(i * 78.233) * 12345.678) % 1, sp = 0.8 + Math.abs((Math.sin(i * 3.7) * 999) % 1) * 0.6;
      const x = (Math.abs(sx) * W + t * 120) % W, y = (Math.abs(sy) * H + t * 1700 * sp) % (H + 60) - 30;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 7, y + 26); g.stroke();
    }
  };
}
