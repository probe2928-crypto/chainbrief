# 회원가입·로그인 켜기 — 세준이 할 일 (2026-11-02)

개발을 몰라도 되게 화면 순서대로 적었어요. 계정 만들기·키 넣기는 AI가 대신할 수 없어서 세준이 직접 해야 해요.
다 끝나면 **Project URL 과 anon(공개) 키 두 개만** 실무이사에게 주면, 나머지(사이트 연결·약관 공개)는 실무이사가 해요.

| 순서 | 할 일 | 예상 시간 | 꼭 필요? |
|---|---|---|---|
| ① | Supabase 가입·프로젝트(서울) 만들기, SQL 한 번 실행 | 20분 | 필수 |
| ② | 구글 로그인 (Google Cloud) | 20분 | 필수 |
| ③ | 카카오 로그인 (카카오 디벨로퍼스) + 비즈 앱·채널 | 30분 (+채널 심사 며칠) | 필수 |
| ④ | 애플 로그인 (Apple Developer, 연 99달러) | 40분 | 앱스토어 앱이 있으면 필수, 웹만이면 선택 |
| ⑤ | 이메일 발송 설정(SMTP) | 15분 | 가입자가 늘기 전 필수 |
| ⑥ | 네이버 로그인 | 20분 | 2단계(나중) |
| 합계 | ①②③⑤ 만 하면 **약 1시간 30분**, ④까지 2시간 10분 | | |

> **절대 공유하지 말 것:** Supabase `service_role` 키(또는 `sb_secret_…`), DB 비밀번호, 구글·카카오·애플의 Client Secret, 애플 `.p8` 파일.
> 이것들은 Supabase 대시보드 칸에만 직접 붙여 넣어요. 채팅·텔레그램·메일·저장소에 올리면 안 돼요.
> 실무이사에게 줘도 되는 건 **Project URL** 과 **anon(=publishable) 키** 두 개뿐이에요(원래 공개용 키).

---

## ① Supabase (로그인 서버) — 20분

1. https://supabase.com → **Start your project** → GitHub 계정(probe2928-crypto)으로 가입.
2. **New project**
   - Organization: 기본값
   - Name: `members` (아무거나)
   - Database Password: **Generate a password** → 비밀번호 관리 앱에 저장(공유 금지)
   - **Region: Northeast Asia (Seoul)** ← 꼭 서울. (서울 `ap-northeast-2` 리전이 있음 — 근거: https://supabase.com/docs/guides/platform/regions)
   - Plan: Free → **Create new project** (1~2분 기다림)
3. 왼쪽 메뉴 **SQL Editor** → **New query** → 저장소 `chainbrief/ops/auth/schema.sql` 내용을 전부 복사해 붙여 넣기 → **Run**. "Success" 가 나오면 끝(한 번만).
4. 왼쪽 **Project Settings → API Keys**(또는 **Data API**)
   - **Project URL**: `https://xxxxxxxx.supabase.co` 형태 → 복사
   - **anon public** 키(새 화면에선 **Publishable key**, `sb_publishable_…`) → 복사
   - `service_role` / `Secret key` 는 **복사하지 않기**
5. 왼쪽 **Authentication → URL Configuration**
   - **Site URL**: `https://probe2928-crypto.github.io/qurator/`
   - **Redirect URLs** → **Add URL** → `https://probe2928-crypto.github.io/**` (별 두 개까지 그대로). 나중에 자체 도메인이 생기면 그 주소도 `https://도메인/**` 로 추가.
6. 이 화면에서 보이는 **콜백 주소**를 메모해 두세요. ②~④에서 계속 씁니다.
   **`https://<프로젝트ID>.supabase.co/auth/v1/callback`**
   (`<프로젝트ID>` = Project URL 의 `https://` 와 `.supabase.co` 사이 글자. 예: URL이 `https://abcd1234.supabase.co` 면 콜백은 `https://abcd1234.supabase.co/auth/v1/callback`)
7. **Authentication → Sign In / Providers → Email**: Enable 켜짐 확인, **Confirm email** 켜짐 유지.

> 무료 플랜 참고: 활성 프로젝트 2개까지, 1주일 넘게 아무 요청이 없으면 일시정지될 수 있어요(대시보드에서 Restore). 그래서 다섯 사이트를 **프로젝트 하나**로 묶었어요.

---

## ② 구글 로그인 — 20분

1. https://console.cloud.google.com → 위쪽 프로젝트 선택 → **새 프로젝트** → 이름 `members-login` → 만들기.
2. 왼쪽 메뉴 **API 및 서비스 → OAuth 동의 화면**(새 화면은 **Google 인증 플랫폼 → 브랜딩**)
   - 앱 이름: `QURATOR` 처럼 대표 브랜드 하나(사용자가 보게 됨), 사용자 지원 이메일: probe2928@gmail.com
   - 대상(User type): **외부(External)**
   - 승인된 도메인: `github.io` 는 넣을 수 없으니 비워 두고, `supabase.co` 를 넣어요. (자체 도메인 생기면 그 도메인 추가)
   - 범위(Scopes): `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` 세 개만
   - 게시 상태: **앱 게시(프로덕션으로 푸시)** — 테스트 상태로 두면 등록한 테스트 사용자만 로그인돼요.
3. **사용자 인증 정보(클라이언트) → + 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **웹 애플리케이션**
   - 승인된 JavaScript 원본: `https://probe2928-crypto.github.io`
   - **승인된 리디렉션 URI: `https://<프로젝트ID>.supabase.co/auth/v1/callback`**
   - 만들기 → **클라이언트 ID**·**클라이언트 보안 비밀번호** 가 나옴
4. Supabase **Authentication → Sign In / Providers → Google** → Enable → Client ID·Client Secret 붙여 넣기 → **Save**.

---

## ③ 카카오 로그인 — 30분 (+ 비즈니스 채널 심사)

1. https://developers.kakao.com → 카카오 계정으로 로그인 → **내 애플리케이션 → 애플리케이션 추가하기**
   - 앱 이름 `QURATOR`(대표 브랜드), 회사명: 사업자 상호, 카테고리 선택 → 저장.
2. **앱 설정 → 앱 → 플랫폼 키**: **REST API 키** = Supabase 의 *Kakao Client ID*.
   REST API 키를 눌러 **카카오 로그인 Client Secret** 코드를 만들고 **활성화** = *Kakao Client Secret*.
3. 같은 REST API 키 화면 → **카카오 로그인 리다이렉트 URI** → **`https://<프로젝트ID>.supabase.co/auth/v1/callback`** → 저장.
4. **제품 설정 → 카카오 로그인 → 일반**: 사용 설정 **ON**.
5. **비즈 앱 전환(이메일을 받으려면 필수)**: **앱 설정 → 앱 → 일반 → 비즈니스 정보**에 사업자 정보(사업자등록번호) 입력 → 비즈 앱 전환(별도 심사 없음).
   - 근거: 이메일(`account_email`) 동의항목은 **비즈 앱에서만** 설정 가능 — https://supabase.com/docs/guides/auth/social-login/auth-kakao , https://developers.kakao.com/docs/latest/ko/kakaosync/prerequisite
   - 개인 개발자용 '개인 비즈 앱'도 있지만, 마케팅(카카오톡 채널)까지 쓰려면 **사업자 비즈 앱**이 맞아요.
6. **제품 설정 → 카카오 로그인 → 동의항목**
   - 닉네임(`profile_nickname`): 필수 동의
   - 프로필 사진(`profile_image`): 선택 동의(안 써도 됨)
   - **카카오계정(이메일)(`account_email`)**: **필수 동의** — 목적: "회원 식별 및 로그인, 공지 발송"
   - **카카오톡 채널 추가 상태 및 내역(`plusfriends`)**: 선택 동의 — ⑦단계 채널 연결 후 나타남
7. **카카오톡 채널 + 카카오싱크(채널 추가·간편가입)** — 카톡 마케팅을 하려면
   1. https://center-pf.kakao.com (카카오톡 채널 관리자센터) → 새 채널 만들기(예: `QURATOR`) → **비즈니스 채널 신청**(사업자등록증, 심사 1~3일).
   2. 디벨로퍼스 **앱 설정 → 앱 → 카카오톡 채널** → 채널 **연결** → 연결 심사(앱·채널 사업자번호가 같아야 함) → **대표 채널 지정**. 지정하지 않으면 동의 화면에 '채널 추가'가 안 나와요.
   3. **추가 기능 신청 → 카카오싱크** 신청(비즈 앱+채널 연결 앱은 비즈니스 정보 심사 자동 승인).
   4. **카카오 로그인 → 간편가입**: 서비스 약관 등록(제목·URL·태그) → 활성화.
      - 이용약관 URL: 각 사이트 약관 주소(예: `https://probe2928-crypto.github.io/qurator/#/policy/terms`), 태그 `terms`
      - 개인정보 수집·이용 URL, 태그 `privacy`
      - 마케팅 수신은 사이트 가입 화면에서 채널별로 따로 받으므로 카카오 약관에는 넣지 않아도 돼요.
   5. 채널 추가는 사용자가 고르는 **선택** 항목이에요. 채널을 추가해도 그것만으로 광고 수신 동의가 되진 않아요(사이트의 [선택] 카카오톡 수신 동의가 따로 필요).
   - 근거: https://developers.kakao.com/docs/latest/ko/kakaosync/prerequisite , https://developers.kakao.com/docs/latest/ko/kakaosync/faq
8. Supabase **Authentication → Sign In / Providers → Kakao** → Enable → Client ID(REST API 키)·Client Secret → **Save**.
   비즈 앱 전환 전이라면 **Allow users without an email** 을 켜야 로그인 오류(KOE205)가 안 나요(대신 이메일 없는 회원이 생김).
9. 카카오 정책: 개인정보처리방침에 카카오에서 받는 정보 처리 내용을 적고, **회원 탈퇴 시 '연결 끊기(unlink)' API 호출**이 필요해요 → 2단계에서 실무이사가 Supabase Edge Function 으로 붙임(카카오 **Admin 키**를 Supabase Secrets 에 세준이 직접 입력).

---

## ④ 애플 로그인 — 40분 (Apple Developer 유료 계정 필요)

언제 필요? **아이폰 앱(App Store)에 구글·카카오 로그인을 넣으면** Apple 가이드라인 4.8 때문에 Sign in with Apple(또는 같은 조건의 로그인)을 함께 넣어야 해요. 웹사이트만이면 선택.

1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles**. 오른쪽 위 **Team ID**(10자리) 메모.
2. **Identifiers → + → App IDs → App** → Description `Members`, Bundle ID `com.qurator.app`(이미 iOS 앱 ID가 있으면 그걸 사용) → Capabilities 에서 **Sign in with Apple** 체크 → 저장.
3. **Identifiers → + → Services IDs** → Description `Members Web`, Identifier `com.qurator.web` → 저장 → 다시 열어 **Sign in with Apple** 체크 → **Configure**
   - Primary App ID: 2번 App ID
   - Domains and Subdomains: **`<프로젝트ID>.supabase.co`**
   - **Return URLs: `https://<프로젝트ID>.supabase.co/auth/v1/callback`**
   - (주의) 애플 안내상 **한국 개발자는 새 Services ID 등록 시 서버 간 알림(Server-to-Server Notification) 주소를 요구**할 수 있어요. 칸이 필수로 나오면 저장을 멈추고 실무이사에게 알려 주세요(알림을 받을 Edge Function 주소를 만들어 드림). 근거: https://developer.apple.com/support/offering-account-deletion-in-your-app
4. **Keys → +** → 이름 `SIWA`, **Sign in with Apple** 체크 → Configure 에서 2번 App ID → 저장 → **Download** → `AuthKey_XXXXXXXXXX.p8` (한 번만 받을 수 있음, 공유 금지). Key ID 메모.
5. Supabase 문서의 **시크릿 생성 도구**(https://supabase.com/docs/guides/auth/social-login/auth-apple → "Generate a client secret") 를 **크롬**에서 열고 Team ID·Key ID·Services ID·.p8 파일 → 생성된 긴 문자열 복사. (사파리에선 안 됨)
6. Supabase **Providers → Apple** → Enable → **Client IDs**: `com.qurator.web`(Services ID) → **Secret Key**: 5번 문자열 → Save.
7. **6개월마다** 5번을 다시 해서 Secret Key 를 바꿔야 해요(애플 규칙). 실무이사가 만료 2주 전 알림 예약을 걸어 둘게요.

---

## ⑤ 이메일 발송(SMTP) — 15분

Supabase 기본 메일은 시간당 발송 수가 아주 적어서(테스트용) 실제 가입이 생기면 메일 링크가 안 갈 수 있어요.
- 추천: Resend(https://resend.com, 무료 플랜 있음 — 한도는 가입 시 확인) 가입 → 도메인 인증(자체 도메인 필요) → SMTP 정보 → Supabase **Authentication → Emails → SMTP Settings** 에 입력.
- 자체 도메인이 아직 없으면: 이메일 로그인은 잠시 '구글·카카오 위주'로 두고, 도메인 연결 후 켜요.
- 처리위탁 고지: 발송 업체를 정하면 개인정보처리방침 '처리 위탁' 표의 '추후 고지' 칸에 업체명을 넣어야 해요(실무이사가 반영).

---

## ⑥ 네이버 로그인 — 2단계

Supabase 가 네이버를 기본 지원하지 않아서 실무이사가 Edge Function(작은 서버 함수)을 만든 뒤 켜요. 그때 세준이 할 일:
1. https://developers.naver.com → Application → 애플리케이션 등록 → 사용 API **네아로(네이버 로그인)** → 제공 정보: 이메일(필수), 별명(선택)
2. 서비스 환경 **PC 웹** → 서비스 URL `https://probe2928-crypto.github.io`, **Callback URL: `https://<프로젝트ID>.supabase.co/functions/v1/naver-callback`** (2단계 함수 주소 — 함수 만든 뒤 확정)
3. Client ID·Client Secret 을 Supabase **Edge Functions → Secrets** 에 직접 입력(`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`).
4. 검수 요청(네이버가 로그인 화면 캡처를 요구) — 1~3 영업일.

---

## 다 끝나면

1. 실무이사에게 **Project URL** 과 **anon(publishable) 키** 를 보내기 (이 두 개는 공개돼도 괜찮은 키 — 보안은 DB의 RLS 규칙이 지켜요).
2. 실무이사가 하는 일 (키 투입일 = 공개일):
   - 각 저장소 `auth-config.js`(QURATOR·Perpline·LUFT·인생준준)와 chainbrief `site.config.json → auth` 에 두 값 입력
   - `auth/legal-2026-11-02` 브랜치(약관·개인정보처리방침 '회원' 조항)를 같은 날 main 에 병합
   - 테스트 계정으로 가입 → 마케팅 토글 → 탈퇴까지 확인 후, Supabase 에서 테스트 계정 삭제
3. 앱 심사 메모
   - **Google Play(QURATOR 앱)**: 계정 만들기가 있으면 Play Console **데이터 보안 → 계정 삭제 URL** 등록 필요 → 사이트의 '내 계정 → 회원 탈퇴' 화면 주소를 넣으면 돼요.
   - **App Store**: 앱 안에 탈퇴 버튼 필수(가이드라인 5.1.1(v)) — 이미 '내 계정 → 회원 탈퇴'에 있음. 애플 로그인 회원 탈퇴 시 애플 토큰 철회(REST API)는 2단계 Edge Function 에서 처리.

## 사이트별 설정 파일

| 사이트 | 파일 | 로그인 방법 |
|---|---|---|
| QURATOR | `qurator/auth-config.js` | 구글·카카오·애플·이메일 |
| Perpline | `perpline/auth-config.js` | 구글·애플·이메일 (영문, 카카오 제외) |
| LUFT | `luft/auth-config.js` | 구글·카카오·애플·이메일 (비회원 주문 유지) |
| 인생준준 | `lifejunjun/auth-config.js` | 카카오·구글·애플·이메일 |
| 체인브리프 | `chainbrief/site.config.json` 의 `auth` | 구글·카카오·애플·이메일 |

네이버 버튼: `"naver": "hidden"`(숨김) → `"soon"`(준비 중 표시) → 2단계 함수 주소(켜짐).
공용 모듈: `chainbrief/public/auth/auth.js`, DB: `chainbrief/ops/auth/schema.sql`.
