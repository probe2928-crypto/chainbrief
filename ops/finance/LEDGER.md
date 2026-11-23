# 재무 장부 (금고지기 · 누적)

규칙
- 금액은 원문(영수증·결제 메일·장부 기록)에서 확인한 것만 적는다. 모르면 `확인 필요`.
- 카드·계좌 번호는 적지 않는다(뒤 4자리까지만 허용, 기본은 생략).
- '사업' 칸 `미분류` = 사업경비로 넣지 않은 지출. 세준 11/18 "이거는 종료해" → Surfshark·Agoda·애플코리아 건은 다시 묻지 않고 미분류로 둔다(사업 합계에서 뺌).
- 매주 월요일 금고지기가 지난주(월~일) 행을 추가하고 아래 합계를 갱신한다. 매출은 정산 기간 기준으로 주에 넣는다.
- 사업자등록: 1개(세준 11/18 — QURATOR, 일반과세자, 11/16 등록). 사업별 칸은 내부 관리용 구분.

## 1. 거래 내역 — 지출

| 날짜 | 사업 | 항목 | 금액 | 통화 | 출처(메일 제목/기록) |
|---|---|---|---|---|---|
| 2026-10-27 | QURATOR·체인브리프 앱 | Google Play 개발자 등록비(1회) | 25.00 | USD | Google Payments "Google: Thank you" |
| 2026-10-29 | 미분류 | 애플코리아 결제(결제자명 박원길) | 129,000 | KRW | KG이니시스 "[KG이니시스 결제확인] … 애플코리아 유한회사에서 결제하신 내역" |
| 2026-11-02 | 공통(영상 제작) | Hedra Pro 월 구독 (VAT 포함, 카드 청구 ₩76,904) | 55.00 | USD | "Your receipt from Hedra Inc. #2993-8854" |
| 2026-11-05 | 체인브리프 | 도메인 chainbrief.app 1년 | 8.75 | USD | "porkbun.com \| Order - Thank You - 12413819" |
| 2026-11-05 | Perpline | 도메인 perpline.tech 1년 | 6.99 | USD | "porkbun.com \| Order - Thank You - 12413900" |
| 2026-11-09 | 미분류 | Agoda 항공편 예약 1795740554 | 확인 필요 | – | "Agoda 예약 확정서 - 예약 번호: 1795740554" |
| 2026-11-09~15 | Perpline·체인브리프 광고 | 메타·Bitmedia 광고비 — 집행 0(전부 꺼짐, Bitmedia 잔액 $0.25) | 0 | – | ops/LOG.md 11/16 10:18 리포터 기록 |
| 2026-11-11 | 공통(영상 음성) | ElevenLabs Starter 첫 달 프로모(VAT 포함, 카드 청구 ₩1,526) | 1.10 | USD | "Your receipt from Eleven Labs Inc. #2936-0279-6018" |
| 2026-11-11 | 미분류 | Surfshark One 12+3개월 (VAT $4.49 포함) | 49.34 | USD | "Your $49.34 payment was successful" |
| 2026-11-16~22 | Perpline·체인브리프 광고 | 메타·Bitmedia 광고비 — 집행 0(광고 동결, 11/25 결정 대기) | 0 | – | ops/LOG.md 11/21·11/22 아침 브리핑("모션 광고는 동결 중"), ORDERS 11/19 DECISION-1125 |
| 2026-11-20 | 미분류 | Agoda 숙박 1박(고양 주교 Luxe, 11/20~21, 결제일 11/20) — KRW 69,900 (USD 52.55) | 69,900 | KRW | "Agoda - Customer Receipt from Booking ID: 1800319901" 첨부 Receipt.pdf |

## 1-2. 거래 내역 — 매출(들어온 돈)

| 날짜(메일·KST) | 사업 | 항목 | 금액 | 통화 | 출처 |
|---|---|---|---|---|---|
| 2026-11-02 | Perpline·체인브리프(거래소 제휴) | BTCC 제휴 커미션 정산(선물) | 0.34 | USDT | "[BTCC] You have a commission ready for withdrawal…" 11/02 |
| 2026-11-03 | 〃 | BTCC 제휴 커미션 정산 | 0.05 | USDT | 같은 제목 11/03 |
| 2026-11-04 | 〃 | BTCC 제휴 커미션 정산 | 0.03 | USDT | 같은 제목 11/04 |
| 2026-11-05 | 〃 | BTCC 제휴 커미션 정산 | 0.48 | USDT | 같은 제목 11/05 |
| 2026-11-09~15 | 전 사업 | 정산 메일 0건(BTCC·Bitget 모두) | 0 | – | Gmail `from:noreply2@btcc.com after:2026/11/01` 6건 중 이 기간 0 |
| 2026-11-21 | Perpline·체인브리프(거래소 제휴) | BTCC 커미션 — 정산기간 11/19 16:00~11/20 16:00 UTC, 선물 | 0.34 | USDT | 같은 제목 11/21 |
| 2026-11-23 | 〃 | BTCC 커미션 — 정산기간 11/21 16:00~11/22 16:00 UTC, 선물 | 0.57 | USDT | 같은 제목 11/23 |
| 2026-11-16~22 | Perpline(거래소 제휴) | Bitget 제휴 리베이트 0.00000000 USDT·가입 0 / BTCC 주간 신규 가입·입금·거래 0 | 0 | USDT | "Affiliate daily data report"(Bitget 11/22분) · "[BTCC] Your affiliate account's promotion data report…"(11/16~22) |
| 2026-11-16~22 | LUFT·QURATOR 등 | 판매·결제 수신 메일 없음 | 0(메일 기준) | – | Gmail 결제·주문 검색 |

> 정정: 11/16 장부의 "10월~11/15 매출 0"은 BTCC 커미션 메일을 빠뜨린 것. 11/02~05 4건(합 0.90 USDT) 추가. BTCC 커미션 메일은 Gmail에 총 약 215건(추정치) — 11월 이전 분은 다음 회차에 월별로 합산해 옮김(종합소득세 2026년 귀속 매출 근거).
> 원화 환산: USDT는 받은 날 시세로 환산해야 함 — 이 장부는 원문 금액(USDT)만 적음. 출금 여부는 BTCC 지갑에서만 확인 가능(확인 필요).

## 2. 주간 합계

| 주(월~일) | 지출 — 사업(확인분) | 지출 — 미분류 | 매출(확인분) | 메모 |
|---|---|---|---|---|
| 11/09~11/15 | **USD 1.10** (ElevenLabs) | USD 49.34(Surfshark) + Agoda 항공 금액 미확인 | 0 | 광고비 0 |
| 11/16~11/22 | **0** (결제·구독 갱신·광고비 모두 0) | KRW 69,900 (Agoda 숙박 1박) | **USDT 0.91** (BTCC 0.34+0.57) | 신규 가입·입금 0 — 커미션은 기존 추천 이용자 거래분으로 보임 |

## 3. 월별·사업별 합계 (확인분)

| 월 | 사업 | 지출 | 매출 | 비고 |
|---|---|---|---|---|
| 2026-10 | 앱(QURATOR·체인브리프) | USD 25.00 | – | 애플코리아 KRW 129,000은 미분류 |
| 2026-11 (~22일) | 공통(영상·음성) | USD 56.10 (Hedra 55.00 + ElevenLabs 1.10) | – | |
| 2026-11 (~22일) | 체인브리프 | USD 8.75 | – | 도메인 |
| 2026-11 (~22일) | Perpline | USD 6.99 | USDT 1.81 (BTCC 6건, 11/23 정산분 포함) | 도메인 · 커미션 사업 구분은 Perpline으로 잡음(제휴 링크 소재지) |
| 2026-11 (~22일) | 광고(메타·Bitmedia) | 0 | – | 11/9 이후 꺼짐·동결 |
| **2026-11 사업 소계** | | **USD 71.84** | **USDT 1.81** | 미분류(USD 49.34 + KRW 69,900 + Agoda 항공 미확인)는 제외 |

## 4. 정기 구독 목록

| 서비스 | 사업 | 요금 | 주기 | 다음 결제일 | 출처/메모 |
|---|---|---|---|---|---|
| Hedra Pro | 공통(영상) | USD 55.00 (VAT 포함, ≈₩76,904) | 월 | **2026-12-02** | Hedra 영수증 #2993-8854. 줄일 후보 1순위 — 아래 메모 |
| ElevenLabs Starter | 공통(음성) | USD 6.60 예상(정가 6.00 + VAT 10%) | 월 | 2026-12-11 | 첫 달 $1 프로모. Toobit 업무 종료(11/21 LOG) 후 주 사용처 확인 필요 |
| Surfshark One | 미분류 | USD 49.34 (VAT 포함) | 15개월(12+3) | 2028-02 무렵 자동갱신(갱신가 확인 필요) | 영수증 11/11 |
| Porkbun perpline.tech | Perpline | 갱신 예상 USD 50.98 | 연 | 2027-11-05 | 첫해 $6.99 → 갱신가 7배 주의 |
| Porkbun chainbrief.app | 체인브리프 | 갱신 예상 USD 14.93 | 연 | 2027-11-05 | |
| Google AI Plus | 확인 필요 | 확인 필요 | 확인 필요 | 확인 필요 | Google One "Upcoming changes to your Google AI Plus subscription"(10/14) |
| Suno Pro | 트롯스테이지(곡 제작) | 확인 필요 | 확인 필요 | 확인 필요 | Gmail "Terms of service changes to your Pro subscription"으로 Pro 구독 확인. 영수증 메일 없음(결제가 앱스토어·다른 경로일 수 있음) |
| Claude 구독 | 공통 | 확인 필요 | 확인 필요 | 확인 필요 | Gmail에 영수증 메일 없음 — 결제 이메일이 다른 주소일 수 있음 |
| Savri | 그로스(아침 브리핑 지표 원천) | 0 (체험) | – | **체험 종료 약 11/30** | "8 days left of your Savri trial"(11/22) — 구독 없으면 자동 청구 없음, 종료 후 30일간 대시보드 열람 후 잠김 |
| Supermetrics | 그로스 | 0 (체험 11/14 종료) | – | – | 유료 전환 여부 세준 결정 대기(ORDERS 11/21) |
| Windsor.ai | 그로스 | 0 (체험, 11/17 "3 days remaining" → 약 11/20 종료) | – | – | "Your Windsor.ai trial is ending soon!" — 청구 메일 없음 |
| Metricool | 마케팅 | 0 (무료, 월 20건 한도 11/11 도달) | – | – | "[IMPORTANT] You have reached the monthly post limit of your FREE plan." |
| Supabase | 공통 | 0 (무료) | – | – | 'members' 프로젝트 일시정지 메일("…has been paused.") → 11/19 실무이사 Resume(ORDERS 11/19). 무료 플랜 7일 무활동 정지 반복 위험 |

월 고정비(확인분): Hedra 55.00 + ElevenLabs 6.60 ≈ **USD 61.60/월** (+ Google AI Plus·Claude 확인 필요)

### 금고지기 메모 — 비용 대비 매출 (11월 1~22일)
- 사업 지출 USD 71.84 vs 매출 USDT 1.81 → 매출이 지출의 약 2.5%.
- 12/02 Hedra 자동갱신(≈₩76,904)이 다음 최대 지출. 트롯스테이지 립싱크 영상 제작 도구(ops/trot/BRIEF.md "립싱크 영상 Hedra Pro") → 유지가 맞음. 그림비·연출아는 무료 도구만 사용.
- 줄일 후보는 12/07 11월 결산에서 3개 제안(ElevenLabs — Toobit 종료 후 사용처, 미분류 Surfshark 자동갱신 끄기 여부 등).
