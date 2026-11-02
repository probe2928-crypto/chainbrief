// 메일 렌더러 — Edge Function(Deno)과 미리보기 빌드(Node)가 같이 쓰는 순수 JS(ESM).
// 법정 문구 블록은 여기서 항상 붙인다. 캠페인 본문에 직접 쓰지 않는다.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** {{key}} 치환 + {{#flag}}...{{/flag}} 조건 블록. html=true 인 키는 이스케이프하지 않는다. */
export function fill(tpl, vars, rawKeys = []) {
  let out = tpl.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, inner) => (vars[k] ? inner : ""));
  return out.replace(/\{\{(\w+)\}\}/g, (_, k) => (rawKeys.includes(k) ? String(vars[k] ?? "") : esc(vars[k] ?? "")));
}

export function withUtm(url, site, campaign) {
  if (!url) return "";
  if (url.includes("/crm/unsubscribe")) return url;   // 수신거부 링크엔 추적 파라미터를 붙이지 않는다
  const u = new URL(url);
  u.searchParams.set("utm_source", "crm");
  u.searchParams.set("utm_medium", "email");
  u.searchParams.set("utm_campaign", campaign);
  const hash = u.hash; u.hash = "";
  return u.toString() + hash;
}

/**
 * @param T      templates.gen 의 TEMPLATES
 * @param o.site 사이트 키, o.kind 'ad'|'info'|'legal', o.lang 'ko'|'en'
 * @param o.sender crm_sender_profiles 행, o.content {label, headline, body, cta_text, cta_url, preheader}
 * @param o.subject 최종 제목(광고면 이미 (광고) 포함), o.unsubscribeUrl, o.consentDate, o.campaignKey
 */
export function renderEmail(T, o) {
  const b = T.brands[o.site];
  const lang = o.lang || b.lang;
  const s = o.sender || {};
  const dash = "—";
  const v = {
    html_lang: lang, subject: o.subject, preheader: o.content.preheader || "",
    paper: b.paper, card: b.card, ink: b.ink, accent: b.accent, muted: b.muted, line: b.line, head_font: b.head_font,
    wordmark: b.wordmark, label: o.content.label || "",
    brand_name: s.brand_name || b.wordmark, legal_name: s.legal_name || dash, representative: s.representative || dash,
    biz_reg_no: s.biz_reg_no || dash, address: s.address || dash, phone: s.phone || dash, contact_email: s.contact_email || dash,
    privacy_url: s.privacy_url || b.urls.home, unsubscribe_url: o.unsubscribeUrl || "#", consent_date: o.consentDate || "",
    ad: o.kind === "ad", info: o.kind !== "ad",
  };
  const ctaHref = o.content.cta_url ? withUtm(b.urls[o.content.cta_url] || o.content.cta_url, o.site, o.campaignKey || "crm") : "";
  const cta = ctaHref && o.content.cta_text
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;"><tr><td style="background:${b.accent};border-radius:999px;"><a href="${esc(ctaHref)}" style="display:inline-block;padding:14px 26px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">${esc(o.content.cta_text)}</a></td></tr></table>`
    : "";
  const adBadge = o.kind === "ad"
    ? `<p style="margin:0 0 16px 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.08em;color:${b.muted};">(광고)${lang === "en" ? " · ADVERTISEMENT" : ""}</p>`
    : "";
  const legal = fill(T.legal[lang], v);
  const body = fill(o.content.body, v);          // 본문 템플릿 HTML 은 그대로, 치환 값만 이스케이프
  const headline = fill(o.content.headline, v);
  return fill(T.layout, { ...v, headline, body, cta, ad_badge: adBadge, legal }, ["headline", "body", "cta", "ad_badge", "legal"]);
}

/** 텍스트 버전(스팸 점수·접근성용) */
export function toText(html) {
  return html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<br\s*\/?>/g, "\n").replace(/<\/p>/g, "\n\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, "$2 ($1)").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();
}
