// shared helpers: deterministic RNG, easing, chart + bokeh background on canvas
const cl = x => Math.max(0, Math.min(1, x));
const p = (t, a, b) => cl((t - a) / (b - a));
const eo3 = x => 1 - Math.pow(1 - cl(x), 3);
const eo5 = x => 1 - Math.pow(1 - cl(x), 5);
const eio = x => { x = cl(x); return x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2; };
const ei3 = x => Math.pow(cl(x), 3);
const back = x => { x = cl(x); const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// pre-generate candles
function makeCandles(n, seed) {
  const r = rng(seed); let v = 100; const out = [];
  for (let i = 0; i < n; i++) {
    const o = v, c = v + (r() - .46) * 6; const h = Math.max(o, c) + r() * 3, l = Math.min(o, c) - r() * 3;
    out.push({ o, c, h, l }); v = c;
  }
  return out;
}
function drawChart(ctx, W, H, t, candles, opts) {
  const { up = '#2ee6a8', dn = '#ff4d6d', alpha = .5, speed = 40, cw = 26, y0 = H * .5, scale = 9 } = opts || {};
  ctx.save(); ctx.globalAlpha = alpha;
  const off = t * speed;
  for (let i = 0; i < candles.length; i++) {
    const x = i * (cw + 12) - off; if (x < -60 || x > W + 60) continue;
    const k = candles[i]; const Y = v => y0 - (v - 100) * scale;
    const col = k.c >= k.o ? up : dn;
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + cw / 2, Y(k.h)); ctx.lineTo(x + cw / 2, Y(k.l)); ctx.stroke();
    const top = Y(Math.max(k.o, k.c)), hh = Math.max(4, Math.abs(Y(k.o) - Y(k.c)));
    ctx.fillRect(x, top, cw, hh);
  }
  ctx.restore();
}
function makeBokeh(n, seed, W, H) {
  const r = rng(seed); return Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, s: 6 + r() * 40, v: 8 + r() * 30, ph: r() * 6.28, a: .15 + r() * .5, d: r() }));
}
function drawBokeh(ctx, W, H, t, bk, rgb) {
  for (const b of bk) {
    const y = ((b.y - t * b.v) % H + H) % H, x = b.x + Math.sin(t * .8 + b.ph) * 20;
    const a = b.a * (.6 + .4 * Math.sin(t * 2 + b.ph));
    const g = ctx.createRadialGradient(x, y, 0, x, y, b.s);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.5, `rgba(${rgb},${a * .35})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, b.s, 0, 6.29); ctx.fill();
  }
}
// split element text into masked letters
function splitLetters(el) {
  const txt = el.textContent; el.textContent = '';
  return [...txt].map(ch => {
    const m = document.createElement('span'); m.className = 'lm';
    const s = document.createElement('span'); s.className = 'li'; s.textContent = ch === ' ' ? ' ' : ch;
    m.appendChild(s); el.appendChild(m); return s;
  });
}
