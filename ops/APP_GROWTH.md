# 앱 성장 계획 — 출시 후 30일 (2026-11-02 작성, 앱 그로스 리드)

세준 지시(11/2 월요일 회의): "이번 주 앱 출시 후 애플·플레이스토어 가입자와 유료 결제자를 늘려라. 보고는 최소화."
범위: 성장(설치·가입·결제)만. 심사·빌드·제출은 '앱 전담 직원'(예약 작업, 매일 13:17 — TEAM.md의 '앱스토어 매니저')이 한다.

## 0. 지금 상태 (11/2 직접 확인)

| 앱 | 번들 / App Store ID | iOS 상태 (ops/asc-status.json 11/1 21:50Z) | 앱 안 계정 | 앱 안 결제 | 매출원 |
|---|---|---|---|---|---|
| CHAINBRIEF | com.chainbrief.app / 6829091321 | 1.3.0 WAITING_FOR_REVIEW | 없음 | 없음 | 없음(무료 뉴스, 앱엔 거래소 레퍼럴 없음) |
| QURATOR | kr.qurator.dailyart / 6829093287 | 1.0.0 WAITING_FOR_REVIEW (2.1 반려 후 재제출) | 없음 | 없음(가격·멤버 코드·웹 구독 안내 전부 뺌) | 웹 Daily Art 구독 월 ₩30,000(현재 계좌이체 + 카카오톡 멤버 링크, 토스 카드 자동결제는 '곧 오픈') |
| LUFT | kr.luft.store / 6829093001 | 1.0.0 PREPARE_FOR_SUBMISSION (토스 실결제 전 제출 금지) | 없음(비회원 주문) | 토스페이먼츠, 앱 안 브라우저의 사이트 결제 화면 | 실물 상품 |

로컬 빌드 + Playwright 390×844로 본 첫 화면(11/2):
- CHAINBRIEF: 첫 화면이 바로 Live Wire 속보 목록(온보딩·가입 없음). 아래 탭 Live/News/Markets/Listings/Saved. 좋음 — 첫 30초 안에 '뭘 하는 앱인지' 보임. 빠진 것: 푸시 알림(뉴스 앱 리텐션의 핵심), 위젯, 딥링크.
- QURATOR: 첫 화면이 웹 랜딩과 같은 히어로("작품 앞에서, 한 번의 scan.") + '오늘의 작품 보기'. 앱 사용자는 이미 설치했는데 마케팅 히어로를 한 번 더 넘겨야 오늘의 작품이 나온다. 푸시·딥링크 없음. 사이트 히어로 문구에 "앱 설치 없이"가 있어 앱 출시 후엔 문구 정리 필요(웹팀 몫, 제안).
- LUFT: 첫 화면이 상품(서울 컬렉션) 중심, 아래 탭 홈/샵/장바구니/고객센터. 비회원 주문이라 가입 마찰 없음. 재방문 장치(알림·카카오 채널 친구) 없음.
- 세 앱 모두 '가입'이라는 단계가 없다. 그래서 이 계획의 '가입자'는 아래처럼 정의한다(억지로 회원가입을 만들지 않는다 — 마찰만 늘고 4.0/5.1.1 위험).
  - CHAINBRIEF: 설치 → 활성(첫날 기사 1개 이상 열람) → 알림 동의(푸시 도입 후) → 텔레그램 채널 참여
  - QURATOR: 설치 → 활성(오늘의 작품 재생 또는 QR 스캔) → 알림 동의 → **유료 구독**(아래 2장 결정 후)
  - LUFT: 설치 → 활성(상품 상세 2개 이상) → 장바구니 → **첫 주문**

## 1. 결제 규정 판단 (QURATOR 유료 전환을 앱에서 어떻게?)

### 확인한 규정 (원문 출처)
1. **애플 3.1.1**: 앱 안에서 디지털 콘텐츠·구독을 잠금 해제하려면 인앱결제(IAP)를 써야 한다. 앱 안에서 다른 결제 수단으로 안내(버튼·링크·문구)하는 것은 미국 스토어 외에는 금지. 미국 스토어만 2025-05 개정으로 버튼·외부 링크 허용(“Apps on the United States storefront are not prohibited from including buttons, external links, or other calls to action”) — [Michael Tsai 정리(가이드라인 원문 인용)](https://mjtsai.com/blog/2025/05/02/app-review-guidelines-updated-for-epic-anti-steering), [9to5Mac](https://9to5mac.com/2025/05/01/apple-app-store-guidelines-external-links/). QURATOR는 한국 스토어 중심이라 해당 없음.
2. **애플 3.1.3(b) 멀티플랫폼**: 웹에서 산 구독을 앱에서 열어 주려면 같은 것을 앱 안 IAP로도 팔아야 한다(“provided those items are also available as in-app purchases within the app”) — [Apple Developer Forums 인용](https://developer.apple.com/forums/thread/825551). 그래서 지금 앱은 멤버 잠금 해제를 아예 뺐다(app/README 근거와 일치).
3. **리더 앱(3.1.3(a)) + External Link Account Entitlement**: 잡지·신문·책·오디오·음악·비디오가 '주 기능'인 앱만 대상, 로그인 필요, 이 권한을 쓰면 IAP를 같이 못 판다, 링크는 기본 브라우저로·가격 문구 금지 — [Apple: Distributing reader apps](https://developer.apple.com/support/reader-apps). Daily Art는 '교육·QR 도슨트'로 등록돼 있고 계정 기능도 없어 해당 여부가 불확실 → 지금은 쓰지 않는다.
4. **한국 대체결제(StoreKit External Purchase Entitlement, KR)**: 한국 스토어 전용 '별도 바이너리'만 가능, 수수료 26%, IAP와 같은 앱에 못 넣음, 이미 출시된 번들 ID는 신청 불가(“the bundle ID must not yet be published”), 승인 PSP에 토스 포함 — [Apple: third-party payment provider in South Korea](https://developer.apple.com/support/storekit-external-entitlement-kr). QURATOR는 이번 주 출시되면 번들이 '이미 출시'가 되고, 26%는 아래 IAP 15%보다 비싸다 → 쓰지 않는다.
5. **애플 소규모 사업자 프로그램**: 연 매출 100만 달러 미만 개발자는 IAP 수수료 15% — [TechCrunch(애플 발표)](https://techcrunch.com/2020/11/18/apple-to-reduce-app-store-fees-for-small-businesses-with-under-1-million-in-revenues), [RevenueCat](https://revenuecat.com/blog/engineering/small-business-program). 신청은 세준이 App Store Connect에서(계정 보유자).
6. **앱 밖 커뮤니케이션**: 2021년 개정 이후 개발자가 앱 밖(이메일 등)에서 자기 사용자에게 다른 결제 방법을 알리는 것은 허용 — [9to5Mac 2021](https://9to5mac.com/2021/10/22/app-store-guidelines-class-action-lawsuit-update/), [MacRumors](https://www.macrumors.com/2021/10/22/app-store-review-guidelines-october-2021/?Bibblio_source=true). 단, 앱 안에서 '웹 구독 안내용' 이메일을 모으는 흐름은 반려 사례가 있어([Spotify 반려 정리](https://mjtsai.com/blog/?p=37488)) 하지 않는다.
7. **구글 플레이**: 결제 없는 '소비 전용(consumption-only)' 앱은 유료 서비스의 일부여도 허용(“Google Play allows any app to be consumption-only, even if it is part of a paid service”), 앱 안에서 다른 결제로 유도·링크는 금지(앱 밖 소통은 자유) — [Play 결제 정책 FAQ](https://support.google.com/googleplay/android-developer/answer/10281818). 한국 사용자에게는 Play 결제와 함께 대체결제를 붙일 수 있고 수수료가 4% 줄어든다 — [Play: 한국 대체결제](https://support.google.com/googleplay/android-developer/answer/11222040). QURATOR TWA의 '멤버 코드로 열기'(가격 표시 없음)는 소비 전용 범위.

### 결정
- **이번 출시(1.0.x)**: 지금처럼 '무료 열람 앱' 유지. 앱 안에 가격·구독·웹 안내 문구를 넣지 않는다(스토어 문구 포함 — growth 브랜치 문구도 이 원칙으로 씀). 앱 = 설치·습관 만드는 깔때기, 돈은 웹에서.
- **유료 전환은 앱 밖에서**: 웹(사이트·인스타·블로그·카카오 채널)에서 구독 안내. 앱 사용자를 웹 결제로 돌리는 장치는 앱 안에 두지 않는다.
- **QURATOR 1.1(출시 2~3주차 목표)**: **IAP 자동갱신 구독 도입**(소규모 사업자 15%). 그러면 3.1.3(b)에 따라 웹 멤버도 앱에서 '멤버 코드로 열기'(복원)가 가능해지고, 앱 안 페이월·무료 체험을 쓸 수 있다. 가격·상품 구성은 세준 결정(아래 6장).
- **안드로이드**: TWA는 소비 전용 유지. 앱 안 판매가 필요해지면 Play Billing(+ 한국 대체결제 선택) — 1.1 이후 검토.
- LUFT는 실물 상품이라 IAP 대상 아님(가이드라인 3.1.3(e) 실물 상품 — app/README·심사 메모와 같음). CHAINBRIEF는 무료·결제 없음 유지.

## 2. ASO (스토어 문구) — growth/aso-20261102 브랜치에 커밋 완료

원칙: 이름+부제+키워드에 같은 단어를 반복하지 않음(애플은 셋을 합쳐 색인). 다른 앱·회사 상표를 키워드에 넣지 않음(2.3.7). 사실만(앱에 없는 '알림' 같은 기능 약속 금지).

### CHAINBRIEF (en-US · zh-Hans — 체인브리프는 한국 시장 홍보 금지 규칙에 따라 ko 현지화는 만들지 않음)
| | 지금 | 개선안 |
|---|---|---|
| 이름 | CHAINBRIEF | CHAINBRIEF: Crypto News |
| 부제 | Crypto news, briefed fast | Bitcoin news, listings, prices |
| 키워드(93/100) | crypto,bitcoin,news,… | ethereum,btc,eth,xrp,solana,altcoin,coin,blockchain,defi,etf,stablecoin,web3,headlines,market |
| 설명 첫 3줄 | 기능 소개로 시작 | Crypto news, briefed fast. Breaking headlines, new exchange listings and short, sourced analysis in one calm feed. / Free to read. No account, no sign-up. / English, 中文 and 한국어 editions, light and dark themes. |
| zh 이름·부제 | CHAINBRIEF / 加密快讯，一眼读懂 | CHAINBRIEF: 加密货币快讯 / 比特币新闻·上币公告·实时行情 |

첫 3장 스크린샷 문구(다음 스크린샷 갱신 때 — 앱 전담 직원 몫):
1. "Crypto news, briefed fast" — Live Wire 화면 / 加密快讯，一眼读懂
2. "New listings across major exchanges" — Listings 화면 / 各大交易所新上币，一处看全
3. "Read now, save for later — offline" — Saved 화면 / 收藏文章，离线也能读

### QURATOR (ko + en-US 신규)
| | 지금 | 개선안 |
|---|---|---|
| 이름 | QURATOR — Daily Art | QURATOR: 오늘의 명화·QR 도슨트 |
| 부제 | QR 도슨트 · 오늘의 명작과 영어 해설 | 매일 한 점, 음성 해설과 영어 표현 |
| 키워드 | 미술,도슨트,QR,… (이름·부제와 중복 多) | 미술,그림,미술관,전시,작품,오디오가이드,미술사,영어공부,교양,갤러리,화가,모네,김홍도,박물관,명작 |
| 설명 첫 3줄 | 작품 옆 QR… | 하루 한 점, 미술사가 고른 명작을 도슨트 음성으로 듣고 오늘의 영어 표현까지 익혀 보세요. / 전시장에서는 작품 옆 QURATOR QR을 찍으면 해설이 텍스트와 음성으로 바로 열립니다. / 회원가입 없이 바로 시작합니다. |
| en-US | 없음 | QURATOR: Daily Art & QR Guide / A masterpiece a day, narrated (앱 화면이 KO·EN 지원) |

첫 3장 스크린샷 문구: ① "하루 한 점, 명작이 도착합니다"(오늘의 작품) ② "작품 옆 QR, 찍으면 해설이 열려요"(QR 스캔) ③ "도슨트 음성 + 오늘의 영어 표현"(감상 모드 자막). EN: ① "One masterpiece a day" ② "Scan the QR, hear the story" ③ "Narration + an English expression".

### LUFT (ko)
| | 지금 | 개선안 |
|---|---|---|
| 이름 | LUFT | LUFT: 내 이름 새기는 폰케이스 |
| 부제 | 서울 컬렉션 · 내 이름을 새기는 케이스 | 한국 유산 문양 아이폰 케이스 |
| 키워드 | 폰케이스,아이폰케이스,각인,… | 각인,커스텀,낙관,이니셜,달항아리,일월오봉,청자,자개,나전,단청,기념품,선물,여행용품,공항,주문제작 |
| 설명 첫 3줄 | 가볍게 떠나는 일상… | 내 이름을 낙관으로 새긴, 하나뿐인 아이폰 케이스. / 일월오봉·달항아리·청자 같은 한국 유산 모티프를 국내에서 한 개씩 주문 제작해 2~4영업일 안에 보내드립니다. / 회원가입 없이 바로 주문, 전 상품 무료배송. |

첫 3장 스크린샷 문구: ① "내 이름을 낙관으로 새긴 케이스" ② "일월오봉·달항아리·청자 — 서울 컬렉션 7종" ③ "국내 제작 2~4일 · 전 상품 무료배송".
주의: 한국어 키워드는 글자 수 55자 안팎으로 잡았다. ASC가 바이트로 세서 sync가 '키워드 길이' 오류를 내면 뒤에서부터 지운다.

### 경쟁 앱 비교 (App Store 페이지 직접 확인, 11/2)
| 앱 | 경쟁 앱 | 이름·부제 | 배울 점 |
|---|---|---|---|
| CHAINBRIEF | [코인니스 라이브](https://apps.apple.com/kr/app/%EC%BD%94%EC%9D%B8%EB%8B%88%EC%8A%A4-%EB%9D%BC%EC%9D%B4%EB%B8%8C/id6759036281) | 뉴스 카테고리, 평점 2.9(10개), 광고·추적 데이터 있음 | 우리 강점 = 추적·광고 SDK 없음. 개인정보 라벨 '수집 안 함'을 문구에 활용 |
| | [Cointelegraph](https://apps.apple.com/us/app/cointelegraph-crypto-news/id1640089162) | 부제 "Live Bitcoin & Ethereum prices", 금융 카테고리 | 부제에 '가격'을 넣어 검색 의도를 잡음 → 우리 부제에 prices 반영 |
| | [NS3](https://apps.apple.com/kr/app/ns3-%EC%BD%94%EC%9D%B8%EB%89%B4%EC%8A%A4-%EC%88%9C%EC%9C%84-by-ai/id6572281552) | 부제가 키워드 나열(가상화폐, 암호화폐, 테더, Bitcoin, BTC), 푸시 알림을 핵심 기능으로 | 뉴스 앱 리텐션 = 푸시. 4장 '푸시' 항목 근거 |
| QURATOR | [DailyArt](https://apps.apple.com/us/app/dailyart/id547982045) | "#1 app to learn about art history", 무료 + Premium 구독, 푸시·위젯·24개 언어, 에디터 추천 | 하루 한 점 + 푸시 + 위젯 + 프리미엄 구독 모델이 이 시장의 표준 → 1.1 IAP·푸시 근거 |
| | [Daily art history and modern](https://apps.apple.com/us/app/daily-art-history-and-modern/id6739500834) | 주간·연간·평생 구독 여러 개(페이지에 USD 0.99/주, 39.99/년, 9.99 평생 등 표시) | 연간 상품을 앞에 두는 구성이 흔함. 리뷰에 '복원 버튼 찾기 어려움' 불만 → 복원 버튼을 잘 보이게 |
| | [Smartify](https://apps.apple.com/us/app/smartify-arts-and-culture/id1102736524) | 작품 스캔 → 오디오 해설, 미술관 제휴 | QR·스캔 도슨트는 미술관 B2B와 같이 크는 모델 → 갤러리 영업과 앱 설치를 묶기 |
| LUFT | [CASETiFY](https://apps.apple.com/us/app/casetify/id577363344?l=ko) | 부제 "폰케이스 & 테크 액세서리 쇼핑하기", 평점 4.7(6.9만), '앱 전용 혜택·조기 출시·알림 센터' | 앱 설치 이유 = 앱 전용 혜택 + 신상 드롭 알림. 3장 LUFT 항목 근거 |
| | [아이디어스](https://apps.apple.com/kr/app/%EC%95%84%EC%9D%B4%EB%94%94%EC%96%B4%EC%8A%A4-idus/id872469884) | 핸드메이드 플랫폼, 리뷰에 '작가와 소통'이 가치 | 각인·주문 제작은 '사람이 만든다'는 이야기가 팔림 → 상세·스크린샷에 제작 과정 |

## 3. 가입(활성) 늘리기

### 첫 30초 (앱 전담 직원이 다음 빌드에 넣을 것 — 바이너리 변경은 승인 후)
- CHAINBRIEF: 지금 구조 유지(바로 속보). 첫 실행 1회만 상단 얇은 안내 "탭 하나로 저장, 오프라인에서도 읽기". 언어 자동 선택이 기기 언어와 맞는지 확인.
- QURATOR: **앱에서는 첫 화면을 '오늘의 작품'으로**(마케팅 히어로 건너뛰기, 앱 모드에서만). 첫 실행 카드 2장 이하: ① 오늘의 작품 ▶ 재생 ② 전시장에선 오른쪽 위 QR 버튼. 회원가입·이메일 요구 없음.
- LUFT: 첫 화면 유지. 상품 상세에서 '낙관 미리보기'를 첫 화면 가까이(제작 체험이 구매 이유).

### 푸시 알림 동의 타이밍 (세 앱 모두 지금 푸시 없음 → 2~3주차 기능 추가)
- 시스템 권한 창을 첫 실행에 바로 띄우지 않는다. 가치를 본 뒤 '미리 묻기' 카드 → 동의 시에만 iOS 권한 창.
  - CHAINBRIEF: 기사 2개 읽었거나 저장 1회 후 "큰 속보·신규 상장만 하루 3번 이내로 알려드릴까요?"
  - QURATOR: 오늘의 작품을 끝까지 들은 직후 "내일 아침 8시에 새 작품이 오면 알려드릴까요?"
  - LUFT: 첫 주문 완료 화면에서 "제작·배송 상태를 알림으로 받을까요?"(주문 알림 = 동의율이 가장 높은 지점)
- 구현: Capacitor Push Notifications + APNs(FCM 경유). 서버 발송은 기존 GitHub Actions 크론에서. 마케팅성 알림은 4.5.4 기준(동의·끄기 제공).

### 가입·이메일 마찰
- 세 앱 모두 계정 없이 핵심 기능이 돈다 → **강제 가입 도입 금지**. 계정이 필요한 건 QURATOR IAP 이후 '복원' 정도이며 IAP 자체 복원(StoreKit)으로 해결.
- LUFT 비회원 주문 유지. 재구매 장치는 카카오톡 채널 친구 추가(주문 완료 화면, 앱 밖) — 마케팅 매니저 몫.

### 웹·SNS에서 앱 설치 유도 (준비 완료, 꺼져 있음)
- 스마트 앱 배너: `<meta name="apple-itunes-app" content="app-id=…">` — 아이폰 사파리가 애플 기본 배너를 띄움. 체인브리프(빌드 템플릿 build.mjs·build-intl.mjs), QURATOR index.html, LUFT index.html에 추가.
- 공용 설치 바 `chainbrief/public/app-install.js`: 사파리 배너가 안 뜨는 곳(카카오톡·인스타·텔레그램·페북 인앱 브라우저, iOS 크롬, 안드로이드)용 하단 바. 사이트별 고정 하단 UI(탭바·텔레그램 버튼) 위로 자동 배치, 닫으면 14일 숨김, 앱 안·TWA에서는 안 뜸, QURATOR 결제·가격 화면과 웹 멤버에게는 안 뜸, LUFT 장바구니·결제 화면 제외. 클릭은 GA4 이벤트 `app_install_view / click / dismiss`.
  - 스위치: 파일 맨 위 `LIVE.<앱>.ios / android`(지금 전부 false). 미리보기: 주소 뒤 `?appbanner=1`.
  - App Store 캠페인 추적: 파일의 `PT`(ASC 공급자 토큰)를 채우면 `?pt=…&ct=<앱>-<유입처>` 로 App Analytics '캠페인'에 잡힘. 플레이는 `referrer=utm_…`.
- 체인브리프 상단의 기존 'App 설치'(PWA) 버튼은 LIVE가 켜지면 스토어 링크로 바뀜.
- 네트워크 배너(network.js): 출시 후 각 앱 카드에 'App Store' 작은 라벨 추가는 2주차(전략 회의 제안 — network.js는 전 사이트 공용이라 별도 검토).
- 텔레그램: @chainbrief_global·@chainbrief_cn 고정 메시지에 iOS 링크(출시 당일, 텔레그램 그로스 매니저). 인스타·블로그: QURATOR 오후 마케팅팀·LUFT 마케팅 매니저가 출시 소식 콘텐츠 1세트씩(링크는 apps.apple.com/app/id…).

### 딥링크 (3~4주차, 바이너리 변경 — 앱 전담 직원)
- 현재 세 앱 모두 `appUrlOpen`/유니버설 링크 처리 없음. 
- 1단계: 커스텀 스킴(chainbrief:// · qurator:// · luft://) + `App.addListener('appUrlOpen')`로 기사·작품·상품 화면 열기. 스마트 앱 배너에 `app-argument=<현재 URL>` 추가.
- 2단계: 유니버설 링크 — `https://probe2928-crypto.github.io/.well-known/apple-app-site-association` (probe2928-crypto.github.io 저장소, 이미 assetlinks.json 운영 중) + Associated Domains 권한. QURATOR QR이 사이트 주소라 **QR 스캔 → 앱이 있으면 앱에서 바로 열림**이 가장 큰 효과.

## 4. 유료 전환 — QURATOR

- 1.0.x(지금): 앱 안 결제 없음. 전환은 웹: 사이트 '오늘의 작품' → 멤버 전용 해설 미리보기 → 구독(웹). 앱 사용자는 앱 밖 채널(인스타·블로그·카카오 채널)에서 웹 구독 소식을 접하게 한다.
- 1.1(IAP) 설계안 — **가격은 세준 결정**, 아래는 구조만:
  - 상품: 월간 + 연간(연간을 기본 선택으로, '2개월분 무료' 수준 할인), 같은 구독 그룹.
  - 무료 체험: 애플 '도입 혜택(Introductory Offer)' 7일 무료 — 신규 구독자 1회.
  - 페이월 위치: (a) 무료 작품 감상을 끝까지 들은 직후 '멤버 전용 해설 이어 듣기' (b) 지난 작품 아카이브 3주 이후 (c) 설정 > 멤버십. 첫 실행 직후 페이월은 두지 않는다(첫 30초는 가치 체험).
  - 필수: 복원 버튼(눈에 띄게 — 경쟁 앱 리뷰 불만), 약관·개인정보 링크, 자동갱신 고지(3.1.2), '멤버 코드로 열기'(웹 멤버, 3.1.3(b)).
  - 웹 구독자와 같은 멤버십으로 맞추기(코드 발급 서버 공유).
- 연 매출 100만 달러 미만 → 소규모 사업자 프로그램 15%(세준 신청).

## 5. 측정 — 어디서 보나

| 단계 | CHAINBRIEF | QURATOR | LUFT | 도구 |
|---|---|---|---|---|
| 스토어 노출·페이지 조회·설치 | ✓ | ✓ | ✓ | App Store Connect > 앱 분석(노출·제품 페이지 조회·전환율·첫 다운로드·출처 'App Store 검색/웹 추천/앱 참조/캠페인') |
| 웹→설치 클릭 | ✓ | ✓ | ✓ | GA4 속성 263527390 이벤트 `app_install_click`(사이트 경로별) + Savri(network.js가 로드, 사이트 site_mvvy2a4d_govfksp) |
| 캠페인별 설치 | ✓ | ✓ | ✓ | ASC 캠페인 링크(pt·ct) — PT 채우면 |
| 활성·리텐션 | ✓ | ✓ | ✓ | ASC 앱 분석 '세션·활성 기기·리텐션'(사용자가 분석 공유에 동의한 기기만 — 앱에 분석 SDK 없음) |
| 알림 동의 | (푸시 후) | (푸시 후) | (푸시 후) | 서버 토큰 수 |
| 구독 | – | ✓ | – | 지금: 웹 멤버 장부(계좌이체·카카오 수동 발급), 토스 빌링 켜지면 토스 대시보드, IAP 후 ASC '구독' 리포트 |
| 주문 | – | – | ✓ | 토스페이먼츠 대시보드 + LUFT 주문 기록 |
| 안드로이드 | Play 출시 전 | Play Console 통계(비공개 테스트) | Play 출시 전 | Play Console |

### 주간 숫자 표 (앱 전담 직원이 매주 일요일 갱신 — 확인 못 한 칸은 '미확인', 지어내기 금지)
| 주(월~일) | CB 노출 | CB 첫 다운로드 | Q 노출 | Q 첫 다운로드 | Q 웹 구독(신규) | L 노출 | L 첫 다운로드 | L 앱 주문 | 웹→설치 클릭(GA4) | 메모 |
|---|---|---|---|---|---|---|---|---|---|---|
| 11/03~11/09 | | | | | | | | | | 출시 주 |
| 11/10~11/16 | | | | | | | | | | |
| 11/17~11/23 | | | | | | | | | | |
| 11/24~11/30 | | | | | | | | | | |

## 6. 적용 순서 (앱 전담 직원 = TEAM.md '앱스토어 매니저'가 실행)

앱별로, **그 앱이 READY_FOR_SALE이 된 뒤에만**. 심사 중(WAITING_FOR_REVIEW·IN_REVIEW)인 앱의 메타데이터는 sync하지 않는다.

1. **스토어 문구** (chainbrief 저장소 `growth/aso-20261102` 브랜치 → main)
   - 해당 앱의 `store/asc/<앱>.json`만 main에 가져온다: `git checkout origin/growth/aso-20261102 -- store/asc/<앱>.json` (다른 앱 파일은 그 앱이 출시될 때). review.notes는 main 최신을 유지(문구 블록 locales만 바꿈 — 충돌 시 main의 review 유지).
   - 출시된 버전은 문구를 못 바꾼다 → **다음 버전(예: QURATOR 1.0.1, CHAINBRIEF 1.3.1) 빌드가 올라간 뒤의 sync에서 적용**된다(이름·부제는 앱 정보, 설명·키워드·프로모션은 새 버전에 들어감). QURATOR는 이미 대기 중인 'a. 1.0.0 승인 → 1.0.1 빌드 → sync → submit' 흐름의 sync 전에 병합하면 된다.
   - LUFT: luft.json의 문구는 첫 제출 전에 적용해도 된다(아직 심사 전 — PREPARE_FOR_SUBMISSION, submit:false 유지). 단 토스 실결제 전 제출 금지 규칙은 그대로.
   - sync 결과 `ops/asc-status.json` errors에 키워드 길이 오류가 있으면 한국어 키워드를 뒤에서부터 줄여 다시 sync.
2. **설치 유도** (각 앱 출시 후)
   - (a) chainbrief `growth/aso-20261102`의 `public/app-install.js`, `scripts/build.mjs`, `scripts/build-intl.mjs`를 main에 병합(첫 앱 출시 때 한 번). 이때 `LIVE.<출시된 앱>.ios = true`. 
   - (b) QURATOR 출시 → qurator `growth/app-install-20261102` 병합(+ sw.js 캐시 번호 +1, index.html ?v= 규칙 따름), LIVE.qurator.ios = true.
   - (c) LUFT 출시 → luft `growth/app-install-20261102` 병합, LIVE.luft.ios = true.
   - 안드로이드는 Play 공개 출시(비공개 테스트 아님) 때 `android: true`.
   - 병합 후 Playwright 390×844로 `?appbanner=1` 미리보기 확인, 사이트 결제·장바구니 화면에 안 뜨는지 확인.
3. 출시 당일: 텔레그램 고정 메시지·인스타 출시 소식은 각 담당(아래 7장)에게 ops/LOG.md로 넘김.

## 7. 30일 주차별 할 일과 담당

| 주 | 할 일 | 담당(예약 작업) |
|---|---|---|
| 1주 (11/3~9) 출시 | 승인된 앱부터 6장 적용 순서 1·2 실행, 출시 링크 1줄 보고 | 앱 전담 직원 · 아이폰·갤럭시 심사·업데이트·고도화 (13:17) |
| | 텔레그램 채널 고정 메시지에 iOS 링크(EN·ZH) | 텔레그램 그로스 매니저 (월·목 15:07) |
| | 출시 소식 인스타 캐러셀·블로그 1세트(QURATOR) — 앱 링크, 가격 언급 금지 | QURATOR 오후 마케팅·영업팀 (14:37) |
| | 출시 소식 인스타 1세트(LUFT, 출시 후) | LUFT 팀③ 저녁 마케팅 매니저 (18:53) |
| | GA4 `app_install_*` 이벤트 수집 확인, 숫자 표 첫 행 | 그로스 애널리스트 (08:57) |
| | ASC 공급자 토큰(PT) 확인 요청 → app-install.js에 반영 | 세준 → 앱 전담 직원 |
| 2주 (11/10~16) | QURATOR 앱 첫 화면 = 오늘의 작품(앱 모드), 첫 실행 카드 | 앱 전담 직원 (화·금 QURATOR 회차) |
| | 스크린샷 첫 3장 문구 교체(2장 문구), 다음 버전에 반영 | 앱 전담 직원 |
| | 경쟁 앱 키워드 순위 점검(체인브리프·QURATOR 주요 키워드 5개) | 그로스 애널리스트 (월요일 OpenSEO/TinyFish 회차) |
| | 갤러리 B2B 제안서에 'QR → 앱' 문구 추가 | QURATOR 오후 마케팅·영업팀 |
| 3주 (11/17~23) | QURATOR 1.1: IAP 구독(세준이 상품·가격 만든 뒤) + 페이월 + 복원 + 멤버 코드 | 앱 전담 직원 |
| | 푸시 1차(QURATOR 내일 작품 알림, CHAINBRIEF 큰 속보) — 미리 묻기 카드 | 앱 전담 직원 |
| | 규정 재확인(3.1.x·Play 결제 정책 변경 여부) | 법무·규정 담당 (금 16:17) |
| 4주 (11/24~30) | 딥링크 1단계(커스텀 스킴 + app-argument) → 유니버설 링크 준비 | 앱 전담 직원 |
| | 30일 회고: 퍼널 표로 병목 1개 → 12월 계획 | 5개 팀 전략 회의 (월·수·금 16:47) |

## 8. 세준이 할 일 (손이 꼭 필요한 것만)
1. App Store Connect > 앱 내 구입 > **QURATOR 자동갱신 구독 상품 만들기**(월간·연간 가격 결정, 7일 무료 체험 여부) — 3주차 IAP 개발 전에.
2. App Store Connect에서 **소규모 사업자 프로그램 신청**(수수료 15%), 그리고 App Analytics > 캠페인 링크 화면의 **공급자 토큰(pt)** 확인해서 알려주기(설치 유입 추적용).

## 메모 (위험·확인 필요)
- QURATOR iOS 앱은 network.js(자매 사이트 배너: CHAINBRIEF·BLOCKKEY 등)를 앱 안에서도 불러온다(index.html 조건이 q-play-app만 제외). 교육 앱 안에 코인 사이트 링크 — 결제 규정 문제는 아니지만 심사·브랜드 측면에서 앱 전담 직원이 다음 빌드 때 q-store-app도 제외할지 판단 권장.
- QURATOR 웹 히어로 "앱 설치 없이" 문구는 앱 출시 후 웹팀이 정리 제안.
- 스마트 앱 배너(애플 기본)는 페이지별로 끌 수 없어 QURATOR 결제 화면에도 사파리 배너는 보일 수 있다(설치 바는 안 뜸).
