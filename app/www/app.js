// CHAINBRIEF app — native shell over the site's JSON feeds (api/<lang>/feed.json)
(() => {
  const qs = new URLSearchParams(location.search);
  const SITE = (qs.get("api") || "https://probe2928-crypto.github.io/chainbrief/").replace(/\/?$/, "/");
  const P = (window.Capacitor && window.Capacitor.Plugins) || {};
  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem("cb." + k)); return v ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("cb." + k, JSON.stringify(v)); } catch {} },
  };

  /* ---------- strings ---------- */
  const I = {
    ko: { html: "ko", locale: "ko-KR", code: "KO", tLive: "속보", tNews: "기사", tList: "상장", tMkt: "시세", tMore: "저장",
      live: "라이브 속보", news: "체인브리프 기사", list: "상장 소식", mkt: "실시간 시세", more: "저장한 기사",
      all: "전체", imp: "중요", today: "오늘", yday: "어제", upd: "{t} 업데이트", offline: "오프라인 — 저장된 내용을 보여줘요", none: "아직 소식이 없어요.",
      by: "글", read: "읽기", saved: "저장했어요", unsaved: "저장을 취소했어요", copied: "링크를 복사했어요", noSaved: "저장한 기사가 없어요. 기사 화면 위쪽 책갈피를 누르면 여기에 모여요.",
      settings: "설정", lang: "언어", theme: "화면", sys: "자동", light: "밝게", dark: "어둡게", contact: "제보·광고 문의", site: "웹사이트", privacy: "개인정보처리방침", partners: "Partners",
      ty: { listing: "신규 상장", delisting: "거래 종료", caution: "유의 종목", "caution-cleared": "유의 해제" }, notice: "공지 보기",
      glT: "해외 거래소 상장", krT: "국내 거래소 상장", glTy: { listing: "현물 상장", futures: "선물 상장", delisting: "상장 폐지" }, soon: "예정",
      usd: "달러", krw: "업비트 원화", kimp: "김프", fng: "공포·탐욕", dom: "BTC 도미넌스", mktNote: "김프 = 업비트 원화가 ÷ (글로벌 달러가 × 환율) − 1. 1분마다 갱신. 투자 권유가 아니에요.",
      fngL: { "Extreme Fear": "극단적 공포", Fear: "공포", Neutral: "중립", Greed: "탐욕", "Extreme Greed": "극단적 탐욕" },
      fine: "체인브리프의 정보는 투자 권유가 아니며, 투자 판단과 책임은 이용자 본인에게 있어요.", ver: "버전" },
    en: { html: "en", locale: "en-US", code: "EN", tLive: "Live", tNews: "News", tList: "Listings", tMkt: "Markets", tMore: "Saved",
      live: "Live Wire", news: "CHAINBRIEF Analysis", list: "Korea Listings", mkt: "Markets", more: "Saved stories",
      all: "All", imp: "Breaking", today: "Today", yday: "Yesterday", upd: "Updated {t}", offline: "Offline — showing saved content", none: "No stories yet.",
      by: "By", read: "Read", saved: "Saved", unsaved: "Removed from saved", copied: "Link copied", noSaved: "Nothing saved yet. Tap the bookmark at the top of a story to keep it here.",
      settings: "Settings", lang: "Language", theme: "Appearance", sys: "Auto", light: "Light", dark: "Dark", contact: "Tips & partnerships", site: "Website", privacy: "Privacy policy", partners: "Partners",
      ty: { listing: "New listing", delisting: "Delisting", caution: "Caution", "caution-cleared": "Caution lifted" }, notice: "Notice",
      glT: "Global exchange listings", krT: "Korean exchange listings", glTy: { listing: "Spot listing", futures: "Futures", delisting: "Delisting" }, soon: "Soon",
      usd: "USD", krw: "Upbit KRW", kimp: "Kimchi", fng: "Fear & Greed", dom: "BTC dominance", mktNote: "Kimchi premium = Upbit KRW price ÷ (global USD price × FX) − 1. Refreshed every minute. Not investment advice.",
      fngL: { "Extreme Fear": "Extreme fear", Fear: "Fear", Neutral: "Neutral", Greed: "Greed", "Extreme Greed": "Extreme greed" },
      fine: "CHAINBRIEF content is for information only and is not investment advice.", ver: "Version" },
    zh: { html: "zh-Hans", locale: "zh-CN", code: "中文", tLive: "快讯", tNews: "新闻", tList: "上币", tMkt: "行情", tMore: "收藏",
      live: "7×24 快讯", news: "链报分析", list: "韩国上币", mkt: "实时行情", more: "我的收藏",
      all: "全部", imp: "重要", today: "今天", yday: "昨天", upd: "{t} 更新", offline: "离线 — 显示已保存内容", none: "暂无内容。",
      by: "作者", read: "阅读", saved: "已收藏", unsaved: "已取消收藏", copied: "链接已复制", noSaved: "还没有收藏。点击文章顶部的书签即可保存到这里。",
      settings: "设置", lang: "语言", theme: "外观", sys: "自动", light: "浅色", dark: "深色", contact: "爆料与合作", site: "网站", privacy: "隐私政策", partners: "Partners",
      ty: { listing: "新上币", delisting: "终止交易", caution: "警示", "caution-cleared": "解除警示" }, notice: "公告",
      glT: "全球交易所上币", krT: "韩国交易所上币", glTy: { listing: "现货上币", futures: "合约上线", delisting: "下架" }, soon: "即将",
      usd: "美元", krw: "Upbit 韩元", kimp: "溢价", fng: "恐惧与贪婪", dom: "BTC 市占率", mktNote: "泡菜溢价 = Upbit 韩元价格 ÷（全球美元价格 × 汇率）− 1，每分钟更新。不构成投资建议。",
      fngL: { "Extreme Fear": "极度恐惧", Fear: "恐惧", Neutral: "中性", Greed: "贪婪", "Extreme Greed": "极度贪婪" },
      fine: "CHAINBRIEF 提供的信息仅供参考，不构成投资建议。", ver: "版本" },
  };
  const guess = (navigator.language || "ko").toLowerCase();
  let lang = store.get("lang", guess.startsWith("ko") ? "ko" : guess.startsWith("zh") ? "zh" : guess.startsWith("en") ? "en" : "en");
  let T = I[lang];
  const fm = (s, o) => Object.entries(o).reduce((a, [k, v]) => a.replaceAll("{" + k + "}", v), s);
  const hhmm = (d) => new Intl.DateTimeFormat(T.locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  const dkey = (d) => new Intl.DateTimeFormat("sv-SE").format(d);
  const dayName = (d) => { const k = dkey(d), t = dkey(new Date()), y = dkey(new Date(Date.now() - 864e5)); return k === t ? T.today : k === y ? T.yday : new Intl.DateTimeFormat(T.locale, { month: "long", day: "numeric", weekday: "short" }).format(d); };
  const fullDate = (d) => new Intl.DateTimeFormat(T.locale, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);

  /* ---------- native helpers ---------- */
  const haptic = () => { try { P.Haptics?.impact({ style: "LIGHT" }); } catch {} };
  const open = (url) => { if (!url) return; if (P.Browser) P.Browser.open({ url, presentationStyle: "popover" }).catch(() => (location.href = url)); else window.open(url, "_blank", "noopener"); };
  let toastT;
  const toast = (msg) => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 1800); };
  async function getJSON(url, ms = 12000) {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(url, { cache: "no-store", signal: ctl.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); } finally { clearTimeout(to); }
  }

  /* ---------- theme ---------- */
  function applyTheme() {
    const th = store.get("theme", "system");
    if (th === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", th);
    const dark = th === "dark" || (th === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    try { P.StatusBar?.setStyle({ style: dark ? "DARK" : "LIGHT" }); P.StatusBar?.setBackgroundColor?.({ color: dark ? "#0B0B0B" : "#FFFFFF" }); } catch {}
  }
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);

  /* ---------- data ---------- */
  let cfg = store.get("cfg", null), feed = null, listings = store.get("ls", []), prices = store.get("px", {});
  const artURL = (name) => `${SITE}art/${name}-m.jpg${cfg?.artV ? "?v=" + cfg.artV : ""}`;
  async function loadCfg() { try { cfg = await getJSON(SITE + "api/config.json"); store.set("cfg", cfg); } catch {} }
  async function loadFeed() {
    feed = store.get("feed." + lang, null);
    try { feed = await getJSON(`${SITE}api/${lang}/feed.json?t=${Date.now()}`); store.set("feed." + lang, feed); feed.offline = false; }
    catch { if (feed) { feed.offline = true; } }
  }
  async function loadListings() { try { listings = await getJSON(SITE + "listings.json?t=" + Date.now()); store.set("ls", listings.slice(0, 120)); } catch {} }
  let glob = store.get("gls", null);
  async function loadGlobal() { try { glob = await getJSON(SITE + "global-listings.json?t=" + Date.now()); store.set("gls", glob); } catch {} }
  async function loadPrices() {
    const coins = cfg?.coins || [];
    if (!coins.length) return;
    try {
      const g = await getJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${coins.map((c) => c.id).join(",")}&vs_currencies=usd,krw&include_24hr_change=true`);
      const up = {};
      const mk = coins.filter((c) => c.upbit !== false).map((c) => "KRW-" + c.symbol).join(",");
      try { for (const t of await getJSON(`https://api.upbit.com/v1/ticker?markets=${mk}`)) up[t.market.slice(4)] = t.trade_price; }
      catch { try { for (const t of await getJSON(`https://api.bithumb.com/v1/ticker?markets=${mk}`)) up[t.market.slice(4)] = t.trade_price; } catch {} }
      const next = {};
      for (const c of coins) { const d = g[c.id]; if (!d) continue; const fx = d.krw && d.usd ? d.krw / d.usd : null; const k = up[c.symbol] ?? null; next[c.id] = { usd: d.usd, chg: d.usd_24h_change, krw: k, kimp: k && fx ? (k / (d.usd * fx) - 1) * 100 : null }; }
      prices = next; store.set("px", prices);
    } catch {}
    try { const f = (await getJSON("https://api.alternative.me/fng/?limit=1")).data[0]; prices._fng = { v: +f.value, l: f.value_classification }; } catch {}
  }

  /* ---------- formatting ---------- */
  const usd = (p) => p == null ? "—" : p >= 1000 ? "$" + p.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p >= 1 ? "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "$" + p.toPrecision(4);
  const krw = (p) => p == null ? "—" : "₩" + (p >= 100 ? Math.round(p).toLocaleString("en-US") : p.toLocaleString("en-US", { maximumFractionDigits: 4 }));
  const pct = (v) => v == null || isNaN(v) ? "" : `<span class="${v >= 0 ? "up" : "down"}">${v >= 0 ? "+" : ""}${v.toFixed(2)}%</span>`;

  /* ---------- views ---------- */
  let filter = "all";
  function renderTicker() {
    const coins = (cfg?.coins || []).slice(0, 6);
    $("#ticker").innerHTML = coins.map((c) => { const d = prices[c.id] || {}; return `<span><b>${c.symbol}</b><span class="num">${usd(d.usd)}</span> ${pct(d.chg)}</span>`; }).join("");
  }
  const head = (label, title, aside = "") => `<div class="head"><div><span class="label">${label}</span><h1>${esc(title)}</h1></div>${aside ? `<small>${aside}</small>` : ""}</div>`;
  const updLine = () => feed?.offline ? T.offline : feed?.updated ? fm(T.upd, { t: hhmm(new Date(feed.updated)) }) : "";

  function renderLive() {
    const list = (feed?.flash || []).filter((f) => filter === "all" || (filter === "imp" ? f.important : f.category === filter));
    const cats = [...new Set((feed?.flash || []).map((f) => f.category).filter(Boolean))].slice(0, 8);
    let out = head("Live Wire", T.live, updLine());
    out += `<div class="chips" id="liveChips">${[["all", T.all], ["imp", T.imp], ...cats.map((c) => [c, c])].map(([k, l]) => `<button type="button" data-f="${esc(k)}" class="${k === "imp" ? "hot" : ""}" aria-pressed="${filter === k}">${esc(l)}</button>`).join("")}</div>`;
    if (!list.length) out += `<div class="empty">${T.none}</div>`;
    let last = "";
    for (const f of list) {
      const d = new Date(f.time), k = dkey(d);
      if (k !== last) { out += `<div class="day">${dayName(d)}</div>`; last = k; }
      out += `<div class="fl${f.important ? " imp" : ""}" data-id="${esc(f.id)}"><time>${hhmm(d)}</time><div><h3>${esc(f.title)}</h3><div class="body">${f.body || ""}</div><div class="meta">${f.important ? `<span class="hot">${T.imp}</span>` : ""}${f.category ? `<span>${esc(f.category)}</span>` : ""}</div></div></div>`;
    }
    $("#liveList").innerHTML = out;
  }
  function cardHTML(a) {
    return `<a class="card" href="#" data-art="${esc(a.id)}"><div class="k">${a.category ? `<span>${esc(a.category)}</span>` : ""}${a.format ? `<span class="fmt">${esc(a.format)}</span>` : a.region ? `<span class="fmt">${esc(a.region)}</span>` : ""}</div><h3>${esc(a.title)}</h3><p>${esc(a.summary || "")}</p><div class="by">${new Intl.DateTimeFormat(T.locale, { month: "short", day: "numeric" }).format(new Date(a.date))} · <b>${esc(a.author || "")}</b></div></a>`;
  }
  function renderNews() {
    const arts = feed?.articles || [];
    if (!arts.length) { $("#newsList").innerHTML = `<div class="pad">${head("Editorial", T.news)}<div class="empty">${T.none}</div></div>`; return; }
    const [lead, ...rest] = arts;
    $("#newsList").innerHTML = `<a class="lead" href="#" data-art="${esc(lead.id)}"><img src="${artURL(lead.art)}" alt=""><div class="lead-body"><span class="eye">${esc([lead.category, lead.author].filter(Boolean).join(" · "))}</span><h2>${esc(lead.title)}</h2><p>${esc(lead.summary || "")}</p></div></a><div class="pad">${head("Editorial", T.news, updLine())}${rest.map(cardHTML).join("")}</div>`;
  }
  const EXG = { binance: "Binance", okx: "OKX", bybit: "Bybit", coinbase: "Coinbase" };
  function globalHTML() {
    const gi = (glob?.items || []).slice(0, 40);
    if (!gi.length) return "";
    let out = head("Binance · OKX · Bybit · Coinbase", T.glT), last = "";
    for (const i of gi) {
      const d = new Date(i.time), soon = d > Date.now(), k = (soon ? "s" : "") + dkey(d);
      if (k !== last) { out += `<div class="day">${soon ? T.soon + " · " : ""}${dayName(d)}</div>`; last = k; }
      out += `<a class="ls gl" href="#" data-url="${esc(i.url)}"><time>${hhmm(d)}</time><div><div class="m"><span class="ex">${EXG[i.exchange] || esc(i.exchange)}</span><span class="ty ${esc(i.type)}">${esc(T.glTy[i.type] || "")}</span></div><div class="coin">${esc((i.symbols || []).join(" · "))}</div><div class="t">${esc(i.title)}</div></div><div class="px"></div></a>`;
    }
    return out;
  }
  function renderListings() {
    const items = (listings || []).filter((i) => i.type !== "caution-cleared").slice(0, 80);
    const g = globalHTML();
    let out = lang === "ko" ? "" : g, last = "";
    out += (out ? '<div class="sp"></div>' : "") + head("Upbit · Bithumb", lang === "ko" ? T.list : T.krT);
    if (!items.length) out += `<div class="empty">${T.none}</div>`;
    for (const i of items) {
      const d = new Date(i.time), k = dkey(d), sym = i.coins?.[0]?.symbol || "";
      if (k !== last) { out += `<div class="day">${dayName(d)}</div>`; last = k; }
      out += `<a class="ls" href="#" data-url="${esc(i.url)}"><time>${hhmm(d)}</time><div><div class="m"><span class="ex">${i.exchange === "upbit" ? "Upbit" : "Bithumb"}</span><span class="ty ${i.type}">${esc(T.ty[i.type] || "")}</span>${i.markets?.length ? `<span>${i.markets.join(" · ")}</span>` : ""}</div><div class="coin">${esc((i.coins || []).map((c) => c.symbol).join(" · "))}</div></div><div class="px" data-sym="${esc(sym)}"></div></a>`;
    }
    if (lang === "ko" && g) out += '<div class="sp"></div>' + g;
    $("#lsList").innerHTML = out;
    fillListingPrices();
  }
  async function fillListingPrices() {
    const syms = [...new Set($$("#lsList .px[data-sym]").map((e) => e.dataset.sym).filter(Boolean))].slice(0, 40);
    if (!syms.length) return;
    for (const base of ["https://api.upbit.com/v1", "https://api.bithumb.com/v1"]) {
      try {
        const all = await getJSON(`${base}/market/all`); const ok = new Set(all.map((m) => m.market));
        const mk = syms.map((s) => "KRW-" + s).filter((m) => ok.has(m));
        if (!mk.length) continue;
        const map = {}; for (const t of await getJSON(`${base}/ticker?markets=${mk.join(",")}`)) map[t.market.slice(4)] = t;
        $$("#lsList .px[data-sym]").forEach((e) => { const t = map[e.dataset.sym]; if (t && !e.textContent) e.innerHTML = `${krw(t.trade_price)}<small>${pct(t.signed_change_rate * 100)}</small>`; });
        return;
      } catch {}
    }
  }
  function renderMarket() {
    const coins = cfg?.coins || [];
    let out = head("Markets", T.mkt, `USD · ${T.krw}`);
    out += coins.map((c) => { const d = prices[c.id] || {}; return `<div class="mk"><div class="s">${c.symbol}<small>${esc(lang === "ko" ? c.name : ({ binancecoin: "BNB Chain", ripple: "XRP Ledger", "avalanche-2": "Avalanche", "shiba-inu": "Shiba Inu" })[c.id] || c.id.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()))}</small></div><div class="p">${usd(d.usd)}<small>${krw(d.krw)}${d.kimp != null ? ` · ${T.kimp} ${d.kimp >= 0 ? "+" : ""}${d.kimp.toFixed(2)}%` : ""}</small></div><div class="c">${pct(d.chg)}</div></div>`; }).join("");
    const f = prices._fng, btc = prices.bitcoin;
    out += `<div class="mood"><div><small>${T.fng}</small><strong>${f ? f.v : "—"}</strong><span>${f ? esc(T.fngL[f.l] || f.l) : ""}</span></div><div><small>BTC ${T.kimp}</small><strong>${btc?.kimp != null ? (btc.kimp >= 0 ? "+" : "") + btc.kimp.toFixed(2) + "%" : "—"}</strong><span>Upbit</span></div></div>`;
    out += `<p class="note">${T.mktNote}</p>`;
    $("#mktList").innerHTML = out;
  }
  function renderMore() {
    const saved = store.get("saved", []);
    const th = store.get("theme", "system");
    let out = head("Saved", T.more);
    out += saved.length ? saved.map(cardHTML).join("") : `<div class="empty">${T.noSaved}</div>`;
    out += `<div class="group"><span class="label">${T.settings}</span>
      <div class="row"><span>${T.lang}</span><span class="seg" id="langSeg">${["ko", "en", "zh"].map((l) => `<button type="button" data-l="${l}" aria-pressed="${l === lang}">${I[l].code}</button>`).join("")}</span></div>
      <div class="row"><span>${T.theme}</span><span class="seg" id="themeSeg">${[["system", T.sys], ["light", T.light], ["dark", T.dark]].map(([k, l]) => `<button type="button" data-th="${k}" aria-pressed="${k === th}">${l}</button>`).join("")}</span></div>
      <button type="button" class="row" data-url="https://t.me/${esc(cfg?.telegram || "btcbullit")}"><span>${T.contact}</span><small>Telegram @${esc(cfg?.telegram || "btcbullit")}</small></button>
      <button type="button" class="row" data-url="${SITE}${lang === "ko" ? "" : lang + "/"}"><span>${T.site}</span><small>chainbrief</small></button>
      <button type="button" class="row" data-url="${SITE}privacy/"><span>${T.privacy}</span><small>→</small></button></div>`;
    const ads = (cfg?.ads || []).filter((a) => !/perpline/i.test(a.id || "") && !/perpline/i.test(a.url || "")); // 스토어 정책: 앱에는 거래소 레퍼럴 광고를 넣지 않음
    if (ads.length) out += `<div class="group"><span class="label">${T.partners}</span>${ads.map((a) => `<a class="partner" href="#" data-url="${esc(a.url)}"><span class="label">Partner · AD</span><span class="wm2">${esc(a.wordmark)}</span><p>${esc(a.short || a.title || "")}</p>${a.note ? `<span class="n">${esc(a.note)}</span>` : ""}<span class="go">${esc(a.cta || "→")}</span></a>`).join("")}</div>`;
    out += `<p class="fine">${T.fine}<br>CHAINBRIEF · ${T.ver} ${window.CB_APP_VERSION || "1.1"}</p>`;
    $("#moreView").innerHTML = out;
  }
  const renderers = { live: renderLive, news: renderNews, list: renderListings, mkt: renderMarket, more: renderMore };

  /* ---------- reader ---------- */
  let current = null;
  async function openArticle(id) {
    const a = (feed?.articles || []).find((x) => x.id === id) || store.get("saved", []).find((x) => x.id === id);
    if (!a) return;
    current = a; haptic();
    const sc = $("#readerScroll");
    const body = (html) => `<div class="cover"><img src="${artURL(a.art)}" alt=""></div><div class="doc"><div class="k">${a.category ? `<span>${esc(a.category)}</span>` : ""}${a.format || a.region ? `<span class="fmt">${esc(a.format || a.region)}</span>` : ""}</div><h1>${esc(a.title)}</h1>${a.summary ? `<p class="lede">${esc(a.summary)}</p>` : ""}<div class="by"><span>${T.by} <b>${esc(a.author || "")}</b></span><span>${fullDate(new Date(a.date))}</span></div><div class="prose">${html}</div></div>`;
    sc.innerHTML = body(a.html || '<div class="skel"></div><div class="skel"></div><div class="skel" style="width:70%"></div>');
    sc.scrollTop = 0;
    $("#reader").classList.add("open"); $("#reader").setAttribute("aria-hidden", "false");
    $(".bar").classList.add("reading"); $("#backBtn").hidden = false; $("#shareBtn").hidden = false; $("#saveBtn").hidden = false;
    syncSave();
    if (!a.html) {
      try { const r = await getJSON(`${SITE}api/${lang}/a/${encodeURIComponent(id)}.json`); a.html = r.html; if (current === a) sc.innerHTML = body(a.html); }
      catch { if (current === a) $(".prose", sc).innerHTML = `<p>${T.offline}</p>`; }
    }
  }
  function closeArticle() {
    current = null;
    $("#reader").classList.remove("open"); $("#reader").setAttribute("aria-hidden", "true");
    $(".bar").classList.remove("reading"); $("#backBtn").hidden = true; $("#shareBtn").hidden = true; $("#saveBtn").hidden = true;
  }
  function syncSave() { const on = !!(current && store.get("saved", []).some((s) => s.id === current.id)); $("#saveBtn").classList.toggle("on", on); }
  $("#saveBtn").addEventListener("click", () => {
    if (!current) return; let s = store.get("saved", []);
    if (s.some((x) => x.id === current.id)) { s = s.filter((x) => x.id !== current.id); toast(T.unsaved); }
    else { s.unshift({ ...current, lang }); s = s.slice(0, 100); toast(T.saved); }
    store.set("saved", s); syncSave(); haptic(); if (active === "more") renderMore();
  });
  $("#shareBtn").addEventListener("click", async () => {
    if (!current) return;
    try { if (P.Share) await P.Share.share({ title: current.title, text: current.title, url: current.link, dialogTitle: "CHAINBRIEF" }); else if (navigator.share) await navigator.share({ title: current.title, url: current.link }); else { await navigator.clipboard.writeText(current.link); toast(T.copied); } } catch {}
  });
  $("#backBtn").addEventListener("click", closeArticle);

  /* ---------- navigation ---------- */
  let active = "live";
  function show(tab) {
    if (current) closeArticle();
    active = tab;
    $$(".view").forEach((v) => (v.hidden = v.dataset.view !== tab));
    $$("#tabs button").forEach((b) => (b.dataset.tab === tab ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
    renderers[tab]();
  }
  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (!b) return; if (b.dataset.tab === active) $(`#v-${active} .scroll`).scrollTo({ top: 0, behavior: "smooth" }); else { haptic(); show(b.dataset.tab); } });
  document.addEventListener("click", (e) => {
    const art = e.target.closest("[data-art]"); if (art) { e.preventDefault(); openArticle(art.dataset.art); return; }
    const url = e.target.closest("[data-url]"); if (url) { e.preventDefault(); open(url.dataset.url); return; }
    const fl = e.target.closest(".fl"); if (fl && !e.target.closest("a")) { fl.classList.toggle("open"); return; }
    const f = e.target.closest("#liveChips button"); if (f) { filter = f.dataset.f; renderLive(); return; }
    const l = e.target.closest("#langSeg button"); if (l && l.dataset.l !== lang) { setLang(l.dataset.l); return; }
    const th = e.target.closest("#themeSeg button"); if (th) { store.set("theme", th.dataset.th); applyTheme(); renderMore(); }
    if (e.target.closest(".fl a, .prose a")) { e.preventDefault(); open(e.target.closest("a").href); }
  });
  $("#langBtn").addEventListener("click", () => setLang(lang === "ko" ? "en" : lang === "en" ? "zh" : "ko"));
  async function setLang(l) {
    lang = l; T = I[l]; store.set("lang", l); filter = "all"; haptic();
    applyLang(); await loadFeed(); renderers[active]();
  }
  function applyLang() {
    document.documentElement.lang = T.html;
    $("#langBtn").textContent = T.code;
    $$("[data-t]").forEach((el) => (el.textContent = T[el.dataset.t]));
  }

  /* ---------- pull to refresh ---------- */
  $$(".view").forEach((v) => {
    const sc = $(".scroll", v), ptr = $(".ptr", v); if (!ptr) return;
    let y0 = null, dy = 0;
    sc.addEventListener("touchstart", (e) => { y0 = sc.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    sc.addEventListener("touchmove", (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); if (dy > 0) { ptr.style.height = Math.min(dy * 0.5, 70) + "px"; ptr.classList.add("pull"); ptr.firstElementChild.style.transform = `rotate(${dy * 2}deg)`; } }, { passive: true });
    sc.addEventListener("touchend", async () => {
      if (y0 == null) return; y0 = null;
      if (dy > 110) { ptr.classList.add("spin"); haptic(); await refresh(); }
      ptr.classList.remove("pull", "spin"); ptr.style.height = "0px"; dy = 0;
    });
  });
  async function refresh() {
    await Promise.all([loadFeed(), loadListings(), loadGlobal(), loadPrices()]);
    renderTicker(); renderers[active]();
  }

  /* ---------- android back button ---------- */
  try { P.App?.addListener("backButton", () => { if (current) closeArticle(); else if (active !== "live") show("live"); else P.App.exitApp(); }); } catch {}
  try { P.App?.addListener("resume", () => refresh()); } catch {}

  /* ---------- boot ---------- */
  (async () => {
    applyTheme(); applyLang();
    setTimeout(() => { try { P.SplashScreen?.hide(); } catch {} }, 3500);
    feed = store.get("feed." + lang, null);
    renderTicker(); show("live");
    await loadCfg();
    await Promise.all([loadFeed(), loadListings(), loadGlobal()]);
    renderers[active]();
    try { P.SplashScreen?.hide(); } catch {}
    await loadPrices(); renderTicker(); if (active === "mkt") renderMarket();
    setInterval(async () => { if (document.visibilityState !== "visible") return; await loadPrices(); renderTicker(); if (active === "mkt") renderMarket(); }, 60000);
    setInterval(async () => { if (document.visibilityState !== "visible" || current) return; await loadFeed(); if (active === "live" || active === "news") renderers[active](); }, 120000);
  })();
})();
