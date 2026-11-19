# Minimal deterministic synth toolkit (48 kHz stereo float32): oscillators, envelopes, drums, fx, sfx.
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
RNG = np.random.default_rng(7)

def t_(dur): return np.arange(int(dur * SR)) / SR
def hz(note):  # MIDI number → Hz
    return 440.0 * 2 ** ((note - 69) / 12)

def env(n, a=0.005, d=0.1, s=0.6, r=0.1, dur=None):
    N = n; A, D, R = int(a * SR), int(d * SR), int(r * SR)
    e = np.full(N, s, np.float32)
    A = min(A, N); e[:A] = np.linspace(0, 1, A, endpoint=False) if A else e[:A]
    D2 = min(D, max(0, N - A)); e[A:A + D2] = np.linspace(1, s, D2, endpoint=False) if D2 else e[A:A + D2]
    if R and N > R: e[-R:] *= np.linspace(1, 0, R)
    return e

def osc(kind, f, dur, duty=0.5, phase=0.0):
    t = t_(dur); ph = (f * t + phase) % 1.0
    if kind == 'sin': return np.sin(2 * np.pi * ph)
    if kind == 'sq': return np.where(ph < duty, 1.0, -1.0)
    if kind == 'saw': return 2 * ph - 1
    if kind == 'tri': return 1 - 4 * np.abs(ph - 0.5)
    raise ValueError(kind)

def lp(x, fc, order=2):
    sos = butter(order, min(fc, SR * 0.45) / (SR / 2), 'low', output='sos'); return sosfilt(sos, x, axis=0)
def hp(x, fc, order=2):
    sos = butter(order, fc / (SR / 2), 'high', output='sos'); return sosfilt(sos, x, axis=0)
def bp(x, lo, hi, order=2):
    sos = butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], 'band', output='sos'); return sosfilt(sos, x, axis=0)

def sweep_lp(x, f0, f1, steps=32):  # time-varying low-pass by blocks
    out = np.zeros_like(x); n = len(x); b = max(1, n // steps)
    for i in range(0, n, b):
        fc = f0 * (f1 / f0) ** (i / max(1, n - 1)); out[i:i + b] = lp(x[max(0, i - 2000):i + b], fc)[-len(x[i:i + b]):]
    return out

def stereo(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l, x * r], 1).astype(np.float32)

def place(buf, sig, at):
    i = int(at * SR)
    if i >= len(buf) or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), len(buf) - i); buf[i:i + n] += sig[:n]

def reverb(x, mix=0.25, size=1.0):
    # Schroeder: 4 combs + 2 allpasses per channel
    out = np.zeros_like(x)
    for ch in range(2):
        s = x[:, ch]; acc = np.zeros_like(s)
        for d, g in [(1557, .84), (1617, .83), (1491, .85), (1422, .86)]:
            D = int(d * size * (1 + 0.03 * ch)); y = np.copy(s)
            for i in range(D, len(y), D): y[i:i + D] += g * y[i - D:i][:len(y[i:i + D])]
            acc += y * 0.25
        for d, g in [(225, .5), (556, .5)]:
            D = int(d * size); xin = acc; y = np.zeros_like(xin)
            for i in range(0, len(y), D):
                j = min(len(y), i + D); xp = xin[i - D:j - D] if i >= D else np.zeros(j - i); yp = y[i - D:j - D] if i >= D else np.zeros(j - i)
                y[i:j] = -g * xin[i:j] + xp + g * yp
            acc = y
        out[:, ch] = acc
    return x * (1 - mix) + lp(out, 6000) * mix

def delay(x, sec, fb=0.35, mix=0.25):
    D = int(sec * SR); y = np.copy(x)
    for i in range(D, len(y), D): y[i:i + D] += fb * y[i - D:i][:len(y[i:i + D])]
    return x * (1 - mix) + y * mix

# ---------- drums ----------
def kick(dur=0.35, hard=1.0):
    t = t_(dur); f = 45 + 110 * np.exp(-t * 28); ph = np.cumsum(f) / SR
    return (np.sin(2 * np.pi * ph) * np.exp(-t * 9) * hard + 0.25 * np.exp(-t * 120) * RNG.uniform(-1, 1, len(t))).astype(np.float32)
def snare(dur=0.25):
    t = t_(dur); n = bp(RNG.uniform(-1, 1, len(t)), 1200, 9000) * np.exp(-t * 18)
    return (n * 0.9 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5).astype(np.float32)
def hat(dur=0.06, open_=False):
    t = t_(0.25 if open_ else dur); return (hp(RNG.uniform(-1, 1, len(t)), 7000) * np.exp(-t * (14 if open_ else 70)) * 0.5).astype(np.float32)
def shaker(dur=0.09):
    t = t_(dur); return (bp(RNG.uniform(-1, 1, len(t)), 4000, 12000) * np.sin(np.pi * t / dur) ** 2 * 0.35).astype(np.float32)

# ---------- instruments ----------
def chip(note, dur, duty=0.125, vol=0.25, vib=0.0):
    t = t_(dur); f = hz(note) * (1 + vib * np.sin(2 * np.pi * 6 * t))
    ph = np.cumsum(f) / SR % 1.0; x = np.where(ph < duty, 1.0, -1.0)
    return (x * env(len(t), 0.002, 0.05, 0.5, 0.03) * vol).astype(np.float32)
def tri_bass(note, dur, vol=0.35):
    return (osc('tri', hz(note), dur) * env(int(dur * SR), 0.003, 0.08, 0.7, 0.02) * vol).astype(np.float32)
def pluck(note, dur=0.5, vol=0.3, bright=4000):
    t = t_(dur); x = osc('saw', hz(note), dur) * 0.6 + osc('sin', hz(note) * 2, dur) * 0.4
    return (lp(x, bright) * np.exp(-t * 6) * vol).astype(np.float32)
def pad(notes, dur, vol=0.12, cutoff=1800, attack=1.5, release=1.5):
    t = t_(dur); x = np.zeros(len(t))
    for n in notes:
        for det in (-0.12, 0.0, 0.11): x += osc('saw', hz(n) * 2 ** (det / 12), dur, phase=RNG.random())
    x = lp(x / (3 * len(notes)), cutoff)
    return (x * env(len(t), attack, 0.5, 0.85, release) * vol).astype(np.float32)
def sub(note, dur, vol=0.35):
    return (osc('sin', hz(note), dur) * env(int(dur * SR), 0.02, 0.3, 0.8, 0.4) * vol).astype(np.float32)

# ---------- sfx ----------
def whoosh(dur=1.2, up=True, vol=0.5):
    t = t_(dur); n = RNG.uniform(-1, 1, len(t))
    shape = np.sin(np.pi * (t / dur) ** (0.6 if up else 1.6)) ** 2
    x = sweep_lp(n, 300 if up else 6000, 6000 if up else 300)
    return stereo(x * shape * vol)
def riser(dur=1.5, vol=0.4):
    t = t_(dur); f = 200 * (8 ** (t / dur)); ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) * 0.3 + sweep_lp(RNG.uniform(-1, 1, len(t)), 500, 9000) * 0.7
    return stereo(x * (t / dur) ** 2 * vol)
def boom(vol=0.9):
    t = t_(2.5); f = 32 + 60 * np.exp(-t * 6); ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) * np.exp(-t * 1.6) + lp(RNG.uniform(-1, 1, len(t)), 900) * np.exp(-t * 5) * 0.5
    return reverb(stereo(x * vol), 0.35, 1.3)
def ping(note=84, vol=0.35):
    t = t_(1.2); x = (osc('sin', hz(note), 1.2) + 0.3 * osc('sin', hz(note) * 2.01, 1.2)) * np.exp(-t * 5)
    return delay(stereo(x * vol), 0.18, 0.4, 0.3)
def pop(vol=0.4):
    t = t_(0.12); f = 900 * np.exp(-t * 30) + 300; ph = np.cumsum(f) / SR
    return stereo(np.sin(2 * np.pi * ph) * np.exp(-t * 35) * vol)
def boing(vol=0.35):
    t = t_(0.5); f = 220 + 140 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 4); ph = np.cumsum(f) / SR
    return stereo(np.sin(2 * np.pi * ph) * np.exp(-t * 6) * vol)
def blip(note=81, dur=0.09, vol=0.22):
    return stereo(chip(note, dur, 0.25, vol))
def crt_on(vol=0.35):
    t = t_(0.7); x = np.sin(2 * np.pi * 15700 * t) * 0.15 * np.exp(-t * 3) + hp(RNG.uniform(-1, 1, len(t)), 2000) * np.exp(-t * 20) * 0.8
    return stereo(x * vol)
def clunk(vol=0.5):
    t = t_(0.35); x = np.sin(2 * np.pi * 95 * t) * np.exp(-t * 22) + bp(RNG.uniform(-1, 1, len(t)), 1500, 5000) * np.exp(-t * 60) * 0.6
    return stereo(x * vol)
def stamp_hit(vol=0.6):
    t = t_(0.4); x = lp(RNG.uniform(-1, 1, len(t)), 1800) * np.exp(-t * 25) + np.sin(2 * np.pi * 70 * t) * np.exp(-t * 18)
    return reverb(stereo(x * vol), 0.15, 0.6)
def error_buzz(vol=0.25):
    t = t_(0.35); return stereo(chip(45, 0.35, 0.5, vol) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 14 * t))))
def chime(vol=0.25):
    out = np.zeros((int(1.4 * SR), 2), np.float32)
    for i, n in enumerate([84, 88, 91, 96]): place(out, stereo(chip(n, 0.18, 0.25, vol)), i * 0.07)
    return delay(out, 0.15, 0.35, 0.3)
def flap(vol=0.18):
    t = t_(0.08); return stereo(bp(RNG.uniform(-1, 1, len(t)), 800, 3000) * np.exp(-t * 50) * vol)
