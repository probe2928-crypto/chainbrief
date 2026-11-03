"""SNS 세로 클립(릴스/밴드/페북): 메들리 곡 구간 4:3 크롭 + 큰 글씨. 720x1280, 30s, ~3MB."""
import subprocess, os, json
V="/home/claude/trotstage/video"; O="/home/claude/trotstage/sns/clips"
FONT="/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc"; SERIF="/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
S=[("eomma","연화","엄마의 바다",["엄마 생각나시는 분?","철썩철썩 파도야, 엄마 소식 전해다오","이 딸이 노래합니다"]),
   ("ttak","봄비","딱 내 스타일",["박수 준비되셨어요?","눈이 딱 마주쳤네!","오늘부터 우리 사이 1일"]),
   ("dangsin","한결","당신이라서",["여보, 이 노래 들어 주오","고생만 시켜 미안하오","다시 태어나도 당신 손 잡을래"]),
   ("gukbap","연화","국밥 한 그릇",["엄마 손맛 그리운 분?","우리 딸 노래 한 곡 해 봐라","국밥 한 그릇에 엄마 생각"]),
   ("ddeori","봄비","떨이요 떨이",["이모님 오늘 너무 고우셔!","오늘만 특가, 내 마음 떨이","먼저 오는 사람이 임자!"]),
   ("nunim","한결","누님",["누님들, 저 보러 오셨죠?","누님 오늘따라 왜 이리 고와요","윙크 한 번 받아 주오~"])]
COL={"연화":"0xFFD27A","봄비":"0xFF8FC8","한결":"0xE9C77B"}
meta=[]
def tf(n,s):
    p=f"{O}/_{n}.txt"; open(p,"w").write(s); return p
for i,(k,singer,title,hooks) in enumerate(S):
    src=f"{V}/medley/{i:02d}_{k}.mp4"
    D=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",src]))
    starts=[t for t in range(40,int(D)-35,32)][:5]
    for j,st in enumerate(starts):
        hook=hooks[j%len(hooks)]; name=f"{k}_{j+1}"
        fs=min(76,int(640/max(8,len(hook))))
        vf=(f"[0:v]crop=1328:996:296:84,scale=720:540,setsar=1[fg];"
            f"[0:v]crop=608:1080:656:0,scale=720:1280,boxblur=25:2,eq=brightness=-0.35[bg];"
            f"[bg][fg]overlay=0:400,"
            f"drawbox=x=0:y=120:w=720:h=250:color=black@0.55:t=fill,"
            f"drawtext=fontfile={FONT}:textfile={tf(name+'h',hook)}:fontsize={fs}:fontcolor=white:borderw=4:bordercolor=black:x=(w-tw)/2:y=150,"
            f"drawtext=fontfile={SERIF}:textfile={tf(name+'t',singer+' 「'+title+'」')}:fontsize=58:fontcolor={COL[singer]}:x=(w-tw)/2:y=260,"
            f"drawbox=x=0:y=990:w=720:h=200:color=black@0.55:t=fill,"
            f"drawtext=fontfile={FONT}:textfile={tf(name+'c','전곡은 유튜브 「트롯스테이지」')}:fontsize=46:fontcolor=0xFFE07A:x=(w-tw)/2:y=1020,"
            f"drawtext=fontfile={FONT}:textfile={tf(name+'a','매일 저녁 6시 30분 새 무대')}:fontsize=40:fontcolor=white:x=(w-tw)/2:y=1085,"
            f"drawtext=fontfile={FONT}:textfile={tf(name+'b','※ AI로 제작한 가상 가수')}:fontsize=30:fontcolor=white@0.85:x=(w-tw)/2:y=1145[v]")
        out=f"{O}/{name}.mp4"
        subprocess.run(["ffmpeg","-v","error","-y","-ss",str(st),"-t","30","-i",src,"-filter_complex",vf,"-map","[v]","-map","0:a",
            "-c:v","libx264","-preset","veryfast","-b:v","700k","-maxrate","900k","-bufsize","1400k","-pix_fmt","yuv420p",
            "-c:a","aac","-b:a","96k","-movflags","+faststart",out],check=True)
        meta.append({"id":name,"file":f"clips/{name}.mp4","singer":singer,"title":title,"hook":hook,"bytes":os.path.getsize(out)})
        print(name, os.path.getsize(out)//1024,"KB",flush=True)
json.dump(meta,open("/home/claude/trotstage/sns/clips.json","w"),ensure_ascii=False,indent=1)
