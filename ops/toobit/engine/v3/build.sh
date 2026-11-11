cd "$(dirname "$0")/.."
# frames already rendered
ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='0.8*sin(2*PI*45*mod(t,0.4687)*(1+3*exp(-mod(t,0.4687)*30)))*exp(-mod(t,0.4687)*7) + 0.05*(random(0)*2-1)*exp(-mod(t+0.234,0.4687)*50) + 0.05*sin(2*PI*55*t)':s=44100:d=32" -af "lowpass=f=6000,volume=0.5" sfx/bed3.wav
CUTS="4100 5620 8360 11000 15240 21080 24200 29240"
INS=""; FIL=""; L=""; i=3
for c in $CUTS; do INS="$INS -i sfx/whoosh.wav"; FIL="$FIL[$i]adelay=$((c-150))|$((c-150)),volume=0.6[w$i];"; L="$L[w$i]"; i=$((i+1)); done
for b in 3400:boom 13650:boom 20160:boom 28000:shimmer; do ms=${b%%:*}; f=${b##*:}; INS="$INS -i sfx/$f.wav"; FIL="$FIL[$i]adelay=$ms|$ms,volume=0.8[w$i];"; L="$L[w$i]"; i=$((i+1)); done
N=$((i-1))
ffmpeg -y -loglevel error -framerate 30 -i fr_v3/f%04d.jpg -i v3/vo.mp3 -i sfx/bed3.wav $INS \
 -filter_complex "[1]volume=1.5,apad[vo];[2]volume=0.45,afade=t=out:st=31.4:d=0.5[bed];${FIL}[vo][bed]${L}amix=$N:normalize=0,alimiter=limit=0.95,atrim=0:31.9[a]" \
 -map 0:v -map "[a]" -c:v libx264 -preset veryfast -crf 16 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -t 31.9 v3/body.mp4
ffmpeg -y -loglevel error -framerate 30 -i fr_end3/f%04d.jpg -i sfx/whoosh.wav -i sfx/shimmer.wav -filter_complex "[1]volume=0.8[a];[2]adelay=700|700,volume=0.8[b];[a][b]amix=2:normalize=0,apad,atrim=0:3.5[au]" -map 0:v -map "[au]" -c:v libx264 -preset veryfast -crf 16 -pix_fmt yuv420p -c:a aac -ar 44100 -b:a 192k -t 3.5 v3/end3.mp4
ffmpeg -y -loglevel error -i v3/body.mp4 -i v3/end3.mp4 -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k "out3/시안_v3.1_경제뉴스_KR.mp4"
echo DONE
