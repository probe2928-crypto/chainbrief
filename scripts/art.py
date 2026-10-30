"""체인브리프 히어로 아트 생성 (절차적 생성, 라이선스 걱정 없음)
사용: python3 scripts/art.py  → public/art/<name>.jpg (2000px) + <name>-l.jpg (1600px) + <name>-m.jpg (1000px)
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
    im.resize((1600, 900), Image.LANCZOS).save(os.path.join(OUT, f"{name}-l.jpg"), quality=84, optimize=True, progressive=True)
    im.resize((1000, 563), Image.LANCZOS).save(os.path.join(OUT, f"{name}-m.jpg"), quality=82, optimize=True, progressive=True)
    print("saved", name)


# 1. gold silk — 길게 흐르는 실크 주름 + 스펙큘러 하이라이트
w1 = (noise(300, 1) - 0.5) * 2
w2 = (noise(180, 2) - 0.5) * 2
t = U * 1.0 + V * 0.55 + w1 * 0.10
h = np.sin(t * 6.0 * np.pi + w2 * 1.4) * 0.6 + np.sin(t * 2.6 * np.pi + w1 * 1.8) * 0.4
h = gaussian_filter(h, 6)
gy, gx = np.gradient(h)
nx, ny = -gx * 70, -gy * 70
nz = np.ones_like(nx)
nl = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
nx, ny, nz = nx / nl, ny / nl, nz / nl
L = np.array([-0.55, -0.45, 0.70]); L = L / np.linalg.norm(L)
diff = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
Hh = L + np.array([0, 0, 1.0]); Hh = Hh / np.linalg.norm(Hh)
spec = np.clip(nx * Hh[0] + ny * Hh[1] + nz * Hh[2], 0, 1) ** 60
tone = diff ** 1.6 * 0.82 + spec * 0.55
tone = tone * (0.45 + 0.55 * np.clip(1.15 - U * 0.8 - V * 0.2, 0, 1))
img = grade(tone, [(0, (18, 13, 8)), (0.25, (58, 42, 22)), (0.55, (128, 96, 50)), (0.8, (212, 178, 118)), (1, (250, 236, 204))])
save("gold-silk", grain(vignette(img, 0.5), 5, 11))

# 2. smoke — 은빛 연기 필라멘트 (ridged noise + domain warp)
ax, ay = (noise(220, 5) - 0.5) * 2, (noise(220, 6) - 0.5) * 2
acc = np.zeros((H, W), np.float32)
for k, (sc, amp, sd) in enumerate([(90, 1.0, 41), (45, 0.55, 42), (22, 0.3, 43)]):
    n = warp(noise(sc, sd), ax, ay, 520 - k * 120)
    ridge = 1 - np.abs(n * 2 - 1)
    acc += ridge ** 7 * amp
acc = gaussian_filter(acc, 1.2)
mask = np.clip((U - 0.18) * 1.6, 0, 1) * np.clip(1.25 - np.abs(V - 0.5) * 1.6, 0, 1)
fil = np.clip(acc * mask, 0, 1.4)
img = grade(V * 0.4 + noise(300, 44) * 0.2, [(0, (7, 7, 9)), (1, (16, 16, 20))])
img += (fil ** 1.2 * 175)[..., None] * np.array([0.9, 0.92, 1.0])
img += gaussian_filter(fil, 18)[..., None] * 40 * np.array([0.7, 0.75, 0.9])
save("smoke", grain(vignette(img, 0.5), 6, 12))

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

# 5. sage dunes — 안개 낀 세이지 빛 능선 (먼 능선일수록 밝고 흐리게)
img = grade(V, [(0, (214, 220, 204)), (0.45, (178, 188, 162)), (1, (150, 160, 134))])
for k in range(7):
    y0 = 0.26 + k * 0.11
    ridge = y0 + (0.05 + k * 0.008) * np.sin(U * (1.6 + k * 0.3) * np.pi + k * 1.9) + (noise(300, 60 + k) - 0.5) * 0.06
    below = np.clip((V - ridge) * 140, 0, 1)
    f = k / 6
    col = np.array([186, 196, 170]) * (1 - f) + np.array([34, 42, 30]) * f
    haze = np.exp(-np.clip(V - ridge, 0, 1) * 6)
    layer = col[None, None, :] * (0.86 + 0.14 * haze[..., None]) + haze[..., None] * 18 * (1 - f)
    img = img * (1 - below[..., None]) + layer * below[..., None]
img = gaussian_filter(img, (1.0, 1.0, 0))
save("sage-bands", grain(vignette(img, 0.38), 6, 15))

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
