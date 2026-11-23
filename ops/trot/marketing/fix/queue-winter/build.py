"""queue.json 미게시분을 '가수 로테이션 + 같은 곡 연속 금지' 순서로 재배열하고,
중복·계절 안 맞는 첫 줄 훅만 초겨울(11/23~12월) 훅으로 교체한다.
사용: python3 -I build.py <queue.json> <posted.md> <출력.json>
다른 필드(클립·링크·AI 표기·해시태그)는 건드리지 않는다."""
import json, re, sys
qp, pp, out = sys.argv[1:4]
q = json.load(open(qp, encoding='utf-8')); posted = open(pp, encoding='utf-8').read()
done = [it for it in q if re.search(r'\| ' + re.escape(it['id']) + r' \|', posted)]
todo = [it for it in q if it not in done]

ORDER = ['yakson_1','ttak_3','nunim_1','gicha_1','ddeori_1','dangsin_5','gukbap_1','ttak_4','nunim_2',
         'gukbap_2','ddeori_2','nunim_3','gukbap_3','ddeori_3','nunim_4','gukbap_4','ddeori_4','gukbap_5']
HOOK = {  # 바꿀 항목만. 시간 약속·실존 가수·'곧 공개' 같은 약속 문구 없음
 'ttak_3':   '추운 날엔 어깨부터 들썩! 🎶',
 'dangsin_5':'김장 끝낸 아내에게 이 노래 한 곡 💐',
 'gukbap_1': '첫추위엔 뜨끈한 국밥 한 그릇 🍲',
 'ttak_4':   '송년회 첫 곡, 이걸로 정했어요!',
 'gukbap_3': '찬바람 불면 생각나는 엄마 국밥집',
 'nunim_4':  '송년회에서 누님들 박수 받는 노래 👏',
 'gukbap_4': '김장 김치에 국밥 한 그릇, 엄마 생각 🍲',
 'ddeori_4': '한 해 마무리 떨이! 남은 마음 다 드려요',
 'gukbap_5': '올해 고생한 우리 딸, 국밥 한 그릇 먹고 가라',
}
by = {it['id']: it for it in todo}
ORDER = [i for i in ORDER if i in by]  # 11/23: 이미 게시된 항목은 자동 제외(교체본이 낡지 않게)
assert set(ORDER) == set(by), (set(ORDER) ^ set(by))
new = []
for i in ORDER:
    it = dict(by[i])
    if i in HOOK:
        for k in ('caption', 'caption_ig', 'caption_fb'):
            lines = it[k].split('\n'); lines[0] = HOOK[i]; it[k] = '\n'.join(lines)
    new.append(it)
res = done + new
# 검증: 키 동일, AI 표기 전부, 첫 줄 중복 0(미게시분), 같은 가수 3연속·같은 곡 연속 0
assert all(set(a) == set(q[0]) for a in res)
assert all('AI로 제작한 가상 가수' in a[k] for a in res for k in ('caption','caption_ig','caption_fb'))
firsts = [a['caption'].split('\n')[0] for a in new]; assert len(firsts) == len(set(firsts)), firsts
for a, b in zip(new, new[1:]): assert a['title'] != b['title'], (a['id'], b['id'])
for a, b, c in zip(new, new[1:], new[2:]): assert not (a['singer'] == b['singer'] == c['singer'])
json.dump(res, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(len(res), '항목 · 미게시', len(new), '· 훅 교체', len(HOOK))
for a in new: print(' ', a['id'], a['singer'], '|', a['caption'].split('\n')[0])
