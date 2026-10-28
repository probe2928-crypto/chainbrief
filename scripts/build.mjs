// 정적 사이트 빌드: content/ + data/ → dist/
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { markdown, cjkify, cjkifyBare, writeAppFeed, writeSearch, SEARCH_SVG, smartQuotes, globalLedger } from "./lib.mjs";
import { loadMacro, macroSection } from "./macro.mjs";
import { tgChan } from "./tgchan.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));

let BASE = process.env.BASE_PATH || "/";
if (!BASE.endsWith("/")) BASE += "/";
const SITE_URL = (cfg.domain ? `https://${cfg.domain}` : (process.env.SITE_URL || "")).replace(/\/$/, "");
const abs = (p) => SITE_URL + BASE + p.replace(/^\//, "");
const u = (p = "") => BASE + p.replace(/^\//, "");
const BUILD_ID = Date.now().toString(36);
const NOW = new Date();

/* ---------- helpers ---------- */
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    // 따옴표로 감싼 값만 벗긴다 — 제목 끝의 '규정 정치' 같은 인용부호는 지킨다
    const q = v.match(/^(["'])(.*)\1(?:\s+#\s.*)?$/);
    v = q ? q[2] : v.replace(/\s+#\s.*$/, "");
    if (v === "true") v = true; else if (v === "false") v = false;
    data[k] = /^(title|summary|dek|subtitle)$/.test(k) ? smartQuotes(v) : v;
  }
  return { data, body: m[2].trim() };
}
const KST = "Asia/Seoul";
const fmt = (d, o) => new Intl.DateTimeFormat("ko-KR", { timeZone: KST, ...o }).format(d);
const hhmm = (d) => fmt(d, { hour: "2-digit", minute: "2-digit", hour12: false });
const dayLabel = (d) => fmt(d, { year: "numeric", month: "long", day: "numeric", weekday: "long" });
const dayKey = (d) => fmt(d, { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\.\s?/g, "-").replace(/-$/, "");
const kstHour = (d) => parseInt(fmt(d, { hour: "2-digit", hourCycle: "h23" }).replace(/\D/g, ""), 10) % 24;
// 읽는 시간: 한글 기준 분당 약 500자
const readMin = (md = "") => Math.max(1, Math.round(md.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[\s#>*_`|-]/g, "").length / 500));
const fullDate = (d) => fmt(d, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const plain = (md) => md.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`]/g, "").replace(/\s+/g, " ").trim();
function write(rel, content) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, rel.endsWith(".html") ? cjkifyBare(cjkify(content)) : content);
}
function readDir(dir) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith(".md")).map((f) => {
    const { data, body } = frontmatter(fs.readFileSync(path.join(d, f), "utf8"));
    return { id: f.replace(/\.md$/, ""), ...data, body };
  }).filter((x) => !x.draft);
}
const readJSON = (p, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8")); } catch { return d; } };

/* ---------- content ---------- */
const flashes = readDir("content/flash")
  .map((f) => ({ ...f, date: new Date(f.time), important: f.important === true }))
  .filter((f) => !isNaN(f.date) && f.date <= new Date(Date.now() + 60_000))
  .sort((a, b) => b.date - a.date);
const articles = readDir("content/articles")
  .map((a) => ({ ...a, date: new Date(a.date) }))
  .filter((a) => !isNaN(a.date) && a.date <= new Date(Date.now() + 60_000))
  .sort((a, b) => b.date - a.date);
const headlines = readJSON("data/headlines.json", { updatedAt: null, items: [] });
const hlItems = (headlines.items || []).filter((h) => h.lang !== "zh").map((h) => ({ ...h, date: new Date(h.time) }));
const listings = readJSON("data/listings.json", { items: [] });
const lsItems = (listings.items || []).map((i) => ({ ...i, date: new Date(i.time) }));
const globalLs = listings.global || null;
const community = readJSON("data/community.json", { groups: [] });

/* ---------- partials ---------- */
const ICON = {
  live: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="1.6"/>',
  surge: '<path d="M4 18 10 12l4 4 6-8"/><path d="M15 8h5v5"/>',
  news: '<rect x="4" y="4" width="16" height="16"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  comm: '<path d="M4 5h16v11H9l-5 4z"/>',
};
const NAV = [["", "속보"], ["listings/", "상장"], ["surge/", "급등"], ["news/", "뉴스"], ["community/", "커뮤니티"], ["market/", "시세"], ["contact/", "문의"]];
const TABS = [["", "속보", "live"], ["listings/", "상장", "list"], ["surge/", "급등", "surge"], ["news/", "뉴스", "news"], ["community/", "커뮤니티", "comm"]];
const TG = cfg.telegram ? `https://t.me/${cfg.telegram.replace(/^@/, "")}` : "";
const CH = tgChan(cfg, "ko");
const TG_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 3.6 2.9 10.8c-1.3.5-1.3 1.2-.2 1.6l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.6.2 1.8-.8l3.2-15.2c.3-1.3-.5-1.9-1.4-1.6zM8.6 13.6l9.6-6c.5-.3.9-.1.5.2l-8.2 7.4-.3 3.4z"/></svg>';

function layout({ title, description = cfg.description, active = "", body, canonical = "", type = "website", jsonld = "", float = true, extraScript = "" }) {
  const full = title ? `${title} | ${cfg.name}` : `${cfg.nameEn} ${cfg.name} — ${cfg.tagline}`;
  const tape = cfg.coins.slice(0, 6).map((c) => `<a href="${u("market/")}" data-tape="${c.id}"><span class="sym">${c.symbol}</span><span class="num p">—</span>&nbsp;<span class="num c"></span></a>`).join("");
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<script>try{if(/[?&](utm_source=(meta|facebook|instagram|fb|ig)|cb=ad)(&|$)/i.test(location.search))sessionStorage.setItem("cbAd","1");if(sessionStorage.getItem("cbAd")==="1")document.documentElement.classList.add("adclean")}catch(e){}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${canonical !== null && SITE_URL ? `<link rel="canonical" href="${abs(canonical)}">` : ""}${SITE_URL && canonical === active && ["", "listings/", "surge/", "news/", "market/", "contact/", "search/"].includes(active) ? [["ko", ""], ["en", "en/"], ["zh-Hans", "zh/"], ["x-default", ""]].map(([h, pre]) => `<link rel="alternate" hreflang="${h}" href="${abs(pre + active)}">`).join("") : ""}
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(cfg.name)}">
<meta property="og:title" content="${esc(title || cfg.name)}">
<meta property="og:description" content="${esc(description)}">
${SITE_URL ? `<meta property="og:url" content="${abs(canonical || "")}"><meta property="og:image" content="${abs("og.png") + "?v=2"}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0A0A0A">
<link rel="manifest" href="${u("manifest.webmanifest")}">
<link rel="icon" href="${u("icons/icon-192.png")}" type="image/png">
<link rel="apple-touch-icon" href="${u("icons/apple-touch-icon.png")}">
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.name)}" href="${u("rss.xml")}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400..600&family=Jost:wght@300..500&family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@300;400;500&display=swap">
<link rel="stylesheet" href="${u("style.css")}?v=${BUILD_ID}">
${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ""}
</head>
<body data-hue="${({ "": "klein", "listings/": "butter", "surge/": "coral", "news/": "lavender", "community/": "olive", "market/": "klein", "contact/": "coral" })[active] || "klein"}">
<div class="topline"><div class="wrap"><span class="tl-l"><span class="langs" aria-label="Language"><a href="${u(["","listings/","surge/","news/","market/","contact/","search/"].includes(active)?active:"")}" hreflang="ko" aria-current="true">KO</a><a href="${u("en/"+(["","listings/","surge/","news/","market/","contact/","search/"].includes(active)?active:""))}" hreflang="en">EN</a><a href="${u("zh/"+(["","listings/","surge/","news/","market/","contact/","search/"].includes(active)?active:""))}" hreflang="zh-Hans">中文</a></span><span class="tl-date">${esc(dayLabel(NOW))}</span></span><span class="tl-r">${CH ? CH.topline : ""}<a class="tl-search" href="${u("search/")}" aria-label="검색">${SEARCH_SVG}</a><button class="install" id="installBtn" type="button" hidden>App 설치</button><span class="live"><i></i>Live <span class="num" id="clock">${hhmm(NOW)}</span> KST</span></span></div></div>
<header class="site-header">
  <div class="wrap brand">${topAd(ADS[0], "l")}<a class="wm" href="${u()}" aria-label="${esc(cfg.name)} 홈">${esc(cfg.nameEn)}</a>${topAd(ADS[1], "r")}</div>
  <nav class="top" aria-label="주 메뉴"><a class="nav-wm" href="${u()}" tabindex="-1" aria-hidden="true">${esc(cfg.nameEn)}</a>${NAV.map(([p, l]) => `<a href="${u(p)}"${active === p ? ' aria-current="page"' : ""}>${l}</a>`).join("")}<a class="nav-search" href="${u("search/")}"${active === "search/" ? ' aria-current="page"' : ""} aria-label="검색" title="검색 ( / )">${SEARCH_SVG}</a></nav>
</header>
<div class="tape" aria-label="실시간 시세"><div class="wrap">${tape}</div></div>
${ADS.length >= 2 ? `<div class="topads-m">${topAd(ADS[0], "l", true)}${topAd(ADS[1], "r", true)}</div>` : ""}
${body}
${adBand}
<footer class="site-footer"><div class="cbar" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="wrap">
  <div class="ft-top">
    <div class="ft-brand"><a class="wm" href="${u()}">${esc(cfg.nameEn)}</a><p>${esc(cfg.tagline || "")}</p></div>
    <div class="ft-col"><span class="label">Sections</span>${NAV.map(([p, l]) => `<a href="${u(p)}">${l}</a>`).join("")}</div>
    <div class="ft-col"><span class="label">Editions</span><a href="${u()}" lang="ko">한국어</a><a href="${u("en/")}" lang="en">English</a><a href="${u("zh/")}" lang="zh-Hans">中文</a></div>
    <div class="ft-col"><span class="label">Contact</span>${CH ? CH.footer : ""}${TG ? `<a href="${TG}" target="_blank" rel="noopener">문의 @${esc(cfg.telegram)}</a>` : ""}<a href="${u("contact/")}">제보·광고 문의</a><a href="${u("rss.xml")}">RSS</a>${cfg.impact ? `<a href="${cfg.impact.url}ko/" target="_blank" rel="noopener">오리엘 재단</a>` : ""}</div>
    <div class="ft-col"><span class="label">About</span><a href="${u("authors/")}">편집국</a><a href="${u("privacy/")}">개인정보처리방침</a></div>
  </div>
  ${[cfg.footer.company, cfg.footer.registration, cfg.footer.publisher, cfg.footer.email].some(Boolean) ? `<div class="cols">
    ${cfg.footer.company ? `<span>${esc(cfg.footer.company)}</span>` : ""}
    ${cfg.footer.registration ? `<span>등록번호 ${esc(cfg.footer.registration)}</span>` : ""}
    ${cfg.footer.publisher ? `<span>발행·편집인 ${esc(cfg.footer.publisher)}</span>` : ""}
    ${cfg.footer.email ? `<span>${esc(cfg.footer.email)}</span>` : ""}
  </div>` : ""}
  <p class="ft-legal">${esc(cfg.name)}가 제공하는 정보는 투자 권유가 아니며 투자 판단과 책임은 이용자 본인에게 있습니다. 외부 헤드라인과 커뮤니티 글의 저작권은 각 매체와 작성자에게 있습니다. 시세 <span class="nw">CoinGecko·업비트·빗썸</span>, <span class="nw">공포·탐욕 지수</span> Alternative.me.</p>
  <div class="ft-base"><span>© ${NOW.getFullYear()} ${esc(cfg.nameEn)}</span><span>Seoul · Hong Kong · Singapore</span></div>
</div></footer>
${float && TG ? `<a class="tg-float" href="${TG}" target="_blank" rel="noopener" aria-label="텔레그램 문의">${TG_SVG}<span>문의</span></a>` : ""}
<nav class="tabs" aria-label="하단 메뉴">${TABS.map(([p, l, ic]) => `<a href="${u(p)}"${active === p ? ' aria-current="page"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[ic]}</svg>${l}</a>`).join("")}</nav>
<script>window.CB=${JSON.stringify({ base: BASE, searchUrl: u("search/"), coins: cfg.coins, latest: flashes[0]?.id || "", sb: cfg.supabase || {}, boardCats: cfg.boardCategories || [] })}</script>
<script src="${u("app.js")}?v=${BUILD_ID}" defer></script>
<script src="${u("xsheet.js")}?v=${BUILD_ID}" defer></script>
${extraScript ? `<script src="${u(extraScript)}?v=${BUILD_ID}" defer></script>` : ""}
<script src="https://probe2928-crypto.github.io/chainbrief/network.js" data-site="chainbrief" defer></script>
</body>
</html>`;
}
const secHead = (label, title, aside = "", tag = "h1") => `<div class="sec"><div><span class="label">${label}</span><${tag}>${title}</${tag}></div>${aside ? `<div class="aside">${aside}</div>` : ""}</div>`;

function flashItem(f) {
  return `<article class="item${f.important ? " imp" : ""}" data-cat="${esc(f.category || "")}" data-imp="${f.important ? 1 : 0}">
  <time datetime="${f.date.toISOString()}">${hhmm(f.date)}</time>
  <div style="min-width:0">
    <h3><a href="${u(`flash/${f.id}/`)}">${esc(f.title)}</a></h3>
    ${f.body ? `<div class="body">${markdown(f.body)}</div>` : ""}
    <div class="meta">${f.important ? '<span class="tag hot">Breaking</span>' : ""}${f.category ? `<span class="tag kr">${esc(f.category)}</span>` : ""}</div>
  </div>
</article>`;
}
// 날짜 구분: 보도니 숫자 + 월·요일 + 연도 — 지면 날짜 도장처럼
const dayStamp = (d) => `<div class="day"><span class="day-n">${+dayKey(d).slice(-2)}</span><span class="day-l">${fmt(d, { month: "long" })} ${fmt(d, { weekday: "long" })}</span><span class="day-y num">${fmt(d, { year: "numeric" }).replace(/\D/g, "")}</span></div>`;
function feedHTML(list, inline = "", at = 6) {
  if (!list.length) return `<div class="empty">첫 속보를 준비하고 있어요.</div>`;
  let out = "", last = "", n = 0;
  for (const f of list) {
    const k = dayKey(f.date);
    if (k !== last) { out += dayStamp(f.date); last = k; }
    out += flashItem(f);
    if (inline && ++n === at) out += inline;
  }
  return out;
}
function headlineList(items) {
  if (!items.length) return `<div class="empty">헤드라인을 불러오는 중이에요.</div>`;
  return `<ul class="hl">${items.map((h) => `<li>
    <a href="${esc(h.url)}" target="_blank" rel="noopener nofollow">${esc(h.titleKo || h.title)}</a>
    ${h.titleKo ? `<span class="orig">${esc(h.title)}</span>` : ""}
    <span class="src"><b>${esc(h.source)}</b><time data-rel="${h.date.toISOString()}">${fmt(h.date, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}</time></span>
  </li>`).join("")}</ul>`;
}
const EXN = { upbit: "Upbit", bithumb: "Bithumb" };
const EXK = { upbit: "업비트", bithumb: "빗썸" };
const TYN = { listing: "신규 상장", delisting: "거래지원 종료", caution: "유의 지정", "caution-cleared": "유의 해제" };
function listingItem(i, compact = false) {
  const c = i.coins[0] || { symbol: "", name: "" };
  return `<div class="lst" data-ex="${i.exchange}" data-type="${i.type}" data-sym="${esc(c.symbol)}">
    <time>${hhmm(i.date)}</time>
    <div style="min-width:0">
      <div class="meta" style="margin:0 0 6px"><span class="ex">${EXN[i.exchange]}</span><span class="ty ${i.type}">${TYN[i.type] || ""}</span>${i.markets?.length ? `<span>${i.markets.join(" · ")}</span>` : ""}</div>
      <div class="coin">${esc(i.coins.map((x) => x.symbol).join(" · "))}<small>${esc(i.coins.map((x) => x.name).join(", "))}</small></div>
      ${compact ? "" : `<div class="t"><a href="${esc(i.url)}" target="_blank" rel="noopener nofollow">${esc(i.title)}</a></div>`}
    </div>
    <div class="px" data-px>${i.type === "listing" ? "—" : ""}</div>
  </div>`;
}

const marketRail = `<section class="block desk-only">
  <div class="block-head"><h2>주요 시세</h2><span class="label">USD · 24H</span></div>
  <table><tbody>
  ${cfg.coins.slice(0, 6).map((c) => `<tr data-row="${c.id}"><td><span class="sym">${c.symbol}</span><span class="name">${esc(c.name)}</span></td><td class="num p">—</td><td class="num c"></td></tr>`).join("")}
  </tbody></table>
  <a class="more" href="${u("market/")}">전체 시세 · 김프</a>
</section>`;
const sentiment = `<section class="block">
  <div class="block-head"><h2>시장 심리</h2><span class="label">Fear &amp; Greed</span></div>
  <div class="gauge">
    <div class="row"><span class="big" id="fngVal">—</span><span class="lbl" id="fngLbl"></span><span id="fngPrev" style="margin-left:auto;font-size:12px;color:var(--mute)"></span></div>
    <div class="bar"><i id="fngBar" style="left:50%"></i></div>
    <div class="scale"><span>Fear</span><span>Neutral</span><span>Greed</span></div>
  </div>
  <div class="kp">
    <div><small>BTC 김치프리미엄</small><strong class="num" id="kimpBtc">—</strong></div>
    <div><small>BTC 도미넌스</small><strong class="num" id="btcDom">—</strong></div>
  </div>
</section>`;
const ADS = cfg.ads || [];
const adCard = (ad, cls = "") => `<a class="ad ${cls}" data-ad="${esc(ad.id)}" href="${esc(ad.url)}" target="_blank" rel="noopener sponsored">
  <span class="ad-eye"><span>${esc(ad.eyebrow || "Partner")}</span><span>AD</span></span>
  <span class="ad-wm">${esc(ad.wordmark)}</span>
  <span class="ad-t">${esc(ad.title)}</span>
  <span class="ad-x">${esc(ad.text)}</span>
  <span class="ad-cta">${esc(ad.cta)} <span aria-hidden="true">→</span></span>
  ${ad.note ? `<span class="ad-n">${esc(ad.note)}</span>` : ""}
</a>`;
function topAd(ad, side, mobile = false) {
  if (!ad) return `<span class="topad-sp"></span>`;
  return `<a class="topad ${side}${mobile ? " m" : ""}" href="${esc(ad.url)}" target="_blank" rel="noopener sponsored" title="${esc(ad.note || ad.title)}">
    <span class="ta-l">${esc(ad.topEyebrow || "Partner").replace(" · ", '<span class="ta-x"><i> · </i>') + ((ad.topEyebrow || "").includes(" · ") ? "</span>" : "")}</span><span class="ta-wm">${esc(ad.wordmark)}</span><span class="ta-t">${esc(ad.short || ad.title)}</span></a>`;
}
const adBand = ADS.length ? `<section class="adband" aria-label="제휴 광고"><div class="wrap"><div class="adband-head"><span class="label">Partners</span><span class="label">체인브리프와 함께하는 곳</span></div><div class="ads">${ADS.map((a) => adCard(a)).join("")}</div></div></section>` : "";
const adInline = (i = 0) => ADS.length ? `<aside class="ad-inline"><span class="label">Sponsored</span>${adCard(ADS[i % ADS.length], "wide")}</aside>` : "";
const IMP = cfg.impact;
const partner = IMP ? `<section class="block slot impact">
  <span class="label">Impact</span>
  <strong>${esc(IMP.ko.title)}</strong>
  <span>${esc(IMP.ko.text)}</span>
  <a class="btn ghost" href="${IMP.url}${IMP.ko.path}" target="_blank" rel="noopener">${esc(IMP.ko.cta)}</a>
</section>` : "";
const recentListings = lsItems.filter((i) => i.type === "listing").slice(0, 5);
// 사이드바 상장: 시각 위에 날짜(오늘·어제·10.26)를 얹어 어제·오늘이 섞여 보이지 않게
const relDay = (d) => { const k = dayKey(d), t = dayKey(NOW), y = dayKey(new Date(NOW.getTime() - 864e5)); return k === t ? "오늘" : k === y ? "어제" : fmt(d, { month: "2-digit", day: "2-digit" }).replace(/\.\s?/g, ".").replace(/\.$/, ""); };
function listingRailItem(i) {
  const c = i.coins[0] || { symbol: "", name: "" };
  return `<div class="lst c" data-ex="${i.exchange}" data-type="${i.type}" data-sym="${esc(c.symbol)}">
    <time datetime="${i.date.toISOString()}"><span class="lc-d">${relDay(i.date)}</span><span class="lc-h num">${hhmm(i.date)}</span></time>
    <div style="min-width:0"><div class="coin">${esc(i.coins.map((x) => x.symbol).join(" · "))}<small>${esc(i.coins.map((x) => x.name).join(", "))}</small></div>
    <div class="lc-m"><span class="lc-ex">${EXN[i.exchange]}</span><span class="ty ${i.type}">${TYN[i.type] || ""}</span>${i.markets?.length ? `<span class="lc-mk">${i.markets.join(" · ")}</span>` : ""}</div></div>
    <div class="px" data-px>${i.type === "listing" ? "—" : ""}</div>
  </div>`;
}
const listingRail = `<section class="block">
  <div class="block-head"><h2>최근 상장</h2><span class="label">Upbit · Bithumb</span></div>
  ${recentListings.length ? recentListings.map(listingRailItem).join("") : '<div class="slot-empty">상장 소식을 불러오는 중이에요.</div>'}
  <a class="more" href="${u("listings/")}">상장 소식 전체</a>
</section>`;
const contactRail = TG ? `<section class="block slot">
  <span class="label">Contact</span>
  <strong>제보 · 광고 · 제휴 문의</strong>
  <span>텔레그램 @${esc(cfg.telegram)} 으로 바로 연락 주세요.</span>
  <a class="btn ghost" href="${TG}" target="_blank" rel="noopener">텔레그램 열기</a>
</section>` : "";
const chRail = CH ? CH.rail : "";
const rail = (extra = "") => `<aside class="rail">${marketRail}${sentiment}${chRail}${extra}${partner}${contactRail}</aside>`;

/* ---------- pages ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, "public"), OUT, { recursive: true });

// ---------- 히어로 슬라이더 (public/art/*.jpg, 움직이는 커튼 전환 + 켄번스) ----------
const ART = { 정책: "sage-bands", 시장: "gold-silk", 산업: "light-grid", 거래소: "light-grid", 기술: "contour", 해외: "blue-hour", 가이드: "smoke" };
const ART_POOL = ["blue-hour", "rose-dusk", "gold-silk", "prism", "contour", "smoke", "sage-bands", "light-grid"];
function pickArt(used, want) {
  const order = [want, ...ART_POOL].filter(Boolean);
  const a = order.find((x) => !used.has(x)) || order[0];
  used.add(a); return a;
}
const ART_V = (() => { const d = path.join(ROOT, "public/art"); const h = crypto.createHash("md5"); try { for (const f of fs.readdirSync(d).sort()) h.update(fs.readFileSync(path.join(d, f))); } catch {} return h.digest("hex").slice(0, 8); })();
// 첫 장만 바로 받고, 나머지 슬라이드 그림은 app.js가 차례 직전에 data-src → src 로 채움 (첫 화면 ~1.5MB 절약)
const artImg = (name, eager) => eager
  ? `<picture class="slide-bg"><source media="(max-width:700px)" srcset="${u(`art/${name}-m.jpg`)}?v=${ART_V}"><img src="${u(`art/${name}.jpg`)}?v=${ART_V}" alt="" fetchpriority="high" decoding="async"></picture>`
  : `<picture class="slide-bg"><source media="(max-width:700px)" data-srcset="${u(`art/${name}-m.jpg`)}?v=${ART_V}"><img data-src="${u(`art/${name}.jpg`)}?v=${ART_V}" alt="" decoding="async"></picture>`;
function hero(slides, size = "lg", label = "주요 소식") {
  if (!slides.length) return "";
  const used = new Set();
  return `<section class="hero hero-${size}" data-hero aria-roledescription="carousel" aria-label="${esc(label)}">
  <div class="hero-track">${slides.map((sl, i) => `
    <article class="slide${i === 0 ? " is-active" : ""}" aria-roledescription="slide" aria-label="${i + 1} / ${slides.length}"${i ? ' aria-hidden="true"' : ""}>
      ${artImg(pickArt(used, sl.art), i === 0)}
      <div class="slide-shade"></div>
      <div class="wrap slide-body">
        <span class="slide-eye">${sl.eye}</span>
        <h2 class="slide-t"><a href="${esc(sl.href)}"${/^https?:/.test(sl.href) ? ' target="_blank" rel="noopener nofollow"' : ""}>${esc(sl.title)}</a></h2>
        ${sl.dek ? `<p class="slide-d">${esc(sl.dek)}</p>` : ""}
        <a class="slide-cta" href="${esc(sl.href)}"${/^https?:/.test(sl.href) ? ' target="_blank" rel="noopener nofollow"' : ""} tabindex="-1">${esc(sl.cta || "자세히 보기")} <span aria-hidden="true">→</span></a>
      </div>
    </article>`).join("")}
  </div>
  ${slides.length > 1 ? `<div class="wrap hero-ui">
    <div class="hero-bars">${slides.map((_, i) => `<button type="button" class="hero-bar" data-go="${i}" aria-label="${i + 1}번 슬라이드"><i></i></button>`).join("")}</div>
    <span class="hero-count num"><b>01</b> / ${String(slides.length).padStart(2, "0")}</span>
    <button type="button" class="hero-nav" data-dir="-1" aria-label="이전">←</button><button type="button" class="hero-nav" data-dir="1" aria-label="다음">→</button>
  </div>` : ""}
</section>`;
}
const artSlide = (a, eye) => ({ art: ART[a.category], eye, title: a.title, dek: a.summary || plain(a.body).slice(0, 110), href: u(`articles/${a.id}/`), cta: "기사 읽기" });
const eyeOf = (a) => `${a.format ? esc(a.format) : a.author === cfg.author ? "오늘의 해설" : "기사"} · ${esc(a.author || "편집국")}`;

// 홈 상단 컬러 필드: 시장 숫자 4칸 + 오늘의 기사
const wk = lsItems.filter((i) => i.type === "listing" && Date.now() - i.date < 7 * 864e5);
const topArt = articles.find((a) => a.format) || articles[0];
const homeSlides = (() => {
  const out = [], seen = new Set();
  const add = (a) => { if (a && !seen.has(a.id)) { seen.add(a.id); out.push(artSlide(a, eyeOf(a))); } };
  add(articles.find((a) => a.format === "심층취재"));
  add(articles.find((a) => a.author === cfg.author));
  add(articles.find((a) => a.format === "칼럼"));
  const wkL = lsItems.filter((i) => i.type === "listing" && Date.now() - i.date < 7 * 864e5);
  if (wkL.length) out.push({ art: "light-grid", eye: "Listings · 업비트 · 빗썸", title: `이번 주 신규 상장 ${wkL.length}건`, dek: [...new Set(wkL.flatMap((i) => i.coins.map((c) => c.symbol)))].slice(0, 8).join(" · "), href: u("listings/"), cta: "상장 소식 보기" });
  out.push({ art: "prism", eye: "Surge Radar · 실시간", title: "지금 가장 빠르게 움직이는 코인", dek: "5분 급등, 거래 급증, 52주 신고가, 신규 상장 성적표를 한 화면에서.", href: u("surge/"), cta: "급등 레이더 열기" });
  if (CH) out.splice(Math.min(2, out.length), 0, CH.slide);
  add(articles.find((a) => a.format && !seen.has(a.id)));
  return out.slice(0, 7);
})();
const colorField = `<section class="cfield" aria-label="오늘의 시장"><div class="wrap cf-grid">
  <a class="cf cf-klein" href="${u("market/")}" data-tape="bitcoin"><span class="cf-l">Bitcoin · USD</span><span class="cf-big p">—</span><span class="cf-s c"></span></a>
  <a class="cf cf-butter" href="${u("market/")}"><span class="cf-l">김치프리미엄</span><span class="cf-big" data-kimp>—</span><span class="cf-s" data-kimp-src>업비트 BTC 기준</span></a>
  <a class="cf cf-coral" href="${u("surge/")}"><span class="cf-l">시장 심리</span><span class="cf-big" data-fng>—</span><span class="cf-s" data-fng-lbl>Fear &amp; Greed</span></a>
  <a class="cf cf-lavender" href="${u("listings/")}"><span class="cf-l">최근 7일 신규 상장</span><span class="cf-big">${wk.length}</span><span class="cf-s">업비트 ${wk.filter((i) => i.exchange === "upbit").length} · 빗썸 ${wk.filter((i) => i.exchange === "bithumb").length}</span></a>
  ${topArt ? `<a class="cf cf-olive cf-art" href="${u(`articles/${topArt.id}/`)}"><span class="cf-l">${esc(topArt.format || "오늘의 기사")} · ${esc(topArt.author || "편집국")}</span><span class="cf-title">${esc(topArt.title)}</span><span class="cf-s">읽기 →</span></a>` : ""}
</div></section>`;

// 홈: 라이브 속보
const cats = ["전체", "중요", ...cfg.categories];
write("index.html", layout({
  active: "", canonical: "",
  jsonld: SITE_URL ? JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: cfg.name, alternateName: cfg.nameEn, url: abs(""), inLanguage: "ko", publisher: { "@type": "NewsMediaOrganization", name: cfg.name, alternateName: cfg.nameEn, url: abs(""), sameAs: CH ? CH.sameAs : [] }, potentialAction: { "@type": "SearchAction", target: abs("search/") + "?q={search_term_string}", "query-input": "required name=search_term_string" } }) : "",
  body: `${hero(homeSlides, "lg")}${colorField}<div class="wrap"><main class="grid">
  <div class="col"><section>
    ${secHead("Live Wire", "라이브 속보", `<label class="search"><span class="sr">속보 검색</span><input id="q" type="search" placeholder="속보 검색"></label>`)}
    <div class="tabs-row" id="filters" role="toolbar" aria-label="분류">${cats.map((c, i) => `<button class="tab${c === "중요" ? " hot" : ""}" type="button" data-c="${esc(c)}" aria-pressed="${i === 0}">${esc(c)}</button>`).join("")}</div>
    <div id="newWrap" hidden><button class="newpill" id="newBtn" type="button">새 속보 보기</button></div>
    <div id="feed">${feedHTML(flashes.slice(0, 150), CH ? CH.inline : "")}</div>
    <div class="empty" id="noMatch" hidden>조건에 맞는 속보가 없어요.</div>
  </section></div>
  ${rail(listingRail + `<section class="block"><div class="block-head"><h2>해외 헤드라인</h2><span class="label">Global</span></div>${headlineList(hlItems.slice(0, 6))}<a class="more" href="${u("news/")}">더 보기</a></section>`)}
</main></div>`,
}));

// 속보 상세
flashes.forEach((f, i) => {
  const near = [flashes[i - 1], flashes[i + 1]].filter(Boolean);
  write(`flash/${f.id}/index.html`, layout({
    title: f.title, description: plain(f.body || f.title).slice(0, 150), canonical: `flash/${f.id}/`, type: "article",
    jsonld: JSON.stringify({ "@context": "https://schema.org", "@type": "NewsArticle", headline: f.title, datePublished: f.date.toISOString(), publisher: { "@type": "Organization", name: cfg.name } }),
    body: `<div class="wrap"><p class="crumbs"><a href="${u()}">Live Wire</a><i class="sep" aria-hidden="true">/</i><span class="here">${esc(f.category || "속보")}</span></p><main class="grid">
    <div class="col"><article class="doc">
      <div class="kicker">${f.important ? '<span class="tag hot">Breaking</span>' : ""}${f.category ? `<span class="tag kr">${esc(f.category)}</span>` : ""}<time class="byline">${fullDate(f.date)}</time></div>
      <h1>${esc(f.title)}</h1>
      <div class="prose">${markdown(f.body || "")}</div>
      <div class="share"><button class="btn ghost" type="button" data-copy>링크 복사</button><a class="btn" href="${u()}">속보 목록</a></div>
      ${CH ? CH.card : ""}
    </article>
    ${near.length ? `<section>${secHead("Also", "이어지는 속보", "", "h2")}${near.map(flashItem).join("")}</section>` : ""}
    </div>${rail()}</main></div>`,
  }));
});

// 상장 소식: 최근 7일, 하루를 오전·오후·저녁·새벽으로
const SLOTS = [["오전", "Morning", 6, 12], ["오후", "Afternoon", 12, 18], ["저녁", "Evening", 18, 24], ["새벽", "Late Night", 0, 6]];
const days = [];
for (let d = 0; d < 7; d++) {
  const date = new Date(NOW.getTime() - d * 864e5);
  const key = dayKey(date);
  const items = lsItems.filter((i) => dayKey(i.date) === key);
  days.push({ key, date, items });
}
const openIdx = Math.max(0, days.findIndex((d) => d.items.length));
const dayPanel = (day, idx) => `<div class="daypanel" data-day="${day.key}"${idx !== openIdx ? " hidden" : ""}>
  ${SLOTS.map(([ko, en, a, b]) => {
    const its = day.items.filter((i) => { const h = kstHour(i.date); return h >= a && h < b; });
    return `<section class="slotsec"><h3>${ko} <span class="label">${en} · ${String(a).padStart(2, "0")}–${String(b).padStart(2, "0")}시</span></h3>
      ${its.length ? its.map((i) => listingItem(i)).join("") : '<div class="slot-empty">이 시간대 소식이 없어요.</div>'}</section>`;
  }).join("")}
</div>`;
write("listings/index.html", layout({
  title: "업비트·빗썸 상장 소식", active: "listings/", canonical: "listings/",
  description: "업비트·빗썸 신규 상장, 거래 유의, 거래지원 종료 소식을 하루 단위 오전·오후·저녁·새벽으로 정리했어요.",
  body: `${hero(lsItems.filter((i) => i.type === "listing").slice(0, 4).map((i, k) => ({ art: ["light-grid", "gold-silk", "contour", "blue-hour"][k], eye: `${EXN[i.exchange]} · ${TYN[i.type]} · ${fmt(i.date, { month: "long", day: "numeric" })}`, title: i.coins.map((c) => c.symbol).join(" · "), dek: `${i.coins.map((c) => c.name).join(", ")} — ${i.title}`, href: i.url, cta: "공지 원문" })), "sm", "최근 상장")}<div class="wrap"><main class="grid"><div class="col"><section>
  ${secHead("Listings", "상장 소식", listings.updatedAt ? `${hhmm(new Date(listings.updatedAt))} 업데이트 · 15분마다 확인` : "15분마다 확인")}
  <div class="daytabs" id="daytabs">${days.map((d, i) => `<button class="daytab" type="button" data-day="${d.key}" aria-pressed="${i === openIdx}"><small>${i === 0 ? "오늘" : i === 1 ? "어제" : fmt(d.date, { weekday: "short" })}</small><b>${fmt(d.date, { day: "numeric" }).replace("일", "")}</b><span class="cnt">${d.items.filter((x) => x.type === "listing").length} New</span></button>`).join("")}</div>
  <div class="tabs-row" id="lsFilters">
    ${[["all", "전체"], ["upbit", "업비트"], ["bithumb", "빗썸"]].map(([k, l], i) => `<button class="tab" type="button" data-ex="${k}" aria-pressed="${i === 0}">${l}</button>`).join("")}
    <span style="width:1px;background:var(--line)"></span>
    ${[["all", "모든 유형"], ["listing", "신규 상장"], ["caution", "유의"], ["delisting", "종료"]].map(([k, l], i) => `<button class="tab" type="button" data-type="${k}" aria-pressed="${i === 0}">${l}</button>`).join("")}
  </div>
  <div id="daypanels">${days.map(dayPanel).join("")}</div>
  <p class="note">거래소 공지와 마켓 목록을 함께 확인해요. 상장 코인 오른쪽은 현재가와 24시간 변동률이에요.</p>
  </section>${globalLedger({ data: globalLs, esc, rel: relDay, hhmm, S: { label: "Global Exchanges", title: "해외 거래소 상장", aside: "바이낸스 · OKX · 바이비트 공지와 코인베이스 마켓 목록을 15분마다 확인해요. 공지 제목과 링크만 옮겨요.", listing: "신규 상장", delisting: "상장 폐지", notice: "공지 원문", empty: "최근 30일 해외 거래소 상장 소식이 아직 없어요.", checked: "{t} 확인", stale: "지금 연결 안 됨" } })}</div>${rail()}</main></div>`,
}));

// 급등 레이더 (브라우저에서 실시간 계산, public/surge.js)
const board = (id, label, title, note = "") => `<section class="sboard"><div class="block-head"><h2>${title}</h2><span class="label">${label}</span></div>${note ? `<p class="bnote">${note}</p>` : ""}<ol class="rank" id="${id}"><li class="msg-row"><span class="nm">불러오는 중…</span></li></ol></section>`;
write("surge/index.html", layout({
  title: "급등 레이더", active: "surge/", canonical: "surge/", extraScript: "surge.js",
  description: "업비트·빗썸 원화마켓 실시간 급등·급락, 5분 단기 급등, 거래 급증, 52주 신고가, 신규 상장 성적표, 거래소 가격차.",
  body: `${hero([
    { art: "prism", eye: "Right Now · 1분봉", title: "5분 급등", dek: "최근 5분 동안 가장 크게 오른 코인을 1분봉으로 추적해요.", href: "#rkShort", cta: "바로 보기" },
    { art: "blue-hour", eye: "Volume Spike", title: "거래 급증", dek: "평소 5분 거래대금보다 1.5배 넘게 몰린 코인.", href: "#rkSpike", cta: "바로 보기" },
    { art: "gold-silk", eye: "Momentum", title: "52주 신고가 · 신규 상장 성적표", dek: "고점 근처의 코인과 최근 30일 상장 코인의 성적.", href: "#rkHigh", cta: "바로 보기" },
  ], "sm", "급등 레이더 안내")}<div class="wrap"><main class="single wide-single" id="surgeApp"><section>
  ${secHead("Surge Radar", "급등 레이더", '<span class="status" id="surgeStatus">불러오는 중…</span>')}
  <div class="controls">
    <div class="tabs-row" id="exSwitch">${[["upbit", "업비트"], ["bithumb", "빗썸"]].map(([k, l], i) => `<button class="tab" type="button" data-ex="${k}" aria-pressed="${i === 0}">${l}</button>`).join("")}</div>
    <div class="tabs-row" id="volFilter"><span class="label" style="align-self:center">거래대금</span>${[["0", "전체"], ["1000000000", "10억+"], ["10000000000", "100억+"]].map(([k, l], i) => `<button class="tab" type="button" data-vol="${k}" aria-pressed="${i === 0}">${l}</button>`).join("")}</div>
    <label class="search"><span class="sr">코인 검색</span><input id="surgeQ" type="search" placeholder="코인 검색 (예: BTC, 리플)"></label>
  </div>
  <div class="summary" id="surgeSummary"></div>

  <h3 class="grp"><span class="label">Right Now</span>단기 시그널</h3>
  <div class="surge">
    ${board("rkShort", "5 Min", "5분 급등", "최근 5분 가격 변동 · 1분봉 기준")}
    ${board("rkSpike", "Volume Spike", "거래 급증", "최근 5분 거래대금 ÷ 평소 5분 평균")}
  </div>

  <h3 class="grp"><span class="label">24 Hours</span>오늘의 등락</h3>
  <div class="surge">
    ${board("rkUp", "Top Gainers", "상승률 TOP")}
    ${board("rkDown", "Top Losers", "하락률 TOP")}
    ${board("rkVol", "Volume", "거래대금 TOP")}
    ${board("rkGap", "Upbit vs Bithumb", "거래소 가격차", "같은 코인의 업비트·빗썸 원화 가격 차이")}
  </div>

  <h3 class="grp"><span class="label">Momentum</span>신고가 · 신규 상장</h3>
  <div class="surge">
    ${board("rkHigh", "52-Week High", "52주 신고가 근접", "52주 최고가 대비 현재가")}
    ${board("rkList", "New Listings", "신규 상장 성적표", "최근 30일 상장 코인 · 상장일 시가 대비")}
  </div>
  <p class="note">원화마켓 기준. 24시간 변동률은 전일 종가 대비, 단기 지표는 1분봉 기준이에요. 행을 누르면 거래소 차트로 이동해요. 투자 판단의 근거가 아닌 참고용이에요.</p>
  </section></main></div>`,
}));

// 뉴스: 스캇 박 기사 + 해외 헤드라인
const REP = Object.fromEntries((cfg.reporters || []).map((r) => [r.name, r]));
const kindOf = (a) => a.format || (a.author === cfg.author ? "해설" : a.category === "가이드" ? "가이드" : "해설");
const tagRow = (a) => `<span class="tag kr">${esc(a.category || "기사")}</span>${a.format ? `<span class="tag fmt">${esc(a.format)}</span>` : ""}`;
const CAT_SLUG = { 정책: "policy", 시장: "markets", 산업: "industry", 거래소: "exchanges", 기술: "tech", 해외: "global", 가이드: "guide" };
const catSlug = (c) => CAT_SLUG[c] || encodeURIComponent(String(c || "etc").toLowerCase().replace(/\s+/g, "-"));
const catCount = articles.reduce((m, a) => (a.category && m.set(a.category, (m.get(a.category) || 0) + 1), m), new Map());
const catList = [...catCount.entries()].sort((a, b) => b[1] - a[1]);
const catTag = (a) => a.category ? `<a class="tag kr" href="${u(`category/${catSlug(a.category)}/`)}">${esc(a.category)}</a>` : `<span class="tag kr">기사</span>`;
const deskIndex = (cur = "") => catList.length > 1 ? `<nav class="desks" aria-label="분야별 기사"><span class="label">Sections</span><ul>${[["", "전체", articles.length], ...catList.map(([c, n]) => [c, c, n])].map(([c, l, n]) => `<li><a href="${u(c ? `category/${catSlug(c)}/` : "news/")}"${c === cur ? ' aria-current="page"' : ""}>${esc(l)}<sup class="num">${n}</sup></a></li>`).join("")}</ul></nav>` : "";
const byline = (a) => `<span class="byline">${fmt(a.date, { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} · <b>${esc(a.author || "체인브리프 편집부")}</b></span>`;
const card = (a) => `<a class="art" data-kind="${esc(kindOf(a))}" href="${u(`articles/${a.id}/`)}"><div class="meta" style="margin:0">${tagRow(a)}</div><h3>${esc(a.title)}</h3><p>${esc(a.summary || plain(a.body).slice(0, 120))}</p><div style="margin-top:10px">${byline(a)}</div></a>`;
const recentFeature = articles.find((a) => a.format && Date.now() - a.date < 2 * 864e5);
const lead = recentFeature || articles[0];
const sources = [...new Set(hlItems.map((h) => h.source))];
write("news/index.html", layout({
  title: "뉴스", active: "news/", canonical: "news/",
  body: `${hero(articles.slice(0, 4).map((a) => artSlide(a, eyeOf(a))), "sm", "주요 기사")}<div class="wrap"><main class="grid"><div class="col">
  <section>
    ${secHead("Editorial", "체인브리프 기사", `<a class="more" style="margin:0" href="${u("authors/")}">편집국</a>`)}
    ${deskIndex()}
    <div class="tabs-row" id="kindTabs">${["전체", "해설", "심층취재", "칼럼"].map((k, i) => `<button class="tab" type="button" data-kind="${k}" aria-pressed="${i === 0}">${k}</button>`).join("")}</div>
    <div class="arts" id="artList">${articles.slice(0, 40).map(card).join("") || '<div class="empty">첫 기사를 준비하고 있어요.</div>'}</div>
  </section>
  <section>
    ${secHead("Global", "해외 헤드라인", headlines.updatedAt ? `${hhmm(new Date(headlines.updatedAt))} 업데이트` : "15분마다 업데이트", "h2")}
    ${sources.length > 1 ? `<div class="tabs-row" id="srcFilters">${["전체", ...sources].map((s, i) => `<button class="tab" type="button" data-src="${esc(s)}" aria-pressed="${i === 0}">${esc(s)}</button>`).join("")}</div>` : ""}
    <div id="hlList">${headlineList(hlItems.slice(0, 80))}</div>
  </section>
  </div>${rail()}</main></div>`,
}));

// 기사 상세
articles.forEach((a, i) => {
  const more = articles.filter((x) => x !== a).slice(0, 4);
  write(`articles/${a.id}/index.html`, layout({
    title: a.title, description: a.summary || plain(a.body).slice(0, 150), active: "news/", canonical: `articles/${a.id}/`, type: "article",
    jsonld: JSON.stringify({ "@context": "https://schema.org", "@type": "NewsArticle", headline: a.title, description: a.summary, datePublished: a.date.toISOString(), author: { "@type": "Person", name: a.author || cfg.name }, publisher: { "@type": "Organization", name: cfg.name } }),
    body: `<div class="cover" aria-hidden="true">${artImg(ART[a.category] || ART_POOL[i % ART_POOL.length], true)}</div><div class="wrap"><p class="crumbs"><a href="${u("news/")}">Editorial</a><i class="sep" aria-hidden="true">/</i>${a.category ? `<a href="${u(`category/${catSlug(a.category)}/`)}">${esc(a.category)}</a>` : `<span class="here">기사</span>`}</p><main class="grid"><div class="col">
    <article class="doc">
      <div class="kicker">${catTag(a)}${a.format ? `<span class="tag fmt">${esc(a.format)}</span>` : ""}</div>
      <h1>${esc(a.title)}</h1>
      ${a.summary ? `<p class="lede">${esc(a.summary)}</p>` : ""}
      <div class="byrow"><span class="byline">글 · ${REP[a.author] ? `<a href="${u(`authors/${REP[a.author].slug}/`)}"><b>${esc(a.author)}</b></a>${REP[a.author].desk ? ` · ${esc(REP[a.author].desk)}` : ""}` : `<b>${esc(a.author || "체인브리프 편집부")}</b>`}</span><span class="byend"><span class="readt">${readMin(a.body)}분 읽기</span><time class="byline">${fullDate(a.date)}</time></span></div>
      <div class="prose">${markdown(a.body)}</div>
      <div class="share"><button class="btn ghost" type="button" data-copy>링크 복사</button>${TG ? `<a class="btn ghost" href="${TG}" target="_blank" rel="noopener">기사 제보</a>` : ""}</div>
      ${CH ? CH.card : ""}
      ${adInline(i)}
    </article>
    ${more.length ? `<section>${secHead("More", "다른 기사", "", "h2")}<div class="arts">${more.map(card).join("")}</div></section>` : ""}
    </div>${rail()}</main></div>`,
  }));
});

// 분야별 기사 목록 (/category/<slug>/)
const CAT_DEK = { 정책: "법안·과세·감독 — 규제가 시장 구조를 바꾸는 지점을 따라갑니다.", 시장: "가격과 자금 흐름, 그 뒤의 이유.", 산업: "기업과 프로젝트, 돈이 움직이는 방향.", 거래소: "상장·유의 종목·거래소 경쟁의 현장.", 기술: "프로토콜과 보안, 코드가 바꾸는 것들.", 해외: "세계 주요 시장과 규제 당국의 움직임.", 가이드: "처음 시작하는 투자자를 위한 차분한 안내서." };
for (const [c, n] of catList) {
  const mine = articles.filter((a) => a.category === c);
  const slides = [...mine, ...articles.filter((a) => a.category !== c)].slice(0, Math.max(2, Math.min(4, mine.length))).map((a) => artSlide(a, a.category === c ? eyeOf(a) : `다른 분야 · ${esc(a.category || "기사")}`));
  write(`category/${catSlug(c)}/index.html`, layout({
    title: `${c} 기사`, active: "news/", canonical: `category/${catSlug(c)}/`,
    description: `${cfg.name} ${c} 분야 기사 ${n}편 — ${CAT_DEK[c] || ""}`,
    body: `${hero(slides, "sm", `${c} 주요 기사`)}<div class="wrap"><p class="crumbs"><a href="${u("news/")}">Editorial</a><i class="sep" aria-hidden="true">/</i><span class="here">${esc(c)}</span></p><main class="grid"><div class="col">
  <section>
    ${secHead("Section", `${esc(c)}`, `${n}편`)}
    ${CAT_DEK[c] ? `<p class="cat-dek">${esc(CAT_DEK[c])}</p>` : ""}
    ${deskIndex(c)}
    <div class="arts">${mine.map(card).join("")}</div>
  </section>
  </div>${rail()}</main></div>`,
  }));
}

// 편집국 · 기자별 페이지
const reps = cfg.reporters || [];
write("authors/index.html", layout({
  title: "편집국", active: "news/", canonical: "authors/",
  description: `${cfg.name} 편집국 기자와 담당 분야`,
  body: `<div class="wrap"><main class="single">
  ${secHead("Newsroom", "편집국")}
  <ul class="staff">${reps.map((r) => { const n = articles.filter((a) => a.author === r.name).length; return `<li><a href="${u(`authors/${r.slug}/`)}"><span class="label">${esc(r.desk)}</span><strong>${esc(r.name)}</strong><span class="beat">${esc(r.beat)}</span><span class="cnt">${(r.formats || []).join(" · ")} · 기사 ${n}편</span></a></li>`; }).join("")}</ul>
  <p class="note">체인브리프 기사는 편집국이 취재·검증해 발행해요. 기사에 대한 정정·제보는 <a href="${u("contact/")}" style="text-decoration:underline">문의</a>로 보내주세요.</p>
  </main></div>`,
}));
for (const r of reps) {
  const mine = articles.filter((a) => a.author === r.name);
  write(`authors/${r.slug}/index.html`, layout({
    title: `${r.name} 기자`, active: "news/", canonical: `authors/${r.slug}/`,
    description: `${cfg.name} ${r.desk} ${r.name} 기자의 기사`,
    body: `<div class="wrap"><p class="crumbs"><a href="${u("authors/")}">Newsroom</a><i class="sep" aria-hidden="true">/</i><span class="here">${esc(r.desk)}</span></p><main class="single" style="margin-top:20px">
    ${secHead(esc(r.desk), `${esc(r.name)} 기자`, `${mine.length}편`)}
    <p class="lede" style="margin:18px 0 0;color:var(--mute);font-weight:300">${esc(r.beat)}</p>
    <div class="arts" style="margin-top:12px">${mine.map(card).join("") || '<div class="empty">곧 첫 기사가 올라와요.</div>'}</div>
    </main></div>`,
  }));
}

// 시세
const MACRO_DATA = loadMacro(ROOT);
write("market/index.html", layout({
  title: "실시간 시세 · 김치프리미엄 · 글로벌 마켓", active: "market/", canonical: "market/",
  description: "비트코인·이더리움 등 주요 코인의 실시간 달러·원화 시세와 업비트 김치프리미엄, 미국·한국 증시 지수와 선물·원자재·크립토 관련 주식·환율.",
  body: `${hero([
    { art: "gold-silk", eye: "Markets · 실시간", title: "달러와 원화, 한 번에", dek: "주요 코인의 글로벌 시세와 업비트 원화 가격을 1분마다 비교해요.", href: "#mkt", cta: "시세 보기" },
    { art: "rose-dusk", eye: "Kimchi Premium", title: "김치프리미엄", dek: "국내 가격이 해외보다 얼마나 비싼지, 코인별로.", href: "#mkt", cta: "김프 보기" },
    { art: "smoke", eye: "Global Markets", title: "증시와 선물, 같은 화면에서", dek: "나스닥·S&P·코스피, CME 비트코인 선물, 금·원유, 코인베이스·스트래티지까지.", href: "#global", cta: "글로벌 마켓 보기" },
  ], "sm", "시세 안내")}<div class="wrap"><main class="grid"><div class="col"><section>
    ${secHead("Markets", "실시간 시세", '<span id="mktUpdated">불러오는 중…</span>')}
    <div class="wide" id="mkt"><table class="mkt-full"><thead><tr><th>코인</th><th>USD</th><th>업비트 KRW</th><th>24H</th><th>김프</th><th>거래대금</th></tr></thead><tbody>
    ${cfg.coins.map((c) => `<tr data-row="${c.id}"><td><span class="sym">${c.symbol}</span><span class="name">${esc(c.name)}</span></td><td class="num p">—</td><td class="num krw">—</td><td class="num c"></td><td class="num kimp">—</td><td class="num vol">—</td></tr>`).join("")}
    </tbody></table></div>
    <p class="note">김프 = 업비트 원화 가격 ÷ (글로벌 달러 가격 × 환율) − 1. 1분마다 갱신.</p>
  </section>${macroSection("ko", MACRO_DATA, { esc, secHead })}</div>
  <aside class="rail">${sentiment}${chRail}${partner}${contactRail}</aside></main></div>`,
}));

// 커뮤니티
const extGroups = (community.groups || []).filter((g) => g.items?.length);
const extHTML = extGroups.length ? `
  <div class="tabs-row" id="extTabs">${extGroups.map((g, i) => `<button class="tab" type="button" data-g="${i}" aria-pressed="${i === 0}">${esc(g.source)}</button>`).join("")}</div>
  ${extGroups.map((g, i) => `<ul class="posts" data-gpanel="${i}"${i ? " hidden" : ""}>${g.items.slice(0, 15).map((p) => `<li><a class="tt" href="${esc(p.url)}" target="_blank" rel="noopener nofollow">${esc(p.title)}</a>${p.comments ? `<span class="cc">[${p.comments}]</span>` : ""}<div class="sub">${p.board ? `<span>${esc(p.board)}</span>` : ""}${p.views ? `<span>조회 ${p.views.toLocaleString("ko-KR")}</span>` : ""}${p.votes ? `<span>추천 ${p.votes}</span>` : ""}<span>${esc(g.source)}</span></div></li>`).join("")}</ul>`).join("")}
  <p class="note">제목과 링크만 모아 보여줘요. 원문은 각 커뮤니티에서 확인하세요.</p>` : '<div class="empty">인기글을 모으는 중이에요.</div>';
const boardOff = !(cfg.supabase?.url && cfg.supabase?.anonKey);
const weeklyExt = extGroups.flatMap((g) => g.items.filter((p) => p.views > 0).map((p) => ({ ...p, source: g.source }))).sort((a, b) => b.views - a.views).slice(0, 10);
write("community/index.html", layout({
  title: "커뮤니티", active: "community/", canonical: "community/",
  description: "이번 주 많이 본 글, 코인 커뮤니티 인기글, 자유게시판.",
  body: `${hero((() => {
    const pool = (weeklyExt.length >= 3 ? weeklyExt : [...weeklyExt, ...extGroups.flatMap((g) => g.items.slice(0, 3).map((p) => ({ ...p, source: g.source })))]).slice(0, 3);
    const sl = pool.map((p, k) => ({ art: ["rose-dusk", "smoke", "sage-bands"][k], eye: `This Week · ${esc(p.source)}${p.views ? ` · 조회 ${p.views.toLocaleString("ko-KR")}` : ""}`, title: p.title, dek: "", href: p.url, cta: "원문 보기" }));
    if (sl.length < 2) sl.push({ art: "rose-dusk", eye: "Community", title: "이번 주, 코인 커뮤니티가 가장 많이 본 글", dek: "국내외 커뮤니티 인기글을 매일 모아요.", href: "#ext", cta: "인기글 보기" }, { art: "smoke", eye: "Contact · Telegram", title: "제보와 제휴는 텔레그램으로", dek: `@${cfg.telegram} 로 바로 연락 주세요.`, href: TG || "#", cta: "텔레그램 열기" });
    return sl;
  })(), "sm", "커뮤니티 인기글")}<div class="wrap"><main class="grid"><div class="col">
  <section>
    ${secHead("This Week", "이번 주 많이 본 글", boardOff ? "" : `<a class="btn" href="${u("community/write/")}">글쓰기</a>`)}
    ${boardOff ? (weeklyExt.length ? `<ol class="posts">${weeklyExt.map((p, i) => `<li style="grid-template-columns:36px minmax(0,1fr)"><span class="rk" style="grid-row:span 2">${i + 1}</span><div style="min-width:0"><a class="tt" href="${esc(p.url)}" target="_blank" rel="noopener nofollow">${esc(p.title)}</a>${p.comments ? `<span class="cc">[${p.comments}]</span>` : ""}<div class="sub" style="margin-top:4px"><span>${esc(p.source)}</span><span>조회 ${p.views.toLocaleString("ko-KR")}</span>${p.votes ? `<span>추천 ${p.votes}</span>` : ""}</div></div></li>`).join("")}</ol><p class="note">코인 커뮤니티 개념글·추천글을 조회수 순으로 모았어요. 자유게시판은 오픈 준비 중이에요.</p>` : `<div class="notice-box" style="margin-top:20px"><strong>자유게시판 오픈 준비 중이에요.</strong><br>곧 글쓰기·댓글·추천이 열려요.</div>`) : `<ol class="posts" id="weekly"><li><span class="sub">불러오는 중…</span></li></ol>`}
  </section>
  <section>
    <span id="ext"></span>${secHead("Around the Web", "코인 커뮤니티 인기글", community.updatedAt ? `${hhmm(new Date(community.updatedAt))} 업데이트` : "", "h2")}
    ${extHTML}
  </section>
  ${boardOff ? "" : `<section>
    ${secHead("Board", "자유게시판", `<a class="btn ghost" href="${u("community/write/")}">글쓰기</a>`, "h2")}
    <div class="tabs-row" id="boardTabs">${["전체", ...(cfg.boardCategories || [])].map((c, i) => `<button class="tab" type="button" data-bc="${esc(c)}" aria-pressed="${i === 0}">${esc(c)}</button>`).join("")}</div>
    <ul class="posts" id="board"><li><span class="sub">불러오는 중…</span></li></ul>
    <div class="pager"><button class="btn ghost" type="button" id="morePosts" hidden>더 보기</button></div>
  </section>`}
  </div>${rail()}</main></div>`,
}));
write("community/post/index.html", layout({
  title: "게시글", active: "community/", canonical: null,
  body: `<div class="wrap"><p class="crumbs"><a href="${u("community/")}">Community</a><i class="sep" aria-hidden="true">/</i><span class="here">자유게시판</span></p><main class="single" style="margin-top:20px"><article class="post-view" id="postView"><div class="empty">불러오는 중…</div></article>
  <section id="cmtSec" hidden>
    <div class="block-head" style="border-top:1px solid var(--ink);padding-top:14px;margin-top:20px"><h2>댓글</h2><span class="label" id="cmtCount"></span></div>
    <ul class="cmts" id="cmts"></ul>
    <form class="f" id="cmtForm" style="margin-top:24px">
      <div class="two"><div class="field"><label for="cNick">닉네임</label><input id="cNick" maxlength="20" required></div><div class="field"><label for="cPw">비밀번호 (삭제용)</label><input id="cPw" type="password" minlength="4" maxlength="40" required></div></div>
      <div class="field"><label for="cBody">댓글</label><textarea id="cBody" maxlength="2000" required style="min-height:110px"></textarea></div>
      <div class="msg" id="cMsg"></div>
      <button class="btn" type="submit">댓글 등록</button>
    </form>
  </section></main></div>`,
}));
write("community/write/index.html", layout({
  title: "글쓰기", active: "community/", canonical: null,
  body: `<div class="wrap"><p class="crumbs"><a href="${u("community/")}">Community</a><i class="sep" aria-hidden="true">/</i><span class="here">글쓰기</span></p><main class="single" style="margin-top:20px">
  ${secHead("New Post", "자유게시판 글쓰기")}
  ${boardOff ? '<div class="notice-box" style="margin-top:20px">게시판 오픈 준비 중이에요.</div>' : `<form class="f" id="postForm" style="margin-top:28px">
    <div class="two"><div class="field"><label for="pNick">닉네임</label><input id="pNick" maxlength="20" required></div><div class="field"><label for="pPw">비밀번호 (수정·삭제용)</label><input id="pPw" type="password" minlength="4" maxlength="40" required></div></div>
    <div class="field"><label for="pCat">분류</label><select id="pCat">${(cfg.boardCategories || []).map((c) => `<option>${esc(c)}</option>`).join("")}</select></div>
    <div class="field"><label for="pTitle">제목</label><input id="pTitle" maxlength="100" required></div>
    <div class="field"><label for="pBody">내용</label><textarea id="pBody" maxlength="10000" required></textarea></div>
    <p class="note" style="padding:0">욕설, 홍보·리딩방 유도, 개인정보, 허위 사실은 삭제돼요.</p>
    <div class="msg" id="pMsg"></div>
    <button class="btn" type="submit">등록</button>
  </form>`}
  </main></div>`,
}));

// 문의
write("contact/index.html", layout({
  title: "문의", active: "contact/", canonical: "contact/", float: false,
  description: `제보, 광고, 제휴 문의는 텔레그램 @${cfg.telegram}`,
  body: `<div class="wrap"><main class="single">
  ${secHead("Contact", "제보 · 광고 · 제휴 문의")}
  <div class="contact">
    <div><span class="label">Telegram</span><div class="handle">@${esc(cfg.telegram)}</div></div>
    <p style="margin:0;font-weight:300;max-width:56ch">텔레그램으로 메시지를 보내주시면 확인 후 답변드려요. 아래 버튼이 열리지 않으면 텔레그램에서 <b>@${esc(cfg.telegram)}</b>을 검색하세요.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="${TG}" target="_blank" rel="noopener">텔레그램으로 문의하기</a><button class="btn ghost" type="button" data-copytext="@${esc(cfg.telegram)}">아이디 복사</button></div>
    <div><span class="label">이런 문의를 받아요</span><ul style="margin-top:10px"><li>속보·기사 제보</li><li>광고 및 배너 제휴</li><li>거래소·프로젝트 협업</li><li>기사 정정 요청</li></ul></div>
    ${CH ? CH.contact : ""}
  </div>
  </main></div>`,
}));

// 개인정보처리방침 (웹사이트·앱 공통, 스토어 등록용)
write("privacy/index.html", layout({
  title: "개인정보처리방침 · Privacy Policy", active: "", canonical: "privacy/", float: false,
  description: "체인브리프 웹사이트와 앱의 개인정보처리방침",
  body: `<div class="wrap"><main class="single">
  ${secHead("Privacy", "개인정보처리방침")}
  <div class="prose" style="margin-top:32px">
  <p>체인브리프(CHAINBRIEF, 이하 "서비스")는 웹사이트와 iOS·안드로이드 앱에서 이용자의 개인정보를 최소한으로만 다룹니다. 시행일: 2026년 10월 26일.</p>
  <h2>수집하는 정보</h2>
  <p>앱과 웹사이트는 회원가입이 없으며, 이름·연락처·위치·광고 식별자 등 개인을 알아볼 수 있는 정보를 수집하지 않습니다. 앱에서 고른 언어·화면 모드와 저장한 기사는 이용자의 기기 안에만 저장되고 서버로 전송되지 않습니다.</p>
  <h2>외부 서비스</h2>
  <p>시세와 지표를 보여주기 위해 앱과 웹사이트는 CoinGecko, 업비트, 빗썸, Alternative.me의 공개 API에 직접 접속합니다. 이 과정에서 해당 서비스가 일반적인 접속 기록(IP 주소 등)을 남길 수 있으며, 각 서비스의 정책을 따릅니다. 웹사이트는 GitHub Pages에서 제공되며 글꼴은 Google Fonts에서 불러옵니다.</p>
  <h2>커뮤니티 게시판 (웹사이트)</h2>
  <p>웹사이트 게시판에 글이나 댓글을 쓰면 입력한 닉네임과 내용, 삭제용 비밀번호의 암호화 값, 도배 방지를 위한 접속 IP의 해시 값이 저장됩니다. 이 정보는 게시판 운영에만 쓰이며, 작성자는 언제든 비밀번호로 삭제할 수 있습니다.</p>
  <h2>광고·외부 링크</h2>
  <p>서비스에는 제휴사(BLOCKKEY, Perpline) 배너와 외부 기사 링크가 있습니다. 링크를 누르면 해당 사이트로 이동하며, 그 사이트의 개인정보 정책이 적용됩니다. 서비스는 광고 추적 도구를 쓰지 않습니다.</p>
  <h2>문의</h2>
  <p>개인정보와 관련한 문의는 텔레그램 <a href="${TG}">@${esc(cfg.telegram)}</a>으로 보내주세요.</p>
  <h2>Privacy Policy (English)</h2>
  <p>CHAINBRIEF's website and apps have no accounts and do not collect personal data such as names, contacts, location or advertising identifiers. Language, appearance settings and saved stories stay on your device. To show prices, the app connects directly to the public APIs of CoinGecko, Upbit, Bithumb and Alternative.me, which may log standard connection data under their own policies. Posts on the website's community board store the nickname, content, a hashed deletion password and a hashed IP address used to prevent spam. Partner banners and external links lead to third-party sites with their own policies. We use no ad tracking. Contact: Telegram @${esc(cfg.telegram)}.</p>
  </div>
  </main></div>`,
}));

// 사이트 검색 (기사·속보, public/search.js)
write("search/index.html", layout({
  title: "검색", active: "search/", canonical: "search/", extraScript: "search.js",
  description: `${cfg.name} 기사와 속보 검색`,
  body: writeSearch({ write, articles, flashes, link: u, esc, S: {
    title: "기사·속보 검색", aside: "기사 {a}편 · 속보 {f}건", ph: "코인, 인물, 키워드 (예: 비트코인 ETF)", try: "추천 검색어", all: "전체", arts: "기사", flash: "속보", nojs: "검색은 자바스크립트가 켜져 있어야 동작해요.",
    js: { locale: "ko-KR", tz: KST, art: "기사", fl: "속보", found: "‘{q}’ 검색 결과 {n}건", none: "‘{q}’에 맞는 기사나 속보가 없어요. 다른 낱말로 찾아보세요.", hint: "제목·요약·본문·분류·기자 이름에서 찾아요.", loading: "색인을 불러오는 중…", fail: "검색 색인을 불러오지 못했어요. 새로고침해 주세요." },
  } }),
}));

// 404
write("404.html", layout({ title: "페이지를 찾을 수 없어요", canonical: null, body: `<div class="wrap"><main class="single"><div class="doc"><span class="label">404</span><h1>페이지를 찾을 수 없어요</h1><p class="lede">주소가 바뀌었거나 삭제된 페이지예요.</p><a class="btn" href="${u()}">라이브 속보로</a></div></main></div>` }));

/* ---------- feeds & meta ---------- */
write("flash.json", JSON.stringify(flashes.slice(0, 50).map((f) => ({ id: f.id, title: f.title, time: f.date.toISOString(), important: f.important, category: f.category || "", url: u(`flash/${f.id}/`) }))));
const link = (p) => (SITE_URL ? abs(p) : u(p));
const rssItems = [...flashes.slice(0, 50).map((f) => ({ t: f.title, l: link(`flash/${f.id}/`), d: f.date, s: plain(f.body || "") })),
  ...articles.slice(0, 30).map((a) => ({ t: a.title, l: link(`articles/${a.id}/`), d: a.date, s: a.summary || "" }))].sort((a, b) => b.d - a.d);
write("rss.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${esc(cfg.name)}</title><link>${link("")}</link><description>${esc(cfg.description)}</description><language>ko</language>
${rssItems.map((i) => `<item><title>${esc(i.t)}</title><link>${i.l}</link><guid>${i.l}</guid><pubDate>${i.d.toUTCString()}</pubDate><description>${esc(i.s)}</description></item>`).join("\n")}
</channel></rss>`);
if (SITE_URL) {
  const urls = ["", "listings/", "surge/", "news/", "community/", "market/", "contact/", "authors/", ...(cfg.reporters || []).map((r) => `authors/${r.slug}/`), "privacy/", ...catList.map(([c]) => `category/${catSlug(c)}/`), ...articles.map((a) => `articles/${a.id}/`), ...flashes.slice(0, 500).map((f) => `flash/${f.id}/`)];
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((p) => `<url><loc>${abs(p)}</loc></url>`).join("")}</urlset>`);
  write("robots.txt", `User-agent: *\nAllow: /\nDisallow: ${u("community/write/")}\nSitemap: ${abs("sitemap.xml")}\n`);
} else write("robots.txt", "User-agent: *\nAllow: /\n");
const PUBLIC_ORIGIN = SITE_URL || "https://probe2928-crypto.github.io";
writeAppFeed({ write, lang: "ko", flashes, articles, markdown, now: NOW, link: (p) => PUBLIC_ORIGIN + u(p), artOf: (a, i) => ART[a.category] || ART_POOL[i % ART_POOL.length] });
write("api/config.json", JSON.stringify({ updated: NOW.toISOString(), artV: ART_V, telegram: cfg.telegram, coins: cfg.coins, ads: (cfg.ads || []).map(({ id, wordmark, url, title, short, text, cta, note }) => ({ id, wordmark, url, title, short, text, cta, note })) }));
write("listings.json", JSON.stringify(lsItems.slice(0, 200).map(({ date, ...i }) => i)));
write("manifest.webmanifest", JSON.stringify({
  name: `${cfg.nameEn} ${cfg.name}`, short_name: cfg.nameEn, description: cfg.description, lang: "ko",
  start_url: BASE, scope: BASE, display: "standalone", background_color: "#0A0A0A", theme_color: "#0A0A0A",
  icons: [
    { src: u("icons/icon-192.png"), sizes: "192x192", type: "image/png" },
    { src: u("icons/icon-512.png"), sizes: "512x512", type: "image/png" },
    { src: u("icons/icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2));
write("sw.js", fs.readFileSync(path.join(ROOT, "public/sw.js"), "utf8").replace("__BUILD__", BUILD_ID).replace("__BASE__", BASE));
write(".nojekyll", "");
if (cfg.domain) write("CNAME", cfg.domain + "\n");

console.log(`빌드 완료 → dist/ (속보 ${flashes.length}, 기사 ${articles.length}, 헤드라인 ${hlItems.length}, 상장 ${lsItems.length}, 커뮤니티 ${extGroups.length}그룹, base ${BASE})`);
