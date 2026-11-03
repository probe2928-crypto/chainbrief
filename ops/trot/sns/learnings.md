# 트롯스테이지 SNS 배포 요령·성과 메모 (한 줄씩 누적)

- 11/04 파일 넣기(무료·내장 브라우저): 밴드 탭은 raw.githubusercontent.com fetch 가능(chainbrief 공개 저장소) → 밴드 탭에서 이미지 fetch→base64 → `location.href='https://www.facebook.com/...#trot='+encodeURIComponent('이름:base64')`로 이동 → 도착 페이지에서 `performance.getEntriesByType('navigation')[0].name`의 해시를 atob→File→DataTransfer로 input[type=file]에 넣기. 토큰 거의 안 듦(300KB 해시 OK). 페이지 새로고침되면 사라지니 다시 중계.
- 11/04 페북·인스타 캡션: 줄바꿈 있는 글은 '타이핑'이 깨짐 → 에디터 focus 후 ClipboardEvent('paste', text/plain) 디스패치로 넣기. 밴드는 타이핑 OK(사진 넣은 뒤 '태그 선택' 아래를 클릭해야 커서가 들어감).
- 11/04 페북 '게시물 만들기' 상단 'AI 레이블' → 켜기, 인스타 캡션 화면 'AI 레이블 추가' 토글 켜기 → 게시물에 'AI 콘텐츠' 표시됨. 인스타 자르기는 왼쪽 아래 아이콘 → '원본'(4:5 유지).
- 11/04 window.open은 같은 탭을 덮어씀(팝업 X) — 쓰지 말 것.
- 성과: 첫 게시 직후라 데이터 없음(팔로워 0). 다음 회차부터 반응 기록.
- 11/04 막힌 단계① 스튜디오 영상 확인: /videos/upload(동영상 탭)만 보면 '콘텐츠 없음' → 반드시 /videos/short(Shorts 탭)도 볼 것. 행 읽기는 `ytcp-video-row` innerText(마지막 칸 = 조회수).
- 11/04 막힌 단계② 밴드 글쓰기: 사진 첨부 후 첫 클릭이 '태그 선택' 버튼에 맞으면 타이핑이 통째로 사라짐 → 에디터 열자마자 JS로 contenteditable에 focus+커서 지정 후 타이핑. '게시' 활성화는 공백 '타이핑'으론 안 될 때가 있음 → 끝에 공백 2개 쳐 두고 Backspace 키 1번 누르면 `-confirm` 붙음. 게시는 `document.querySelector('._btnSubmitPost').click()`.
- 11/04 막힌 단계③ 밴드 공백 타이핑이 커서 위치(해시태그 중간)에 들어가 '#연 화'가 됨 → 공백 치기 전 JS로 커서를 맨 끝 텍스트 노드로 옮길 것.
- 11/04 페북 링크 게시물: 붙여넣은 글에 유튜브 주소가 있으면 3초 안에 미리보기 카드 자동 생성 — 따로 할 일 없음. 링크 게시물엔 AI 레이블 생략(글에 AI 표시 있음).
- 11/04 인스타 웹은 게시 직후 '완료' 대신 다른 곳 클릭하면 전체 새로고침될 때가 있어 중계해 둔 이미지(window 변수)가 사라짐 → 게시물마다 밴드 탭 해시 중계를 다시 할 것.
