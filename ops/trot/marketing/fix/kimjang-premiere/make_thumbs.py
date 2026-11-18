from PIL import Image, ImageDraw, ImageFont, ImageFilter
import sys
D='/home/claude/chainbrief/ops/trot/'
OUT=D+'marketing/fix/kimjang-premiere/'
FB='/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'
FBo='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
def font(p,s): return ImageFont.truetype(p,s,index=1)  # index1 = KR
yh=Image.open(D+'design/2026-11-15/final-yh-babeun.jpg').convert('RGB')
hg=Image.open(D+'design/2026-11-15/orig-N8ryENhggQc.jpg').convert('RGB')
bb=Image.open('/tmp/claude-0/k/f05.jpg').convert('RGB')
def circle(img,box,size,ring):
    c=img.crop(box).resize((size,size),Image.LANCZOS)
    m=Image.new('L',(size,size),0); ImageDraw.Draw(m).ellipse((0,0,size-1,size-1),fill=255)
    out=Image.new('RGBA',(size+12,size+12),(0,0,0,0)); d=ImageDraw.Draw(out)
    d.ellipse((0,0,size+11,size+11),fill=ring)
    out.paste(c,(6,6),m); return out
def text_stroke(d,xy,t,f,fill,sw=8):
    d.text(xy,t,font=f,fill=fill,stroke_width=sw,stroke_fill=(15,10,10))
def make(name,panel,l1,l2,c1,c2,face,facebox,minis,tagcol):
    W,H=1280,720; im=Image.new('RGB',(W,H),panel)
    # right face area x 520-1280
    fw=W-520
    f=face.crop(facebox); r=fw/f.width; f=f.resize((fw,int(f.height*r)),Image.LANCZOS)
    if f.height<H: f=face.crop(facebox).resize((int(face.crop(facebox).width*H/face.crop(facebox).height),H),Image.LANCZOS)
    f=f.crop(((f.width-fw)//2,(f.height-H)//2,(f.width-fw)//2+fw,(f.height-H)//2+H))
    # gradient blend
    mask=Image.new('L',(fw,H),255); md=ImageDraw.Draw(mask)
    for x in range(120): md.line([(x,0),(x,H)],fill=int(255*x/120))
    im.paste(f,(520,0),mask)
    d=ImageDraw.Draw(im)
    # name chip
    fs=font(FBo,30); d.rounded_rectangle((44,40,250,92),12,fill=tagcol); d.text((60,44),'김장 프리미어',font=fs,fill=(40,10,10))
    F=font(FB,128)
    text_stroke(d,(40,150),l1,F,c1); text_stroke(d,(40,300),l2,F,c2)
    # small line
    fsm=font(FBo,30)
    d.text((48,505),'11/21(토) 오전 10시 · 연화·봄비·한결',font=fsm,fill=(255,255,255))
    # minis
    x=48
    for img,box,ring in minis:
        c=circle(img,box,104,ring); im.paste(c,(x,560),c); x+=130
    # AI badge
    fa=font(FB,34); d.rounded_rectangle((1110,632,1252,692),10,fill=(10,10,10),outline=(255,255,255),width=3)
    d.text((1126,636),'AI 가수',font=fa,fill=(255,255,255))
    im.save(OUT+name+'.jpg',quality=92); return im
A=make('thumb-A-kimjang-1hour',(0x9E,0x1B,0x32),'김장하며','1시간',(255,255,255),(0xC9,0xA2,0x4A),
  yh,(640,0,1280,625),[(bb,(170,420,930,1180),(0xFF,0x5C,0x8A)),(hg,(230,40,570,380),(0x2F,0x5D,0x3A))],(0xC9,0xA2,0x4A))
C=make('thumb-C-heori',(0xFF,0x5C,0x8A),'허리 펴고','한 곡 더!',(255,255,255),(0xFF,0xF0,0x6A),
  bb,(0,440,1080,1180),[(yh,(770,110,1130,470),(0x9E,0x1B,0x32)),(hg,(230,40,570,380),(0x2F,0x5D,0x3A))],(0x3E,0xD6,0xB5))
# 168px preview
pv=Image.new('RGB',(2*168*16//9+60,168*1+40),(240,240,240))
w=168*16//9
for i,t in enumerate([A,C]): pv.paste(t.resize((w,168),Image.LANCZOS),(20+i*(w+20),20))
pv.save(OUT+'preview-168px.png')
