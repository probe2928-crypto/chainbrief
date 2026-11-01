# 영어·중국어 에디션 가이드 (EN / 中文)

사이트: 한국어 `/`, 영어 `/en/`, 중국어(간체) `/zh/`. 상단 KO · EN · 中文 스위치로 오간다.
빌드: `npm run build` (= `scripts/build.mjs` 한국어 → `scripts/build-intl.mjs` 영어·중국어). UI 문구는 build-intl.mjs의 `ED.en` / `ED.zh` 사전에 있다.

| 에디션 | 포커스 | 시간대 표기 | 바이라인 |
|---|---|---|---|
| EN | 미국 · 유럽 · 싱가포르 | UTC | Scott Park |
| 中文 | 홍콩 · 싱가포르 (+중화권) | HKT (Asia/Hong_Kong) | Scott Park |

## 콘텐츠 위치
- 영어 기사: `content/en/articles/YYYY-MM-DD-<slug>.md` · 속보: `content/en/flash/YYYY-MM-DD-HHMM-<slug>.md`
- 중국어 기사: `content/zh/articles/…` · 속보: `content/zh/flash/…`
- 상장 자동 속보(`auto-*.md`)는 fetch-listings.mjs가 세 언어 모두 쓴다. 손대지 않는다.

## 기사 frontmatter
```
---
title: 헤드라인 (EN ≤ 90자, AP 스타일 / ZH ≤ 30자)
date: 2026-10-26T20:20:00+09:00
category: EN = Policy | Markets | Industry | Exchanges | Technology | Global
          ZH = 政策 | 市场 | 产业 | 交易所 | 技术 | 海外
author: Scott Park (두 에디션 동일)
region: EN = US | EU | Singapore / ZH = 香港 | 新加坡 | 中国大陆 | 海外
summary: 1–2문장 스탠드퍼스트
---
```
본문 구조 — EN: 리드 → `## What happened` → `## The debate` → `## What it means` → `*This article is for information only and is not investment advice.*` → `**Sources**` (3–6 링크).
ZH: 리드 → `## 发生了什么` → `## 争议焦点` → `## 影响与展望` → `*本文仅供参考，不构成投资建议。*` → `**参考来源**`.
분량: EN 900–1,400 words / ZH 1,800–2,800자.

## 속보 frontmatter
```
---
title: 사실 위주 헤드라인
time: 2026-10-26T20:05:00+09:00
category: EN = Bitcoin | Altcoins | Listings | Regulation | Macro | On-chain | Exchanges | US | Europe | Singapore
          ZH = 比特币 | 山寨币 | 上币 | 监管 | 宏观 | 链上 | 交易所 | 香港 | 新加坡 | 海外
important: true (시장을 움직이는 뉴스만) / false
---
2–3문장, 직접 쓴 문장. [Source: 매체](URL)  (ZH: [来源: 媒体](URL))
```

## 편집 원칙 (ARTICLE_GUIDE.md와 동일)
- 핵심 사실은 독립 출처 2곳 이상으로 확인. 인용·숫자·이름·날짜를 지어내지 않는다.
- 직접 인용은 기사당 1개, 15단어(중국어 25자) 미만. 원문 문장·구조를 따라 쓰지 않는다.
- 가격 전망·투자 권유 금지.
- 중국어는 간체. 홍콩 SFC·HKMA, 싱가포르 MAS 1차 자료를 우선. 본토 뉴스는 사실만 건조하게.
- 영어는 미국 SEC·CFTC·연준·재무부, EU ESMA·MiCA, 싱가포르 MAS 1차 자료 우선.

## Voice — write like a human reporter (세준 지시 2026-11-02: 기사가 기계가 쓴 것처럼 딱딱함)
- Open with a concrete fact, scene, number or person — never an abstract summary sentence.
- Headings come from the story itself (e.g. "Why Korea made the list"), never template headings like "What happened / Why it matters / What's next / The bottom line / Key takeaways". Short pieces need no headings.
- Mix sentence lengths. Explain jargon once in plain words. Compare big numbers to something readers know.
- End on the next concrete event (date, vote, deadline), not a moral or summary.
- English words to cut: delve, landscape, navigate, underscore(s), pivotal, crucial, robust, notably, it's worth noting, in a move that, amid (more than once), signals (as a verb, more than once), poised to, sparked, a testament to, game-changer, unprecedented, in conclusion, overall, ultimately. No em-dash chains; max one em dash per paragraph.
- 中文避免的套话：值得注意的是、不难看出、综上所述、总而言之、意义重大、引发广泛关注、备受瞩目、持续发酵、新的阶段、进一步、赋能、助力、加速推进、业内人士认为（没有具体来源时）。小标题用内容本身，不用「事件回顾／各方观点／未来展望」这类模板。
- Before publishing: read it through once out loud — remove the words above, break up three sentences in a row with the same shape, rename any template heading, fix anything a real reporter wouldn't say.
