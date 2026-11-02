// 발송 규칙(법정 + 운영). 근거는 ops/crm/PLAN.md §2.
//  - 광고 제목 맨 앞 "(광고)"            : 정보통신망법 제50조④, 시행령 제61조③ 별표 6(전자우편: 제목이 시작되는 부분)
//  - 본문 전송자 명칭·연락처·수신거부   : 같은 조항. legal 블록으로 자동 삽입(render.ts)
//  - 야간 차단                           : 제50조③(21~08시 별도 동의). 이메일은 시행령 제61조②로 예외지만 운영상 전 채널 차단.
//                                          카카오 브랜드 메시지는 08:00~20:50 만 발송 가능(딜러 안내) → 20:50 부터 막는다.
//  - 동의 없는 사람 제외 / 빈도 상한     : DB 함수 crm_campaign_audience 에서 1차, 여기서 2차 확인.

export type Kind = "ad" | "info" | "legal";

export const AD_PREFIX = "(광고)";   // 변형 금지: [광고], (AD), (광/고) 등은 위반 사례로 안내됨

/** 광고 제목: "(광고)" + 서비스명 + 제목. 이미 붙어 있으면 중복하지 않는다. 영문 사이트도 국내 사업자 발송이므로 동일 적용. */
export function adSubject(brand: string, subject: string): string {
  const s = subject.replace(/^\s*[\[(（]\s*(광고|ad)\s*[\])）]\s*/i, "").trim();
  return `${AD_PREFIX} ${brand} ${s}`.replace(/\s+/g, " ").trim();
}

/** KST 기준 광고 금지 시간인가 (기본 20:50~08:00) */
export function isQuietHours(now = new Date(), start = "20:50", end = "08:00"): boolean {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const m = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm, e = eh * 60 + em;
  return s > e ? m >= s || m < e : m >= s && m < e;
}

/** LUFT 광고 문구 금지어(표시·광고 리스크). 템플릿·캠페인 본문 검사에 쓴다. 판매가 숫자도 자동 차단. */
export const BANNED: Record<string, RegExp[]> = {
  luft: [/탈취/, /항균/, /천연/, /무해/, /무독성/, /안심/, /에코/, /히노키/, /[0-9][0-9,]*\s*원/],
};

export function lintCopy(site: string, text: string): string[] {
  return (BANNED[site] ?? []).filter((re) => re.test(text)).map((re) => re.source);
}

export interface SenderProfile {
  site: string; brand_name: string; legal_name: string | null; representative: string | null;
  biz_reg_no: string | null; address: string | null; phone: string | null; contact_email: string | null;
  from_email: string | null; reply_to: string | null; lang: "ko" | "en"; privacy_url: string | null; ready: boolean;
}

/** 광고 발송 전 전송자 정보가 법정 표기 요건을 채웠는지 */
export function senderMissing(p: SenderProfile): string[] {
  const need: [keyof SenderProfile, string][] = [
    ["legal_name", "상호"], ["address", "주소"], ["phone", "전화"], ["contact_email", "연락 이메일"], ["from_email", "보내는 주소(도메인)"],
  ];
  const miss = need.filter(([k]) => !p[k]).map(([, l]) => l);
  if (!p.ready) miss.push("ready=false");
  return miss;
}
