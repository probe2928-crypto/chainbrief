# 통합 CRM · 마케팅 발송 계획 (2026-11-02)

담당: 마케팅 발송·CRM. 상태: **전부 꺼짐**(키 없음, `crm_settings.sending_enabled=false`, `CRM_ENABLED` 미설정, 수신거부 페이지 비활성).
선행 작업: 통합 로그인(`ops/auth/schema.sql`, `public/auth/`) — 다른 담당. 이 폴더는 그 테이블을 읽고, 수신거부 때 `marketing_consents`에 철회 행만 추가한다.

---

## 1. 결론 요약

| 항목 | 결정 | 이유 |
|---|---|---|
| 주력 채널 | **이메일** | 무료/저가, 동의자에게 바로 보낼 수 있음, 해외(Perpline)도 같은 경로 |
| 이메일 공급자 | **Resend** (대안: Amazon SES, Brevo) | 무료 월 3,000통(일 100통), Pro $20/월 5만 통. Supabase Edge Function 공식 예제 있음. 자체 DB·자체 수신거부를 쓰므로 API(`/emails`)만 사용 |
| 카카오 | **알림톡 = 정보성(주문·예약·당첨)**, **브랜드 메시지 F타입 = 채널 친구 대상 광고** | 알림톡은 광고 불가. 자사 동의 회원 대상(M/N/I/O)은 채널 친구 5만 명 기준이라 당분간 불가 |
| 카카오 대행사 | **솔라피** 1순위 | 월 기본료·API 무료, 건당 과금, 브랜드 메시지 지원, 단가 공개 |
| 문자 | 보류 | 080 무료수신거부 번호 필요, 단가 높음, 2026 개정으로 대량문자 위탁 요건 강화 |
| 도메인 | **구매 필요** | github.io 에는 SPF/DKIM/DMARC 를 걸 수 없음 → 네이버·Gmail 수신 정책상 스팸함/차단 위험. Resend 도 도메인 인증 없이는 외부 발송 불가 |
| 동의 범위 | **사이트별 분리 동의**(기본) + 선택적 '통합 소식(family)' 동의 | 사이트 명의(사업자)가 같은지 불확실 → A 사이트 동의로 B 사이트 광고 금지가 가장 안전 |
| 뉴스레터 | beehiiv 는 보류(별도 명단이 생겨 DB가 둘로 쪼개짐). 체인브리프 뉴스레터도 같은 Resend 경로로 | 한 사람=한 동의 기록 원칙 |

### 월 예상 비용 (VAT·환율 제외, 확인 시점 2026-11)
| 단계 | 내용 | 비용 |
|---|---|---|
| 시작(가입 ~1,000명) | 도메인 1개 + Resend Free + 알림톡 월 300건 | 도메인 연 1~2만원대(등록처별 상이, **확인 필요**) + 알림톡 13원×300 ≈ 3,900원 → **월 약 5천 원** |
| 성장(동의자 ~5,000명, 주 1회) | 이메일 월 ~2.5만 통 → Resend Pro | $20/월 + 카카오 사용량 → **월 약 3~5만 원** |
| 대안 | Amazon SES $0.10/1,000통(à la carte) | 5만 통 ≈ $5 — 대신 샌드박스 해제 심사·반송 처리 직접 구현 필요 |

---

## 2. 법 규칙 (근거)

> 법률 자문이 아님. 조문은 국가법령정보센터 원문 확인분, 나머지는 KISA 안내서 인용 자료 기준. '확인 필요' 표시는 원문 미확인.

| # | 규칙 | 근거 | 우리 구현 |
|---|---|---|---|
| 1 | 광고성 정보는 **수신자의 명시적 사전 동의** 필요. 예외: 거래관계로 직접 받은 연락처로 **거래 종료일부터 6개월** 이내 **같은 종류 재화** 광고 | 정보통신망법 제50조①1호, 시행령 제61조① | 동의자만 발송(`crm_campaign_audience`). **거래관계 예외는 쓰지 않음**(범위 다툼 소지·단순화) |
| 2 | 수신거부·동의철회 후 전송 금지, 거부 회피·방해 금지, 거부 비용 수신자 부담 금지 | 제50조②⑤⑥ | 로그인 없는 원클릭 수신거부 + RFC 8058 One-Click 헤더, 즉시 `crm_suppression` |
| 3 | **21시~다음 날 8시** 광고는 별도 사전 동의. 단 **전자우편은 예외** | 제50조③, 시행령 제61조② | 운영 규칙으로 **모든 채널 20:50~08:00 광고 차단**(카카오 브랜드 메시지는 08:00~20:50만 발송 가능 — 딜러 안내). 야간 동의(`night`)는 받되 쓰지 않음 |
| 4 | 광고에 **전송자 명칭·연락처, 수신거부 방법** 명시. 전자우편은 **제목 시작 부분 "(광고)"**, 본문에 전송자 명칭·전자우편주소·전화·주소, 수신거부 링크 | 제50조④, 시행령 제61조③ 별표 6 | `adSubject()` 가 제목 앞 "(광고) 서비스명" 자동 부착, 법정 블록 자동 삽입. 변형([광고], (AD)) 금지 |
| 5 | 동의·거부·철회 의사표시 받으면 **처리결과 통지**(14일 이내, 광고 포함 금지) | 제50조⑦, 시행령 제62조의2 | auth 화면 즉시 안내 + `consent-reminder` 가 14일 내 이메일 통지·기록 |
| 6 | 동의 받은 날부터 **2년마다 수신동의 여부 확인**: 전송자 명칭, 동의 사실·날짜, 유지/철회 방법 안내 | 제50조⑧, 시행령 제62조의3 | `crm_biennial_due` 뷰 → 기념일 30일 전 안내. '철회 방법'을 안내하므로 무응답=유지(KISA 해석, 2차 자료) |
| 7 | 과태료: 사전동의·수신거부·야간·표기 위반 1회 750만/2회 1,500만/3회 3,000만원. 수신동의 미확인 등 300/600/1,000만원 | 제76조(2차 자료 인용) | — |
| 8 | 2026 개정: 불법스팸 **관련 매출 최대 6% 과징금**(제50조의9), 부당이익 몰수, 대량문자 전송자격인증 위탁 | 2026.3 국회 통과·공포 후 6개월 시행(**시행일 확인 필요**) | 문자 보류 이유 중 하나 |
| 9 | 개인정보보호법: 홍보·판매권유 목적 처리 동의는 **다른 동의와 구분**해 받아야 함 | 개인정보보호법 제22조(호 번호 **확인 필요**) | auth 가입창에서 '마케팅 목적 개인정보 이용 및 광고성 정보 수신'을 선택 항목·채널별로 분리(미리 체크 금지) |

KISA 해석(2차 자료): 동의 문구에 "광고성 정보 수신동의"를 명시('혜택 알림 동의'는 무효 소지), 미리 체크된 박스 무효, 매체별 동의 권장, 매체를 나눠 받았으면 거부도 그 매체만.

### 해외(Perpline) 핵심
- 전송자는 한국 사업자 → 위 국내 규칙 그대로(제목 "(광고)" 포함). 영문 메일 본문에 "This is an advertisement (광고)" 병기.
- **CAN-SPAM**(미국 거주자는 서비스 제외지만 동일 수준 준수): 광고 표시, 실제 우편 주소, 명확한 수신거부, **10영업일 내 처리**, 수신거부 메커니즘 **30일 이상 유지**, 위반 건당 최대 $53,088(FTC).
- **GDPR/ePrivacy(EU)**: 동의 기반. 이중 동의(double opt-in)는 법적 의무는 아니나 독일 등에서 권장·입증 수단 → **EU 국가 가입자는 확인 메일 클릭 후에만 광고 단계 발송**(구현: auth 쪽 이메일 인증 완료 여부 + `crm_contact_attrs.country` EU 판정, 미구현 — 아래 '다음 할 일').

---

## 3. 통합 DB 구조

```
auth.users ─┬─ profiles                (auth 담당)
            ├─ memberships(site, joined_at, source, utm)          ← 사이트별 가입
            ├─ marketing_consents(channel, granted, granted_at,   ← 이력은 행 추가
            │      revoked_at, source_site, text_version, ip/ua 해시)
            ├─ crm_contact_attrs(country, lang, phone, kakao_channel_friend)
            └─ crm_contact_facts(site, kind=purchase|subscription_start|…|event_entry)  ← 이벤트·결제가 insert
crm_sender_profiles(site → 상호·주소·전화·보내는 주소·ready)
crm_campaigns → crm_campaign_sends(발송 로그, 수신자 해시) → crm_unsubscribe_tokens
crm_suppression(수신거부·반송·신고)   crm_consent_notices(처리결과·2년 통지 기록)   crm_settings(킬 스위치·상한)
뷰: crm_consent_latest · crm_consent_anchor · crm_segment_base(동의자만) · crm_biennial_due · crm_result_notice_due
```
- 한 사람 = auth 계정 1개. 사이트별 관심 = memberships + facts.
- 세그먼트 축: 사이트 · 국가 · 언어 · 가입일 · 구매/구독 여부 · 이벤트 응모 수 · 동의 채널 · 카카오 채널 친구 여부.
- RLS: 모든 crm_ 테이블은 관리자(`crm_admins`)만, 뷰는 서비스 롤 전용, 대시보드는 숫자만 주는 `crm_dashboard_stats()`.
- 이메일 원문은 `auth.users` 에만. 로그·제외목록은 `sha256(이메일+pepper)`.
- 탈퇴: 계정 삭제 시 attrs/facts/토큰 삭제, 발송 로그·통지 기록은 user_id 만 비워 증빙으로 보존.

### 사이트 간 공유 — 결정
**사이트별 분리 동의**를 기본으로 한다. 사이트 A에서 받은 동의는 A 광고에만 쓴다(`source_site` 단위). 여러 사이트 광고를 한 번에 받는 건 '통합 소식(family)' 동의를 따로 받았을 때만.
이유: 현재 LUFT 사이트에 공개된 사업자는 "루프트(LUFT) · 대표 박세준"뿐이고, 체인브리프·QURATOR·인생준준·Perpline 이 같은 사업자등록번호 아래인지 확인되지 않음. 명의가 다르면 회원정보 공유 자체가 '제3자 제공' 동의 사안이 됨.
- **세준 확인 필요**: 각 사이트 운영 명의(사업자등록번호). 모두 같다면 처리방침에 "함께 이용하는 서비스" 목록과 family 동의 문구를 넣어 통합 소식 발송 가능.

---

## 4. 채널 전략 · 발송 규칙

- **이메일(주력)**: 가입 웰컴 시퀀스 + 사이트별 월 2~4회 소식. 정보성(가입·주문·예약)은 동의 없이, 광고는 동의자만.
- **카카오 알림톡**: 주문 완료(LUFT), 예약/출발 확정(인생준준), 이벤트 당첨(이벤트 담당 연동), 구독 결제(QURATOR). 광고 문구 0.
- **카카오 브랜드 메시지 F타입**: 채널 친구 전체 대상 광고. 수신거부 = 채널 차단 안내. 카카오싱크 간편가입 화면의 '채널 추가 동의'로 친구를 모은다.
- **문자**: 보류.

자동 가드(코드에 들어 있음)
1. 광고 제목 "(광고) 서비스명 …" 자동, 하단 전송자 정보·동의일·수신거부 링크 자동, List-Unsubscribe(+One-Click) 헤더.
2. 20:50~08:00 KST 광고 차단(웰컴 광고 단계는 다음 실행으로 미룸).
3. 동의 없는 사람·제외목록·이미 보낸 사람 자동 제외.
4. 빈도 상한: 1인당 24시간 1건, 7일 2건(전 사이트 합산).
5. 2년 확인 안내·처리결과 통지 자동(`consent-reminder`, 하루 1회).
6. LUFT 금지어(탈취·항균·천연·무해·무독성·안심·에코·히노키)와 "숫자+원" 가격 표기 자동 차단(템플릿 빌드·캠페인 발송 시).
7. 전송자 정보(`crm_sender_profiles.ready`) 미완성 사이트는 발송 불가.
8. 이중 킬 스위치: 환경변수 `CRM_ENABLED=true` + DB `sending_enabled=true` + 요청 `dry_run:false` 세 개가 모두 맞아야 실제 발송.

---

## 5. 사이트별 첫 캠페인 — 웰컴 시퀀스

`templates/welcome/<site>.json`. 0일 = 정보성(가입자 전원), 3일·7일 = 광고(해당 사이트 이메일 동의자만). 미리보기: 스크래치패드 `crm-previews/emails/`.

| 사이트 | 0일(정보성) | 3일(광고) | 7일(광고) |
|---|---|---|---|
| QURATOR | 가입 완료 · QR 해설 쓰는 법 | 하루 한 점, 3분의 명작 감상(Daily Art) | 이번 주에 놓친 작품, 다시 볼까요 |
| Perpline (EN) | Your Perpline account is ready (KR·US 거주자 불가 고지) | How fee rebates actually work | CEX or perp DEX? A two-minute checklist |
| LUFT | 가입 완료 · 주문/배송 확인 | 차 안에 들인 한국의 문양 | 선물로 고르기 좋은 LUFT |
| 인생준준 | 가입 완료 · 동행 신청 방법 | 혼자는 망설여지고, 패키지는 싫다면 | 곧 출발하는 동행, 자리 확인해 보세요 |
| 체인브리프 | 가입 완료 | 아침 3분, 밤사이 코인 소식 정리 | 상장·유의 소식, 텔레그램으로 먼저 |

원칙: 가격·수치·효능 주장 없음(사이트 화면이 기준), 투자 권유 문구 없음. 가입 혜택(쿠폰·추첨 등)은 이벤트 담당(event/2026-11-02) 영역이라 웰컴 메일에 넣지 않음 — 이벤트 확정 후 문구 한 줄 연결만.

---

## 6. 파일

| 경로 | 내용 |
|---|---|
| `schema_crm.sql` | 테이블·뷰·함수·RLS (로컬 Postgres 16 + auth 스텁으로 실행·재실행·동작 검증) |
| `functions/send-campaign` | 캠페인/웰컴 발송, 기본 dry-run |
| `functions/unsubscribe` | 토큰 검증 → 철회 행 추가 + 제외목록, One-Click 지원 |
| `functions/consent-reminder` | 처리결과 통지(14일) + 2년 확인 안내 |
| `functions/_shared/` | env·정책·이메일/카카오 어댑터·렌더러·`templates.gen.ts`(자동 생성) |
| `templates/` | 공통 레이아웃, 법정 문구(ko/en), 통지문, 웰컴 5종, `build.mjs` |
| `dashboard/crm-dashboard.html` | 관리자 대시보드 정적 시안(더미 숫자) |
| `../../public/crm/unsubscribe.html`, `config.js` | 수신거부 페이지(한/영). `enabled:false` 면 아무것도 안 보이고 홈으로 이동, 어디에도 링크 없음 |

배포 순서(켤 때): ① auth 스키마 → `schema_crm.sql` ② `crm_admins` 에 세준 계정 ③ `crm_sender_profiles` 값 입력·`ready=true` ④ `node ops/crm/templates/build.mjs` ⑤ `supabase functions deploy send-campaign unsubscribe consent-reminder` + secrets(`RESEND_API_KEY`, `CRM_HASH_PEPPER`, `CRM_CRON_SECRET`, `CRM_FUNCTIONS_BASE`) ⑥ `public/crm/config.js` 값 입력 ⑦ dry-run 확인 → `CRM_ENABLED=true`, `sending_enabled=true` ⑧ 스케줄: welcome 매시, consent-reminder 매일 10:00 KST.

---

## 7. 세준이 할 일 (순서·소요시간)

1. **사이트별 운영 명의 확인**(사업자등록번호 1개인지) — 5분
2. **도메인 구매** 1개(아래 결정 1) — 15분, DNS 반영 수 시간
3. **Resend 가입 → 도메인 추가 → DNS에 SPF·DKIM·DMARC 레코드 입력** — 30분(+인증 대기 최대 수 시간). 레코드 값은 Claude 가 대신 정리
4. **카카오톡 채널 개설 → 비즈니스 채널 전환 신청**(사업자등록증, 홈 공개, 고객센터 전화번호 입력) — 20분 + 심사 영업일 수일(**기간 확인 필요**)
5. **솔라피 가입·사업자 인증 → 발신프로필 등록 → 알림톡 템플릿 검수 신청** — 30분 + 검수 대기
6. (선택) **카카오디벨로퍼스 비즈 앱 전환 + 카카오싱크 신청**(채널 추가 동의 받기) — 30분 + 검수
7. `crm_sender_profiles` 에 들어갈 상호·주소·대표 전화·연락 이메일 알려주기 — 5분

## 8. 세준이 결정할 것
1. **도메인 하나로 묶을지, 브랜드별로 살지** — 추천: 사업자 상호 기준 1개(예: 보내는 주소 `luft@mail.<도메인>`, `news@…`)로 시작, Perpline 만 나중에 별도(해외·코인 평판 분리).
2. **사이트 간 통합 소식(family) 동의를 받을지** — 명의가 같을 때만 가능. 추천: 지금은 사이트별 분리 유지.
3. **카카오는 알림톡만 먼저 할지, 브랜드 메시지(F타입 광고)까지 할지** — 추천: 알림톡 먼저(주문·예약·당첨), 채널 친구 1,000명 넘으면 브랜드 메시지.

## 9. 다음 할 일(Claude)
- auth 스키마 확정되면 `crm_consent_latest`·`revokeRow()` 컬럼명 맞추기.
- EU 이중 동의 판정, 반송·스팸신고 웹훅(Resend webhook → `crm_suppression`), 솔라피 어댑터 구현.
- 대시보드 실데이터 연결(`crm_dashboard_stats()`).

## 근거 링크
- 정보통신망법 제50조: https://www.law.go.kr/법령/정보통신망이용촉진및정보보호등에관한법률/제50조
- 시행령 제61조(6개월·전자우편 야간 예외·별표6): https://www.law.go.kr/법령/정보통신망이용촉진및정보보호등에관한법률시행령/제61조
- 시행령 제62조의3(2년 확인): https://www.law.go.kr/법령/정보통신망이용촉진및정보보호등에관한법률시행령/제62조의3
- KISA 안내서 기반 정리(동의 유효요건·14일 통지·2년 기산점): https://blog.bizgo.io/?p=3380
- 2026 개정(과징금 6%·과태료 표): https://blog.bizgo.io/inside/telecom-business-act-amendment-spam-penalty/
- 광고 표기·야간·알림톡 광고 금지(솔라피 공지): https://solapi.com/notices/notices-2026-02-10
- 별표6 전자우편 표기(KISA 안내서 PDF): https://t1.kakaocdn.net/rocket/user-guide/latest-kisa-guide-1.pdf
- 브랜드 메시지 타입·5만 친구 기준·08:00~20:50: https://blog.bizgo.io/howto/brand-message-guide/
- 비즈니스 채널 요건(알림톡·브랜드 메시지 필수): https://blog.bizgo.io/howto/kakaotalk-business-channel-vs-general-channel/
- 솔라피 단가(알림톡 13원, 브랜드 메시지 53~103원, VAT 별도): https://solapi.com/pricing
- 카카오싱크(채널 추가 동의, 비즈 채널+비즈 앱 필요): https://developers.kakao.com/docs/latest/ko/kakaosync/common , https://business.kakao.com/info/kakaosync/
- Resend 요금(Free 3,000/월·100/일, Pro $20): https://resend.com/pricing · Supabase 연동: https://resend.com/docs/send-with-supabase-edge-functions
- Brevo 무료 300통/일: https://help.brevo.com/hc/en-us/articles/208580669
- Amazon SES 요금: https://aws.amazon.com/ses/pricing/
- beehiiv 무료 2,500명: https://www.beehiiv.com/pricing · 스티비 무료 500명·월 2회: https://blog.stibee.com/stibee-pricing-guide/
- 네이버 메일 SPF·DKIM·DMARC(2024.7.19~): https://blog.thundermail.co.kr/422 , https://blog.stibee.com/gmail-sender-guidelines/
- CAN-SPAM: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- GDPR 이중 동의 비의무·권장: https://www.iubenda.com/en/blog/gdpr-double-opt-in-2/ · soft opt-in(ICO): https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/
- 미확인: 알리고·NHN Cloud 브랜드 메시지 단가, 솔라피 최소 충전액, 카카오 비즈니스 채널 심사 기간.
