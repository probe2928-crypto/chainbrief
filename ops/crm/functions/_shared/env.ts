// 공통 설정 — 모든 값은 Supabase Edge Function 환경변수(Secrets)에서 읽는다. 저장소에 키를 쓰지 않는다.
//   supabase secrets set CRM_ENABLED=true RESEND_API_KEY=... CRM_HASH_PEPPER=... (세준 승인 후)
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.117.3";

export const env = {
  supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  enabled: Deno.env.get("CRM_ENABLED") === "true",            // 환경변수 킬 스위치(DB의 crm_settings.sending_enabled 와 둘 다 true 여야 발송)
  emailProvider: (Deno.env.get("CRM_EMAIL_PROVIDER") ?? "resend") as "resend" | "noop",
  resendKey: Deno.env.get("RESEND_API_KEY") ?? "",
  hashPepper: Deno.env.get("CRM_HASH_PEPPER") ?? "",
  cronSecret: Deno.env.get("CRM_CRON_SECRET") ?? "",           // pg_cron/스케줄러가 호출할 때 x-crm-cron 헤더로 전달
  unsubPage: Deno.env.get("CRM_UNSUB_PAGE") ?? "https://probe2928-crypto.github.io/chainbrief/crm/unsubscribe.html",
  functionsBase: Deno.env.get("CRM_FUNCTIONS_BASE") ?? "",     // https://<ref>.supabase.co/functions/v1
  allowedOrigins: (Deno.env.get("CRM_ALLOWED_ORIGINS") ?? "https://probe2928-crypto.github.io").split(",").map((s) => s.trim()),
  kakaoProvider: (Deno.env.get("CRM_KAKAO_PROVIDER") ?? "none") as "none" | "solapi",
};

export function admin(): SupabaseClient {
  if (!env.supabaseUrl || !env.serviceKey) throw new Error("supabase env missing");
  return createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false } });
}

export function cors(origin: string | null): Record<string, string> {
  const ok = origin && env.allowedOrigins.includes(origin) ? origin : env.allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Headers": "authorization, content-type, x-crm-cron",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 수신자 식별 해시(로그·제외목록용). 원문 이메일은 로그에 남기지 않는다. */
export function recipientHash(addr: string): Promise<string> {
  if (!env.hashPepper) throw new Error("CRM_HASH_PEPPER missing");
  return sha256(addr.trim().toLowerCase() + "|" + env.hashPepper);
}

export function randomToken(bytes = 24): string {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 발송 가능 여부: 환경변수 + DB 설정 둘 다 켜져 있어야 한다. */
export async function sendingAllowed(db: SupabaseClient): Promise<{ ok: boolean; why?: string }> {
  if (!env.enabled) return { ok: false, why: "CRM_ENABLED is not true" };
  const { data, error } = await db.from("crm_settings").select("value").eq("key", "sending_enabled").maybeSingle();
  if (error) return { ok: false, why: "settings read failed" };
  if (data?.value !== true) return { ok: false, why: "crm_settings.sending_enabled is false" };
  return { ok: true };
}

/** 호출자 확인: (1) 스케줄러 비밀 헤더 또는 (2) 관리자 로그인 JWT */
export async function requireAdminOrCron(req: Request): Promise<{ ok: boolean; by?: string }> {
  const cron = req.headers.get("x-crm-cron");
  if (env.cronSecret && cron && cron === env.cronSecret) return { ok: true, by: "cron" };
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || !env.anonKey) return { ok: false };
  const userClient = createClient(env.supabaseUrl, env.anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data } = await userClient.rpc("crm_is_admin");
  if (data === true) {
    const { data: u } = await userClient.auth.getUser();
    return { ok: true, by: u.user?.id };
  }
  return { ok: false };
}
