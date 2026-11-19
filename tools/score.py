# Per-chapter score + SFX, synced to the same VO cues the shots use, ducked under the voice, loudness-normalised.
import json, sys, numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import resample_poly
from synth import *

ROOT = '/home/claude/gta-maps/'
TL = json.load(open(ROOT + 'engine/data/timeline.json'))

def cues(ch):
    c = TL[ch]; P = {'dur': c['dur']}
    for l in c['lines']:
        P[l['id']] = l['start']; P[l['id'] + 'e'] = l['end']
        for i, p in enumerate(l['phrases']): P[f"{l['id']}p{i+1}"] = p['start']; P[f"{l['id']}p{i+1}e"] = p['end']
    return P

def buf(d): return np.zeros((int(d * SR) + SR, 2), np.float32)

AM = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]   # Am F C G

def chiptune(dur, bpm=128, root_shift=0, seed=0, vol=1.0):
    """1997 top-down era: square arps, triangle bass, noise drums."""
    out = buf(dur); beat = 60 / bpm; step = beat / 4; bar = beat * 4
    for b in range(int(dur / bar) + 1):
        bass, chord = AM[b % 4]; t0 = b * bar
        for s in range(16):
            ts = t0 + s * step
            if ts > dur: break
            n = chord[[0, 1, 2, 1][s % 4]] + 12 + root_shift + (12 if s in (6, 14) else 0)
            place(out, stereo(chip(n, step * 0.9, 0.125, 0.11 * vol), -0.2), ts)
            if s % 2 == 0: place(out, stereo(tri_bass(bass - 12 + root_shift + (7 if s in (6, 14) else 0), step * 1.8, 0.28 * vol)), ts)
            if s % 4 == 0 and s % 8 == 0: place(out, stereo(kick(0.3, 0.8) * vol * 0.7), ts)
            if s % 8 == 4: place(out, stereo(snare() * vol * 0.35, 0.1), ts)
            place(out, stereo(hat() * vol * (0.35 if s % 2 else 0.18), 0.3), ts)
        # little lead melody every other bar
        if b % 2 == 1:
            for i, (o, ln) in enumerate([(0, 2), (2, 1), (3, 1), (5, 2), (7, 2)]):
                place(out, stereo(chip(chord[i % 3] + 24 + root_shift, step * ln * 0.95, 0.25, 0.06 * vol, vib=0.004), 0.25), t0 + 8 * step + o * step)
    return out

def cinematic(dur, chords, vol=1.0, cutoff=1600):
    out = buf(dur); seg = dur / len(chords)
    for i, (b, ch) in enumerate(chords):
        place(out, stereo(pad(ch, seg + 1.5, 0.11 * vol, cutoff, 1.2, 1.5)), i * seg)
        place(out, stereo(sub(b - 12, seg + 0.8, 0.22 * vol)), i * seg)
        # shimmer arps
        for k in range(int(seg / 0.25)):
            place(out, stereo(pluck(ch[k % 3] + 24, 0.4, 0.035 * vol, 6000), [-0.5, 0.5][k % 2]), i * seg + k * 0.25)
    return reverb(out, 0.3, 1.2)

def groove(dur, bpm=96, vol=1.0):
    """map-documentary groove: plucks, soft kick, shaker."""
    out = buf(dur); beat = 60 / bpm
    prog = [(50, [62, 65, 69]), (46, [58, 62, 65]), (53, [60, 65, 69]), (48, [60, 64, 67])]
    for b in range(int(dur / (beat * 4)) + 1):
        bass, ch = prog[b % 4]; t0 = b * beat * 4
        for s in range(8):
            ts = t0 + s * beat / 2
            if ts > dur: break
            if s in (0, 3, 5): place(out, stereo(pluck(ch[(s // 2) % 3] + 12, 0.5, 0.09 * vol, 3000), [-0.4, 0.4][s % 2]), ts)
            if s % 4 == 0: place(out, stereo(kick(0.3, 0.6) * 0.55 * vol), ts)
            place(out, stereo(shaker() * vol * 0.7, 0.2), ts)
            if s in (0, 4): place(out, stereo(sub(bass, beat * 1.9, 0.18 * vol)), ts)
    return reverb(out, 0.18)

def fade(x, a, b, d, sr=SR):  # fade region [a,b] linear to gain d→ (applied in place, returns x)
    i, j = int(a * sr), int(b * sr); j = min(j, len(x));
    if i < j: x[i:j] *= np.linspace(1, d, j - i)[:, None]
    if d == 0: x[j:] = 0
    return x

def ch00():
    C = cues('ch00'); D = C['dur']; m = buf(D); s = buf(D)
    tReal = C['L1e'] + 0.4; tState = C['L2p3']; tTitle = C['L3p2']
    a = chiptune(tReal + 1.0, 128); a = fade(a, tReal - 0.8, tReal + 0.8, 0.0); a[:int((tReal + 1.0) * SR)] = sweep_lp(a[:int((tReal + 1.0) * SR)], 9000, 9000)
    place(m, a * 0.9, 0)
    cin = cinematic(D - tReal + 2, [(57, [57, 60, 64, 69]), (53, [53, 57, 60, 65]), (48, [48, 55, 60, 64]), (55, [55, 59, 62, 67])], 1.0, 1400)
    cin = fade(cin, 0, 0.01, 1.0); cin[:int(2.0 * SR)] *= np.linspace(0, 1, int(2.0 * SR))[:, None]
    place(m, cin * 0.85, tReal - 0.6)
    place(s, crt_on(0.4), 0.15)
    place(s, whoosh(1.4, True, 0.45), C['L1p2'] - 0.3)
    place(s, whoosh(2.2, True, 0.55), tReal + 0.8)
    place(s, ping(88, 0.3), C['L2p1'] + 1.0)
    place(s, riser(1.2, 0.3), tState - 1.2); place(s, boom(0.55), tState)
    place(s, ping(96, 0.25), C['L3'] + 2.2); place(s, ping(91, 0.25), C['L3'] + 4.6)
    place(s, riser(1.6, 0.45), tTitle - 1.6); place(s, boom(1.0), tTitle)
    return m, s, D

def ch01():
    C = cues('ch01'); D = C['dur']; m = buf(D); s = buf(D)
    tDive, tPix = C['L3'], C['L3'] + 2.0
    g = groove(tDive + 1.5, 96); g = fade(g, tDive - 0.4, tDive + 1.2, 0.0); place(m, g * 0.9, 0)
    ct = chiptune(D - tPix + 1, 140, root_shift=3, seed=1)
    i2 = int((C['L4p2'] - tPix) * SR)                  # tension: drop to bass + ticks on "Remember that idea"
    ct[i2:] *= 0.35
    place(m, ct, tPix - 0.1)
    for k in range(int((D - C['L4p2']) / 0.25)): place(m, stereo(hat() * 0.5), C['L4p2'] + k * 0.25)
    place(s, ping(84, 0.3), 2.6)
    place(s, whoosh(4.0, True, 0.25), 4.2)
    for i in range(3): place(s, pop(0.4), C['L1p2'] + 0.5 + i * 0.35); place(s, boing(0.28), C['L1p2'] + 0.7 + i * 0.35)
    for cue in ('L2', 'L2p2', 'L2p3'): place(s, blip(84, 0.08, 0.2), C[cue]); place(s, blip(88, 0.1, 0.2), C[cue] + 0.08)
    place(s, whoosh(2.0, False, 0.6), tDive - 0.2); place(s, crt_on(0.45), tPix - 0.4)
    for k in range(10): place(s, flap(0.16), tPix + 0.3 + k * 0.25)
    place(s, error_buzz(0.22), C['L3p2'] + 0.05); place(s, blip(91, 0.12, 0.25), C['L3p3']); place(s, chime(0.2), C['L3p4'] + 0.6)
    for zi in range(2):
        for i in range(3): place(s, clunk(0.45), C['L4'] + 1.6 + zi * 0.6 + i * 0.18 + 0.25)
    place(s, whoosh(0.6, True, 0.4), C['L4p2'] - 0.1)
    for i in range(4): place(s, stamp_hit(0.55), C['L4p4'] + i * 0.22)
    return m, s, D


def wordat(ch, cue, word):
    for l in TL[ch]['lines']:
        for i, p in enumerate(l['phrases']):
            if f"{l['id']}p{i+1}" == cue:
                k = max(0, p['text'].lower().find(word.lower())); return p['start'] + (p['end'] - p['start']) * k / len(p['text'])

def mod69(dur, bpm=126, vol=1.0):
    """swinging-London beat group: organ chords, walking bass, shuffle drums."""
    out = buf(dur); beat = 60 / bpm
    prog = [(52, [64, 67, 71]), (57, [64, 69, 72]), (50, [62, 66, 69]), (55, [62, 67, 71])]   # Em Am D G
    for b in range(int(dur / (beat * 4)) + 1):
        bass, ch = prog[b % 4]; t0 = b * beat * 4
        for s in range(8):
            ts = t0 + s * beat / 2 + (0.06 if s % 2 else 0)
            if ts > dur: break
            if s in (1, 3, 5, 7):
                org = np.zeros(int(beat * 0.45 * SR))
                for n in ch: org = org + osc('sq', hz(n), beat * 0.45, 0.5) * 0.3 + osc('sin', hz(n) * 2, beat * 0.45) * 0.2
                place(out, stereo(lp(org, 2600) * env(len(org), 0.005, 0.1, 0.6, 0.05) * 0.07 * vol, 0.2), ts)
            if s % 2 == 0: place(out, stereo(tri_bass(bass - 12 + [0, 3, 5, 7][s // 2], beat * 0.9, 0.3 * vol)), ts)
            if s in (0, 4): place(out, stereo(kick(0.3, 0.7) * 0.6 * vol), ts)
            if s in (2, 6): place(out, stereo(snare() * 0.32 * vol, 0.1), ts)
            place(out, stereo(hat() * 0.22 * vol, -0.3), ts)
    return reverb(out, 0.2)

def electro(dur, bpm=134, vol=1.0):
    out = buf(dur); beat = 60 / bpm; step = beat / 4
    prog = [45, 45, 48, 43]
    for b in range(int(dur / (beat * 4)) + 1):
        r = prog[b % 4]; t0 = b * beat * 4
        for s in range(16):
            ts = t0 + s * step
            if ts > dur: break
            n = r + [0, 12, 7, 12, 3, 12, 7, 15][s % 8]
            x = lp(osc('saw', hz(n), step * 0.9) * env(int(step * 0.9 * SR), 0.002, 0.06, 0.3, 0.02), 1800 + 1400 * (s % 4 == 0))
            place(out, stereo(x * 0.09 * vol, [-0.3, 0.3][s % 2]), ts)
            if s % 4 == 0: place(out, stereo(kick(0.3, 1.0) * 0.75 * vol), ts)
            if s % 8 == 4: place(out, stereo(snare() * 0.35 * vol), ts)
            if s % 2 == 1: place(out, stereo(hat() * 0.25 * vol, 0.3), ts)
    return delay(out, beat * 0.75, 0.3, 0.2)

def rain_noise(dur, vol=0.12):
    n = RNG.uniform(-1, 1, int(dur * SR)); x = bp(n, 400, 6000) * vol
    return np.stack([x, np.roll(x, 900)], 1).astype(np.float32)

def thunder(vol=0.6):
    t = t_(3.0); x = lp(RNG.uniform(-1, 1, len(t)), 220) * (np.exp(-t * 1.2) * (0.6 + 0.4 * np.sin(t * 9) ** 2))
    return reverb(stereo(x * vol * 3), 0.4, 1.4)

def glitch(vol=0.35):
    t = t_(0.35); x = np.sign(np.sin(2 * np.pi * 70 * t)) * RNG.uniform(0.3, 1, len(t)) * (np.floor(t * 40) % 2)
    return stereo(hp(x, 300) * np.exp(-t * 6) * vol)

def stab(note, vol=0.3):
    x = np.zeros(int(0.8 * SR))
    for n in (note, note + 7, note + 12): x = x + osc('saw', hz(n), 0.8)
    return reverb(stereo(lp(x / 3, 3000) * np.exp(-t_(0.8) * 5) * vol), 0.3)

def pew(vol=0.25):
    t = t_(0.25); f = 1800 * np.exp(-t * 14) + 200; ph = np.cumsum(f) / SR
    return stereo(np.sign(np.sin(2 * np.pi * ph)) * np.exp(-t * 10) * vol)

def tune(vol=0.12):
    t = t_(0.6); f = 300 + 2200 * t / 0.6; ph = np.cumsum(f) / SR
    return stereo((np.sin(2 * np.pi * ph) * 0.4 + bp(RNG.uniform(-1, 1, len(t)), 1000, 4000) * 0.6) * np.sin(np.pi * t / 0.6) * vol)

def ch02():
    C = cues('ch02'); D = C['dur']; m = buf(D); s = buf(D)
    tPix = C['L2'] + 1.6; tUp = C['L3p2'] - 0.4
    a = mod69(tUp + 1.5, 126); a = fade(a, tUp - 0.2, tUp + 1.2, 0.0); a[:int(1.5 * SR)] *= np.linspace(0, 1, int(1.5 * SR))[:, None]; place(m, a, 0)
    cin = cinematic(D - tUp + 1, [(52, [52, 55, 59, 64]), (48, [48, 52, 55, 60])], 0.9, 1100); cin[:int(1.5 * SR)] *= np.linspace(0, 1, int(1.5 * SR))[:, None]
    i3 = int((C['L3p4'] - tUp + 0.2) * SR); cin[i3:] = sweep_lp(cin[i3:], 1200, 300); place(m, cin, tUp - 0.4)
    place(s, stamp_hit(0.7), wordat('ch02', 'L1p2', 'real name') + 0.1)
    place(s, whoosh(1.4, False, 0.45), C['L1p2'] + 0.5); place(s, crt_on(0.4), tPix - 0.6)
    place(s, ping(86, 0.3), C['L2p2'])
    for i in range(3): place(s, pop(0.35), wordat('ch02', 'L2p2', 'real street') + i * 0.18)
    place(s, blip(76, 0.15, 0.25), wordat('ch02', 'L2p2', 'driving')); place(s, blip(72, 0.2, 0.25), wordat('ch02', 'L2p2', 'driving') + 0.15)
    for i, n in enumerate([72, 76, 79, 84]): place(s, blip(n, 0.1, 0.2), C['L2p3'] + 0.3 + i * 0.08)
    place(s, clunk(0.5), wordat('ch02', 'L3p1', '1961') + 0.1); place(s, whoosh(0.6, True, 0.3), C['L3'] + 0.1)
    place(s, whoosh(2.2, True, 0.5), tUp)
    for i in range(4): place(s, pop(0.3), C['L3p2'] + 1.6 + i * 0.1)
    place(s, boing(0.25), C['L3p3'])
    place(s, rain_noise(D - C['L3p4'] + 0.2, 0.2), C['L3p4']); place(s, thunder(0.7), C['L3p4'] + 0.3)
    return m, s, D

def ch03():
    C = cues('ch03'); D = C['dur']; m = buf(D); s = buf(D)
    tCity, tBack = C['L2'] - 0.2, C['L3'] - 0.2
    # search: low pulse
    for k in range(int(tCity / 0.5)): place(m, stereo(sub(40, 0.45, 0.25)), k * 0.5)
    e = electro(tBack - tCity + 0.6, 134); e = fade(e, tBack - tCity - 0.3, tBack - tCity + 0.3, 0.0); place(m, e, tCity)
    for k in range(int((C['L3p2'] - tBack) / 0.5)): place(m, stereo(sub(40, 0.45, 0.22)), tBack + k * 0.5)
    place(s, stamp_hit(0.8), wordat('ch03', 'L1p2', 'anywhere') + 0.1)
    for i in range(5): place(s, blip(64, 0.06, 0.12), 0.6 + i * 0.9)
    place(s, glitch(0.45), tCity - 0.1); place(s, glitch(0.45), tBack - 0.1)
    for cue, n in (('L2p2', 57), ('L2p3', 60), ('L2p4', 52)): place(s, stab(n, 0.3), C[cue])
    for d in range(3):
        for k in range(3): place(s, pop(0.25), C['L2p5'] + d * 0.25 + k * 0.1)
    place(s, tune(0.18), wordat('ch03', 'L2p5', 'radio'))
    for i in range(3): place(s, pew(0.22), C['L2p6'] + 0.1 + i * 0.2)
    place(s, boom(0.4), C['L2p6'] + 0.3)
    for i in range(20): place(s, blip(84 + (i % 5), 0.05, 0.12), C['L3'] + 0.2 + i * 0.08)
    # "Exactly." → everything stops dead
    i = int((C['L3p2'] - 0.05) * SR); m[i:] = 0
    return m, s, D

def lc01(dur, bpm=92, vol=1.0):
    """GTA III-era: moody NY boom-bap, minor piano, vinyl crackle."""
    out = buf(dur); beat = 60 / bpm
    prog = [(45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62]), (40, [55, 59, 64])]
    for b in range(int(dur / (beat * 4)) + 1):
        bass, ch = prog[b % 4]; t0 = b * beat * 4
        for k, n in enumerate(ch): place(out, stereo(pluck(n, 1.6, 0.07 * vol, 2200), -0.2 + k * 0.2), t0 + k * 0.02)
        place(out, stereo(pluck(ch[2] + 12, 0.8, 0.04 * vol, 3000), 0.3), t0 + beat * 2.5)
        for s_ in range(8):
            ts = t0 + s_ * beat / 2 + (0.03 if s_ % 2 else 0)
            if ts > dur: break
            if s_ in (0, 3, 5): place(out, stereo(kick(0.35, 1.0) * 0.7 * vol), ts)
            if s_ in (2, 6): place(out, stereo(snare() * 0.45 * vol), ts)
            place(out, stereo(hat() * 0.2 * vol, 0.2), ts)
        place(out, stereo(sub(bass, beat * 3.8, 0.24 * vol)), t0)
    crack = (RNG.uniform(-1, 1, len(out)) * (RNG.random(len(out)) > 0.9993)).astype(np.float32) * 0.25
    out += np.stack([crack, crack], 1)
    return reverb(out, 0.15)

def synthwave(dur, bpm=108, vol=1.0):
    """Vice City 1986: gated drums, saw-pad, octave bass, bright arp."""
    out = buf(dur); beat = 60 / bpm; step = beat / 4
    prog = [(45, [57, 60, 64, 69]), (41, [53, 57, 60, 65]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 67])]
    for b in range(int(dur / (beat * 4)) + 1):
        bass, ch = prog[b % 4]; t0 = b * beat * 4
        place(out, stereo(pad(ch, beat * 4.4, 0.08 * vol, 2600, 0.3, 0.6)), t0)
        for s_ in range(16):
            ts = t0 + s_ * step
            if ts > dur: break
            place(out, stereo(lp(osc('saw', hz(bass - 12 + (12 if s_ % 2 else 0)), step * 0.9) * env(int(step * 0.9 * SR), 0.003, 0.05, 0.4, 0.02), 900) * 0.14 * vol), ts)
            place(out, stereo(pluck(ch[s_ % 4] + 12, step * 1.5, 0.045 * vol, 5000), [-0.5, 0.5][s_ % 2]), ts)
            if s_ % 8 == 0: place(out, stereo(kick(0.35, 1.0) * 0.7 * vol), ts)
            if s_ % 8 == 4: place(out, reverb(stereo(snare() * 0.55 * vol), 0.45, 1.3)[:int(0.35 * SR)], ts)
            if s_ % 2 == 1: place(out, stereo(hat() * 0.18 * vol, 0.3), ts)
    return delay(out, beat * 0.75, 0.3, 0.18)

def wind(dur, vol=0.2):
    t = t_(dur); n = RNG.uniform(-1, 1, len(t)); x = sweep_lp(n, 300, 1400, 40) * (0.6 + 0.4 * np.sin(t * 0.9) * np.sin(t * 0.37))
    return np.stack([x, np.roll(x, 2000)], 1).astype(np.float32) * vol

def horn(vol=0.3):
    t = t_(0.6); x = (osc('saw', 330, 0.6) + osc('saw', 415, 0.6)) * env(len(t), 0.02, 0.1, 0.8, 0.1)
    return stereo(lp(x, 2000) * vol * 0.5)

def ch04():
    C = cues('ch04'); D = C['dur']; m = buf(D); s = buf(D)
    place(m, cinematic(4.5, [(45, [45, 52, 57, 60])], 0.8, 900), 0)
    g = lc01(D - C['L1p2'] + 1, 92); g[:int(0.8 * SR)] *= np.linspace(0, 1, int(0.8 * SR))[:, None]
    a, b = int((C['L4'] - C['L1p2']) * SR), int((C['L4p2'] - C['L1p2'] + 0.2) * SR); g[a:b] *= np.linspace(1, 0.15, b - a)[:, None]; g[b:int((C['L5'] - C['L1p2']) * SR)] *= 0.15
    place(m, g, C['L1p2'] - 0.2)
    place(s, riser(2.2, 0.35), 0.4); place(s, boom(0.7), C['L1p2'] - 0.1); place(s, whoosh(2.5, True, 0.35), 2.0)
    for cue in ('L2p2', 'L2p3', 'L2p4'): place(s, ping(84, 0.22), C[cue])
    place(s, boom(1.0), wordat('ch04', 'L3p2', 'blown'))
    place(s, clunk(0.6), wordat('ch04', 'L3p3', 'broken')); place(s, error_buzz(0.2), wordat('ch04', 'L3p3', 'broken') + 0.3)
    for i in range(4): place(s, clunk(0.35), C['L3p4'] + 0.2 + i * 0.25)
    place(s, whoosh(0.6, True, 0.35), C['L4'] + 0.2); place(s, stamp_hit(0.8), C['L4p2'])
    for i in range(3): place(s, blip(76 + i * 4, 0.12, 0.2), C['L5'] + 1.0 + i * 0.15)
    place(s, error_buzz(0.2), C['L5p2'])
    for i in range(10): place(s, blip(90 + (i % 3), 0.04, 0.12), C['L6'] + i * 0.12)
    place(s, ping(91, 0.3), C['L6'] + 1.4)
    return m, s, D

def ch05():
    C = cues('ch05'); D = C['dur']; m = buf(D); s = buf(D)
    sw = synthwave(D + 1, 108); sw[:int(0.5 * SR)] *= np.linspace(0, 1, int(0.5 * SR))[:, None]
    a = int((C['L3p2'] - 0.2) * SR); b = int((C['L4p2'] + 0.6) * SR); sw[a:b] = sweep_lp(sw[a:b], 700, 700) * 0.6
    place(m, sw, 0)
    place(s, whoosh(1.0, True, 0.4), C['L1p2'] - 0.2); place(s, stab(57, 0.35), C['L1p2'] + 0.5)
    for i in range(3): place(s, chime(0.16), wordat('ch05', 'L2p1', 'millionaires') + i * 0.2)
    place(s, whoosh(1.8, False, 0.5), C['L2p2'])
    place(s, wind(D - C['L3p2'], 0.25), C['L3p2']); place(s, thunder(0.6), C['L3p3'] + 0.2)
    for i in range(6): place(s, clunk(0.3), C['L3'] + 2.0 + i * 0.12)
    place(s, stamp_hit(0.8), C['L4p2'])
    place(s, error_buzz(0.2), C['L5']); place(s, error_buzz(0.2), wordat('ch05', 'L5p1', 'subway'))
    place(s, horn(0.35), wordat('ch05', 'L5p2', 'boats')); place(s, horn(0.3), wordat('ch05', 'L5p2', 'boats') + 0.5)
    for i in range(10): place(s, blip(90 + (i % 3), 0.04, 0.12), C['L6'] + i * 0.1)
    place(s, ping(93, 0.3), C['L6'] + 1.3)
    return m, s, D

def westcoast(dur, bpm=94, vol=1.0):
    """San Andreas 1992: G-funk - whiny sine lead, rubbery bass, laid-back drums."""
    out = buf(dur); beat = 60 / bpm
    prog = [(41, [53, 57, 60, 64]), (43, [55, 58, 62, 65]), (38, [50, 53, 57, 60]), (36, [48, 52, 55, 58])]   # Fmaj7 Gm7 Dm7 C7
    for b in range(int(dur / (beat * 4)) + 1):
        bass, ch = prog[b % 4]; t0 = b * beat * 4
        place(out, stereo(pad(ch, beat * 4.3, 0.06 * vol, 2200, 0.2, 0.6)), t0)
        for k_, (o, n) in enumerate([(0, 0), (1.5, 7), (2, 12), (3, 10), (3.5, 7)]):
            x = osc('sin', hz(bass - 12 + n), beat * 0.9) * env(int(beat * 0.9 * SR), 0.01, 0.2, 0.6, 0.1)
            place(out, stereo(lp(np.tanh(x * 2.5), 900) * 0.22 * vol), t0 + o * beat)
        for s_ in range(8):
            ts = t0 + s_ * beat / 2 + (0.04 if s_ % 2 else 0)
            if ts > dur: break
            if s_ in (0, 5): place(out, stereo(kick(0.35, 1.0) * 0.7 * vol), ts)
            if s_ in (2, 6): place(out, stereo(snare() * 0.4 * vol), ts)
            place(out, stereo(hat() * 0.2 * vol, 0.25), ts)
        if b % 2 == 1:
            for i, n in enumerate([ch[3] + 12, ch[2] + 12, ch[1] + 12]):
                t = t_(beat * 0.95); f = hz(n) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t)) * (1 - 0.06 * np.exp(-t * 18)); ph = np.cumsum(f) / SR
                place(out, stereo(np.sin(2 * np.pi * ph) * env(len(t), 0.03, 0.2, 0.7, 0.15) * 0.08 * vol, 0.3), t0 + beat * (1 + i))
    return reverb(out, 0.2)

def siren(dur=2.0, vol=0.15):
    t = t_(dur); f = 700 + 300 * np.sign(np.sin(2 * np.pi * 1.6 * t)); ph = np.cumsum(f) / SR
    return stereo(lp(np.sign(np.sin(2 * np.pi * ph)), 2500) * vol * np.sin(np.pi * t / dur) ** 0.3)

def ch06():
    C = cues('ch06'); D = C['dur']; m = buf(D); s = buf(D)
    place(m, cinematic(C['L3'] + 1, [(41, [41, 48, 53, 57]), (43, [43, 50, 55, 58])], 0.8, 1300), 0)
    g = westcoast(D - C['L3'] + 1.5, 94); g[:int(1.5 * SR)] *= np.linspace(0, 1, int(1.5 * SR))[:, None]
    a = int((C['L6'] - C['L3'] + 0.3) * SR); b = int((C['L7'] - C['L3']) * SR); g[a:b] = sweep_lp(g[a:b], 900, 900) * 0.7
    place(m, g * 0.65, C['L3'] - 0.6)
    place(s, riser(1.5, 0.3), 0.5); place(s, boom(0.6), C['L1p2'])
    for cue in ('L2p2', 'L2p3', 'L2p4'): place(s, ping(84, 0.25), C[cue])
    place(s, whoosh(2.5, False, 0.55), C['L3'] - 0.3)
    place(s, stab(53, 0.3), C['L3p2'])
    for word in ('forests', 'farms', 'desert', 'dam', 'radio'): place(s, whoosh(0.9, True, 0.25), wordat('ch06', 'L4p1', word) - 0.3)
    for i in range(6): place(s, clunk(0.25), wordat('ch06', 'L4p2', 'fallen') + i * 0.28)
    place(s, riser(2.0, 0.3), C['L5'] - 0.2); place(s, boom(0.7), C['L5e'] + 0.1)
    place(s, siren(3.0, 0.14), C['L6p3'] + 0.3); place(s, stamp_hit(0.8), wordat('ch06', 'L6p4', 'because'))
    place(s, pop(0.4), C['L7'] + 0.9); place(s, blip(84, 0.1, 0.2), C['L7'] + 1.0)
    for i in range(10): place(s, blip(90 + (i % 3), 0.04, 0.12), C['L8'] + i * 0.12)
    place(s, stab(53, 0.35), C['L8p2'])
    return m, s, D

def nyc08(dur, bpm=86, vol=1.0):
    """GTA IV: grey, tense - low strings drone, sparse piano, brushed drums."""
    out = buf(dur); beat = 60 / bpm
    prog = [(40, [52, 55, 59]), (36, [48, 55, 60]), (43, [50, 55, 59]), (38, [50, 54, 57])]
    for b in range(int(dur / (beat * 4)) + 1):
        bass, ch = prog[b % 4]; t0 = b * beat * 4
        place(out, stereo(pad(ch, beat * 4.4, 0.07 * vol, 1200, 0.6, 0.8)), t0)
        place(out, stereo(sub(bass, beat * 4, 0.2 * vol)), t0)
        for k_, n in enumerate([ch[0] + 12, ch[2] + 12, ch[1] + 24]): place(out, stereo(pluck(n, 1.4, 0.05 * vol, 2600), [-0.4, 0.2, 0.5][k_]), t0 + beat * [0, 1.5, 2.5][k_])
        for s_ in range(8):
            ts = t0 + s_ * beat / 2
            if ts > dur: break
            if s_ in (0, 3): place(out, stereo(kick(0.35, 0.8) * 0.55 * vol), ts)
            if s_ in (4,): place(out, stereo(snare() * 0.25 * vol), ts)
            place(out, stereo(shaker() * 0.5 * vol, 0.2), ts)
    return reverb(out, 0.25, 1.2)

def voice(name, vol=0.6):
    v, vsr = sf.read(ROOT + f'audio/{name}.wav', dtype='float32'); v = resample_poly(v, SR, vsr).astype(np.float32)
    v = bp(v, 300, 3400) * vol    # car-speaker band
    return stereo(v, 0.3)

def trombone(vol=0.35):
    out = buf(2.2)
    for i, n in enumerate([55, 54, 53, 52]):
        d = 0.9 if i == 3 else 0.42; t = t_(d); f = hz(n) * (1 + (0.02 * np.sin(2 * np.pi * 6 * t) if i == 3 else 0)); ph = np.cumsum(f) / SR
        x = lp(osc('saw', 1, d) * 0 + np.sign(np.sin(2 * np.pi * ph)) * 0.5 + np.sin(2 * np.pi * ph), 1400) * env(len(t), 0.03, 0.1, 0.8, 0.12)
        place(out, stereo(x * vol), i * 0.42)
    return out

def ch07():
    C = cues('ch07'); D = C['dur']; m = buf(D); s = buf(D)
    g = nyc08(D + 1, 86); g[:int(int((C['L2']) * SR))] *= 0.35; place(m, g, 0)
    place(s, trombone(0.4), C['L1p2'] + 0.2)
    place(s, boom(0.5), C['L1p2'] + 0.4)
    place(s, riser(1.6, 0.3), C['L2'] - 0.6); place(s, whoosh(2.0, True, 0.4), C['L2'] + 0.6)
    for cue in ('L3p2', 'L3p3', 'L3p4', 'L3p5', 'L3p6'): place(s, ping(84, 0.22), C[cue])
    place(s, riser(1.2, 0.3), C['L3'] + 0.2)
    place(s, error_buzz(0.25), C['L4p3']); place(s, error_buzz(0.25), C['L4p3'] + 0.3)
    place(s, siren(2.5, 0.15), C['L5p2']); place(s, stamp_hit(0.8), C['L5p4'])
    place(s, voice('gps_recalc', 0.7), C['L6p3'] + 0.9)
    place(s, voice('gps_turn', 0.7), C['L6p4'] + 1.4)
    place(s, whoosh(2.4, False, 0.35), C['L7p2'] - 0.4)
    return m, s, D

def ls13(dur, bpm=100, vol=1.0):
    """GTA V: sunny modern hip-hop - big kick, 808 sub, plucky synth chords, claps."""
    out = buf(dur); beat = 60 / bpm; step = beat / 4
    prog = [(45, [57, 60, 64, 67]), (41, [53, 57, 60, 64]), (43, [55, 59, 62, 66]), (40, [52, 55, 59, 62])]
    for b in range(int(dur / (beat * 4)) + 1):
        bass, ch = prog[b % 4]; t0 = b * beat * 4
        for k_ in (0, 3, 6, 10, 12):
            place(out, stereo(sum(pluck(n + 12, step * 2.2, 0.035 * vol, 4200) for n in ch[:3])), t0 + k_ * step)
        place(out, stereo(np.tanh(osc('sin', hz(bass - 12), beat * 1.6) * 2.2) * env(int(beat * 1.6 * SR), 0.005, 0.4, 0.6, 0.2) * 0.22 * vol), t0)
        place(out, stereo(np.tanh(osc('sin', hz(bass - 12), beat * 1.2) * 2.2) * env(int(beat * 1.2 * SR), 0.005, 0.3, 0.6, 0.2) * 0.2 * vol), t0 + beat * 2.5)
        for s_ in range(16):
            ts = t0 + s_ * step
            if ts > dur: break
            if s_ in (0, 10): place(out, stereo(kick(0.4, 1.1) * 0.75 * vol), ts)
            if s_ in (4, 12): place(out, stereo(snare() * 0.35 * vol), ts)
            if s_ % 2 == 0: place(out, stereo(hat() * 0.2 * vol, 0.3), ts)
            if s_ in (7, 15): place(out, stereo(hat() * 0.12 * vol, -0.3), ts)
    return reverb(out, 0.15)

def underwater_amb(dur, vol=1.0):
    t = t_(dur); x = lp(RNG.uniform(-1, 1, len(t)), 300) * 0.5 * (0.7 + 0.3 * np.sin(t * 0.7))
    out = np.stack([x, np.roll(x, 3000)], 1).astype(np.float32) * vol
    for i in range(int(dur / 0.7)):
        n = 64 + (i * 5) % 12
        place(out, reverb(stereo(osc('sin', hz(n), 1.5) * np.exp(-t_(1.5) * 2) * 0.05 * vol), 0.6, 1.5), i * 0.7 + 0.1 * (i % 3))
    return out

def splash(vol=0.6):
    t = t_(1.2); x = bp(RNG.uniform(-1, 1, len(t)), 300, 6000) * np.exp(-t * 4) + lp(RNG.uniform(-1, 1, len(t)), 200) * np.exp(-t * 2) * 0.6
    return reverb(stereo(x * vol), 0.3)

def ch08():
    C = cues('ch08'); D = C['dur']; m = buf(D); s = buf(D)
    tUnder, tUp = C['L4p2'] + 0.1, C['L6'] - 0.3
    g = ls13(D + 1, 100); i0, i1 = int((tUnder - 0.2) * SR), int((tUp + 0.3) * SR)
    g[i0:i1] = lp(g[i0:i1], 400) * 0.4; place(m, g * 0.9, 0)
    place(m, underwater_amb(tUp - tUnder + 0.4, 0.9), tUnder)
    place(s, whoosh(2.5, False, 0.5), 0.2); place(s, stab(57, 0.3), C['L1p2'])
    for cue in ('L2p2', 'L2p3'): place(s, ping(84, 0.22), C[cue])
    for word, cue in (('chiliad', 'L3p1'), ('salty', 'L3p2'), ('desert', 'L3p2'), ('military', 'L3p2')): place(s, whoosh(0.9, True, 0.22), wordat('ch08', cue, word) - 0.3)
    for i in range(3): place(s, pop(0.35), wordat('ch08', 'L3p3', 'bad') + i * 0.25)
    place(s, riser(1.2, 0.35), C['L4p2'] - 1.2); place(s, splash(0.8), tUnder); place(s, splash(0.6), tUp)
    place(s, boom(0.4), C['L5p2'] + 0.2)
    for i in range(10): place(s, blip(90 + (i % 3), 0.04, 0.12), C['L6'] + i * 0.12)
    for i in range(10): place(s, pop(0.2), C['L6p2'] + i * 0.12)
    place(s, stamp_hit(0.6), wordat('ch08', 'L7p1', 'seventeen'))
    place(s, ping(86, 0.25), C['L8p2']); place(s, ping(91, 0.25), C['L8p3'])
    i9 = int((C['L9p2'] - 0.05) * SR); m[i9:] *= 0.0
    place(s, boom(0.9), C['L9p2'])
    return m, s, D

def ch09():
    C = cues('ch09'); D = C['dur']; m = buf(D); s = buf(D)
    tS, tB = C['L3'] - 0.2, C['L7'] - 0.2
    g = synthwave(tS + 1.0, 108); fade(g, tS - 0.6, tS + 0.2, 0); place(m, g * 0.9, 0)
    place(m, cinematic(tB - tS + 0.6, [(57, [57, 60, 64]), (53, [53, 57, 60]), (50, [50, 53, 57]), (52, [52, 56, 59])], 0.8, 1200), tS)
    g2 = ls13(D - tB + 1, 100); place(m, g2 * 0.75, tB)
    place(s, whoosh(2.2, False, 0.4), 0.2); place(s, stab(57, 0.3), C['L1p2'])
    place(s, riser(1.4, 0.3), C['L2'] - 1.2); place(s, boom(0.4), C['L2'])
    for k, cue in enumerate(['L2p3', 'L2p4', 'L2p5', 'L2p6', 'L2p7', 'L2p8']): place(s, ping(79 + [0, 2, 4, 7, 9, 12][k], 0.2), C[cue])
    place(s, whoosh(1.4, True, 0.35), tS - 0.3); place(s, error_buzz(0.22), C['L3p2'] + 0.3)
    for cue in ('L4', 'L4p2', 'L4p3', 'L4p4'): place(s, pop(0.35), C[cue]); place(s, stamp_hit(0.3), C[cue] + 0.05)
    for i in range(int((C['L5p2'] - C['L5']) / 0.06)): place(s, blip(84 + (i * 7) % 12, 0.04, 0.06), C['L5'] + i * 0.06)
    for cue in ('L5p2', 'L5p3', 'L5p4'): place(s, ping(86, 0.24), C[cue])
    place(s, error_buzz(0.3), C['L5p5']); place(s, boom(0.35), C['L5p5'] + 0.1)
    place(s, riser(1.0, 0.25), C['L6'] - 0.2); place(s, stamp_hit(0.7), wordat('ch09', 'L6p3', 'asterisk'))
    place(s, whoosh(2.0, True, 0.4), tB - 0.3); place(s, ping(91, 0.25), C['L7p3'])
    place(s, stab(57, 0.25), C['L8']); place(s, stamp_hit(0.8), C['L8p3'])
    return m, s, D

def ch10():
    C = cues('ch10'); D = C['dur']; m = buf(D); s = buf(D)
    # cinematic bed through L1-L3, the GTA V groove returns for the excuses
    place(m, cinematic(C['L4'] + 1.5, [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])], 0.9), 0)
    g = ls13(D - C['L4'] + 2, 100); place(m, g * 0.7, C['L4'] - 0.4)
    for k in range(5): place(s, ping(76 + [0, 2, 4, 5, 7][k], 0.22), 0.55 + k * 0.62); place(s, pop(0.25), 0.6 + k * 0.62)
    place(s, whoosh(1.4, True, 0.25), C['L2'] - 0.2)
    place(s, error_buzz(0.22), C['L2p2'] + 0.3)
    place(s, riser(1.0, 0.25), wordat('ch10', 'L2p3', 'taller') - 0.6)
    place(s, whoosh(1.6, False, 0.3), C['L3'] - 0.6)
    place(s, chiptune(1.2, 128, 0, 0, 0.6), C['L3p1'])
    place(s, stab(57, 0.25), C['L3p2'])
    place(s, splash(0.4), C['L3p3'])
    for i in range(4): place(s, blip(88 + i, 0.05, 0.1), C['L3p4'] + i * 0.1)
    place(s, ping(91, 0.22), wordat('ch10', 'L3p5', 'gps'))
    place(s, whoosh(1.2, True, 0.3), C['L4'] - 0.3)
    place(s, stamp_hit(0.8), C['L4p2'])
    place(s, ping(84, 0.2), C['L4p3'])
    return m, s, D

def ch11():
    C = cues('ch11'); D = C['dur']; m = buf(D); s = buf(D)
    place(m, cinematic(C['L2'] + 1.0, [(53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])], 0.9), 0)
    tPix = C['L2p2'] - 0.2
    ct = chiptune(D - tPix + 1, 128, 0, 0, 0.8); fade(ct, D - tPix - 1.6, D - tPix, 0); place(m, ct, tPix)
    for k in range(5): place(s, ping(79 + [0, 3, 5, 7, 10][k], 0.18), 0.6 + k * 0.45)
    for i in range(5): place(s, boom(0.35), wordat('ch11', 'L1p2', 'explosions') + i * 0.12)
    place(s, riser(1.2, 0.3), C['L2'] - 1.4); place(s, whoosh(2.0, True, 0.4), C['L2'] - 0.2)
    place(s, stab(57, 0.3), C['L2e'] + 0.5)
    return m, s, D

def short():
    C = cues('short'); D = C['dur']; m = buf(D); s = buf(D)
    g = ls13(D + 1, 100); fade(g, D - 1.5, D, 0); place(m, g, 0)
    for k, cue in enumerate(['L2p1', 'L2p2', 'L2p3', 'L2p4', 'L2p6']): place(s, ping(76 + [0, 2, 4, 5, 7][k], 0.25), C[cue] - 0.1); place(s, pop(0.3), C[cue])
    place(s, error_buzz(0.3), C['L2p5'])
    place(s, riser(1.4, 0.35), C['L3'] - 0.8); place(s, whoosh(1.6, False, 0.35), C['L3'])
    for i in range(int((C['L3p4'] - C['L3p3']) / 0.07)): place(s, blip(84 + (i * 5) % 12, 0.04, 0.05), C['L3p3'] + i * 0.07)
    place(s, stamp_hit(0.7), C['L3p5']); place(s, stab(57, 0.3), C['L4'])
    return m, s, D

def mix(ch, m, s, D):
    vo, vsr = sf.read(ROOT + f'audio/{ch}_vo.wav', dtype='float32')
    vo = resample_poly(vo, SR, vsr).astype(np.float32); vo = np.stack([vo, vo], 1)
    n = int(D * SR); m, s = m[:n], s[:n]; v = np.zeros((n, 2), np.float32); v[:min(n, len(vo))] = vo[:n]
    # sidechain: envelope of voice → duck music up to -9 dB
    e = np.abs(v[:, 0]); k = int(0.25 * SR); e = np.convolve(e, np.ones(k) / k, 'same'); e = np.clip(e / (e.max() + 1e-9) * 3, 0, 1)
    duck = 1 - 0.65 * e
    out = m * duck[:, None] * 1.7 + s * 1.2 + v * 1.0
    rms = lambda x: 20*np.log10(np.sqrt((x**2).mean())+1e-9)
    vm = np.abs(v[:,0]) > 0.02
    print('  music under VO dB', round(rms((m*duck[:,None]*1.7)[vm]),1), 'VO dB', round(rms(v[vm]),1), 'sfx dB', round(rms(s*0.8),1))
    meter = pyln.Meter(SR); L = meter.integrated_loudness(out)
    out = pyln.normalize.loudness(out, L, -14.0)
    out = np.where(np.abs(out) > 0.7, np.sign(out) * (0.7 + 0.28 * np.tanh((np.abs(out) - 0.7) / 0.28)), out)   # soft limiter
    sf.write(ROOT + f'audio/{ch}_mix.wav', out.astype(np.float32), SR, subtype='PCM_16')
    print(ch, 'LUFS in', round(L, 1), '→ -14, peak', round(float(np.abs(out).max()), 3), 'dur', D)

for ch in sys.argv[1].split(','):
    m, s, D = {'ch00': ch00, 'ch01': ch01, 'ch02': ch02, 'ch03': ch03, 'ch04': ch04, 'ch05': ch05, 'ch06': ch06, 'ch07': ch07, 'ch08': ch08, 'ch09': ch09, 'ch10': ch10, 'ch11': ch11, 'short': short}[ch](); mix(ch, m, s, D)
