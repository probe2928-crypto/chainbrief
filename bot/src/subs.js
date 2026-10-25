// 체인브리프 시그널 프로 — 구독 · USDT(TRC20) 결제 확인 · 비공개 채널 초대/만료 · 무료 채널 지연 발송
// 결제는 "읽기"만 한다: 세준의 수신 지갑(PAY_TRON_ADDRESS)으로 들어온 USDT를 TronGrid에서 조회해 금액이 맞는 청구서를 활성화.

const USDT_TRC20 = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const DAY = 86400e3;
export const plans = (env) => ({
  m: { days: 30, price: +(env.PRICE_MONTH || 19), ko: "1개월", en: "1 month" },
  q: { days: 90, price: +(env.PRICE_QUARTER || 49), ko: "3개월", en: "3 months" },
});
const now = () => Date.now();
const esc = (s = "") => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const dstr = (ts, lang) => new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", { timeZone: "Asia/Seoul", year: "numeric", month: "short", day: "numeric" }).format(ts);

/* ---------- telegram api ---------- */
export async function tgApi(env, method, body) {
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); return j.ok ? j.result ?? true : null;
  } catch { return null; }
}
const send = (env, chat, text, extra = {}) => tgApi(env, "sendMessage", { chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
const real = (v) => v && !String(v).startsWith("__");

/* ---------- users ---------- */
async function user(env, from, chatId) {
  let u = await env.DB.prepare("SELECT * FROM users WHERE chat_id = ?").bind(String(chatId)).first();
  if (!u) {
    const lang = (from?.language_code || "").startsWith("ko") ? "ko" : "en";
    await env.DB.prepare("INSERT INTO users (chat_id, username, lang, plan_until, created) VALUES (?, ?, ?, 0, ?)").bind(String(chatId), from?.username || "", lang, now()).run();
    u = { chat_id: String(chatId), username: from?.username || "", lang, plan_until: 0 };
  }
  return u;
}
const isPro = (u) => u && u.plan_until > now();

/* ---------- delivery ---------- */
// 프로: 비공개 채널에 즉시 (채널이 없으면 구독자 DM, 최대 40명/분)  ·  무료: 공개 채널에 지연·선별 발송
export async function deliver(env, a, footerFn, important) {
  const jobs = [];
  for (const lang of ["ko", "en"]) {
    const text = a[lang] + footerFn(env, lang);
    const pro = lang === "ko" ? env.TG_PRO_KO : env.TG_PRO_EN;
    if (real(pro)) jobs.push(send(env, pro, "⚡ " + text));
    else {
      const subs = await env.DB.prepare("SELECT chat_id FROM users WHERE plan_until > ? AND lang = ? LIMIT 40").bind(now(), lang).all();
      for (const s of subs.results || []) jobs.push(send(env, s.chat_id, "⚡ " + text));
    }
    const free = lang === "ko" ? env.TG_CHANNEL_KO : env.TG_CHANNEL_EN;
    if (real(free) && (important || !real(env.PAY_TRON_ADDRESS))) {
      const delay = real(env.PAY_TRON_ADDRESS) ? +(env.FREE_DELAY_MIN || 15) * 60e3 : 0;
      const quota = +(env.FREE_DAILY || 8);
      const sentToday = await env.DB.prepare("SELECT COUNT(*) AS n FROM outbox WHERE chat = ? AND created > ?").bind(free, now() - DAY).first();
      if ((sentToday?.n || 0) < quota) {
        const teaser = real(env.PAY_TRON_ADDRESS) && env.BOT_USERNAME
          ? (lang === "ko" ? `\n\n⏱ 프로 구독자는 ${env.FREE_DELAY_MIN || 15}분 먼저 받았어요 · <a href="https://t.me/${env.BOT_USERNAME}?start=pro">프로 구독</a>` : `\n\n⏱ Pro members got this ${env.FREE_DELAY_MIN || 15} min earlier · <a href="https://t.me/${env.BOT_USERNAME}?start=pro">Go Pro</a>`)
          : "";
        await env.DB.prepare("INSERT INTO outbox (chat, text, send_at, created, sent) VALUES (?, ?, ?, ?, 0)").bind(free, text + teaser, now() + delay, now()).run();
      }
    }
  }
  await Promise.all(jobs);
}
export async function flushOutbox(env) {
  const due = await env.DB.prepare("SELECT id, chat, text FROM outbox WHERE sent = 0 AND send_at <= ? ORDER BY send_at LIMIT 8").bind(now()).all();
  for (const m of due.results || []) { await send(env, m.chat, m.text); await env.DB.prepare("UPDATE outbox SET sent = 1 WHERE id = ?").bind(m.id).run(); }
}
export async function broadcastFree(env, ko, en) { // 아침 요약은 무료·프로 모두
  const t = [[env.TG_CHANNEL_KO, ko], [env.TG_CHANNEL_EN, en], [env.TG_PRO_KO, ko], [env.TG_PRO_EN, en]];
  await Promise.all(t.filter(([c]) => real(c)).map(([c, x]) => send(env, c, x)));
}

/* ---------- invoices & payment check ---------- */
async function createInvoice(env, u, planKey) {
  const p = plans(env)[planKey]; if (!p) return null;
  await env.DB.prepare("UPDATE invoices SET status = 'void' WHERE chat_id = ? AND status = 'pending'").bind(u.chat_id).run();
  for (let i = 0; i < 20; i++) {
    const milli = Math.round(p.price * 1000) + 1 + Math.floor(Math.random() * 999); // 19.001 ~ 19.999 → 사람마다 다른 금액
    const clash = await env.DB.prepare("SELECT id FROM invoices WHERE amount_milli = ? AND status = 'pending' AND expires > ?").bind(milli, now()).first();
    if (clash) continue;
    const r = await env.DB.prepare("INSERT INTO invoices (chat_id, plan, amount_milli, created, expires, status) VALUES (?, ?, ?, ?, ?, 'pending') RETURNING id").bind(u.chat_id, planKey, milli, now(), now() + 60 * 60e3).first();
    return { id: r.id, milli, plan: p, planKey };
  }
  return null;
}
export function matchPayments(transfers, invoices, used) {
  // transfers: TronGrid TRC20 rows · invoices: pending rows · used: Set of tx ids already credited
  const out = [];
  for (const t of transfers) {
    if (used.has(t.transaction_id) || t.token_info?.address !== USDT_TRC20 || t.type !== "Transfer") continue;
    const milli = Number(BigInt(t.value) / 1000n); // 6 decimals → 1/1000 USDT
    const inv = invoices.find((i) => i.amount_milli === milli && t.block_timestamp >= i.created - 60e3 && t.block_timestamp <= i.expires + 30 * 60e3 && !out.some((o) => o.inv.id === i.id));
    if (inv) out.push({ inv, tx: t.transaction_id, from: t.from, milli, ts: t.block_timestamp });
  }
  return out;
}
export async function checkPayments(env) {
  if (!real(env.PAY_TRON_ADDRESS)) return;
  const pend = await env.DB.prepare("SELECT * FROM invoices WHERE status = 'pending' AND expires > ?").bind(now() - 30 * 60e3).all();
  const inv = pend.results || []; if (!inv.length) return;
  const since = Math.min(...inv.map((i) => i.created)) - 60e3;
  const headers = env.TRONGRID_API_KEY ? { "TRON-PRO-API-KEY": env.TRONGRID_API_KEY } : {};
  const r = await fetch(`https://api.trongrid.io/v1/accounts/${env.PAY_TRON_ADDRESS}/transactions/trc20?only_to=true&only_confirmed=true&contract_address=${USDT_TRC20}&min_timestamp=${since}&limit=50`, { headers });
  if (!r.ok) throw new Error("trongrid " + r.status);
  const j = await r.json();
  const ids = (j.data || []).map((t) => t.transaction_id);
  const usedRows = ids.length ? await env.DB.prepare(`SELECT tx FROM payments WHERE tx IN (${ids.map(() => "?").join(",")})`).bind(...ids).all() : { results: [] };
  const used = new Set((usedRows.results || []).map((x) => x.tx));
  for (const m of matchPayments(j.data || [], inv, used)) await activate(env, m);
}
async function activate(env, m) {
  const p = plans(env)[m.inv.plan];
  const u = await env.DB.prepare("SELECT * FROM users WHERE chat_id = ?").bind(m.inv.chat_id).first();
  const base = Math.max(now(), u?.plan_until || 0), until = base + p.days * DAY;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO payments (tx, chat_id, amount_milli, plan, ts) VALUES (?, ?, ?, ?, ?)").bind(m.tx, m.inv.chat_id, m.milli, m.inv.plan, now()),
    env.DB.prepare("UPDATE invoices SET status = 'paid', tx = ? WHERE id = ?").bind(m.tx, m.inv.id),
    env.DB.prepare("UPDATE users SET plan_until = ?, reminded = 0 WHERE chat_id = ?").bind(until, m.inv.chat_id),
  ]);
  const lang = u?.lang || "ko";
  await send(env, m.inv.chat_id, lang === "ko"
    ? `✅ <b>결제 확인 — 프로 ${p.ko} 활성화</b>\n이용 기간: ${dstr(until, "ko")}까지\n<a href="https://tronscan.org/#/transaction/${m.tx}">거래 내역</a>`
    : `✅ <b>Payment confirmed — Pro ${p.en} active</b>\nValid until ${dstr(until, "en")}\n<a href="https://tronscan.org/#/transaction/${m.tx}">Transaction</a>`);
  await sendInvite(env, m.inv.chat_id, lang);
  if (real(env.ADMIN_CHAT_ID)) await send(env, env.ADMIN_CHAT_ID, `💰 결제 ${(m.milli / 1000).toFixed(3)} USDT · ${esc(u?.username ? "@" + u.username : m.inv.chat_id)} · ${p.ko} → ${dstr(until, "ko")}까지`);
}
async function sendInvite(env, chatId, lang) {
  const ch = lang === "ko" ? env.TG_PRO_KO : env.TG_PRO_EN;
  if (!real(ch)) return send(env, chatId, lang === "ko" ? "프로 알림은 이 대화방으로 바로 보내드려요." : "Pro alerts will arrive right here in this chat.");
  await tgApi(env, "unbanChatMember", { chat_id: ch, user_id: +chatId, only_if_banned: true });
  const link = await tgApi(env, "createChatInviteLink", { chat_id: ch, member_limit: 1, expire_date: Math.floor(now() / 1000) + 86400, name: "pro-" + chatId });
  if (link?.invite_link) await send(env, chatId, lang === "ko" ? `🔐 프로 채널 입장 링크 (1회용, 24시간 유효)\n${link.invite_link}` : `🔐 Your Pro channel invite (single use, valid 24h)\n${link.invite_link}`);
}

/* ---------- expiry (hourly) ---------- */
export async function expiries(env) {
  const soon = await env.DB.prepare("SELECT * FROM users WHERE plan_until > ? AND plan_until < ? AND reminded = 0").bind(now(), now() + 3 * DAY).all();
  for (const u of soon.results || []) {
    await send(env, u.chat_id, u.lang === "ko" ? `⏳ 프로 이용 기간이 ${dstr(u.plan_until, "ko")}에 끝나요. /pro 로 연장할 수 있어요 (남은 기간에 더해져요).` : `⏳ Your Pro access ends on ${dstr(u.plan_until, "en")}. Renew with /pro — the time is added on top.`);
    await env.DB.prepare("UPDATE users SET reminded = 1 WHERE chat_id = ?").bind(u.chat_id).run();
  }
  const gone = await env.DB.prepare("SELECT * FROM users WHERE plan_until > 0 AND plan_until <= ? AND removed = 0").bind(now()).all();
  for (const u of gone.results || []) {
    for (const ch of [env.TG_PRO_KO, env.TG_PRO_EN].filter(real)) { await tgApi(env, "banChatMember", { chat_id: ch, user_id: +u.chat_id }); await tgApi(env, "unbanChatMember", { chat_id: ch, user_id: +u.chat_id, only_if_banned: true }); }
    await env.DB.prepare("UPDATE users SET removed = 1 WHERE chat_id = ?").bind(u.chat_id).run();
    await send(env, u.chat_id, u.lang === "ko" ? "프로 이용 기간이 끝났어요. 무료 채널은 계속 받을 수 있고, /pro 로 언제든 다시 시작할 수 있어요." : "Your Pro access has ended. The free channel stays open, and /pro restarts it anytime.");
  }
}

/* ---------- bot conversation ---------- */
function proPitch(env, lang) {
  const P = plans(env);
  return lang === "ko"
    ? `<b>⚡ 체인브리프 시그널 프로</b>\n\n• 모든 알림을 <b>즉시</b> (무료 채널은 ${env.FREE_DELAY_MIN || 15}분 늦게, 주요 알림만)\n• 펀딩비 급변 · 대량 청산 · 고래 이동 · 김프 구간 돌파\n• 매일 아침 시장 요약\n\n요금: ${P.m.ko} <b>${P.m.price} USDT</b> · ${P.q.ko} <b>${P.q.price} USDT</b>\n결제: USDT (TRON · TRC20)\n\n아래에서 기간을 고르면 결제 금액을 알려드려요.`
    : `<b>⚡ CHAINBRIEF Signals Pro</b>\n\n• Every alert <b>instantly</b> (the free channel gets major alerts ${env.FREE_DELAY_MIN || 15} min later)\n• Funding swings · large liquidations · whale moves · Korea premium breakouts\n• Daily market brief\n\nPrice: ${P.m.en} <b>${P.m.price} USDT</b> · ${P.q.en} <b>${P.q.price} USDT</b>\nPayment: USDT (TRON · TRC20)\n\nPick a plan below to get your payment amount.`;
}
const planKb = (env, lang) => ({ inline_keyboard: [[{ text: `${plans(env).m[lang]} · ${plans(env).m.price} USDT`, callback_data: "plan:m" }, { text: `${plans(env).q[lang]} · ${plans(env).q.price} USDT`, callback_data: "plan:q" }]] });
function startText(env, lang) {
  const site = env.SITE || "", fk = env.TG_CHANNEL_KO, fe = env.TG_CHANNEL_EN;
  return lang === "ko"
    ? `<b>체인브리프 시그널</b>에 오신 걸 환영해요.\n펀딩비 급변 · 대량 청산 · 고래 이동 · 김프를 실시간으로 알려드려요.\n\n📢 무료 채널: ${real(fk) ? esc(fk) : "준비 중"}\n⚡ 프로 구독: /pro\n📊 대시보드: ${site}signals/\n\n/status 이용 상태 · /lang 언어 바꾸기`
    : `Welcome to <b>CHAINBRIEF Signals</b>.\nReal-time alerts for funding swings, large liquidations, whale moves and the Korea premium.\n\n📢 Free channel: ${real(fe) ? esc(fe) : "coming soon"}\n⚡ Go Pro: /pro\n📊 Dashboard: ${site}en/signals/\n💸 Lower trading fees: ${env.PERPLINE || ""}\n\n/status your plan · /lang switch language`;
}
export async function onUpdate(env, upd) {
  const cb = upd.callback_query, msg = upd.message || cb?.message;
  const chatId = msg?.chat?.id; if (!chatId || msg.chat.type !== "private") return;
  const u = await user(env, cb?.from || upd.message?.from, chatId), L = u.lang;
  const adminOk = real(env.ADMIN_CHAT_ID) && String(chatId) === String(env.ADMIN_CHAT_ID);
  if (cb) {
    await tgApi(env, "answerCallbackQuery", { callback_query_id: cb.id });
    if (cb.data?.startsWith("plan:")) {
      if (!real(env.PAY_TRON_ADDRESS)) return send(env, chatId, L === "ko" ? "결제는 곧 열려요. 조금만 기다려 주세요!" : "Payments open soon — stay tuned!");
      const inv = await createInvoice(env, u, cb.data.slice(5)); if (!inv) return;
      const amt = (inv.milli / 1000).toFixed(3);
      return send(env, chatId, L === "ko"
        ? `🧾 <b>결제 안내 · 프로 ${inv.plan.ko}</b>\n\n아래 주소로 <b>정확히 ${amt} USDT</b>를 보내주세요.\n네트워크: <b>TRON (TRC20)</b>\n<code>${env.PAY_TRON_ADDRESS}</code>\n\n• 소수점까지 똑같이 보내야 자동으로 확인돼요 (사람마다 금액이 달라요)\n• 거래소에서 보낼 땐 수수료를 뺀 뒤 ${amt}가 도착하도록 보내주세요\n• 60분 안에 입금되면 1~3분 안에 자동으로 켜져요\n\n문제가 있으면 @${esc((env.SUPPORT || "btcbullit").replace(/^@/, ""))}로 거래 해시를 보내주세요.`
        : `🧾 <b>Payment · Pro ${inv.plan.en}</b>\n\nSend <b>exactly ${amt} USDT</b> to:\nNetwork: <b>TRON (TRC20)</b>\n<code>${env.PAY_TRON_ADDRESS}</code>\n\n• The exact amount (to the decimals) is how we match your payment\n• From an exchange, make sure ${amt} arrives after fees\n• Paid within 60 minutes, Pro switches on automatically in 1–3 minutes\n\nTrouble? Send the transaction hash to @${esc((env.SUPPORT || "btcbullit").replace(/^@/, ""))}.`,
        { reply_markup: { inline_keyboard: [[{ text: L === "ko" ? "입금했어요 — 확인하기" : "I've paid — check now", callback_data: "check" }]] } });
    }
    if (cb.data === "check") {
      await checkPayments(env).catch(() => {});
      const fresh = await env.DB.prepare("SELECT plan_until FROM users WHERE chat_id = ?").bind(String(chatId)).first();
      if (!isPro(fresh)) return send(env, chatId, L === "ko" ? "아직 입금이 확인되지 않았어요. 블록 확인에 1~3분 걸릴 수 있어요. 잠시 뒤 다시 눌러주세요." : "Not seen yet — confirmations can take 1–3 minutes. Try again shortly.");
      return;
    }
    if (cb.data?.startsWith("lang:")) { const nl = cb.data.slice(5); await env.DB.prepare("UPDATE users SET lang = ? WHERE chat_id = ?").bind(nl, String(chatId)).run(); return send(env, chatId, startText(env, nl)); }
    return;
  }
  const text = (upd.message?.text || "").trim(), [cmd, ...args] = text.split(/\s+/);
  const c = cmd.toLowerCase().replace(/@.*$/, "");
  if (c === "/start" && args[0] === "pro" || c === "/pro" || c === "/subscribe") return send(env, chatId, proPitch(env, L), { reply_markup: planKb(env, L) });
  if (c === "/status") {
    if (isPro(u)) return send(env, chatId, L === "ko" ? `⚡ 프로 이용 중 · ${dstr(u.plan_until, "ko")}까지\n채널 링크가 필요하면 /invite` : `⚡ Pro active until ${dstr(u.plan_until, "en")}\nNeed the channel link again? /invite`);
    return send(env, chatId, L === "ko" ? "무료 이용 중이에요. /pro 로 업그레이드할 수 있어요." : "You're on the free plan. Upgrade with /pro.");
  }
  if (c === "/invite" && isPro(u)) return sendInvite(env, chatId, L);
  if (c === "/lang") return send(env, chatId, "Language / 언어", { reply_markup: { inline_keyboard: [[{ text: "한국어", callback_data: "lang:ko" }, { text: "English", callback_data: "lang:en" }]] } });
  if (adminOk && c === "/stats") {
    const a = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE plan_until > ?").bind(now()).first();
    const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
    const m = await env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(amount_milli),0) AS s FROM payments WHERE ts > ?").bind(now() - 30 * DAY).first();
    return send(env, chatId, `📈 프로 구독자 ${a.n}명 · 전체 사용자 ${t.n}명\n최근 30일 결제 ${m.n}건 · ${(m.s / 1000).toFixed(2)} USDT`);
  }
  if (adminOk && c === "/grant" && args[0]) { // /grant <chat_id> <days>
    const days = +(args[1] || 30), tu = await env.DB.prepare("SELECT * FROM users WHERE chat_id = ?").bind(args[0]).first();
    if (!tu) return send(env, chatId, "그 사용자를 찾지 못했어요 (봇에 /start를 먼저 눌러야 해요).");
    const until = Math.max(now(), tu.plan_until || 0) + days * DAY;
    await env.DB.prepare("UPDATE users SET plan_until = ?, reminded = 0, removed = 0 WHERE chat_id = ?").bind(until, args[0]).run();
    await sendInvite(env, args[0], tu.lang);
    return send(env, chatId, `✅ ${args[0]} 프로 ${days}일 → ${dstr(until, "ko")}까지`);
  }
  if (c === "/id") return send(env, chatId, `chat id: <code>${chatId}</code>`);
  if (c === "/claim") { // 관리자 등록: 봇 토큰 마지막 6글자를 아는 사람만
    const has = await env.DB.prepare("SELECT v FROM kv WHERE k = 'admin'").first();
    if (has) return send(env, chatId, String(JSON.parse(has.v)) === String(chatId) ? "이미 관리자로 등록돼 있어요." : "관리자가 이미 등록돼 있어요.");
    if (!env.TELEGRAM_BOT_TOKEN || args[0] !== env.TELEGRAM_BOT_TOKEN.slice(-6)) return send(env, chatId, "코드가 맞지 않아요.");
    await env.DB.prepare("INSERT INTO kv (k, v, ts) VALUES ('admin', ?, ?)").bind(JSON.stringify(String(chatId)), now()).run();
    return send(env, chatId, "✅ 관리자로 등록됐어요. 결제가 들어오면 여기로 알려드려요. /stats 로 현황을 볼 수 있어요.");
  }
  return send(env, chatId, startText(env, L));
}
