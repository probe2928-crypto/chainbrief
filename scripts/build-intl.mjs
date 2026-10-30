// 영어(/en/)·중국어(/zh/) 에디션 빌드 — build.mjs 다음에 실행 (dist/ 위에 추가)
// 콘텐츠: content/en/{articles,flash}, content/zh/{articles,flash}
// 공용 데이터: data/listings.json, data/headlines.json (언어별로 매체 필터)
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { markdown, cjkify, cjkifyBare, writeAppFeed, writeSearch, SEARCH_SVG, smartQuotes, mergeListings, EX_ALL, isKR, coinsIn, coinChips } from "./lib.mjs";
import { loadMacro, macroSection } from "./macro.mjs";
import { tgChan } from "./tgchan.mjs";
import { writeProjects, projectNav } from "./projects.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist");
const MACRO_DATA = loadMacro(ROOT);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
let BASE = process.env.BASE_PATH || "/";
if (!BASE.endsWith("/")) BASE += "/";
const SITE_URL = (cfg.domain ? `https://${cfg.domain}` : (process.env.SITE_URL || "")).replace(/\/$/, "");
const asset = (p = "") => BASE + p.replace(/^\//, "");
const BUILD_ID = Date.now().toString(36);
const NOW = new Date();
const TG = cfg.telegram ? `https://t.me/${cfg.telegram.replace(/^@/, "")}` : "";

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const plain = (md) => md.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`]/g, "").replace(/\s+/g, " ").trim();
function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":"); if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    // 따옴표로 감싼 값만 벗긴다 — 제목 끝의 '규정 정치' 같은 인용부호는 지킨다
    const q = v.match(/^(["'])(.*)\1(?:\s+#\s.*)?$/);
    v = q ? q[2] : v.replace(/\s+#\s.*$/, "");
    if (v === "true") v = true; else if (v === "false") v = false;
    const k = line.slice(0, i).trim();
    // 중문 제목: 숫자와 단위(万·亿·美元…)가 줄 끝·줄 앞으로 갈라지지 않게 단어 결합자
    data[k] = /^(title|summary|dek|subtitle)$/.test(k) && typeof v === "string" ? smartQuotes(v).replace(/(\d)(?=[万亿千百]|美元|港元|枚|%)/g, "$1\u2060") : v;
  }
  return { data, body: m[2].trim() };
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
function write(rel, content) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, rel.endsWith(".html") ? cjkifyBare(cjkify(content)) : content);
}

const headlines = readJSON("data/headlines.json", { updatedAt: null, items: [] });
const allHL = (headlines.items || []).filter((h) => !/\p{Script=Hangul}/u.test(h.title)).map((h) => ({ ...h, date: new Date(h.time) }));
const listings = readJSON("data/listings.json", { items: [] });
const lsItems = (listings.items || []).map((i) => ({ ...i, date: new Date(i.time) }));
const globalLs = listings.global || null;
const allLs = mergeListings(listings.items || [], globalLs); // 거래소 전체 한 목록
const isNew = (i) => i.type === "listing" || i.type === "futures";

/* ---------- 언어 사전 ---------- */
const ED = {
  en: {
    code: "en", html: "en", locale: "en-US", tz: "UTC", tzL: "UTC", name: "CHAINBRIEF",
    tagline: "Blockchain news, analysis and live markets",
    description: "Independent blockchain and crypto news: a 24/7 live wire, daily analysis from our desk and live market data. Free to read, no sign-up.",
    fonts: "family=Bodoni+Moda:opsz,wght@6..96,400..600&family=Jost:wght@300..500&family=Newsreader:opsz,wght@6..72,400..600",
    nav: [["", "Live"], ["news/", "News"], ["market/", "Markets"], ["surge/", "Surge"], projectNav("en"), ["contact/", "Contact"], ["listings/", "Listings"]],
    tabs: [["", "Live", "live"], ["news/", "News", "news"], ["market/", "Markets", "mkt"], ["surge/", "Surge", "surge"]], menuL: "Menu", searchL: "Search", closeL: "Close",
    cats: ["Bitcoin", "Altcoins", "Listings", "Regulation", "Macro", "On-chain", "Exchanges", "US", "Europe", "Singapore"],
    all: "All", breaking: "Breaking", liveTitle: "Live Wire",
    wa: { title: "Wire archive", desc: "Every CHAINBRIEF wire story, by date — {n} items.", dates: "Jump to a date", earlier: "Earlier stories", byDate: "Browse the full archive", n: "{n}", backL: "The newest stories update live on the front page", back: "Back to Live Wire", eye: "Wire", read: "Read the story", hero: "Top wire stories" }, search: "Search the wire", newBtn: "New stories", noMatch: "No stories match.",
    emptyFeed: "The first stories are on their way.", headlinesT: "Global Headlines", more: "More", marketsT: "Markets", allMarkets: "All markets",
    moodT: "Market Mood", dom: "BTC dominance", koreaListings: "Latest Listings", allListings: "All listings",
    contactT: "Tips · Ads · Partnerships", contactX: `Message us on Telegram @${cfg.telegram}.`, openTg: "Open Telegram",
    disclaimer: "CHAINBRIEF content is for information only and is not investment advice. Third-party headlines remain the property of their publishers. Prices: CoinGecko, Upbit, Bithumb. Fear & Greed: Alternative.me.",
    readMore: "Read", copy: "Copy link", toWire: "Back to the wire", alsoT: "More from the wire",
    gl: { label: "Global Exchanges", title: "Global exchange listings", aside: "Spot and futures listings and delistings on Binance, OKX, Bybit and Coinbase, checked every 15 minutes. Headlines and links only.", listing: "Spot listing", futures: "Futures", delisting: "Delisting", upcoming: "Soon", all: "All", allTypes: "All types", none: "Nothing matches this filter.", more: "All global listings", notice: "Exchange notice", empty: "No global exchange listings in the last 30 days yet.", checked: "Checked {t}", stale: "Not reachable right now" },
    listingsTitle: "Exchange Listings", listingsDesc: "New spot and futures listings, caution flags and delistings on Binance, OKX, Bybit, Coinbase, Upbit and Bithumb — one ledger, grouped by time of day.",
    slots: [["Morning", 6, 12], ["Afternoon", 12, 18], ["Evening", 18, 24], ["Overnight", 0, 6]], today: "Today", yday: "Yesterday", nNew: "{n} new", none: "Nothing in this window.", wkS: "Last", wkU: "days", nIt: "{n}", nItS: "{n} items", qSlots: "Nothing {s}", qDay: "No exchange news on this day.", wkNone: "No exchange news in the last 7 days.", qJoin: " · ",
    ty: { listing: "New listing", futures: "Futures", delisting: "Delisting", caution: "Caution", "caution-cleared": "Caution lifted" }, exAll: "All", typeAll: "All types", tyF: [["listing", "Listings"], ["futures", "Futures"], ["caution", "Caution"], ["delisting", "Delistings"]], lsEx: "6 exchanges", soonT: "Upcoming", soonX: "Times as announced", fe: "Nothing matches this filter.",
    notice: "Official notice (Korean)", lsNote: "Times in UTC. Checked every 15 minutes from exchange notices and market lists; for global exchanges we carry headlines and links only. Prices on the right are Upbit/Bithumb KRW with 24h change. Tokenized stocks and stock futures are excluded.",
    updated: "Updated {t}", every15: "checked every 15 min",
    surgeTitle: "Surge Radar", surgeDesc: "Live top movers on Upbit and Bithumb KRW markets: 5-minute spikes, volume surges, 52-week highs, new-listing performance and cross-exchange gaps.",
    newsTitle: "News", catAll: "All", catN: "{n} stories", catOther: "Other section", catAria: "Stories by section", catDek: { Policy: "Bills, tax and supervision — where regulation reshapes market structure.", Markets: "Prices, flows and the reasons behind them.", Industry: "Companies, projects and where the money moves.", Exchanges: "Listings, warnings and the race between venues.", Technology: "Protocols, security and what code changes.", Global: "Major markets and the regulators that shape them." }, editorial: "CHAINBRIEF Analysis", region: "US · Europe · Singapore",
    ccLabel: "Coins mentioned", ccAria: "Coins mentioned · current price and 24h change",
    marketTitle: "Live Prices", marketDesc: "Global USD prices next to Upbit KRW prices, refreshed every minute.",
    kimpNote: "Refreshed every minute.",
    th: ["Coin", "USD", "Upbit KRW", "24H", "Volume"],
    contactPage: "Tips, advertising and partnerships", contactBody: `Send us a message on Telegram and we will get back to you. If the button doesn't open, search for @${cfg.telegram} in Telegram.`, copyId: "Copy ID", weTake: "What we handle", weTakeL: ["News tips", "Advertising & banners", "Exchange & project partnerships", "Corrections"],
    notFound: "Page not found", notFoundX: "This page has moved or no longer exists.",
    slideRead: "Read the story", slideListings: "This week across 6 exchanges: {n} new listings", slideListingsCta: "See listings", slideSurge: "The coins moving fastest right now", slideSurgeX: "5-minute spikes, volume surges, 52-week highs and new-listing performance on one screen.", slideSurgeCta: "Open the radar",
    cf: ["Bitcoin · USD", "", "Market mood", "New listings · 7 days", "Analysis"], cfBasis: "Upbit BTC",
    surgeHero: [["5-minute spikes", "The coins that rose most in the last five minutes, tracked on 1-minute candles."], ["Volume surges", "Coins trading at 1.5× or more their normal five-minute volume."], ["52-week highs · New listings", "Coins near their highs, and how the last 30 days of listings are doing."]],
    marketHero: [["Dollars and won, side by side", "Global prices next to Upbit's KRW prices, updated every minute."]],
    surgeUI: { exUp: "Upbit", exBt: "Bithumb", vol: "Volume", volAll: "All", vol10: "₩1B+", vol100: "₩10B+", q: "Search coins (BTC, XRP…)", grp: [["Right Now", "Short-term signals"], ["24 Hours", "Today's movers"], ["Momentum", "Highs · New listings"]],
      boards: { rkShort: ["5 Min", "5-minute spikes", "Last 5 minutes · 1-minute candles"], rkSpike: ["Volume Spike", "Volume surges", "Last 5-min volume ÷ normal 5-min average"], rkUp: ["Top Gainers", "Top gainers"], rkDown: ["Top Losers", "Top losers"], rkVol: ["Volume", "Top volume"], rkGap: ["Upbit vs Bithumb", "Exchange gap", "Same coin, Upbit vs Bithumb KRW price"], rkHigh: ["52-Week High", "Near 52-week highs", "Current price vs 52-week high"], rkList: ["New Listings", "New-listing scorecard", "Listings in the last 30 days · vs first-day open"] },
      note: "KRW markets. 24h change is vs the previous close; short-term signals use 1-minute candles. Tap a row to open the exchange chart. For reference only, not investment advice." },
    t: { locale: "en-US", tz: "UTC", now: "just now", min: "m ago", hr: "h ago", day: "d ago", yday: "Yesterday ", newN: "{n} new stories", basis: "{src} BTC", upbit: "Upbit", bithumb: "Bithumb", asOf: "as of {t} UTC", priceErr: "Couldn't load prices. Retrying shortly.", won: "", wonPre: "₩", copied: "Copied", expand: "Read more", collapse: "Show less",
      fng: { "Extreme Fear": "Extreme fear", Fear: "Fear", Neutral: "Neutral", Greed: "Greed", "Extreme Greed": "Extreme greed" },
      surge: { upbit: "Upbit", bithumb: "Bithumb", locale: "en-US", won: "", wonPre: "₩", fallback: "{a} delayed — showing {b}", updated: "{ex} · updated {t} · every 20s", retrying: "{ex} delayed — retrying", loading: "Loading…",
        fail: "Couldn't load {ex} prices right now (rate limit or outage). Retrying automatically.", failSwitch: " — try the other exchange above.", noMatch: "No coins match.", noRise5: "Nothing rose in the last 5 minutes.", collecting: "Collecting 1-minute candles…",
        times: "{n}×", min5: "5m", spike: "Surge", noSpike: "No coin is trading at 1.5× its normal volume right now.", newHigh: "New high", hi52: "52w high {p}", todayHigh: "New today", noHigh: "No coin within 10% of its 52-week high.", noHiData: "This exchange doesn't publish 52-week highs.",
        sUpDn: "Up · Down", sAvg: "Average change", sVol: "24h volume", sTop: "Top gainer today", coins: "{n} coins", krwMkt: "{ex} KRW market", gapNeed: "Both exchanges are needed — retrying one of them.", gapSub: "Upbit {a} · Bithumb {b}", noGap: "No meaningful gaps right now.",
        lsLoading: "Loading listing history…", lsFail: "Couldn't load prices for recent listings.", lsSub: "Listed {d} · {ex} · peak {m}" } },
    ads: {
      blockkey: { title: "AI marketing · AI development · Blockchain integration", text: "One team from diagnosis to build and operations — a technology partner for Web3 projects.", cta: "Discover BLOCKKEY", short: "AI marketing · Dev · Blockchain", top: "Partner" },
      perpline: { title: "Your trading fees, returned.", text: "Compare fees across 11 futures exchanges and get 40–60% of your trading fees back in USDT every week.", cta: "Visit Perpline", short: "Trading fees, returned.", note: "Not available to residents of Korea or the United States.", top: "Partner" },
    },
    partnersT: "Partners", partnersX: "Brands we work with", sponsored: "Sponsored", byText: "By", homeLabel: "Home", readT: "{n} min read",
    S: { title: "Search", desc: "Search CHAINBRIEF analysis and the live wire", aside: "Analysis {a} · Wire {f}", ph: "Coins, people, topics (e.g. bitcoin ETF)", try: "Try", all: "All", arts: "Analysis", flash: "Wire", nojs: "Search needs JavaScript enabled.",
      js: { locale: "en-US", tz: "UTC", art: "Analysis", fl: "Wire", found: "{n} results for “{q}”", none: "Nothing matches “{q}”. Try another word.", hint: "Searches titles, summaries, story text, categories and authors.", loading: "Loading the index…", fail: "Couldn't load the search index. Please refresh." } },
  },
  zh: {
    code: "zh", html: "zh-Hans", locale: "zh-CN", tz: "Asia/Hong_Kong", tzL: "HKT", name: "CHAINBRIEF 链报",
    tagline: "区块链新闻、深度分析与实时行情",
    description: "独立的区块链与加密新闻：24小时快讯、编辑部每日深度分析与实时行情。免费阅读，无需注册。",
    fonts: "family=Bodoni+Moda:opsz,wght@6..96,400..600&family=Jost:wght@300..500&family=Newsreader:opsz,wght@6..72,500..600&family=Noto+Serif+SC:wght@500;700&family=Noto+Sans+SC:wght@300;400;500",
    nav: [["", "快讯"], ["news/", "新闻"], ["market/", "行情"], ["surge/", "异动"], projectNav("zh"), ["contact/", "联系"], ["listings/", "上币"]],
    tabs: [["", "快讯", "live"], ["news/", "新闻", "news"], ["market/", "行情", "mkt"], ["surge/", "异动", "surge"]], menuL: "菜单", searchL: "搜索", closeL: "关闭",
    cats: ["比特币", "山寨币", "上币", "监管", "宏观", "链上", "交易所", "香港", "新加坡", "海外"],
    all: "全部", breaking: "重要", liveTitle: "7×24 快讯",
    wa: { title: "快讯档案", desc: "按日期回看链报全部 7×24 快讯，共 {n} 条。", dates: "按日期跳转", earlier: "更早的快讯", byDate: "按日期查看全部", n: "{n} 条", backL: "最新快讯在首页实时更新", back: "返回 7×24 快讯", eye: "快讯", read: "阅读快讯", hero: "重点快讯" }, search: "搜索快讯", newBtn: "有新快讯", noMatch: "没有符合条件的快讯。",
    emptyFeed: "首批快讯即将上线。", headlinesT: "全球头条", more: "更多", marketsT: "主要行情", allMarkets: "全部行情",
    moodT: "市场情绪", dom: "BTC 市占率", koreaListings: "最新上币", allListings: "全部上币",
    contactT: "爆料 · 广告 · 合作", contactX: `请通过 Telegram @${cfg.telegram} 联系我们。`, openTg: "打开 Telegram",
    disclaimer: "CHAINBRIEF 提供的信息仅供参考，不构成投资建议。外部头条版权归原媒体所有。行情来源：CoinGecko、Upbit、Bithumb；恐惧与贪婪指数：Alternative.me。",
    readMore: "阅读", copy: "复制链接", toWire: "返回快讯", alsoT: "相关快讯",
    gl: { label: "Global Exchanges", title: "全球交易所上币", aside: "每 15 分钟检查币安、OKX、Bybit 与 Coinbase 的现货、合约上币及下架，仅转载公告标题与链接。", listing: "现货上币", futures: "合约上线", delisting: "下架", upcoming: "即将", all: "全部", allTypes: "全部类型", none: "没有符合条件的动态。", more: "全部全球上币", notice: "官方公告", empty: "近 30 天暂无全球交易所上币动态。", checked: "{t} 已检查", stale: "暂时无法连接" },
    listingsTitle: "交易所上币动态", listingsDesc: "币安、OKX、Bybit、Coinbase、Upbit、Bithumb 的现货与合约上币、警示及下架公告，一个列表按时段整理。",
    slots: [["上午", 6, 12], ["下午", 12, 18], ["晚间", 18, 24], ["凌晨", 0, 6]], today: "今天", yday: "昨天", nNew: "新币 {n}", none: "该时段暂无动态。", wkS: "最近", wkU: "天", nIt: "{n} 条", nItS: "{n} 条", qSlots: "{s} 暂无动态", qDay: "当天没有交易所动态。", wkNone: "最近 7 天没有交易所动态。", qJoin: "、",
    ty: { listing: "新上币", futures: "合约上线", delisting: "终止交易", caution: "警示", "caution-cleared": "解除警示" }, exAll: "全部", typeAll: "全部类型", tyF: [["listing", "上币"], ["futures", "合约"], ["caution", "警示"], ["delisting", "下架"]], lsEx: "6 家交易所", soonT: "即将", soonX: "以公告时间为准", fe: "没有符合条件的动态。",
    notice: "官方公告（韩文）", lsNote: "时间为香港时间（HKT）。每 15 分钟检查交易所公告与市场列表，全球交易所仅转载公告标题与链接。右侧为 Upbit/Bithumb 韩元价格与 24 小时涨跌。不收录代币化股票与股票合约。",
    updated: "{t} 更新", every15: "每 15 分钟检查",
    surgeTitle: "异动雷达", surgeDesc: "Upbit、Bithumb 韩元市场实时异动：5 分钟急涨、成交放量、52 周新高、新币表现与交易所价差。",
    newsTitle: "新闻", catAll: "全部", catN: "{n} 篇", catOther: "其他栏目", catAria: "按栏目浏览", catDek: { 政策: "法案、税制与监管——规则改变市场结构的地方。", 市场: "价格与资金流向，以及背后的原因。", 产业: "企业与项目，资金流动的方向。", 交易所: "上币、警示与交易所之间的竞争。", 技术: "协议与安全，代码带来的改变。", 海外: "全球主要市场与监管机构的动向。" }, editorial: "链报分析", region: "香港 · 新加坡",
    ccLabel: "相关币种", ccAria: "相关币种 · 当前价格与 24 小时涨跌",
    marketTitle: "实时行情", marketDesc: "全球美元价格与 Upbit 韩元价格，每分钟更新。",
    kimpNote: "每分钟更新。",
    th: ["币种", "美元", "Upbit 韩元", "24H", "成交额"],
    contactPage: "爆料、广告与合作", contactBody: `通过 Telegram 给我们留言，我们会尽快回复。若按钮无法打开，请在 Telegram 中搜索 @${cfg.telegram}。`, copyId: "复制 ID", weTake: "我们受理", weTakeL: ["新闻爆料", "广告与横幅合作", "交易所与项目合作", "更正请求"],
    notFound: "页面不存在", notFoundX: "该页面已移动或已删除。",
    slideRead: "阅读全文", slideListings: "本周 6 家交易所新上币 {n} 个", slideListingsCta: "查看上币", slideSurge: "此刻涨得最快的币", slideSurgeX: "5 分钟急涨、成交放量、52 周新高与新币表现，一屏看全。", slideSurgeCta: "打开雷达",
    cf: ["比特币 · 美元", "", "市场情绪", "新上币 · 7 天", "分析"], cfBasis: "Upbit BTC",
    surgeHero: [["5 分钟急涨", "以 1 分钟 K 线追踪过去 5 分钟涨幅最大的币。"], ["成交放量", "成交额达到平时 5 分钟均值 1.5 倍以上的币。"], ["52 周新高 · 新币成绩单", "接近高点的币，以及近 30 天新上币的表现。"]],
    marketHero: [["美元与韩元，一目了然", "全球价格与 Upbit 韩元价格并列，每分钟更新。"]],
    surgeUI: { exUp: "Upbit", exBt: "Bithumb", vol: "成交额", volAll: "全部", vol10: "10亿韩元+", vol100: "100亿韩元+", q: "搜索币种（BTC、XRP…）", grp: [["Right Now", "短线信号"], ["24 Hours", "今日涨跌"], ["Momentum", "新高 · 新币"]],
      boards: { rkShort: ["5 Min", "5 分钟急涨", "最近 5 分钟 · 1 分钟 K 线"], rkSpike: ["Volume Spike", "成交放量", "最近 5 分钟成交额 ÷ 平时 5 分钟均值"], rkUp: ["Top Gainers", "涨幅榜"], rkDown: ["Top Losers", "跌幅榜"], rkVol: ["Volume", "成交额榜"], rkGap: ["Upbit vs Bithumb", "交易所价差", "同一币种在 Upbit 与 Bithumb 的韩元价差"], rkHigh: ["52-Week High", "接近 52 周新高", "现价 vs 52 周最高价"], rkList: ["New Listings", "新币成绩单", "近 30 天上币 · 相对首日开盘价"] },
      note: "韩元市场。24 小时涨跌相对前一日收盘，短线指标基于 1 分钟 K 线。点击可跳转交易所图表。仅供参考，不构成投资建议。" },
    t: { locale: "zh-CN", tz: "Asia/Hong_Kong", now: "刚刚", min: "分钟前", hr: "小时前", day: "天前", yday: "昨日 ", newN: "有 {n} 条新快讯", basis: "{src} BTC", upbit: "Upbit", bithumb: "Bithumb", asOf: "{t} HKT", priceErr: "行情加载失败，稍后自动重试。", won: "", wonPre: "₩", copied: "已复制", expand: "展开全文", collapse: "收起",
      fng: { "Extreme Fear": "极度恐惧", Fear: "恐惧", Neutral: "中性", Greed: "贪婪", "Extreme Greed": "极度贪婪" },
      surge: { upbit: "Upbit", bithumb: "Bithumb", locale: "zh-CN", won: "", wonPre: "₩", fallback: "{a} 连接延迟 — 正在显示 {b}", updated: "{ex} · {t} 更新 · 每 20 秒", retrying: "{ex} 连接延迟 — 自动重试中", loading: "加载中…",
        fail: "暂时无法获取 {ex} 行情（请求限制或故障），正在自动重试。", failSwitch: " — 可在上方切换交易所。", noMatch: "没有符合条件的币种", noRise5: "过去 5 分钟没有上涨的币", collecting: "正在收集 1 分钟 K 线…",
        times: "{n} 倍", min5: "5分钟", spike: "放量", noSpike: "目前没有成交额超过平时 1.5 倍的币。", newHigh: "新高", hi52: "52 周高点 {p}", todayHigh: "今日新高", noHigh: "没有距 52 周高点 10% 以内的币。", noHiData: "该交易所不提供 52 周高点数据。",
        sUpDn: "上涨 · 下跌", sAvg: "平均涨跌", sVol: "24 小时成交额", sTop: "今日最大涨幅", coins: "{n} 个币种", krwMkt: "{ex} 韩元市场", gapNeed: "需要两家交易所行情 — 正在重试。", gapSub: "Upbit {a} · Bithumb {b}", noGap: "暂无明显价差。",
        lsLoading: "正在加载上币记录…", lsFail: "无法加载近期新币行情。", lsSub: "{d} 上线 · {ex} · 最高 {m}" } },
    ads: {
      blockkey: { title: "AI 营销 · AI 开发 · 区块链对接", text: "从诊断、搭建到运营，一个团队全程负责的 Web3 技术伙伴。", cta: "了解 BLOCKKEY", short: "AI 营销 · 开发 · 区块链", top: "Partner" },
      perpline: { title: "交易手续费，返还给你。", text: "比较 11 家合约交易所的手续费，每周以 USDT 返还 40–60% 的交易手续费。", cta: "访问 Perpline", short: "Trading fees, returned.", note: "不面向韩国及美国居民。", top: "Partner" },
    },
    partnersT: "Partners", partnersX: "合作伙伴", sponsored: "Sponsored", byText: "作者", homeLabel: "首页", readT: "阅读约 {n} 分钟",
    S: { title: "搜索", desc: "搜索链报分析与 7×24 快讯", aside: "分析 {a} 篇 · 快讯 {f} 条", ph: "币种、人物、关键词（如：比特币 ETF）", try: "热门搜索", all: "全部", arts: "分析", flash: "快讯", nojs: "搜索功能需要启用 JavaScript。",
      js: { locale: "zh-CN", tz: "Asia/Hong_Kong", art: "分析", fl: "快讯", found: "“{q}”共 {n} 条结果", none: "没有与“{q}”相关的内容，换个关键词试试。", hint: "可搜索标题、摘要、正文、分类与作者。", loading: "正在加载索引…", fail: "搜索索引加载失败，请刷新页面。" } },
  },
};
const LANGS = [["ko", "KO", ""], ["en", "EN", "en/"], ["zh", "中文", "zh/"]];
/* ---------- 편집국·개인정보처리방침 (EN·中文) ---------- */
const ABOUT = {
  en: {
    staff: { "Scott Park": { slug: "scott-park", desk: "Daily News", beat: "Explains the day's blockchain stories for readers in the US, Europe and Singapore.", formats: ["Analysis"] } },
    newsroom: "Newsroom", newsroomDesc: "The CHAINBRIEF reporters and what they cover", nStories: "{n} stories", soon: "The first story is on its way.",
    newsroomNote: "CHAINBRIEF stories are reported, checked and published by our newsroom. Send corrections and tips through", contactL: "Contact",
    privacyT: "Privacy Policy", privacyDesc: "Privacy policy for the CHAINBRIEF website and apps", effective: "Effective October 26, 2026.",
    privacy: [
      ["", "CHAINBRIEF (the “service”) handles as little personal information as possible on its website and its iOS and Android apps."],
      ["What we collect", "There are no accounts. We do not collect names, contact details, location or advertising identifiers. The language, appearance and saved stories you choose in the app stay on your device and are never sent to our servers."],
      ["Third-party services", "To show prices and indicators, the website and apps connect directly to the public APIs of CoinGecko, Upbit, Bithumb and Alternative.me. Those services may keep standard connection logs, such as IP addresses, under their own policies. The website is served by GitHub Pages and loads fonts from Google Fonts."],
      ["Partners and outside links", "The service shows partner banners (BLOCKKEY, Perpline) and links to outside stories. Following a link takes you to that site, where its own privacy policy applies. We use no ad tracking."],
      ["Contact", "Send privacy questions to Telegram @{tg}."],
    ],
    about: "About",
  },
  zh: {
    staff: { "Scott Park": { slug: "scott-park", desk: "每日新闻", beat: "为香港、新加坡及全球读者解读当日区块链要闻。", formats: ["分析"] } },
    newsroom: "编辑部", newsroomDesc: "链报编辑部记者与报道领域", nStories: "{n} 篇", soon: "首篇文章即将发布。",
    newsroomNote: "链报文章由编辑部采访、核实后发布。更正与爆料请通过", contactL: "联系我们",
    privacyT: "隐私政策", privacyDesc: "链报网站与应用的隐私政策", effective: "生效日期：2026 年 10 月 26 日。",
    privacy: [
      ["", "链报（CHAINBRIEF，以下简称“本服务”）在网站及 iOS、安卓应用中仅处理最少量的个人信息。"],
      ["我们收集的信息", "本服务无需注册，不收集姓名、联系方式、位置或广告标识符等可识别个人的信息。你在应用中选择的语言、显示模式与收藏的文章只保存在你的设备上，不会传送到我们的服务器。"],
      ["第三方服务", "为显示行情与指标，网站和应用会直接连接 CoinGecko、Upbit、Bithumb 与 Alternative.me 的公开接口。上述服务可能按其各自政策保留一般访问记录（如 IP 地址）。网站由 GitHub Pages 提供，字体来自 Google Fonts。"],
      ["合作伙伴与外部链接", "本服务展示合作伙伴（BLOCKKEY、Perpline）横幅及外部文章链接。点击后将前往相应网站，并适用该网站的隐私政策。本服务不使用广告追踪工具。"],
      ["联系方式", "如有隐私相关问题，请通过 Telegram @{tg} 联系我们。"],
    ],
    about: "About",
  },
};

const SHARED_PAGES = ["", "flash/", "listings/", "surge/", "news/", "market/", "contact/", "search/"];

const ICON = {
  live: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="1.6"/>',
  surge: '<path d="M4 18 10 12l4 4 6-8"/><path d="M15 8h5v5"/>',
  news: '<rect x="4" y="4" width="16" height="16"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  mkt: '<path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
};
const TG_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 3.6 2.9 10.8c-1.3.5-1.3 1.2-.2 1.6l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.6.2 1.8-.8l3.2-15.2c.3-1.3-.5-1.9-1.4-1.6zM8.6 13.6l9.6-6c.5-.3.9-.1.5.2l-8.2 7.4-.3 3.4z"/></svg>';
const ART = { Policy: "sage-bands", Markets: "gold-silk", Industry: "light-grid", Exchanges: "light-grid", Technology: "contour", Global: "blue-hour", 政策: "sage-bands", 市场: "gold-silk", 产业: "light-grid", 交易所: "light-grid", 技术: "contour", 海外: "blue-hour" };
const ART_POOL = ["blue-hour", "rose-dusk", "gold-silk", "prism", "contour", "smoke", "sage-bands", "light-grid"];
const EXN = EX_ALL;

const ART_V = (() => { const d = path.join(ROOT, "public/art"); const h = crypto.createHash("md5"); try { for (const f of fs.readdirSync(d).sort()) h.update(fs.readFileSync(path.join(d, f))); } catch {} return h.digest("hex").slice(0, 8); })();
for (const L of [ED.en, ED.zh]) {
  const P = `${L.code}/`;
  const CH = tgChan(cfg, L.code);
  const chRail = CH ? CH.rail : "";
  const u = (p = "") => BASE + P + p.replace(/^\//, "");
  const abs = (p) => SITE_URL + u(p);
  const fmt = (d, o) => new Intl.DateTimeFormat(L.locale, { timeZone: L.tz, ...o }).format(d);
  const hhmm = (d) => fmt(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const dayLabel = (d) => fmt(d, { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  const dayKey = (d) => new Intl.DateTimeFormat("sv-SE", { timeZone: L.tz }).format(d);
  const hourOf = (d) => parseInt(fmt(d, { hour: "2-digit", hourCycle: "h23" }).replace(/\D/g, ""), 10) % 24;
  // 읽는 시간: EN 230단어/분, ZH 450자/분
  const A = ABOUT[L.code];
  const staffOf = (name) => A.staff[name];
  const byName = (name) => { const r = staffOf(name); return r ? `<a href="${u(`authors/${r.slug}/`)}"><b>${esc(name)}</b></a>` : `<b>${esc(name || L.name)}</b>`; };
  const readMin = (md = "", lg) => String(Math.max(1, Math.round(lg === "en" ? md.split(/\s+/).filter(Boolean).length / 230 : md.replace(/\s+/g, "").length / 450)));
  const fullDate = (d) => fmt(d, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) + " " + L.tzL;
  const fm = (s, o) => Object.entries(o).reduce((a, [k, v]) => a.replaceAll("{" + k + "}", v), s);

  const flashes = readDir(`content/${L.code}/flash`).map((f) => ({ ...f, date: new Date(f.time), important: f.important === true }))
    .filter((f) => !isNaN(f.date) && f.date <= new Date(Date.now() + 60_000)).sort((a, b) => b.date - a.date);
  const articles = readDir(`content/${L.code}/articles`).map((a) => ({ ...a, date: new Date(a.date) }))
    .filter((a) => !isNaN(a.date) && a.date <= new Date(Date.now() + 60_000)).sort((a, b) => b.date - a.date);
  let hl = allHL.filter((h) => h.lang === (L.code === "zh" ? "zh" : "en"));
  if (L.code === "zh" && hl.length < 6) hl = [...hl, ...allHL.filter((h) => h.lang === "en")];
  const ADS = (cfg.ads || []).map((a) => ({ ...a, ...(L.ads[a.id] || {}), topEyebrow: L.ads[a.id]?.top || a.topEyebrow, eyebrow: "Partner" }));

  const langSwitch = (active) => `<span class="langs" aria-label="Language">${LANGS.map(([c, lab, pre]) => {
    const path = SHARED_PAGES.includes(active) ? active : "";
    return `<a href="${asset(pre + path)}" hreflang="${c === "zh" ? "zh-Hans" : c}"${c === L.code ? ' aria-current="true"' : ""}>${lab}</a>`;
  }).join("")}</span>`;
  const topAd = (ad, side, mobile = false) => !ad ? "<span></span>" : `<a class="topad ${side}${mobile ? " m" : ""}" href="${esc(ad.url)}" target="_blank" rel="noopener sponsored" title="${esc(ad.note || ad.title)}"><span class="ta-l">${esc(ad.topEyebrow || "Partner")}${ad.id === "perpline" ? '<span class="ta-x"><i> · </i>Global</span>' : ""}</span><span class="ta-wm">${esc(ad.wordmark)}</span><span class="ta-t">${esc(ad.short || ad.title)}</span></a>`;
  const adCard = (ad, cls = "") => `<a class="ad ${cls}" href="${esc(ad.url)}" target="_blank" rel="noopener sponsored"><span class="ad-eye"><span>Partner</span><span>AD</span></span><span class="ad-wm">${esc(ad.wordmark)}</span><span class="ad-t">${esc(ad.title)}</span><span class="ad-x">${esc(ad.text)}</span><span class="ad-cta">${esc(ad.cta)} <span aria-hidden="true">→</span></span>${ad.note ? `<span class="ad-n">${esc(ad.note)}</span>` : ""}</a>`;
  const adBand = ADS.length ? `<section class="adband" aria-label="${esc(L.partnersT)}"><div class="wrap"><div class="adband-head"><span class="label">${esc(L.partnersT)}</span><span class="label">${esc(L.partnersX)}</span></div><div class="ads">${ADS.map((a) => adCard(a)).join("")}</div></div></section>` : "";

  function layout({ title, description = L.description, active = "", body, canonical = "", type = "website", extraScript = "", float = true }) {
    const navA = active === "flash/" ? "" : active; // 속보 아카이브는 Live 메뉴로 표시
    const full = title ? `${title} | ${L.name}` : `${L.name} — ${L.tagline}`;
    const tape = cfg.coins.slice(0, 6).map((c) => `<a href="${u("market/")}" data-tape="${c.id}"><span class="sym">${c.symbol}</span><span class="num p">—</span>&nbsp;<span class="num c"></span></a>`).join("");
    // hreflang은 세 에디션에 같은 페이지가 있는 섹션 페이지에만 (기사·속보는 에디션마다 다른 글이라 제외) + x-default=KO
    const alt = SHARED_PAGES.includes(active) && canonical === active && SITE_URL ? LANGS.map(([c, , pre]) => `<link rel="alternate" hreflang="${c === "zh" ? "zh-Hans" : c}" href="${SITE_URL}${asset(pre + active)}">`).join("") + `<link rel="alternate" hreflang="x-default" href="${SITE_URL}${asset(active)}">` : "";
    return `<!doctype html>
<html lang="${L.html}">
<head>
<meta charset="utf-8">
<script>try{if(/[?&](utm_source=(meta|facebook|instagram|fb|ig)|cb=ad)(&|$)/i.test(location.search))sessionStorage.setItem("cbAd","1");if(sessionStorage.getItem("cbAd")==="1")document.documentElement.classList.add("adclean")}catch(e){}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${canonical !== null && SITE_URL ? `<link rel="canonical" href="${abs(canonical)}">` : ""}${alt}
<meta property="og:type" content="${type}"><meta property="og:site_name" content="${esc(L.name)}"><meta property="og:title" content="${esc(title || L.name)}"><meta property="og:description" content="${esc(description)}">
${SITE_URL ? `${canonical !== null ? `<meta property="og:url" content="${abs(canonical)}">` : ""}<meta property="og:image" content="${SITE_URL}${asset("og.png")}?v=2">` : ""}
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0A0A0A">
<link rel="manifest" href="${asset("manifest.webmanifest")}"><link rel="icon" href="${asset("icons/icon-192.png")}" type="image/png"><link rel="apple-touch-icon" href="${asset("icons/apple-touch-icon.png")}">
<link rel="alternate" type="application/rss+xml" title="${esc(L.name)}" href="${u("rss.xml")}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${L.fonts}&display=swap">
<link rel="stylesheet" href="${asset("style.css")}?v=${BUILD_ID}">
</head>
<body data-hue="${({ "": "klein", "listings/": "butter", "surge/": "coral", "news/": "lavender", "market/": "klein", "contact/": "coral" })[active] || "klein"}">
<div class="topline"><div class="wrap"><span class="tl-l">${langSwitch(active)}<span class="tl-date">${esc(dayLabel(NOW))}</span></span><span class="tl-r">${CH ? CH.topline : ""}<a class="tl-search" href="${u("search/")}" aria-label="${esc(L.S.title)}">${SEARCH_SVG}</a><button class="install" id="installBtn" type="button" hidden>App</button><span class="live"><i></i>Live <span class="num" id="clock">${hhmm(NOW)}</span> ${L.tzL}</span></span></div></div>
<header class="site-header">
  <div class="wrap brand">${topAd(ADS[0], "l")}<a class="wm" href="${u()}" aria-label="${esc(L.name)} ${esc(L.homeLabel)}">CHAINBRIEF</a>${topAd(ADS[1], "r")}</div>
  <nav class="top"><a class="nav-wm" href="${u()}" tabindex="-1" aria-hidden="true">CHAINBRIEF</a>${L.nav.map(([p, l]) => `<a href="${u(p)}"${navA === p ? ' aria-current="page"' : ""}>${l}</a>`).join("")}<a class="nav-search" href="${u("search/")}"${active === "search/" ? ' aria-current="page"' : ""} aria-label="${esc(L.S.title)}" title="${esc(L.S.title)} ( / )">${SEARCH_SVG}</a></nav>
</header>
<div class="tape"><div class="wrap">${tape}</div></div>
${ADS.length >= 2 ? `<div class="topads-m">${topAd(ADS[0], "l", true)}${topAd(ADS[1], "r", true)}</div>` : ""}
${body}
${adBand}
<footer class="site-footer"><div class="cbar" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="wrap">
  <div class="ft-top">
    <div class="ft-brand"><a class="wm" href="${u()}">CHAINBRIEF</a><p>${esc(L.tagline)}</p></div>
    <div class="ft-col"><span class="label">Sections</span>${L.nav.map(([p, l]) => `<a href="${u(p)}">${l}</a>`).join("")}</div>
    <div class="ft-col"><span class="label">Editions</span><a href="${asset("")}" lang="ko">한국어</a><a href="${asset("en/")}" lang="en">English</a><a href="${asset("zh/")}" lang="zh-Hans">中文</a></div>
    <div class="ft-col"><span class="label">Contact</span>${CH ? CH.footer : ""}${TG ? `<a href="${TG}" target="_blank" rel="noopener">${L.code === "zh" ? "联系" : "Contact"} @${esc(cfg.telegram)}</a>` : ""}<a href="${u("contact/")}">${esc(L.contactT)}</a><a href="${u("rss.xml")}">RSS</a>${cfg.impact ? `<a href="${cfg.impact.url}" target="_blank" rel="noopener">${esc(cfg.impact[L.code]?.title || cfg.impact.name)}</a>` : ""}</div>
    <div class="ft-col"><span class="label">About</span><a href="${u("authors/")}">${esc(ABOUT[L.code].newsroom)}</a><a href="${u("privacy/")}">${esc(ABOUT[L.code].privacyT)}</a></div>
  </div>
  <p class="ft-legal">${esc(L.disclaimer)}</p>
  <div class="ft-base"><span>© ${NOW.getFullYear()} CHAINBRIEF</span><span>Seoul · Hong Kong · Singapore</span></div>
</div></footer>
${float && TG ? `<a class="tg-float" href="${TG}" target="_blank" rel="noopener" aria-label="Telegram">${TG_SVG}<span>${L.code === "zh" ? "联系" : "Contact"}</span></a>` : ""}
<nav class="tabs">${L.tabs.map(([p, l, ic]) => `<a href="${u(p)}"${navA === p ? ' aria-current="page"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[ic]}</svg>${l}</a>`).join("")}<button type="button" class="tab-menu" data-navsheet aria-expanded="false" aria-controls="navsheet"${L.tabs.some(([p]) => p === navA) ? "" : ' aria-current="page"'}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON.menu}</svg>${esc(L.menuL)}</button></nav>
<div class="navsheet" id="navsheet" hidden><div class="ns-bg" data-ns-close></div><div class="ns-panel" role="dialog" aria-label="${esc(L.menuL)}"><div class="ns-head"><span class="label">Menu</span><button type="button" class="ns-x" data-ns-close aria-label="${esc(L.closeL)}">×</button></div>
<nav class="ns-links">${L.nav.map(([p, l]) => `<a href="${u(p)}"${navA === p ? ' aria-current="page"' : ""}>${l}</a>`).join("")}<a href="${u("search/")}">${esc(L.searchL)}</a></nav>
<div class="ns-langs"><a href="${asset("")}" lang="ko">한국어</a><a href="${asset("en/")}" lang="en"${L.code === "en" ? ' aria-current="true"' : ""}>English</a><a href="${asset("zh/")}" lang="zh-Hans"${L.code === "zh" ? ' aria-current="true"' : ""}>中文</a></div></div></div>
<script>window.CB=${JSON.stringify({ base: BASE, searchUrl: u("search/"), coins: cfg.coins.map((c) => ({ ...c, name: c.symbol })), latest: flashes[0]?.id || "", flashUrl: u("flash.json"), sb: {}, t: L.t })}</script>
<script src="${asset("app.js")}?v=${BUILD_ID}" defer></script>
<script src="${asset("xsheet.js")}?v=${BUILD_ID}" defer></script>
${extraScript ? `<script src="${asset(extraScript)}?v=${BUILD_ID}" defer></script>` : ""}
<script src="https://probe2928-crypto.github.io/chainbrief/network.js" data-site="chainbrief" defer></script>
</body>
</html>`;
  }
  const secHead = (label, title, aside = "", tag = "h1") => `<div class="sec"><div><span class="label">${label}</span><${tag}>${title}</${tag}></div>${aside ? `<div class="aside">${aside}</div>` : ""}</div>`;

  // 히어로
  const artImg = (name, eager) => eager
    ? `<picture class="slide-bg"><source media="(max-width:700px)" srcset="${asset(`art/${name}-m.jpg`)}?v=${ART_V}"><img src="${asset(`art/${name}.jpg`)}?v=${ART_V}" alt="" fetchpriority="high" decoding="async"></picture>`
    : `<picture class="slide-bg"><source media="(max-width:700px)" data-srcset="${asset(`art/${name}-m.jpg`)}?v=${ART_V}"><img data-src="${asset(`art/${name}.jpg`)}?v=${ART_V}" alt="" decoding="async"></picture>`;
  function hero(slides, size = "lg") {
    if (!slides.length) return "";
    const used = new Set();
    const pick = (want) => { const a = [want, ...ART_POOL].filter(Boolean).find((x) => !used.has(x)) || ART_POOL[0]; used.add(a); return a; };
    const ext = (h) => /^https?:/.test(h) ? ' target="_blank" rel="noopener nofollow"' : "";
    return `<section class="hero hero-${size}" data-hero aria-roledescription="carousel">
  <div class="hero-track">${slides.map((sl, i) => `<article class="slide${i ? "" : " is-active"}" aria-roledescription="slide"${i ? ' aria-hidden="true"' : ""}>${artImg(pick(sl.art), !i)}<div class="slide-shade"></div>
    <div class="wrap slide-body"><span class="slide-eye">${sl.eye}</span><h2 class="slide-t"><a href="${esc(sl.href)}"${ext(sl.href)}>${esc(sl.title)}</a></h2>${sl.dek ? `<p class="slide-d">${esc(sl.dek)}</p>` : ""}<a class="slide-cta" href="${esc(sl.href)}"${ext(sl.href)} tabindex="-1">${esc(sl.cta)} <span aria-hidden="true">→</span></a></div></article>`).join("")}</div>
  ${slides.length > 1 ? `<div class="wrap hero-ui"><div class="hero-bars">${slides.map((_, i) => `<button type="button" class="hero-bar" aria-label="${i + 1}"><i></i></button>`).join("")}</div><span class="hero-count num"><b>01</b> / ${String(slides.length).padStart(2, "0")}</span><button type="button" class="hero-nav" data-dir="-1" aria-label="Previous">←</button><button type="button" class="hero-nav" data-dir="1" aria-label="Next">→</button></div>` : ""}
</section>`;
  }
  const artSlide = (a) => ({ art: ART[a.category], eye: `${esc(a.region || a.category || "")} · ${esc(a.author || L.name)}`, title: a.title, dek: a.summary || plain(a.body).slice(0, 140), href: u(`articles/${a.id}/`), cta: L.slideRead });

  // 파츠
  const chips = (t, b) => coinChips(coinsIn(t, b), { coins: cfg.coins, href: u("market/"), label: esc(L.ccAria) });
  const ccLine = (t, b) => coinsIn(t, b).length ? `<p class="cc-line"><span class="cc-l">${esc(L.ccLabel)}</span>${chips(t, b)}</p>` : "";
  const flashItem = (f) => `<article class="item${f.important ? " imp" : ""}" data-cat="${esc(f.category || "")}" data-imp="${f.important ? 1 : 0}"><time datetime="${f.date.toISOString()}">${hhmm(f.date)}</time><div style="min-width:0"><h3><a href="${u(`flash/${f.id}/`)}">${esc(f.title)}</a></h3>${f.body ? `<div class="body">${markdown(f.body)}</div>` : ""}<div class="meta">${f.important ? `<span class="tag hot">${esc(L.breaking)}</span>` : ""}${f.category ? `<span class="tag kr">${esc(f.category)}</span>` : ""}${chips(f.title, f.body)}</div></div></article>`;
  function feedHTML(list, inline = "", at = 6) {
    if (!list.length) return `<div class="empty">${esc(L.emptyFeed)}</div>`;
    let out = "", last = "", n = 0;
    for (const f of list) { const k = dayKey(f.date); if (k !== last) { out += `<div class="day" id="d-${k}"><span class="day-n">${+k.slice(-2)}</span><span class="day-l">${fmt(f.date, { month: "long" })}${L.locale.startsWith("zh") ? " " : " · "}${fmt(f.date, { weekday: "long" })}</span><span class="day-y num">${k.slice(0, 4)}</span></div>`; last = k; } out += flashItem(f); if (inline && ++n === at) out += inline; }
    return out;
  }
  const headlineList = (items) => items.length ? `<ul class="hl">${items.map((h) => `<li><a href="${esc(h.url)}" target="_blank" rel="noopener nofollow">${esc(h.title)}</a><span class="src"><b>${esc(h.source)}</b><time data-rel="${h.date.toISOString()}">${fmt(h.date, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</time></span></li>`).join("")}</ul>` : `<div class="empty">—</div>`;
  const listingItem = (i, compact = false) => {
    const c = i.coins[0] || { symbol: "" };
    return `<div class="lst" data-ex="${i.exchange}" data-type="${i.type}" data-sym="${esc(c.symbol)}"><time>${hhmm(i.date)}</time><div style="min-width:0"><div class="meta" style="margin:0 0 6px"><span class="ex">${EXN[i.exchange]}</span><span class="ty ${i.type}">${esc(L.ty[i.type] || "")}</span>${i.markets?.length ? `<span>${i.markets.join(" · ")}</span>` : ""}</div><div class="coin">${esc(i.coins.map((x) => x.symbol).join(" · "))}</div>${compact ? "" : `<div class="t"><a href="${esc(i.url)}" target="_blank" rel="noopener nofollow"${i.global ? ' lang="en"' : ""}>${esc(i.global ? i.title : L.notice)}</a></div>`}</div><div class="px"${isKR(i) ? " data-px" : ""}>${isKR(i) && i.type === "listing" ? "—" : ""}</div></div>`;
  };
  const marketRail = `<section class="block desk-only"><div class="block-head"><h2>${esc(L.marketsT)}</h2><span class="label">USD · 24H</span></div><table><tbody>${cfg.coins.slice(0, 6).map((c) => `<tr data-row="${c.id}"><td><span class="sym">${c.symbol}</span></td><td class="num p">—</td><td class="num c"></td></tr>`).join("")}</tbody></table><a class="more" href="${u("market/")}">${esc(L.allMarkets)}</a></section>`;
  const sentiment = `<section class="block"><div class="block-head"><h2>${esc(L.moodT)}</h2><span class="label">Fear &amp; Greed</span></div><div class="gauge"><div class="row"><span class="big" id="fngVal">—</span><span class="lbl" id="fngLbl"></span><span id="fngPrev" style="margin-left:auto;font-size:12px;color:var(--mute)"></span></div><div class="bar"><i id="fngBar" style="left:50%"></i></div><div class="scale"><span>Fear</span><span>Neutral</span><span>Greed</span></div></div><div class="kp"><div><small>${esc(L.dom)}</small><strong class="num" id="btcDom">—</strong></div></div></section>`;
  const recentL = allLs.filter((i) => isNew(i) && i.date <= NOW).slice(0, 5);
  const relDay = (d) => { const k = dayKey(d); return k === dayKey(NOW) ? L.today : L.code === "zh" && k === dayKey(new Date(NOW.getTime() - 864e5)) ? L.yday : L.code === "zh" ? fmt(d, { month: "numeric", day: "numeric" }) : fmt(d, { month: "short", day: "numeric" }); };
  const listingRailItem = (i) => { const c = i.coins[0] || { symbol: "" }; return `<div class="lst c" data-ex="${i.exchange}" data-type="${i.type}" data-sym="${esc(c.symbol)}"><time datetime="${i.date.toISOString()}"><span class="lc-d">${esc(relDay(i.date))}</span><span class="lc-h num">${hhmm(i.date)}</span></time><div style="min-width:0"><div class="coin">${esc(i.coins.map((x) => x.symbol).join(" · "))}</div><div class="lc-m"><span class="lc-ex">${EXN[i.exchange]}</span><span class="ty ${i.type}">${esc(L.ty[i.type] || "")}</span>${i.markets?.length ? `<span class="lc-mk">${i.markets.join(" · ")}</span>` : ""}</div></div><div class="px"${isKR(i) ? " data-px" : ""}>${isKR(i) && i.type === "listing" ? "—" : ""}</div></div>`; };
  const listingRail = `<section class="block"><div class="block-head"><h2>${esc(L.koreaListings)}</h2><span class="label">All Exchanges</span></div>${recentL.map(listingRailItem).join("")}<a class="more" href="${u("listings/")}">${esc(L.allListings)}</a></section>`;
  const contactRail = TG ? `<section class="block slot"><span class="label">Contact</span><strong>${esc(L.contactT)}</strong><span>${esc(L.contactX)}</span><a class="btn ghost" href="${TG}" target="_blank" rel="noopener">${esc(L.openTg)}</a></section>` : "";
  const hlRail = `<section class="block"><div class="block-head"><h2>${esc(L.headlinesT)}</h2><span class="label">Global</span></div>${headlineList(hl.slice(0, 6))}<a class="more" href="${u("news/")}">${esc(L.more)}</a></section>`;
  const IM = cfg.impact && cfg.impact[L.code];
  const impactRail = IM ? `<section class="block slot impact"><span class="label">Impact</span><strong>${esc(IM.title)}</strong><span>${esc(IM.text)}</span><a class="btn ghost" href="${cfg.impact.url}${IM.path}" target="_blank" rel="noopener">${esc(IM.cta)}</a></section>` : "";
  const rail = (extra = "") => `<aside class="rail">${marketRail}${sentiment}${chRail}${extra}${impactRail}${contactRail}</aside>`;
  const CAT_SLUG = { Policy: "policy", Markets: "markets", Industry: "industry", Exchanges: "exchanges", Technology: "tech", Global: "global", 政策: "policy", 市场: "markets", 产业: "industry", 交易所: "exchanges", 技术: "tech", 海外: "global" };
  const catSlug = (c) => CAT_SLUG[c] || encodeURIComponent(String(c || "etc").toLowerCase().replace(/\s+/g, "-"));
  const catList = [...articles.reduce((m, a) => (a.category && m.set(a.category, (m.get(a.category) || 0) + 1), m), new Map()).entries()].sort((a, b) => b[1] - a[1]);
  const deskIndex = (cur = "") => catList.length > 1 ? `<nav class="desks" aria-label="${esc(L.catAria)}"><span class="label">Sections</span><ul>${[["", L.catAll, articles.length], ...catList.map(([c, n]) => [c, c, n])].map(([c, l, n]) => `<li><a href="${u(c ? `category/${catSlug(c)}/` : "news/")}"${c === cur ? ' aria-current="page"' : ""}>${esc(l)}<sup class="num">${n}</sup></a></li>`).join("")}</ul></nav>` : "";
  const card = (a) => `<a class="art" href="${u(`articles/${a.id}/`)}"><div class="meta" style="margin:0"><span class="tag kr">${esc(a.category || "")}</span>${a.region ? `<span class="tag fmt">${esc(a.region)}</span>` : ""}</div><h3>${esc(a.title)}</h3><p>${esc(a.summary || plain(a.body).slice(0, 140))}</p><div style="margin-top:10px"><span class="byline">${fmt(a.date, { month: "short", day: "numeric" })} · <b>${esc(a.author || L.name)}</b></span></div></a>`;

  // 홈
  const wk = allLs.filter((i) => isNew(i) && i.date <= NOW && NOW - i.date < 7 * 864e5);
  const homeSlides = [...articles.slice(0, 3).map(artSlide)];
  if (wk.length) homeSlides.push({ art: "light-grid", eye: "Listings · All Exchanges", title: fm(L.slideListings, { n: wk.length }), dek: [...new Set(wk.flatMap((i) => i.coins.map((c) => c.symbol)))].slice(0, 8).join(" · "), href: u("listings/"), cta: L.slideListingsCta });
  homeSlides.push({ art: "prism", eye: "Surge Radar", title: L.slideSurge, dek: L.slideSurgeX, href: u("surge/"), cta: L.slideSurgeCta });
  if (CH) homeSlides.splice(Math.min(2, homeSlides.length), 0, CH.slide);
  const topArt = articles[0];
  const colorField = `<section class="cfield"><div class="wrap cf-grid">
  <a class="cf cf-klein" href="${u("market/")}" data-tape="bitcoin"><span class="cf-l">${esc(L.cf[0])}</span><span class="cf-big p">—</span><span class="cf-s c"></span></a>
  <a class="cf cf-coral" href="${u("surge/")}"><span class="cf-l">${esc(L.cf[2])}</span><span class="cf-big" data-fng>—</span><span class="cf-s" data-fng-lbl>Fear &amp; Greed</span></a>
  <a class="cf cf-lavender" href="${u("listings/")}"><span class="cf-l">${esc(L.cf[3])}</span><span class="cf-big">${wk.length}</span><span class="cf-s">Global ${wk.filter((i) => !isKR(i)).length} · Korea ${wk.filter(isKR).length}</span></a>
  ${topArt ? `<a class="cf cf-olive cf-art" href="${u(`articles/${topArt.id}/`)}"><span class="cf-l">${esc(L.cf[4])} · ${esc(topArt.author || "")}</span><span class="cf-title">${esc(topArt.title)}</span><span class="cf-s">${esc(L.readMore)} →</span></a>` : ""}
</div></section>`;
  const cats = [["전체", L.all], ["중요", L.breaking], ...L.cats.map((c) => [c, c])];
  // 홈은 최근 2일 속보만 (최소 24·최대 40건) — 나머지는 /flash/ 아카이브
  const homeWire = (() => { const days = [...new Set(flashes.map((f) => dayKey(f.date)))].slice(0, 2); const l = flashes.filter((f) => days.includes(dayKey(f.date))); return (l.length < 24 ? flashes.slice(0, 24) : l).slice(0, 40); })();
  const wireMore = (rest, href, l1, l2) => `<a class="wire-more" href="${href}"><span class="wm-l">${esc(l1)}${rest > 0 ? ` <b class="num">${rest}</b>` : ""}</span><span class="wm-go">${esc(l2)} <span aria-hidden="true">→</span></span></a>`;
  const dayIndex = (list) => { const m = new Map(); for (const f of list) { const k = dayKey(f.date); if (!m.has(k)) m.set(k, { d: f.date, n: 0 }); m.get(k).n++; } return [...m.entries()].map(([k, v]) => `<a href="#d-${k}"><span class="di-n num">${+k.slice(-2)}</span><span class="di-l">${fmt(v.d, { month: "short" })} ${fmt(v.d, { weekday: "short" })}</span><span class="di-c">${esc(fm(L.wa.n, { n: v.n }))}</span></a>`).join(""); };
  write(`${P}index.html`, layout({
    active: "", canonical: "",
    body: `${hero(homeSlides, "lg")}${colorField}<div class="wrap"><main class="grid"><div class="col"><section>
    ${secHead("Live Wire", esc(L.liveTitle), `<label class="search"><span class="sr">${esc(L.search)}</span><input id="q" type="search" placeholder="${esc(L.search)}"></label>`)}
    <div class="tabs-row" id="filters">${cats.map(([k, l], i) => `<button class="tab${k === "중요" ? " hot" : ""}" type="button" data-c="${esc(k)}" aria-pressed="${i === 0}">${esc(l)}</button>`).join("")}</div>
    <div id="newWrap" hidden><button class="newpill" id="newBtn" type="button">${esc(L.newBtn)}</button></div>
    <div id="feed">${feedHTML(homeWire, CH ? CH.inline : "")}</div><div class="empty" id="noMatch" hidden>${esc(L.noMatch)}</div>
    ${wireMore(flashes.length - homeWire.length, u("flash/"), L.wa.earlier, L.wa.byDate)}
  </section></div>${rail(listingRail + hlRail)}</main></div>`,
  }));

  // 속보 아카이브 /flash/
  {
    const arch = flashes.slice(0, 400);
    const pick = [...flashes.filter((f) => f.important), ...flashes].filter((f, i, a) => a.indexOf(f) === i).slice(0, 4);
    const slides = pick.map((f) => ({ art: ART[f.category] || "blue-hour", eye: `${esc(L.wa.eye)} · ${esc(f.category || "")} · ${hhmm(f.date)}`, title: f.title, dek: plain(f.body || "").slice(0, 140), href: u(`flash/${f.id}/`), cta: L.wa.read }));
    write(`${P}flash/index.html`, layout({
      title: L.wa.title, description: fm(L.wa.desc, { n: arch.length }), active: "flash/", canonical: "flash/",
      body: `${hero(slides, "sm", L.wa.hero)}<div class="wrap"><main class="grid"><div class="col"><section>
    ${secHead("Wire Archive", esc(L.wa.title), `<label class="search"><span class="sr">${esc(L.search)}</span><input id="q" type="search" placeholder="${esc(L.search)}"></label>`)}
    <nav class="dayidx" aria-label="${esc(L.wa.dates)}"><span class="label">Dates</span><div class="di-row">${dayIndex(arch)}</div></nav>
    <div class="tabs-row" id="filters">${cats.map(([k, l], i) => `<button class="tab${k === "중요" ? " hot" : ""}" type="button" data-c="${esc(k)}" aria-pressed="${i === 0}">${esc(l)}</button>`).join("")}</div>
    <div id="newWrap" hidden><button class="newpill" id="newBtn" type="button">${esc(L.newBtn)}</button></div>
    <div id="feed">${feedHTML(arch)}</div><div class="empty" id="noMatch" hidden>${esc(L.noMatch)}</div>
    ${wireMore(0, u(), L.wa.backL, L.wa.back)}
  </section></div>${rail()}</main></div>`,
    }));
  }

  // 속보 상세
  flashes.forEach((f, i) => {
    const near = [flashes[i - 1], flashes[i + 1]].filter(Boolean);
    write(`${P}flash/${f.id}/index.html`, layout({
      title: f.title, description: plain(f.body || f.title).slice(0, 160), canonical: `flash/${f.id}/`, type: "article",
      body: `<div class="wrap"><p class="crumbs"><a href="${u()}">Live Wire</a><i class="sep" aria-hidden="true">/</i><span class="here">${esc(f.category || "")}</span></p><main class="grid"><div class="col"><article class="doc">
      <div class="kicker">${f.important ? `<span class="tag hot">${esc(L.breaking)}</span>` : ""}${f.category ? `<span class="tag kr">${esc(f.category)}</span>` : ""}<time class="byline">${fullDate(f.date)}</time></div>
      <h1>${esc(f.title)}</h1>${ccLine(f.title, f.body)}<div class="prose">${markdown(f.body || "")}</div>
      <div class="share"><button class="btn ghost" type="button" data-copy>${esc(L.copy)}</button><a class="btn" href="${u()}">${esc(L.toWire)}</a></div>${CH ? CH.card : ""}</article>
      ${near.length ? `<section>${secHead("Also", esc(L.alsoT), "", "h2")}${near.map(flashItem).join("")}</section>` : ""}</div>${rail()}</main></div>`,
    }));
  });

  // 상장 — 거래소 전체(해외+국내) 한 목록 + 예정
  const LS_EX = ["binance", "okx", "bybit", "coinbase", "upbit", "bithumb"];
  const days = [];
  for (let d = 0; d < 7; d++) { const date = new Date(NOW.getTime() - d * 864e5); const key = dayKey(date); days.push({ key, date, items: allLs.filter((i) => i.date <= NOW && dayKey(i.date) === key) }); }
  const soonLs = allLs.filter((i) => i.date > NOW && i.date - NOW < 30 * 864e5).reverse();
  const openIdx = -1; // 기본은 '7일' 한 목록
  const FE = ` data-fe="${esc(L.fe)}"`;
  const zhL = L.locale.startsWith("zh");
  const wkDays = days.filter((d) => d.items.length);
  const lsStamp = (d, n) => `<div class="day ls-day"><span class="day-n">${+dayKey(d).slice(-2)}</span><span class="day-l">${fmt(d, { month: "long" })}${zhL ? " " : " · "}${fmt(d, { weekday: "long" })}</span><span class="day-y">${esc(fm(L.nItS, { n }))}</span></div>`;
  const weekPanel = `<div class="daypanel" data-day="week">${wkDays.length ? wkDays.map((d) => `<section class="slotsec wk"${FE}>${lsStamp(d.date, d.items.length)}${d.items.map((i) => listingItem(i)).join("")}</section>`).join("") : `<div class="slot-empty">${esc(L.wkNone)}</div>`}</div>`;
  const dayPanel = (day, idx) => {
    const secs = L.slots.map(([nm, a, b]) => ({ nm, a, b, its: day.items.filter((i) => { const h = hourOf(i.date); return h >= a && h < b; }) }));
    const empty = secs.filter((x) => !x.its.length);
    return `<div class="daypanel" data-day="${day.key}"${idx !== openIdx ? " hidden" : ""}>${secs.filter((x) => x.its.length).map(({ nm, a, b, its }) => `<section class="slotsec"${FE}><h3>${esc(nm)} <span class="label">${String(a).padStart(2, "0")}–${String(b).padStart(2, "0")} ${L.tzL}</span></h3>${its.map((i) => listingItem(i)).join("")}</section>`).join("")}${empty.length === 4 ? `<div class="slot-quiet">${esc(L.qDay)}</div>` : empty.length ? `<div class="slot-quiet">${esc(fm(L.qSlots, { s: (zhL ? empty.map((x) => x.nm) : empty.map((x) => x.nm.toLowerCase())).join(L.qJoin) }))}</div>` : ""}</div>`;
  };
  const soonPanel = soonLs.length ? `<div class="daypanel" data-day="soon" hidden><section class="slotsec"${FE}><h3>${esc(L.soonT)} <span class="label">${esc(L.soonX)}</span></h3>${soonLs.map((i) => listingItem(i).replace(`<time>${hhmm(i.date)}</time>`, `<time>${esc(relDay(i.date))}<br>${hhmm(i.date)}</time>`)).join("")}</section></div>` : "";
  const lsHero = allLs.filter((i) => isNew(i) && i.date <= NOW).slice(0, 4);
  write(`${P}listings/index.html`, layout({
    title: L.listingsTitle, active: "listings/", canonical: "listings/", description: L.listingsDesc,
    body: `${hero(lsHero.map((i, k) => ({ art: ["light-grid", "gold-silk", "contour", "blue-hour"][k], eye: `${EXN[i.exchange]} · ${esc(L.ty[i.type])} · ${fmt(i.date, { month: "short", day: "numeric" })}`, title: i.coins.map((c) => c.symbol).join(" · "), dek: i.global ? i.title : `${EXN[i.exchange]} ${i.markets.join(" / ")}`, href: i.url, cta: i.global ? L.gl.notice : L.notice })), "sm")}<div class="wrap"><main class="grid"><div class="col"><section>
    ${secHead("Listings", esc(L.listingsTitle), `${esc(L.lsEx)} · ` + (listings.updatedAt ? `${fm(L.updated, { t: hhmm(new Date(listings.updatedAt)) + " " + L.tzL })} · ${L.every15}` : L.every15))}
    <div class="daytabs" id="daytabs"><button class="daytab wk" type="button" data-day="week" aria-pressed="true"><small>${esc(L.wkS)}</small><b>7<i>${esc(L.wkU)}</i></b><span class="cnt">${esc(fm(L.nItS, { n: days.reduce((n, d) => n + d.items.length, 0) }))}</span></button>${soonLs.length ? `<button class="daytab soon" type="button" data-day="soon" aria-pressed="false"><small>${esc(L.soonT)}</small><b>${soonLs.length}</b><span class="cnt">Soon</span></button>` : ""}${days.map((d, i) => { const nw = d.items.filter(isNew).length; return `<button class="daytab${d.items.length ? "" : " zero"}" type="button" data-day="${d.key}" aria-pressed="false"><small>${i === 0 ? L.today : i === 1 ? L.yday : fmt(d.date, { weekday: "short" })}</small><b>${new Intl.DateTimeFormat("en-US", { timeZone: L.tz, day: "numeric" }).format(d.date)}</b><span class="cnt">${d.items.length ? `${esc(fm(L.nIt, { n: d.items.length }))}${nw ? ` · <em>${esc(fm(L.nNew, { n: nw }))}</em>` : ""}` : "—"}</span></button>`; }).join("")}</div>
    <div class="tabs-row" id="lsFilters">${[["all", L.exAll], ...LS_EX.map((k) => [k, EXN[k]])].map(([k, l], i) => `<button class="tab${k !== "all" && !days.some((d) => d.items.some((x) => x.exchange === k)) ? " dim" : ""}" type="button" data-ex="${k}" aria-pressed="${i === 0}">${esc(l)}</button>`).join("")}<span class="ls-div" aria-hidden="true"></span>${[["all", L.typeAll], ...L.tyF].map(([k, l], i) => `<button class="tab" type="button" data-type="${k}" aria-pressed="${i === 0}">${esc(l)}</button>`).join("")}</div>
    <div id="daypanels">${weekPanel}${soonPanel}${days.map(dayPanel).join("")}</div>
    <p class="note">${esc(L.lsNote)}</p></section></div>${rail()}</main></div>`,
  }));

  // 급등
  const S = L.surgeUI;
  const board = (id) => { const [lab, title, note] = S.boards[id]; return `<section class="sboard"><div class="block-head"><h2>${esc(title)}</h2><span class="label">${lab}</span></div>${note ? `<p class="bnote">${esc(note)}</p>` : ""}<ol class="rank" id="${id}"><li class="msg-row"><span class="nm">${esc(L.t.surge.loading)}</span></li></ol></section>`; };
  write(`${P}surge/index.html`, layout({
    title: L.surgeTitle, active: "surge/", canonical: "surge/", extraScript: "surge.js", description: L.surgeDesc,
    body: `${hero(L.surgeHero.map(([t, d], k) => ({ art: ["prism", "blue-hour", "gold-silk"][k], eye: ["Right Now", "Volume Spike", "Momentum"][k], title: t, dek: d, href: ["#rkShort", "#rkSpike", "#rkHigh"][k], cta: L.code === "zh" ? "查看" : "View" })), "sm")}<div class="wrap"><main class="single wide-single" id="surgeApp"><section>
    ${secHead("Surge Radar", esc(L.surgeTitle), `<span class="status" id="surgeStatus">${esc(L.t.surge.loading)}</span>`)}
    <div class="controls"><div class="tabs-row" id="exSwitch"><button class="tab" type="button" data-ex="upbit" aria-pressed="true">${S.exUp}</button><button class="tab" type="button" data-ex="bithumb" aria-pressed="false">${S.exBt}</button></div>
    <div class="tabs-row" id="volFilter"><span class="label" style="align-self:center">${esc(S.vol)}</span>${[["0", S.volAll], ["1000000000", S.vol10], ["10000000000", S.vol100]].map(([k, l], i) => `<button class="tab" type="button" data-vol="${k}" aria-pressed="${i === 0}">${esc(l)}</button>`).join("")}</div>
    <label class="search"><span class="sr">${esc(S.q)}</span><input id="surgeQ" type="search" placeholder="${esc(S.q)}"></label></div>
    <div class="summary" id="surgeSummary"></div>
    <h3 class="grp"><span class="label">${S.grp[0][0]}</span>${esc(S.grp[0][1])}</h3><div class="surge">${board("rkShort")}${board("rkSpike")}</div>
    <h3 class="grp"><span class="label">${S.grp[1][0]}</span>${esc(S.grp[1][1])}</h3><div class="surge">${board("rkUp")}${board("rkDown")}${board("rkVol")}${board("rkGap")}</div>
    <h3 class="grp"><span class="label">${S.grp[2][0]}</span>${esc(S.grp[2][1])}</h3><div class="surge">${board("rkHigh")}${board("rkList")}</div>
    <p class="note">${esc(S.note)}</p></section></main></div>`,
  }));


  // 뉴스
  const srcs = [...new Set(hl.map((h) => h.source))];
  write(`${P}news/index.html`, layout({
    title: L.newsTitle, active: "news/", canonical: "news/",
    body: `${hero(articles.slice(0, 4).map(artSlide), "sm")}<div class="wrap"><main class="grid"><div class="col">
    <section>${secHead("Editorial", esc(L.editorial), esc(L.region))}${deskIndex()}<div class="arts" id="artList">${articles.slice(0, 40).map(card).join("") || `<div class="empty">${esc(L.emptyFeed)}</div>`}</div></section>
    <section>${secHead("Global", esc(L.headlinesT), headlines.updatedAt ? fm(L.updated, { t: hhmm(new Date(headlines.updatedAt)) + " " + L.tzL }) : "", "h2")}
    ${srcs.length > 1 ? `<div class="tabs-row" id="srcFilters">${[["전체", L.all], ...srcs.map((s) => [s, s])].map(([k, l], i) => `<button class="tab" type="button" data-src="${esc(k)}" aria-pressed="${i === 0}">${esc(l)}</button>`).join("")}</div>` : ""}
    <div id="hlList">${headlineList(hl.slice(0, 80))}</div></section>
    </div>${rail()}</main></div>`,
  }));

  // 기사
  articles.forEach((a, i) => {
    const more = articles.filter((x) => x !== a).slice(0, 4);
    write(`${P}articles/${a.id}/index.html`, layout({
      title: a.title, description: a.summary || plain(a.body).slice(0, 160), active: "news/", canonical: `articles/${a.id}/`, type: "article",
      body: `<div class="cover" aria-hidden="true">${artImg(ART[a.category] || ART_POOL[i % ART_POOL.length], true)}</div><div class="wrap"><p class="crumbs"><a href="${u("news/")}">Editorial</a><i class="sep" aria-hidden="true">/</i>${a.category ? `<a href="${u(`category/${catSlug(a.category)}/`)}">${esc(a.category)}</a>` : ""}</p><main class="grid"><div class="col">
      <article class="doc"><div class="kicker">${a.category ? `<a class="tag kr" href="${u(`category/${catSlug(a.category)}/`)}">${esc(a.category)}</a>` : ""}${a.region ? `<span class="tag fmt">${esc(a.region)}</span>` : ""}</div>
      <h1>${esc(a.title)}</h1>${a.summary ? `<p class="lede">${esc(a.summary)}</p>` : ""}${ccLine(a.title, a.summary)}
      <div class="byrow"><span class="byline">${esc(L.byText)} ${byName(a.author)}${staffOf(a.author) ? ` · ${esc(staffOf(a.author).desk)}` : ""}</span><span class="byend"><span class="readt">${esc(L.readT.replace("{n}", readMin(a.body, L.code)))}</span><time class="byline">${fullDate(a.date)}</time></span></div>
      <div class="prose">${markdown(a.body)}</div>
      <div class="share"><button class="btn ghost" type="button" data-copy>${esc(L.copy)}</button></div>
      ${CH ? CH.card : ""}
      ${ADS.length ? `<aside class="ad-inline"><span class="label">${esc(L.sponsored)}</span>${adCard(ADS[i % ADS.length], "wide")}</aside>` : ""}
      </article>${more.length ? `<section>${secHead("More", esc(L.editorial), "", "h2")}<div class="arts">${more.map(card).join("")}</div></section>` : ""}
      </div>${rail()}</main></div>`,
    }));
  });

  // 분야별 기사 목록
  for (const [c, n] of catList) {
    const mine = articles.filter((a) => a.category === c);
    const slides = [...mine, ...articles.filter((a) => a.category !== c)].slice(0, Math.max(2, Math.min(4, mine.length))).map((a) => (a.category === c ? artSlide(a) : { ...artSlide(a), eye: `${esc(L.catOther)} · ${esc(a.category || "")}` }));
    const dek = (L.catDek || {})[c];
    write(`${P}category/${catSlug(c)}/index.html`, layout({
      title: `${c} · ${L.newsTitle}`, active: "news/", canonical: `category/${catSlug(c)}/`, description: `${L.name} — ${c}${dek ? ". " + dek : ""}`,
      body: `${hero(slides, "sm")}<div class="wrap"><p class="crumbs"><a href="${u("news/")}">Editorial</a><i class="sep" aria-hidden="true">/</i><span class="here">${esc(c)}</span></p><main class="grid"><div class="col">
      <section>${secHead("Section", esc(c), esc(fm(L.catN, { n })))}${dek ? `<p class="cat-dek">${esc(dek)}</p>` : ""}${deskIndex(c)}<div class="arts">${mine.map(card).join("")}</div></section>
      </div>${rail()}</main></div>`,
    }));
  }

  // 시세
  write(`${P}market/index.html`, layout({
    title: L.marketTitle, active: "market/", canonical: "market/", description: L.marketDesc,
    body: `${hero(L.marketHero.map(([t, d], k) => ({ art: ["gold-silk", "rose-dusk"][k], eye: ["Markets", "Kimchi Premium"][k], title: t, dek: d, href: "#mkt", cta: L.code === "zh" ? "查看" : "View" })), "sm")}<div class="wrap"><main class="grid"><div class="col"><section>
    ${secHead("Markets", esc(L.marketTitle), '<span id="mktUpdated">…</span>')}
    <div class="wide" id="mkt"><table class="mkt-full"><thead><tr>${L.th.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${cfg.coins.map((c) => `<tr data-row="${c.id}"><td><span class="sym">${c.symbol}</span></td><td class="num p">—</td><td class="num krw">—</td><td class="num c"></td><td class="num vol">—</td></tr>`).join("")}</tbody></table></div>
    <p class="note">${esc(L.kimpNote)}</p></section>${macroSection(L.code === "zh" ? "zh" : "en", MACRO_DATA, { esc, secHead })}</div><aside class="rail">${sentiment}${chRail}${contactRail}</aside></main></div>`,
  }));

  // 문의
  write(`${P}contact/index.html`, layout({
    title: L.contactT, active: "contact/", canonical: "contact/", float: false,
    body: `<div class="wrap"><main class="single">${secHead("Contact", esc(L.contactPage))}<div class="contact">
    <div><span class="label">Telegram</span><div class="handle">@${esc(cfg.telegram)}</div></div>
    <p style="margin:0;font-weight:300;max-width:56ch">${esc(L.contactBody)}</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="${TG}" target="_blank" rel="noopener">${esc(L.openTg)}</a><button class="btn ghost" type="button" data-copytext="@${esc(cfg.telegram)}">${esc(L.copyId)}</button></div>
    <div><span class="label">${esc(L.weTake)}</span><ul style="margin-top:10px">${L.weTakeL.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>${CH ? CH.contact : ""}</div></main></div>`,
  }));

  // 편집국 · 기자별 · 개인정보처리방침
  const staffList = Object.entries(A.staff);
  write(`${P}authors/index.html`, layout({
    title: A.newsroom, description: A.newsroomDesc, active: "news/", canonical: "authors/",
    body: `<div class="wrap"><main class="single">${secHead("Newsroom", esc(A.newsroom))}
    <ul class="staff">${staffList.map(([name, r]) => { const n = articles.filter((a) => a.author === name).length; return `<li><a href="${u(`authors/${r.slug}/`)}"><span class="label">${esc(r.desk)}</span><strong>${esc(name)}</strong><span class="beat">${esc(r.beat)}</span><span class="cnt">${esc(r.formats.join(" · "))} · ${esc(A.nStories.replace("{n}", n))}</span></a></li>`; }).join("")}</ul>
    <p class="note">${esc(A.newsroomNote)} <a href="${u("contact/")}" style="text-decoration:underline">${esc(A.contactL)}</a>${L.code === "zh" ? "。" : "."}</p></main></div>`,
  }));
  for (const [name, r] of staffList) {
    const mine = articles.filter((a) => a.author === name);
    write(`${P}authors/${r.slug}/index.html`, layout({
      title: name, description: `${L.name} · ${r.desk} · ${name}`, active: "news/", canonical: `authors/${r.slug}/`,
      body: `<div class="wrap"><p class="crumbs"><a href="${u("authors/")}">Newsroom</a><i class="sep" aria-hidden="true">/</i><span class="here">${esc(r.desk)}</span></p><main class="single" style="margin-top:20px">
      ${secHead(esc(r.desk), esc(name), esc(A.nStories.replace("{n}", mine.length)))}
      <p class="lede" style="margin:18px 0 0;color:var(--mute);font-weight:300">${esc(r.beat)}</p>
      <div class="arts" style="margin-top:12px">${mine.map(card).join("") || `<div class="empty">${esc(A.soon)}</div>`}</div></main></div>`,
    }));
  }
  write(`${P}privacy/index.html`, layout({
    title: A.privacyT, description: A.privacyDesc, active: "", canonical: "privacy/", float: false,
    body: `<div class="wrap"><main class="single">${secHead("Privacy", esc(A.privacyT))}<div class="prose" style="margin-top:32px">
    ${A.privacy.map(([h, t]) => `${h ? `<h2>${esc(h)}</h2>` : ""}<p>${esc(t).replace("@{tg}", `<a href="${TG}">@${esc(cfg.telegram)}</a>`)}${h ? "" : ` ${esc(A.effective)}`}</p>`).join("\n    ")}
    </div></main></div>`,
  }));

  writeProjects({ root: ROOT, lang: L.code, prefix: P, write, layout, u, asset, esc, markdown, fmtDate: (d) => fmt(d, { year: "numeric", month: "long", day: "numeric" }), telegram: cfg.telegram ? `https://t.me/${cfg.telegram.replace(/^@/, "")}` : "" });
  write(`${P}search/index.html`, layout({
    title: L.S.title, description: L.S.desc, active: "search/", canonical: "search/", extraScript: "search.js",
    body: writeSearch({ write, prefix: P, articles, flashes, link: u, esc, S: L.S }),
  }));

  writeAppFeed({ write, lang: L.code, flashes, articles, markdown, now: NOW, link: (p) => (SITE_URL || "https://probe2928-crypto.github.io") + u(p), artOf: (a, i) => ART[a.category] || ART_POOL[i % ART_POOL.length] });
  // 피드
  write(`${P}flash.json`, JSON.stringify(flashes.slice(0, 50).map((f) => ({ id: f.id, title: f.title, time: f.date.toISOString(), url: u(`flash/${f.id}/`) }))));
  const link = (p) => (SITE_URL ? abs(p) : u(p));
  const items = [...flashes.slice(0, 50).map((f) => ({ t: f.title, l: link(`flash/${f.id}/`), d: f.date, s: plain(f.body || "") })), ...articles.slice(0, 30).map((a) => ({ t: a.title, l: link(`articles/${a.id}/`), d: a.date, s: a.summary || "" }))].sort((a, b) => b.d - a.d);
  write(`${P}rss.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(L.name)}</title><link>${link("")}</link><description>${esc(L.description)}</description><language>${L.html}</language>\n${items.map((i) => `<item><title>${esc(i.t)}</title><link>${i.l}</link><guid>${i.l}</guid><pubDate>${i.d.toUTCString()}</pubDate><description>${esc(i.s)}</description></item>`).join("\n")}\n</channel></rss>`);
  if (SITE_URL) {
    const sm = path.join(OUT, "sitemap.xml");
    if (fs.existsSync(sm)) {
      const urls = [...SHARED_PAGES, ...catList.map(([c]) => `category/${catSlug(c)}/`), "authors/", ...staffList.map(([, r]) => `authors/${r.slug}/`), "privacy/", ...articles.map((a) => `articles/${a.id}/`), ...flashes.slice(0, 300).map((f) => `flash/${f.id}/`)].map((p) => `<url><loc>${abs(p)}</loc></url>`).join("");
      fs.writeFileSync(sm, fs.readFileSync(sm, "utf8").replace("</urlset>", urls + "</urlset>"));
    }
  }
  console.log(`${L.code} 에디션 → dist/${P} (속보 ${flashes.length}, 기사 ${articles.length}, 헤드라인 ${hl.length})`);
}
