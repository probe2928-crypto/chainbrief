// 해외·국내 코인 뉴스 RSS에서 헤드라인(제목·매체·시간·링크)만 수집 → data/headlines.json
// 본문은 저장하지 않아요(저작권). ANTHROPIC_API_KEY가 있으면 영문 제목을 한국어로 번역해요.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeed } from "./lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const OUT = path.join(ROOT, "data/headlines.json");
const CACHE = path.join(ROOT, "data/translations.json");
const MAX_AGE_H = 48, MAX_ITEMS = 150;

async function fetchSource(src) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(src.url, { signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; ChainBriefBot/1.0; +https://github.com)", Accept: "application/rss+xml, application/xml, text/xml, */*" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const items = parseFeed(await r.text())
      .filter((i) => i.title && /^https?:\/\//.test(i.link) && !isNaN(i.date))
      .map((i) => ({ title: i.title, url: i.link, source: src.name, lang: src.lang, time: i.date.toISOString() }));
    console.log(`✓ ${src.name}: ${items.length}`);
    return items;
  } catch (e) {
    console.warn(`✗ ${src.name}: ${e.message}`);
    return [];
  } finally { clearTimeout(t); }
}

async function translate(items) {
  const key = process.env.ANTHROPIC_API_KEY;
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch {}
  if (key) {
    const todo = items.filter((i) => i.lang !== "ko" && !cache[i.url]).slice(0, 60);
    if (todo.length) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: process.env.TRANSLATE_MODEL || "claude-haiku-5-5",
            max_tokens: 4000,
            messages: [{ role: "user", content: `다음 암호화폐 뉴스 영문 헤드라인을 한국 코인 투자자가 읽기 자연스러운 한국어 기사 제목으로 번역해 줘. 코인 티커(BTC, ETH 등)와 고유명사는 원문 표기를 유지해. 입력과 같은 순서의 JSON 문자열 배열만 출력해.\n\n${JSON.stringify(todo.map((t) => t.title))}` }],
          }),
        });
        const j = await r.json();
        const out = JSON.parse((j.content?.[0]?.text || "[]").replace(/^```(json)?|```$/g, "").trim());
        todo.forEach((t, i) => { if (typeof out[i] === "string" && out[i].trim()) cache[t.url] = out[i].trim(); });
        console.log(`번역: ${Object.keys(cache).length}건 캐시`);
      } catch (e) { console.warn("번역 실패:", e.message); }
    }
  }
  const keep = new Set(items.map((i) => i.url));
  for (const k of Object.keys(cache)) if (!keep.has(k)) delete cache[k];
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  return items.map((i) => (cache[i.url] ? { ...i, titleKo: cache[i.url] } : i));
}

const all = (await Promise.all(cfg.newsSources.map(fetchSource))).flat();
const cutoff = Date.now() - MAX_AGE_H * 3600e3;
const seen = new Set();
let items = all
  .filter((i) => new Date(i.time) >= cutoff && new Date(i.time) <= Date.now() + 3600e3)
  .sort((a, b) => new Date(b.time) - new Date(a.time))
  .filter((i) => { const k = i.url.split("?")[0]; if (seen.has(k)) return false; seen.add(k); return true; })
  .slice(0, MAX_ITEMS);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (!items.length) {
  console.warn("수집된 헤드라인이 없어 기존 파일을 유지해요.");
  process.exit(0);
}
items = await translate(items);
fs.writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 0));
console.log(`헤드라인 ${items.length}건 저장`);
