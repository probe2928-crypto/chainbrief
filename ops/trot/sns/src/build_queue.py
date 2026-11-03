import json, random
STORY={"엄마의 바다":"남해 국밥집 딸 연화가 바다에 띄우는 엄마 노래예요.",
 "딱 내 스타일":"시장통 막내딸 봄비의 신나는 직진 고백 트로트!",
 "당신이라서":"과수원집 효자 한결이 아내에게 바치는 고백이에요.",
 "국밥 한 그릇":"새벽 다섯 시 불 밝히던 엄마의 국밥집, 그 손맛이 그리운 날.",
 "떨이요 떨이":"새벽 시장 과일가게 막내딸 봄비, 오늘만 특가로 마음 떨이!",
 "누님":"누님들께 바치는 한결의 윙크 한 방~"}
ASK={"연화":"여러분 고향은 어디세요? 댓글로 남겨 주세요 🌸","봄비":"박수 한 번 짝짝! 신청곡은 댓글로 주세요 💃","한결":"누님들~ 댓글로 인사 한 번 해 주세요 🍎"}
TAG={"연화":"#트로트 #엄마노래 #효도트로트 #트롯스테이지 #연화","봄비":"#트로트 #신나는트로트 #댄스트로트 #트롯스테이지 #봄비","한결":"#트로트 #누님 #사랑노래 #트롯스테이지 #한결"}
YT="https://www.youtube.com/@trotstage_kr"
clips=json.load(open("/home/claude/trotstage/sns/clips.json"))
# interleave singers: 연화 weighted
by={}
for c in clips: by.setdefault(c["singer"],[]).append(c)
order=[]; pat=["연화","한결","봄비","연화","한결","연화"]
while any(by.values()):
    for s in pat:
        if by.get(s): order.append(by[s].pop(0))
q=[]
for c in order:
    cap=(f"{c['hook']}\n\n{c['singer']} 「{c['title']}」\n{STORY[c['title']]}\n\n"
         f"▶ 전곡은 유튜브 '트롯스테이지'에서 들어 보세요\n{YT}\n🔔 매일 저녁 6시 30분 새 무대\n\n{ASK[c['singer']]}\n\n"
         f"※ 트롯스테이지의 가수와 노래는 AI로 제작한 가상 가수의 오리지널 창작곡입니다.\n\n{TAG[c['singer']]}")
    q.append({"id":c["id"],"clip":f"ops/trot/sns/clips/{c['id']}.mp4","singer":c["singer"],"title":c["title"],"caption":cap})
json.dump(q,open("/home/claude/chainbrief/ops/trot/sns/queue.json","w"),ensure_ascii=False,indent=1)
print(len(q))
