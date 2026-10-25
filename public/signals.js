// 체인브리프 시그널 대시보드 — 워커 API(/api/latest, /api/series, /api/alerts)를 읽어 SVG 차트로 그린다
(() => {
  const S = window.SIG || {}; const T = S.t || {};
  const app = document.getElementById("sigApp"); if (!app) return;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tz = S.tz || "Asia/Seoul", loc = S.locale || "ko-KR";
  const hm = (ts) => new Intl.DateTimeFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ts);
  const dh = (ts) => new Intl.DateTimeFormat(loc, { timeZone: tz, month: "numeric", day: "numeric", hour: "2-digit", hourCycle: "h23" }).format(ts);
  const usd = (v) => { if (v == null || !isFinite(v)) return "—"; const a = Math.abs(v); const t = (x, d) => x.toFixed(d).replace(/\.0+$/, ""); return "$" + (a >= 1e9 ? t(a / 1e9, 2) + "B" : a >= 1e6 ? t(a / 1e6, 1) + "M" : a >= 1e3 ? t(a / 1e3, 0) + "K" : t(a, 0)); };
  const pct = (v, d = 2) => v == null || !isFinite(v) ? "—" : (v >= 0 ? "+" : "") + v.toFixed(d) + "%";
  const fr = (v) => (v >= 0 ? "+" : "") + (v * 100).toFixed(3) + "%";
  async function get(p) { const r = await fetch(S.api.replace(/\/$/, "") + p, { cache: "no-store" }); if (!r.ok) throw new Error(r.status); return r.json(); }
  const css = (n) => getComputedStyle(document.body).getPropertyValue(n).trim();
  const dark = () => matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light" || document.documentElement.dataset.theme === "dark";
  const PAL = () => dark() ? ["#3987e5", "#d95926", "#199e70"] : ["#2a78d6", "#eb6834", "#1baf7a"];

  /* ---------- tooltip ---------- */
  const tip = document.createElement("div"); tip.className = "ch-tip"; tip.hidden = true; document.body.appendChild(tip);
  function showTip(html, x, y) { tip.innerHTML = html; tip.hidden = false; const w = tip.offsetWidth; tip.style.left = Math.min(innerWidth - w - 12, Math.max(12, x - w / 2)) + "px"; tip.style.top = (y - tip.offsetHeight - 14 + scrollY) + "px"; }
  const hideTip = () => (tip.hidden = true);

  /* ---------- scales ---------- */
  function nice(min, max, n = 4) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0)), r = step0 / mag;
    const step = (r > 5 ? 10 : r > 2 ? 5 : r > 1 ? 2 : 1) * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
    return { lo, hi, ticks };
  }
  function timeTicks(t0, t1, w) {
    const n = Math.max(2, Math.floor(w / 110)), span = t1 - t0, hours = [1, 2, 3, 6, 12, 24].map((h) => h * 3600e3);
    const step = hours.find((h) => span / h <= n) || 48 * 3600e3, out = [];
    for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) out.push(t);
    return { ticks: out, fmt: span > 30 * 3600e3 ? dh : hm };
  }

  /* ---------- line chart ---------- */
  function lineChart(el, series, { unit = "%", digits = 2, zero = true } = {}) {
    const pts = series.flatMap((s) => s.points);
    if (pts.length < 2) { el.innerHTML = `<p class="ch-empty">${esc(T.collecting || "")}</p>`; return; }
    const W = Math.max(280, el.clientWidth), H = W < 520 ? 210 : 260, m = { t: 14, r: W < 520 ? 56 : 72, b: 28, l: 44 };
    const t0 = Math.min(...pts.map((p) => p[0])), t1 = Math.max(...pts.map((p) => p[0]));
    let vmin = Math.min(...pts.map((p) => p[1])), vmax = Math.max(...pts.map((p) => p[1]));
    if (zero) { vmin = Math.min(vmin, 0); vmax = Math.max(vmax, 0); }
    const ys = nice(vmin, vmax), X = (t) => m.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - m.l - m.r), Y = (v) => m.t + (1 - (v - ys.lo) / (ys.hi - ys.lo)) * (H - m.t - m.b);
    const xt = timeTicks(t0, t1, W - m.l - m.r);
    let g = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(el.dataset.title || "")}">`;
    g += ys.ticks.map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" class="${v === 0 ? "ch-zero" : "ch-grid"}"/><text x="${m.l - 8}" y="${Y(v) + 4}" class="ch-ax" text-anchor="end">${v.toFixed(Math.max(0, Math.min(4, -Math.floor(Math.log10(Math.abs(ys.ticks[1] - ys.ticks[0]) || 1)))))}${unit}</text>`).join("");
    g += xt.ticks.map((t) => `<text x="${X(t)}" y="${H - 8}" class="ch-ax" text-anchor="middle">${xt.fmt(t)}</text>`).join("");
    series.forEach((s) => {
      if (!s.points.length) return;
      const d = s.points.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join("");
      const last = s.points.at(-1);
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      g += `<circle cx="${X(last[0])}" cy="${Y(last[1])}" r="4" fill="${s.color}" class="ch-ring"/><text x="${X(last[0]) + 8}" y="${Y(last[1]) + 4}" class="ch-lbl">${esc(s.short || s.name)}</text>`;
    });
    g += `<line class="ch-cross" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/><rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent" class="ch-hit"/></svg>`;
    const legend = series.length > 1 ? `<div class="ch-legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div>` : "";
    el.innerHTML = legend + g;
    const svg = $("svg", el), cross = $(".ch-cross", svg), hit = $(".ch-hit", svg);
    const move = (e) => {
      const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (W / r.width), t = t0 + ((x - m.l) / (W - m.l - m.r)) * (t1 - t0);
      cross.setAttribute("x1", x); cross.setAttribute("x2", x); cross.setAttribute("visibility", "visible");
      const rows = series.map((s) => { if (!s.points.length) return ""; let best = s.points[0]; for (const p of s.points) if (Math.abs(p[0] - t) < Math.abs(best[0] - t)) best = p; return `<div><i style="background:${s.color}"></i>${esc(s.name)} <b>${best[1] >= 0 && unit === "%" ? "+" : ""}${best[1].toFixed(digits)}${unit}</b></div>`; }).join("");
      showTip(`<small>${dh(t)}${tz === "UTC" ? " UTC" : ""}</small>${rows}`, e.clientX, r.top + 10);
    };
    hit.addEventListener("pointermove", move); hit.addEventListener("pointerdown", move); hit.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); hideTip(); });
  }

  /* ---------- mirrored liquidation bars (longs up, shorts down) ---------- */
  function liqChart(el, long, short) {
    const buckets = new Map();
    for (const [ts, v] of long) { const h = Math.floor(ts / 3600e3) * 3600e3; const b = buckets.get(h) || { l: 0, s: 0 }; b.l += v; buckets.set(h, b); }
    for (const [ts, v] of short) { const h = Math.floor(ts / 3600e3) * 3600e3; const b = buckets.get(h) || { l: 0, s: 0 }; b.s += v; buckets.set(h, b); }
    const rows = [...buckets.entries()].sort((a, b) => a[0] - b[0]).slice(-24);
    if (rows.length < 2) { el.innerHTML = `<p class="ch-empty">${esc(T.collecting || "")}</p>`; return; }
    const W = Math.max(280, el.clientWidth), H = W < 520 ? 220 : 270, m = { t: 12, r: 12, b: 28, l: 52 };
    const mx = Math.max(1, ...rows.map(([, b]) => Math.max(b.l, b.s)));
    const ys = nice(0, mx, 2), mid = m.t + (H - m.t - m.b) / 2, half = (H - m.t - m.b) / 2, sc = (v) => (v / ys.hi) * half;
    const bw = (W - m.l - m.r) / rows.length, up = css("--up") || "#A8201A", dn = css("--down") || "#1D3F91";
    let g = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(el.dataset.title || "")}">`;
    for (const v of ys.ticks) { if (!v) continue; g += `<line x1="${m.l}" x2="${W - m.r}" y1="${mid - sc(v)}" y2="${mid - sc(v)}" class="ch-grid"/><line x1="${m.l}" x2="${W - m.r}" y1="${mid + sc(v)}" y2="${mid + sc(v)}" class="ch-grid"/><text x="${m.l - 8}" y="${mid - sc(v) + 4}" class="ch-ax" text-anchor="end">${usd(v)}</text><text x="${m.l - 8}" y="${mid + sc(v) + 4}" class="ch-ax" text-anchor="end">${usd(v)}</text>`; }
    g += `<line x1="${m.l}" x2="${W - m.r}" y1="${mid}" y2="${mid}" class="ch-zero"/>`;
    g += `<text x="${m.l + 4}" y="${m.t + 10}" class="ch-side">${esc(T.longs)} ↑</text><text x="${m.l + 4}" y="${H - m.b - 6}" class="ch-side">${esc(T.shorts)} ↓</text>`;
    rows.forEach(([ts, b], i) => {
      const x = m.l + i * bw + 1, w = Math.max(1, bw - 2), hl = sc(b.l), hs = sc(b.s);
      if (hl > 0) g += `<path d="M${x},${mid - 1}V${mid - hl + Math.min(2, hl)}q0,-2 2,-2h${w - 4}q2,0 2,2V${mid - 1}Z" fill="${up}"/>`;
      if (hs > 0) g += `<path d="M${x},${mid + 1}V${mid + hs - Math.min(2, hs)}q0,2 2,2h${w - 4}q2,0 2,-2V${mid + 1}Z" fill="${dn}"/>`;
      g += `<rect x="${m.l + i * bw}" y="${m.t}" width="${bw}" height="${H - m.t - m.b}" fill="transparent" class="ch-bar" data-i="${i}"/>`;
      if (i % Math.ceil(rows.length / Math.max(2, Math.floor((W - m.l) / 70))) === 0) g += `<text x="${x + w / 2}" y="${H - 8}" class="ch-ax" text-anchor="middle">${hm(ts)}</text>`;
    });
    el.innerHTML = `<div class="ch-legend"><span><i style="background:${up}"></i>${esc(T.longs)}</span><span><i style="background:${dn}"></i>${esc(T.shorts)}</span></div>` + g + "</svg>";
    el.querySelectorAll(".ch-bar").forEach((r) => {
      const f = (e) => { const [ts, b] = rows[+r.dataset.i]; showTip(`<small>${dh(ts)}${tz === "UTC" ? " UTC" : ""}</small><div><i style="background:${up}"></i>${esc(T.longs)} <b>${usd(b.l)}</b></div><div><i style="background:${dn}"></i>${esc(T.shorts)} <b>${usd(b.s)}</b></div>`, e.clientX, r.getBoundingClientRect().top + 10); };
      r.addEventListener("pointermove", f); r.addEventListener("pointerdown", f); r.addEventListener("pointerleave", hideTip);
    });
  }

  /* ---------- render ---------- */
  let last = null;
  async function load() {
    if (!S.api) return;
    try {
      const [lat, ser, al] = await Promise.all([get("/api/latest"), get("/api/series?k=kimp_btc,kimp_usdt,liq_long,liq_short,funding_BTC,funding_ETH&h=48"), get(`/api/alerts?lang=${S.lang === "ko" ? "ko" : "en"}&limit=30`)]);
      last = { lat, ser, al }; render();
      $("#sigStatus").textContent = (T.updated || "{t}").replace("{t}", hm(lat.updated));
    } catch { $("#sigStatus").textContent = T.err || "—"; }
  }
  function render() {
    if (!last) return;
    const { lat, ser, al } = last, k = lat.kimp?.coins || {}, L1 = lat.liq?.h1 || {}, L24 = lat.liq?.h24 || {}, P = PAL();
    $("#sigKpi").innerHTML = [
      [T.kBtc, pct(k.BTC?.kimp), k.BTC ? `₩${Math.round(k.BTC.krw).toLocaleString("en-US")} · $${Math.round(k.BTC.usd).toLocaleString("en-US")}` : ""],
      [T.kUsdt, pct(k.USDT?.kimp), lat.kimp?.fx ? `USD/KRW ${lat.kimp.fx.toFixed(1)}` : ""],
      [T.l1, usd((L1.long || 0) + (L1.short || 0)), `${T.longs} ${usd(L1.long || 0)} · ${T.shorts} ${usd(L1.short || 0)}`],
      [T.l24, usd((L24.long || 0) + (L24.short || 0)), `${T.longs} ${usd(L24.long || 0)} · ${T.shorts} ${usd(L24.short || 0)}`],
    ].map(([a, b, c]) => `<div><small>${esc(a)}</small><strong>${esc(b)}</strong><span class="sub">${esc(c)}</span></div>`).join("");
    lineChart($("#chKimp"), [{ name: T.kBtc, short: "BTC", color: P[0], points: ser.kimp_btc || [] }, { name: T.kUsdt, short: "USDT", color: P[1], points: ser.kimp_usdt || [] }]);
    liqChart($("#chLiq"), ser.liq_long || [], ser.liq_short || []);
    lineChart($("#chFund"), [{ name: "BTC", color: P[0], points: ser.funding_BTC || [] }, { name: "ETH", color: P[1], points: ser.funding_ETH || [] }], { digits: 4 });
    const big = lat.liq?.largest || [];
    $("#sigBig").innerHTML = big.length ? big.map((x) => `<li><span class="nm">${esc(x.sym)} <small class="${x.side === "long" ? "up" : "down"}">${esc(x.side === "long" ? T.long1 : T.short1)}</small></span><span class="v">${usd(x.usd)}<small>${hm(x.ts)} · $${(+x.px).toLocaleString("en-US", { maximumFractionDigits: 2 })}</small></span></li>`).join("") : `<li class="msg-row"><span class="nm">${esc(T.noLiq)}</span></li>`;
    const fb = lat.funding || {}, row = (x) => `<li><span class="nm">${esc(x.sym.replace(/USDT$/, ""))} <small>$${x.px >= 1 ? x.px.toLocaleString("en-US", { maximumFractionDigits: 2 }) : x.px.toPrecision(4)}</small></span><span class="v ${x.fr >= 0 ? "up" : "down"}">${fr(x.fr)}<small>OI ${usd(x.oi)}</small></span></li>`;
    $("#sigTop").innerHTML = (fb.top || []).map(row).join("") || `<li class="msg-row"><span class="nm">${esc(T.collecting)}</span></li>`;
    $("#sigBot").innerHTML = (fb.bottom || []).map(row).join("") || `<li class="msg-row"><span class="nm">${esc(T.collecting)}</span></li>`;
    $("#sigAlerts").innerHTML = (al.alerts || []).length ? al.alerts.map((a) => `<li><time>${hm(a.ts)}</time><div>${a.text.replace(/\n/g, "<br>")}</div></li>`).join("") : `<li class="msg-row">${esc(T.noAlerts)}</li>`;
  }
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(render, 200); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", render);
  load(); setInterval(() => document.visibilityState === "visible" && load(), 60000);
})();
