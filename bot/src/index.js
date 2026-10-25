// 체인브리프 시그널 — Cloudflare Worker
// 1분마다: 대량 청산(OKX)·김프(업비트 vs 글로벌) / 5분마다: 펀딩비(Bitget 전 종목) / 2분마다: 고래(이더리움 스테이블코인, Etherscan 키 있을 때)
// 기준을 넘으면 텔레그램 채널(한국어·영어)로 알리고, 대시보드용 JSON API를 제공한다.

import { deliver, flushOutbox, broadcastFree, checkPayments, expiries, onUpdate, tgApi } from "./subs.js";
import { SCHEMA } from "./schema.js";

export const RULES = {
  fundingAbs: 0.001,        // |펀딩비| ≥ 0.10% (8h 기준)
  fundingJump: 0.0005,      // 직전 값 대비 0.05%p 이상 변화
  fundingMinVol: 20e6,      // 24h 거래대금 $20M 이상 종목만
  fundingCooldown: 4 * 3600e3,
  liqSingle: 1e6,           // 단일 청산 $1M 이상
  liqBurst: 5e6,            // 1분 합계 $5M 이상
  liqCooldown: 10 * 60e3,
  kimpSteps: [-2, -1, 2, 3, 4, 5, 7, 10], // BTC 김프 % 구간 돌파
  kimpJump: 0.8,            // 30분 내 0.8%p 이상 변동
  kimpCooldown: 60 * 60e3,
  whaleMove: 50e6,          // 스테이블코인 이동 $50M 이상
  whaleMint: 10e6,          // 발행·소각 $10M 이상
};
const LIQ_FAMILIES = ["BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT", "DOGE-USDT"];
const KIMP_COINS = ["BTC", "ETH", "XRP", "SOL"];
const STABLES = { USDT: { addr: "0xdac17f958d2ee523a2206206994597c13d831ec7", dec: 6 }, USDC: { addr: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", dec: 6 } };
// 공개적으로 확인된 주소만 이름을 붙인다 (나머지는 축약 주소)
const LABELS = {
  "0x0000000000000000000000000000000000000000": "Mint/Burn",
  "0x5754284f345afc66a98fbb0a0afe71e0f007b949": "Tether Treasury",
};

/* ---------- helpers ---------- */
const now = () => Date.now();
const DAY_MS = 86400e3;
async function getJSON(url, init = {}, ms = 8000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal, headers: { "user-agent": "chainbrief-signals/1.0", accept: "application/json", ...(init.headers || {}) } });
    if (!r.ok) throw new Error(`${r.status} ${url.split("?")[0]}`);
    return await r.json();
  } finally { clearTimeout(t); }
}
const kvGet = async (db, k, d = null) => { const r = await db.prepare("SELECT v FROM kv WHERE k = ?").bind(k).first(); if (!r) return d; try { return JSON.parse(r.v); } catch { return d; } };
const kvSet = (db, k, v) => db.prepare("INSERT INTO kv (k, v, ts) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, ts = excluded.ts").bind(k, JSON.stringify(v), now()).run();
const addSeries = (db, k, v, ts = now()) => db.prepare("INSERT INTO series (ts, k, v) VALUES (?, ?, ?)").bind(ts, k, v).run();
async function cooldown(db, key, ms) {
  const last = await kvGet(db, "cd:" + key, 0);
  if (now() - last < ms) return false;
  await kvSet(db, "cd:" + key, now()); return true;
}
export const fmt = {
  usd(v) { if (v == null) return "—"; const a = Math.abs(v); return (v < 0 ? "-$" : "$") + (a >= 1e9 ? (a / 1e9).toFixed(2) + "B" : a >= 1e6 ? (a / 1e6).toFixed(1) + "M" : a >= 1e3 ? (a / 1e3).toFixed(0) + "K" : a.toFixed(2)); },
  px(v) { return v >= 1000 ? "$" + Math.round(v).toLocaleString("en-US") : v >= 1 ? "$" + v.toFixed(2) : "$" + v.toPrecision(4); },
  krw(v) { return "₩" + Math.round(v).toLocaleString("en-US"); },
  pct(v, d = 2) { return (v >= 0 ? "+" : "") + v.toFixed(d) + "%"; },
  fr(v) { return (v >= 0 ? "+" : "") + (v * 100).toFixed(3) + "%"; },
  addr(a) { return LABELS[a?.toLowerCase()] || (a ? a.slice(0, 6) + "…" + a.slice(-4) : "?"); },
};
const esc = (s = "") => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

/* ---------- telegram ---------- */
async function tg(env, chat, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !chat || chat.startsWith("__")) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    return r.ok;
  } catch { return false; }
}
function footer(env, lang) {
  const site = env.SITE || "";
  return lang === "ko"
    ? `\n\n📊 <a href="${site}signals/">실시간 대시보드</a> · <a href="${site}">체인브리프</a>`
    : `\n\n📊 <a href="${site}en/signals/">Live dashboard</a> · 💸 <a href="${env.PERPLINE || ""}">Cut your trading fees — Perpline</a>`;
}
async function alert(env, { type, sym, ko, en, data, important = false }) {
  await env.DB.prepare("INSERT INTO alerts (ts, type, sym, ko, en, data) VALUES (?, ?, ?, ?, ?, ?)").bind(now(), type, sym || "", ko, en, JSON.stringify(data || {})).run();
  await deliver(env, { ko, en }, footer, important);
}

/* ---------- funding (Bitget, every 5 min) ---------- */
export function fundingScan(tickers, prev, rules = RULES) {
  const rows = tickers
    .map((t) => ({ sym: t.symbol, fr: parseFloat(t.fundingRate), px: parseFloat(t.lastPr), chg: parseFloat(t.change24h) * 100, vol: parseFloat(t.usdtVolume), oi: parseFloat(t.holdingAmount) * parseFloat(t.lastPr) }))
    .filter((r) => isFinite(r.fr) && isFinite(r.px) && r.vol >= rules.fundingMinVol);
  const hits = [];
  for (const r of rows) {
    const p = prev?.[r.sym];
    const extreme = Math.abs(r.fr) >= rules.fundingAbs;
    const jump = p != null && Math.abs(r.fr - p) >= rules.fundingJump;
    if (extreme || jump) hits.push({ ...r, prev: p ?? null, reason: jump ? "jump" : "extreme" });
  }
  rows.sort((a, b) => b.fr - a.fr);
  return { rows, hits, top: rows.slice(0, 10), bottom: rows.slice(-10).reverse(), snapshot: Object.fromEntries(rows.map((r) => [r.sym, r.fr])) };
}
export function fundingText(h) {
  const dir = h.fr >= 0, coin = h.sym.replace(/USDT$/, "");
  const was = h.prev != null ? ` · 직전 ${fmt.fr(h.prev)}` : "", wasEn = h.prev != null ? ` · prev ${fmt.fr(h.prev)}` : "";
  const ko = `${dir ? "🔺" : "🔻"} <b>펀딩비 ${h.reason === "jump" ? "급변" : dir ? "과열" : "음수 확대"} · ${esc(coin)}</b>\n현재 <b>${fmt.fr(h.fr)}</b> (8시간)${was}\n가격 ${fmt.px(h.px)} (24h ${fmt.pct(h.chg, 1)}) · 미결제약정 ${fmt.usd(h.oi)}\n${dir ? "롱 포지션 쏠림이 커졌다는 뜻이에요." : "숏 포지션 쏠림이 커졌다는 뜻이에요."} <i>Bitget 기준</i>`;
  const en = `${dir ? "🔺" : "🔻"} <b>Funding ${h.reason === "jump" ? "swing" : dir ? "running hot" : "deeply negative"} · ${esc(coin)}</b>\nNow <b>${fmt.fr(h.fr)}</b> (8h)${wasEn}\nPrice ${fmt.px(h.px)} (24h ${fmt.pct(h.chg, 1)}) · OI ${fmt.usd(h.oi)}\n${dir ? "Longs are crowding in." : "Shorts are crowding in."} <i>Bitget data</i>`;
  return { ko, en };
}
async function runFunding(env) {
  const j = await getJSON("https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES");
  const prev = await kvGet(env.DB, "funding:prev", null);
  const r = fundingScan(j.data || [], prev);
  await kvSet(env.DB, "funding:prev", r.snapshot);
  await kvSet(env.DB, "funding:board", { ts: now(), top: r.top, bottom: r.bottom, majors: r.rows.filter((x) => /^(BTC|ETH|SOL|XRP|DOGE|BNB)USDT$/.test(x.sym)) });
  for (const s of ["BTCUSDT", "ETHUSDT", "SOLUSDT"]) { const x = r.rows.find((y) => y.sym === s); if (x) await addSeries(env.DB, "funding_" + s.replace("USDT", ""), x.fr * 100); }
  if (!prev) return; // 첫 실행은 기준값만 저장
  for (const h of r.hits.sort((a, b) => Math.abs(b.fr) - Math.abs(a.fr)).slice(0, 3)) {
    if (!(await cooldown(env.DB, "fr:" + h.sym, RULES.fundingCooldown))) continue;
    await alert(env, { type: "funding", sym: h.sym, ...fundingText(h), data: h, important: Math.abs(h.fr) >= 0.002 });
  }
}

/* ---------- liquidations (OKX, every minute) ---------- */
export function liqParse(rows, ctVal, since) {
  const out = [];
  for (const g of rows || []) {
    const fam = g.instFamily || g.uly || "", coin = fam.split("-")[0], cv = ctVal[fam] ?? ctVal[coin] ?? null;
    if (!cv) continue;
    for (const d of g.details || []) {
      const ts = +d.ts; if (!(ts > since)) continue;
      const px = parseFloat(d.bkPx), usd = parseFloat(d.sz) * cv * px;
      const side = d.posSide === "short" || (d.posSide === "net" && d.side === "buy") ? "short" : "long"; // 청산된 포지션 방향
      if (isFinite(usd)) out.push({ ts, sym: coin, side, usd, px });
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}
export function liqText(kind, x) {
  if (kind === "single") {
    const L = x.side === "long";
    return {
      ko: `💥 <b>대량 청산 · ${esc(x.sym)} ${L ? "롱" : "숏"} ${fmt.usd(x.usd)}</b>\n청산가 ${fmt.px(x.px)} · <i>OKX 기준</i>`,
      en: `💥 <b>Large liquidation · ${esc(x.sym)} ${L ? "long" : "short"} ${fmt.usd(x.usd)}</b>\nBankruptcy price ${fmt.px(x.px)} · <i>OKX data</i>`,
    };
  }
  return {
    ko: `💥 <b>1분간 청산 ${fmt.usd(x.total)}</b>\n롱 ${fmt.usd(x.long)} · 숏 ${fmt.usd(x.short)}\n${esc(x.coins.join(" · "))} · <i>OKX 기준</i>`,
    en: `💥 <b>${fmt.usd(x.total)} liquidated in one minute</b>\nLongs ${fmt.usd(x.long)} · Shorts ${fmt.usd(x.short)}\n${esc(x.coins.join(" · "))} · <i>OKX data</i>`,
  };
}
async function okxCtVal(env) {
  let cv = await kvGet(env.DB, "okx:ctval", null);
  if (cv && now() - (cv._ts || 0) < 86400e3) return cv;
  const j = await getJSON("https://www.okx.com/api/v5/public/instruments?instType=SWAP");
  cv = { _ts: now() };
  for (const i of j.data || []) if (LIQ_FAMILIES.includes(i.instFamily) && i.ctType === "linear") cv[i.instFamily] = parseFloat(i.ctVal);
  await kvSet(env.DB, "okx:ctval", cv); return cv;
}
async function runLiq(env) {
  const cv = await okxCtVal(env);
  const since = await kvGet(env.DB, "liq:since", now() - 120e3);
  const res = await Promise.allSettled(LIQ_FAMILIES.map((f) => getJSON(`https://www.okx.com/api/v5/public/liquidation-orders?instType=SWAP&instFamily=${f}&state=filled&limit=100`)));
  const rows = res.flatMap((r) => (r.status === "fulfilled" ? r.value.data || [] : []));
  const ev = liqParse(rows, cv, since);
  if (!ev.length) return;
  await kvSet(env.DB, "liq:since", Math.max(since, ...ev.map((e) => e.ts)));
  const stmts = ev.map((e) => env.DB.prepare("INSERT INTO liq (ts, sym, side, usd, px) VALUES (?, ?, ?, ?, ?)").bind(e.ts, e.sym, e.side, e.usd, e.px));
  await env.DB.batch(stmts);
  const big = ev.filter((e) => e.usd >= RULES.liqSingle).sort((a, b) => b.usd - a.usd);
  if (big.length && (await cooldown(env.DB, "liq:single:" + big[0].sym, RULES.liqCooldown))) await alert(env, { type: "liq", sym: big[0].sym, ...liqText("single", big[0]), data: big[0], important: big[0].usd >= 3e6 });
  const recent = ev.filter((e) => e.ts > now() - 90e3);
  const long = recent.filter((e) => e.side === "long").reduce((a, e) => a + e.usd, 0), short = recent.filter((e) => e.side === "short").reduce((a, e) => a + e.usd, 0);
  if (long + short >= RULES.liqBurst && (await cooldown(env.DB, "liq:burst", RULES.liqCooldown))) {
    const x = { total: long + short, long, short, coins: [...new Set(recent.map((e) => e.sym))] };
    await alert(env, { type: "liq", sym: "", ...liqText("burst", x), data: x, important: x.total >= 10e6 });
  }
}

/* ---------- kimchi premium (every minute) ---------- */
export function kimpCalc(upbit, global, fx) {
  const out = {};
  for (const c of KIMP_COINS) { const k = upbit["KRW-" + c], g = global[c]; if (k && g && fx) out[c] = { krw: k, usd: g, kimp: (k / (g * fx) - 1) * 100 }; }
  if (upbit["KRW-USDT"] && fx) out.USDT = { krw: upbit["KRW-USDT"], kimp: (upbit["KRW-USDT"] / fx - 1) * 100 };
  return out;
}
export function kimpCross(prev, cur, steps = RULES.kimpSteps) {
  if (prev == null || cur == null) return null;
  for (const s of steps) {
    if (s > 0 && prev < s && cur >= s) return { dir: "up", step: s };
    if (s < 0 && prev > s && cur <= s) return { dir: "down", step: s };
  }
  return null;
}
export function kimpText(k, info, fx) {
  const b = k.BTC, u = k.USDT;
  const head = info.kind === "cross"
    ? { ko: `김프 ${info.step}% ${info.dir === "up" ? "돌파" : "하회"}`, en: `Kimchi premium ${info.dir === "up" ? "breaks above" : "drops below"} ${info.step}%` }
    : { ko: `김프 급변 (30분 ${fmt.pct(info.delta)}p)`, en: `Kimchi premium swing (${fmt.pct(info.delta)}pt in 30 min)` };
  return {
    ko: `🇰🇷 <b>${head.ko} · BTC ${fmt.pct(b.kimp)}</b>\n업비트 ${fmt.krw(b.krw)} · 글로벌 ${fmt.px(b.usd)} · 환율 ${fx.toFixed(1)}${u ? `\nUSDT 김프 ${fmt.pct(u.kimp)}` : ""}`,
    en: `🇰🇷 <b>${head.en} · BTC ${fmt.pct(b.kimp)}</b>\nUpbit ${fmt.krw(b.krw)} · global ${fmt.px(b.usd)} · USD/KRW ${fx.toFixed(1)}${u ? `\nUSDT premium ${fmt.pct(u.kimp)}` : ""}`,
  };
}
async function getFx(env) {
  let fx = await kvGet(env.DB, "fx", null);
  if (fx && now() - fx.ts < 3600e3) return fx.v;
  try { const j = await getJSON("https://open.er-api.com/v6/latest/USD"); if (j.rates?.KRW) { fx = { v: j.rates.KRW, ts: now() }; await kvSet(env.DB, "fx", fx); } } catch {}
  return fx?.v || null;
}
async function runKimp(env, when = new Date()) {
  const fx = await getFx(env);
  const mk = [...KIMP_COINS.map((c) => "KRW-" + c), "KRW-USDT"].join(",");
  let up = {};
  try { for (const t of await getJSON(`https://api.upbit.com/v1/ticker?markets=${mk}`)) up[t.market] = t.trade_price; }
  catch { for (const t of await getJSON(`https://api.bithumb.com/v1/ticker?markets=${mk}`)) up[t.market] = t.trade_price; }
  const gl = {};
  const okx = await Promise.allSettled(KIMP_COINS.map((c) => getJSON(`https://www.okx.com/api/v5/market/ticker?instId=${c}-USDT`)));
  okx.forEach((r, i) => { const t = r.status === "fulfilled" && r.value.data?.[0]; if (t) gl[KIMP_COINS[i]] = parseFloat(t.last); });
  if (!gl.BTC) { // OKX가 막히면 Bitget 현물로
    const bg = await getJSON("https://api.bitget.com/api/v2/spot/market/tickers");
    for (const t of bg.data || []) { const c = t.symbol.replace(/USDT$/, ""); if (t.symbol.endsWith("USDT") && KIMP_COINS.includes(c)) gl[c] = parseFloat(t.lastPr); }
  }
  const k = kimpCalc(up, gl, fx);
  if (!k.BTC) return;
  await kvSet(env.DB, "kimp:now", { ts: now(), fx, coins: k });
  const minute = when.getUTCMinutes();
  if (minute % 5 === 0) { await addSeries(env.DB, "kimp_btc", k.BTC.kimp); if (k.USDT) await addSeries(env.DB, "kimp_usdt", k.USDT.kimp); }
  const prev = await kvGet(env.DB, "kimp:prev", null);
  const hist = (await kvGet(env.DB, "kimp:hist", [])).filter((h) => now() - h.ts < 30 * 60e3);
  hist.push({ ts: now(), v: k.BTC.kimp }); await kvSet(env.DB, "kimp:hist", hist);
  await kvSet(env.DB, "kimp:prev", k.BTC.kimp);
  if (prev == null) return;
  const cross = kimpCross(prev, k.BTC.kimp);
  const delta = k.BTC.kimp - hist[0].v;
  let info = null;
  if (cross) info = { kind: "cross", ...cross };
  else if (Math.abs(delta) >= RULES.kimpJump) info = { kind: "jump", delta };
  if (info && (await cooldown(env.DB, "kimp:" + info.kind + (info.step ?? ""), RULES.kimpCooldown))) await alert(env, { type: "kimp", sym: "BTC", ...kimpText(k, info, fx), data: { ...info, kimp: k.BTC.kimp }, important: info.kind === "cross" });
}

/* ---------- whales (Ethereum stablecoins, every 2 min, needs ETHERSCAN_API_KEY) ---------- */
export function whaleParse(txs, token, since) {
  const t = STABLES[token]; const out = [];
  for (const x of txs || []) {
    const ts = +x.timeStamp * 1000; if (!(ts > since)) continue;
    const amt = Number(BigInt(x.value) / 10n ** BigInt(t.dec - 2)) / 100;
    const from = x.from.toLowerCase(), to = x.to.toLowerCase(), zero = "0x0000000000000000000000000000000000000000";
    const kind = from === zero ? "mint" : to === zero ? "burn" : "move";
    const min = kind === "move" ? RULES.whaleMove : RULES.whaleMint;
    if (amt >= min) out.push({ ts, token, amt, from, to, kind, hash: x.hash });
  }
  return out;
}
export function whaleText(w) {
  const k = { mint: ["발행", "minted"], burn: ["소각", "burned"], move: ["이동", "moved"] }[w.kind];
  const amt = Math.round(w.amt).toLocaleString("en-US"), link = `https://etherscan.io/tx/${w.hash}`;
  return {
    ko: `🐋 <b>${amt} ${w.token} ${k[0]}</b>\n${esc(fmt.addr(w.from))} → ${esc(fmt.addr(w.to))}\n<a href="${link}">Etherscan에서 보기</a>`,
    en: `🐋 <b>${amt} ${w.token} ${k[1]}</b>\n${esc(fmt.addr(w.from))} → ${esc(fmt.addr(w.to))}\n<a href="${link}">View on Etherscan</a>`,
  };
}
async function runWhales(env) {
  if (!env.ETHERSCAN_API_KEY) return;
  for (const token of Object.keys(STABLES)) {
    const since = await kvGet(env.DB, "whale:" + token, now() - 10 * 60e3);
    const j = await getJSON(`https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokentx&contractaddress=${STABLES[token].addr}&page=1&offset=200&sort=desc&apikey=${env.ETHERSCAN_API_KEY}`);
    if (!Array.isArray(j.result)) continue;
    const latest = Math.max(since, ...j.result.map((x) => +x.timeStamp * 1000));
    await kvSet(env.DB, "whale:" + token, latest);
    for (const w of whaleParse(j.result, token, since).slice(0, 3)) await alert(env, { type: "whale", sym: token, ...whaleText(w), data: w, important: w.amt >= 200e6 });
  }
}

/* ---------- daily digest (09:00 KST) & housekeeping ---------- */
async function digest(env) {
  const db = env.DB, day = now() - 86400e3;
  const liq = await db.prepare("SELECT side, SUM(usd) AS s FROM liq WHERE ts > ? GROUP BY side").bind(day).all();
  const L = Object.fromEntries((liq.results || []).map((r) => [r.side, r.s]));
  const board = await kvGet(db, "funding:board", null), k = await kvGet(db, "kimp:now", null);
  const n = await db.prepare("SELECT COUNT(*) AS n FROM alerts WHERE ts > ?").bind(day).first();
  const top = board?.top?.[0], bot = board?.bottom?.[0];
  const ko = `☀️ <b>체인브리프 시그널 · 아침 요약</b>\n24시간 청산 ${fmt.usd((L.long || 0) + (L.short || 0))} (롱 ${fmt.usd(L.long || 0)} / 숏 ${fmt.usd(L.short || 0)}, OKX)\n${k?.coins?.BTC ? `BTC 김프 ${fmt.pct(k.coins.BTC.kimp)}` : ""}${k?.coins?.USDT ? ` · USDT 김프 ${fmt.pct(k.coins.USDT.kimp)}` : ""}\n${top ? `펀딩 최고 ${esc(top.sym.replace("USDT", ""))} ${fmt.fr(top.fr)}` : ""}${bot ? ` · 최저 ${esc(bot.sym.replace("USDT", ""))} ${fmt.fr(bot.fr)}` : ""}\n어제 보낸 알림 ${n?.n || 0}건`;
  const en = `☀️ <b>CHAINBRIEF Signals · daily brief</b>\n24h liquidations ${fmt.usd((L.long || 0) + (L.short || 0))} (longs ${fmt.usd(L.long || 0)} / shorts ${fmt.usd(L.short || 0)}, OKX)\n${k?.coins?.BTC ? `BTC kimchi premium ${fmt.pct(k.coins.BTC.kimp)}` : ""}\n${top ? `Highest funding ${esc(top.sym.replace("USDT", ""))} ${fmt.fr(top.fr)}` : ""}${bot ? ` · lowest ${esc(bot.sym.replace("USDT", ""))} ${fmt.fr(bot.fr)}` : ""}\nAlerts in the last 24h: ${n?.n || 0}`;
  await broadcastFree(env, ko + footer(env, "ko"), en + footer(env, "en"));
}
async function prune(env) {
  const t30 = now() - 30 * 86400e3, t3 = now() - 3 * 86400e3;
  await env.DB.batch([env.DB.prepare("DELETE FROM series WHERE ts < ?").bind(t30), env.DB.prepare("DELETE FROM liq WHERE ts < ?").bind(t3), env.DB.prepare("DELETE FROM alerts WHERE ts < ?").bind(t30), env.DB.prepare("DELETE FROM outbox WHERE sent = 1 AND created < ?").bind(t3), env.DB.prepare("UPDATE invoices SET status = 'expired' WHERE status = 'pending' AND expires < ?").bind(now() - DAY_MS)]);
}
async function liqBuckets(env) {
  // 5분 버킷으로 롱/숏 청산 합계를 시계열에 기록 (차트용)
  const end = Math.floor(now() / 300e3) * 300e3, start = end - 300e3;
  const r = await env.DB.prepare("SELECT side, SUM(usd) AS s FROM liq WHERE ts >= ? AND ts < ? GROUP BY side").bind(start, end).all();
  const m = Object.fromEntries((r.results || []).map((x) => [x.side, x.s]));
  await addSeries(env.DB, "liq_long", m.long || 0, start); await addSeries(env.DB, "liq_short", m.short || 0, start);
}

/* ---------- self setup: 테이블 생성 · 웹훅 비밀값 · 봇 아이디/관리자 불러오기 ---------- */
let schemaReady = false;
const hex = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
export async function prepare(env) {
  if (!schemaReady) { await env.DB.batch(SCHEMA.map((q) => env.DB.prepare(q))); schemaReady = true; }
  const [bot, admin] = await Promise.all([kvGet(env.DB, "bot:username"), kvGet(env.DB, "admin")]);
  return { ...env, BOT_USERNAME: env.BOT_USERNAME || bot || "", ADMIN_CHAT_ID: env.ADMIN_CHAT_ID || admin || "", TG_WEBHOOK_SECRET: env.TG_WEBHOOK_SECRET || (env.TELEGRAM_BOT_TOKEN ? (await hex(env.TELEGRAM_BOT_TOKEN)).slice(0, 32) : "") };
}
async function setup(env, origin) {
  const checks = [];
  const ok = (label, pass, hint = "") => checks.push({ label, pass: !!pass, hint });
  ok("데이터베이스 (D1)", true);
  if (!env.TELEGRAM_BOT_TOKEN) { ok("텔레그램 봇 토큰", false, "Cloudflare → 이 워커 → Settings → Variables and Secrets 에 TELEGRAM_BOT_TOKEN 추가"); return checks; }
  const me = await tgApi(env, "getMe", {});
  ok("텔레그램 봇", me?.username, me?.username ? "@" + me.username : "토큰이 맞는지 확인");
  if (me?.username) await kvSet(env.DB, "bot:username", me.username);
  const hook = await tgApi(env, "setWebhook", { url: `${origin}/tg/${env.TG_WEBHOOK_SECRET}`, allowed_updates: ["message", "callback_query"] });
  ok("봇 대화 연결 (웹훅)", hook);
  await tgApi(env, "setMyCommands", { commands: [{ command: "pro", description: "프로 구독 · Go Pro" }, { command: "status", description: "이용 상태 · My plan" }, { command: "lang", description: "언어 · Language" }] });
  for (const [k, label] of [["TG_CHANNEL_KO", "무료 채널 (한국어)"], ["TG_CHANNEL_EN", "무료 채널 (영어)"], ["TG_PRO_KO", "프로 채널 (한국어)"], ["TG_PRO_EN", "프로 채널 (영어)"]]) {
    const ch = env[k];
    if (!ch) { ok(label, k.startsWith("TG_PRO") ? "skip" : false, k.startsWith("TG_PRO") ? "없으면 프로 알림은 봇 대화로 보내요" : `변수 ${k} 에 @채널아이디`); continue; }
    const m = me?.id ? await tgApi(env, "getChatMember", { chat_id: ch, user_id: me.id }) : null;
    ok(label, m && ["administrator", "creator"].includes(m.status), m ? `${ch} · 봇 권한: ${m.status}` : `${ch} — 봇을 채널 관리자로 추가해 주세요`);
  }
  ok("결제 주소 (USDT TRC20)", env.PAY_TRON_ADDRESS, env.PAY_TRON_ADDRESS ? env.PAY_TRON_ADDRESS.slice(0, 6) + "…" + env.PAY_TRON_ADDRESS.slice(-4) : "변수 PAY_TRON_ADDRESS — 비워두면 무료 모드(결제 없이 모든 알림 즉시)");
  ok("관리자", env.ADMIN_CHAT_ID, env.ADMIN_CHAT_ID ? "등록됨" : "봇에게 /claim <봇 토큰 마지막 6글자> 를 보내면 관리자로 등록돼요");
  ok("고래 알림 (선택)", env.ETHERSCAN_API_KEY ? true : "skip", env.ETHERSCAN_API_KEY ? "" : "Secrets에 ETHERSCAN_API_KEY 추가하면 켜져요");
  await kvSet(env.DB, "setup", { ts: now(), origin });
  return checks;
}
function setupPage(checks, origin) {
  const row = (c) => `<li class="${c.pass === "skip" ? "skip" : c.pass ? "ok" : "no"}"><b>${c.pass === "skip" ? "–" : c.pass ? "✓" : "✕"}</b><span>${esc(c.label)}</span><small>${esc(c.hint || "")}</small></li>`;
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>체인브리프 시그널 · 설정 확인</title>
<style>body{margin:0;background:#0b0b0b;color:#edebe6;font:16px/1.6 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}main{max-width:640px;margin:0 auto;padding:48px 20px}h1{font-family:Didot,"Bodoni 72",Georgia,serif;font-weight:400;letter-spacing:.3em;font-size:22px;margin:0 0 6px}p{color:#a3a09a}ul{list-style:none;padding:0;margin:28px 0;border-top:1px solid #262625}li{display:grid;grid-template-columns:28px 1fr;gap:2px 10px;padding:14px 0;border-bottom:1px solid #262625}li b{grid-row:span 2}li.ok b{color:#7ccf9a}li.no b{color:#e46b62}li.skip b{color:#7a7873}small{color:#a3a09a;font-size:13px;word-break:break-all}code{background:#1a1a19;padding:2px 6px}</style></head>
<body><main><h1>CHAINBRIEF SIGNALS</h1><p>설정 확인 페이지예요. 값을 바꾼 뒤 이 페이지를 새로고침하면 다시 확인해요.</p><ul>${checks.map(row).join("")}</ul>
<p>대시보드 API 주소 (체인브리프에 연결할 주소):<br><code>${esc(origin)}</code></p></main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function tick(env, when = new Date()) {
  const m = when.getUTCMinutes(), h = when.getUTCHours();
  const jobs = [["liq", runLiq], ["kimp", runKimp], ["outbox", flushOutbox], ["payments", checkPayments]];
  if (m === 7) jobs.push(["expiries", expiries]);
  if (m % 5 === 0) jobs.push(["funding", runFunding], ["liqBuckets", liqBuckets]);
  if (m % 2 === 0) jobs.push(["whales", runWhales]);
  if (h === 0 && m === 0) jobs.push(["digest", digest]);
  if (h === 0 && m === 30) jobs.push(["prune", prune]);
  const res = await Promise.allSettled(jobs.map(([, f]) => f(env, when)));
  const errs = res.map((r, i) => (r.status === "rejected" ? `${jobs[i][0]}: ${r.reason?.message || r.reason}` : null)).filter(Boolean);
  if (errs.length) await kvSet(env.DB, "errors", { ts: now(), errs });
  return errs;
}

/* ---------- HTTP: dashboard API + Telegram webhook ---------- */
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "public, max-age=30" } });
async function api(env, url) {
  const db = env.DB, p = url.pathname;
  if (p === "/api/latest") {
    const [kimp, board, l1, l24, big, errors] = await Promise.all([
      kvGet(db, "kimp:now"), kvGet(db, "funding:board"),
      db.prepare("SELECT side, SUM(usd) AS s FROM liq WHERE ts > ? GROUP BY side").bind(now() - 3600e3).all(),
      db.prepare("SELECT side, SUM(usd) AS s FROM liq WHERE ts > ? GROUP BY side").bind(now() - 86400e3).all(),
      db.prepare("SELECT ts, sym, side, usd, px FROM liq WHERE ts > ? ORDER BY usd DESC LIMIT 12").bind(now() - 86400e3).all(),
      kvGet(db, "errors"),
    ]);
    const sum = (r) => Object.fromEntries((r.results || []).map((x) => [x.side, x.s]));
    return json({ updated: now(), kimp, funding: board, liq: { h1: sum(l1), h24: sum(l24), largest: big.results || [] }, health: errors && now() - errors.ts < 600e3 ? errors.errs : [] });
  }
  if (p === "/api/alerts") {
    const lim = Math.min(100, +url.searchParams.get("limit") || 40), lang = url.searchParams.get("lang") === "en" ? "en" : "ko";
    const delay = env.PAY_TRON_ADDRESS && !String(env.PAY_TRON_ADDRESS).startsWith("__") ? +(env.FREE_DELAY_MIN || 15) * 60e3 : 0;
    const r = await db.prepare(`SELECT id, ts, type, sym, ${lang} AS text FROM alerts WHERE ts <= ? ORDER BY ts DESC LIMIT ?`).bind(now() - delay, lim).all();
    return json({ alerts: r.results || [] });
  }
  if (p === "/api/series") {
    const ks = (url.searchParams.get("k") || "kimp_btc").split(",").slice(0, 6), hrs = Math.min(720, +url.searchParams.get("h") || 48);
    const out = {};
    for (const k of ks) { const r = await db.prepare("SELECT ts, v FROM series WHERE k = ? AND ts > ? ORDER BY ts").bind(k, now() - hrs * 3600e3).all(); out[k] = (r.results || []).map((x) => [x.ts, x.v]); }
    return json(out);
  }
  return json({ ok: true, name: "chainbrief-signals" });
}
async function webhook(env, req) {
  const u = await req.json().catch(() => ({}));
  try { await onUpdate(env, u); } catch (e) { await kvSet(env.DB, "errors", { ts: now(), errs: ["webhook: " + (e.message || e)] }); }
  return new Response("ok");
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(prepare(env).then((e) => tick(e, new Date(event.scheduledTime)))); },
  async fetch(req, rawEnv) {
    const url = new URL(req.url);
    const env = await prepare(rawEnv);
    if (url.pathname === "/" || url.pathname === "/setup") return setupPage(await setup(env, url.origin), url.origin);
    if (req.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET" } });
    if (req.method === "POST" && env.TG_WEBHOOK_SECRET && url.pathname === "/tg/" + env.TG_WEBHOOK_SECRET) return webhook(env, req);
    if (url.pathname.startsWith("/api/")) { try { return await api(env, url); } catch (e) { return json({ error: String(e.message || e) }, 500); } }
    return json({ ok: true, name: "chainbrief-signals", endpoints: ["/api/latest", "/api/alerts", "/api/series?k=kimp_btc,liq_long,liq_short&h=48"] });
  },
};
