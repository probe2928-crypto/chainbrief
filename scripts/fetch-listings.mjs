// 업비트·빗썸 상장/유의/종료 소식 수집 → data/listings.json (저장소에 커밋되어 히스토리 유지)
// 1) 거래소 공지  2) 마켓 목록 비교(공지를 놓쳐도 실제 거래 시작을 잡아냄)
// 새 상장·종료 소식은 content/flash/auto-*.md 로 라이브 속보에도 올린다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/listings.json");
const FLASH = path.join(ROOT, "content/flash");
const KEEP_DAYS = 45;
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", "Accept-Language": "ko-KR,ko;q=0.9" };

async function get(url, type = "json") {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return type === "json" ? r.json() : r.text();
  } finally { clearTimeout(t); }
}

function classify(title) {
  if (/거래지원 종료|상장 폐지/.test(title)) return "delisting";
  if (/유의/.test(title)) return /해제/.test(title) ? "caution-cleared" : "caution";
  if (/신규 거래지원|디지털 자산 추가|마켓 추가|거래 지원 개시|원화 마켓|신규 상장/.test(title)) return "listing";
  return null;
}
function coins(title) {
  const out = [];
  for (const m of title.matchAll(/([^\s(),·\]]+)\s?\(([A-Z0-9]{2,15})\)/g)) out.push({ name: m[1], symbol: m[2] });
  return out;
}
const marketsOf = (title) => [...new Set((title.match(/\b(KRW|BTC|USDT)\b/g) || []).concat(/원화/.test(title) ? ["KRW"] : []))];
const kst = (s) => new Date(s.replace(" ", "T") + "+09:00");

/* ---------- 업비트 공지 ---------- */
async function upbitNotices() {
  const j = await get("https://api-manager.upbit.com/api/v1/announcements?os=web&page=1&per_page=30&category=trade");
  return j.data.notices.map((n) => ({
    key: `upbit-${n.id}`, exchange: "upbit", source: "notice",
    type: classify(n.title), title: n.title, coins: coins(n.title), markets: marketsOf(n.title),
    time: new Date(n.first_listed_at || n.listed_at).toISOString(),
    url: `https://upbit.com/service_center/notice?id=${n.id}`,
  })).filter((n) => n.type && n.coins.length);
}

/* ---------- 빗썸 공지 (마켓 추가 9, 거래유의 5, 거래지원종료 6) ---------- */
async function bithumbNotices() {
  const out = [];
  for (const cat of [9, 5, 6]) {
    try {
      const html = await get(`https://feed.bithumb.com/notice?category=${cat}&page=1`, "text");
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!m) throw new Error("no data");
      const list = JSON.parse(m[1]).props.pageProps.noticeList || [];
      for (const n of list) {
        if (n.topFixYn === "Y" || !coins(n.title).length) continue;
        const type = classify(n.title) || (cat === 9 ? "listing" : cat === 6 ? "delisting" : "caution");
        out.push({
          key: `bithumb-${n.id}`, exchange: "bithumb", source: "notice",
          type, title: n.title, coins: coins(n.title), markets: marketsOf(n.title).length ? marketsOf(n.title) : ["KRW"],
          time: kst(n.publicationDateTime).toISOString(),
          url: `https://feed.bithumb.com/notice/${n.id}`,
        });
      }
      console.log(`✓ 빗썸 공지 ${cat}: ${list.length}`);
    } catch (e) { console.warn(`✗ 빗썸 공지 ${cat}: ${e.message}`); }
  }
  return out;
}

/* ---------- 마켓 목록 ---------- */
async function marketList(ex) {
  const url = ex === "upbit" ? "https://api.upbit.com/v1/market/all" : "https://api.bithumb.com/v1/market/all";
  const j = await get(url);
  return j.map((m) => ({ market: m.market, name: m.korean_name }));
}

/* ---------- 실행 ---------- */
let prev = { items: [], known: {} };
const hadPrev = fs.existsSync(OUT);
if (hadPrev) prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
const prevKeys = new Set(prev.items.map((i) => i.key));

let fresh = [];
try { const u = await upbitNotices(); console.log(`✓ 업비트 공지: ${u.length}`); fresh.push(...u); } catch (e) { console.warn("✗ 업비트 공지:", e.message); }
fresh.push(...await bithumbNotices());

const known = { ...prev.known };
for (const ex of ["upbit", "bithumb"]) {
  try {
    const list = await marketList(ex);
    const before = new Set(known[ex] || []);
    if (before.size) {
      for (const m of list) {
        if (before.has(m.market)) continue;
        const [quote, sym] = m.market.split("-");
        const covered = [...fresh, ...prev.items].some((i) => i.exchange === ex && i.type === "listing" && i.coins.some((c) => c.symbol === sym) && Date.now() - new Date(i.time) < 7 * 864e5);
        if (covered) continue;
        fresh.push({
          key: `${ex}-mkt-${m.market}`, exchange: ex, source: "market", type: "listing",
          title: `${m.name}(${sym}) ${quote} 마켓 거래 시작`, coins: [{ name: m.name, symbol: sym }], markets: [quote],
          time: new Date().toISOString(),
          url: ex === "upbit" ? `https://upbit.com/exchange?code=CRIX.UPBIT.${m.market}` : `https://www.bithumb.com/react/trade/order/${sym}-${quote}`,
        });
      }
    }
    known[ex] = list.map((m) => m.market);
    console.log(`✓ ${ex} 마켓: ${list.length}`);
  } catch (e) { console.warn(`✗ ${ex} 마켓:`, e.message); }
}

const byKey = new Map(prev.items.map((i) => [i.key, i]));
for (const i of fresh) byKey.set(i.key, { ...byKey.get(i.key), ...i });
const cutoff = Date.now() - KEEP_DAYS * 864e5;
const items = [...byKey.values()].filter((i) => new Date(i.time) >= cutoff).sort((a, b) => new Date(b.time) - new Date(a.time));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), items, known }, null, 1));
console.log(`상장 소식 ${items.length}건 저장`);

// 새 소식 → 자동 속보 (첫 실행은 기존 공지가 한꺼번에 올라가지 않도록 건너뜀)
if (hadPrev) {
  const EX = { upbit: "업비트", bithumb: "빗썸" };
  const LABEL = { listing: "상장", delisting: "거래지원 종료", caution: "유의 지정", "caution-cleared": "유의 해제" };
  let made = 0;
  for (const i of items) {
    if (prevKeys.has(i.key) || Date.now() - new Date(i.time) > 12 * 3600e3) continue;
    if (i.type === "caution-cleared") continue;
    const f = path.join(FLASH, `auto-${i.key}.md`);
    if (fs.existsSync(f)) continue;
    const coin = i.coins.map((c) => `${c.name}(${c.symbol})`).join(", ") || "";
    const body = i.type === "listing"
      ? `${EX[i.exchange]}가 ${coin}${i.markets.length ? ` ${i.markets.join("·")} 마켓` : ""} 거래 지원을 ${i.source === "market" ? "시작했다. 마켓 목록에서 새로 확인됐다" : "공지했다"}.`
      : i.type === "delisting" ? `${EX[i.exchange]}가 ${coin} 거래 지원 종료를 공지했다. 보유자는 종료 일정과 출금 가능 기간을 확인해야 한다.`
      : `${EX[i.exchange]}가 ${coin}을(를) 거래 유의 종목으로 지정하거나 유의를 촉구했다.`;
    fs.writeFileSync(f, `---\ntitle: "[${EX[i.exchange]}] ${i.title.replace(/"/g, "'")}"\ntime: ${new Date(i.time).toISOString()}\ncategory: 상장\nimportant: ${i.type !== "caution"}\nauto: true\n---\n${body} [공지 원문](${i.url})\n`);
    made++;
  }
  console.log(`자동 속보 ${made}건 작성 (${LABEL.listing} 등)`);
}
