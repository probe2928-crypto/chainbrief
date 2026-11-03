# 트롯스테이지 SNS 배포 요령·성과 메모 (한 줄씩 누적)

- 11/04 파일 넣기(무료·내장 브라우저): 밴드 탭은 raw.githubusercontent.com fetch 가능(chainbrief 공개 저장소) → 밴드 탭에서 이미지 fetch→base64 → `location.href='https://www.facebook.com/...#trot='+encodeURIComponent('이름:base64')`로 이동 → 도착 페이지에서 `performance.getEntriesByType('navigation')[0].name`의 해시를 atob→File→DataTransfer로 input[type=file]에 넣기. 토큰 거의 안 듦(300KB 해시 OK). 페이지 새로고침되면 사라지니 다시 중계.
- 11/04 페북·인스타 캡션: 줄바꿈 있는 글은 '타이핑'이 깨짐 → 에디터 focus 후 ClipboardEvent('paste', text/plain) 디스패치로 넣기. 밴드는 타이핑 OK(사진 넣은 뒤 '태그 선택' 아래를 클릭해야 커서가 들어감).
- 11/04 페북 '게시물 만들기' 상단 'AI 레이블' → 켜기, 인스타 캡션 화면 'AI 레이블 추가' 토글 켜기 → 게시물에 'AI 콘텐츠' 표시됨. 인스타 자르기는 왼쪽 아래 아이콘 → '원본'(4:5 유지).
- 11/04 window.open은 같은 탭을 덮어씀(팝업 X) — 쓰지 말 것.
- 성과: 첫 게시 직후라 데이터 없음(팔로워 0). 다음 회차부터 반응 기록.
