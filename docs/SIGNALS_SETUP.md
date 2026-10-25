# 체인브리프 시그널 — 켜는 방법 (세준이 할 일)

코드는 다 준비돼 있어요. 아래 계정·키만 만들어서 GitHub에 넣으면, **Actions → 시그널 봇 배포 → Run workflow** 한 번으로 봇·대시보드·결제가 켜져요.

## 1. 텔레그램 (10분)
1. 텔레그램에서 **@BotFather** → `/newbot` → 이름 `체인브리프 시그널`, 아이디 예: `chainbrief_signals_bot` → **봇 토큰** 복사
2. **공개 채널 2개** 만들기 (무료): 예 `@chainbrief_signals`(한국어), `@chainbrief_signals_en`(영어) → 각 채널에 봇을 **관리자**로 추가
3. **비공개 채널 2개** 만들기 (프로): `체인브리프 시그널 PRO`, `CHAINBRIEF Signals PRO` → 봇을 관리자로 추가하고 권한 중 **초대 링크 만들기**, **사용자 차단** 켜기
4. 비공개 채널 ID: web.telegram.org 에서 채널을 열면 주소 끝에 `-100…` 숫자가 보여요 → 그 숫자

## 2. Cloudflare (무료, 10분)
1. cloudflare.com 가입 → 왼쪽 **Workers & Pages** 를 한 번 열어서 workers.dev 주소 이름 정하기
2. 오른쪽 위 프로필 → **My Profile → API Tokens → Create Token → Create Custom Token**
   - 권한: `Account · Workers Scripts · Edit`, `Account · D1 · Edit`, `Account · Account Settings · Read`
3. 토큰 복사 + 대시보드 오른쪽의 **Account ID** 복사

## 3. 결제 받을 지갑
- USDT **TRON(TRC20)** 주소 하나 (본인 개인 지갑 권장 — TronLink, Trust Wallet 등). 주소만 넣고 개인키는 절대 어디에도 넣지 않아요.
- (선택) trongrid.io 무료 API 키 — 구독자가 많아지면 넣기

## 4. GitHub에 넣기
저장소 **Settings → Secrets and variables → Actions → New repository secret**

| 이름 | 값 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 2번 토큰 |
| `CLOUDFLARE_ACCOUNT_ID` | 2번 Account ID |
| `TELEGRAM_BOT_TOKEN` | 1번 봇 토큰 |
| `TG_CHANNEL_KO` / `TG_CHANNEL_EN` | `@chainbrief_signals` / `@chainbrief_signals_en` |
| `TG_PRO_KO` / `TG_PRO_EN` | 비공개 채널 ID (`-100…`) |
| `PAY_TRON_ADDRESS` | 결제 받을 TRC20 주소 |
| `ADMIN_CHAT_ID` | 배포 후 봇에게 `/id` 보내서 나온 숫자 (나중에 넣고 다시 배포) |
| `ETHERSCAN_API_KEY` (선택) | etherscan.io 무료 키 — 고래(스테이블코인 대량 이동) 알림 |
| `TRONGRID_API_KEY` (선택) | trongrid.io 무료 키 |

요금·지연 시간은 Variables 탭에서 바꿀 수 있어요: `PRICE_MONTH`(기본 19), `PRICE_QUARTER`(기본 49), `FREE_DELAY_MIN`(기본 15).

## 5. 켜기
**Actions → 시그널 봇 배포 → Run workflow** → 끝나면 사이트 `/signals/` 에 실시간 차트가 뜨고, 봇이 알림을 보내기 시작해요.

## 운영
- 결제 들어오면 세준한테 💰 알림 → 봇에 `/stats` 로 구독자·매출 확인
- 금액을 잘못 보낸 사람: 거래 확인 후 `/grant <chat_id> 30` 으로 수동 지급
- 구조: Cloudflare Worker(`bot/`)가 1분마다 데이터 수집 → D1 저장 → 텔레그램 발송, 사이트 대시보드는 Worker API를 읽음
- 무료 한도: Cloudflare Workers 무료 플랜으로 충분 (프로 채널 방식이라 구독자가 늘어도 발송량이 같음)

## 참고 (법·세무)
유료 구독으로 수익이 나면 사업자등록과 통신판매업 신고가 필요할 수 있고, USDT로 받은 매출도 과세 대상이에요. 가상자산 정보 서비스의 유사투자자문업 해당 여부는 세무사·변호사에게 한 번 확인받는 걸 권해요.
