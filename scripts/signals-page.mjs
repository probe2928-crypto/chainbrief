// 시그널 대시보드 페이지 (한·영·중 공통 마크업)
export const SIG_T = {
  ko: { title: "체인브리프 시그널", desc: "펀딩비 급변, 대량 청산, 고래 이동, 김프를 실시간으로 추적하고 텔레그램으로 알려드려요.", status: "불러오는 중…", updated: "{t} 업데이트 · 1분마다", err: "연결 지연 — 잠시 뒤 다시 시도해요",
    soon: "곧 시작해요", soonX: "알림 서버를 여는 중이에요. 텔레그램 채널이 열리면 이 페이지에 실시간 차트와 알림이 함께 나와요.",
    join: "텔레그램 알림 받기", joinEn: "English channel", kBtc: "BTC 김프", kUsdt: "USDT 김프", l1: "1시간 청산", l24: "24시간 청산", longs: "롱", shorts: "숏", long1: "롱", short1: "숏",
    gKimp: ["Korea Premium", "김치 프리미엄 · 48시간"], gLiq: ["Liquidations", "청산 · 24시간 (OKX)"], gFund: ["Funding", "펀딩비 · 48시간 (Bitget, 8시간 기준)"], gAlerts: ["Alerts", "최근 알림"],
    big: "24시간 최대 청산", top: "펀딩비 높은 종목", bot: "펀딩비 낮은 종목", collecting: "데이터를 모으는 중이에요.", noLiq: "24시간 안에 집계된 청산이 없어요.", noAlerts: "아직 보낸 알림이 없어요.",
    pro: ["Pro", "프로 구독"], proX: "모든 알림을 즉시 받아요. 무료 채널은 주요 알림만 15분 늦게 받아요.", perks: ["모든 알림 즉시 (무료 채널보다 15분 빠르게)", "펀딩비 · 청산 · 고래 · 김프 전 종류", "매일 아침 시장 요약", "비공개 프로 채널"], month: "1개월", quarter: "3개월", save: "약 14% 할인", payNote: "결제는 USDT (TRON · TRC20). 봇이 사람마다 다른 금액을 안내하고, 입금이 확인되면 1~3분 안에 자동으로 켜져요.", subscribe: "텔레그램 봇에서 구독하기", soonPay: "구독 결제는 곧 열려요",
    rules: "알림 기준: 펀딩비 ±0.10% 이상이거나 5분 새 0.05%p 넘게 변할 때(거래대금 $20M 이상 종목) · 단일 청산 $1M 이상, 1분 합계 $5M 이상 · BTC 김프가 2·3·4·5% 같은 구간을 넘거나 30분 새 0.8%p 넘게 움직일 때 · 스테이블코인 $50M 이상 이동, $10M 이상 발행·소각.",
    note: "참고용 정보이며 투자 권유가 아니에요. 데이터: Bitget, OKX, 업비트, Etherscan, open.er-api.com.",
    slides: [["Funding", "펀딩비가 급변하면 바로", "롱·숏 쏠림이 커지는 순간을 5분마다 전 종목에서 잡아내요."], ["Liquidations", "대량 청산을 1분 안에", "100만 달러가 넘는 청산과 1분 새 몰린 청산을 알려드려요."], ["Korea Premium", "김프 구간 돌파", "BTC·USDT 김프가 주요 구간을 넘거나 급하게 움직이면 알려드려요."]] },
  en: { title: "CHAINBRIEF Signals", desc: "Real-time funding swings, large liquidations, whale moves and the Korea premium — tracked live and pushed to Telegram.", status: "Loading…", updated: "Updated {t} · every minute", err: "Connection delayed — retrying shortly",
    soon: "Launching soon", soonX: "The alert server is being switched on. Once the Telegram channel opens, live charts and alerts appear here.",
    join: "Get alerts on Telegram", joinEn: "Korean channel", kBtc: "BTC Korea premium", kUsdt: "USDT premium", l1: "Liquidations · 1h", l24: "Liquidations · 24h", longs: "Longs", shorts: "Shorts", long1: "long", short1: "short",
    gKimp: ["Korea Premium", "Kimchi premium · 48 hours"], gLiq: ["Liquidations", "Liquidations · 24 hours (OKX)"], gFund: ["Funding", "Funding rates · 48 hours (Bitget, per 8h)"], gAlerts: ["Alerts", "Latest alerts"],
    big: "Largest liquidations · 24h", top: "Highest funding", bot: "Lowest funding", collecting: "Collecting data.", noLiq: "No liquidations recorded in the last 24 hours.", noAlerts: "No alerts sent yet.",
    pro: ["Pro", "Signals Pro"], proX: "Every alert, instantly. The free channel gets major alerts 15 minutes later.", perks: ["Every alert instantly (15 min ahead of the free channel)", "Funding · liquidations · whales · Korea premium", "Daily market brief", "Private Pro channel"], month: "1 month", quarter: "3 months", save: "save ~14%", payNote: "Pay in USDT (TRON · TRC20). The bot gives you a unique amount and Pro switches on automatically 1–3 minutes after payment.", subscribe: "Subscribe in Telegram", soonPay: "Subscriptions open soon",
    rules: "Alert rules: funding at ±0.10% or a 0.05pt swing within 5 minutes (pairs with $20M+ volume) · single liquidations of $1M+, or $5M+ within a minute · BTC Korea premium crossing 2/3/4/5% or moving 0.8pt within 30 minutes · stablecoin transfers of $50M+, mints or burns of $10M+.",
    note: "For information only, not investment advice. Data: Bitget, OKX, Upbit, Etherscan, open.er-api.com.",
    slides: [["Funding", "Funding swings, the moment they happen", "Every perpetual pair scanned every five minutes for crowded longs and shorts."], ["Liquidations", "Large liquidations within a minute", "Single liquidations above $1M and one-minute bursts above $5M."], ["Korea Premium", "When the kimchi premium breaks out", "BTC and USDT premium crossing key levels or moving fast."]] },
  zh: { title: "链报信号", desc: "资金费率异动、大额爆仓、巨鲸转账与韩国溢价，实时追踪并推送到 Telegram。", status: "加载中…", updated: "{t} 更新 · 每分钟", err: "连接延迟 — 稍后重试",
    soon: "即将上线", soonX: "提醒服务器正在开启。Telegram 频道上线后，这里会显示实时图表与提醒。",
    join: "Telegram 提醒（英文）", joinEn: "韩文频道", kBtc: "BTC 泡菜溢价", kUsdt: "USDT 溢价", l1: "1 小时爆仓", l24: "24 小时爆仓", longs: "多头", shorts: "空头", long1: "多", short1: "空",
    gKimp: ["Korea Premium", "泡菜溢价 · 48 小时"], gLiq: ["Liquidations", "爆仓 · 24 小时（OKX）"], gFund: ["Funding", "资金费率 · 48 小时（Bitget，8 小时）"], gAlerts: ["Alerts", "最新提醒"],
    big: "24 小时最大爆仓", top: "资金费率最高", bot: "资金费率最低", collecting: "正在收集数据。", noLiq: "过去 24 小时没有记录到爆仓。", noAlerts: "暂未发送提醒。",
    pro: ["Pro", "信号 Pro"], proX: "所有提醒即时送达；免费频道仅推送重要提醒并延迟 15 分钟。", perks: ["所有提醒即时送达（比免费频道快 15 分钟）", "资金费率 · 爆仓 · 巨鲸 · 韩国溢价", "每日市场简报", "专属私密频道"], month: "1 个月", quarter: "3 个月", save: "约省 14%", payNote: "使用 USDT（TRON · TRC20）付款。机器人会给出专属金额，到账后 1–3 分钟自动开通。", subscribe: "在 Telegram 订阅", soonPay: "订阅即将开放",
    rules: "提醒规则：资金费率达到 ±0.10% 或 5 分钟内变化超过 0.05 个百分点（成交额 2000 万美元以上）· 单笔爆仓 100 万美元以上或 1 分钟合计 500 万美元以上 · BTC 溢价突破 2/3/4/5% 或 30 分钟内变动 0.8 个百分点 · 稳定币转账 5000 万美元以上、增发或销毁 1000 万美元以上。",
    note: "仅供参考，不构成投资建议。数据：Bitget、OKX、Upbit、Etherscan、open.er-api.com。",
    slides: [["Funding", "资金费率异动，第一时间知道", "每 5 分钟扫描全部永续合约，捕捉多空拥挤。"], ["Liquidations", "1 分钟内的大额爆仓", "单笔超过 100 万美元、1 分钟合计超过 500 万美元的爆仓。"], ["Korea Premium", "泡菜溢价突破关键位", "BTC 与 USDT 溢价突破关键位或快速波动时提醒。"]] },
};
export function signalsBody({ lang, hero, secHead, esc, sig, tz, locale }) {
  const t = SIG_T[lang], api = sig.api || "";
  const ch = (h) => (h ? `https://t.me/${h.replace(/^@/, "")}` : "");
  const main = lang === "ko" ? sig.channelKo : sig.channelEn, other = lang === "ko" ? sig.channelEn : sig.channelKo;
  const grp = ([a, b]) => `<h3 class="grp"><span class="label">${a}</span>${esc(b)}</h3>`;
  const ctas = `<div class="sig-cta">${main ? `<a class="btn" href="${ch(main)}" target="_blank" rel="noopener">${esc(t.join)} · ${esc(main)}</a>` : ""}${other ? `<a class="btn ghost" href="${ch(other)}" target="_blank" rel="noopener">${esc(t.joinEn)}</a>` : ""}</div>`;
  const body = api ? `
    <div class="summary" id="sigKpi"></div>
    ${grp(t.gKimp)}<figure class="chart" id="chKimp" data-title="${esc(t.gKimp[1])}"></figure>
    ${grp(t.gLiq)}<div class="sig-two"><figure class="chart" id="chLiq" data-title="${esc(t.gLiq[1])}"></figure><section class="sboard"><div class="block-head"><h2>${esc(t.big)}</h2><span class="label">OKX</span></div><ol class="rank" id="sigBig"></ol></section></div>
    ${grp(t.gFund)}<figure class="chart" id="chFund" data-title="${esc(t.gFund[1])}"></figure>
    <div class="surge"><section class="sboard"><div class="block-head"><h2>${esc(t.top)}</h2><span class="label">8H</span></div><ol class="rank" id="sigTop"></ol></section><section class="sboard"><div class="block-head"><h2>${esc(t.bot)}</h2><span class="label">8H</span></div><ol class="rank" id="sigBot"></ol></section></div>
    ${grp(t.gAlerts)}<ol class="sig-alerts" id="sigAlerts"></ol>`
    : `<div class="notice-box" style="margin-top:28px"><strong>${esc(t.soon)}</strong><br>${esc(t.soonX)}</div>`;
  const pm = sig.priceMonth || 19, pq = sig.priceQuarter || 49;
  const proBlock = `${grp(t.pro)}<div class="pro"><div class="pro-copy"><p>${esc(t.proX)}</p><ul>${t.perks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
    <div class="plans"><div class="plan"><span class="label">${esc(t.month)}</span><strong>${pm}<small> USDT</small></strong></div><div class="plan hi"><span class="label">${esc(t.quarter)} · ${esc(t.save)}</span><strong>${pq}<small> USDT</small></strong></div>
    ${sig.bot && sig.pay !== false ? `<a class="btn" href="https://t.me/${esc(sig.bot)}?start=pro" target="_blank" rel="noopener">${esc(t.subscribe)}</a>` : `<span class="btn ghost" aria-disabled="true">${esc(t.soonPay)}</span>`}
    <p class="pay-note">${esc(t.payNote)}</p></div></div>`;
  return `${hero(t.slides.map(([eye, title, dek], i) => ({ art: ["gold-silk", "smoke", "rose-dusk"][i], eye, title, dek, href: api ? ["#chFund", "#chLiq", "#chKimp"][i] : "#sigApp", cta: { ko: "바로 보기", en: "View", zh: "查看" }[lang] })), "sm")}<div class="wrap"><main class="single wide-single" id="sigApp"><section>
  ${secHead("Signals", esc(t.title), `<span class="status" id="sigStatus">${api ? esc(t.status) : esc(t.soon)}</span>`)}
  <p class="sig-desc">${esc(t.desc)}</p>${ctas}
  ${body}
  ${proBlock}
  <p class="note">${esc(t.rules)}</p><p class="note">${esc(t.note)}</p>
  </section></main></div>
  <script>window.SIG=${JSON.stringify({ api, lang, tz, locale, t })}</script>`;
}
