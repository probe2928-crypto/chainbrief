# 체인브리프 앱 (iOS · 안드로이드)

Capacitor 네이티브 앱. 화면은 `www/`에 들어 있고(사이트를 감싼 웹뷰가 아님), 내용은 사이트가 빌드할 때 만드는 JSON 피드에서 받아와요.
- 피드: `api/<ko|en|zh>/feed.json` (속보·기사 목록), `api/<lang>/a/<id>.json` (기사 본문), `api/config.json` (코인·광고·텔레그램), `listings.json`
- 탭: 속보 · 기사 · 상장 · 시세 · 저장(설정 포함). 기사 리더, 저장(오프라인), 공유, 당겨서 새로고침, KO/EN/中文, 라이트/다크, 안드로이드 뒤로가기
- 폰트는 `www/fonts`에 포함 (OFL 라이선스)
- 로컬 미리보기: `npm run build` 후 `cp -r app/www dist/_app` → `http://localhost:4321/_app/?api=http://localhost:4321/`

## 자동 빌드 (Actions → 앱 빌드)
- **안드로이드 테스트 APK**: 고정 테스트 키(`debug.keystore`)로 서명 → Releases `android-latest`. 새 버전은 덮어 설치.
- **출시용 APK + Play 스토어용 AAB**: 저장소 Secrets에 아래 4개가 있으면 같이 만들어져요.
  `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
- **iOS**: 맥 서버에서 빌드 확인 (서명은 Apple Developer 계정이 생기면 추가)

## 스토어 출시에 필요한 것 (본인 계정)
| | 비용 | 하는 일 |
|---|---|---|
| Google Play 개발자 계정 | 1회 $25 | 본인 인증 → AAB 업로드. 신규 개인 계정은 테스터 12명·14일 비공개 테스트 후 정식 출시 |
| Apple Developer Program | 연 $99 | 인증서·프로비저닝 → TestFlight → 심사 |

개인정보처리방침: 사이트 `/privacy/`
