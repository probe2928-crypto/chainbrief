# 텔레그램 그로스 (체인브리프 EN·ZH 채널)

목표: 2026-11-30까지 @chainbrief_global + @chainbrief_cn 합계 5,000명 (10/31 시작 4명 → 하루 약 166.5명 직선). 한국어 채널은 목표 밖. 월·목 주 2회 점검.

## 진도표

| 시각(KST) | EN | ZH | 합계 | 지난 회차 대비 | 목표선 | 차이 | 이 속도면 11/30 | 메모 |
|---|---|---|---|---|---|---|---|---|
| 2026-10-31 22:00 | 2 | 2 | 4 | – | 4 | 0 | – | 시작 |
| 2026-11-02 15:13 | 3 | 3 | 6 | +2 (첫 회차, 시작 대비) | 380 | -374 | 약 38 | tg-admin count 수동 실행값. KO 7(목표 밖) |
| 2026-11-09 10:21 | 4 | 3 | 7 | +1 (EN +1, 11/07) | 1,418 | -1,411 | 약 15 | tg-members.json 11/09 01:21 UTC 자동 기록. KO 6(목표 밖) |
| 2026-11-13 15:10 | 4 | 3 | 7 | 0 | 2,116 | -2,109 | 약 11 | tg-members.json 11/13 01:21 UTC 기록. 11/07 이후 6일째 변화 없음. 남은 17.4일 필요 속도 하루 약 287명. KO 6 |
| 2026-11-16 15:10 | 4 | 3 | 7 | 0 | 2,582 | -2,575 | 약 10 | tg-members.json 11/16 01:35 UTC 기록. 11/07 이후 9일째 변화 없음. 남은 14.6일 필요 속도 하루 약 343명. KO 6 |
| 2026-11-20 15:10 | 4 | 3 | 7 | 0 | 약 3,278 | 약 -3,271 | 약 9 | tg-members.json 11/20 01:21 UTC 기록. 11/07 이후 13일째 변화 없음. 남은 10.4일 필요 속도 하루 약 482명. KO 6. 목요일(11/19) 회차가 돌지 않아 금요일에 목요일 몫 수행 |
| 2026-11-23 15:10 | 4 | 3 | 7 | 0 | 약 3,776 | 약 -3,769 | 약 8 | tg-members.json 11/22 13:11 UTC 기록(11/23 기록 아직 없음). 11/07 이후 16일째 변화 없음. 남은 7.4일 필요 속도 하루 약 678명. KO 6 |

## 원인 기록

- 2026-11-02: +2(EN+1·ZH+1). 확인된 유입 경로 없음. 후보 — 11/01 X 칼럼 스레드 마지막 글 텔레그램 안내(17:50 KST), 메타 광고 텔레그램 직행 전환(애널리스트 11/02 일지). 사이트 t.me 클릭은 GA에 이벤트가 없어 측정 불가였음 → 이번 회차에 tg_join 이벤트 추가. 메타 광고 숫자는 Adspirer 이번 달 호출 한도 소진(11/24 리셋)으로 못 봄. 페북 페이지는 11/01~02 '페이지로 전환' 상태가 아니라 게시 건너뜀(보드 posts_*). t.me/s 조회수 페이지는 열지 못해 생략. 세준 컴퓨터 미연결로 SNS 브라우저 점검 건너뜀.
- 2026-11-09: +1(EN, 11/07 15:21 UTC 기록에서 3→4). 원인 확인 못 함. GA4 tg_join은 '주요 이벤트'가 아니어서 OpenSEO 조회(주요 이벤트만)로는 0행 — 위치별 클릭 미확인. 체인브리프 11/08 방문 108명 중 Bitmedia 배너 29세션·telegram/channel 1세션(metrics.json). 메타 광고는 Adspirer 한도(11/24 리셋)로 못 봄. t.me/s 페이지는 WebFetch 권한 대기 초과로 생략. 세준 컴퓨터 미연결로 SNS 브라우저 점검 건너뜀.

- 2026-11-13: 0(11/09 이후 변화 없음). 원인 분석 대상 없음. 세준 컴퓨터 미연결로 SNS 브라우저 점검 건너뜀.
- 2026-11-16: 0. 유입 경로가 사실상 끊김 — 메타·Bitmedia 광고 꺼짐(잔액 $0.25, 리포터 11/16), 보드 SNS 게시 기록 11/10 이후 없음, GA 11/15 속성 전체 9명(사이트 분리 불가). t.me/s 조회수는 이번 세션에 웹 열람 도구가 없어 생략. 세준 컴퓨터 미연결로 SNS 브라우저 점검 건너뜀. 판단: 유입(광고·SNS) 없이는 채널 쪽 개선만으로 숫자가 안 움직임.

- 2026-11-20 (주간 정리 11/13~11/20): 증가 0 · 원인 없음 · 비용 0(메타·Bitmedia 광고 꺼진 상태 유지, 지출 확인된 것 없음). ops/metrics.json 체인브리프 방문 11/13 11명·11/16 10명·11/18 8명으로 감소, 텔레그램 클릭 별도 숫자 없음. t.me/s 조회수·세준 컴퓨터(SNS 브라우저) 이번 회차 미연결로 생략.
- 2026-11-23: 0. 원인 분석 대상 없음. ops/metrics.json 체인브리프 11/22 방문 0·11/21 미집계, 텔레그램 클릭 숫자 없음. 광고 꺼진 상태 유지(재무팀 11/16~22 광고비 0). t.me/s 조회수는 웹 열람 도구가 없어 생략. 세준 컴퓨터 미연결로 SNS 브라우저 점검 건너뜀.

## 실험 기록

| 날짜 | 무엇 | 어디 | 커밋 | 판단 기준 |
|---|---|---|---|---|
| 2026-11-02 | EN·ZH 사이트 구독 안내 문구를 '상장 알림(바이낸스·OKX·바이비트·코인베이스) + 속보 + 데일리 5개 브리프'로 통일(기존: 속보·해설). 채널 소개글·환영 글 약속과 맞춤 | scripts/tgchan.mjs | main a91cced | 다음 회차 tg_join 클릭 수·구독 증가 |
| 2026-11-02 | 모든 t.me 링크 클릭을 GA4 이벤트 `tg_join`(placement: topline·rail·card·inline·float·slide·footer·contact / channel / page_lang)으로 기록 | scripts/lib.mjs gaSnippet | main a91cced | 위치별 클릭 비교 → 약한 위치 정리 |
| 2026-11-09 | 폰 EN·ZH 텔레그램 떠있는 버튼을 아이콘 원 → 'Free alerts / 免费快讯' 글자 알약으로(KO 문의 버튼 그대로). 광고 유입 첫 화면에서 무엇인지 보이게 | public/style.css | main 9ff1c35 | tg_join placement=float 클릭(GA 직접 조회 필요)·다음 회차 EN·ZH 증가 |
| 2026-11-16 | EN·ZH 속보·기사 게시물 버튼에 '↗️ Share with a friend / 分享给朋友' 추가 — 기사 링크(utm_medium=share)+채널 주소를 한 번에 전달. 기존 구독자 1명이 퍼뜨릴 때 받는 쪽이 채널로 들어오게 | scripts/post-telegram.mjs | main b969f67 | GA utm_source=telegram / utm_medium=share 세션 수·EN·ZH 증가 |
| 2026-11-23 | EN·ZH 속보·기사 게시물에 코인 캐시태그($STRK 등, 상장·경고 자동 글 파일 이름·분류·tickers에서 최대 3개)와 글 끝 채널 서명(📡 @chainbrief_global · free listing alerts & breaking news / 免费上币提醒与快讯) 추가. 텔레그램 앱 캐시태그 검색 노출 + 복사·캡처 확산 때 주소 동반 | scripts/post-telegram.mjs | main 5c3289a | 다음 회차 EN·ZH 증가, 게시물 조회수(t.me/s 열람 가능 시) |

## 파트너 후보 (목요일 회차에 채움, 제안은 세준 OK 후)

| 채널 | 언어 | 구독자 | 성격 | 출처 | 상태 |
|---|---|---|---|---|---|
| @listingcryptocoin | EN | 미확인(페이지에 숫자 없음) | 거래소 상장 알림(바이낸스·코인베이스·쿠코인·업비트 등) — 우리 '상장 알림'과 가장 가까움 | telegramadsanalytics.com/channels/listingcryptocoin (11/13 열람, 7/16 갱신 자료) | 구독자 수 확인 필요 |
| @newlistingsfeed | EN | 미확인 | 상장 알림 피드($GEOD 업비트·$AEON OKX 등), 봇 홍보 | telegramadsanalytics.com/channels/newlistingsfeed (7/27 갱신) | 구독자 수 확인 필요 |
| @binance_okx_news | EN | 미확인 | 거래소 소식·상장·프로모션 모음, 시그널 아님 | tgmetrics.org/channels/binance_okx_news (7/28 갱신) | 구독자 수 확인 필요 |
| (제외) @crpt_headlines | EN | 124,690(6월) | 뉴스+유료 시그널 홍보 | telemetr.io | 3만 초과·시그널 → 제외 |
| (제외) @crypto_news778 | EN | 82,052 | 뉴스+트레이딩 광고 | tgadsspy.com | 3만 초과 → 제외 |
| (제외) @freenewcoinlisting·@crypt_buzz·@crypto_showcase_en | EN | 미확인 | 샤일링·외환 브로커 협찬·제휴 링크 많음 | tgmetrics·tgstat | 성격 안 맞음 → 제외 |

중국어 후보 (11/20 추가):

| 채널 | 언어 | 구독자 | 성격 | 출처 | 상태 |
|---|---|---|---|---|---|
| @btcnewsdaily (币圈快讯) | ZH | 5,073 | 중국어 코인 속보 | github.com/rooktwo/rectg '新闻快讯' 표 (11/20 열람) | 1순위 — 규모가 우리와 가장 가까움, 제안 초안 ZH 사용 |
| @wublock (吴说区块链 新闻与深度) | ZH | 15,667 | 중국어 블록체인 뉴스·심층 | 같은 출처 | 2순위 — 규모 차가 커서 소개 교환으로만 |
| @NewsCoinSpace (币讯)·@telonews_cn·@bitvoice·@biquan321 | ZH | 미확인 | 코인 뉴스 | github.com/chfgd/rectg (숫자 없음) | 구독자 수 확인 필요 |
| (제외) @theblockbeats | ZH | 38,257 | 뉴스 | rooktwo/rectg | 3만 초과 → 제외 |

(11/13엔 0건 — tgstat.ru 열람 실패. 11/20에도 tgstat.ru는 열리지 않음.)

### 디렉터리 등록 후보 (11/20)

- **rectg 중국어 텔레그램 목록** (github.com/rooktwo/rectg, 534개 채널·22개 분류, 구독자 수 표시). 등록 방법: GitHub 이슈 템플릿 `channel-submission.md`('提交收录'). '新闻快讯' 또는 '加密货币' 분류에 @chainbrief_cn 등록 신청 가능. **외부 게시라 세준 OK 후 제출.** 신청 초안:

> 频道：@chainbrief_cn（ChainBrief 链报）
> 分类：加密货币 / 新闻快讯
> 简介：免费中文加密快讯频道——交易所上币提醒（币安、OKX、Bybit、Coinbase）、突发新闻、每日五条简报。不发交易信号，不做付费推广。

솔직한 판단: 우리 채널 합계 7명이라 '구독자 맞교환'은 상대가 받을 이유가 약하다. 초안은 맞교환 대신 '상대 상장 알림을 우리 사이트(chainbrief 영어·중국어 페이지)에서 소개 + 상대 채널에 우리 한 줄 소개'의 콘텐츠 교환으로 썼다. 보내기는 세준 OK 후.

### 제안 초안 (EN, 미발송)

> Hi — I run ChainBrief (@chainbrief_global), a free English channel with exchange listing alerts (Binance, OKX, Bybit, Coinbase), breaking news and a daily 5-story brief. We're new and small, so a straight sub-for-sub wouldn't be fair to you. Instead: we'd feature your channel in the "Telegram channels we read" box on our English site, and in return you'd post one short intro line about ChainBrief whenever it suits you. No payment, no paid promo, no signals on our side. Interested?

### 제안 초안 (ZH, 미발송)

> 您好，我们是 ChainBrief 链报（@chainbrief_cn），免费中文频道，提供交易所上币快讯（币安、OKX、Bybit、Coinbase）、突发新闻和每日五条简报。我们刚起步、订阅还少，直接互推对您不公平。我们的提议是：在我们中文网站的“推荐频道”栏介绍您的频道，作为交换，您方便时发一条简短介绍。不涉及付费推广，我们也不发交易信号。有兴趣吗？

