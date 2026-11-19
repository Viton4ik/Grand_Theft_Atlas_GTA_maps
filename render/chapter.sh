#!/bin/bash
# usage: render/chapter.sh <chapter-id> <shot> [fps=60] [chunk=300]
# Renders a chapter in frame chunks with 2 parallel workers, concatenates, muxes the chapter audio mix.
set -e
CH=$1; SHOT=$2; FPS=${3:-60}; CHUNK=${4:-300}
cd /home/claude/gta-maps
DUR=$(python3 -c "import json;print(json.load(open('engine/data/timeline.json'))['$CH']['dur'])")
N=$(python3 -c "import math;print(math.ceil($DUR*$FPS))")
mkdir -p out/seg/$CH out/chapters
JOBS=""; k=0
for ((f=0; f<N; f+=CHUNK)); do e=$((f+CHUNK<N ? f+CHUNK : N)); seg=$(printf "out/seg/$CH/%05d.mp4" $f)
  if [ ! -s "$seg" ]; then JOBS+="$f $e $seg $((8810+k%2))"$'\n'; fi; k=$((k+1)); done
echo "$CH: $N frames, $(echo -n "$JOBS" | grep -c . || true) chunks to render"
echo -n "$JOBS" | xargs -P 2 -L 1 bash -c 'node render/video.mjs '"$SHOT"' $0 $1 '"$FPS"' $2.tmp.mp4 1920 1080 $3 > /tmp/seg_$0.log 2>&1 && mv $2.tmp.mp4 $2 && echo "  done $2"'
ls out/seg/$CH/*.mp4 | grep -v tmp | sed "s|^|file '$PWD/|; s|$|'|" > out/seg/$CH/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/seg/$CH/list.txt -i audio/${CH}_mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart out/chapters/$CH.mp4
echo "$CH muxed: $(ffprobe -v error -show_entries format=duration -of csv=p=0 out/chapters/$CH.mp4)s"
