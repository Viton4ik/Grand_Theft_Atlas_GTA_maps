// Voice-over timeline helpers: cue times come from tools/vo.py (phrase-accurate).
export function cues(TL, ch) {
  const c = TL[ch]; const P = {};
  c.lines.forEach(l => { P[l.id] = l.start; P[l.id + 'e'] = l.end; l.phrases.forEach((p, i) => { P[`${l.id}p${i + 1}`] = p.start; P[`${l.id}p${i + 1}e`] = p.end; }); });
  P.dur = c.dur; return P;
}
// caption = the line being spoken, shown from its first phrase until shortly after its last
export function captionAt(TL, ch, t) {
  for (const l of TL[ch].lines) if (t >= l.start - 0.1 && t < l.end + 0.5) {
    // long lines: show phrase groups so the caption box never exceeds two lines
    if (l.text.length < 90) return l.text;
    const ph = l.phrases; let cur = ph[0].text, out = [];
    for (let i = 1; i < ph.length; i++) { if ((cur + ' ' + ph[i].text).length < 90) cur += ' ' + ph[i].text; else { out.push([cur]); cur = ph[i].text; } }
    out.push([cur]);
    // map groups to time: a group starts at its first phrase
    let idx = 0, acc = 0; const starts = []; ph.forEach((p, i) => { if (i === 0) starts.push(p.start); });
    let k = 0, text = ph[0].text; const groups = [];
    let g = { text: ph[0].text, start: ph[0].start };
    for (let i = 1; i < ph.length; i++) { if ((g.text + ' ' + ph[i].text).length < 90) g.text += ' ' + ph[i].text; else { groups.push(g); g = { text: ph[i].text, start: ph[i].start }; } }
    groups.push(g);
    for (let i = groups.length - 1; i >= 0; i--) if (t >= groups[i].start - 0.1) return groups[i].text;
    return groups[0].text;
  }
  return '';
}
// time at which a word inside a phrase is spoken (character-proportional estimate)
export function wordAt(TL, ch, cue, word) {
  for (const l of TL[ch].lines) l.phrases.forEach((p, i) => { if (`${l.id}p${i + 1}` === cue) wordAt._p = p; });
  const p = wordAt._p; const k = p.text.toLowerCase().indexOf(word.toLowerCase());
  return p.start + (p.end - p.start) * Math.max(0, k) / p.text.length;
}
