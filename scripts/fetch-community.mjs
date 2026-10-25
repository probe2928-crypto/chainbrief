// 코인 커뮤니티 인기글 수집 → data/community.json
// 제목·출처·링크·댓글 수만 저장해요. 본문은 가져오지 않아요(저작권·이용약관).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeed, decodeEntities } from "./lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const OUT = path.join(ROOT, "data/community.json");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8" };

async function text(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}
const strip = (s) => decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

// 코인판(XE 게시판) 목록: <tr> 안의 td.title 첫 링크 = 글, 그 뒤 #comment 링크의 숫자 = 댓글 수
function coinpan(html, src) {
  const base = new URL(src.url).origin;
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  const out = [];
  for (const r of rows) {
    if (/class="notice/.test(r)) continue;
    const td = r.match(/<td class="title">([\s\S]*?)<\/td>/);
    if (!td) continue;
    const a = td[1].match(/<a href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!a) continue;
    const title = strip(a[2]);
    if (title.length < 2) continue;
    const cm = td[1].match(/#comment"[^>]*>\s*<span class="number">\s*(\d+)/);
    const board = r.match(/<span class="mid">[\s\S]*?<strong>([\s\S]*?)<\/strong>/);
    const date = r.match(/<td class="time">[\s\S]*?(\d{4}\.\d{2}\.\d{2}|\d{2}:\d{2})/);
    const views = r.match(/<td class="readed">[\s\S]*?<span class="number">\s*(\d+)/);
    const votes = r.match(/<td class="voted">[\s\S]*?<span class="number">\s*(\d+)/);
    out.push({
      title, url: new URL(a[1], base).href, source: src.name, lang: src.lang,
      board: board ? strip(board[1]) : "", comments: cm ? +cm[1] : 0,
      views: views ? +views[1] : 0, votes: votes ? +votes[1] : 0,
      date: date ? date[1] : "",
    });
  }
  return out;
}
function rss(xml, src) {
  return parseFeed(xml).filter((i) => i.title && /^https?:/.test(i.link)).map((i) => ({
    title: i.title, url: i.link, source: src.name, lang: src.lang, board: "", comments: 0,
    date: isNaN(i.date) ? "" : i.date.toISOString(),
  }));
}

const groups = [];
for (const src of cfg.communitySources || []) {
  try {
    const body = await text(src.url);
    const items = (src.kind === "coinpan" ? coinpan(body, src) : rss(body, src)).slice(0, 30);
    if (!items.length) throw new Error("글을 찾지 못함");
    groups.push({ source: src.name, url: src.url, lang: src.lang, items });
    console.log(`✓ ${src.name}: ${items.length}`);
  } catch (e) { console.warn(`✗ ${src.name}: ${e.message}`); }
}

if (!groups.length) { console.warn("수집 실패 — 기존 파일 유지"); process.exit(0); }
// 일부만 실패하면 이전 데이터로 채움
try {
  const old = JSON.parse(fs.readFileSync(OUT, "utf8"));
  for (const g of old.groups || []) if (!groups.some((x) => x.source === g.source)) groups.push({ ...g, stale: true });
} catch {}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), groups }));
console.log(`커뮤니티 인기글 ${groups.reduce((n, g) => n + g.items.length, 0)}건 저장`);
