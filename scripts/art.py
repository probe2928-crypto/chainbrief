"""체인브리프 히어로 아트 생성 (절차적 생성, 라이선스 걱정 없음)
사용: python3 scripts/art.py  → public/art/<name>.jpg (2000px) + <name>-m.jpg (1000px)
"""
import os
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

W, H = 2000, 1125
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "art")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(26)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
U, V = xx / W, yy / H


def noise(scale, seed):
    r = np.random.default_rng(seed).standard_normal((H, W)).astype(np.float32)
    n = gaussian_filter(r, scale)
    return (n - n.min()) / (n.max() - n.min() + 1e-9)


def warp(field, ax, ay, amt):
    return map_coordinates(field, [np.clip(yy + ay * amt, 0, H - 1), np.clip(xx + ax * amt, 0, W - 1)], order=1, mode="reflect")


def grade(t, stops):
    """t: 0..1 array, stops: [(pos, (r,g,b)), ...]"""
    t = np.clip(t, 0, 1)
    out = np.zeros((H, W, 3), np.float32)
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (t >= p0) & (t <= p1)
        k = ((t - p0) / (p1 - p0 + 1e-9))[..., None]
        out[m] = (np.array(c0) * (1 - k) + np.array(c1) * k)[m]
    return out


def grain(img, amt=7, seed=1):
    g = np.random.default_rng(seed).normal(0, amt, (H, W, 1)).astype(np.float32)
    return img + g


def vignette(img, s=0.55):
    d = np.sqrt((U - 0.5) ** 2 * 1.2 + (V - 0.5) ** 2)
    return img * (1 - s * np.clip(d * 1.3, 0, 1) ** 2)[..., None]


def save(name, img):
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    im.save(os.path.join(OUT, f"{name}.jpg"), quality=84, optimize=True, progressive=True)
    im.resize((1000, 563), Image.LANCZOS).save(os.path.join(OUT, f"{name}-m.jpg"), quality=82, optimize=True, progressive=True)
    print("saved", name)


# 1. gold silk — 접힌 실크 표면 + 측광
n1 = noise(220, 1)
h = np.sin((U * 5.5 + V * 1.6) * np.pi + n1 * 5) + 0.45 * np.sin((U * 11 - V * 3) * np.pi + n1 * 3)
h = gaussian_filter(h, 10)
gy, gx = np.gradient(h)
lam = (gx * -0.75 + gy * -0.45) * 160
shade = 1 / (1 + np.exp(-lam * 3))
img = grade(shade * 0.9 + noise(260, 3) * 0.1, [(0, (12, 9, 6)), (0.35, (54, 38, 18)), (0.7, (150, 112, 54)), (0.92, (226, 192, 128)), (1, (246, 226, 180))])
img = img * (0.55 + 0.45 * np.clip(1.2 - U * 0.9, 0, 1))[..., None]
save("gold-silk", grain(vignette(img, 0.55), 6, 11))

# 2. smoke — 어둠 속 흐르는 연기
base = noise(110, 4)
ax, ay = (noise(160, 5) - 0.5) * 2, (noise(160, 6) - 0.5) * 2
f = warp(base, ax, ay, 420)
f2 = warp(noise(50, 7), ax, ay, 300)
wisp = np.clip((f * 0.75 + f2 * 0.35) - 0.42, 0, 1) * 2.2
wisp = gaussian_filter(wisp, 3) * np.clip(U * 1.4, 0, 1)
img = grade(V * 0.3 + 0.1, [(0, (12, 12, 14)), (1, (20, 20, 24))])
img += (wisp ** 1.6 * 150)[..., None] * np.array([0.92, 0.9, 0.95])
save("smoke", grain(vignette(img, 0.5), 7, 12))

# 3. blue hour — 깊은 남색 위 사선 빛줄기와 보케
img = grade(V * 0.7 + noise(300, 8) * 0.3, [(0, (14, 20, 46)), (0.6, (22, 30, 70)), (1, (10, 12, 26))])
for i, (cx, w, a) in enumerate([(0.62, 0.05, 90), (0.7, 0.02, 120), (0.78, 0.08, 60)]):
    d = np.abs((U - cx) + (V - 0.5) * 0.45)
    img += (np.exp(-(d / w) ** 2) * a)[..., None] * np.array([0.62, 0.66, 1.0])
for _ in range(38):
    x, y, r = rng.uniform(0.05, 0.95), rng.uniform(0.1, 0.9), rng.uniform(0.008, 0.035)
    d = np.sqrt((U - x) ** 2 * (W / H) ** 2 + (V - y) ** 2)
    img += (np.exp(-(d / r) ** 4) * rng.uniform(15, 45))[..., None] * np.array([0.75, 0.7, 1.0])
save("blue-hour", grain(vignette(gaussian_filter(img, (2, 2, 0)), 0.45), 7, 13))

# 4. rose dusk — 로스코풍 색면 + 부드러운 가장자리
img = np.zeros((H, W, 3), np.float32) + np.array([28, 18, 20])
for (y0, y1, col) in [(0.06, 0.52, (150, 72, 64)), (0.58, 0.92, (86, 38, 44))]:
    edge = noise(18, int(y0 * 100)) * 0.02
    m = np.clip((V - (y0 + edge)) * 60, 0, 1) * np.clip(((y1 + edge) - V) * 60, 0, 1) * np.clip((U - 0.08) * 40, 0, 1) * np.clip((0.92 - U) * 40, 0, 1)
    m = gaussian_filter(m, 14) * (0.85 + noise(80, 9) * 0.3)
    img = img * (1 - m[..., None]) + np.array(col) * m[..., None]
save("rose-dusk", grain(vignette(img, 0.35), 8, 14))

# 5. sage bands — 아그네스 마틴풍 가로 띠
img = grade(noise(400, 10) * 0.4 + 0.3, [(0, (34, 40, 30)), (1, (58, 66, 48))])
for k in range(14):
    y = 0.08 + k * 0.064
    wob = (noise(30, 20 + k) - 0.5) * 0.004
    line = np.exp(-(((V - y - wob) * H) / 1.1) ** 2)
    img += (line * 70)[..., None] * np.array([0.93, 0.95, 0.85])
save("sage-bands", grain(vignette(img, 0.4), 6, 15))

# 6. prism — 검은 바탕의 가는 분광선
img = np.zeros((H, W, 3), np.float32) + 6
spectrum = [(255, 70, 70), (255, 170, 60), (240, 230, 90), (90, 220, 140), (80, 150, 255), (150, 100, 255)]
for i, col in enumerate(spectrum):
    off = (i - 2.5) * 0.006
    d = np.abs((V - 0.55 - off) - (U - 0.5) * 0.18) * H
    fan = np.clip((U - 0.38) * 4, 0, 1)
    img += (np.exp(-(d / (1.4 + fan * 18)) ** 2) * (0.35 + fan * 0.9) * 120)[..., None] * np.array(col) / 255
beam = np.exp(-(np.abs((V - 0.55) - (U - 0.5) * 0.18) * H / 2.2) ** 2) * np.clip((0.4 - U) * 6, 0, 1)
img += (beam * 220)[..., None]
img = gaussian_filter(img, (1.5, 1.5, 0)) + gaussian_filter(img, (40, 40, 0)) * 0.6
save("prism", grain(vignette(img, 0.3), 6, 16))

# 7. contour — 지형도 등고선 (온체인·데이터)
f = gaussian_filter(noise(160, 30) + noise(70, 31) * 0.4, 3)
lines = np.abs(np.sin(f * 90))
lines = np.clip(1 - lines * 9, 0, 1)
major = np.clip(1 - np.abs(np.sin(f * 18)) * 25, 0, 1)
img = grade(f, [(0, (8, 9, 10)), (1, (22, 22, 20))])
img += (lines * 55 + major * 110)[..., None] * np.array([0.85, 0.72, 0.42])
save("contour", grain(vignette(img, 0.55), 5, 17))

# 8. light grid — 점 매트릭스 (거래소 전광판)
img = np.zeros((H, W, 3), np.float32) + np.array([10, 10, 14])
step = 22
gxm, gym = (xx % step) - step / 2, (yy % step) - step / 2
dot = np.exp(-(gxm ** 2 + gym ** 2) / 10)
level = noise(70, 40)
wave = np.clip(level * 1.6 - 0.35 + np.sin(U * 12) * 0.08, 0, 1) ** 2
warm = np.clip(1 - V * 1.4, 0, 1)
col = np.stack([200 + warm * 40, 170 + warm * 10, 120 - warm * 40], -1)
img += dot[..., None] * (wave[..., None] * 1.7 + 0.12) * col
img += gaussian_filter(dot * wave, 10)[..., None] * col * 1.4
save("light-grid", grain(vignette(img, 0.5), 5, 18))
