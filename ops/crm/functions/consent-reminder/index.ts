// consent-reminder — 법정 통지 자동화. 스케줄러가 하루 1회(권장 10:00 KST) 호출.
//   POST { "dry_run": true }   (x-crm-cron 또는 관리자 JWT)
//  1) 처리결과 통지: 최근 14일 내 동의/철회 중 통지 안 된 건 → 이메일 통지 (제50조⑦, 시행령 제62조의2)
//     ※ auth 화면에서도 즉시 통지 문구를 보여 주지만, 증빙을 남기려고 이메일로도 보낸다(crm_settings.result_notice_email).
//  2) 2년 확인: 동의 기산일 기준 2년 되는 날의 30일 전부터 안내 (제50조⑧, 시행령 제62조의3)
//     안내 문구 = 전송자 명칭 + 동의 사실·날짜 + 유지/철회 방법. '철회 방법'을 안내하므로 무응답 = 동의 유지.
// 법정 통지는 광고가 아니므로 야간 차단 대상은 아니지만, 수신자 배려로 08:00~20:50 에만 보낸다.
import { admin, cors, json, requireAdminOrCron, sendingAllowed } from "../_shared/env.ts";
import { isQuietHours } from "../_shared/policy.ts";
import { emailProvider } from "../_shared/email.ts";
import { kstDate, loadSender, sendOne } from "../_shared/mailer.ts";
import { TEMPLATES } from "../_shared/templates.gen.ts";

const CH: Record<string, { ko: string; en: string }> = {
  email: { ko: "이메일", en: "email" }, kakao: { ko: "카카오톡", en: "KakaoTalk" }, sms: { ko: "문자", en: "text message" },
  night: { ko: "야간(21~08시)", en: "night-time (9 pm–8 am)" },
};

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  const who = await requireAdminOrCron(req);
  if (!who.ok) return json({ error: "forbidden" }, 403, h);
  const body = await req.json().catch(() => ({}));
  const db = admin();
  const gate = await sendingAllowed(db);
  const dryRun = body.dry_run !== false || !gate.ok;
  if (!dryRun && isQuietHours()) return json({ status: "deferred", reason: "quiet hours" }, 200, h);

  const mail = emailProvider(dryRun);
  const out = { dryRun, result: 0, biennial: 0, skipped: 0 };
  const senders: Record<string, Awaited<ReturnType<typeof loadSender>>> = {};
  const sender = async (s: string) => (senders[s] ??= await loadSender(db, s === "*" || s === "family" ? "chainbrief" : s));

  // 1) 처리결과 통지
  const { data: rn } = await db.from("crm_settings").select("value").eq("key", "result_notice_email").single();
  if (rn?.value !== false) {
    const { data: due } = await db.from("crm_result_notice_due").select("*").limit(500);
    for (const d of due ?? []) {
      const sp = await sender(d.site);
      const lang = sp.lang as "ko" | "en";
      const n = TEMPLATES.notices.result[lang];
      const change = d.change === "granted" ? (lang === "en" ? "Subscribed" : "동의") : (lang === "en" ? "Unsubscribed" : "거부");
      const vars = { brand_name: sp.brand_name, change_text: change, channel_text: CH[d.channel]?.[lang] ?? d.channel, event_date: kstDate(d.event_at, lang) };
      const r = await notify(db, mail, sp, d.user_id, lang, n, vars, `result:${d.channel}:${d.site}:${d.event_at}`, dryRun);
      if (r) {
        out.result++;
        if (!dryRun) await db.from("crm_consent_notices").insert({ user_id: d.user_id, site: d.site, channel: d.channel, notice_type: "result", consent_event_at: d.event_at, send_id: r.id });
      } else out.skipped++;
    }
  }

  // 2) 2년 확인 안내
  const { data: bi } = await db.from("crm_biennial_due").select("*").limit(500);
  for (const d of bi ?? []) {
    const sp = await sender(d.site);
    const lang = sp.lang as "ko" | "en";
    const n = TEMPLATES.notices.biennial[lang];
    const vars = { brand_name: sp.brand_name, channel_text: CH[d.channel]?.[lang] ?? d.channel, consent_date: kstDate(d.anchor_at, lang) };
    const r = await notify(db, mail, sp, d.user_id, lang, n, vars, `biennial:${d.channel}:${d.site}:${d.anniversary}`, dryRun,
      TEMPLATES.notices.biennial.cta[lang]);
    if (r) {
      out.biennial++;
      if (!dryRun) await db.from("crm_consent_notices").insert({ user_id: d.user_id, site: d.site, channel: d.channel, notice_type: "biennial", consent_event_at: d.anniversary, send_id: r.id });
    } else out.skipped++;
  }
  return json(out, 200, h);
});

async function notify(db: ReturnType<typeof admin>, mail: ReturnType<typeof emailProvider>, sp: Awaited<ReturnType<typeof loadSender>>,
  userId: string, lang: "ko" | "en", n: { subject: string; label: string; headline: string; body: string }, vars: Record<string, string>,
  flowKey: string, dryRun: boolean, cta?: string) {
  const f = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));   // {{line}} 등 색 토큰은 렌더러가 채움
  const { data: u } = await db.auth.admin.getUserById(userId);
  const email = u?.user?.email;
  if (!email) return null;
  // 법정 통지는 수신거부와 무관하게 발송(kind=legal). 2년 확인 메일에는 철회 버튼(수신거부 토큰) 포함.
  return await sendOne(db, mail, sp, {
    site: sp.site, kind: "legal", userId, email, lang, dryRun, flowKey,
    subject: f(n.subject),
    content: { label: n.label, headline: f(n.headline), body: f(n.body), cta_text: cta, cta_url: cta ? "__unsubscribe__" : undefined },
  });
}
