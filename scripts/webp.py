#!/usr/bin/env python3
"""기사 그림(public/media/articles/*.png·jpg) 옆에 같은 이름의 .webp를 만든다.
빌드(scripts/build*.mjs)는 .webp가 있으면 <picture><source type="image/webp">로 먼저 내보내고, 없으면 원본만 쓴다.
공유 카드(og:image)·앱 피드는 원본(PNG/JPG) 그대로. 필요: Pillow (pip install pillow).
사용: python3 scripts/webp.py  — 새 그림이나 원본이 더 최신인 것만 변환."""
import os, sys
from PIL import Image

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "media", "articles")
MAXW = 1600  # 1920px 원본도 화면엔 이 이상 필요 없음 (폰 3x ≈ 1170px)
made = saved = 0
for f in sorted(os.listdir(D)):
    if not f.lower().endswith((".png", ".jpg", ".jpeg")):
        continue
    src = os.path.join(D, f)
    dst = os.path.splitext(src)[0] + ".webp"
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        continue
    im = Image.open(src).convert("RGB")
    if im.width > MAXW:
        im = im.resize((MAXW, round(im.height * MAXW / im.width)), Image.LANCZOS)
    im.save(dst, "WEBP", quality=80, method=6)
    if os.path.getsize(dst) >= os.path.getsize(src):  # 이득이 없으면 두지 않음
        os.remove(dst)
        continue
    made += 1
    saved += os.path.getsize(src) - os.path.getsize(dst)
print(f"webp {made}개 생성 · {saved // 1024}KB 절약", file=sys.stderr)
