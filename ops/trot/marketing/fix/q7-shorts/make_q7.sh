#!/usr/bin/env bash
# 7초 질문 숏츠 렌더러 — 홍보라 2026-11-17
# 사용: ./make_q7.sh <클립폴더> <출력.mp4> "질문 1줄" "질문 2줄"
# 클립폴더에 trot-media/clips 의 babeun_1.mp4 · abeonim_1.mp4 · yeobo_1.mp4 (720x1280) 를 둔다.
set -euo pipefail
D="$1"; OUT="$2"; Q1="$3"; Q2="$4"
F=/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc
T=$(mktemp -d)
SS=8   # 각 클립에서 쓰는 구간 시작(초) — 노래하는 컷
top="drawbox=x=0:y=0:w=1080:h=440:color=0x141414@1.0:t=fill,drawtext=fontfile=$F:text='$Q1':fontcolor=white:fontsize=78:x=(w-tw)/2:y=110:borderw=4:bordercolor=black,drawtext=fontfile=$F:text='$Q2':fontcolor=0xFFD54A:fontsize=86:x=(w-tw)/2:y=240:borderw=4:bordercolor=black"
ai="drawtext=fontfile=$F:text='AI 가수':fontcolor=white:fontsize=44:x=w-tw-40:y=h-110:box=1:boxcolor=black@0.7:boxborderw=14"
# 3인 동시 화면 (시작/끝)
trio () { # $1=길이 $2=하단문구 $3=출력 $4=오디오클립
ffmpeg -y -v error -ss $SS -t $1 -i "$D/babeun_1.mp4" -ss $SS -t $1 -i "$D/abeonim_1.mp4" -ss $SS -t $1 -i "$D/yeobo_1.mp4" -ss $SS -t $1 -i "$D/$4" -filter_complex \
"[0:v]scale=360:640,setsar=1[a];[1:v]scale=360:640,setsar=1[b];[2:v]scale=360:640,setsar=1[c];[a][b][c]hstack=3[s];color=c=0x101010:s=1080x1920:d=$1:r=30[bg];[bg][s]overlay=0:520,\
drawbox=x=0:y=516:w=360:h=648:color=0x9E1B32:t=6,drawbox=x=360:y=516:w=360:h=648:color=0xFF5C8A:t=6,drawbox=x=720:y=516:w=360:h=648:color=0x2F5D3A:t=6,\
drawtext=fontfile=$F:text='1 연화':fontcolor=0xC9A24A:fontsize=72:x=180-tw/2:y=1200,drawtext=fontfile=$F:text='2 봄비':fontcolor=0xFF5C8A:fontsize=72:x=540-tw/2:y=1200,drawtext=fontfile=$F:text='3 한결':fontcolor=0xF2E6C9:fontsize=72:x=900-tw/2:y=1200,\
drawtext=fontfile=$F:text='$2':fontcolor=white:fontsize=84:x=(w-tw)/2:y=1420:borderw=4:bordercolor=black,$top,$ai,format=yuv420p[v]" \
-map "[v]" -map 3:a -c:v libx264 -preset veryfast -crf 20 -c:a aac -ar 44100 -ac 2 -t $1 "$3"
}
solo () { # $1=클립 $2=길이 $3=라벨 $4=색 $5=출력
ffmpeg -y -v error -ss $SS -t $2 -i "$D/$1" -filter_complex \
"[0:v]scale=1080:1920,setsar=1,fps=30,$top,drawbox=x=0:y=1540:w=1080:h=200:color=0x141414@0.85:t=fill,drawtext=fontfile=$F:text='$3':fontcolor=$4:fontsize=120:x=(w-tw)/2:y=1565:borderw=5:bordercolor=black,$ai,format=yuv420p[v]" \
-map "[v]" -map 0:a -c:v libx264 -preset veryfast -crf 20 -c:a aac -ar 44100 -ac 2 -t $2 "$5"
}
trio 1.6 "끝까지 듣고 골라 주세요" $T/0.mp4 babeun_1.mp4
solo babeun_1.mp4 1.8 "1  연화" 0xC9A24A $T/1.mp4
solo abeonim_1.mp4 1.8 "2  봄비" 0xFF5C8A $T/2.mp4
solo yeobo_1.mp4 1.8 "3  한결" 0xF2E6C9 $T/3.mp4
trio 1.4 "댓글로 숫자만! 1 · 2 · 3" $T/4.mp4 yeobo_1.mp4
printf "file '%s'\n" $T/0.mp4 $T/1.mp4 $T/2.mp4 $T/3.mp4 $T/4.mp4 > $T/list.txt
ffmpeg -y -v error -f concat -safe 0 -i $T/list.txt -c:v libx264 -preset veryfast -crf 20 -c:a aac -af "afade=t=out:st=7.9:d=0.5" "$OUT"
rm -rf "$T"
