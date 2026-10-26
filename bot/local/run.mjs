// 체인브리프 시그널 — PC 실행판 (Cloudflare 없이)
// 같은 봇 코드(src/)를 Node 22+ 로 돌린다: 데이터는 signals.db(SQLite), 텔레그램은 폴링, 1분마다 tick.
// 실행: node local/run.mjs   ·   설정: local/config.json   ·   확인 페이지: http://localhost:8787/
import { DatabaseSync } from "node:sqlite";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker, { prepare, tick } from "../src/index.js";
import { onUpdate, tgApi } from "../src/subs.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = path.join(DIR, "config.json");
const LOG = path.join(DIR, "signals.log");
const PORT = 8787;

/* ---------- log (최대 2MB, 넘으면 .old 로 교체) ---------- */
function log(...a) {
  const line = `[${new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" })}] ${a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")}\n`;
  process.stdout.write(line);
  try { if (fs.existsSync(LOG) && fs.statSync(LOG).size > 2e6) fs.renameSync(LOG, LOG + ".old"); fs.appendFileSync(LOG, line); } catch {}
}

/* ---------- config ---------- */
const DEFAULTS = {
  TELEGRAM_BOT_TOKEN: "", TG_CHANNEL_KO: "", TG_CHANNEL_EN: "", TG_PRO_KO: "", TG_PRO_EN: "",
  PAY_TRON_ADDRESS: "", PRICE_MONTH: "19", PRICE_QUARTER: "49", FREE_DELAY_MIN: "15",
  ETHERSCAN_API_KEY: "", TRONGRID_API_KEY: "",
  SITE: "https://probe2928-crypto.github.io/chainbrief/", PERPLINE: "https://probe2928-crypto.github.io/perpline/", SUPPORT: "btcbullit",
};
function loadConfig() {
  let c = {};
  try { c = JSON.parse(fs.readFileSync(CONFIG, "utf8").replace(/^﻿/, "")); } catch (e) { log("config.json 을 읽지 못했어요:", e.message); }
  const out = { ...DEFAULTS };
  for (const [k, v] of Object.entries(c)) if (!k.startsWith("_") && v != null) out[k] = String(v).trim();
  return out;
}

/* ---------- D1 흉내 (node:sqlite) ---------- */
const sql = new DatabaseSync(path.join(DIR, "signals.db"));
sql.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
const stmt = (q) => {
  let args = [];
  const o = {
    bind(...a) { args = a.map((x) => (x === undefined ? null : typeof x === "boolean" ? +x : x)); return o; },
    async run() { const r = sql.prepare(q).run(...args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    async all() { return { results: sql.prepare(q).all(...args), success: true }; },
    async first(col) { const r = sql.prepare(q).get(...args) ?? null; return col && r ? r[col] : r; },
    _exec() { return sql.prepare(q).run(...args); },
  };
  return o;
};
const DB = {
  prepare: stmt,
  async batch(list) { sql.exec("BEGIN"); try { for (const s of list) s._exec(); sql.exec("COMMIT"); } catch (e) { sql.exec("ROLLBACK"); throw e; } return list.map(() => ({ success: true })); },
  async exec(q) { sql.exec(q); return { count: 1 }; },
};

let cfg = loadConfig();
const baseEnv = () => ({ ...cfg, DB, POLLING: "1" });
const envNow = () => prepare(baseEnv());

/* ---------- 1분 tick ---------- */
let ticking = false;
async function runTick() {
  if (ticking) return; ticking = true;
  const when = new Date(Math.floor(Date.now() / 60e3) * 60e3);
  try {
    const errs = await tick(await envNow(), when);
    if (errs.length) log("tick 오류:", errs);
  } catch (e) { log("tick 실패:", e.message || e); }
  ticking = false;
}
function scheduleTicks() {
  const wait = 60e3 - (Date.now() % 60e3) + 1500; // 매 분 1.5초 뒤
  setTimeout(() => { runTick(); scheduleTicks(); }, wait);
}

/* ---------- 텔레그램 폴링 ---------- */
async function poll() {
  let offset = 0, fails = 0;
  for (;;) {
    if (!cfg.TELEGRAM_BOT_TOKEN) { await sleep(30e3); cfg = loadConfig(); continue; }
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 40e3);
      const r = await fetch(`https://api.telegram.org/bot${cfg.TELEGRAM_BOT_TOKEN}/getUpdates`, {
        method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal,
        body: JSON.stringify({ offset, timeout: 25, allowed_updates: ["message", "callback_query"] }),
      }).finally(() => clearTimeout(t));
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        if (j.error_code === 409) { log("다른 곳에서 봇을 받고 있어요(웹훅/중복 실행). 웹훅을 끄고 다시 시도해요."); await tgApi(cfg, "deleteWebhook", {}); }
        else if (j.error_code === 401) { log("봇 토큰이 맞지 않아요. config.json 을 확인해 주세요."); await sleep(60e3); cfg = loadConfig(); continue; }
        throw new Error(j.description || "getUpdates " + r.status);
      }
      fails = 0;
      for (const u of j.result) {
        offset = u.update_id + 1;
        try { await onUpdate(await envNow(), u); } catch (e) { log("메시지 처리 오류:", e.message || e); }
      }
    } catch (e) {
      fails++; if (fails % 10 === 1) log("폴링 재시도:", e.message || e);
      await sleep(Math.min(30e3, 2e3 * fails));
    }
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 이 PC 안에서만 보는 확인 페이지 · API ---------- */
function serve() {
  http.createServer(async (req, res) => {
    try {
      const url = `http://localhost:${PORT}${req.url}`;
      const body = ["GET", "HEAD"].includes(req.method) ? undefined : await new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => ok(b)); });
      if (new URL(url).pathname === "/" || new URL(url).pathname === "/setup") cfg = loadConfig(); // 새로고침하면 설정 다시 읽기
      const r = await worker.fetch(new Request(url, { method: req.method, headers: req.headers, body }), baseEnv());
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) { res.writeHead(500); res.end(String(e.message || e)); }
  }).listen(PORT, "127.0.0.1", () => log(`확인 페이지: http://localhost:${PORT}/`)).on("error", (e) => {
    if (e.code === "EADDRINUSE") { log("이미 실행 중이에요 (포트 8787 사용 중). 이 창은 닫아도 돼요."); process.exit(0); }
    log("웹서버 오류:", e.message);
  });
}

/* ---------- 시작 ---------- */
process.on("unhandledRejection", (e) => log("처리 안 된 오류:", e?.message || e));
process.on("uncaughtException", (e) => log("예외:", e?.message || e));
serve();
await envNow();
if (cfg.TELEGRAM_BOT_TOKEN) {
  await tgApi(cfg, "deleteWebhook", {});
  const me = await tgApi(cfg, "getMe", {});
  if (me?.username) { await DB.prepare("INSERT INTO kv (k, v, ts) VALUES ('bot:username', ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, ts = excluded.ts").bind(JSON.stringify(me.username), Date.now()).run(); log(`봇 연결됨: @${me.username}`); }
  else log("봇 토큰을 확인하지 못했어요. config.json 의 TELEGRAM_BOT_TOKEN 을 확인해 주세요.");
  await tgApi(cfg, "setMyCommands", { commands: [{ command: "pro", description: "프로 구독 · Go Pro" }, { command: "status", description: "이용 상태 · My plan" }, { command: "lang", description: "언어 · Language" }] });
} else log("config.json 에 TELEGRAM_BOT_TOKEN 을 넣어 주세요. 넣으면 30초 안에 자동으로 시작해요.");
log("체인브리프 시그널 시작 — 1분마다 시장을 확인해요.");
runTick(); scheduleTicks(); poll();
