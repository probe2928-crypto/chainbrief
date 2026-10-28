// 업비트·빗썸 상장/유의/종료 소식 → data/listings.json (저장소에 커밋되어 히스토리 유지)
//
// GitHub 서버에서는 거래소 '공지' 페이지가 막히는 경우가 많아서(403), 두 가지를 함께 쓴다.
//  1) 마켓 목록 API (항상 열림): 새 마켓 = 신규 상장, 사라진 마켓 = 거래지원 종료, 경고 표시 = 유의 지정/해제
//  2) 공지 (열리면 보너스): 상장 예고 등 공지 원문 링크
// 새 소식은 content/flash/auto-*.md 로 라이브 속보에도 올린다.
//
// 공지 한꺼번에 넣기: node scripts/fetch-listings.mjs --backfill upbit.json bithumb.json
//   upbit.json   = [[id, "ISO시각", "제목"], ...]
//   bithumb.json = [[카테고리, id, "YYYY-MM-DD HH:mm:ss", "제목"], ...]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/listings.json");
const FLASH = path.join(ROOT, "content/flash");
const KEEP_DAYS = 45;
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", "Accept-Language": "ko-KR,ko;q=0.9" };
const EX = { upbit: "업비트", bithumb: "빗썸" };

async function get(url, type = "json") {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return type === "json" ? r.json() : r.text();
  } finally { clearTimeout(t); }
}

export function classify(title) {
  if (/거래지원 ?종료|상장 폐지/.test(title)) return "delisting";
  if (/유의/.test(title)) return /해제/.test(title) ? "caution-cleared" : "caution";
  if (/신규 거래지원|디지털 자산 추가|마켓 추가|거래 지원 개시|신규 상장/.test(title)) return "listing";
  return null;
}
export function coins(title) {
  const out = [];
  for (const m of title.matchAll(/([^\s(),·\]]+)\s?\(([A-Z0-9]{1,15})\)/g)) out.push({ name: m[1], symbol: m[2] });
  return out;
}
const marketsOf = (title) => [...new Set((title.match(/\b(KRW|BTC|USDT)\b/g) || []).concat(/원화/.test(title) ? ["KRW"] : []))];
const kst = (s) => new Date(s.replace(" ", "T") + "+09:00");
const upbitItem = ([id, time, title]) => ({
  key: `upbit-${id}`, exchange: "upbit", source: "notice", type: classify(title), title, coins: coins(title), markets: marketsOf(title),
  time: new Date(time).toISOString(), url: `https://upbit.com/service_center/notice?id=${id}`,
});
const bithumbItem = ([cat, id, time, title]) => ({
  key: `bithumb-${id}`, exchange: "bithumb", source: "notice",
  type: classify(title) || (cat === 9 ? "listing" : cat === 6 ? "delisting" : "caution"),
  title, coins: coins(title), markets: marketsOf(title).length ? marketsOf(title) : ["KRW"],
  time: kst(time).toISOString(), url: `https://feed.bithumb.com/notice/${id}`,
});
const valid = (i) => i.type && i.coins.length;

async function upbitNotices() {
  const out = [];
  for (const p of [1, 2]) {
    const j = await get(`https://api-manager.upbit.com/api/v1/announcements?os=web&page=${p}&per_page=20&category=trade`);
    out.push(...j.data.notices.map((n) => upbitItem([n.id, n.first_listed_at || n.listed_at, n.title])));
  }
  return out.filter(valid);
}
async function bithumbNotices() {
  const out = [];
  for (const cat of [9, 5, 6]) {
    const html = await get(`https://feed.bithumb.com/notice?category=${cat}&page=1`, "text");
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error("no data");
    for (const n of JSON.parse(m[1]).props.pageProps.noticeList || []) if (n.topFixYn !== "Y") out.push(bithumbItem([cat, n.id, n.publicationDateTime, n.title]));
  }
  return out.filter(valid);
}
// 마켓 목록 + 유의 표시. 업비트·빗썸 모두 market/all?isDetails=true (market_warning 또는 market_event.warning)
async function marketList(ex) {
  const base = ex === "upbit" ? "https://api.upbit.com/v1/market/all" : "https://api.bithumb.com/v1/market/all";
  let j, detailed = true;
  try { j = await get(base + "?isDetails=true"); } catch { j = await get(base); detailed = false; }
  return {
    detailed,
    list: j.map((m) => ({ market: m.market, name: m.korean_name, warn: m.market_warning === "CAUTION" || m.market_event?.warning === true })),
  };
}
const marketUrl = (ex, market) => {
  const [q, s] = market.split("-");
  return ex === "upbit" ? `https://upbit.com/exchange?code=CRIX.UPBIT.${market}` : `https://www.bithumb.com/react/trade/order/${s}-${q}`;
};

/* ---------- 실행 ---------- */
let prev = { items: [], known: {}, warn: {} };
const hadPrev = fs.existsSync(OUT);
if (hadPrev) prev = { warn: {}, ...JSON.parse(fs.readFileSync(OUT, "utf8")) };
const prevKeys = new Set(prev.items.map((i) => i.key));
const fresh = [];
const backfill = process.argv[2] === "--backfill";

if (backfill) {
  const [, , , upF, btF] = process.argv;
  if (upF) fresh.push(...JSON.parse(fs.readFileSync(upF, "utf8")).map(upbitItem).filter(valid));
  if (btF) fresh.push(...JSON.parse(fs.readFileSync(btF, "utf8")).map(bithumbItem).filter(valid));
  console.log(`공지 ${fresh.length}건 반영`);
} else {
  try { const u = await upbitNotices(); console.log(`✓ 업비트 공지: ${u.length}`); fresh.push(...u); } catch (e) { console.warn("✗ 업비트 공지:", e.message); }
  try { const b = await bithumbNotices(); console.log(`✓ 빗썸 공지: ${b.length}`); fresh.push(...b); } catch (e) { console.warn("✗ 빗썸 공지:", e.message); }
}

const known = { ...prev.known }, warn = { ...prev.warn };
const recent = (ex, sym, types, days) => [...fresh, ...prev.items].some((i) => i.exchange === ex && types.includes(i.type) && i.coins.some((c) => c.symbol === sym) && Math.abs(Date.now() - new Date(i.time)) < days * 864e5);
const now = new Date().toISOString();
if (!backfill) for (const ex of ["upbit", "bithumb"]) {
  try {
    const { detailed, list } = await marketList(ex);
    const before = new Set(known[ex] || []), nowSet = new Set(list.map((m) => m.market));
    const names = Object.fromEntries(list.map((m) => [m.market, m.name]));
    const prevNames = prev.names?.[ex] || {};
    if (before.size) {
      for (const m of list) {
        if (before.has(m.market)) continue;
        const [quote, sym] = m.market.split("-");
        if (recent(ex, sym, ["listing"], 7) && fresh.concat(prev.items).some((i) => i.key === `${ex}-mkt-${sym}`)) continue;
        fresh.push({ key: `${ex}-mkt-${m.market}`, exchange: ex, source: "market", type: "listing", title: `${m.name}(${sym}) ${quote} 마켓 거래 시작`, coins: [{ name: m.name, symbol: sym }], markets: [quote], time: now, url: marketUrl(ex, m.market) });
      }
      for (const mk of before) {
        if (nowSet.has(mk)) continue;
        const [quote, sym] = mk.split("-");
        const nm = prevNames[mk] || sym;
        fresh.push({ key: `${ex}-gone-${mk}-${now.slice(0, 10)}`, exchange: ex, source: "market", type: "delisting", title: `${nm}(${sym}) ${quote} 마켓 거래 종료`, coins: [{ name: nm, symbol: sym }], markets: [quote], time: now, url: ex === "upbit" ? "https://upbit.com/service_center/notice" : "https://feed.bithumb.com/notice?category=6" });
      }
    }
    if (detailed) {
      const prevWarn = new Set(warn[ex] || []);
      const nowWarn = list.filter((m) => m.warn && m.market.startsWith("KRW-")).map((m) => m.market);
      if (warn[ex]) {
        for (const mk of nowWarn) if (!prevWarn.has(mk)) {
          const sym = mk.slice(4);
          if (recent(ex, sym, ["caution"], 3)) continue;
          fresh.push({ key: `${ex}-warn-${mk}-${now.slice(0, 10)}`, exchange: ex, source: "market", type: "caution", title: `${names[mk]}(${sym}) 거래 유의 종목 지정`, coins: [{ name: names[mk], symbol: sym }], markets: ["KRW"], time: now, url: marketUrl(ex, mk) });
        }
        for (const mk of prevWarn) if (!nowWarn.includes(mk) && nowSet.has(mk)) {
          const sym = mk.slice(4);
          if (recent(ex, sym, ["caution-cleared"], 3)) continue;
          fresh.push({ key: `${ex}-unwarn-${mk}-${now.slice(0, 10)}`, exchange: ex, source: "market", type: "caution-cleared", title: `${names[mk]}(${sym}) 거래 유의 종목 해제`, coins: [{ name: names[mk], symbol: sym }], markets: ["KRW"], time: now, url: marketUrl(ex, mk) });
        }
      }
      warn[ex] = nowWarn;
    }
    known[ex] = list.map((m) => m.market);
    prev.names = { ...prev.names, [ex]: names };
    console.log(`✓ ${ex} 마켓 ${list.length}개${detailed ? `, 유의 ${warn[ex].length}개` : ""}`);
  } catch (e) { console.warn(`✗ ${ex} 마켓:`, e.message); }
}

const byKey = new Map(prev.items.map((i) => [i.key, i]));
for (const i of fresh) byKey.set(i.key, { ...byKey.get(i.key), ...i });
const cutoff = Date.now() - KEEP_DAYS * 864e5;
const items = [...byKey.values()].filter((i) => new Date(i.time) >= cutoff).sort((a, b) => new Date(b.time) - new Date(a.time));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ updatedAt: backfill ? prev.updatedAt || now : now, items, known, warn, names: prev.names || {}, ...(prev.global ? { global: prev.global } : {}) }));
console.log(`상장 소식 ${items.length}건 저장`);

// 새 소식 → 자동 속보 (첫 실행·백필은 건너뜀: 지난 공지가 한꺼번에 올라가지 않도록)
if (hadPrev && !backfill) {
  let made = 0;
  for (const i of items) {
    if (prevKeys.has(i.key) || Date.now() - new Date(i.time) > 12 * 3600e3 || i.type === "caution-cleared") continue;
    const f = path.join(FLASH, `auto-${i.key}.md`);
    if (fs.existsSync(f)) continue;
    const coin = i.coins.map((c) => `${c.name}(${c.symbol})`).join(", ");
    const body = i.type === "listing"
      ? `${EX[i.exchange]}가 ${coin}${i.markets.length ? ` ${i.markets.join("·")} 마켓` : ""} 거래 지원을 ${i.source === "market" ? "시작했다. 거래소 마켓 목록에서 새로 확인됐다" : "공지했다"}.`
      : i.type === "delisting" ? `${EX[i.exchange]}가 ${coin} ${i.source === "market" ? "마켓 거래를 종료했다" : "거래 지원 종료를 공지했다. 보유자는 종료 일정과 출금 가능 기간을 확인해야 한다"}.`
      : `${EX[i.exchange]}가 ${coin}을(를) 거래 유의 종목으로 지정했다. 유의 종목은 일정 기간 안에 해소되지 않으면 거래지원이 종료될 수 있다.`;
    fs.writeFileSync(f, `---\ntitle: "[${EX[i.exchange]}] ${i.title.replace(/"/g, "'")}"\ntime: ${new Date(i.time).toISOString()}\ncategory: 상장\nimportant: ${i.type !== "caution"}\nauto: true\n---\n${body} [${i.source === "market" ? "거래소에서 보기" : "공지 원문"}](${i.url})\n`);
    // 영어·중국어 에디션 자동 속보
    const syms = i.coins.map((c) => c.symbol).join(", ");
    const exE = i.exchange === "upbit" ? "Upbit" : "Bithumb";
    const mk = i.markets.length ? ` (${i.markets.join(", ")})` : "";
    const intl = {
      en: i.type === "listing" ? [`${exE} lists ${syms}${mk}`, `South Korean exchange ${exE} has added ${syms}${mk}. New Korean listings often draw heavy KRW volume in the first hours of trading.`, "Listings"]
        : i.type === "delisting" ? [`${exE} to delist ${syms}`, `${exE} ${i.source === "market" ? "has ended trading of" : "announced it will end support for"} ${syms}. Holders should check the withdrawal window.`, "Listings"]
        : [`${exE} flags ${syms} with investment caution`, `${exE} designated ${syms} as a caution-flagged asset. Unresolved caution flags can lead to delisting in Korea.`, "Listings"],
      zh: i.type === "listing" ? [`${exE} 上线 ${syms}${mk}`, `韩国交易所 ${exE} 新增 ${syms}${mk} 交易。韩国新币上线初期通常伴随大量韩元成交。`, "上币"]
        : i.type === "delisting" ? [`${exE} 将下架 ${syms}`, `${exE} ${i.source === "market" ? "已终止" : "宣布将终止"} ${syms} 的交易支持，持有者请留意提币期限。`, "上币"]
        : [`${exE} 将 ${syms} 列为警示币种`, `${exE} 将 ${syms} 指定为交易警示币种，若未能解除，可能被终止交易。`, "上币"],
    };
    for (const [lg, [t, b, cat]] of Object.entries(intl)) {
      const dir = path.join(ROOT, `content/${lg}/flash`);
      fs.mkdirSync(dir, { recursive: true });
      const lf = path.join(dir, `auto-${i.key}.md`);
      if (!fs.existsSync(lf)) fs.writeFileSync(lf, `---\ntitle: "${t.replace(/"/g, "'")}"\ntime: ${new Date(i.time).toISOString()}\ncategory: ${cat}\nimportant: ${i.type !== "caution"}\nauto: true\n---\n${b} [${lg === "zh" ? "官方公告" : "Exchange notice"}](${i.url})\n`);
    }
    made++;
  }
  console.log(`자동 속보 ${made}건 작성`);
}
