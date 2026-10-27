// 글로벌 마켓(지수·선물·주식·ETF·환율) → data/macro.json  (15분마다, GitHub Actions)
// Yahoo Finance 차트 API(키 없음). 실패한 종목은 지난 값을 그대로 둔다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MACRO } from "./macro.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/macro.json");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", Accept: "application/json" };

async function chart(sym) {
  for (const host of ["query1", "query2"]) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=15m&includePrePost=false`, { headers: UA, signal: ctl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      const res = j?.chart?.result?.[0]; const m = res?.meta;
      if (!m || m.regularMarketPrice == null) throw new Error("no data");
      const prev = m.chartPreviousClose ?? m.previousClose ?? null;
      const price = m.regularMarketPrice;
      const closes = (res.indicators?.quote?.[0]?.close || []).filter((x) => x != null);
      const step = Math.max(1, Math.ceil(closes.length / 40));
      const spark = closes.filter((_, i) => i % step === 0 || i === closes.length - 1).map((x) => +x.toFixed(4));
      return { price, prev, chg: prev ? price - prev : null, pct: prev ? (price / prev - 1) * 100 : null, cur: m.currency || "", time: m.regularMarketTime ? m.regularMarketTime * 1000 : null, spark };
    } catch (e) { if (host === "query2") throw e; } finally { clearTimeout(t); }
  }
}

let old = {};
try { old = JSON.parse(fs.readFileSync(OUT, "utf8")).quotes || {}; } catch {}
const quotes = { ...old };
let ok = 0, fail = [];
const syms = MACRO.flatMap((g) => g.items.map((x) => x[0]));
for (let i = 0; i < syms.length; i += 6) {
  await Promise.all(syms.slice(i, i + 6).map(async (s) => {
    try { quotes[s] = await chart(s); ok++; } catch (e) { fail.push(`${s}(${e.message})`); }
  }));
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), quotes }, null, 0));
console.log(`글로벌 마켓: ${ok}/${syms.length} 갱신${fail.length ? " · 실패 " + fail.join(", ") : ""}`);
if (!ok && !Object.keys(old).length) process.exitCode = 1;
