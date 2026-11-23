# 초겨울 큐 교체본 (홍보라, 2026-11-22 · 11/23 적용)

> **11/23 홍보라가 `ops/trot/sns/queue.json`에 직접 반영함.** 11/22 파일은 yakson/gicha의 ig 15초 경로를 되돌리는 낡은 본이라 지웠고, build.py는 이제 게시된 항목을 자동 제외한다. 사본: `queue.winter.2026-11-23.json`. 아래 '덮어쓰기' 안내는 더 할 필요 없음.

**대상:** SNS 배포 담당(배트롯). **할 일:** 다음 배포 회차 직전에 `ops/trot/sns/queue.json`을 `queue.winter.2026-11-22.json`으로 덮어쓰기만 하면 됩니다. 형식과 키는 같고, 34개 항목도 그대로입니다.

## 바뀐 점
1. **게시 안 된 18개 순서만 바꿨습니다.** 연화→봄비→한결 순으로 돌아가고, 같은 곡은 두 번 연달아 나오지 않습니다.
   - 지금 큐는 yakson·gicha 다음에 국밥 2개, 당신이라서, 딱 내 스타일, 국밥, 누님 순서로 이어지고, 끝 4개는 떨이요가 연달아 나옵니다.
   - learnings.md에 같은 곡을 반복하면 조회가 떨어진 기록이 있습니다(eomma_4 190 → eomma_5 131, dangsin_3 313 → dangsin_4 120).
2. **첫 줄 훅 9개만 바꿨습니다.** 겹치던 훅(nunim_4=nunim_1, gukbap_4=gukbap_1, ddeori_4=ddeori_1, gukbap_5=gukbap_2, 그리고 이미 게시된 dangsin_2·ttak_1과 같은 dangsin_5·ttak_4)과 국밥 계열을 첫추위·김장·송년회 훅으로 바꿨습니다. `caption`·`caption_ig`·`caption_fb`의 첫 줄만 바꿨습니다.
3. 클립, 링크, 'AI로 제작한 가상 가수' 표기, 해시태그는 그대로 두었습니다. 시간 약속이나 실존 가수 이름도 넣지 않았습니다.

## 검증 (build.py 안의 assert로 확인)
- 키가 원본과 같음
- AI 표기 34/34 × 3개 캡션
- 게시 안 된 항목의 첫 줄 중복 0
- 같은 곡 연속 0
- 같은 가수 3연속 0

## 다시 만들기 (posted.md가 바뀐 뒤)
```
python3 -I ops/trot/marketing/fix/queue-winter/build.py ops/trot/sns/queue.json ops/trot/sns/posted.md out.json
```
그 사이 새 항목이 게시됐으면 build.py의 ORDER 목록에서 그 항목을 빼야 assert가 통과합니다.

## 바꾸지 않은 것
- 립싱크 숏츠가 반응이 가장 좋지만(페북 새 페이지 기준 namhae_lip1 214·abeonim_lip1 206, 약 1.5일) 큐에 남은 립싱크 클립이 0개입니다.
- 그래서 립싱크 신규 클립은 제작 채팅에 요청할 일입니다(제작은 건드리지 않음).
