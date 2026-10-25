import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import worker, { tick } from "../src/index.js";
import { matchPayments, expiries, flushOutbox } from "../src/subs.js";
const sql = new DatabaseSync(":memory:"); sql.exec(fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
const stmt = (q) => { let a = []; const o = { bind(...x) { a = x; return o; }, async run() { sql.prepare(q).run(...a); return {}; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async first() { return sql.prepare(q).get(...a) ?? null; } }; return o; };
const DB = { prepare: stmt, async batch(l) { for (const s of l) await s.run(); } };
const calls = []; let tron = [];
globalThis.fetch = async (url, init) => {
  url = String(url); const ok = (d) => ({ ok: true, status: 200, json: async () => d });
  if (url.includes("api.telegram.org")) { const m = url.split("/").pop(); const b = JSON.parse(init.body); calls.push([m, b]); return ok({ ok: true, result: m === "createChatInviteLink" ? { invite_link: "https://t.me/+INV" } : true }); }
  if (url.includes("trongrid")) return ok({ data: tron, success: true });
  return { ok: false, status: 503, json: async () => ({}) };
};
const env = { DB, TELEGRAM_BOT_TOKEN: "x", TG_CHANNEL_KO: "@free_ko", TG_CHANNEL_EN: "@free_en", TG_PRO_KO: "-1001", TG_PRO_EN: "-1002", PAY_TRON_ADDRESS: "TXYZ", ADMIN_CHAT_ID: "999", BOT_USERNAME: "chainbrief_bot", SITE: "https://s/" };
const post = (u) => worker.fetch(new Request("https://w/tg/sec", { method: "POST", body: JSON.stringify(u) }), { ...env, TG_WEBHOOK_SECRET: "sec" });
const from = { id: 42, language_code: "ko", username: "trader" };
await post({ message: { chat: { id: 42, type: "private" }, from, text: "/start pro" } });
console.log("pitch:", calls.at(-1)[1].text.split("\n")[0], "| buttons:", calls.at(-1)[1].reply_markup.inline_keyboard[0].map((b) => b.text));
await post({ callback_query: { id: "c1", from, data: "plan:m", message: { chat: { id: 42, type: "private" } } } });
const inv = sql.prepare("SELECT * FROM invoices").get();
console.log("invoice:", inv.amount_milli / 1000, inv.status, "| msg:", calls.at(-1)[1].text.split("\n")[2]);
// 잘못된 금액 → 활성화 안 됨, 정확한 금액 → 활성화
tron = [{ transaction_id: "tx_wrong", token_info: { address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" }, type: "Transfer", value: "19000000", block_timestamp: Date.now(), from: "Tabc" },
        { transaction_id: "tx_ok", token_info: { address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" }, type: "Transfer", value: String(inv.amount_milli * 1000), block_timestamp: Date.now(), from: "Tabc" }];
calls.length = 0;
await tick(env, new Date());
const u = sql.prepare("SELECT * FROM users WHERE chat_id='42'").get();
console.log("pro until (days):", Math.round((u.plan_until - Date.now()) / 864e5), "| tg calls:", calls.map((c) => c[0] + (c[1].chat_id ? "→" + c[1].chat_id : "")).join(", "));
await tick(env, new Date()); // 같은 tx 재사용 안 됨
console.log("payments rows:", sql.prepare("SELECT COUNT(*) n FROM payments").get().n, "| user days still:", Math.round((sql.prepare("SELECT plan_until p FROM users").get().p - Date.now()) / 864e5));
// 알림 전달: 프로 즉시, 무료는 지연 outbox
const { deliver } = await import("../src/subs.js"); calls.length = 0;
await deliver(env, { ko: "테스트 알림", en: "Test alert" }, () => "", true);
console.log("instant:", calls.map((c) => c[1].chat_id).join(","), "| outbox:", sql.prepare("SELECT chat, send_at - created AS d FROM outbox").all().map((r) => r.chat + " +" + r.d / 60e3 + "m").join(", "));
await deliver(env, { ko: "작은 알림", en: "minor" }, () => "", false);
console.log("minor → outbox rows:", sql.prepare("SELECT COUNT(*) n FROM outbox").get().n);
// 만료: 3일 전 알림, 만료 후 채널 제거
sql.prepare("UPDATE users SET plan_until = ? WHERE chat_id='42'").run(Date.now() + 2 * 864e5); calls.length = 0; await expiries(env);
console.log("reminder:", calls.map((c) => c[0]).join(","));
sql.prepare("UPDATE users SET plan_until = ? WHERE chat_id='42'").run(Date.now() - 1000); calls.length = 0; await expiries(env);
console.log("expired:", calls.map((c) => c[0] + "→" + c[1].chat_id).join(", "));
// 관리자
calls.length = 0; await post({ message: { chat: { id: 999, type: "private" }, from: { id: 999, language_code: "ko" }, text: "/stats" } }); console.log("admin:", calls.at(-1)[1].text.replace(/\n/g, " / "));
await post({ message: { chat: { id: 999, type: "private" }, from: { id: 999, language_code: "ko" }, text: "/grant 42 7" } }); console.log("grant:", calls.at(-1)[1].text);
await post({ message: { chat: { id: 5, type: "private" }, from: { id: 5, language_code: "en" }, text: "/stats" } }); console.log("non-admin /stats →", calls.at(-1)[1].text.split("\n")[0]);
