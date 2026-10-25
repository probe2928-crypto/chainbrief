// 대시보드 미리보기용: 합성 데이터로 워커 API를 localhost:8787에 띄운다
import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import worker from "../src/index.js";
const sql = new DatabaseSync(":memory:");
sql.exec(fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
const stmt = (q) => { let a = []; const o = { bind(...x) { a = x; return o; }, async run() { sql.prepare(q).run(...a); return {}; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async first() { return sql.prepare(q).get(...a) ?? null; } }; return o; };
const DB = { prepare: stmt, async batch(l) { for (const s of l) await s.run(); } };
const now = Date.now(), ins = sql.prepare("INSERT INTO series (ts,k,v) VALUES (?,?,?)");
for (let i = 576; i >= 0; i--) { const ts = now - i * 300e3, x = i / 576;
  ins.run(ts, "kimp_btc", 2.1 + Math.sin(x * 9) * 0.6 + x * 0.8 + (Math.random() - .5) * 0.08);
  ins.run(ts, "kimp_usdt", 1.2 + Math.sin(x * 7 + 1) * 0.4 + (Math.random() - .5) * 0.05);
  if (i % 3 === 0) { ins.run(ts, "funding_BTC", 0.008 + Math.sin(x * 5) * 0.004); ins.run(ts, "funding_ETH", 0.006 + Math.cos(x * 4) * 0.006); }
  if (i <= 288) { const burst = i === 60 ? 9e6 : i === 200 ? 4e6 : 0; ins.run(ts, "liq_long", Math.random() * 6e5 + burst); ins.run(ts, "liq_short", Math.random() * 4e5 + (i === 120 ? 5e6 : 0)); } }
const li = sql.prepare("INSERT INTO liq (ts,sym,side,usd,px) VALUES (?,?,?,?,?)");
li.run(now - 5 * 3600e3, "BTC", "long", 4.2e6, 79820); li.run(now - 10 * 3600e3, "ETH", "short", 2.1e6, 2380.5); li.run(now - 20 * 60e3, "SOL", "long", 1.3e6, 183.1); li.run(now - 40 * 60e3, "BTC", "short", 6e5, 80110);
const kv = sql.prepare("INSERT INTO kv (k,v,ts) VALUES (?,?,?)");
kv.run("kimp:now", JSON.stringify({ ts: now, fx: 1447.3, coins: { BTC: { krw: 119890000, usd: 80180, kimp: 3.32 }, USDT: { krw: 1471, kimp: 1.64 } } }), now);
const mk = (sym, fr, px, oi) => ({ sym, fr, px, oi, chg: 1, vol: 1e8 });
kv.run("funding:board", JSON.stringify({ ts: now, top: [mk("ZORAUSDT", 0.0041, 0.08812, 4.1e7), mk("SOLUSDT", 0.0016, 185.2, 7.4e8), mk("WIFUSDT", 0.0011, 1.912, 1.2e8)], bottom: [mk("TRUMPUSDT", -0.0032, 8.12, 9e7), mk("PEPEUSDT", -0.0009, 0.00000912, 2.2e8)] }), now);
const al = sql.prepare("INSERT INTO alerts (ts,type,sym,ko,en,data) VALUES (?,?,?,?,?,?)");
al.run(now - 20 * 60e3, "liq", "SOL", "💥 <b>대량 청산 · SOL 롱 $1.3M</b>\n청산가 $183.10 · <i>OKX 기준</i>", "💥 <b>Large liquidation · SOL long $1.3M</b>\nBankruptcy price $183.10 · <i>OKX data</i>", "{}");
al.run(now - 65 * 60e3, "kimp", "BTC", "🇰🇷 <b>김프 3% 돌파 · BTC +3.05%</b>\n업비트 ₩119,500,000 · 글로벌 $80,050 · 환율 1447.3\nUSDT 김프 +1.60%", "🇰🇷 <b>Kimchi premium breaks above 3% · BTC +3.05%</b>\nUpbit ₩119,500,000 · global $80,050 · USD/KRW 1447.3\nUSDT premium +1.60%", "{}");
al.run(now - 3 * 3600e3, "funding", "SOLUSDT", "🔺 <b>펀딩비 급변 · SOL</b>\n현재 <b>+0.160%</b> (8시간) · 직전 +0.030%\n가격 $185.20 (24h +6.1%) · 미결제약정 $740.8M\n롱 포지션 쏠림이 커졌다는 뜻이에요. <i>Bitget 기준</i>", "🔺 <b>Funding swing · SOL</b>\nNow <b>+0.160%</b> (8h) · prev +0.030%\nPrice $185.20 (24h +6.1%) · OI $740.8M\nLongs are crowding in. <i>Bitget data</i>", "{}");
const env = { DB, SITE: "http://localhost:4321/" };
http.createServer(async (req, res) => { const r = await worker.fetch(new Request("http://localhost:8787" + req.url), env); res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(await r.text()); }).listen(8787, () => console.log("mock api :8787"));
