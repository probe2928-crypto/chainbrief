# CHAINBRIEF 체인브리프

블록체인·코인 속보 미디어. GitHub Pages(무료)로 운영하고, 서버 없이 GitHub Actions가 15분마다 데이터를 모아 다시 빌드해요.

| 메뉴 | 내용 | 갱신 |
|---|---|---|
| 속보 `/` | 직접 쓴 속보 + 상장 자동 속보 + 해외 중요뉴스 요약 | 커밋 즉시 |
| 상장 `/listings/` | 업비트·빗썸 신규 상장·유의·종료, 하루를 오전·오후·저녁·새벽으로 | 15분 |
| 급등 `/surge/` | 상승률·하락률·거래대금 TOP, 업비트↔빗썸 가격차 | 30초 (브라우저) |
| 뉴스 `/news/` | 스캇 박 기명 기사(하루 3회) + 해외 헤드라인 | 기사 발행 시 / 15분 |
| 커뮤니티 `/community/` | 이번 주 많이 본 글, 자유게시판, 코인 커뮤니티 인기글 | 실시간 / 15분 |
| 시세 `/market/` | 달러·원화 시세, 김치프리미엄 | 1분 (브라우저) |
| 문의 `/contact/` | 텔레그램 @btcbullit | — |

## 속보 올리기
`content/flash/` 에 파일 추가 (GitHub 웹 → Add file → Create new file):
```markdown
---
title: 비트코인 7만 달러 돌파
time: 2026-10-26T15:30:00+09:00
category: 비트코인
important: true
---
1시간 새 숏 포지션 청산이 몰리며 주요 저항선을 넘었다.
```
- `category`: `site.config.json`의 categories 중 하나
- `important: true` → 붉은색 Breaking
- `time`을 미래로 쓰면 예약 발행, `draft: true` 면 비공개

## 기사
`content/articles/` — 작성 규칙은 [docs/ARTICLE_GUIDE.md](docs/ARTICLE_GUIDE.md). 매일 오전·오후·저녁 자동 발행(스캇 박 기명).

## 커뮤니티 게시판 (Supabase)
1. Supabase 프로젝트 생성 → SQL Editor에서 [docs/supabase.sql](docs/supabase.sql) 실행
2. Project Settings → API의 **Project URL**, **anon public key**를 `site.config.json` → `supabase`에 입력
3. 글 숨기기: Supabase Table Editor → posts → `hidden` 을 true

## 설정 — `site.config.json`
`name`·`tagline`(소개), `domain`(도메인), `coins`(시세 코인, 업비트에 없으면 `"upbit": false`), `newsSources`(해외 RSS), `communitySources`(인기글 출처), `partner`(레퍼럴 배너, `url` 넣으면 표시), `telegram`, `footer`.

해외 헤드라인 자동 번역: 저장소 Secrets에 `ANTHROPIC_API_KEY` 추가.

## 도메인 연결
1. DNS: 루트 A 레코드 `185.199.108.153` `185.199.109.153` `185.199.110.153` `185.199.111.153`, `www` CNAME → `probe2928-crypto.github.io`
2. Settings → Pages → Custom domain 입력, Enforce HTTPS
3. `site.config.json` `domain`, `app/capacitor.config.json` `server.url` 변경

## 앱
`app/` — [app/README.md](app/README.md). 안드로이드 APK는 Releases → android-latest.

## 구조
```
content/flash/  content/articles/   글
data/listings.json                 상장 히스토리 (Actions가 커밋)
scripts/                           수집·빌드
public/                            CSS·JS·아이콘
docs/                              기사 가이드, DB 스키마
app/                               iOS·안드로이드
```
