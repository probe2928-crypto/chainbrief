// 카카오 발송 어댑터 — 인터페이스만. 키·발신프로필이 없으므로 실제 호출 코드는 넣지 않는다.
//
// 규칙(PLAN.md §2-3)
//  * 알림톡(alimtalk): 정보성 전용(주문·결제·예약 확정·당첨 안내 등). 광고 문구가 섞이면 템플릿 검수에서 반려되고 전체가 광고로 간주.
//                      사전 등록·검수된 템플릿 코드로만 발송. 수신 동의 불필요(정보성), 단 수신자가 알림톡 차단 시 실패.
//  * 브랜드 메시지(brand): 광고. (광고) 표기 + 수신거부 안내(채널 차단 또는 080). 08:00~20:50 만.
//      - F 타입: 채널 친구 전체 → 우리 규모에서 현실적인 유일한 경로(수신거부 = 채널 차단 안내)
//      - M/N/I/O 타입(자사 마케팅 동의 회원 대상): 카카오 공식 기준 채널 친구 5만 명 이상 + 최근 알림톡 발송 이력 필요 → 당분간 불가
//  * 전제: 카카오톡 채널을 '비즈니스 채널'로 전환(사업자등록증 심사) + 홈 공개 + 고객센터 전화번호 입력 → 딜러사에서 발신프로필 키 발급.
//  * 1순위 대행사 후보: 솔라피(월 기본료·API 무료, 건당 과금). 단가는 PLAN.md 표 참조(VAT 별도, 변동 가능).

export interface AlimtalkMessage {
  to: string;                         // 수신자 휴대폰(E.164 또는 010...)
  templateCode: string;               // 카카오 검수 완료된 템플릿 코드
  variables: Record<string, string>;  // #{이름} 등 치환값
  fallbackSms?: false;                // 대체 문자 발송은 기본 끔(문자는 보류 정책)
}

export interface BrandMessage {
  to: string;
  targeting: "F";                     // 지금은 F(채널 친구)만 허용
  text: string;                       // 맨 앞 "(광고)" + 채널명, 끝에 수신거부(채널 차단) 안내 포함 — buildBrandText 로 생성
  buttons?: { name: string; url: string }[];
}

export interface KakaoProvider {
  name: string;
  sendAlimtalk(m: AlimtalkMessage): Promise<{ id: string }>;
  sendBrand(m: BrandMessage): Promise<{ id: string }>;
}

export function buildBrandText(channelName: string, body: string): string {
  const b = body.replace(/^\s*\(광고\)\s*/, "");
  return `(광고) ${channelName}\n${b}\n\n수신거부: 채널 홈 우측 상단 > 채널 차단`;
}

class NotConfigured implements KakaoProvider {
  name = "none";
  sendAlimtalk(): Promise<{ id: string }> { return Promise.reject(new Error("kakao provider not configured")); }
  sendBrand(): Promise<{ id: string }> { return Promise.reject(new Error("kakao provider not configured")); }
}

/** 솔라피 어댑터 자리. 구현 시: API Key/Secret 은 환경변수(SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_PF_ID),
 *  HMAC-SHA256 인증 헤더, POST /messages/v4/send-many/detail. 공식 문서(developers.solapi.com) 확인 후 작성. */
class SolapiPlaceholder extends NotConfigured { constructor() { super(); this.name = "solapi(placeholder)"; } }

export function kakaoProvider(kind: "none" | "solapi"): KakaoProvider {
  return kind === "solapi" ? new SolapiPlaceholder() : new NotConfigured();
}
