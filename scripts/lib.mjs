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
