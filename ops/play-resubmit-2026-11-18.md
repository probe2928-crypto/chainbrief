# 체인브리프 앱 구글 플레이 재제출 — 세준이 할 일 (2026-11-18)

앱: CHAINBRIEF — Crypto News (`app.chainbrief`)
거부: 2026-11-17 17:50 메일, 버전 코드 22, '뉴스 및 잡지' 정책 — 웹사이트와 앱 안에 찾기 쉬운 '문의하기' 페이지(이메일·전화)가 없음, 스토어 등록정보 연락처에 웹사이트 링크 필요, 뉴스 앱 선언 양식의 연락처 URL 업데이트 필요. 텔레그램 같은 SNS는 연락처로 안 쳐줌.

## 이미 해 둔 것 (Claude)
- 사이트: 문의하기 페이지 3개 언어 — 이메일·텔레그램·정정/제보 방법·발행 정보, 메뉴와 꼬리말에 '문의하기' 링크 (main b2e3950, 배포 성공)
  - 한국어 https://chainbrief.app/contact/
  - English https://chainbrief.app/en/contact/
  - 中文 https://chainbrief.app/zh/contact/
- 앱 1.3.2 (빌드 24 = 버전 코드 24): 하단 탭에 글자로 된 **'문의하기 / Contact us / 联系我们'** 탭 추가 → 이메일·웹 문의 페이지·텔레그램·정정 방법·발행 정보 화면. 머리줄 봉투 아이콘, '저장' 탭 맨 위 문의 섹션도 그대로 있음. 앱에 거래소 레퍼럴 없음.
- 빌드 결과: GitHub → Releases → `android-latest` → **chainbrief-playstore-unsigned.aab** (서명 전 AAB)
  - 저장소 Secrets에 안드로이드 업로드 키(`ANDROID_KEYSTORE_B64`)가 없어서 서명된 AAB는 자동으로 안 나옴. 22번을 올릴 때 쓴 업로드 키로 세준 컴퓨터에서 서명해야 함(아래 1단계).
  - 문의 이메일: probe2928@gmail.com (사이트 설정 `site.config.json` email 에 이미 공개돼 쓰이던 주소)

## 세준이 할 일 (순서대로, 약 15분)

### 1. AAB 서명 (세준 컴퓨터)
1. https://github.com/probe2928-crypto/chainbrief/releases/tag/android-latest 에서 `chainbrief-playstore-unsigned.aab` 다운로드 (제목에 'v1.3.2 (빌드 24)' 확인)
2. 22번 올릴 때 쓴 업로드 키(.jks / .keystore)로 서명. 터미널:
   ```
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore <업로드키파일.jks> chainbrief-playstore-unsigned.aab upload
   ```
   (별칭이 `upload`가 아니면 그 별칭으로. 비밀번호는 직접 입력 — 채팅에 붙이지 말 것)
3. 파일 이름을 `chainbrief-1.3.2-24.aab` 로 바꿔 두기
- 다음부터 자동 서명 원하면: 저장소 Settings → Secrets → `ANDROID_KEYSTORE_B64`(키 파일 base64), `ANDROID_KEYSTORE_PASSWORD` 2개 넣으면 Actions가 서명된 `chainbrief-playstore.aab`를 바로 만듦.

### 2. 스토어 등록정보 연락처 (Play Console → 체인브리프 → 성장 → 스토어 등록정보 → 기본 스토어 등록정보 / 또는 '스토어 설정' → 스토어 등록정보 연락처 세부정보)
| 항목 | 입력값 |
|---|---|
| 이메일 주소 | probe2928@gmail.com |
| 웹사이트 | https://chainbrief.app/ |
| 전화번호(선택) | 비워 둬도 됨 (넣으려면 +82 10-9129-5086) |
→ 저장

### 3. 뉴스 앱 선언 (Play Console → 정책 및 프로그램 → 앱 콘텐츠 → '뉴스 앱' → 관리/수정)
- 뉴스 앱인가요? → **예**
- 연락처 정보 URL → **https://chainbrief.app/en/contact/** (한국어 우선이면 https://chainbrief.app/contact/ — 둘 다 이메일 있음)
- 구독/멤버십 필요 여부 → 아니요 (전부 무료)
- 기사 출처: 편집국 기명 기사 + 속보마다 원문 출처 표시
→ 저장

### 4. 새 AAB 업로드 (테스트 및 출시 → 22번을 올렸던 트랙(비공개 테스트 또는 프로덕션) → 새 버전 만들기)
1. `chainbrief-1.3.2-24.aab` 업로드 (버전 코드 24, 버전 이름 1.3.2 로 보이면 정상)
2. 출시 노트(ko-KR): `문의하기 탭 추가 — 이메일·웹 문의 페이지·정정 요청 방법을 앱 안에서 바로 볼 수 있어요.`
   출시 노트(en-US): `New Contact us tab — email, web contact page and how to request corrections, right inside the app.`
3. 다음 → 저장 → **게시 개요**에서 '검토를 위해 변경사항 전송'

### 5. (선택) 검토 메모
게시 개요에서 메모 칸이 있으면:
`Contact us: in-app bottom tab "Contact us" (email probe2928@gmail.com, web contact page, corrections). Website contact page: https://chainbrief.app/en/contact/ . Store listing website and email updated.`

## 확인
- 심사 결과 메일(probe2928@gmail.com, 'Google Play')은 보통 1~7일. 또 거부되면 첨부 스크린샷 이름과 버전 코드를 LOG에 남길 것.
- iOS 빌드는 이번 실행(앱 빌드 #24)에서 macOS 러너가 잡히지 않아 취소됨 — 플레이 재제출과 무관, 다음 앱 변경 때 다시 확인.
