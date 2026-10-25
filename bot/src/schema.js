// schema.sql과 같은 내용 — 워커가 처음 실행될 때 스스로 테이블을 만든다
export const SCHEMA = [
 "CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT, ts INTEGER)",
 "CREATE TABLE IF NOT EXISTS series (ts INTEGER NOT NULL, k TEXT NOT NULL, v REAL)",
 "CREATE INDEX IF NOT EXISTS series_k_ts ON series (k, ts)",
 "CREATE TABLE IF NOT EXISTS liq (ts INTEGER NOT NULL, sym TEXT, side TEXT, usd REAL, px REAL)",
 "CREATE INDEX IF NOT EXISTS liq_ts ON liq (ts)",
 "CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, type TEXT, sym TEXT, ko TEXT, en TEXT, data TEXT)",
 "CREATE INDEX IF NOT EXISTS alerts_ts ON alerts (ts)",
 "CREATE TABLE IF NOT EXISTS users (chat_id TEXT PRIMARY KEY, username TEXT, lang TEXT DEFAULT 'ko', plan_until INTEGER DEFAULT 0, reminded INTEGER DEFAULT 0, removed INTEGER DEFAULT 0, created INTEGER)",
 "CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT, plan TEXT, amount_milli INTEGER, created INTEGER, expires INTEGER, status TEXT, tx TEXT)",
 "CREATE INDEX IF NOT EXISTS invoices_status ON invoices (status, expires)",
 "CREATE TABLE IF NOT EXISTS payments (tx TEXT PRIMARY KEY, chat_id TEXT, amount_milli INTEGER, plan TEXT, ts INTEGER)",
 "CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, chat TEXT, text TEXT, send_at INTEGER, created INTEGER, sent INTEGER DEFAULT 0)",
 "CREATE INDEX IF NOT EXISTS outbox_due ON outbox (sent, send_at)"
];
