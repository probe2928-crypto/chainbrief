# 김장 프리미어 인스타 카드 2종 (피드 1080x1350, 스토리 1080x1920)
# 원본: 기존 썸네일 A(thumb-A-kimjang-1hour.jpg)만 사용 — 새 이미지 생성 0, 실존 인물 0
from PIL import Image, ImageDraw, ImageFont
import os
B=os.path.dirname(os.path.abspath(__file__))
SRC=os.path.join(B,'..','kimjang-premiere','thumb-A-kimjang-1hour.jpg')
FB='/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'
FBo='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
f=lambda p,s: ImageFont.truetype(p,s,index=1)
RED=(0x9E,0x1B,0x32); GOLD=(0xC9,0xA2,0x4A); WHITE=(255,255,255); INK=(15,10,10)
hero=Image.open(SRC).convert('RGB')
def ctext(d,y,t,font,fill,W,sw=0):
    w=d.textlength(t,font=font); d.text(((W-w)/2,y),t,font=font,fill=fill,stroke_width=sw,stroke_fill=INK)
def badge(d,W,H):
    fa=f(FB,40); w=d.textlength('AI 가수',font=fa)
    d.rounded_rectangle((W-w-80,H-110,W-40,H-40),12,fill=(10,10,10),outline=WHITE,width=3)
    d.text((W-w-60,H-106),'AI 가수',font=fa,fill=WHITE)
def card(W,H,name,top):
    im=Image.new('RGB',(W,H),RED); d=ImageDraw.Draw(im)
    hw=W-80; hh=int(hero.height*hw/hero.width)
    hy=top
    im.paste(hero.resize((hw,hh),Image.LANCZOS),(40,hy))
    d.rectangle((40,hy,40+hw,hy+hh),outline=GOLD,width=6)
    y=hy+hh+50
    ctext(d,y,'11월 21일(토) 오전 10시',f(FB,74),WHITE,W,6); y+=110
    ctext(d,y,'유튜브 첫 공개',f(FB,74),GOLD,W,6); y+=130
    ctext(d,y,'고무장갑 끼고 1시간 틀어 두세요',f(FBo,44),WHITE,W); y+=70
    ctext(d,y,'연화 · 봄비 · 한결  오리지널 트로트',f(FBo,40),(250,225,200),W); y+=90
    ctext(d,y,'프로필 링크 → 트롯스테이지 → 알림 🔔'.replace(' 🔔',''),f(FBo,38),WHITE,W)
    fs=f(FBo,28); t='AI로 만든 가상 가수의 오리지널 창작곡입니다'
    d.text((40,H-90),t,font=fs,fill=(240,200,200))
    badge(d,W,H)
    im.save(os.path.join(B,name),quality=92); return im
a=card(1080,1350,'feed-1080x1350.jpg',120)
b=card(1080,1920,'story-1080x1920.jpg',420)   # 스토리: 상단 1/3 안전영역 고려해 아래로
# 스토리 상단 1/3 문구
d=ImageDraw.Draw(b); ctext(d,170,'이번 토요일, 김장 같이 해요',f(FB,66),WHITE,1080,6)
b.save(os.path.join(B,'story-1080x1920.jpg'),quality=92)
# 판독 미리보기(폰 피드 크기 360px 폭)
pv=Image.new('RGB',(360*2+60,int(1920*360/1080)+40),(235,235,235))
pv.paste(a.resize((360,450),Image.LANCZOS),(20,20)); pv.paste(b.resize((360,640),Image.LANCZOS),(400,20))
pv.save(os.path.join(B,'preview-phone.png'))
print('ok')
