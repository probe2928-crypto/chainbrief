// 텔레그램 채널 운영 (구독자 늘리기용) — GitHub Actions에서 실행, 비밀값은 TELEGRAM_BOT_TOKEN만
//   node scripts/tg-admin.mjs count          채널별 구독자 수 기록 → data/tg-members.json
//   node scripts/tg-admin.mjs setup          채널 소개글 갱신 + 환영 글 게시·고정 (EN·ZH, 한 번만)
//   node scripts/tg-admin.mjs brief <en|zh>  지난 24시간 주요 속보 5개 묶음 '데일리 브리프' 게시
//   node scripts/tg-admin.mjs briefing       글로벌 경제 브리핑 게시(KO·EN·ZH) — content/briefing/<lang>/*.md 최신 1편 + 숫자 블록(data/macro.json·CoinGecko)
//   node scripts/tg-admin.mjs invites        유입 경로별 초대 링크 만들기(광고·링크드인·X) → data/tg-invites.json (한 번만, 다시 돌려도 기존 유지)
//   (count 실행 때마다) 초대 링크별 가입 집계 → data/tg-joins.json  ※ 텔레그램이 업데이트를 24시간만 보관 → 하루 2번 count로 충분
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MACRO } from "./macro.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const [cmd = "count", arg = ""] = process.argv.slice(2);
const CH = cfg.tgChannels || {};
const SITE = (cfg.domain ? `https://${cfg.domain}/` : "https://chainbrief.app/").replace(/\/?$/, "/");
const STATE = path.join(ROOT, "data/tg-admin.json");
const MEMBERS = path.join(ROOT, "data/tg-members.json");
const INVITES = path.join(ROOT, "data/tg-invites.json");
const JOINS = path.join(ROOT, "data/tg-joins.json");
const SOURCES = ["meta-ad", "linkedin", "x", "site", "facebook", "swap"]; // swap = 채널 교차 홍보
const link = (h) => `https://t.me/${String(h).replace(/^@/, "")}`;
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };

async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`${method}: ${j.description || r.status}`);
  return j.result;
}

// 2026-11-26 세준 지시로 채널 개편: '미국·아시아 경제 + 코인' (벤치마크: 미국 주식 인사이더 7.4만, 목표 1만+)
const T = {
  ko: {
    title: "미국주식·경제·코인 속보 | 체인브리프",
    desc: `미국주식·경제·코인을 한 채널에서. 하루 두 번 글로벌 브리핑(아침 7시·밤 9시), 엔비디아·나스닥·연준·금리·관세·비트코인 속보, 하루 두 번 칼럼. 무료. ${SITE.replace(/^https:\/\//, "")} · 문의 @${cfg.telegram}`,
    welcome: (h) => `👋 <b>체인브리프에 오신 걸 환영해요</b>\n\n미국·아시아 경제와 코인 시장을 한 채널에서 봅니다.\n\n🌍 하루 두 번 글로벌 브리핑 (아침 7시 · 밤 9시)\n🇺🇸 연준·금리·관세·미국 증시 속보\n🌏 한국·일본·중국·홍콩 시장 소식\n₿ 비트코인·코인 속보와 거래소 상장 공지\n📊 지수·환율·유가·코인 시세 숫자 정리\n\n🌐 기사 전문과 실시간 시세는 사이트에서 (아래 버튼)\n\n투자하는 친구에게 공유해 주세요 → ${link(h)}\n\n<i>정보 제공 목적이며 투자 권유가 아닙니다.</i>`,
    brief: (d) => `☀️ <b>오늘의 속보 5</b> · ${d}`,
    share: (h) => `체인브리프 공유하기 → ${link(h)}`,
    lang: "ko-KR", tz: "Asia/Seoul", dir: "content/flash", pre: "",
  },
  en: {
    title: "Stocks, Macro & Crypto News | CHAINBRIEF",
    desc: `US & Asia markets and crypto in one feed. A global briefing twice a day, plus the Fed, rates, tariffs, stocks, bitcoin and new exchange listings. Free. ${SITE.replace(/^https:\/\//, "")}en · Contact @${cfg.telegram}`,
    welcome: (h) => `👋 <b>Welcome to CHAINBRIEF</b>\n\nUS and Asian markets and crypto, in one channel.\n\n🌍 Global briefing twice a day: what moved overnight, what to watch today\n🇺🇸 Fed, rates, tariffs and Wall Street\n🌏 Japan, China, Hong Kong and Korea\n₿ Bitcoin and crypto news, new exchange listings\n📊 Indices, FX, oil and crypto prices at a glance\n\n🌐 Full stories and live prices on our website (buttons below)\n\nKnow someone who invests? Share the channel: ${link(h)}\n\n<i>News only, not financial advice.</i>`,
    brief: (d) => `☀️ <b>Daily Brief</b> · ${d}`,
    share: (h) => `Share CHAINBRIEF → ${link(h)}`,
    lang: "en-US", tz: "UTC", dir: "content/en/flash", pre: "en/",
  },
  zh: {
    title: "美股·经济·加密快讯｜链报 CHAINBRIEF",
    desc: `美股、亚洲经济与加密市场，一个频道看懂。每日两次全球简报，美联储、利率、关税、股市、比特币快讯与交易所上币提醒。免费。${SITE.replace(/^https:\/\//, "")}zh · 联系 @${cfg.telegram}`,
    welcome: (h) => `👋 <b>欢迎来到 CHAINBRIEF 链报</b>\n\n美股、亚洲经济与加密市场，一个频道看懂。\n\n🌍 每日两次全球简报：隔夜发生了什么、今天看什么\n🇺🇸 美联储、利率、关税与美股\n🌏 中国、香港、日本、韩国市场\n₿ 比特币与加密快讯、交易所上币提醒\n📊 指数、汇率、原油与币价一览\n\n🌐 完整报道与实时行情请看网站（下方按钮）\n\n身边有做投资的朋友？分享频道：${link(h)}\n\n<i>仅为资讯，不构成投资建议。</i>`,
    brief: (d) => `☀️ <b>每日简报</b> · ${d}`,
    share: (h) => `分享链报 → ${link(h)}`,
    lang: "zh-CN", tz: "Asia/Hong_Kong", dir: "content/zh/flash", pre: "zh/",
  },
};

const utm = (u) => `${u}${u.includes("?") ? "&" : "?"}utm_source=telegram&utm_medium=channel`;
const KB = {
  ko: (pre) => ({ inline_keyboard: [[{ text: "🌐 체인브리프 사이트", url: utm(`${SITE}${pre}`) }], [{ text: "📈 글로벌 시세", url: utm(`${SITE}${pre}market/`) }, { text: "🆕 상장 소식", url: utm(`${SITE}${pre}listings/`) }]] }),
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

// 일회성: AlphaX 가입 링크 교체 (2026-11-05, 세준 지시 — 11/05 17:09 register?invite_code=7lxP6X로 재교체)
if (cmd === "fix-alphax") {
  const R = "https://www.alphax.com/partner/7lxP6X";
  const P = "https://perpline.tech/promos/alphax.html";
  const edits = [
    ["@chainbrief_global", 48, `🔔 Partner offer · AlphaX special\n\n• 0% maker / 0% taker fees, limited time, eligible regions\n• Up to 15,000+ USDT in welcome rewards for new users, paid as trading/position vouchers (not cash)\n• New-user tasks within 14 days: sign-up 200 · first deposit 50+ USDT → 50 · first futures trade 200 · follow on X 100 (USDT vouchers)\n\nSign up: ${R}\nFull breakdown: ${P}\n\nSponsored · referral link, we may earn a commission. Not for residents of Korea or the US. Leveraged trading can lose all of your margin.`],
    ["@chainbrief_global", 52, `AlphaX · 0% maker / 0% taker\nSign up: ${R}\nReferral code: 7lxP6X`],
    ["@chainbrief_cn", 47, `AlphaX · 挂单 0% / 吃单 0%\n注册：${R}\n邀请码：7lxP6X`],
    ["@chainbrief_cn", 42, `🔔 合作推广 · AlphaX 专题\n\n• 限时 0% 挂单 / 0% 吃单手续费（仅限符合条件的地区）\n• 新用户最高可获 15,000+ USDT 欢迎奖励，以交易/仓位体验券形式发放（非现金）\n• 新用户任务（注册后 14 天内）：注册 200 · 首次充值 50 USDT 以上 → 50 · 首笔合约交易 200 · 关注 X 100（USDT 体验券）\n\n注册：${R}\n详细说明（英文）：${P}\n\n广告 · 推荐链接，我们可能获得佣金。不适用于韩国及美国居民。杠杆交易可能亏损全部保证金。`],
  ];
  for (const [chat_id, message_id, text] of edits.filter(e => !arg || String(e[1]) === arg)) {
    try { await tg("editMessageText", { chat_id, message_id, text, link_preview_options: { url: R } }); console.log("수정됨", chat_id, message_id); }
    catch (e) { console.log("실패", chat_id, message_id, e.message); }
  }
  process.exit(0);
}

if (cmd === "invites") {
  const inv = readJ(INVITES, {});
  for (const lang of ["ko", "en", "zh"]) {
    const h = CH[lang]; if (!h) continue;
    inv[lang] = inv[lang] || {};
    for (const src of SOURCES) {
      if (inv[lang][src]) continue;
      try { const r = await tg("createChatInviteLink", { chat_id: h, name: src }); inv[lang][src] = r.invite_link; console.log(lang, src, r.invite_link); }
      catch (e) { console.log(lang, src, "실패 —", e.message); }
    }
  }
  fs.writeFileSync(INVITES, JSON.stringify(inv, null, 1));
}

if (cmd === "count") {
  // 초대 링크별 가입 집계 (chat_member 업데이트)
  try {
    const J = readJ(JOINS, { offset: 0, joins: [] });
    const ups = await tg("getUpdates", { offset: J.offset || 0, timeout: 0, allowed_updates: ["chat_member", "channel_post"] });
    const byHandle = Object.fromEntries(Object.entries(CH).map(([l, h]) => [String(h).replace(/^@/, "").toLowerCase(), l]));
    for (const u of ups) {
      J.offset = u.update_id + 1;
      const cm = u.chat_member; if (!cm) continue;
      const was = cm.old_chat_member?.status, now = cm.new_chat_member?.status;
      const joined = ["left", "kicked"].includes(was) && ["member", "restricted"].includes(now);
      const left = ["member", "restricted"].includes(was) && ["left", "kicked"].includes(now);
      if (!joined && !left) continue;
      J.joins.push({ at: new Date(cm.date * 1000).toISOString(), ch: byHandle[(cm.chat.username || "").toLowerCase()] || cm.chat.id, ev: joined ? "join" : "leave", via: joined ? (cm.invite_link?.name || (cm.via_chat_folder_invite_link ? "folder" : "public")) : "" });
    }
    J.joins = J.joins.slice(-5000);
    fs.writeFileSync(JOINS, JSON.stringify(J, null, 1));
    const sum = {}; for (const j of J.joins) { const k = `${j.ch}:${j.ev === "join" ? j.via : "leave"}`; sum[k] = (sum[k] || 0) + 1; }
    console.log("유입 경로별:", JSON.stringify(sum));
  } catch (e) { console.log("가입 집계 실패 —", e.message); }
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
  for (const lang of ["ko", "en", "zh"]) {
    const h = CH[lang]; if (!h) continue;
    try { await tg("setChatTitle", { chat_id: h, title: T[lang].title }); console.log(lang, "채널 이름 변경:", T[lang].title); }
    catch (e) { console.log(lang, "이름 변경 실패 —", e.message); }
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
  if (Object.entries(state.briefingAt || {}).some(([k, at]) => k.startsWith(lang + ":") && Date.now() - Date.parse(at) < 12 * 3600e3)) { console.log("12시간 안에 글로벌 브리핑이 나가서 속보 묶음은 건너뜀"); process.exit(0); }
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

// ── 글로벌 경제 브리핑 (2026-11-26 채널 개편) ─────────────────────────────
// 'AI 글로벌 브리핑 데스크'가 content/briefing/<ko|en|zh>/YYYY-MM-DD-<am|pm>.md 를 커밋하면
// 이 워크플로가 push로 돌아서 언어별 최신 1편을 채널에 올린다. 숫자는 사람이 쓰지 않고 여기서 붙인다.
const B = {
  ko: { head: "체인브리프 글로벌 브리핑", nums: "📊 <b>숫자로 보기</b>", src: "최근 종가·실시간 기준 · Yahoo Finance·CoinGecko", li: 1 },
  en: { head: "CHAINBRIEF Global Briefing", nums: "📊 <b>By the numbers</b>", src: "Latest close or live · Yahoo Finance, CoinGecko", li: 2 },
  zh: { head: "链报 全球简报", nums: "📊 <b>数字一览</b>", src: "最近收盘或实时 · Yahoo Finance、CoinGecko", li: 3 },
};
const NUM_ROWS = [["🇺🇸", ["^GSPC", "^IXIC", "^DJI"]], ["🌏", ["^KS11", "^N225", "^HSI"]], ["💵", ["KRW=X", "JPY=X", "^TNX"]], ["🛢", ["CL=F", "GC=F"]]];
const md2tg = (md) => esc(md)
  .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
  .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`)
  .replace(/^\s*[-*] /gm, "• ")
  .replace(/\n{3,}/g, "\n\n");
const pctTxt = (p) => p == null || !isFinite(p) ? "" : ` ${p >= 0 ? "▲" : "▼"}${Math.abs(p).toFixed(2)}%`;
const num = (v, d = 2) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
function numbersBlock(lang, quotes, cg) {
  const name = Object.fromEntries(MACRO.flatMap((g) => g.items.map((x) => [x[0], x[B[lang].li]])));
  const rows = [];
  for (const [flag, syms] of NUM_ROWS) {
    const parts = syms.map((s) => {
      const q = quotes[s]; if (!q || q.price == null || (q.time && Date.now() - q.time > 4 * 86400e3)) return null;
      const v = s === "^TNX" ? `${num(q.price, 2)}%` : num(q.price, q.price >= 1000 ? 0 : 2);
      return `${esc(name[s] || s)} ${v}${pctTxt(q.pct)}`;
    }).filter(Boolean);
    if (parts.length) rows.push(`${flag} ${parts.join(" · ")}`);
  }
  const c = [["bitcoin", "BTC"], ["ethereum", "ETH"]].map(([id, t]) => cg?.[id]?.usd ? `${t} $${num(cg[id].usd, 0)}${pctTxt(cg[id].usd_24h_change)}` : null).filter(Boolean);
  if (c.length) rows.push(`₿ ${c.join(" · ")}`);
  return rows.length ? `\n${B[lang].nums}\n${rows.join("\n")}\n<i>${B[lang].src}</i>` : "";
}

// 칼럼 '정하람의 마켓 노트' (2026-11-26 세준: 하루 두 번 · 19:15 "AI라고 쓰지 말고 다른 이름으로") — content/column/<lang>/YYYY-MM-DD-am|pm.md 전문 게시
// 정하람은 체인브리프 편집국 필명(데스크 기자들과 같은 방식). 경력·학력을 지어내지 않는다.
const COL = {
  ko: { head: "✍️ <b>칼럼</b> · 정하람의 마켓 노트", foot: "<i>정보 제공 목적이며 투자 권유가 아닙니다.</i>" },
  en: { head: "✍️ <b>Column</b> · Market Notes by Haram Jung", foot: "<i>Not financial advice.</i>" },
  zh: { head: "✍️ <b>专栏</b> · 郑夏岚市场笔记", foot: "<i>仅为资讯，不构成投资建议。</i>" },
};
const colText = (lang, src) => { const d = frontmatter(src); return [COL[lang].head, "", `<b>${esc(d.title || "")}</b>`, "", md2tg(src.replace(/^---[\s\S]*?---\s*/, "").trim()), "", COL[lang].foot].join("\n"); };
// 이미 올린 칼럼을 새 머리말로 고치기 (한 번만 쓰는 명령)
if (cmd === "column-edit") {
  for (const [id, mid] of Object.entries(state.column || {})) {
    const [lang, f] = id.split(":"); const fp = path.join(ROOT, "content/column", lang, f + ".md");
    if (!fs.existsSync(fp) || !CH[lang]) continue;
    try { await tg("editMessageText", { chat_id: CH[lang], message_id: mid, text: colText(lang, fs.readFileSync(fp, "utf8")), parse_mode: "HTML", link_preview_options: { is_disabled: true } }); console.log("칼럼 수정", id); }
    catch (e) { console.log("칼럼 수정 실패", id, e.message); }
  }
}
if (cmd === "briefing" || cmd === "column") {
  state.column = state.column || {};
  for (const lang of ["ko", "en", "zh"]) {
    const h = CH[lang]; const dir = path.join(ROOT, "content/column", lang);
    if (!h || !fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => /\.md$/.test(f)).sort().reverse().slice(0, 3)) {
      const id = `${lang}:${f.replace(/\.md$/, "")}`;
      if (state.column[id]) break;
      const src = fs.readFileSync(path.join(dir, f), "utf8"); const d = frontmatter(src); const ts = new Date(d.time);
      if (d.draft || isNaN(ts) || Date.now() - ts > 8 * 3600e3 || ts > Date.now() + 15 * 60e3) continue;
      const text = colText(lang, src);
      if (text.length > 4096) { console.log(lang, f, "칼럼 너무 김", text.length); break; }
      try { const m = await tg("sendMessage", { chat_id: h, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }); state.column[id] = m.message_id; console.log(lang, "칼럼 게시", f, text.length + "자"); }
      catch (e) { console.log(lang, "칼럼 실패 —", e.message); }
      break;
    }
  }
  state.column = Object.fromEntries(Object.entries(state.column).slice(-120));
  fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
}

if (cmd === "briefing") {
  state.briefing = state.briefing || {}; state.briefingAt = state.briefingAt || {};
  const quotes = readJ(path.join(ROOT, "data/macro.json"), {}).quotes || {};
  let cg = null;
  try { const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"); if (r.ok) cg = await r.json(); } catch {}
  for (const lang of ["ko", "en", "zh"]) {
    const h = CH[lang]; const dir = path.join(ROOT, "content/briefing", lang);
    if (!h || !fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => /\.md$/.test(f)).sort().reverse().slice(0, 4);
    for (const f of files) {
      const id = `${lang}:${f.replace(/\.md$/, "")}`;
      if (state.briefing[id]) break; // 최신 편을 이미 올렸으면 더 오래된 건 보지 않는다
      const src = fs.readFileSync(path.join(dir, f), "utf8"); const d = frontmatter(src);
      const ts = new Date(d.time);
      if (d.draft || isNaN(ts) || Date.now() - ts > 8 * 3600e3 || ts > Date.now() + 15 * 60e3) { console.log(lang, f, "— 시간이 맞지 않아 건너뜀"); continue; }
      const body = md2tg(src.replace(/^---[\s\S]*?---\s*/, "").trim());
      const head = `🌍 <b>${esc(B[lang].head)}</b>${d.title ? ` · ${esc(d.title)}` : ""}`;
      const foot = `\n${T[lang].share(h)}\n<i>${lang === "ko" ? "정보 제공 목적이며 투자 권유가 아닙니다." : lang === "zh" ? "仅为资讯，不构成投资建议。" : "News only, not financial advice."}</i>`;
      let text = [head, "", body, numbersBlock(lang, quotes, cg), foot].join("\n");
      if (text.length > 4096) text = [head, "", body, foot].join("\n");
      if (text.length > 4096) { console.log(lang, f, "— 너무 길어서 건너뜀", text.length); break; }
      try {
        const m = await tg("sendMessage", { chat_id: h, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: KB[lang](T[lang].pre) });
        state.briefing[id] = m.message_id; state.briefingAt[id] = new Date().toISOString();
        console.log(lang, "글로벌 브리핑 게시", f, text.length + "자");
      } catch (e) { console.log(lang, "브리핑 실패 —", e.message); }
      break;
    }
  }
  const keep = Object.keys(state.briefing).slice(-120);
  state.briefing = Object.fromEntries(keep.map((k) => [k, state.briefing[k]]));
  state.briefingAt = Object.fromEntries(keep.filter((k) => state.briefingAt[k]).map((k) => [k, state.briefingAt[k]]));
  fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
}
