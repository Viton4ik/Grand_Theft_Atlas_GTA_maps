# Phrase-level TTS: each [pause]/[beat]-separated phrase is synthesized alone, so every phrase has an exact cue time.
import json, sys, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
ROOT = '/home/claude/gta-maps/'
k = Kokoro('/home/claude/tts/kokoro.onnx', '/home/claude/tts/voices.bin')
spec = json.load(open(ROOT + 'tools/spec.json'))
SR = 24000; PAUSE = {'pause': 0.34, 'beat': 0.72}
tl = json.load(open(ROOT + 'engine/data/timeline.json')) if len(sys.argv) > 2 else {}
try: tl = json.load(open(ROOT + 'engine/data/timeline.json'))
except Exception: tl = {}
for ch in sys.argv[1].split(','):
    c = spec[ch]; out = [np.zeros(int(c['lead'] * SR), np.float32)]; t = c['lead']; lines = []
    for ln in c['lines']:
        if ln['gap']: out.append(np.zeros(int(ln['gap'] * SR), np.float32)); t += ln['gap']
        parts = re.split(r'\s*\[(pause|beat)\]\s*', ln['text'])
        phrases = []; ls = t
        for i, p in enumerate(parts):
            if i % 2 == 1: d = PAUSE[p]; out.append(np.zeros(int(d * SR), np.float32)); t += d; continue
            if not p.strip(): continue
            s, sr = k.create(p.strip(), voice='bm_george', speed=1.04, lang='en-gb')
            nz = np.where(np.abs(s) > 0.01)[0]; s = s[max(0, nz[0] - 600): nz[-1] + 1200] if len(nz) else s   # trim silences
            out.append(s.astype(np.float32)); phrases.append({'text': p.strip(), 'start': round(t, 3), 'end': round(t + len(s) / SR, 3)}); t += len(s) / SR
        lines.append({'id': ln['id'], 'text': ' '.join(ph['text'] for ph in phrases), 'start': round(ls, 3), 'end': round(t, 3), 'phrases': phrases})
    out.append(np.zeros(int(c['tail'] * SR), np.float32)); t += c['tail']
    a = np.concatenate(out); a = a / max(1e-6, np.abs(a).max()) * 0.89
    sf.write(ROOT + f'audio/{ch}_vo.wav', a, SR)
    tl[ch] = {'dur': round(t, 3), 'lines': lines}
    print(ch, 'dur', round(t, 2)); [print('  ', l['id'], l['start'], l['end'], [(p['start']) for p in l['phrases']]) for l in lines]
json.dump(tl, open(ROOT + 'engine/data/timeline.json', 'w'), indent=1)
