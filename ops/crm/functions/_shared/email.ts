// 이메일 공급자 어댑터. 기본 Resend(REST API, SDK 없이 fetch). 다른 공급자로 바꿀 땐 EmailProvider 만 새로 구현.
import { env } from "./env.ts";

export interface OutMail {
  from: string;            // "QURATOR <hello@mail.example.kr>"
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  unsubscribeUrl?: string; // 광고 메일: List-Unsubscribe + One-Click(RFC 8058) 헤더로도 넣는다(Gmail·네이버 대량 발송 권장)
  oneClickUrl?: string;    // POST 받는 함수 주소(토큰 포함)
  tags?: Record<string, string>;
}

export interface EmailProvider {
  name: string;
  send(m: OutMail): Promise<{ id: string }>;
}

class ResendProvider implements EmailProvider {
  name = "resend";
  private key: string;
  constructor(key: string) { this.key = key; }
  async send(m: OutMail) {
    const headers: Record<string, string> = {};
    if (m.unsubscribeUrl) {
      headers["List-Unsubscribe"] = m.oneClickUrl ? `<${m.oneClickUrl}>, <${m.unsubscribeUrl}>` : `<${m.unsubscribeUrl}>`;
      if (m.oneClickUrl) headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: m.from, to: [m.to], reply_to: m.replyTo, subject: m.subject, html: m.html, text: m.text, headers,
        tags: m.tags ? Object.entries(m.tags).map(([name, value]) => ({ name, value: value.replace(/[^A-Za-z0-9_-]/g, "_") })) : undefined,
      }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const d = await r.json();
    return { id: String(d.id ?? "") };
  }
}

/** 키가 없거나 dry-run 일 때: 아무것도 보내지 않는다. */
class NoopProvider implements EmailProvider {
  name = "noop";
  async send(_m: OutMail) { return { id: "noop-" + crypto.randomUUID() }; }
}

export function emailProvider(dryRun: boolean): EmailProvider {
  if (dryRun || env.emailProvider === "noop") return new NoopProvider();
  if (env.emailProvider === "resend") {
    if (!env.resendKey) throw new Error("RESEND_API_KEY missing");
    return new ResendProvider(env.resendKey);
  }
  throw new Error("unknown CRM_EMAIL_PROVIDER");
}
