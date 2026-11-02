// 한 통 보내기: 수신거부 토큰 발급 → 렌더 → 공급자 호출 → 발송 로그. 모든 함수가 이 경로만 쓴다.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.3";
import { env, randomToken, recipientHash, sha256 } from "./env.ts";
import { adSubject, type Kind, type SenderProfile, senderMissing } from "./policy.ts";
import type { EmailProvider } from "./email.ts";
// @ts-ignore 순수 JS 모듈
import { renderEmail, toText } from "./render.js";
import { TEMPLATES } from "./templates.gen.ts";

export interface MailJob {
  site: string;
  kind: Kind;                      // ad | info | legal
  userId: string;
  email: string;
  lang?: "ko" | "en";
  subject: string;                 // (광고) 없이. ad 면 자동 부착
  content: { label?: string; headline: string; body: string; cta_text?: string; cta_url?: string; preheader?: string };
  campaignId?: string;
  flowKey?: string;                // welcome:<site>:<step> 등 — 같은 키는 1인 1회
  consentDate?: string;            // 광고 하단 '동의일' 표기
  dryRun: boolean;
}

export async function loadSender(db: SupabaseClient, site: string): Promise<SenderProfile> {
  const { data, error } = await db.from("crm_sender_profiles").select("*").eq("site", site).single();
  if (error || !data) throw new Error("sender profile missing: " + site);
  return data as SenderProfile;
}

export async function sendOne(db: SupabaseClient, mail: EmailProvider, sender: SenderProfile, j: MailJob) {
  // 광고·통지 공통: 전송자 법정 정보가 없으면 보내지 않는다(dry-run 은 기록만)
  const miss = senderMissing(sender);
  if (miss.length && !j.dryRun) return log(db, j, "skipped", "sender_not_ready:" + miss.join(","), null, mail.name);

  const rh = await recipientHash(j.email);
  // 제외목록(수신거부·반송·신고) — 광고만 막는다. 법정 통지·거래 안내(info/legal)는 수신거부와 무관하게 보낼 수 있음
  if (j.kind === "ad") {
    const { data: sup } = await db.from("crm_suppression").select("id").eq("channel", "email").eq("address_hash", rh)
      .or(`site.is.null,site.eq.${j.site}`).limit(1);
    if (sup && sup.length) return log(db, j, "skipped", "suppressed", rh, mail.name);
  }
  // 반송·스팸신고 주소는 모든 메일 차단
  const { data: hard } = await db.from("crm_suppression").select("id").eq("channel", "email").eq("address_hash", rh)
    .in("reason", ["hard_bounce", "complaint"]).limit(1);
  if (hard && hard.length) return log(db, j, "skipped", "bounced_or_complained", rh, mail.name);

  const sendRow = await log(db, j, j.dryRun ? "dry_run" : "queued", null, rh, mail.name);
  if (!sendRow) return null; // 중복(flow_key/campaign 유니크) → 이미 보냄

  let unsubscribeUrl: string | undefined, oneClickUrl: string | undefined;
  if (j.kind === "ad" || j.flowKey?.startsWith("biennial:")) {
    const token = randomToken();
    await db.from("crm_unsubscribe_tokens").insert({ token_hash: await sha256(token), user_id: j.userId, site: j.site, channel: "email", send_id: sendRow.id });
    unsubscribeUrl = `${env.unsubPage}?t=${encodeURIComponent(token)}&lang=${j.lang ?? sender.lang}`;
    if (env.functionsBase) oneClickUrl = `${env.functionsBase}/unsubscribe?t=${encodeURIComponent(token)}`;
  }

  const subject = j.kind === "ad" ? adSubject(sender.brand_name, j.subject) : j.subject;
  const content = { ...j.content };
  if (content.cta_url === "__unsubscribe__") content.cta_url = unsubscribeUrl;
  const html = renderEmail(TEMPLATES, {
    site: j.site, kind: j.kind === "ad" ? "ad" : "info", lang: j.lang ?? sender.lang, sender, content, subject,
    unsubscribeUrl, consentDate: j.consentDate, campaignKey: j.flowKey ?? j.campaignId ?? "crm",
  });

  if (j.dryRun) return { id: sendRow.id, status: "dry_run", subject };
  try {
    const r = await mail.send({
      from: `${sender.brand_name} <${sender.from_email}>`, to: j.email, replyTo: sender.reply_to ?? undefined,
      subject, html, text: toText(html), unsubscribeUrl, oneClickUrl, tags: { site: j.site, kind: j.kind },
    });
    await db.from("crm_campaign_sends").update({ status: "sent", provider_message_id: r.id, sent_at: new Date().toISOString() }).eq("id", sendRow.id);
    return { id: sendRow.id, status: "sent", subject };
  } catch (e) {
    await db.from("crm_campaign_sends").update({ status: "failed", skip_reason: String(e).slice(0, 200) }).eq("id", sendRow.id);
    return { id: sendRow.id, status: "failed", subject };
  }
}

async function log(db: SupabaseClient, j: MailJob, status: string, reason: string | null, rh: string | null, provider: string) {
  const { data, error } = await db.from("crm_campaign_sends").insert({
    campaign_id: j.campaignId ?? null, flow_key: j.flowKey ?? null, user_id: j.userId, site: j.site, channel: "email",
    kind: j.kind, recipient_hash: rh ?? "n/a", provider, status, skip_reason: reason,
  }).select("id").single();
  if (error) return null;   // 유니크 충돌 = 이미 처리됨
  return data as { id: string };
}

export function kstDate(iso: string, lang: "ko" | "en"): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  if (lang === "en") return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  return `${y}년 ${m}월 ${day}일`;
}
