// 텔레그램 채널 운영 (구독자 늘리기용) — GitHub Actions에서 실행, 비밀값은 TELEGRAM_BOT_TOKEN만
//   node scripts/tg-admin.mjs count          채널별 구독자 수 기록 → data/tg-members.json
//   node scripts/tg-admin.mjs setup          채널 소개글 갱신 + 환영 글 게시·고정 (EN·ZH, 한 번만)
//   node scripts/tg-admin.mjs brief <en|zh>  지난 24시간 주요 속보 5개 묶음 '데일리 브리프' 게시
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const [cmd = "count", arg = ""] = process.argv.slice(2);
const CH = cfg.tgChannels || {};
const SITE = (cfg.domain ? `https://${cfg.domain}/` : "https://probe2928-crypto.github.io/chainbrief/").replace(/\/?$/, "/");
const STATE = path.join(ROOT, "data/tg-admin.json");
const MEMBERS = path.join(ROOT, "data/tg-members.json");
const link = (h) => `https://t.me/${String(h).replace(/^@/, "")}`;
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };

async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`${method}: ${j.description || r.status}`);
  return j.result;
}

const T = {
  en: {
    desc: `Crypto news, briefed fast. Breaking headlines, new exchange listings (Binance, OKX, Bybit, Coinbase) and short sourced analysis. Free. Web: ${SITE.replace(/^https:\/\//, "")}en · Contact @${cfg.telegram}`,
    welcome: (h) => `👋 <b>Welcome to CHAINBRIEF</b>\n\nWhat you get here, free:\n🔴 Breaking crypto news as it happens\n🆕 New exchange listings: Binance, OKX, Bybit, Coinbase and more\n☀️ A daily brief with the five stories that matter\n📰 Short, sourced analysis\n\n🌐 Full stories, live prices and the listings calendar on our website (buttons below)\n\nKnow someone who trades? Share the channel: ${link(h)}\n\n<i>News only, not financial advice.</i>`,
    brief: (d) => `☀️ <b>Daily Brief</b> · ${d}`,
    share: (h) => `Share CHAINBRIEF → ${link(h)}`,
    lang: "en-US", tz: "UTC", dir: "content/en/flash", pre: "en/",
  },
  zh: {
    desc: `加密快讯，一眼读懂。突发新闻、交易所上币提醒（币安、OKX、Bybit、Coinbase）与有出处的简短分析，免费订阅。网站 ${SITE.replace(/^https:\/\//, "")}zh · 联系 @${cfg.telegram}`,
    welcome: (h) => `👋 <b>欢迎来到 CHAINBRIEF 链报</b>\n\n在这里免费获得：\n🔴 第一时间的加密突发新闻\n🆕 交易所新上币提醒：币安、OKX、Bybit、Coinbase 等\n☀️ 每日简报：当天最重要的五条新闻\n📰 有出处的简短分析\n\n🌐 完整报道、实时行情与上币日历请看网站（下方按钮）\n\n身边有做交易的朋友？分享频道：${link(h)}\n\n<i>仅为资讯，不构成投资建议。</i>`,
    brief: (d) => `☀️ <b>每日简报</b> · ${d}`,
    share: (h) => `分享链报 → ${link(h)}`,
    lang: "zh-CN", tz: "Asia/Hong_Kong", dir: "content/zh/flash", pre: "zh/",
  },
};

const utm = (u) => `${u}${u.includes("?") ? "&" : "?"}utm_source=telegram&utm_medium=channel`;
const KB = {
  en: (pre) => ({ inline_keyboard: [[{ text: "🌐 Open CHAINBRIEF", url: utm(`${SITE}${pre}`) }], [{ text: "📈 Live prices", url: utm(`${SITE}${pre}market/`) }, { text: "🆕 Listings", url: utm(`${SITE}${pre}listings/`) }]] }),
  zh: (pre) => ({ inline_keyboard: [[{ text: "🌐 打开链报网站", url: utm(`${SITE}${pre}`) }], [{ text: "📈 实时行情", url: utm(`${SITE}${pre}market/`) }, { text: "🆕 上币动态", url: utm(`${SITE}${pre}listings/`) }]] }),
};

function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/); const d = {};
  if (m) for (const line of m[1].split(/\r?\n/)) { const i = line.indexOf(":"); if (i < 0) continue; let v = line.slice(i + 1).trim(); const q = v.match(/^(["'])(.*)\1$/); v = q ? q[2] : v; d[line.slice(0, i).trim()] = v === "true" ? true : v === "false" ? false : v; }
  return d;
}

if (!TOKEN) { console.log("TELEGRAM_BOT_TOKEN 없음 — 건너뜀"); process.exit(0); }
const state = readJ(STATE, {});

if (cmd === "count") {
  const hist = readJ(MEMBERS, { days: [] });
  const today = new Date().toISOString().slice(0, 10);
  const row = { date: today, at: new Date().toISOString() };
  for (const [lang, h] of Object.entries(CH)) {
    try { row[lang] = await tg("getChatMemberCount", { chat_id: h }); } catch (e) { row[lang] = null; console.log(lang, e.message); }
  }
  hist.days = hist.days.filter((d) => d.date !== today).concat(row).slice(-400);
  fs.writeFileSync(MEMBERS, JSON.stringify(hist, null, 1));
  console.log("구독자:", JSON.stringify(row));
}

if (cmd === "setup") {
  for (const lang of ["en", "zh"]) {
    const h = CH[lang]; if (!h) continue;
    try { await tg("setChatDescription", { chat_id: h, description: T[lang].desc.slice(0, 255) }); console.log(lang, "소개글 갱신"); }
    catch (e) { console.log(lang, "소개글 실패 —", e.message); }
    state.welcome = state.welcome || {};
    if (!state.welcome[lang]) {
      try {
        const m = await tg("sendMessage", { chat_id: h, text: T[lang].welcome(h), parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: KB[lang](T[lang].pre) });
        state.welcome[lang] = m.message_id;
        try { await tg("pinChatMessage", { chat_id: h, message_id: m.message_id, disable_notification: true }); console.log(lang, "환영 글 고정"); }
        catch (e) { console.log(lang, "고정 실패 —", e.message); }
      } catch (e) { console.log(lang, "환영 글 실패 —", e.message); }
    } else {
      try { await tg("editMessageText", { chat_id: h, message_id: state.welcome[lang], text: T[lang].welcome(h), parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: KB[lang](T[lang].pre) }); console.log(lang, "환영 글 수정(사이트 버튼)"); }
      catch (e) { console.log(lang, "환영 글 수정 실패 —", e.message); }
    }
  }
  fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
}

if (cmd === "brief") {
  const lang = arg; const t = T[lang]; const h = CH[lang];
  if (!t || !h) { console.log("언어 없음:", lang); process.exit(0); }
  const key = `${lang}:${new Date().toISOString().slice(0, 10)}`;
  state.brief = state.brief || {};
  if (state.brief[key]) { console.log("오늘 브리프 이미 게시"); process.exit(0); }
  const dir = path.join(ROOT, t.dir);
  const items = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => f.endsWith(".md") && !f.startsWith("auto-")).map((f) => {
    const d = frontmatter(fs.readFileSync(path.join(dir, f), "utf8")); return { id: f.replace(/\.md$/, ""), ...d, ts: new Date(d.time) };
  }).filter((x) => !x.draft && x.title && !isNaN(x.ts) && Date.now() - x.ts < 24 * 3600e3 && x.ts <= Date.now() + 60e3);
  if (items.length < 3) { console.log("지난 24시간 속보가 3개 미만 — 건너뜀"); process.exit(0); }
  items.sort((a, b) => (b.important === true) - (a.important === true) || b.ts - a.ts);
  const top = items.slice(0, 5);
  const day = new Intl.DateTimeFormat(t.lang, { timeZone: t.tz, month: "short", day: "numeric", weekday: "short" }).format(new Date());
  const lines = top.map((x, i) => `${i + 1}. <a href="${SITE}${t.pre}flash/${x.id}/">${esc(x.title)}</a>`).join("\n");
  const text = `${t.brief(day)}\n\n${lines}\n\n${t.share(h)}`;
  const m = await tg("sendMessage", { chat_id: h, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: KB[lang](t.pre) });
  state.brief[key] = m.message_id;
  state.brief = Object.fromEntries(Object.entries(state.brief).slice(-60));
  fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
  console.log(lang, "브리프 게시", top.length, "건");
}
