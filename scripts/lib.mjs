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
