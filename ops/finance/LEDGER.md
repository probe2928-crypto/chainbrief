# 재무 장부 (금고지기 · 누적)

규칙
- 금액은 원문(영수증·결제 메일·장부 기록)에서 확인한 것만 적는다. 모르면 `확인 필요`.
- 카드·계좌 번호는 적지 않는다(뒤 4자리까지만 허용, 기본은 생략).
- '사업' 칸이 `확인 필요`인 줄은 개인 지출일 수 있음 → 세준 확인 후 사업경비 여부 확정.
- 매주 월요일 금고지기가 지난주(월~일) 행을 추가하고 아래 합계를 갱신한다.

## 1. 거래 내역

| 날짜 | 사업 | 항목 | 금액 | 통화 | 출처(메일 제목/기록) |
|---|---|---|---|---|---|
| 2026-10-27 | QURATOR·체인브리프 앱 | Google Play 개발자 등록비(1회) | 25.00 | USD | Google Payments "Google: Thank you" |
| 2026-10-29 | 확인 필요(앱스토어 추정) | 애플코리아 결제(결제자명 박원길) — Apple 개발자 프로그램인지 확인 필요 | 129,000 | KRW | KG이니시스 "[KG이니시스 결제확인] … 애플코리아 유한회사에서 결제하신 내역" |
| 2026-11-02 | 공통(영상 제작) | Hedra Pro 월 구독 (VAT 포함, 카드 청구 ₩76,904) | 55.00 | USD | "Your receipt from Hedra Inc. #2993-8854" |
| 2026-11-05 | 체인브리프 | 도메인 chainbrief.app 1년 | 8.75 | USD | "porkbun.com \| Order - Thank You - 12413819" |
| 2026-11-05 | Perpline | 도메인 perpline.tech 1년 | 6.99 | USD | "porkbun.com \| Order - Thank You - 12413900" |
| 2026-11-09 | 확인 필요 | Agoda 항공편 예약 1795740554 — 금액·사업 관련 여부 확인 필요 | 확인 필요 | – | "Agoda 예약 확정서 - 예약 번호: 1795740554" |
| 2026-11-09~15 | Perpline·체인브리프 광고 | 메타·Bitmedia 광고비 — 기간 내 집행 0(전부 꺼짐, Bitmedia 잔액 $0.25) | 0 | – | ops/LOG.md 11/16 10:18 리포터 기록 |
| 2026-11-11 | 공통(영상 음성) | ElevenLabs Starter 첫 달 프로모(VAT 포함, 카드 청구 ₩1,526) | 1.10 | USD | "Your receipt from Eleven Labs Inc. #2936-0279-6018" |
| 2026-11-11 | 확인 필요 | Surfshark One 12+3개월 (VAT $4.49 포함) | 49.34 | USD | "Your $49.34 payment was successful" |

매출(들어온 돈)
| 날짜 | 사업 | 항목 | 금액 | 통화 | 출처 |
|---|---|---|---|---|---|
| 2026-11-09~15 | 전 사업 | 확인된 매출 없음 — 거래소 커미션 알림 0(아침 브리핑 11/16), LUFT·QURATOR 결제 수신 메일 없음 | 0(메일 기준) | – | ops/LOG.md 11/16 08:44 · Gmail 검색 |

## 2. 주간 합계

| 주(월~일) | 지출(확인분) | 미확인 | 매출(확인분) | 메모 |
|---|---|---|---|---|
| 11/09~11/15 | **USD 50.44** (ElevenLabs 1.10 + Surfshark 49.34) | Agoda 항공 1건 금액 미확인 | 0 | Surfshark·Agoda는 사업 관련 여부 세준 확인 필요. 사업경비 확정분만 보면 USD 1.10 |

## 3. 월별·사업별 합계 (확인분, USD 기준 / KRW는 따로)

| 월 | 사업 | 지출 | 비고 |
|---|---|---|---|
| 2026-10 | 앱(QURATOR·체인브리프) | USD 25.00 + KRW 129,000(확인 필요) | 10월은 11/16 이전 기록이 없어 메일 검색분만. 광고비(메타·Bitmedia) 10월분은 다음 회차에 광고 기록에서 옮김 |
| 2026-11 (~15일) | 공통(영상) | USD 56.10 (Hedra 55.00 + ElevenLabs 1.10) | |
| 2026-11 (~15일) | 체인브리프 | USD 8.75 | 도메인 |
| 2026-11 (~15일) | Perpline | USD 6.99 | 도메인 |
| 2026-11 (~15일) | 확인 필요 | USD 49.34 + Agoda 미확인 | Surfshark·Agoda |
| **2026-11 소계** | | **USD 121.18** (확인 필요 49.34 포함) | |

## 4. 정기 구독 목록

| 서비스 | 사업 | 요금 | 주기 | 다음 결제일 | 출처/메모 |
|---|---|---|---|---|---|
| Hedra Pro | 공통(영상) | USD 55.00 (VAT 포함) | 월 | 2026-12-02 | Hedra 영수증 #2993-8854 (기간 11/2~12/2) |
| ElevenLabs Starter | 공통(음성) | USD 6.60 예상(정가 6.00 + VAT 10%) | 월 | 2026-12-11 | 첫 달만 $1 프로모. 12월부터 정가 — 영수증 기준 계산, 실제 청구는 다음 영수증으로 대조 |
| Surfshark One | 확인 필요 | USD 49.34 (VAT 포함) | 15개월(12+3) | 2028-02 무렵 자동갱신(갱신가 확인 필요) | 영수증 11/11 |
| Porkbun perpline.tech | Perpline | 갱신 예상 USD 50.98 | 연 | 2027-11-05 | 첫해 $6.99 → 갱신가 7배 주의 |
| Porkbun chainbrief.app | 체인브리프 | 갱신 예상 USD 14.93 | 연 | 2027-11-05 | |
| Google AI Plus | 확인 필요 | 확인 필요 | 확인 필요 | 확인 필요 | Google One "Upcoming changes to your Google AI Plus subscription"(10/14) |
| Claude 구독 | 공통 | 확인 필요 | 확인 필요 | 확인 필요 | Gmail에 영수증 메일 없음 — 결제 이메일이 다른 주소일 수 있음 |
| Supermetrics | 그로스 | 0 (무료 체험 11/14 종료) | – | – | "Your free Supermetrics trial has ended" — 유료 전환 여부 세준 결정(숫자봄 요청) |
| Metricool | 마케팅 | 0 (무료, 월 20건 한도 11/11 도달) | – | – | "[IMPORTANT] You have reached the monthly post limit of your FREE plan." |
| Supabase | 공통 | 0 (무료, 프로젝트 'members' 일시중지 예고 11/9) | – | – | "Your Supabase Project members is going to be paused." |

월 고정비(확인분): Hedra 55.00 + ElevenLabs 6.60 ≈ **USD 61.60/월** (+ Google AI Plus·Claude 확인 필요)
