// 외부 패키지 없이 쓰는 작은 도우미: 마크다운 → HTML, RSS/Atom 파서

const escHTML = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function inline(s) {
  return escHTML(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, h) => `<a href="${h}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
}

/** 기사·속보에 필요한 만큼의 마크다운: 제목(##, ###), 문단, 목록, 인용, 굵게/기울임, 링크, 이미지, 인라인 코드 */
export function markdown(src = "") {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) {
      const n = Math.max(2, m[1].length);
      out.push(`<h${n}>${inline(m[2])}</h${n}>`); i++; continue;
    }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${markdown(buf.join("\n"))}</blockquote>`); continue;
    }
    if (/^\s*[-*]\s+/.test(l)) {
      const buf = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ""))}</li>`);
      out.push(`<ul>${buf.join("")}</ul>`); continue;
    }
    if (/^\s*\d+[.)]\s+/.test(l)) {
      const buf = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(/^\s*\d+[.)]\s+/, ""))}</li>`);
      out.push(`<ol>${buf.join("")}</ol>`); continue;
    }
    if (/^(---|\*\*\*)\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${buf.map(inline).join("<br>")}</p>`);
  }
  return out.join("\n");
}

/* ---------- RSS / Atom ---------- */
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };
export function decodeEntities(s = "") {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
    if (e[0] === "#") { const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isNaN(n) ? all : String.fromCodePoint(n); }
    return ENT[e.toLowerCase()] ?? all;
  });
}
function tag(block, names) {
  for (const n of names) {
    const re = new RegExp(`<${n}(\\s[^>]*)?>([\\s\\S]*?)</${n}>`, "i");
    const m = block.match(re);
    if (m) {
      let v = m[2].trim();
      const cd = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
      v = cd ? cd[1] : decodeEntities(v);
      return v.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    }
  }
  return "";
}
/** RSS 2.0 / RDF / Atom 피드에서 {title, link, date} 목록 추출 */
export function parseFeed(xml = "") {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.map((b) => {
    let link = tag(b, ["link"]);
    if (!link) {
      const alt = b.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) || b.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = alt ? decodeEntities(alt[1]) : "";
    }
    if (!/^https?:/.test(link)) link = tag(b, ["guid", "id"]);
    return { title: decodeEntities(tag(b, ["title"])), link, date: new Date(tag(b, ["pubDate", "published", "updated", "dc:date"])) };
  });
}

// 한글·한자가 들어간 라벨에는 cjk 클래스를 붙여 자간을 좁힌다 (영문 대문자 라벨용 넓은 자간이 한글을 띄엄띄엄 만들지 않게)
const CJK = /[ᄀ-ᇿ㄰-㆏가-힯぀-ヿ㐀-鿿]/;
export function cjkify(html) {
  return html.replace(/<([a-z][a-z0-9]*)([^>]*?)\sclass="([^"]*)"([^>]*)>([^<]*)/gi, (m, tag, pre, cls, post, text) =>
    CJK.test(text) && !/\bcjk\b/.test(cls) ? `<${tag}${pre} class="${cls} cjk"${post}>${text}` : m);
}
// 클래스 없는 짧은 UI 요소(표 머리, 언어 스위치, 탭, 작은 글씨)에도 .cjk — 자간·최소 크기 규칙이 닿게
const BARE = /<(a|span|small|th|button|label|b|strong)((?:\s(?![^>]*\bclass=)[^>]*)?)>([^<]*)/gi;
export function cjkifyBare(html) {
  return html.replace(BARE, (m, tag, attrs, text) => (CJK.test(text) && !/\bclass=/.test(attrs) ? `<${tag}${attrs} class="cjk">${text}` : m));
}

// 앱용 데이터 피드: api/<lang>/feed.json + api/<lang>/a/<id>.json
export function writeAppFeed({ write, lang, flashes, articles, artOf, markdown, link, now }) {
  const plain = (md = "") => md.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`]/g, "").replace(/\s+/g, " ").trim();
  write(`api/${lang}/feed.json`, JSON.stringify({
    updated: now.toISOString(),
    flash: flashes.slice(0, 150).map((f) => ({ id: f.id, title: f.title, time: f.date.toISOString(), important: !!f.important, category: f.category || "", body: markdown(f.body || ""), link: link(`flash/${f.id}/`) })),
    articles: articles.slice(0, 80).map((a, i) => ({ id: a.id, title: a.title, summary: a.summary || plain(a.body).slice(0, 140), date: a.date.toISOString(), author: a.author || "", category: a.category || "", format: a.format || "", region: a.region || "", art: artOf(a, i), link: link(`articles/${a.id}/`) })),
  }));
  for (const a of articles.slice(0, 80)) write(`api/${lang}/a/${a.id}.json`, JSON.stringify({ id: a.id, html: markdown(a.body || "") }));
}

// 사이트 검색: search.json(기사·속보 색인) + /search/ 본문 — KO·EN·ZH 공용
export const SEARCH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';
export function writeSearch({ write, prefix = "", articles, flashes, link, esc, S }) {
  const plain = (md = "") => md.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`|]/g, "").replace(/\s+/g, " ").trim();
  const idx = [
    ...articles.slice(0, 400).map((a) => ({ k: "a", t: a.title, s: (a.summary || plain(a.body)).slice(0, 180), x: plain(a.body).slice(0, 800), c: a.category || "", w: a.author || "", d: a.date.toISOString(), u: link(`articles/${a.id}/`) })),
    ...flashes.slice(0, 600).map((f) => ({ k: "f", t: f.title, s: plain(f.body || "").slice(0, 160), x: "", c: f.category || "", w: "", d: f.date.toISOString(), u: link(`flash/${f.id}/`) })),
  ];
  write(`${prefix}search.json`, JSON.stringify(idx));
  const cats = [...new Set([...articles, ...flashes].map((x) => x.category).filter(Boolean))].slice(0, 8);
  return `<div class="wrap"><main class="single search-page" data-search data-index="${esc(link("search.json"))}" data-i18n="${esc(JSON.stringify(S.js))}">
  <div class="sec"><div><span class="label">Search</span><h1>${esc(S.title)}</h1></div><div class="aside">${esc(S.aside.replace("{a}", articles.length).replace("{f}", flashes.length))}</div></div>
  <form class="sbox" role="search" action="" method="get"><label class="sr" for="sq">${esc(S.title)}</label>${SEARCH_SVG}<input id="sq" name="q" type="search" autocomplete="off" enterkeyhint="search" placeholder="${esc(S.ph)}"><kbd class="sk" aria-hidden="true">/</kbd></form>
  ${cats.length ? `<div class="schips" aria-label="${esc(S.try)}"><span class="label">${esc(S.try)}</span>${cats.map((c) => `<button class="schip" type="button" data-q="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
  <div class="tabs-row" id="sTabs" hidden>${[["", S.all], ["a", S.arts], ["f", S.flash]].map(([k, l], i) => `<button class="tab" type="button" data-k="${k}" aria-pressed="${i === 0}">${esc(l)} <span class="num sc" data-n="${k}"></span></button>`).join("")}</div>
  <p class="sstat" id="sStat" aria-live="polite"></p>
  <ol class="sres" id="sRes"></ol>
  <noscript><p class="empty">${esc(S.nojs)}</p></noscript>
  </main></div>`;
}

/** 제목·요약의 곧은 따옴표(' ")를 인쇄용 둥근 따옴표(‘’ “”)로 — 앞이 공백·여는 괄호·줄임표면 여는 따옴표 */
export function smartQuotes(s) {
  if (typeof s !== "string" || !/['"]/.test(s)) return s;
  return s.replace(/['"]/g, (q, i) => {
    const p = i ? s[i - 1] : "";
    const open = !p || /[\s([{“‘—–…·/:]/.test(p);
    return q === "'" ? (open ? "‘" : "’") : (open ? "“" : "”");
  });
}
