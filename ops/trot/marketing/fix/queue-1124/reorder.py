"""11/24 홍보라: 미게시 큐 순서만 재배치 (내용 변경 0).
근거: ttak_3(딱 내 스타일 3번째 클립) 9시간 조회 1 vs 같은 시점 신곡 yakson_1 186,
      반복곡 피로 기록(dangsin_3 313→dangsin_4 120, eomma_4 190→eomma_5 131).
규칙: 아직 한 번도 안 나간 곡(국밥·떨이요)의 첫 클립을 맨 앞에, 5번째 반복(dangsin_5)·4번째 반복(ttak_4)은 맨 뒤.
사용: python3 -I reorder.py ops/trot/sns/queue.json ops/trot/sns/posted.md
"""
import json, re, sys
qp, pp = sys.argv[1], sys.argv[2]
q = json.load(open(qp)); posted = open(pp).read()
is_posted = lambda i: re.search(r'\| ' + re.escape(i['id']) + r' \|', posted) is not None
done = [i for i in q if is_posted(i)]; rest = {i['id']: i for i in q if not is_posted(i)}
ORDER = ['gukbap_1','ddeori_1','nunim_2','gukbap_2','ddeori_2','nunim_3','gukbap_3',
         'ddeori_3','nunim_4','gukbap_4','ddeori_4','dangsin_5','gukbap_5','ttak_4']
ORDER = [x for x in ORDER if x in rest]
assert set(ORDER) == set(rest), (set(rest) ^ set(ORDER))
new = done + [rest[x] for x in ORDER]
# 검증: 항목·내용 동일, 같은 곡 연속 0, 같은 가수 3연속 0, AI 표기 유지
assert sorted(json.dumps(i, sort_keys=True, ensure_ascii=False) for i in new) == \
       sorted(json.dumps(i, sort_keys=True, ensure_ascii=False) for i in q)
tail = [i for i in new if not is_posted(i)]
for a, b in zip(tail, tail[1:]): assert a['title'] != b['title'], (a['id'], b['id'])
for a, b, c in zip(tail, tail[1:], tail[2:]): assert not (a['singer'] == b['singer'] == c['singer'])
for i in new:
    for k in ('caption', 'caption_ig', 'caption_fb'): assert 'AI' in i[k], i['id']
json.dump(new, open(qp, 'w'), ensure_ascii=False, indent=2); open(qp, 'a').write('\n')
print('OK', [i['id'] for i in tail])
