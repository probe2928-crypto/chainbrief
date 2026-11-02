// unsubscribe — 수신거부(로그인 불필요, 무료, 원클릭).
//   GET  ?t=<token>                      → 토큰 확인: { site, brand, channel, masked, used }
//   POST ?t=<token>  body {scope:"site"|"all"}            → 수신페이지 버튼
//   POST ?t=<token>  body "List-Unsubscribe=One-Click"    → 메일 앱의 원클릭 수신거부(RFC 8058)
// 처리: marketing_consents 에 철회 행 "추가"(기존 행 수정 없음) + crm_suppression 등록 + 처리결과 통지 대기열(consent-reminder 가 14일 내 발송).
// 근거: 정보통신망법 제50조②(거부 후 전송 금지)·⑤1호(거부 회피·방해 금지)·⑥(비용 부담 금지)·⑦(처리결과 통지).
import { admin, cors, json, recipientHash, sha256 } from "../_shared/env.ts";

const SITES = ["qurator", "perpline", "luft", "lifejunjun", "chainbrief"];

// marketing_consents 컬럼 매핑 — auth 스키마 확정 후 이 객체만 맞추면 된다.
function revokeRow(userId: string, site: string, channel: string, ipHash: string, uaHash: string) {
  return {
    user_id: userId, channel, granted: false, revoked_at: new Date().toISOString(), source_site: site,
    text_version: "unsubscribe-link-v1", ip_hash: ipHash, ua_hash: uaHash, via: "unsubscribe_link",
  };
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  if (!token || token.length < 20 || token.length > 100) return json({ ok: false, error: "invalid" }, 400, h);

  const db = admin();
  const th = await sha256(token);
  const { data: tk } = await db.from("crm_unsubscribe_tokens").select("*").eq("token_hash", th).maybeSingle();
  if (!tk || new Date(tk.expires_at) < new Date()) return json({ ok: false, error: "expired" }, 404, h);

  const { data: sp } = await db.from("crm_sender_profiles").select("brand_name, lang").eq("site", tk.site).single();
  let email = "";
  if (tk.user_id) {
    const { data: u } = await db.auth.admin.getUserById(tk.user_id);
    email = u?.user?.email ?? "";
  }
  const masked = email ? email.replace(/^(.)(.*)(.@.*)$/, (_m, a, b, c) => a + "*".repeat(Math.min(b.length, 6)) + c) : "";

  if (req.method === "GET") {
    return json({ ok: true, site: tk.site, brand: sp?.brand_name ?? tk.site, lang: sp?.lang ?? "ko", channel: tk.channel, masked, used: !!tk.used_at }, 200, h);
  }
  if (req.method !== "POST") return json({ ok: false }, 405, h);

  const ctype = req.headers.get("content-type") ?? "";
  let scope: "site" | "all" = "site";
  if (ctype.includes("application/json")) {
    const b = await req.json().catch(() => ({}));
    if (b.scope === "all") scope = "all";
  } // 원클릭(form-urlencoded "List-Unsubscribe=One-Click") 은 해당 사이트만

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = ip ? (await sha256("ip|" + ip)).slice(0, 32) : "";
  const uaHash = (await sha256("ua|" + (req.headers.get("user-agent") ?? ""))).slice(0, 32);
  const sites = scope === "all" ? [...SITES, "family"] : [tk.site, "family"];   // family(통합) 동의도 함께 끊어야 이 사이트 광고가 멈춘다

  if (tk.user_id) {
    // 현재 동의 중인 (사이트, 채널)만 철회 행 추가
    const { data: active } = await db.from("crm_consent_latest").select("site, channel").eq("user_id", tk.user_id).eq("active", true)
      .in("site", sites).in("channel", tk.channel === "email" ? ["email"] : [tk.channel]);
    const rows = (active ?? []).map((a: { site: string; channel: string }) => revokeRow(tk.user_id, a.site, a.channel, ipHash, uaHash));
    if (rows.length) {
      const { error } = await db.from("marketing_consents").insert(rows);
      if (error) return json({ ok: false, error: "consent write failed" }, 500, h);
    }
  }
  if (email) {
    const ah = await recipientHash(email);
    const sup = scope === "all" ? [{ site: null }] : [{ site: tk.site }];
    for (const s of sup) {
      // 유니크 인덱스(channel,address_hash,coalesce(site,'*'),reason) 충돌 = 이미 등록됨 → 무시
      await db.from("crm_suppression").insert({ channel: "email", address_hash: ah, user_id: tk.user_id, site: s.site, reason: "unsubscribe" });
    }
  }
  await db.from("crm_unsubscribe_tokens").update({ used_at: new Date().toISOString() }).eq("token_hash", th);
  // 처리결과 통지는 crm_result_notice_due 뷰에 잡혀 consent-reminder 가 보낸다(14일 이내, 광고 없음).
  return json({ ok: true, scope, site: tk.site, brand: sp?.brand_name ?? tk.site, masked, at: new Date().toISOString() }, 200, h);
});
