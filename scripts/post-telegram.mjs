// 새 속보·기사를 텔레그램 채널 3곳(KO·EN·中文)에 자동 게시 — GitHub Actions(배포 직후)에서 실행
// 필요: 저장소 Secret TELEGRAM_BOT_TOKEN (봇이 세 채널의 관리자여야 함)
// 채널: site.config.json "tgChannels" { ko, en, zh }
// 상태: data/tg-posted.json — 이미 올린 id (처음 실행 땐 최근 3건만 올리고 나머지는 올린 것으로 표시)
import { stripOutletSource } from "./lib.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const STATE = path.join(ROOT, "data/tg-posted.json");
const SITE = (cfg.domain ? `https://${cfg.domain}/` : (process.env.SITE_BASE || "https://chainbrief.app/")).replace(/\/?$/, "/");
const MAX_PER_RUN = 6;       // 한 번에 채널당 최대 게시 수 (도배 방지)
const MAX_AGE_H = 24;        // 이보다 오래된 건 올리지 않음
const DRY = process.argv.includes("--dry");

const L = {
  ko: { pre: "", dir: { flash: "content/flash", articles: "content/articles" }, read: "기사 읽기", more: "체인브리프에서 보기", hot: "속보", tz: "Asia/Seoul" },
  en: { pre: "en/", dir: { flash: "content/en/flash", articles: "content/en/articles" }, read: "Read the analysis", more: "More on CHAINBRIEF", hot: "BREAKING", tz: "UTC" },
  zh: { pre: "zh/", dir: { flash: "content/zh/flash", articles: "content/zh/articles" }, read: "阅读全文", more: "在链报查看", hot: "快讯", tz: "Asia/Hong_Kong" },
};

function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":"); if (i < 0) continue;
    let v = line.slice(i + 1).trim(); const q = v.match(/^(["'])(.*)\1$/); v = q ? q[2] : v;
    data[line.slice(0, i).trim()] = v === "true" ? true : v === "false" ? false : v;
  }
  return { data, body: m[2].trim() };
}
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// 마크다운 → 텔레그램 HTML (링크만 살리고 나머지는 평문)
const mdToHtml = (md = "") => esc(md.replace(/^#+\s*/gm, "").replace(/[*_`>]/g, ""))
  .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);

function load(lang, kind) {
  const d = path.join(ROOT, L[lang].dir[kind]);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith(".md")).map((f) => {
    const { data, body } = frontmatter(fs.readFileSync(path.join(d, f), "utf8"));
    const date = new Date(kind === "flash" ? data.time : data.date);
    return { id: f.replace(/\.md$/, ""), kind, lang, date, body: kind === "flash" ? stripOutletSource(body) : body, ...data };
  }).filter((x) => !x.draft && !isNaN(x.date) && x.date <= new Date(Date.now() + 60_000));
}

// EN·ZH: 코인 캐시태그($STRK 등) — 텔레그램 앱 검색에서 캐시태그로 공개 채널 글을 찾을 때 우리 글이 걸리게 (11/23 텔레오)
// 자동 상장 글은 파일 이름(auto-거래소-…-마켓-심볼), 그 밖엔 frontmatter tickers("BTC,ETH") 또는 분류(Bitcoin·Ethereum)에서 뽑는다
const CAT_TICKER = { bitcoin: "BTC", ethereum: "ETH", solana: "SOL", xrp: "XRP" };
function cashtags(x) {
  const set = new Set();
  const m = String(x.id).match(/^auto-[a-z]+-(?:mkt|warn|list)?-?(?:KRW|USDT|BTC|USDC)-([A-Z0-9]{2,12})(?:-|$)/i);
  if (m) set.add(m[1].toUpperCase());
  String(x.tickers || "").split(/[\s,]+/).filter(Boolean).forEach((t) => set.add(t.replace(/^\$/, "").toUpperCase()));
  const c = CAT_TICKER[String(x.category || "").toLowerCase()]; if (c) set.add(c);
  return [...set].filter((t) => /^[A-Z][A-Z0-9]{1,11}$/.test(t)).slice(0, 3).map((t) => `$${t}`).join(" ");
}
// EN·ZH: 글 끝 채널 서명 — 본문만 복사·캡처해 퍼져도 채널 주소가 따라가게 (11/23 텔레오)
const SIGN = { en: "free listing alerts & breaking news", zh: "免费上币提醒与快讯" };
const sign = (lang) => { const h = String(channels[lang] || "").replace(/^@/, ""); return SIGN[lang] && h ? `\n\n📡 <a href="https://t.me/${h}">@${h}</a> · ${esc(SIGN[lang])}` : ""; };

// 지역·분야 이모지: frontmatter region(us·eu·asia·kr·jp·cn·me·crypto) 우선, 없으면 분류·제목으로 추정
const REGION = { us: "🇺🇸", eu: "🇪🇺", uk: "🇬🇧", asia: "🌏", kr: "🇰🇷", jp: "🇯🇵", cn: "🇨🇳", hk: "🇭🇰", me: "🛢", crypto: "₿" };
function flashEmoji(x) {
  if (REGION[String(x.region || "").toLowerCase()]) return REGION[String(x.region).toLowerCase()];
  const s = `${x.category || ""} ${x.title || ""}`;
  if (/연준|美|미국|Fed|FOMC|Treasury|Wall Street|Nasdaq|S&P|美联储|美国|美股|관세|tariff|关税/i.test(s)) return "🇺🇸";
  if (/ECB|유럽|EU\b|Europe|欧洲|欧盟|영국|英|獨|佛|UK|BoE/i.test(s)) return "🇪🇺";
  if (/한국은행|코스피|원화|금융위|금감원|업비트|빗썸|Korea|韩国/i.test(s)) return "🇰🇷";
  if (/일본|엔화|BOJ|BoJ|Japan|日本|日元/i.test(s)) return "🇯🇵";
  if (/중국|홍콩|위안|China|Hong Kong|中国|香港|人民币/i.test(s)) return "🇨🇳";
  if (/유가|원유|OPEC|중동|이란|사우디|oil|crude|Iran|原油|中东/i.test(s)) return "🛢";
  if (/상장|listing|上币|上线/i.test(s)) return "🆕";
  return "⚡";
}
const urlOf = (x) => `${SITE}${L[x.lang].pre}${x.kind === "flash" ? "flash" : "articles"}/${x.id}/`;
function message(x) {
  const t = L[x.lang];
  const url = `${SITE}${t.pre}${x.kind === "flash" ? "flash" : "articles"}/${x.id}/`;
  const tag = x.category ? ` #${String(x.category).replace(/[\s·.,/&-]+/g, "")}` : "";
  const ct = SIGN[x.lang] ? cashtags(x) : "";
  const tags = `${tag}${ct ? ` ${ct}` : ""}${sign(x.lang)}`;
  if (x.kind === "flash") {
    // 2026-11-26 세준: "기사 퍼온 것처럼 하지 말고" + 미국 주식 인사이더처럼 — 제목·링크·버튼·태그 없이 짧은 문단 본문만
    let body = mdToHtml(x.body).trim();
    if (!/\n\s*\n/.test(body) && x.lang !== "en") body = body.split(/(?<=\.)\s+(?=\S)|(?<=。)\s*(?=\S)/).map((t) => t.trim()).filter(Boolean).join("\n\n");
    return `${x.important ? "🔴" : flashEmoji(x)} ${body}`.slice(0, 3500);
  }
  const by = x.author ? ` · ${esc(x.author)}` : "";
  return `📰 <b>${esc(x.title)}</b>\n\n${esc(x.summary || "")}\n\n<a href="${url}">${esc(t.read)} →</a>${by}${tags}`;
}

// 게시물 아래 버튼: 기사 원문 · 사이트(시세·상장) — 채널 구독자를 홈페이지로 이어 줌 (GA에 utm으로 잡힘)
const BTN = {
  ko: { read: "기사 보기", site: "글로벌 시세", list: "상장 소식" },
  en: { read: "Read on CHAINBRIEF", site: "Live prices", list: "Listings" },
  zh: { read: "阅读全文", site: "实时行情", list: "上币动态" },
};
const utm = (u) => `${u}${u.includes("?") ? "&" : "?"}utm_source=telegram&utm_medium=channel`;
// EN·ZH: 글 하나를 친구에게 넘기는 '공유' 버튼 — 기사 링크 + 채널 주소가 함께 가서, 받은 사람이 채널로 들어오게 (11/16 텔레오)
const SHARE = {
  en: { btn: "↗️ Share with a friend", text: (h) => `Free crypto listing alerts & breaking news → t.me/${h}` },
  zh: { btn: "↗️ 分享给朋友", text: (h) => `免费加密上币提醒与突发快讯 → t.me/${h}` },
};
function buttons(lang, url, kind) {
  const b = BTN[lang] || BTN.en, pre = L[lang]?.pre || "";
  const rows = kind === "flash"
    ? [[{ text: `📈 ${b.site}`, url: utm(`${SITE}${pre}market/`) }, { text: `🆕 ${b.list}`, url: utm(`${SITE}${pre}listings/`) }]]
    : [[{ text: `📰 ${b.read}`, url: utm(url) }], [{ text: `📈 ${b.site}`, url: utm(`${SITE}${pre}market/`) }, { text: `🆕 ${b.list}`, url: utm(`${SITE}${pre}listings/`) }]];
  const sh = SHARE[lang], h = String(channels[lang] || "").replace(/^@/, "");
  if (sh && h) {
    const u = `${url}?utm_source=telegram&utm_medium=share`;
    rows.push([{ text: sh.btn, url: `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(sh.text(h))}` }]);
  }
  return { inline_keyboard: rows };
}

async function send(chat, html, url, lang, kind) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: html, parse_mode: "HTML", link_preview_options: kind === "flash" ? { is_disabled: true } : { url, prefer_small_media: true, show_above_text: false }, ...(lang && kind !== "flash" ? { reply_markup: buttons(lang, url, kind) } : {}) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(j.description || `HTTP ${r.status}`);
  return j.result?.message_id;
}

const channels = cfg.tgChannels || {};
if (!TOKEN && !DRY) { console.log("텔레그램: TELEGRAM_BOT_TOKEN 없음 — 건너뜀"); process.exit(0); }
if (TOKEN) {
  const me = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`).then((r) => r.json()).catch(() => ({}));
  console.log("텔레그램 봇:", me.ok ? "@" + me.result.username : "토큰 확인 실패");
  if (!me.ok) process.exit(0);
}
let state = {};
try { state = JSON.parse(fs.readFileSync(STATE, "utf8")); } catch {}
let changed = false;
for (const lang of Object.keys(L)) {
  const chat = channels[lang]; if (!chat) continue;
  const items = [...load(lang, "flash"), ...load(lang, "articles")].sort((a, b) => a.date - b.date);
  const seen = new Set(state[lang] || []);
  if (!state[lang]) { // 첫 실행: 최근 3건만 올리고 나머지는 올린 것으로
    items.slice(0, -3).forEach((x) => seen.add(x.id));
    changed = true;
  }
  const fresh = items.filter((x) => !seen.has(x.id) && Date.now() - x.date < MAX_AGE_H * 3600e3).slice(-MAX_PER_RUN);
  items.filter((x) => !seen.has(x.id) && !fresh.includes(x)).forEach((x) => seen.add(x.id)); // 너무 오래된 건 건너뜀
  let n = 0;
  for (const x of fresh) {
    if (DRY) { console.log(`[${lang}] ${chat}\n${message(x)}\n`); seen.add(x.id); continue; }
    try { await send(chat, message(x), urlOf(x), lang, x.kind); seen.add(x.id); n++; changed = true; await new Promise((r) => setTimeout(r, 1500)); }
    catch (e) { console.log(`텔레그램 ${lang} 실패: ${x.id} — ${e.message}`); if (/chat not found|not enough rights|bot is not a member/i.test(e.message)) break; }
  }
  state[lang] = [...seen].slice(-800);
  console.log(`텔레그램 ${lang} (${chat}): ${n}건 게시`);
}
if (changed && !DRY) fs.writeFileSync(STATE, JSON.stringify(state));
