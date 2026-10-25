# 체인브리프 앱 (iOS · 안드로이드)

Capacitor로 사이트를 감싼 네이티브 앱이에요. 앱은 항상 최신 사이트를 불러와서, 사이트를 고치면 앱도 바로 바뀌어요 (스토어 재심사 불필요).

## 자동 빌드
`app/` 폴더를 고치거나 GitHub **Actions → 앱 빌드 → Run workflow**를 누르면:
- **안드로이드**: 테스트용 APK가 만들어져 저장소 **Releases → android-latest** 에 올라가요. 폰에서 받아 바로 설치할 수 있어요.
- **iOS**: 맥 서버에서 빌드가 되는지 확인까지 해요 (시뮬레이터용).

## 스토어 출시에 필요한 것 (본인 계정)
| | 비용 | 하는 일 |
|---|---|---|
| Google Play 개발자 계정 | 1회 $25 | 서명 키 생성 → AAB 업로드 |
| Apple Developer Program | 연 $99 | 앱 서명 인증서 발급 → TestFlight → 심사 |

계정이 생기면 서명 키를 저장소 Secrets에 넣고, 워크플로에 출시용 빌드 단계를 추가하면 돼요.

## 설정
- `capacitor.config.json` → `server.url`: 도메인 연결 후 새 주소로 바꾸기
- `resources/`: 아이콘·스플래시 원본 (1024px)
