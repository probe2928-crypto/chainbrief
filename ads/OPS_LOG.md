## 2026-11-23 새벽 점검
- 밤새봄: Actions 24시간 — chainbrief·perpline·luft·qurator·oriel·blockkey 미해결 실패 0. 관찰 1건: chainbrief '빌드 및 배포' 마지막 성공이 16:31Z라 점검 시각(18:18Z) 기준 1시간 넘게 공백(GitHub 15분 cron 지연으로 추정, 진행 중·실패 실행 없음, 푸시 배포는 정상). 고침 0.
- 속보 신선도(저장소 커밋 기준): KO 01:31 KST, EN·ZH 21:34 KST. 라이브 사이트 직접 열람은 프록시 403·WebFetch 권한 시간 초과로 못 함(미확인). firstbrick·lifejunjun·yeobaek는 권한 밖 미확인.
- 예약 작업 전 페이지: FAILED 0, device_absent 0.

## 2026-11-22 새벽 점검
- 이상 없음(Actions 24시간 실패 0: chainbrief 빌드 및 배포 15분 주기 정상, perpline·luft·qurator·oriel·blockkey 성공). 예약 작업 전수 실패 0, device_absent 0.
- 못 본 것: 라이브 사이트 직접 열람(프록시 403·WebFetch 권한 시간 초과), lifejunjun·yeobaek·firstbrick 저장소(권한 없음).

## 2026-11-21 새벽 점검
- 이상 없음(Actions 24시간: 체인브리프 빌드 및 배포 28회 실패 0, perpline·luft·qurator 성공). 예약 작업 실패 0, device_absent 0.
- 못 본 것: 라이브 사이트 직접 열람(프록시 403·WebFetch 권한 시간 초과), lifejunjun·yeobaek·firstbrick 저장소(권한 없음/조회 불가).

## 2026-11-20 새벽 점검
- 이상 없음(Actions 24시간: 체인브리프 keep-alive 1회 실패 후 자동 복구, 나머지 성공). 예약 작업 31개 실패 0.
- 못 본 것: 라이브 사이트 직접 열람(프록시·권한 막힘), lifejunjun·yeobaek 저장소(접근 권한 없음).

## 2026-11-18 새벽 점검 (시스템 엔지니어 2회차)
- 밤새봄: Actions 24시간 — chainbrief 'supabase-keepalive' 1건 실패(회원 서버 DNS 조회 실패, 코드로 못 고침, 재실행 안 함). 나머지 저장소 빌드 정상.
- 라이브: 프록시 차단으로 사이트 직접 확인 못 함(미확인). firstbrick·lifejunjun·yeobaek는 권한 밖이라 미확인.
- 예약 작업: FAILED 0. 장애 1 · 고침 0 — 세준 Supabase members Restore 필요.

## 2026-11-18 새벽 점검
- 밤새봄: Actions 24시간 — '빌드 및 배포' 실패 0(마지막 성공 17:53Z, 15분 주기 유지). 앱 빌드(app.yml) iOS가 러너 대기로 취소돼 1회 재실행, 현재 대기 중(안드로이드 성공). qurator 안드로이드 실패는 이후 성공으로 해소.
- 라이브: 프록시 차단으로 사이트 직접 fetch 불가 → 봇 커밋 17:54Z로 간접 확인만(직접 응답 미확인).
- 예약 작업: FAILED 0 · device_absent 0. 장애 1(앱 iOS) · 고침 0(재실행만).

## 2026-11-17 새벽 점검
- 밤새봄: Actions 24시간 — 체인브리프 '빌드 및 배포' 실패 0(마지막 성공 17:44Z), perpline·qurator의 cancelled는 동시 실행 정리, luft·blockkey·oriel 실패 0. firstbrick·lifejunjun·yeobaek는 권한 밖이라 미확인.
- 라이브: 프록시 차단으로 직접 fetch 불가 → 저장소로 대체 확인(봇 커밋 17:45Z, KO 속보 01:36 KST, EN 21:41, ZH 21:40 모두 12시간 이내). 사이트 직접 응답은 확인 못 함.
- 예약 작업: FAILED 0. 장애 0 · 고침 0.

## 2026-11-16 새벽 점검
- 밤새봄: Actions 24시간 — 체인브리프 '빌드 및 배포' 30회 실패 0(마지막 성공 18:00Z), perpline·luft·qurator 실패 0. firstbrick·lifejunjun·yeobaek는 권한 밖이라 미확인.
- 라이브: 프록시 차단으로 직접 fetch 불가 → 저장소로 대체 확인(봇 커밋 18:00Z, KO 속보 01:31 KST, EN 21:34, ZH 21:32 신선). lifejunjun.com 등 직접 미확인.
- 예약 작업: FAILED 0, 금고지기(CFO) 11/9 ABANDONED 유지. 장애 0 · 고침 0.

## 2026-11-15 새벽 점검
- 밤새봄: Actions 24시간 — 체인브리프 '빌드 및 배포' 28회 실패 0(마지막 성공 18:05Z), perpline·luft·qurator 실패 0. firstbrick·lifejunjun·yeobaek는 권한 밖이라 미확인.
- 라이브: 체인브리프 KO 속보 01:32 KST 신선, perpline·luft·qurator 데이터와 oriel·blockkey·yeobaek 응답 확인. lifejunjun.com은 fetch 불가로 미확인.
- 예약 작업: FAILED 0, 금고지기(CFO) 11/9 ABANDONED 유지. 장애 0 · 고침 0.

## 2026-11-14 새벽 점검
- GitHub Actions 24시간: 체인브리프 '빌드 및 배포' 정상(마지막 성공 17:36Z), perpline·luft·qurator·oriel·blockkey 실패 없음. lifejunjun·yeobaek·firstbrick는 이 세션 권한 밖이라 미확인.
- 예약 작업: FAILED 0, ABANDONED 1(재무·세무팀 CFO, 11/09 월요일 회차), device_absent 0.
- 라이브 사이트·속보 시각: 확인 못 함(이 세션에서 웹 접근 차단). 장애 0 · 고침 0.

## 2026-11-13 새벽 점검
- 밤새봄: Actions 6개 저장소 24시간 점검, 체인브리프 빌드 및 배포 1시간 내 성공. 장애 1 — asc.yml(App Store Connect) 11/11 22:18Z 실행이 약 15분 뒤 취소되어 실패, 이후 재실행 없음(원인 미확인, 재실행은 하지 않음).
- 라이브 사이트는 프록시 차단으로 확인 못 함(미확인). firstbrick·lifejunjun·yeobaek Actions도 미확인.
- 예약 작업 전 페이지 FAILED 0건, 금고지기(CFO)만 11/9 중단(ABANDONED).

## 2026-11-12 새벽 점검
- 밤새봄: Actions 확인한 6개 저장소 정상(chainbrief 01:34 KST 배포 실패 1건은 이후 성공으로 해결, 재실행 불필요).
- 라이브 사이트 점검은 프록시 차단으로 못 함(미확인). firstbrick·lifejunjun·yeobaek Actions도 미확인.
- 예약 작업 실패 0건, 금고지기(CFO)만 11/9 중단(ABANDONED) 상태.

# 운영 점검 기록 (최신이 위)

## 2026-11-11 새벽 점검
- Actions 6곳 24시간 미해결 실패 0. chainbrief deploy-pages 일시 실패 3건·qurator 1건은 이후 성공으로 자체 복구, 고침 0. 마지막 빌드 성공 03:10 KST.
- 속보 신선도(저장소 기준): KO 01:35 KST, EN/ZH 21:4x KST — 12시간 이내. 예약 작업 FAILED 0, device_absent 0.
- 라이브 사이트는 프록시 차단으로 확인 못 함. firstbrick Actions 403, lifejunjun·yeobaek 권한 없음 미확인.

## 2026-11-10 새벽 점검
- Actions 저장소 6곳 24시간 미해결 실패 0. chainbrief 11-09 16:55Z 배포 실패 1건은 17:50Z 성공으로 자체 복구, 고침 0.
- 라이브 사이트는 이 환경 fetch 차단으로 확인 못 함. firstbrick Actions 403, lifejunjun·yeobaek 권한 없음 미확인.
- 예약 작업 FAILED 0 (끝까지 확인).
## 2026-11-09 새벽 점검
- Actions 6개 저장소 24시간 미해결 실패 0, chainbrief 빌드 및 배포 1시간 내 성공, 고침 0.
- 라이브 사이트 12곳은 이 환경 프록시 차단(CONNECT 403)으로 확인 못 함. firstbrick Actions는 403으로 미확인, lifejunjun·yeobaek는 저장소 권한 없음.
- 예약 작업 FAILED 1: 미팅 비서 (USAGE_LIMIT_REACHED). 중단(ABANDONED) 2: 그로스 애널리스트(11-07), LUFT 주간 케이스 디자인(11-03).
## 2026-11-08 새벽 점검
- Actions 6개 저장소 24시간 미해결 실패 0 (빌드 및 배포 실패 2·luft pages 1은 이후 성공으로 해소), 고침 0.
- 라이브 사이트는 접속 차단으로 확인 못 함. lifejunjun·yeobaek·firstbrick는 범위 밖.
- 예약 작업 FAILED 2: 고객경험(CX)팀 · 미팅 비서 (둘 다 USAGE_LIMIT_REACHED).
## 2026-11-05 새벽 점검
- 장애 1 — 체인브리프 EN·ZH 마지막 속보/기사가 11/03 21:25~26 KST(약 30시간 전)로 멈춤. 'EN·中文 발행' 예약 작업 11/04 21:24 실행이 PENDING으로 안 끝남. 한국어 속보는 11/05 01:38 정상.
- Actions 6개 저장소 24시간 미해결 실패 0(QURATOR 11/04 19:56 KST 실패는 이후 성공), 빌드 및 배포 마지막 성공 02:44 KST, 예약 작업 FAILED 0 (device_absent 0, ABANDONED 2·PENDING 4).
- 라이브 페이지는 접속 차단돼 main 데이터로 대신 확인. lifejunjun·yeobaek·firstbrick는 접근 범위 밖이라 미확인.
## 2026-11-04 새벽 점검
- 이상 없음 — Actions 6개 저장소 24시간 실패 0, 빌드 및 배포 마지막 성공 02:32 KST, 예약 작업 48개 실패 0 (device_absent 0). 멈춤 2건(기사 발행 ABANDONED·LUFT 케이스 PENDING)은 기록만.
- 라이브 페이지는 이 실행 환경에서 접속 차단돼 배포 성공·main 데이터로 대신 확인(속보 KO 01:30 · EN 21:25 · ZH 21:26 KST). lifejunjun·yeobaek·firstbrick 저장소는 이번 세션 접근 범위 밖이라 미확인.

## 2026-11-03 새벽 점검
- 이상 없음 — Actions 6개 저장소 24시간 미해결 실패 0(체인브리프 기사 이미지·영상 가져오기 09:20 KST 실패는 16:48 KST 성공으로 해결), 빌드 및 배포 마지막 성공 02:37 KST, 예약 작업 41개 실패 0 (device_absent 0).
- 라이브 페이지는 이 실행 환경에서 접속 차단돼 배포 성공·main 데이터로 대신 확인(속보 KO 01:48 · EN 21:38 · ZH 21:36 KST). lifejunjun·yeobaek·firstbrick 저장소는 이번 세션 접근 범위 밖이라 미확인.

## 2026-11-02 새벽 점검
- 이상 없음 — Actions 24시간 미해결 실패 0(체인브리프 스토어 앱·앱스토어 관리 실패 2건은 이후 성공), 빌드 및 배포 마지막 성공 02:57 KST, 예약 작업 실패 0 (device_absent 0).
- 라이브 14곳 정상(속보 KO 01:30 KST · EN 21:27 · ZH 21:26 KST, EN·ZH는 하루 2회 발행 주기). lifejunjun.com 도메인은 확인 불가.

## 2026-11-01 새벽 점검
- 이상 없음 — Actions 7개 저장소 24시간 미해결 실패 0, 체인브리프 빌드 및 배포 마지막 성공 03:13 KST, 예약 작업 실패 0 (device_absent 0).
- 라이브 페이지는 이 실행 환경에서 접속 차단돼 저장소 데이터·로컬 빌드로 대신 확인(속보 KO 01:29 · EN 21:28 · ZH 21:26 KST).
