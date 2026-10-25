// 로컬 테스트: D1을 node:sqlite로 흉내 내고, 외부 API는 가짜 응답으로 대체
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import worker, { tick, fundingScan, liqParse, kimpCalc, kimpCross, whaleParse, whaleText, fundingText, liqText, kimpText } from "../src/index.js";
const sql = new DatabaseSync(":memory:");
sql.exec(fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
const stmt = (q) => { let args = []; const o = { bind(...a) { args = a; return o; }, async run() { sql.prepare(q).run(...args); return { success: true }; }, async all() { return { results: sql.prepare(q).all(...args) }; }, async first() { return sql.prepare(q).get(...args) ?? null; } }; return o; };
const DB = { prepare: stmt, async batch(list) { for (const s of list) await s.run(); return []; } };
const sent = [];
let scenario = 0;
const T = Date.now();
globalThis.fetch = async (url, init) => {
  url = String(url);
  const ok = (d) => ({ ok: true, status: 200, json: async () => d });
  if (url.includes("api.telegram.org")) { sent.push(JSON.parse(init.body)); return ok({ ok: true }); }
  if (url.includes("mix/market/tickers")) return ok({ data: [
    { symbol: "BTCUSDT", fundingRate: "0.0001", lastPr: "80000", change24h: "-0.012", usdtVolume: "9000000000", holdingAmount: "50000" },
    { symbol: "SOLUSDT", fundingRate: scenario ? "0.0016" : "0.0003", lastPr: "185.2", change24h: "0.061", usdtVolume: "900000000", holdingAmount: "4000000" },
    { symbol: "TINYUSDT", fundingRate: "0.02", lastPr: "0.1", change24h: "0.5", usdtVolume: "100000", holdingAmount: "1" },
    { symbol: "ETHUSDT", fundingRate: "-0.0002", lastPr: "2350", change24h: "0.003", usdtVolume: "4000000000", holdingAmount: "900000" } ] });
  if (url.includes("public/instruments")) return ok({ data: [{ instFamily: "BTC-USDT", ctType: "linear", ctVal: "0.01" }, { instFamily: "ETH-USDT", ctType: "linear", ctVal: "0.1" }, { instFamily: "SOL-USDT", ctType: "linear", ctVal: "1" }] });
  if (url.includes("liquidation-orders")) {
    if (!url.includes("BTC-USDT") || !scenario) return ok({ data: [] });
    return ok({ data: [{ instFamily: "BTC-USDT", details: [
      { posSide: "long", side: "sell", sz: "180", bkPx: "79820", ts: String(T - 20000) },   // 180*0.01*79820 = $143K
      { posSide: "long", side: "sell", sz: "1600", bkPx: "79800", ts: String(T - 15000) },  // $1.28M
      { posSide: "net", side: "buy", sz: "5000", bkPx: "80100", ts: String(T - 10000) },    // short $4.0M
    ] }] });
  }
  if (url.includes("open.er-api.com")) return ok({ result: "success", rates: { KRW: 1450 } });
  if (url.includes("api.upbit.com")) return ok([{ market: "KRW-BTC", trade_price: scenario ? 80000 * 1450 * 1.031 : 80000 * 1450 * 1.025 }, { market: "KRW-ETH", trade_price: 2350 * 1450 * 1.02 }, { market: "KRW-USDT", trade_price: 1475 }]);
  if (url.includes("market/ticker?instId=")) { const c = url.split("instId=")[1].split("-")[0]; return ok({ data: [{ last: { BTC: "80000", ETH: "2350", XRP: "1.3", SOL: "185.2" }[c] }] }); }
  if (url.includes("etherscan")) return ok({ result: [
    { timeStamp: String(Math.floor(T / 1000) - 30), value: "75000000000000", from: "0x5754284f345afc66a98fbb0a0afe71e0f007b949", to: "0x28c6c06298d514db089934071355e5743bf21d60", hash: "0xabc" },
    { timeStamp: String(Math.floor(T / 1000) - 30), value: "1000000", from: "0x1", to: "0x2", hash: "0xdef" } ] });
  return { ok: false, status: 404, json: async () => ({}) };
};
const env = { DB, TELEGRAM_BOT_TOKEN: "x", TG_CHANNEL_KO: "@ko", TG_CHANNEL_EN: "@en", SITE: "https://example.com/chainbrief/", PERPLINE: "https://example.com/perpline/", ETHERSCAN_API_KEY: "k", TG_WEBHOOK_SECRET: "s3" };

// 1) 첫 실행: 기준값만 저장, 알림 없어야 함 (청산·고래 제외)
console.log("run1 errors", await tick(env, new Date(Date.UTC(2026, 9, 26, 3, 0))));
console.log("run1 sent", sent.length, sent.map((m) => m.text.split("\n")[0]));
sent.length = 0; scenario = 1;
console.log("run2 errors", await tick(env, new Date(Date.UTC(2026, 9, 26, 3, 5))));
for (const m of sent) console.log("---", m.chat_id, "\n" + m.text);
// API
for (const p of ["/api/latest", "/api/alerts?lang=en&limit=5", "/api/series?k=kimp_btc,funding_SOL,liq_long&h=48", "/"]) {
  const r = await worker.fetch(new Request("https://w.dev" + p), env); const j = await r.json();
  console.log(p, r.status, JSON.stringify(j).slice(0, 300));
}
const wh = await worker.fetch(new Request("https://w.dev/tg/s3", { method: "POST", body: JSON.stringify({ message: { chat: { id: 5 }, from: { language_code: "ko" } } }) }), env);
console.log("webhook", wh.status, sent.at(-1).text.slice(0, 60));
// 단위 체크
console.log("cross", kimpCross(2.9, 3.1), kimpCross(3.1, 2.9), kimpCross(-0.9, -1.2));
