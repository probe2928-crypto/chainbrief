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
  { sym: "ETH", yahoo: "ETH-USD", cc: "ETH", from: "2016-01-01" },
  { sym: "SOL", yahoo: "SOL-USD", from: "2020-05-01" },
  { sym: "XRP", yahoo: "XRP-USD", cc: "XRP", bitstamp: "xrpusd", from: "2014-01-01" },
];
const FORCE = process.argv.includes("--force");

let old = null;
try { old = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch {}
const VER = 2; // 데이터 형식·수집 방식이 바뀌면 올린다 (캐시된 옛 파일 무시)
if (old && old.v === VER && !FORCE && Date.now() - new Date(old.updated).getTime() < 6 * 3600e3) { console.log("수익률: 6시간 안에 갱신됨 — 건너뜀"); process.exit(0); }

const day = (ms) => new Date(ms).toISOString().slice(0, 10);
async function getJSON(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
  try { const r = await fetch(url, { headers: UA, signal: ctl.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}

async function yahoo(sym, fromIso) {
  // range=max 는 오래된 구간을 듬성듬성 돌려줘서 월말 종가가 틀어진다 → period1/period2 로 일봉 전부 받기
  const p1 = Math.floor(new Date(fromIso + "T00:00:00Z").getTime() / 1000), p2 = Math.floor(Date.now() / 1000) + 86400;
  for (const host of ["query1", "query2"]) {
    try {
      const j = await getJSON(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${p1}&period2=${p2}&interval=1d`);
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

// CryptoCompare 일봉(키 없이 가능할 때만) — Yahoo 이전 구간 보충용
async function cryptocompare(fsym, fromIso, toIso) {
  const out = new Map(); let to = Math.floor(new Date(toIso + "T00:00:00Z").getTime() / 1000);
  const from = Math.floor(new Date(fromIso + "T00:00:00Z").getTime() / 1000);
  for (let i = 0; i < 5 && to > from; i++) {
    const j = await getJSON(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=USD&limit=2000&toTs=${to}`);
    const rows = j?.Data?.Data || []; if (!rows.length) break;
    for (const r of rows) if (r.close > 0) out.set(day(r.time * 1000), r.close);
    to = rows[0].time - 86400;
  }
  return out;
}

const result = { v: VER, updated: new Date().toISOString(), note: "Daily closes at 00:00 UTC. Sources: Yahoo Finance chart API; Bitstamp for BTC before Yahoo history.", coins: {} };
for (const c of COINS) {
  try {
    const y = await yahoo(c.yahoo, c.from);
    let map = y.map;
    const first = [...map.keys()].sort()[0];
    for (const [name, fn] of [["CryptoCompare", c.cc && (() => cryptocompare(c.cc, c.from, first))], ["Bitstamp", c.bitstamp && (() => bitstamp(c.bitstamp, c.from, first))]]) {
      if (!fn || [...map.keys()].sort()[0] <= c.from) continue;
      try { const b = await fn(); let n = 0; for (const [d, v] of b) if (d < first && !map.has(d)) { map.set(d, v); n++; } console.log(`${c.sym} ${name} 보충 ${n}일`); }
      catch (e) { console.log(`${c.sym} ${name} 보충 실패: ${e.message}`); }
    }
    const days = [...map.entries()].filter(([d]) => d >= c.from).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    // Yahoo 일봉의 날짜 = 그날 0시 시가 기준 → 종가는 그날 24시(UTC). 마지막(오늘) 봉은 진행 중이라 제외하고 live로 둔다
    const today = day(Date.now());
    const closed = days.filter(([d]) => d < today);
    // 월말 종가: 그 달 마지막 날(없으면 마지막 2일 안) 종가만 인정 — 듬성한 데이터·진행 중인 달은 빼서 엉뚱한 수익률을 막는다
    const last = {};
    for (const [d, v] of closed) last[d.slice(0, 7)] = [d, v];
    const monthEnd = {};
    for (const [ym, [d, v]] of Object.entries(last)) {
      const dim = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
      if (+d.slice(8, 10) >= dim - 2 && ym !== today.slice(0, 7)) monthEnd[ym] = +v.toPrecision(8);
    }
    result.coins[c.sym] = {
      since: Object.keys(monthEnd).sort()[1] || null,
      monthEnd,
      daily: closed.slice(-400).map(([d, v]) => [d, +v.toPrecision(8)]),
      live: y.live ? +(+y.live).toPrecision(8) : (closed.length ? closed[closed.length - 1][1] : null),
      liveAt: y.liveAt || Date.now(),
    };
    const gaps = days.filter((x, i) => i && (new Date(x[0]) - new Date(days[i - 1][0])) > 3 * 864e5).length;
    console.log(`수익률 ${c.sym}: ${days.length}일, ${Object.keys(monthEnd).length}개월 (${days[0]?.[0]}~), 3일 넘는 빈 구간 ${gaps}곳`);
  } catch (e) {
    console.log(`수익률 ${c.sym} 실패: ${e.message}`);
    if (old?.coins?.[c.sym]) result.coins[c.sym] = old.coins[c.sym];
  }
}
if (!Object.keys(result.coins).length) { console.log("수익률: 전부 실패 — 지난 파일 유지"); process.exit(0); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result));
console.log("수익률 저장:", Object.keys(result.coins).join(", "));
