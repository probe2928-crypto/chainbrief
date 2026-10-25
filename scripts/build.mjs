// 정적 사이트 빌드: content/ + data/ → dist/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { markdown } from "./lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));

let BASE = process.env.BASE_PATH || "/";
if (!BASE.endsWith("/")) BASE += "/";
const SITE_URL = (cfg.domain ? `https://${cfg.domain}` : (process.env.SITE_URL || "")).replace(/\/$/, "");
const abs = (p) => SITE_URL + BASE + p.replace(/^\//, "");
const u = (p = "") => BASE + p.replace(/^\//, "");

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
    let v = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (v === "true") v = true; else if (v === "false") v = false;
    data[k] = v;
  }
  return { data, body: m[2].trim() };
}
const KST = "Asia/Seoul";
const fmt = (d, o) => new Intl.DateTimeFormat("ko-KR", { timeZone: KST, ...o }).format(d);
const hhmm = (d) => fmt(d, { hour: "2-digit", minute: "2-digit", hour12: false });
const dayLabel = (d) => fmt(d, { year: "numeric", month: "long", day: "numeric", weekday: "long" });
const dayKey = (d) => fmt(d, { year: "numeric", month: "2-digit", day: "2-digit" });
const fullDate = (d) => fmt(d, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const plain = (md) => md.replace(/[#>*_`\[\]()!-]/g, "").replace(/\s+/g, " ").trim();
function write(rel, content) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}
function readDir(dir) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith(".md")).map((f) => {
    const { data, body } = frontmatter(fs.readFileSync(path.join(d, f), "utf8"));
    return { id: f.replace(/\.md$/, ""), ...data, body };
  }).filter((x) => !x.draft);
}

/* ---------- content ---------- */
const flashes = readDir("content/flash")
  .map((f) => ({ ...f, date: new Date(f.time), important: f.important === true }))
  .filter((f) => !isNaN(f.date) && f.date <= new Date(Date.now() + 60_000))
  .sort((a, b) => b.date - a.date);
const articles = readDir("content/articles")
  .map((a) => ({ ...a, date: new Date(a.date) }))
  .filter((a) => !isNaN(a.date))
  .sort((a, b) => b.date - a.date);
const terms = JSON.parse(fs.readFileSync(path.join(ROOT, "content/terms.json"), "utf8"));
let headlines = { updatedAt: null, items: [] };
try { headlines = JSON.parse(fs.readFileSync(path.join(ROOT, "data/headlines.json"), "utf8")); } catch {}
const hlItems = (headlines.items || []).map((h) => ({ ...h, date: new Date(h.time) }));

/* ---------- partials ---------- */
const NAV = [
  ["", "라이브 속보", "속보", '<path d="M4 12h3l3-7 4 14 3-7h3"/>'],
  ["news/", "뉴스", "뉴스", '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>'],
  ["market/", "시세", "시세", '<path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/>'],
  ["terms/", "용어사전", "용어", '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'],
];

function layout({ title, description = cfg.description, active = "", body, canonical = "", type = "website", jsonld = "" }) {
  const full = title ? `${title} | ${cfg.name}` : `${cfg.name} - ${cfg.tagline}`;
  const tape = cfg.coins.slice(0, 6).map((c) => `<span data-tape="${c.id}"><span class="sym">${c.symbol}</span><span class="num p">—</span> <span class="num c"></span></span>`).join("");
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${canonical && SITE_URL ? `<link rel="canonical" href="${abs(canonical)}">` : ""}
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(cfg.name)}">
<meta property="og:title" content="${esc(title || cfg.name)}">
<meta property="og:description" content="${esc(description)}">
${SITE_URL ? `<meta property="og:url" content="${abs(canonical)}"><meta property="og:image" content="${abs("og.png")}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0B7A6E">
<link rel="manifest" href="${u("manifest.webmanifest")}">
<link rel="icon" href="${u("icons/icon.svg")}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${u("icons/apple-touch-icon.png")}">
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.name)} 속보" href="${u("rss.xml")}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${u("style.css")}?v=${BUILD_ID}">
${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ""}
</head>
<body data-base="${BASE}">
<header class="site-header">
  <div class="wrap mast">
    <a class="logo" href="${u()}"><b>C</b>${esc(cfg.name)}</a>
    <nav class="top" aria-label="주 메뉴">${NAV.map(([p, l]) => `<a href="${u(p)}"${active === p ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
    <div class="spacer"></div>
    <button class="install" id="installBtn" type="button" hidden>앱 설치</button>
    <div class="live"><i></i>LIVE <span class="num" id="clock">${hhmm(new Date())}</span> KST</div>
  </div>
  <div class="tape" aria-label="실시간 시세"><div class="wrap">${tape}</div></div>
</header>
${body}
<footer class="site-footer"><div class="wrap">
  <div><strong>${esc(cfg.name)}</strong> · ${esc(cfg.tagline)}</div>
  <div class="legal">
    ${cfg.footer.company ? `<span>${esc(cfg.footer.company)}</span>` : ""}
    ${cfg.footer.registration ? `<span>등록번호 ${esc(cfg.footer.registration)}</span>` : ""}
    ${cfg.footer.publisher ? `<span>발행·편집인 ${esc(cfg.footer.publisher)}</span>` : ""}
    ${cfg.footer.email ? `<span>${esc(cfg.footer.email)}</span>` : ""}
    ${cfg.telegram ? `<a href="https://t.me/${esc(cfg.telegram.replace(/^@/, ""))}" target="_blank" rel="noopener">텔레그램 ${esc(cfg.telegram)}</a>` : ""}
    <a href="${u("rss.xml")}">RSS</a>
  </div>
  <div>${esc(cfg.name)}가 제공하는 정보는 투자 권유가 아니며, 투자 판단과 책임은 이용자 본인에게 있습니다. 해외 뉴스 헤드라인의 저작권은 각 매체에 있습니다.</div>
  <div>시세 데이터: CoinGecko, 업비트 · 공포·탐욕 지수: Alternative.me</div>
</div></footer>
<nav class="tabs" aria-label="하단 메뉴">${NAV.map(([p, , s, icon]) => `<a href="${u(p)}"${active === p ? ' aria-current="page"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>${s}</a>`).join("")}</nav>
<script>window.CB=${JSON.stringify({ base: BASE, coins: cfg.coins, latest: flashes[0]?.id || "" })}</script>
<script src="${u("app.js")}?v=${BUILD_ID}" defer></script>
</body>
</html>`;
}

function flashItem(f) {
  return `<article class="item${f.important ? " imp" : ""}" data-cat="${esc(f.category || "")}" data-imp="${f.important ? 1 : 0}">
  <time class="num" datetime="${f.date.toISOString()}">${hhmm(f.date)}</time>
  <div style="min-width:0">
    <h3><a href="${u(`flash/${f.id}/`)}">${esc(f.title)}</a></h3>
    ${f.body ? `<div class="body">${markdown(f.body)}</div>` : ""}
    <div class="meta">${f.important ? '<span class="badge-imp">중요</span>' : ""}${f.category ? `<span class="cat">${esc(f.category)}</span>` : ""}</div>
  </div>
</article>`;
}
function feedHTML(list) {
  if (!list.length) return `<div class="empty">첫 속보를 준비하고 있어요.</div>`;
  let out = "", last = "";
  for (const f of list) {
    const k = dayKey(f.date);
    if (k !== last) { out += `<div class="day" data-day>${dayLabel(f.date)}</div>`; last = k; }
    out += flashItem(f);
  }
  return out;
}
function headlineList(items) {
  if (!items.length) return `<div class="empty">해외 헤드라인을 불러오는 중이에요. 다음 업데이트 때 채워져요.</div>`;
  return `<ul class="hl">${items.map((h) => `<li>
    <a href="${esc(h.url)}" target="_blank" rel="noopener nofollow">${esc(h.titleKo || h.title)}</a>
    ${h.titleKo ? `<span class="orig">${esc(h.title)}</span>` : ""}
    <span class="src"><b>${esc(h.source)}</b><time class="num" data-rel="${h.date.toISOString()}">${fmt(h.date, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}</time></span>
  </li>`).join("")}</ul>`;
}
const marketRail = `<section class="panel desk-only">
  <div class="phead"><h2>주요 시세</h2><span class="aside">USD · 24시간</span></div>
  <table><thead><tr><th>코인</th><th>가격</th><th>24h</th></tr></thead><tbody>
  ${cfg.coins.slice(0, 6).map((c) => `<tr data-row="${c.id}"><td><span class="sym">${c.symbol}</span><span class="name">${esc(c.name)}</span></td><td class="num p">—</td><td class="num c"></td></tr>`).join("")}
  </tbody></table>
  <a class="more" href="${u("market/")}">전체 시세 · 김프 보기</a>
</section>`;
const sentiment = `<section class="panel">
  <div class="phead"><h2>공포·탐욕 지수</h2><span class="aside">0 ~ 100</span></div>
  <div class="gauge">
    <div class="row"><span class="big num" id="fngVal">—</span><span class="lbl" id="fngLbl"></span><span class="aside" id="fngPrev" style="margin-left:auto;font-size:12px;color:var(--muted)"></span></div>
    <div class="bar"><i id="fngBar" style="left:50%"></i></div>
    <div class="scale"><span>극단적 공포</span><span>중립</span><span>극단적 탐욕</span></div>
  </div>
  <div class="kp">
    <div><small>BTC 김치프리미엄</small><strong class="num" id="kimpBtc">—</strong></div>
    <div><small>BTC 도미넌스</small><strong class="num" id="btcDom">—</strong></div>
  </div>
</section>`;
const partner = cfg.partner ? `<section class="panel slot">
  <small>${esc(cfg.partner.label)}</small>
  <strong>${esc(cfg.partner.title)}</strong>
  <span>${esc(cfg.partner.text)}</span>
  ${cfg.partner.url ? `<a class="btn" href="${esc(cfg.partner.url)}" target="_blank" rel="noopener sponsored">${esc(cfg.partner.button)}</a>` : ""}
</section>` : "";
const rail = (extra = "") => `<aside>${marketRail}${sentiment}${extra}${partner}</aside>`;

/* ---------- pages ---------- */
const BUILD_ID = Date.now().toString(36);
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, "public"), OUT, { recursive: true });

// 홈: 라이브 속보
const cats = ["전체", "중요", ...cfg.categories];
const latestHL = hlItems.slice(0, 8);
write("index.html", layout({
  active: "", canonical: "",
  body: `<div class="wrap"><main class="grid">
  <div class="col">
    <section class="panel">
      <div class="phead"><h1 class="ph">라이브 속보</h1><label class="search"><span class="sr">속보 검색</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" type="search" placeholder="속보 검색"></label></div>
      <div class="filters" id="filters" role="toolbar" aria-label="분류">${cats.map((c, i) => `<button class="chip${c === "중요" ? " hot" : ""}" type="button" data-c="${esc(c)}" aria-pressed="${i === 0}">${esc(c)}</button>`).join("")}</div>
      <div id="newWrap" hidden><button class="newpill" id="newBtn" type="button">새 속보 보기</button></div>
      <div id="feed">${feedHTML(flashes.slice(0, 150))}</div>
      <div class="empty" id="noMatch" hidden>조건에 맞는 속보가 없어요. 분류나 검색어를 바꿔보세요.</div>
    </section>
  </div>
  ${rail(`<section class="panel"><div class="phead"><h2>해외 주요 헤드라인</h2><span class="aside">자동 수집</span></div>${headlineList(latestHL)}<a class="more" href="${u("news/")}">헤드라인 더 보기</a></section>`)}
</main></div>`,
}));

// 속보 상세
flashes.forEach((f, i) => {
  const prev = flashes[i + 1], next = flashes[i - 1];
  write(`flash/${f.id}/index.html`, layout({
    title: f.title, description: plain(f.body || f.title).slice(0, 150), active: "", canonical: `flash/${f.id}/`, type: "article",
    jsonld: JSON.stringify({ "@context": "https://schema.org", "@type": "NewsArticle", headline: f.title, datePublished: f.date.toISOString(), publisher: { "@type": "Organization", name: cfg.name } }),
    body: `<div class="wrap"><p class="crumbs"><a href="${u()}">라이브 속보</a> › ${esc(f.category || "속보")}</p><main class="grid">
    <div class="col"><article class="panel doc flash${f.important ? " imp" : ""}">
      <div class="kicker">${f.important ? '<span class="badge-imp">중요</span>' : ""}${f.category ? `<span class="cat">${esc(f.category)}</span>` : ""}<time class="num" datetime="${f.date.toISOString()}">${fullDate(f.date)}</time></div>
      <h1>${esc(f.title)}</h1>
      <div class="prose">${markdown(f.body || "")}</div>
      <div class="share"><button class="btn ghost" type="button" data-copy>링크 복사</button><a class="btn ghost" href="${u()}">속보 목록</a></div>
    </article>
    <section class="panel"><div class="phead"><h2>이어지는 속보</h2></div>${[next, prev].filter(Boolean).map(flashItem).join("") || '<div class="empty">다른 속보가 아직 없어요.</div>'}</section>
    </div>${rail()}</main></div>`,
  }));
});

// 뉴스: 자체 기사 + 해외 헤드라인
const sources = [...new Set(hlItems.map((h) => h.source))];
write("news/index.html", layout({
  title: "뉴스", active: "news/", canonical: "news/",
  body: `<div class="wrap"><main class="grid"><div class="col">
  ${articles.length ? `<section class="panel"><div class="phead"><h1 class="ph">${esc(cfg.name)} 기사</h1><span class="aside">분석 · 가이드</span></div>
    ${articles.map((a) => `<a class="art" href="${u(`articles/${a.id}/`)}"><div style="min-width:0"><div class="meta" style="margin:0 0 6px"><span class="cat">${esc(a.category || "기사")}</span><time class="num">${fmt(a.date, { month: "long", day: "numeric" })}</time></div><h3>${esc(a.title)}</h3><p>${esc(a.summary || plain(a.body).slice(0, 120))}</p></div><div class="thumb" aria-hidden="true">${esc((a.category || "NEWS").slice(0, 4))}</div></a>`).join("")}
  </section>` : ""}
  <section class="panel">
    <div class="phead"><h2>해외 주요 헤드라인</h2><span class="aside">${headlines.updatedAt ? `${hhmm(new Date(headlines.updatedAt))} 업데이트` : "15분마다 업데이트"}</span></div>
    ${sources.length > 1 ? `<div class="filters" id="srcFilters">${["전체", ...sources].map((s, i) => `<button class="chip" type="button" data-src="${esc(s)}" aria-pressed="${i === 0}">${esc(s)}</button>`).join("")}</div>` : ""}
    <div id="hlList">${headlineList(hlItems.slice(0, 80))}</div>
  </section>
  </div>${rail()}</main></div>`,
}));

// 기사 상세
articles.forEach((a) => {
  write(`articles/${a.id}/index.html`, layout({
    title: a.title, description: a.summary || plain(a.body).slice(0, 150), active: "news/", canonical: `articles/${a.id}/`, type: "article",
    jsonld: JSON.stringify({ "@context": "https://schema.org", "@type": "NewsArticle", headline: a.title, description: a.summary, datePublished: a.date.toISOString(), publisher: { "@type": "Organization", name: cfg.name } }),
    body: `<div class="wrap"><p class="crumbs"><a href="${u("news/")}">뉴스</a> › ${esc(a.category || "기사")}</p><main class="grid"><div class="col">
    <article class="panel doc"><div class="kicker"><span class="cat">${esc(a.category || "기사")}</span><time class="num" datetime="${a.date.toISOString()}">${fullDate(a.date)}</time></div>
      <h1>${esc(a.title)}</h1>${a.summary ? `<p class="lede">${esc(a.summary)}</p>` : ""}
      <div class="prose">${markdown(a.body)}</div>
      <div class="share"><button class="btn ghost" type="button" data-copy>링크 복사</button></div>
    </article></div>${rail()}</main></div>`,
  }));
});

// 시세
write("market/index.html", layout({
  title: "실시간 시세 · 김치프리미엄", active: "market/", canonical: "market/",
  description: "비트코인·이더리움 등 주요 코인의 실시간 달러·원화 시세와 업비트 김치프리미엄.",
  body: `<div class="wrap"><main class="grid"><div class="col">
  <section class="panel">
    <div class="phead"><h1 class="ph">실시간 시세</h1><span class="aside" id="mktUpdated">불러오는 중…</span></div>
    <div class="wide"><table class="mkt-full"><thead><tr><th>코인</th><th>가격(USD)</th><th>업비트(KRW)</th><th>24시간</th><th>김프</th><th>거래대금(24h)</th></tr></thead><tbody>
    ${cfg.coins.map((c) => `<tr data-row="${c.id}"><td><span class="sym">${c.symbol}</span><span class="name">${esc(c.name)}</span></td><td class="num p">—</td><td class="num krw">—</td><td class="num c"></td><td class="num kimp">—</td><td class="num vol">—</td></tr>`).join("")}
    </tbody></table></div>
    <div class="note">김프 = 업비트 원화 가격 ÷ (글로벌 달러 가격 × 환율) − 1. 1분마다 갱신돼요.</div>
  </section></div>
  <aside>${sentiment}${partner}</aside></main></div>`,
}));

// 용어사전
write("terms/index.html", layout({
  title: "코인 용어사전", active: "terms/", canonical: "terms/",
  description: "김치프리미엄, 펀딩비, 미결제약정 등 코인 투자 용어를 쉽게 정리했어요.",
  body: `<div class="wrap"><main class="grid"><div class="col"><section class="panel">
    <div class="phead"><h1 class="ph">코인 용어사전</h1><label class="search"><span class="sr">용어 검색</span><input id="tq" type="search" placeholder="용어 검색"></label></div>
    <dl class="terms" id="terms">${terms.map(([k, en, d]) => `<div class="term" id="${encodeURIComponent(k)}"><dt>${esc(k)}<span>${esc(en)}</span></dt><dd>${esc(d)}</dd></div>`).join("")}</dl>
    <div class="empty" id="noTerm" hidden>찾는 용어가 없어요.</div>
  </section></div>${rail()}</main></div>`,
}));

// 404
write("404.html", layout({ title: "페이지를 찾을 수 없어요", body: `<div class="wrap"><main class="grid"><div class="col"><section class="panel doc"><h1>페이지를 찾을 수 없어요</h1><p class="lede">주소가 바뀌었거나 삭제된 페이지예요.</p><a class="btn" href="${u()}">라이브 속보로 가기</a></section></div></main></div>` }));

/* ---------- feeds & meta ---------- */
write("flash.json", JSON.stringify(flashes.slice(0, 50).map((f) => ({ id: f.id, title: f.title, time: f.date.toISOString(), important: f.important, category: f.category || "", url: u(`flash/${f.id}/`) }))));

const link = (p) => (SITE_URL ? abs(p) : u(p));
const rssItems = [...flashes.slice(0, 50).map((f) => ({ t: f.title, l: link(`flash/${f.id}/`), d: f.date, s: plain(f.body || "") })),
  ...articles.map((a) => ({ t: a.title, l: link(`articles/${a.id}/`), d: a.date, s: a.summary || "" }))].sort((a, b) => b.d - a.d);
write("rss.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${esc(cfg.name)}</title><link>${link("")}</link><description>${esc(cfg.description)}</description><language>ko</language>
${rssItems.map((i) => `<item><title>${esc(i.t)}</title><link>${i.l}</link><guid>${i.l}</guid><pubDate>${i.d.toUTCString()}</pubDate><description>${esc(i.s)}</description></item>`).join("\n")}
</channel></rss>`);

if (SITE_URL) {
  const urls = ["", "news/", "market/", "terms/", ...flashes.map((f) => `flash/${f.id}/`), ...articles.map((a) => `articles/${a.id}/`)];
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((p) => `<url><loc>${abs(p)}</loc></url>`).join("")}</urlset>`);
  write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${abs("sitemap.xml")}\n`);
} else {
  write("robots.txt", `User-agent: *\nAllow: /\n`);
}

write("manifest.webmanifest", JSON.stringify({
  name: cfg.name, short_name: cfg.name, description: cfg.description, lang: "ko",
  start_url: BASE, scope: BASE, display: "standalone", background_color: "#F2F4F6", theme_color: "#0B7A6E",
  icons: [
    { src: u("icons/icon-192.png"), sizes: "192x192", type: "image/png" },
    { src: u("icons/icon-512.png"), sizes: "512x512", type: "image/png" },
    { src: u("icons/icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2));
const sw = fs.readFileSync(path.join(ROOT, "public/sw.js"), "utf8").replace("__BUILD__", BUILD_ID).replace("__BASE__", BASE);
write("sw.js", sw);
write(".nojekyll", "");
if (cfg.domain) write("CNAME", cfg.domain + "\n");

console.log(`빌드 완료 → dist/  (속보 ${flashes.length}, 기사 ${articles.length}, 헤드라인 ${hlItems.length}, base ${BASE})`);
