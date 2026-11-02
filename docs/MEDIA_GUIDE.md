# 기사 이미지·영상 가이드 (AI 비주얼 데스크)

세준 지시(2026-11-02): "기사에 자료 사진·관련 사진도 AI로 잘 만들어 올리고, AI 영상도 고퀄리티 영상 프로그램으로 만들어 같이 올려줘."

## 사이트에 붙이는 법
기사 frontmatter에 아래를 넣으면 빌드가 알아서 붙인다. 파일이 `public/` 아래에 실제로 있어야 표시된다(없으면 기존 아트 이미지).
```
image: media/articles/<기사파일이름>.jpg      # 상단 커버 + 홈 슬라이드 + 공유 미리보기(og:image)
image_alt: 이미지 설명(무엇이 보이는지)
image_note: AI 생성 이미지(이해를 돕기 위한 연출)   # 화면에 그대로 표시 — 생략 금지
video: media/videos/<기사파일이름>.mp4        # 본문 위 영상 플레이어
video_note: AI 제작 영상 · 체인브리프
```
EN/ZH 기사도 같은 키(`image_note: AI-generated image (illustrative)` / `AI 生成图片（示意）`).

## 이미지 만들기 (Canva)
1. `mcp__Canva__generate-image` — 16:9(`LANDSCAPE_16_9`), 영어 프롬프트. 기사 핵심을 상징하는 **사진풍 연출 장면**(사물·공간·빛). 
2. 전체 해상도로 꺼내기: `generate-design`(design_type `desktop_wallpaper`, asset_ids=[생성된 media id], query "A single full-bleed photo covering the entire canvas, no text, no shapes, no logos") → 후보 중 1개 `create-design-from-candidate` → `export-design`(jpg, quality 90, width 1920) → 받은 주소.
3. 가져오기: `gh api -X POST repos/probe2928-crypto/chainbrief/actions/workflows/media-fetch.yml/dispatches -f ref=main -f "inputs[url]=<주소>" -f "inputs[dest]=media/articles/<기사파일이름>.jpg"` → 성공 확인 후 `git pull` → 이미지를 Read로 직접 보고 확인(글자 깨짐·이상한 손·로고가 보이면 다시 만들기).

## 영상 만들기 (HyperFrames · HeyGen)
1. `mcp__HyperFrames_by_HeyGen__compose` — 9:16, 30~45초, 기사 언어로 내레이션, 사실은 기사에 있는 것만. 구성: 훅 한 줄 → 무슨 일 → 왜 중요한지 → 다음 일정 → 'CHAINBRIEF · chainbrief' + '투자 권유 아님'. designSource는 기사 톤에 맞게(기본 `monochrome`).
2. `get_project_status`로 완료 확인(`videoId`) → `get_render_status`로 `videoUrl` → media-fetch로 `media/videos/<기사파일이름>.mp4`(포스터 jpg 자동 생성).
3. ffmpeg로 프레임 시트를 만들어 Read로 확인: 로고·사람 얼굴·틀린 숫자·깨진 자막이 있으면 compose(projectId)로 수정 요청 후 다시.

## 영상 프롬프트 요령 (첫 테스트에서 배운 것, 2026-11-02)
- 새 프로젝트로 처음부터 자세히 쓰는 게 낫다. 기존 영상에 '수정' 요청을 하면 오히려 글자가 겹치고 길어졌다.
- 프롬프트에 넣을 것: 길이(35초), 9:16, '3~4초마다 화면 전환', '단어 단위로 튀어나오는 자막', 장면 계획 6~7개, 쓸 사실 목록(이것만), 금지(로고·실존 인물·다른 숫자·글자 겹침).
- 잘 나온 예: FATF 기사 영상(어두운 남색 + 노란 강조, 33초).

## 반드시 지킬 것
- **AI 표기**: 이미지·영상 모두 `image_note`/`video_note`로 AI 생성임을 화면에 밝힌다.
- **실존 인물 금지**: 정치인·CEO·기자 등 실제 사람의 얼굴·모습을 만들지 않는다(뒷모습 실루엣도 특정 인물로 보이면 금지).
- **로고·상표 금지**: 거래소·기관·코인 로고, 실제 건물 간판, 브랜드 디자인을 넣지 않는다. 국기는 사실과 맞을 때만.
- **가짜 사진처럼 보이지 않게**: 실제 사건 현장(해킹 현장, 법정, 체포 장면)을 사진처럼 재현하지 않는다 — 상징적 연출(사물·빛·공간)로.
- **숫자·글자**: 이미지 안에 숫자·글자를 넣지 않는다(AI가 틀리게 씀). 영상 자막의 숫자는 기사와 한 글자씩 대조.
- 투자 권유·가격 예측 금지, 과장된 공포·환호 연출 금지.
