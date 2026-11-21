"""1시간 연속듣기 영상(1920x1080, 오른쪽 사이드바 곡목록)에서 챕터 시작 시간을 뽑는다.
사용: python3 chapters_from_video.py hour.mp4   (trot-media yt/hour/part0~8 을 cat 으로 합친 파일)
사이드바 강조 줄(밝은 배경) 위치를 1초마다 읽어 바뀌는 지점을 출력."""
import subprocess, sys, numpy as np
src = sys.argv[1]
raw = subprocess.run(["ffmpeg","-v","error","-i",src,"-vf","fps=1,crop=480:720:1440:130,scale=48:72,format=gray",
                      "-f","rawvideo","-"], capture_output=True).stdout
a = np.frombuffer(raw, np.uint8).reshape(-1,72,48).astype(float)
prev, segs = None, []
for i, f in enumerate(a):
    rows = [f[int(4.2+6.2*r)-2:int(4.2+6.2*r)+2, 4:44].mean() for r in range(11)]
    s = sorted(rows); r = int(np.argmax(rows))+1 if s[-1]-s[-2] > 25 else 0
    if r != prev: segs.append([i, r]); prev = r
for k, (i, r) in enumerate(segs):
    end = segs[k+1][0] if k+1 < len(segs) else len(a)
    if end - i >= 3: print(f"{i//60}:{i%60:02d}  목록 {r:02d}번  ({end-i}초)")
