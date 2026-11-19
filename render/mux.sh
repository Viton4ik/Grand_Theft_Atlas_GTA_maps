#!/bin/bash
# re-mux a rendered chapter: video segments + audio mix + switchable EN subtitles, exact chapter duration
CH=$1; cd /home/claude/gta-maps
DUR=$(python3 -c "import json;print(json.load(open('engine/data/timeline.json'))['$CH']['dur'])")
python3 tools/srt.py $CH > /dev/null
ffmpeg -y -loglevel error -f concat -safe 0 -i out/seg/$CH/list.txt -i audio/${CH}_mix.wav -i out/chapters/$CH.en.srt -map 0:v -map 1:a -map 2:s -c:v copy -c:a aac -b:a 256k -c:s mov_text -metadata:s:s:0 language=eng -metadata:s:s:0 title=English -disposition:s:0 0 -t $DUR -movflags +faststart out/chapters/$CH.mp4
echo "$CH: $(ffprobe -v error -show_entries format=duration -of csv=p=0 out/chapters/$CH.mp4)s"
