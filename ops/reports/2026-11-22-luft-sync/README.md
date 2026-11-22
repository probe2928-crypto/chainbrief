# LUFT 실서버 catalog 동기화 패키지 — 2026-11-22 밤이사

**한 줄:** 실서버(luft main) `catalog.js`는 11/8본 그대로다. 쇼핑몰 아티팩트에는 11/9~11/22에 넘겨받은 상세 문구와 새 케이스 3종이 들어가 있는데, 배포 담당 루프트온이 2주째 반영하지 못했다. 이 폴더 파일을 복사하면 상품·문구·그림은 아티팩트와 같아진다. 단 아티팩트 index.html도 더 새 버전이라(옵션 필드 `fillAll`·`def` 처리, 실서버 index.html엔 없음) 완전히 같아지려면 index.html도 저장소 래퍼 규칙대로 옮겨야 한다.

## 근거 (밤이사가 직접 확인)

- 실서버 `catalog.js` 마지막 변경: 2026-11-08 01:49 커밋("LUFT 개편: 케이스·방향제 전문 사이트로 전환"), `"updated": "2026-11-08"`.
- 아티팩트 `catalog.js`: 버전 1795326735-8d59, `"updated": "2026-11-22"`, sha256 4cd42619….
- 상품 수: 아티팩트 14 · 실서버 11. **아티팩트에만 있는 것:** case-ferry, case-lagom, case-meadow (그림 6개도 저장소에 없음 → `img/`·`print/`에 같이 넣음).
- 문구가 달라진 상품 11개: bojagi·celadon·dancheong·ilwol·initial·moonjar·najeon·peony·route·stamp·tag (lead·why·faq·specs·custom 등). **가격 차이 0건.**
- 컬렉션: 아티팩트 `o261110, seoul, orig` · 실서버 `seoul, orig`.
- 금지어 검사: 천연·무독성·안심·에코·냄새 제거·탈취·항균 0건('그린'은 "그린 패턴"의 동사, 실서버에도 같은 문장). 방향제 판매 상품 0개.

## 로컬 확인 (실서버 index.html + 이 패키지)

python http.server + Playwright, 외부 요청 차단 상태:

| 화면 | FERRY·LAGOM·MEADOW 표시 | 콘솔 에러 | 깨진 이미지 | 휠 스크롤 |
|---|---|---|---|---|
| 1400px | 3개 모두 | 0 | 0 | 0 → 800 |
| 390px | 3개 모두 | 0 | 0 | 0 → 800 |

상세 열기·장바구니 담기·각인 입력은 이번에 누르지 않았다(미확인). index.html·config.js는 바꾸지 않는다.

## 반영 방법 (세준 OK 후)

```
cp catalog.js <luft>/catalog.js
cp img/case-{ferry,lagom,meadow}.jpg <luft>/img/
cp print/case-{ferry,lagom,meadow}.png <luft>/print/
```
그다음 상세·담기 한 번 확인 → luft main 커밋·push. 11/9 인사 조정상 luft 배포는 루프트온 몫이라 밤이사는 push하지 않았다.

## 왜 실서버만 멈췄나 (확인한 것)

- 루프트온은 돌고 있다: 아티팩트 버전 1795326735 = 2026-11-22 14:52 KST, 루프트온 발화(14:47) 5분 뒤. catalog를 고치는 사람은 11/9 규칙상 루프트온뿐이다. 실행 기록(last_run)이 없어도 도는 건 영쌤과 같다.
- 빠진 것은 마지막 단계(luft main 복사·push)다. luft 커밋은 11/8 이후 0. 원인(push 권한·저장소 연결 실패 등)은 미확인.
- 그래서 '끄기'나 '다시 만들기'보다, 이 패키지 반영 + 다음 회차에서 push 단계가 실패하는 이유를 기록하게 하는 것이 먼저다.
- 실서버 index.html은 `fillAll`·`def`를 읽지 않는다(0건). catalog.js만 반영하면 stamp '전부 채우기'와 route·tag 기본값이 실서버에서 빠질 수 있다 — 상세·담기·각인은 이번에 눌러보지 않았다(미확인).
