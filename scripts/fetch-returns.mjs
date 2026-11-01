// 코인 수익률 히트맵 데이터 → data/returns.json  (6시간마다 갱신, 실패하면 지난 값 유지)
// 일봉 종가(UTC 0시 마감): Yahoo Finance 차트 API(키 없음) + 비트코인 2013~2014년은 Bitstamp 공개 API로 보충
// 체인브리프 /returns/ 와 Perpline returns.html 이 같은 파일(api/returns.json)을 쓴다
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/returns.json");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", Accept: "application/json" };
const COINS = [
  { sym: "BTC", yahoo: "BTC-USD", bitstamp: "btcusd", from: "2013-01-01" },
  { sym: "ETH", yahoo: "ETH-USD", from: "2016-01-01" },
  { sym: "SOL", yahoo: "SOL-USD", from: "2020-05-01" },
  { sym: "XRP", yahoo: "XRP-USD", from: "2014-01-01" },
];
const FORCE = process.argv.includes("--force");

let old = null;
try { old = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch {}
if (old && !FORCE && Date.now() - new Date(old.updated).getTime() < 6 * 3600e3) { console.log("수익률: 6시간 안에 갱신됨 — 건너뜀"); process.exit(0); }

const day = (ms) => new Date(ms).toISOString().slice(0, 10);
async function getJSON(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
  try { const r = await fetch(url, { headers: UA, signal: ctl.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}

async function yahoo(sym) {
  for (const host of ["query1", "query2"]) {
    try {
      const j = await getJSON(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=max&interval=1d`);
      const r = j?.chart?.result?.[0]; const ts = r?.timestamp || []; const cl = r?.indicators?.quote?.[0]?.close || [];
      const out = new Map();
      ts.forEach((t, i) => { if (cl[i] != null && cl[i] > 0) out.set(day(t * 1000), cl[i]); });
      // 진행 중인 오늘 봉은 현재가 — 마지막 값으로 따로 둔다
      const live = r?.meta?.regularMarketPrice || null;
      if (out.size < 30) throw new Error("데이터 부족");
      return { map: out, live, liveAt: r?.meta?.regularMarketTime ? r.meta.regularMarketTime * 1000 : null };
    } catch (e) { if (host === "query2") throw e; }
  }
}

async function bitstamp(pair, fromIso, toIso) {
  const out = new Map(); let start = Math.floor(new Date(fromIso + "T00:00:00Z").getTime() / 1000);
  const end = Math.floor(new Date(toIso + "T00:00:00Z").getTime() / 1000);
  for (let i = 0; i < 10 && start < end; i++) {
    const j = await getJSON(`https://www.bitstamp.net/api/v2/ohlc/${pair}/?step=86400&limit=1000&start=${start}`);
    const rows = j?.data?.ohlc || []; if (!rows.length) break;
    for (const r of rows) out.set(day(+r.timestamp * 1000), +r.close);
    start = +rows[rows.length - 1].timestamp + 86400;
  }
  return out;
}

const result = { updated: new Date().toISOString(), note: "Daily closes at 00:00 UTC. Sources: Yahoo Finance chart API; Bitstamp for BTC before Yahoo history.", coins: {} };
for (const c of COINS) {
  try {
    const y = await yahoo(c.yahoo);
    let map = y.map;
    const first = [...map.keys()].sort()[0];
    if (c.bitstamp && first > c.from) {
      try { const b = await bitstamp(c.bitstamp, c.from, first); for (const [d, v] of b) if (!map.has(d)) map.set(d, v); }
      catch (e) { console.log(`${c.sym} Bitstamp 보충 실패: ${e.message}`); }
    }
    const days = [...map.entries()].filter(([d]) => d >= c.from).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    // Yahoo 일봉의 날짜 = 그날 0시 시가 기준 → 종가는 그날 24시(UTC). 마지막(오늘) 봉은 진행 중이라 제외하고 live로 둔다
    const today = day(Date.now());
    const closed = days.filter(([d]) => d < today);
    const monthEnd = {};
    for (const [d, v] of closed) monthEnd[d.slice(0, 7)] = +v.toPrecision(8); // 달마다 마지막 날 종가가 남는다
    const lastMonth = closed.length ? closed[closed.length - 1][0] : null;
    // 마지막 달이 아직 안 끝났으면(오늘이 그 달) monthEnd에서 빼고 진행 중으로 계산하게 한다
    if (lastMonth && lastMonth.slice(0, 7) === today.slice(0, 7)) delete monthEnd[today.slice(0, 7)];
    else if (lastMonth && new Date(lastMonth + "T00:00:00Z").getUTCDate() !== new Date(Date.UTC(+lastMonth.slice(0, 4), +lastMonth.slice(5, 7), 0)).getUTCDate()) delete monthEnd[lastMonth.slice(0, 7)];
    result.coins[c.sym] = {
      since: Object.keys(monthEnd).sort()[1] || null,
      monthEnd,
      daily: closed.slice(-400).map(([d, v]) => [d, +v.toPrecision(8)]),
      live: y.live ? +(+y.live).toPrecision(8) : (closed.length ? closed[closed.length - 1][1] : null),
      liveAt: y.liveAt || Date.now(),
    };
    console.log(`수익률 ${c.sym}: ${days.length}일, ${Object.keys(monthEnd).length}개월 (${days[0]?.[0]}~)`);
  } catch (e) {
    console.log(`수익률 ${c.sym} 실패: ${e.message}`);
    if (old?.coins?.[c.sym]) result.coins[c.sym] = old.coins[c.sym];
  }
}
if (!Object.keys(result.coins).length) { console.log("수익률: 전부 실패 — 지난 파일 유지"); process.exit(0); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result));
console.log("수익률 저장:", Object.keys(result.coins).join(", "));
