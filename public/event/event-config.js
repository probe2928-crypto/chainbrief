/* 체인브리프 회원가입 이벤트 설정 — 계획·근거: ops/events/PLAN.md
   enabled 를 true 로 바꾸는 것 = 공개. 로그인(site-auth)이 켜지고, Supabase 에 ops/events/schema.sql 실행 +
   ev_events 에 이번 회차 행(status 'open')을 넣은 뒤에만 켠다. 미리보기: 로컬에서 ?event_preview=1 */
window.SITE_EVENT = {
  enabled: false,
  site: "chainbrief",
  lang: "ko",
  kind: "draw",
  id: "cb-2026-12",                       // Supabase ev_events.id 와 같아야 한다 (매달 바꾼다)
  rulesUrl: document.currentScript ? document.currentScript.src.replace(/event-config\.js.*$/, "") : "event/",   // 규칙 페이지 = 이 파일이 있는 폴더
  versions: { rules: "2026-11-02", consent: "ev-2026-11-02", marketing: "2026-11-02" },
  width: "1240px",
  theme: { ink: "var(--ink)", paper: "var(--paper)", accent: "var(--ink)", muted: "var(--mute)", line: "var(--line)", wash: "var(--wash)", radius: "0px",
           font: "var(--f-sans)", display: "var(--f-serif)" },
  banner: {
    mount: ".wrap:has(> main.grid)",       // 홈 속보 영역 바로 위 (전체 폭 띠)
    where: "beforebegin",
    figure: "7명",
    figureNote: "매달 추첨",
    title: "가입만 해도 응모 — 테더·솔라나·이더리움 20 USDT 상당",
    body: "체인브리프 회원이면 누구나 무료로 한 번 응모할 수 있어요. 구매·입금·거래 조건은 없습니다.",
    cta: "응모 방법 보기",
    label: "회원가입 이벤트"
  },
  entry: {
    title: "12월 추첨 응모",
    loginNote: "로그인한 회원만 응모할 수 있어요. 가입은 무료이고 1분이면 끝나요.",
    afterNote: "추첨은 1월 4일, 발표는 1월 5일이에요. 당첨되면 가입한 이메일로 수령 방법을 알려드려요.",
    attest: [
      { label: "만 19세 이상이고 대한민국에 거주합니다" },
      { label: '<a href="#rules" style="text-decoration:underline;text-underline-offset:3px">이벤트 규칙</a>을 읽었고 동의합니다' },
      { label: "응모 개인정보 수집·이용에 동의합니다",
        detail: "<b>목적</b> 추첨, 당첨 안내, 부정 응모 확인<br><b>항목</b> 회원 이메일(가입 정보에서 확인), 거주 국가, 응모 일시<br><b>보유 기간</b> 당첨자 발표 후 30일 뒤 파기(당첨자는 경품 지급 후 30일 뒤 파기)<br><b>제3자 제공</b> 없음<br>동의하지 않을 수 있으며, 이 경우 응모할 수 없어요. 회원 이용에는 영향이 없어요." }
    ],
    marketing: ["email", "kakao"]
  }
};
(function () {
  var C = window.SITE_EVENT, local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!C.enabled && !(local && /[?&]event_preview=1(&|$)/.test(location.search)) && !document.documentElement.hasAttribute("data-event-page")) return;
  var s = document.createElement("script"); s.src = (document.currentScript && document.currentScript.src || "").replace(/event-config\.js.*$/, "event.js"); s.defer = true; document.head.appendChild(s);
})();
