// 급등 레이더 — 업비트·빗썸 원화마켓 (둘 다 업비트 호환 v1 API)
// 요청은 거래소별 큐로 초당 6회 이하로 보내고, 한쪽이 막혀도 다른 쪽·다른 보드는 계속 그린다.
(() => {
  const CB = window.CB || { base: "/" };
  const T = Object.assign({
    upbit: "업비트", bithumb: "빗썸", locale: "ko-KR", won: "원", wonPre: "",
    fallback: "{a} 연결 지연 — {b} 기준으로 표시 중", updated: "{ex} · {t} 갱신 · 20초마다", retrying: "{ex} 연결 지연 — 자동 재시도 중", loading: "불러오는 중…",
    fail: "{ex} 시세를 지금 불러오지 못했어요 (요청 제한 또는 일시 장애). 자동으로 다시 시도해요.", failSwitch: " — 위에서 다른 거래소로 바꿔 보세요.",
    noMatch: "조건에 맞는 코인이 없어요", noRise5: "최근 5분 동안 오른 코인이 없어요", collecting: "1분봉을 모으는 중…",
    times: "{n}배", min5: "5분", spike: "급증", noSpike: "지금은 평소보다 1.5배 넘게 거래가 몰린 코인이 없어요",
    newHigh: "신고가", hi52: "52주 고점 {p}", todayHigh: "오늘 경신", noHigh: "52주 고점 10% 이내 코인이 없어요", noHiData: "이 거래소는 52주 고점 정보를 주지 않아요",
    sUpDn: "상승 · 하락", sAvg: "평균 등락률", sVol: "24시간 거래대금", sTop: "오늘의 최고 상승", coins: "{n}개 코인", krwMkt: "{ex} 원화마켓",
    gapNeed: "두 거래소 시세가 모두 필요해요 — 한쪽 연결을 다시 시도하는 중", gapSub: "업 {a} · 빗 {b}", noGap: "가격 차이가 나는 코인이 없어요",
    lsLoading: "상장 기록을 불러오는 중…", lsFail: "최근 30일 신규 상장 시세를 불러오지 못했어요", lsSub: "{d} 상장 · {ex} · 최고 {m}",
  }, CB.t?.surge || {});
  const f = (k, o = {}) => Object.entries(o).reduce((s, [a, b]) => s.replaceAll("{" + a + "}", b), T[k]);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  if (!$("#surgeApp")) return;

  const EX = {
    upbit: { name: T.upbit, api: "https://api.upbit.com/v1", hasAll: true, trade: (s) => `https://upbit.com/exchange?code=CRIX.UPBIT.KRW-${s}` },
    bithumb: { name: T.bithumb, api: "https://api.bithumb.com/v1", hasAll: false, trade: (s) => `https://www.bithumb.com/react/trade/order/${s}-KRW` },
  };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const krw = (p) => p == null || isNaN(p) ? "—" : p >= 100 ? Math.round(p).toLocaleString("ko-KR") : (+p).toLocaleString("ko-KR", { maximumFractionDigits: p >= 1 ? 2 : 4 });
  const pct = (c) => c == null || isNaN(c) ? "—" : (c > 0 ? "+" : "") + (+c).toFixed(2) + "%";
  const dir = (c) => (c > 0 ? "up" : c < 0 ? "down" : "");
  const eok0 = (n) => n == null ? "—" : T.locale !== "ko-KR" ? new Intl.NumberFormat(T.locale, { notation: "compact", maximumFractionDigits: 1 }).format(n) : n >= 1e12 ? (n / 1e12).toFixed(1) + "조" : n >= 1e8 ? Math.round(n / 1e8).toLocaleString("ko-KR") + "억" : Math.round(n / 1e4).toLocaleString("ko-KR") + "만";
  const eok = (n) => n == null ? "—" : T.wonPre + eok0(n) + T.won;
  const won = (p) => T.wonPre + krw(p) + T.won;
  const clock = () => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
  const visible = () => document.visibilityState === "visible";

  /* ---------- 요청 큐 (거래소별, 간격 170ms) ---------- */
  const queues = {};
  function req(ex, path) {
    const q = (queues[ex] ||= { last: Promise.resolve() });
    const run = q.last.then(() => new Promise((r) => setTimeout(r, 170))).then(async () => {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
      try {
        const r = await fetch(EX[ex].api + path, { cache: "no-store", signal: ctl.signal });
        if (!r.ok) { const e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
        return await r.json();
      } finally { clearTimeout(t); }
    });
    q.last = run.catch(() => {});
    return run;
  }

  /* ---------- 상태 ---------- */
  const S = {
    ex: "upbit", minVol: 0, q: "",
    names: {}, tick: {}, err: {}, at: {},
    short: {}, hist: {}, listing: {}, backoff: { upbit: 0, bithumb: 0 },
  };

  async function names(ex) {
    if (S.names[ex]) return S.names[ex];
    const key = "cb-names-" + ex + (T.locale === "ko-KR" ? "" : "-en");
    const c = store.get(key);
    if (c && Date.now() - c.t < 864e5 && c.v) return (S.names[ex] = c.v);
    const list = await req(ex, "/market/all");
    const v = Object.fromEntries(list.filter((m) => m.market.startsWith("KRW-")).map((m) => [m.market.slice(4), T.locale === "ko-KR" ? m.korean_name : (m.english_name || m.market.slice(4))]));
    store.set(key, { t: Date.now(), v });
    return (S.names[ex] = v);
  }
  async function tickers(ex) {
    const nm = await names(ex);
    let rows;
    if (EX[ex].hasAll) {
      try { rows = await req(ex, "/ticker/all?quote_currencies=KRW"); } catch { rows = null; }
    }
    if (!rows) {
      const syms = Object.keys(nm), out = [];
      for (let i = 0; i < syms.length; i += 90) out.push(...await req(ex, "/ticker?markets=" + syms.slice(i, i + 90).map((s) => "KRW-" + s).join(",")));
      rows = out;
    }
    const map = {};
    for (const x of rows) {
      if (!x.market?.startsWith("KRW-")) continue;
      const sym = x.market.slice(4);
      map[sym] = {
        sym, name: nm[sym] || sym, price: x.trade_price, chg: x.signed_change_rate * 100, vol: x.acc_trade_price_24h,
        hi52: x.highest_52_week_price, hi52d: x.highest_52_week_date, ts: x.trade_timestamp || x.timestamp,
      };
    }
    return map;
  }

  /* 가격 스냅샷 (빠르게 움직인 코인을 단기 후보로 올리기 위함) */
  function remember(ex, map) {
    const h = (S.hist[ex] ||= []);
    h.push({ t: Date.now(), p: Object.fromEntries(Object.values(map).map((x) => [x.sym, x.price])) });
    while (h.length && Date.now() - h[0].t > 12 * 60e3) h.shift();
  }
  function snapshotMovers(ex) {
    const h = S.hist[ex]; if (!h || h.length < 2) return [];
    const now = h[h.length - 1].p, old = h[0].p;
    return Object.keys(now).filter((s) => old[s] && Math.abs(now[s] / old[s] - 1) > 0.015);
  }

  /* 단기 지표: 1분봉 6개 → 5분 변동률, 5분 거래대금, 평소 대비 배수 */
  async function shortTerm(ex) {
    const map = S.tick[ex]; if (!map) return;
    const all = Object.values(map);
    const byVol = [...all].sort((a, b) => b.vol - a.vol).slice(0, 30).map((x) => x.sym);
    const byChg = [...all].filter((x) => x.vol > 5e8).sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg)).slice(0, 12).map((x) => x.sym);
    const cand = [...new Set([...snapshotMovers(ex), ...byChg, ...byVol])].slice(0, 45);
    const out = { ...(S.short[ex]?.data || {}) };
    for (const sym of cand) {
      try {
        const cs = await req(ex, `/candles/minutes/1?market=KRW-${sym}&count=6`);
        if (!cs.length) continue;
        const now = cs[0].trade_price, base = cs[cs.length - 1].opening_price;
        const val5 = cs.slice(0, 5).reduce((n, c) => n + (c.candle_acc_trade_price || 0), 0);
        const avg5 = (map[sym]?.vol || 0) / 288;
        out[sym] = { chg5: (now / base - 1) * 100, val5, mult: avg5 ? val5 / avg5 : 0, t: Date.now() };
      } catch (e) { if (e.status === 429) break; }
    }
    for (const k of Object.keys(out)) if (Date.now() - out[k].t > 5 * 60e3) delete out[k];
    S.short[ex] = { data: out, at: Date.now() };
  }

  /* 신규 상장 성적표: 상장일 시가 대비 */
  async function listingCard() {
    let ls = [];
    try { ls = await (await fetch(CB.base + "listings.json", { cache: "no-store" })).json(); } catch { return; }
    const seen = new Set(), picks = [];
    for (const i of ls) {
      if (i.type !== "listing" || Date.now() - new Date(i.time) > 30 * 864e5) continue;
      for (const c of i.coins) {
        const k = i.exchange + c.symbol;
        if (seen.has(k)) continue; seen.add(k);
        picks.push({ ex: i.exchange, sym: c.symbol, name: c.name, time: new Date(i.time) });
      }
    }
    picks.sort((a, b) => b.time - a.time);
    const rows = [];
    for (const p of picks.slice(0, 14)) {
      try {
        const nm = await names(p.ex);
        if (!nm[p.sym]) continue;
        const days = Math.min(30, Math.ceil((Date.now() - p.time) / 864e5) + 1);
        const cs = await req(p.ex, `/candles/days?market=KRW-${p.sym}&count=${days}`);
        if (!cs.length) continue;
        const first = cs[cs.length - 1], now = cs[0].trade_price;
        const hi = Math.max(...cs.map((c) => c.high_price));
        rows.push({ ...p, name: nm[p.sym], base: first.opening_price, now, ret: (now / first.opening_price - 1) * 100, max: (hi / first.opening_price - 1) * 100, since: first.candle_date_time_kst?.slice(5, 10).replace("-", ".") });
      } catch (e) { if (e.status === 429) break; }
    }
    S.listing = { rows, at: Date.now() };
    renderListing();
  }

  /* ---------- 그리기 ---------- */
  const row = (ex, x, val, sub, bar, tag = "") => `<li><a class="nm" href="${EX[ex].trade(x.sym)}" target="_blank" rel="noopener">${esc(x.name)}<small>${esc(x.sym)}</small>${tag}</a><span class="v">${val}${sub ? `<small>${sub}</small>` : ""}</span>${bar != null ? `<i class="mag ${bar < 0 ? "neg" : ""}" style="--w:${Math.min(100, Math.abs(bar)).toFixed(1)}%"></i>` : ""}</li>`;
  const empty = (msg) => `<li class="msg-row"><span class="nm">${msg}</span></li>`;
  const filt = (list) => list.filter((x) => x.vol >= S.minVol && (!S.q || (x.name + x.sym).toLowerCase().includes(S.q)));

  function render() {
    const other = S.ex === "upbit" ? "bithumb" : "upbit";
    // 고른 거래소가 막혔고 다른 쪽이 살아 있으면 그쪽 기준으로 보여준다
    const fallback = !S.tick[S.ex] && S.err[S.ex] && S.tick[other];
    const ex = fallback ? other : S.ex, map = S.tick[ex];
    $("#surgeStatus").textContent = fallback ? f("fallback", { a: EX[S.ex].name, b: EX[ex].name }) : map ? f("updated", { ex: EX[ex].name, t: clock() }) : S.err[ex] ? f("retrying", { ex: EX[ex].name }) : T.loading;
    const fail = S.err[ex] && !map;
    const failMsg = f("fail", { ex: EX[ex].name }) + (S.tick[ex === "upbit" ? "bithumb" : "upbit"] ? T.failSwitch : "");
    const ids = ["rkUp", "rkDown", "rkVol", "rkShort", "rkSpike", "rkHigh"];
    if (!map) { ids.forEach((id) => ($("#" + id).innerHTML = fail ? empty(failMsg) : empty(T.loading))); renderSummary(); renderGap(); return; }
    const all = Object.values(map), liquid = filt(all.filter((x) => x.vol > 3e8));
    const up = [...liquid].sort((a, b) => b.chg - a.chg).slice(0, 12);
    const dn = [...liquid].sort((a, b) => a.chg - b.chg).slice(0, 12);
    const mxU = Math.max(1, ...up.map((x) => x.chg)), mxD = Math.max(1, ...dn.map((x) => -x.chg));
    $("#rkUp").innerHTML = up.map((x) => row(ex, x, `<span class="up">${pct(x.chg)}</span>`, won(x.price), (x.chg / mxU) * 100)).join("") || empty(T.noMatch);
    $("#rkDown").innerHTML = dn.map((x) => row(ex, x, `<span class="down">${pct(x.chg)}</span>`, won(x.price), -(-x.chg / mxD) * 100)).join("") || empty(T.noMatch);
    const vol = [...filt(all)].sort((a, b) => b.vol - a.vol).slice(0, 12), mxV = vol[0]?.vol || 1;
    $("#rkVol").innerHTML = vol.map((x) => row(ex, x, eok(x.vol), `<span class="${dir(x.chg)}">${pct(x.chg)}</span>`, (x.vol / mxV) * 100)).join("") || empty(T.noMatch);

    // 단기
    const sh = S.short[ex]?.data || {};
    const shRows = Object.entries(sh).map(([sym, v]) => ({ ...map[sym], ...v })).filter((x) => x.sym && x.vol >= S.minVol && (!S.q || (x.name + x.sym).toLowerCase().includes(S.q)));
    const s5 = [...shRows].sort((a, b) => b.chg5 - a.chg5).filter((x) => x.chg5 > 0).slice(0, 10), mx5 = Math.max(0.5, ...s5.map((x) => x.chg5));
    $("#rkShort").innerHTML = shRows.length ? (s5.map((x) => row(ex, x, `<span class="up">${pct(x.chg5)}</span>`, `24H ${pct(x.chg)}`, (x.chg5 / mx5) * 100)).join("") || empty(T.noRise5)) : empty(T.collecting);
    const sp = [...shRows].filter((x) => x.val5 > 5e7 && x.mult >= 1.5).sort((a, b) => b.mult - a.mult).slice(0, 10), mxM = Math.max(1, ...sp.map((x) => x.mult));
    $("#rkSpike").innerHTML = shRows.length ? (sp.map((x) => row(ex, x, f("times", { n: x.mult.toFixed(1) }), `${T.min5} ${eok(x.val5)} · <span class="${dir(x.chg5)}">${pct(x.chg5)}</span>`, (x.mult / mxM) * 100, x.mult >= 3 ? `<em class="flag">${T.spike}</em>` : "")).join("") || empty(T.noSpike)) : empty(T.collecting);

    // 52주 신고가 근접
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
    const hi = liquid.filter((x) => x.hi52).map((x) => ({ ...x, r: x.price / x.hi52 })).filter((x) => x.r >= 0.9).sort((a, b) => b.r - a.r).slice(0, 10);
    $("#rkHigh").innerHTML = all.some((x) => x.hi52) ? (hi.map((x) => row(ex, x, x.r >= 0.999 ? `<span class="up">${T.newHigh}</span>` : `−${((1 - x.r) * 100).toFixed(1)}%`, f("hi52", { p: won(x.hi52) }), x.r * 100, x.hi52d === today ? `<em class="flag">${T.todayHigh}</em>` : "")).join("") || empty(T.noHigh)) : empty(T.noHiData);

    renderSummary(); renderGap();
  }
  function renderSummary() {
    const other = S.ex === "upbit" ? "bithumb" : "upbit";
    const exS = !S.tick[S.ex] && S.err[S.ex] && S.tick[other] ? other : S.ex;
    const map = S.tick[exS], box = $("#surgeSummary");
    if (!map) { box.innerHTML = [T.sUpDn, T.sAvg, T.sVol, T.sTop].map((l) => `<div><small>${l}</small><strong>—</strong></div>`).join(""); return; }
    const all = Object.values(map), n = all.length;
    const up = all.filter((x) => x.chg > 0).length, dn = all.filter((x) => x.chg < 0).length;
    const avg = all.reduce((s, x) => s + x.chg, 0) / n, tot = all.reduce((s, x) => s + (x.vol || 0), 0);
    const top = all.filter((x) => x.vol > 3e8).sort((a, b) => b.chg - a.chg)[0];
    box.innerHTML = `
      <div><small>${T.sUpDn}</small><strong><span class="up">${up}</span> · <span class="down">${dn}</span></strong><span class="breadth"><i style="width:${(up / n * 100).toFixed(1)}%"></i></span></div>
      <div><small>${T.sAvg}</small><strong class="${dir(avg)}">${pct(avg)}</strong><span class="sub">${f("coins", { n })}</span></div>
      <div><small>${T.sVol}</small><strong>${eok(tot)}</strong><span class="sub">${f("krwMkt", { ex: EX[exS].name })}</span></div>
      <div><small>${T.sTop}</small><strong>${top ? `${esc(top.sym)} <span class="up">${pct(top.chg)}</span>` : "—"}</strong><span class="sub">${top ? esc(top.name) : ""}</span></div>`;
  }
  function renderGap() {
    const u = S.tick.upbit, b = S.tick.bithumb, el = $("#rkGap");
    if (!u || !b) { el.innerHTML = empty(S.err.upbit || S.err.bithumb ? T.gapNeed : T.loading); return; }
    const g = Object.values(u).filter((x) => b[x.sym] && x.vol > 1e8 && b[x.sym].vol > 1e8 && (!S.q || (x.name + x.sym).toLowerCase().includes(S.q)))
      .map((x) => ({ ...x, gap: (x.price / b[x.sym].price - 1) * 100, bp: b[x.sym].price }))
      .sort((a, z) => Math.abs(z.gap) - Math.abs(a.gap)).slice(0, 10);
    const mx = Math.max(0.3, ...g.map((x) => Math.abs(x.gap)));
    el.innerHTML = g.map((x) => row("upbit", x, `<span class="${dir(x.gap)}">${pct(x.gap)}</span>`, f("gapSub", { a: krw(x.price), b: krw(x.bp) }), (x.gap / mx) * 100)).join("") || empty(T.noGap);
  }
  function renderListing() {
    const el = $("#rkList"), rows = S.listing.rows;
    if (!rows) { el.innerHTML = empty(T.lsLoading); return; }
    if (!rows.length) { el.innerHTML = empty(T.lsFail); return; }
    const mx = Math.max(1, ...rows.map((x) => Math.abs(x.ret)));
    el.innerHTML = rows.map((x) => row(x.ex, x, `<span class="${dir(x.ret)}">${pct(x.ret)}</span>`, f("lsSub", { d: x.since, ex: EX[x.ex].name, m: pct(x.max) }), (x.ret / mx) * 100)).join("");
  }

  /* ---------- 루프 ---------- */
  async function loadTick(ex) {
    if (Date.now() < S.backoff[ex]) return;
    try {
      const map = await tickers(ex);
      S.tick[ex] = map; S.at[ex] = Date.now(); S.err[ex] = null; remember(ex, map);
    } catch (e) {
      S.err[ex] = e.message || "error";
      S.backoff[ex] = Date.now() + (e.status === 429 ? 90e3 : 40e3);
    }
  }
  async function cycle() {
    if (!visible()) return;
    const other = S.ex === "upbit" ? "bithumb" : "upbit";
    await loadTick(S.ex); render();
    if (!S.tick[other] || Date.now() - (S.at[other] || 0) > 60e3) { await loadTick(other); render(); }
  }
  let shortBusy = false;
  async function shortCycle() {
    const other = S.ex === "upbit" ? "bithumb" : "upbit";
    const ex = S.tick[S.ex] ? S.ex : S.tick[other] ? other : null;
    if (!visible() || shortBusy || !ex) return;
    shortBusy = true;
    try { await shortTerm(ex); render(); } finally { shortBusy = false; }
  }

  // 컨트롤
  const pick = (box, attr, fn) => box?.addEventListener("click", (e) => {
    const b = e.target.closest(`[data-${attr}]`); if (!b) return;
    $$(`[data-${attr}]`, box).forEach((x) => x.setAttribute("aria-pressed", x === b));
    fn(b.dataset[attr]);
  });
  pick($("#exSwitch"), "ex", (v) => { S.ex = v; render(); cycle().then(shortCycle); });
  pick($("#volFilter"), "vol", (v) => { S.minVol = +v; render(); });
  $("#surgeQ")?.addEventListener("input", (e) => { S.q = e.target.value.trim().toLowerCase(); render(); });
  document.addEventListener("visibilitychange", () => visible() && cycle());

  render(); renderListing();
  cycle().then(() => { shortCycle(); listingCard(); });
  setInterval(cycle, 20000);
  setInterval(shortCycle, 60000);
  setInterval(() => visible() && listingCard(), 5 * 60e3);
})();
