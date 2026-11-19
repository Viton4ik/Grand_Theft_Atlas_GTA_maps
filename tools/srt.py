# Switchable subtitles: SRT per chapter and for a joined cut, from the phrase-accurate VO timeline.
import json, sys
ROOT = '/home/claude/gta-maps/'
TL = json.load(open(ROOT + 'engine/data/timeline.json'))
def ts(s): h = int(s // 3600); m = int(s % 3600 // 60); return f"{h:02d}:{m:02d}:{s % 60:06.3f}".replace('.', ',')
def cues(ch, off=0.0, maxlen=84):
    out = []
    for l in TL[ch]['lines']:
        g = None
        for p in l['phrases']:
            if g and len(g['text']) + 1 + len(p['text']) <= maxlen: g['text'] += ' ' + p['text']; g['end'] = p['end']
            else:
                if g: out.append(g)
                g = {'text': p['text'], 'start': p['start'], 'end': p['end']}
        out.append(g)
    for i, c in enumerate(out):   # hold each subtitle until the next one (max +0.8 s)
        nxt = out[i + 1]['start'] if i + 1 < len(out) else c['end'] + 0.8
        c['end'] = min(nxt - 0.05, c['end'] + 0.8); c['start'] += off; c['end'] += off
    return out
def wrap(t, n=42):
    if len(t) <= n: return t
    k = t.rfind(' ', 0, len(t) // 2 + 8); return t[:k] + '\n' + t[k + 1:]
def write(path, items):
    with open(path, 'w') as f:
        for i, c in enumerate(items, 1): f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{wrap(c['text'])}\n\n")
chs = sys.argv[1].split(','); off = 0.0; allc = []
for ch in chs:
    write(ROOT + f'out/chapters/{ch}.en.srt', cues(ch)); allc += cues(ch, off); off += TL[ch]['dur']
write(ROOT + f'out/chapters/{"-".join(chs)}.en.srt', allc)
print('srt written', len(allc), 'cues, total', round(off, 2), 's')
