# 체인브리프 (가칭)

블록체인·코인 속보 미디어 사이트. 코인니스처럼 **라이브 속보 + 해외 헤드라인 + 실시간 시세·김프 + 용어사전** 구성이고, 휴대폰에서는 앱처럼 설치(PWA)해서 쓸 수 있어요.

- 호스팅: GitHub Pages (무료)
- 서버·DB 없음, 외부 패키지 없음 (Node 22만 있으면 빌드)
- 15분마다 자동 빌드 → 해외 헤드라인 갱신

## 속보 올리는 법 (가장 자주 할 일)

### 방법 1. GitHub 웹에서 (PC·폰 다 됨)
1. 저장소에서 `content/flash` 폴더 열기 → **Add file → Create new file**
2. 파일 이름: `2026-10-26-1530-btc.md` 처럼 날짜-시간-짧은영문
3. 아래 형식으로 쓰고 **Commit changes**

```markdown
---
title: 비트코인 7만 달러 돌파
time: 2026-10-26T15:30:00+09:00
category: 비트코인
important: true
---
1시간 새 숏 포지션 청산이 몰리며 주요 저항선을 넘었다.
```

커밋하면 1~2분 뒤 사이트에 반영되고, 열려 있는 화면에는 "새 속보 보기" 버튼이 떠요.

- `important: true` → 빨간색 중요 속보
- `category` → `site.config.json`의 categories 중 하나 (비트코인, 알트코인, 규제·정책, 거시경제, 온체인, 거래소, 공지)
- `time`을 미래로 적으면 **예약 발행** (그 시각 이후 첫 자동 빌드 때 공개)
- 내리고 싶으면 `draft: true` 추가하거나 파일 삭제

### 방법 2. 내 컴퓨터에서
```bash
npm run new -- "비트코인 7만 달러 돌파" 비트코인 중요
```

## 기사(분석·가이드) 올리는 법
`content/articles/영문-주소.md` 파일을 만들어요.

```markdown
---
title: 기사 제목
date: 2026-10-26T15:00:00+09:00
category: 분석
summary: 목록에 보일 한두 줄 요약
---
## 소제목
본문 (마크다운)
```

## 사이트 설정 — `site.config.json`
| 항목 | 설명 |
|---|---|
| `name`, `tagline`, `description` | 사이트 이름·소개 (검색 결과에 노출) |
| `domain` | 도메인 연결 후 `example.com` 입력 |
| `coins` | 상단·시세 탭에 보일 코인 (CoinGecko id + 심볼). 업비트 원화마켓에 없는 코인은 `"upbit": false` |
| `newsSources` | 헤드라인을 가져올 RSS 주소 |
| `partner` | 오른쪽 파트너 거래소 배너 (`url`에 레퍼럴 링크 넣으면 버튼 표시) |
| `telegram` | 푸터 텔레그램 채널 (예: `@channel`) |
| `footer` | 회사명·인터넷신문 등록번호·발행인·이메일 |

## 해외 헤드라인 한국어 번역 (선택)
저장소 **Settings → Secrets and variables → Actions → New repository secret**
- Name: `ANTHROPIC_API_KEY`
- Value: Anthropic API 키

넣으면 다음 자동 빌드부터 영문 제목이 한국어로 바뀌고, 원문 제목은 아래 작게 표시돼요. 본문은 저장·번역하지 않아요(저작권).

## 도메인 연결
1. 도메인 구입 후 DNS에 아래 레코드 추가
   - 루트 도메인(`example.com`): A 레코드 4개 `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www`: CNAME → `probe2928-crypto.github.io`
2. 저장소 **Settings → Pages → Custom domain**에 도메인 입력 → Save → **Enforce HTTPS** 체크
3. `site.config.json`의 `domain`에 같은 도메인 입력 후 커밋

## 로컬 미리보기
```bash
npm run news    # 헤드라인 수집 (선택)
npm run dev     # http://localhost:4321
```

## 구조
```
content/flash/      속보 (마크다운 1건 = 1파일)
content/articles/   자체 기사
content/terms.json  용어사전
public/             CSS, JS, 아이콘, 서비스워커
scripts/            빌드·헤드라인 수집·로컬 서버
.github/workflows/  자동 빌드·배포 (푸시할 때 + 15분마다)
```

## 시세 데이터
브라우저에서 직접 공개 API를 불러요. 키 필요 없음.
- 글로벌 시세·도미넌스: CoinGecko
- 원화 시세·김프: 업비트
- 공포·탐욕 지수: Alternative.me

## 다음 단계 아이디어
- 호재/악재 투표, 댓글 → Supabase 같은 DB 연결 필요
- 속보 텔레그램 자동 전송 → GitHub Actions에 봇 토큰 추가
- 정식 앱(스토어 등록) → 이 사이트를 Capacitor로 감싸 iOS·안드로이드 빌드
