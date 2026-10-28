// 해외 거래소 상장·상폐 공지 → data/listings.json 의 "global" 칸
// (워크플로가 이미 커밋하는 파일에 함께 담아서 워크플로 수정 없이 기록이 남게 함. npm run listings 가 이어서 실행)
//   바이낸스·OKX·바이비트: 공식 공지 목록(제목·링크만 저장, 본문은 가져오지 않음)
//   코인베이스: 상품 목록 API — 새 USD 마켓이 생기면 신규 상장
// 거래소마다 GitHub 서버(미국)에서 막힐 수 있어서 각각 따로 시도하고, 실패해도 지난 기록은 그대로 둔다.
// 바이낸스·코인베이스 현물 신규 상장은 라이브 속보(KO·EN·中文)에도 자동으로 올린다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/listings.json");
const KEEP_DAYS = 30;
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", Accept: "application/json", "Accept-Language": "en-US,en;q=0.9" };

async function get(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

const QUOTES = new Set(["USDT", "USDC", "USD", "BTC", "ETH", "EUR", "TRY", "FDUSD", "BNB", "TRY", "BRL", "JPY"]);
const NOISE = new Set(["USDⓈ", "USDS", "AMA", "API", "OTC", "VIP", "UTC", "APR", "KYC", "NFT", "SPOT", "P2P"]);
// 영어 공지 제목 → 코인 심볼 ("Foo (FOO)", "FOO/USDT", "FOOUSDT")
export function symbols(title) {
  const out = new Set();
  for (const m of title.matchAll(/\(([A-Z0-9]{2,12})\)/g)) out.add(m[1]);
  for (const m of title.matchAll(/\b([A-Z0-9]{2,12})\/(USDT|USDC|USD|EUR|BTC)\b/g)) out.add(m[1]);
  const dl = title.match(/\bDelist\s+([A-Z0-9][A-Z0-9 ,&]*?)\s+(?:on|from|in)\b/i);
  if (dl) for (const s of dl[1].split(/\s*(?:,|&|\band\b)\s*/)) if (/^[A-Z0-9]{2,12}$/.test(s)) out.add(s);
  return [...out].filter((s) => !QUOTES.has(s) && !NOISE.has(s) && !/^\d+$/.test(s)).slice(0, 6);
}
const DERIV = /futures|perpetual|margin|options|pre-market|premarket|alpha|earn|convert|launchpool|hodler|megadrop|copy trading|trading bots|loan|monitoring tag|seed tag applied.*futures/i;
export function kind(title, hint) {
  if (/delist|cease trading|remove .* spot|end of support|will (remove|delist)/i.test(title)) return "delisting";
  if (hint === "delisting") return /spot|delist/i.test(title) ? "delisting" : null;
  if (DERIV.test(title) && !/spot/i.test(title)) return null;
  if (/will list|to list|new listing|lists? |listing|spot trading|adds?\b.*spot/i.test(title)) return "listing";
  return null;
}
const item = (exchange, id, title, time, url, hint) => {
  const type = kind(title, hint), syms = symbols(title);
  if (!type || !syms.length) return null;
  return { key: `${exchange}-${id}`, exchange, type, title: title.trim(), symbols: syms, time: new Date(time).toISOString(), url };
};

const SRC = {
  async binance() {
    const out = [];
    for (const [cat, hint] of [[48, "listing"], [161, "delisting"]]) {
      const j = await get(`https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=${cat}&pageNo=1&pageSize=20`);
      for (const a of j.data?.catalogs?.[0]?.articles || []) out.push(item("binance", a.code || a.id, a.title, a.releaseDate, `https://www.binance.com/en/support/announcement/detail/${a.code}`, hint));
    }
    return out;
  },
  async okx() {
    const out = [];
    for (const [t, hint] of [["announcements-new-listings", "listing"], ["announcements-delistings", "delisting"]]) {
      const j = await get(`https://www.okx.com/api/v5/support/announcements?annType=${t}&page=1`);
      for (const a of j.data?.[0]?.details || []) out.push(item("okx", (a.url || a.title).replace(/^.*\//, "").slice(0, 80), a.title, +a.pTime, a.url, hint));
    }
    return out;
  },
  async bybit() {
    const out = [];
    for (const [t, hint] of [["new_crypto", "listing"], ["delistings", "delisting"]]) {
      const j = await get(`https://api.bybit.com/v5/announcements/index?locale=en-US&type=${t}&page=1&limit=20`);
      for (const a of j.result?.list || []) out.push(item("bybit", (a.url || a.title).replace(/^.*\//, "").replace(/\W+$/, "").slice(0, 80), a.title, a.dateTimestamp || a.publishTime, a.url, hint));
    }
    return out;
  },
};

/* ---------- 실행 ---------- */
const whole = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const hadPrev = !!whole.global;
const prev = { items: [], known: {}, status: {}, ...(whole.global || {}) };
const prevKeys = new Set(prev.items.map((i) => i.key));
const fresh = [], status = { ...prev.status }, known = { ...prev.known };
const now = new Date().toISOString();

for (const [ex, fn] of Object.entries(SRC)) {
  try {
    const got = (await fn()).filter(Boolean);
    fresh.push(...got);
    status[ex] = { ok: true, at: now, n: got.length };
    console.log(`✓ ${ex}: ${got.length}`);
  } catch (e) {
    status[ex] = { ok: false, at: now, err: e.message, lastOk: prev.status?.[ex]?.ok ? prev.status[ex].at : prev.status?.[ex]?.lastOk || null };
    console.warn(`✗ ${ex}:`, e.message);
  }
}
// 코인베이스: 새 USD 마켓 = 신규 상장
try {
  const list = await get("https://api.exchange.coinbase.com/products");
  const bases = [...new Set(list.filter((p) => p.quote_currency === "USD" && p.status === "online" && !p.trading_disabled).map((p) => p.base_currency))];
  const before = new Set(known.coinbase || []);
  if (before.size) for (const b of bases) if (!before.has(b)) fresh.push({ key: `coinbase-${b}-${now.slice(0, 10)}`, exchange: "coinbase", type: "listing", title: `${b}-USD trading is live on Coinbase Exchange`, symbols: [b], time: now, url: `https://exchange.coinbase.com/trade/${b}-USD` });
  known.coinbase = [...new Set([...before, ...bases])];
  status.coinbase = { ok: true, at: now, n: bases.length };
  console.log(`✓ coinbase: USD 마켓 ${bases.length}개`);
} catch (e) {
  status.coinbase = { ok: false, at: now, err: e.message, lastOk: prev.status?.coinbase?.ok ? prev.status.coinbase.at : prev.status?.coinbase?.lastOk || null };
  console.warn("✗ coinbase:", e.message);
}

const byKey = new Map(prev.items.map((i) => [i.key, i]));
for (const i of fresh) byKey.set(i.key, { ...byKey.get(i.key), ...i, time: byKey.get(i.key)?.time || i.time });
const cutoff = Date.now() - KEEP_DAYS * 864e5;
const items = [...byKey.values()].filter((i) => new Date(i.time) >= cutoff && new Date(i.time) <= Date.now() + 864e5).sort((a, b) => new Date(b.time) - new Date(a.time));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ ...whole, global: { updatedAt: now, items, known, status } }));
console.log(`해외 상장 소식 ${items.length}건 저장`);

// 바이낸스·코인베이스 현물 신규 상장 → 자동 속보 (첫 실행 건너뜀, 6시간 이내 새 소식만)
if (hadPrev) {
  const NAME = { binance: ["바이낸스", "Binance", "币安"], coinbase: ["코인베이스", "Coinbase", "Coinbase"] };
  let made = 0;
  for (const i of items) {
    if (!NAME[i.exchange] || i.type !== "listing" || prevKeys.has(i.key) || Date.now() - new Date(i.time) > 6 * 3600e3) continue;
    const [ko, en, zh] = NAME[i.exchange], s = i.symbols.join(", ");
    const link = (lg) => `[${lg === "ko" ? "공지 원문" : lg === "zh" ? "官方公告" : "Exchange notice"}](${i.url})`;
    const posts = {
      ko: [`[${ko}] ${s} 신규 상장`, `글로벌 거래소 ${ko}가 ${s} 현물 거래 지원을 ${i.exchange === "coinbase" ? "시작했다. 거래소 상품 목록에서 새 USD 마켓이 확인됐다" : "공지했다. 국내 거래소 상장 여부와 함께 초기 변동성에 유의해야 한다"}.`, "상장", "content/flash"],
      en: [`${en} lists ${s}`, `${en} ${i.exchange === "coinbase" ? "has opened a new USD spot market for" : "announced spot trading for"} ${s}. New listings on major exchanges often bring sharp early volatility.`, "Listings", "content/en/flash"],
      zh: [`${zh} 上线 ${s}`, `${zh} ${i.exchange === "coinbase" ? "已开放" : "宣布上线"} ${s} 现货交易。大型交易所新币上线初期波动通常较大。`, "上币", "content/zh/flash"],
    };
    for (const [lg, [t, b, cat, dir]] of Object.entries(posts)) {
      const d = path.join(ROOT, dir);
      fs.mkdirSync(d, { recursive: true });
      const f = path.join(d, `auto-${i.key.replace(/[^\w-]/g, "").slice(0, 90)}.md`);
      if (!fs.existsSync(f)) fs.writeFileSync(f, `---\ntitle: "${t.replace(/"/g, "'")}"\ntime: ${i.time}\ncategory: ${cat}\nimportant: true\nauto: true\n---\n${b} ${link(lg)}\n`);
    }
    made++;
  }
  console.log(`해외 상장 자동 속보 ${made}건 작성`);
}
