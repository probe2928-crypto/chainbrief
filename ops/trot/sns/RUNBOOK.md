# 트롯스테이지 SNS 배포 런북 (2시간마다 1회 실행)

세준 지시(11/4): 유튜브 영상을 밴드·페북·인스타에 매일 10회 이상 올리기. 무료 방식, 세준 컴퓨터 내장 브라우저로 직접 게시.

## 한 번 실행할 때 할 일
1. 이 브랜치(ops-status)의 `ops/trot/sns/queue.json`, `posted.md`를 읽는다. queue에서 posted.md에 아직 없는 첫 항목 1개를 고른다. 같은 가수가 직전 2회 연속이면 다음 가수 항목으로 건너뛴다.
2. **밴드** (https://band.us/band/104995766): 글쓰기 → 캡션 붙여넣기(타이핑 뒤 공백 1자 더 쳐야 '게시' 활성화) → 클립 첨부 → 게시.
   - 클립 첨부: 밴드 페이지 JS에서 `fetch(clip)  (clip은 queue.json의 전체 raw 주소, trot-media 브랜치)` → Blob → `new File([blob], name, {type:'video/mp4'})` → DataTransfer → 동영상 input(`input[type=file][accept^="video"]`)에 넣고 `change` 이벤트. 업로드 완료(진행바 사라짐) 확인 후 게시.
3. **페이스북 페이지** (https://www.facebook.com/profile.php?id=61596061627297): 외부 fetch 막힘(CSP). 영상 대신 **글 + 유튜브 링크**로 게시(링크 미리보기 썸네일이 붙음). 캡션 첫 줄 훅 그대로.
4. **인스타 @trotstage_kr**: 웹에서 파일을 넣을 방법이 없음(CSP, 내장 브라우저는 localhost·네이티브 파일창도 막힘). 세준이 Meta 개발자 앱/토큰을 만들어 주기 전까지는 **건너뛴다**. 토큰이 생기면 facebook.com 탭에서 graph.facebook.com Reels API(video_url=raw GitHub 주소)로 게시.
5. `posted.md`에 한 줄 추가: `| 시각(KST) | id | 밴드 ✅/❌ | 페북 ✅/❌ | 인스타 ⏸ | 비고 |` → commit & push (ops-status).

## 규칙
- 모든 게시물에 'AI로 제작한 가상 가수' 표시(캡션에 이미 있음). 실존 가수 이름 언급 금지.
- 같은 클립 재게시 금지. queue가 바닥나면 posted.md에 '큐 소진' 쓰고 중단(새 클립은 제작 채팅에서 만든다).
- 결제·유료 기능·광고 부스트 금지. 계정 설정 변경 금지. 댓글 답글은 하지 않는다(별도 지시 전까지).
- 내장 브라우저에 연결이 안 되면(컴퓨터 꺼짐) 아무것도 하지 말고 posted.md에 '오프라인 건너뜀'만 기록.
- 세준이 SNS 배포 중지를 말하면 이 예약 작업을 즉시 끈다.
