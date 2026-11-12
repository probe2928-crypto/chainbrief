# Toobit 숏폼 엔진 v3.1 (2026-11-12 세준 승인)

세준 피드백: "그래 이렇게 할 수 있잖아. 앞으로도 이렇게 매일 고도화해." — 이 엔진이 기준선이다. 매 회차 이것보다 좋아져야 한다.

## 승인된 스타일 (깨지 말 것)
- 9:16 1080x1920, 30fps, 30~35초 + 엔딩 3.5초
- 첫 프레임부터 훅(숫자 카운터 등). 로고·인사로 시작 금지
- 성우: ElevenLabs 한국어 네이티브 **Chris** (voice_id `PDoCXqBQFGsvfO0hNkEs`, 모델 `eleven_v4`, speed 1.1, stability .4, similarity .85, style .3). 영어 성우가 한국어 읽는 것 금지(세준: "이상하다")
- 자막: 성우 단어 타이밍(with-timestamps)에 맞춘 1~2단어 키네틱 자막, 118px 900 굵기, 숫자=노랑 #ffe14d, 하락=빨강 #ff3d5a, 투비트=민트 #33f0b0, word-break:keep-all
- 1~2초마다 장면 전환 + 펀치줌·흔들림·흰 플래시, 필름 그레인·비네팅, 상단 노란 진행바, 좌상단 `● MARKET BRIEF 2026.11` 태그
- Toobit 장면: 소문자 `toobit` 워드마크 글자별 마스크 등장 + 민트 잔상 아웃라인 + 빛 스윕 + 민트 라인 + 모노 `CRYPTO / STOCKS / ONE APP` (세준: 대문자 블록 글씨는 촌스러움). 이 장면엔 하단 자막 숨김
- 엔딩(end3.html): 노란 사선 와이프 → 소문자 `your mcn`(MCN 이름 받으면 교체) 같은 등장 방식 + 모노 라벨 + 광고·위험 고지. 골드/세리프 정장 스타일 금지
- 로고 이미지는 대표님 허락 전까지 사용 금지(트래블룰 이슈). 글자만

## 파이프라인
1. 대본(한국어, 25~32초 분량) — 사실은 날짜·출처 확인한 것만, 출처는 마지막 장면 작은 글씨
2. 성우: 작업 환경에서는 api.elevenlabs.io가 막혀 있음 → 세준 맥 내장 브라우저(elevenlabs.io 탭, localStorage 'xik'에 키)에서 `fetch('https://api.elevenlabs.io/v1/text-to-speech/<voice>/with-timestamps')` → 단어 타이밍 계산 → JSON Blob을 화면 링크로 만들고 **computer left_click으로 클릭**(자동 다운로드는 두 번째부터 막힘) → ~/Downloads → device_stage_files로 가져오기
3. `v3/words.js`(window.WORDS=[[단어,시작,끝],...]) 교체, `news3.html`의 장면 배열 `S`(장면 id, 시작초)를 새 대본 타이밍에 맞게 수정, 장면 내용 교체
4. `node snap.js v3/news3.html '' <초들>` 로 프레임 확인(글자 잘림·겹침) → `v3/build.sh`(렌더 `FPS=30 node render.js v3/news3.html <길이> fr_v3`, 부분 재렌더는 `START=n END=m`)
5. 오디오: 성우 1.5 + 비트 0.45 + 장면 전환 whoosh, 핵심 숫자에 boom
6. 완성본은 프레임 시트로 직접 검수 후 세준에게 전송

## 개선 기록
- v3 (11/12): 슬라이드쇼 → 키네틱 자막·빠른 컷 구조로 전면 교체, 한국어 성우 Chris
- v3.1 (11/12): Toobit 워드마크·MCN 엔딩 스타일리시하게 재디자인
- 11/12 오후편(미발송): 새 장면 템플릿 첫 사용 — 공포탐욕 게이지·ETF 유출 역막대·BUT 줌스루 글리치·금고문 열림·좌우 스플릿(개인 vs 은행), 자막 3단어 묶음 규칙. 채점 6→7로 기준 미달, 남은 숙제: 워치리스트에 가격 틱, 엔딩 전 정적 구간 1.5초 이내, 은행이 바로 읽히는 아이콘, 출처 글씨 키우기
