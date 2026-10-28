# 체인브리프 앱 (iOS · 안드로이드)

Capacitor 네이티브 앱. 화면은 `www/`에 들어 있고(사이트를 감싼 웹뷰가 아님), 내용은 사이트가 빌드할 때 만드는 JSON 피드에서 받아와요.
- 피드: `api/<ko|en|zh>/feed.json` (속보·기사 목록), `api/<lang>/a/<id>.json` (기사 본문), `api/config.json` (코인·광고·텔레그램), `listings.json`
- 탭: 속보 · 기사 · 상장 · 시세 · 저장(설정 포함). 기사 리더, 저장(오프라인), 공유, 당겨서 새로고침, KO/EN/中文, 라이트/다크, 안드로이드 뒤로가기
- 폰트는 `www/fonts`에 포함 (OFL 라이선스)
- 로컬 미리보기: `npm run build` 후 `cp -r app/www dist/_app` → `http://localhost:4321/_app/?api=http://localhost:4321/`

## 자동 빌드 (Actions → 앱 빌드)
- **안드로이드 테스트 APK**: 고정 테스트 키(`debug.keystore`)로 서명 → Releases `android-latest`. 새 버전은 덮어 설치.
- **출시용 APK + Play 스토어용 AAB**: Secrets `ANDROID_KEYSTORE_B64` + `ANDROID_KEYSTORE_PASSWORD` 2개면 돼요 (별칭 `upload`, 키 비밀번호 = 키스토어 비밀번호. `ANDROID_KEY_ALIAS`/`ANDROID_KEY_PASSWORD`로 덮어쓸 수 있음)
- **iOS**: Secrets `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `APPLE_TEAM_ID`가 있으면 서명 빌드 → App Store Connect(TestFlight) 자동 업로드. 없으면 시뮬레이터용 빌드 확인만. iPhone 전용(TARGETED_DEVICE_FAMILY=1)
- v1.2: Capacitor 8 (Android 타깃 SDK 36, Xcode 26), 앱 이름 CHAINBRIEF, 기본 언어 영어, 앱에는 거래소 레퍼럴 광고 없음
- 스토어 이미지: `store/` (iPhone 1320×2868 ×6, Play 1080×1920 ×6, 피처 그래픽 1024×500, 아이콘)

## 스토어 출시에 필요한 것 (본인 계정)
| | 비용 | 하는 일 |
|---|---|---|
| Google Play 개발자 계정 | 1회 $25 | 본인 인증 → AAB 업로드. 신규 개인 계정은 테스터 12명·14일 비공개 테스트 후 정식 출시 |
| Apple Developer Program | 연 $99 | 인증서·프로비저닝 → TestFlight → 심사 |

개인정보처리방침: 사이트 `/privacy/`
