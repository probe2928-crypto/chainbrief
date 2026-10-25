# 체인브리프 시그널 — 켜는 방법 (15분)

## 1. 텔레그램 봇 만들기 (2분, 세준)
텔레그램에서 **@BotFather** → `/newbot` → 이름 `체인브리프 시그널` → 아이디 예: `chainbrief_signals_bot` → 받은 **토큰**을 복사해 둬요.

## 2. 채널 만들기 (5분)
- 무료 공개 채널 2개: 예 `@chainbrief_signals`(한국어), `@chainbrief_signals_en`(영어)
- (선택) 프로 비공개 채널 2개 — 없으면 프로 알림은 봇 대화로 가요 (구독자 40명까지 충분)
- 각 채널에 봇을 **관리자**로 추가 (비공개 채널은 '초대 링크 만들기', '사용자 차단' 권한 켜기)

## 3. 서버 켜기 (5분, 버튼 하나)
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/probe2928-crypto/chainbrief/tree/main/bot)

1. 버튼 → Cloudflare 로그인 (없으면 무료 가입) → GitHub 연결
2. 입력칸: `TELEGRAM_BOT_TOKEN`(1번 토큰), `TG_CHANNEL_KO`, `TG_CHANNEL_EN`, `PAY_TRON_ADDRESS`(USDT TRC20 받을 본인 지갑 주소, 비우면 무료 모드) — 나머지는 비워도 돼요
3. **Deploy** → 끝나면 나오는 `https://chainbrief-signals.….workers.dev` 주소를 열기 → 설정 확인 페이지에서 ✓ 확인 (봇 연결은 자동)

## 4. 마무리 (1분)
- 봇에게 `/claim <봇 토큰 마지막 6글자>` → 관리자 등록 (결제 알림·`/stats`·`/grant`)
- workers.dev 주소를 Claude에게 알려주면 체인브리프 `/signals/` 대시보드에 연결해요

## 나중에 바꾸기
Cloudflare → Workers → chainbrief-signals → Settings → Variables and Secrets
- 요금 `PRICE_MONTH`(19) `PRICE_QUARTER`(49), 무료 지연 `FREE_DELAY_MIN`(15), 프로 채널 `TG_PRO_KO`/`TG_PRO_EN`
- (선택) 고래 알림 `ETHERSCAN_API_KEY`, 결제 조회 `TRONGRID_API_KEY` — 둘 다 무료 키
값을 바꾼 뒤 워커 주소를 다시 열면 설정이 다시 확인돼요.

## 다른 방법 (GitHub Actions)
Cloudflare API 토큰(Workers Scripts·D1 Edit, Account Settings Read)과 Account ID를 저장소 Secrets(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TELEGRAM_BOT_TOKEN`)에, 채널·주소는 Variables에 넣고 Actions → 시그널 봇 배포 → Run workflow.

## 참고 (법·세무)
유료 구독으로 수익이 나면 사업자등록과 통신판매업 신고가 필요할 수 있고, USDT로 받은 매출도 과세 대상이에요. 세무사·변호사에게 한 번 확인받는 걸 권해요.
