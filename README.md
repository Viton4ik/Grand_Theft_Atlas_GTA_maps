# Grand Theft Atlas - How GTA's Maps Grew Up

Motion documentary (EN) about the evolution of GTA maps. Own WebGL engine (Three.js), deterministic frame-by-frame render, 1920×1080 @ 60 fps, plus a vertical Short (1080×1920).

## Layout
| Path | What |
|---|---|
| `docs/` | fact base (RU), voice-over script (EN), director's script (RU) |
| `engine/` | the film engine: `index.html?shot=<name>&t=<sec>` renders any frame |
| `engine/js/core/` | easing/keyframes (`util.js`), DOM HUD (`hud.js`), VO cue helpers (`tl.js`) |
| `engine/js/world/` | geometry: islands & coasts (`geo.js`), city generator v2 (`city.js`), schematic game maps (`maps.js`), map builder & bridges (`env.js`), real world (`world.js`), 1997 pixel city (`pixelcity.js`) |
| `engine/js/shots/` | one module per chapter/shot: `coldopen`, `ch01`, `lc3`, `vc`, `lc4`, `short` |
| `engine/data/world.json` | Natural Earth 10m + city boundaries, projected (Albers equal-area, 1 unit = 10 m) |
| `engine/data/timeline.json` | phrase-accurate VO cues (written by `tools/vo.py`) |
| `tools/build-geo.mjs` | rebuilds `world.json` from raw GeoJSON |
| `tools/spec.json`, `tools/vo.py` | VO text per chapter → Kokoro TTS (`bm_george`) → `audio/chXX_vo.wav` + cues |
| `tools/synth.py`, `tools/score.py` | procedural music + SFX on the same cues, ducked under VO, -14 LUFS → `audio/chXX_mix.wav` |
| `render/still.mjs` | stills: `node render/still.mjs <shot> 1.5,3,7 [w] [h]` (env `CAM=x,y,z,tx,ty,tz` overrides camera) |
| `render/video.mjs` | frame range → H.264: `node render/video.mjs <shot> <f0> <f1> <fps> <out.mp4> [w] [h] [port]` |
| `render/chapter2.sh` | whole chapter: chunks × 2 workers → concat → mux audio → `out/chapters/chXX.mp4` |

## Pipeline for a chapter
1. Edit VO text in `tools/spec.json` → `python3 tools/vo.py chXX`
2. Shot reads cues via `cues(TL,'chXX')`; check with `render/still.mjs`
3. `cd tools && python3 score.py chXX`
4. `render/chapter2.sh chXX <shot>`

## Data notes
- Map areas: fan measurements (KeWiS / GTAForums), total incl. water.
- All game maps are original stylised schematics scaled to the measured land area, not traced official maps.
- Real-world layers: Natural Earth (public domain), city boundaries from codeforgermany/click_that_hood.
