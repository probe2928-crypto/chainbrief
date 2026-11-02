// send-campaign — 광고 캠페인 / 웰컴 시퀀스 발송.
//   POST { "campaign_id": "<uuid>", "dry_run": true }      관리자 JWT 또는 x-crm-cron
//   POST { "flow": "welcome", "dry_run": true }             스케줄러가 매시 호출(08:00~20:50 KST 사이만 실제 발송)
// 기본은 dry_run=true. 실제 발송은 CRM_ENABLED=true + crm_settings.sending_enabled=true + dry_run=false 셋 다 필요.
import { admin, cors, env, json, requireAdminOrCron, sendingAllowed } from "../_shared/env.ts";
import { isQuietHours, lintCopy } from "../_shared/policy.ts";
import { emailProvider } from "../_shared/email.ts";
import { kstDate, loadSender, sendOne } from "../_shared/mailer.ts";
import { TEMPLATES } from "../_shared/templates.gen.ts";

const BATCH = 200;   // 1회 호출당 최대 발송(Resend 무료 100통/일 한도 고려 시 crm_settings 로 낮춰 운영)

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  if (req.method !== "POST") return json({ error: "POST only" }, 405, h);
  const who = await requireAdminOrCron(req);
  if (!who.ok) return json({ error: "forbidden" }, 403, h);

  const body = await req.json().catch(() => ({}));
  const db = admin();
  const gate = await sendingAllowed(db);
  const dryRun = body.dry_run !== false || !gate.ok;   // 게이트가 닫혀 있으면 무조건 dry-run
  const { data: qh } = await db.from("crm_settings").select("value").eq("key", "quiet_hours_kst").single();
  const quiet = isQuietHours(new Date(), qh?.value?.start ?? "20:50", qh?.value?.end ?? "08:00");

  try {
    if (body.flow === "welcome") return json(await welcome(db, dryRun, quiet), 200, h);
    if (body.campaign_id) return json(await campaign(db, String(body.campaign_id), dryRun, quiet, who.by), 200, h);
    return json({ error: "campaign_id or flow required" }, 400, h);
  } catch (e) {
    return json({ error: String(e) }, 500, h);
  } finally {
    if (!gate.ok) console.log("dry-run forced:", gate.why);
  }
});

async function campaign(db: ReturnType<typeof admin>, id: string, dryRun: boolean, quiet: boolean, by?: string) {
  const { data: c, error } = await db.from("crm_campaigns").select("*").eq("id", id).single();
  if (error || !c) throw new Error("campaign not found");
  if (c.channel !== "email") throw new Error("email campaigns only (kakao: adapter not configured)");
  if (c.kind !== "ad") throw new Error("info campaigns are sent per transaction, not in bulk");
  if (!dryRun && c.status !== "approved" && c.status !== "scheduled" && c.status !== "sending") throw new Error("campaign must be approved first");
  if (!dryRun && quiet) return { status: "blocked", reason: "quiet_hours (20:50~08:00 KST)" };
  const lint = lintCopy(c.site, [c.subject, c.preheader, c.body_html].join(" "));
  if (lint.length) throw new Error("banned words: " + lint.join(", "));

  const sender = await loadSender(db, c.site);
  const mail = emailProvider(dryRun);
  const { data: aud, error: aerr } = await db.rpc("crm_campaign_audience", { p_campaign: id });
  if (aerr) throw new Error(aerr.message);

  // 동의일(하단 표기용)
  const ids = (aud ?? []).filter((r: { skip_reason: string | null }) => !r.skip_reason).map((r: { user_id: string }) => r.user_id);
  const since = await consentDates(db, ids, c.site);

  if (!dryRun) await db.from("crm_campaigns").update({ status: "sending" }).eq("id", id);
  let sent = 0, skipped = 0, failed = 0;
  for (const r of (aud ?? []).slice(0, BATCH * 50)) {
    if (r.skip_reason) {
      skipped++;
      continue;
    }
    if (sent + failed >= BATCH) break;   // 다음 호출에서 이어서(already_sent 로 중복 방지)
    const lang = (r.lang === "en" ? "en" : "ko") as "ko" | "en";
    const res = await sendOne(db, mail, sender, {
      site: c.site, kind: "ad", userId: r.user_id, email: r.email, lang, campaignId: id, dryRun,
      subject: c.subject, consentDate: since[r.user_id] ? kstDate(since[r.user_id], lang) : "",
      content: { label: c.name.toUpperCase().slice(0, 24), headline: c.subject, body: c.body_html ?? "", preheader: c.preheader ?? "" },
    });
    if (res?.status === "sent" || res?.status === "dry_run") sent++; else if (res?.status === "failed") failed++; else skipped++;
  }
  if (!dryRun) {
    await db.from("crm_campaigns").update({ sent_count: c.sent_count + sent, skipped_count: c.skipped_count + skipped, failed_count: c.failed_count + failed,
      status: sent + failed < BATCH ? "sent" : "sending" }).eq("id", id);
  }
  return { dryRun, audience: aud?.length ?? 0, sent, skipped, failed, by };
}

async function consentDates(db: ReturnType<typeof admin>, ids: string[], site: string): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const { data } = await db.from("crm_consent_latest").select("user_id, site, granted_at").in("user_id", ids)
    .eq("channel", "email").eq("active", true).in("site", [site, "family"]);
  const m: Record<string, string> = {};
  for (const r of data ?? []) if (r.granted_at && (!m[r.user_id] || r.site === site)) m[r.user_id] = r.granted_at;
  return m;
}

/** 웰컴 시퀀스: 가입 직후(정보성) / 3일(광고) / 7일(광고). 광고 단계는 해당 사이트(또는 family) 이메일 동의자만. */
async function welcome(db: ReturnType<typeof admin>, dryRun: boolean, quiet: boolean) {
  const report: Record<string, number> = {};
  for (const site of Object.keys(TEMPLATES.welcome)) {
    const sender = await loadSender(db, site);
    const mail = emailProvider(dryRun);
    for (const st of TEMPLATES.welcome[site as keyof typeof TEMPLATES.welcome].steps) {
      if (st.kind === "ad" && quiet && !dryRun) continue;      // 광고 단계는 야간에 미룸(다음 호출에서 발송)
      // 대상: 가입 후 days 일 지났고 days+3 일은 안 지난 회원(늦게 켜도 오래된 가입자에게 몰아 보내지 않음)
      const from = new Date(Date.now() - (st.days + 3) * 86400e3).toISOString();
      const to = new Date(Date.now() - st.days * 86400e3).toISOString();
      const { data: members } = await db.from("crm_membership_base").select("user_id, joined_at").eq("site", site)
        .gte("joined_at", from).lte("joined_at", to).limit(BATCH);
      for (const m of members ?? []) {
        let consentDate = "";
        if (st.kind === "ad") {
          const since = await consentDates(db, [m.user_id], site);
          if (!since[m.user_id]) { report.no_consent = (report.no_consent ?? 0) + 1; continue; }
          consentDate = since[m.user_id];
        }
        const { data: u } = await db.auth.admin.getUserById(m.user_id);
        const email = u?.user?.email;
        if (!email) continue;
        const lang = (sender.lang === "en" ? "en" : "ko") as "ko" | "en";
        const res = await sendOne(db, mail, sender, {
          site, kind: st.kind as "ad" | "info", userId: m.user_id, email, lang, dryRun, flowKey: `welcome:${site}:${st.step}`,
          subject: st.subject, consentDate: consentDate ? kstDate(consentDate, lang) : "",
          content: { label: st.label, headline: st.headline, body: st.body, cta_text: st.cta_text, cta_url: st.cta_url, preheader: st.preheader },
        });
        const k = `${site}:${st.step}:${res?.status ?? "dup"}`;
        report[k] = (report[k] ?? 0) + 1;
      }
    }
  }
  return { dryRun, report };
}
