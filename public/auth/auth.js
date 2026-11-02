/* site-auth v1 — 모든 사이트가 같이 쓰는 회원 로그인 (Supabase Auth)
   주소: https://probe2928-crypto.github.io/chainbrief/auth/auth.js
   각 사이트는 자기 저장소의 auth-config.js 에서 window.SITE_AUTH 를 정하고, url·anonKey 가 채워졌을 때만 이 파일을 불러온다.
   설정이 없거나 비어 있으면 아무것도 하지 않는다(화면 변화 0).

   window.SITE_AUTH = {
     url: "https://<project-ref>.supabase.co", anonKey: "<anon 또는 publishable 키>",   // 서비스 롤 키는 절대 넣지 않는다
     site: "qurator",                    // qurator | perpline | luft | lifejunjun | chainbrief
     providers: ["google","kakao","apple","email"],
     naver: "hidden",                    // "hidden"(기본) | "soon"(준비 중 버튼) | "https://…/naver-start"(2단계 Edge Function 주소)
     lang: "ko",                         // ko | en (비우면 <html lang>)
     mount: "[data-auth-slot]",          // 헤더 로그인 자리
     buttonClass: "",                    // 사이트 자체 링크/버튼 클래스(톤 맞춤)
     brand: "QURATOR",                   // 처리결과 통지에 쓰는 전송자 이름
     links: { terms: "terms.html", privacy: "privacy.html" },
     versions: { terms: "2026-11-02", privacy: "2026-11-02", marketing: "2026-11-02" },
     channels: ["email","kakao","sms"],  // 마케팅 수신 채널(체크박스 분리)
     night: true,                        // 야간(21~08시) 수신 선택 항목
     theme: { ink: "#111", paper: "#fff", accent: "#111", muted: "#5c5c5c", line: "#e4e0d8", radius: "10px" },
     iapNotice: false                    // true: 탈퇴 화면에 앱스토어 구독 해지 안내
   };
   공개 API: window.SiteAuth = { open(mode), close(), user(), me(), client, onChange(fn) } — 기능별 로그인 요구에 쓴다. */
(function () {
  "use strict";
  var C = window.SITE_AUTH;
  if (!C || typeof C !== "object" || !C.url || !C.anonKey || !C.site || window.__siteAuth) return;
  window.__siteAuth = 1;

  var SB_SRC = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js";
  var SITE = String(C.site);
  var LANG = (C.lang || document.documentElement.lang || "ko").slice(0, 2) === "en" ? "en" : "ko";
  var PROVIDERS = C.providers || ["google", "kakao", "apple", "email"];
  var CHANNELS = C.channels || ["email", "kakao", "sms"];
  var V = Object.assign({ terms: "2026-11-02", privacy: "2026-11-02", marketing: "2026-11-02" }, C.versions || {});
  var LINKS = C.links || {};
  var KEY = "sa-" + SITE;            // 같은 github.io 도메인을 쓰는 사이트끼리 세션이 섞이지 않게 사이트별 저장 키
  var T0 = {
    ko: {
      signin: "로그인", account: "내 계정", title_in: "로그인", title_up: "회원가입", title_finish: "가입 마무리",
      lead_in: "쓰던 방법으로 로그인하세요.", lead_up: "필수 항목에 동의하고 가입 방법을 고르세요.",
      lead_finish: "처음 오셨네요. 아래 필수 항목에 동의하면 가입이 끝나요.",
      google: "Google로 계속하기", kakao: "카카오로 계속하기", apple: "Apple로 계속하기", naver: "네이버로 계속하기", naver_soon: "네이버 로그인 · 준비 중",
      email: "이메일로 계속하기", or: "또는", no_account: "처음이신가요?", go_up: "회원가입", has_account: "이미 회원인가요?", go_in: "로그인",
      all: "전체 동의", all_hint: "선택 항목은 아래에서 따로 해제할 수 있어요.",
      req: "필수", opt: "선택", terms: "이용약관 동의", privacy: "개인정보 수집·이용 동의", age: "만 14세 이상입니다",
      mkt: "마케팅 목적 개인정보 이용 및 광고성 정보 수신", ch_email: "이메일", ch_kakao: "카카오톡", ch_sms: "문자",
      night: "야간(21시~다음 날 8시) 광고성 정보 수신", view: "보기", hide: "접기",
      privacy_detail: "<b>수집 항목</b> 이메일, 이름·닉네임(소셜 계정이 주는 경우), 소셜 계정 식별값, 가입한 사이트·유입 경로, 접속 기록<br><b>목적</b> 회원 식별과 로그인, 서비스 제공, 문의 응대, 부정 이용 방지<br><b>보유 기간</b> 회원 탈퇴 시까지(법령에 따라 보관해야 하는 기록은 그 기간까지)<br>동의를 거부할 수 있지만, 거부하면 가입할 수 없어요.",
      mkt_detail: "<b>보내는 곳</b> {senders}<br><b>항목</b> 이메일, 카카오톡 채널 연결 정보, 휴대폰 번호(직접 입력한 경우)<br><b>목적</b> 새 소식·이벤트·혜택 등 광고성 정보 전송<br><b>보유 기간</b> 동의 철회 또는 탈퇴 시까지<br>동의하지 않아도 가입과 이용에는 아무 제한이 없어요. 언제든 내 계정에서 끌 수 있어요.",
      under14: "만 14세 미만은 가입할 수 없어요.",
      need: "필수 항목 3개에 동의해 주세요.",
      email_label: "이메일", pw_label: "비밀번호 (선택)", pw_hint: "비우면 로그인 링크를 메일로 보내 드려요.",
      send_link: "로그인 링크 받기", pw_login: "로그인", pw_signup: "가입하기", forgot: "비밀번호를 잊었어요", back: "다른 방법 선택",
      link_sent: "메일을 보냈어요. 받은 편지함의 링크를 누르면 로그인돼요.", reset_sent: "비밀번호 재설정 메일을 보냈어요.",
      new_pw: "새 비밀번호", save_pw: "비밀번호 저장", pw_saved: "비밀번호를 바꿨어요.",
      finish: "동의하고 가입 완료", cancel_signup: "가입하지 않기",
      signed_as: "로그인 계정", joined: "가입일", via: "가입 방법", settings: "마케팅 수신 설정",
      settings_hint: "채널마다 따로 켜고 끌 수 있어요. 바꾸면 바로 반영돼요.",
      consent_on: "동의", consent_off: "미동의", since: "동의일", next_check: "다음 확인 안내",
      notice_on: "{brand}: {date} {ch} 광고성 정보 수신에 동의하셨어요.", notice_off: "{brand}: {date} {ch} 광고성 정보 수신 거부가 처리됐어요.",
      signout: "로그아웃", withdraw: "회원 탈퇴", withdraw_title: "회원 탈퇴",
      withdraw_lead: "탈퇴하면 이 사이트의 회원 정보가 바로 지워지고 되돌릴 수 없어요.",
      withdraw_site: "이 사이트에서만 탈퇴", withdraw_all: "같은 계정으로 가입한 모든 사이트에서 탈퇴(계정 삭제)",
      withdraw_other: "이 계정은 다른 사이트에도 가입돼 있어요: {sites}",
      iap: "앱스토어(Apple·Google)에서 결제한 구독은 탈퇴로 해지되지 않아요. 스토어의 구독 관리에서 먼저 해지해 주세요.",
      withdraw_go: "탈퇴하기", withdraw_done: "탈퇴가 처리됐어요. 이용해 주셔서 고마웠어요.", close: "닫기",
      err: "잠시 문제가 생겼어요. 다시 시도해 주세요.", err_email: "이메일 주소를 확인해 주세요.",
      err_cred: "이메일 또는 비밀번호가 맞지 않아요.", err_nouser: "가입된 이메일이 아니에요. 회원가입을 눌러 주세요.",
      loading: "처리 중…", welcome: "가입을 환영해요.", signed_out: "로그아웃했어요."
    },
    en: {
      signin: "Sign in", account: "Account", title_in: "Sign in", title_up: "Create account", title_finish: "Finish signing up",
      lead_in: "Use the method you signed up with.", lead_up: "Agree to the required items, then pick a method.",
      lead_finish: "Welcome. Agree to the required items below to finish.",
      google: "Continue with Google", kakao: "Continue with Kakao", apple: "Continue with Apple", naver: "Continue with Naver", naver_soon: "Naver · coming soon",
      email: "Continue with email", or: "or", no_account: "New here?", go_up: "Create account", has_account: "Already a member?", go_in: "Sign in",
      all: "Agree to all", all_hint: "You can untick optional items below.",
      req: "Required", opt: "Optional", terms: "Terms of Service", privacy: "Collection and use of personal data", age: "I am 14 or older",
      mkt: "Use of personal data for marketing and receiving promotions", ch_email: "Email", ch_kakao: "KakaoTalk", ch_sms: "Text",
      night: "Promotions at night (9 pm to 8 am)", view: "View", hide: "Hide",
      privacy_detail: "<b>Data</b> email, name or nickname (if the social account shares it), social account ID, sign-up site and referral, access logs<br><b>Purpose</b> identifying you and signing you in, providing the service, support, abuse prevention<br><b>Kept</b> until you delete your account (records the law requires us to keep are held for that period)<br>You may refuse, but you cannot sign up without it.",
      mkt_detail: "<b>From</b> {senders}<br><b>Data</b> email, KakaoTalk channel link, phone number (if you enter one)<br><b>Purpose</b> news, events and offers<br><b>Kept</b> until you withdraw consent or delete your account<br>Saying no has no effect on your account. You can turn this off any time in Account.",
      under14: "You must be 14 or older to sign up.",
      need: "Please agree to the 3 required items.",
      email_label: "Email", pw_label: "Password (optional)", pw_hint: "Leave it empty and we will email you a sign-in link.",
      send_link: "Email me a link", pw_login: "Sign in", pw_signup: "Sign up", forgot: "Forgot password", back: "Other methods",
      link_sent: "Check your inbox and open the link to sign in.", reset_sent: "We sent a password reset email.",
      new_pw: "New password", save_pw: "Save password", pw_saved: "Password updated.",
      finish: "Agree and finish", cancel_signup: "Don't sign up",
      signed_as: "Signed in as", joined: "Joined", via: "Method", settings: "Marketing preferences",
      settings_hint: "Turn each channel on or off. Changes apply right away.",
      consent_on: "On", consent_off: "Off", since: "Since", next_check: "Next reminder",
      notice_on: "{brand}: on {date} you agreed to receive promotions by {ch}.", notice_off: "{brand}: on {date} we stopped promotions by {ch}.",
      signout: "Sign out", withdraw: "Delete account", withdraw_title: "Delete account",
      withdraw_lead: "Your membership data on this site is deleted right away. This cannot be undone.",
      withdraw_site: "Leave this site only", withdraw_all: "Leave every site that uses this account (delete account)",
      withdraw_other: "This account is also used on: {sites}",
      iap: "Subscriptions bought through the App Store or Google Play are not cancelled by deleting your account. Cancel them in your store's subscription settings first.",
      withdraw_go: "Delete", withdraw_done: "Your account has been deleted. Thank you for being here.", close: "Close",
      err: "Something went wrong. Please try again.", err_email: "Please check the email address.",
      err_cred: "Email or password is incorrect.", err_nouser: "No account with this email. Choose Create account.",
      loading: "Working…", welcome: "Welcome aboard.", signed_out: "Signed out."
    }
  };
  var T = T0[LANG];
  var SITE_NAMES = { qurator: "QURATOR", perpline: "Perpline", luft: "LUFT", lifejunjun: LANG === "en" ? "Life Junjun" : "인생준준", chainbrief: LANG === "en" ? "CHAINBRIEF" : "체인브리프" };
  var BRAND = C.brand || SITE_NAMES[SITE] || SITE;
  // 광고성 정보를 보내는 서비스 목록(동의 문구에 표시). 기본: 통합 회원을 쓰는 다섯 사이트, 이 사이트가 맨 앞
  var SENDERS = (C.senders || [SITE].concat(["qurator", "luft", "lifejunjun", "perpline", "chainbrief"].filter(function (s) { return s !== SITE; }))).map(function (s) { return SITE_NAMES[s] || s; }).join(LANG === "en" ? ", " : "·");

  /* ---------- 작은 도구 ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k] == null ? "" : o[k]; }); }
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function ss(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || "null"); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function day(d) { if (!d) return ""; var x = new Date(d); return isNaN(x) ? "" : x.getFullYear() + "-" + ("0" + (x.getMonth() + 1)).slice(-2) + "-" + ("0" + x.getDate()).slice(-2); }
  function chName(c) { return T["ch_" + c] || (c === "night" ? T.night : c); }

  /* 첫 방문 유입 경로(UTM·r·ref) — 가입 시 memberships.source/utm 으로 저장 */
  (function captureUtm() {
    try {
      var p = new URLSearchParams(location.search), u = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "r", "ref", "from"].forEach(function (k) { var v = p.get(k); if (v) u[k] = v.slice(0, 120); });
      var ref = document.referrer && document.referrer.indexOf(location.origin) !== 0 ? document.referrer.slice(0, 200) : "";
      if (!ls(KEY + "-utm") && (Object.keys(u).length || ref)) ls(KEY + "-utm", { utm: u, referrer: ref, landing: location.pathname, at: new Date().toISOString() });
    } catch (e) {}
  })();

  /* ---------- 스타일 (shadow DOM 안 — 사이트 CSS와 섞이지 않음) ---------- */
  var th = Object.assign({ ink: "#141414", paper: "#ffffff", accent: "#141414", muted: "#5b5b5b", line: "#e3e0da", radius: "10px" }, C.theme || {});
  var CSS = ":host{all:initial;font-family:inherit}" +
    "*{box-sizing:border-box}" +
    "dialog{--ink:" + th.ink + ";--paper:" + th.paper + ";--acc:" + th.accent + ";--mut:" + th.muted + ";--line:" + th.line + ";--r:" + th.radius + ";" +
    "font-size:15px;line-height:1.55;font-family:inherit;color:var(--ink);background:var(--paper);border:0;padding:0;width:min(440px,100vw - 32px);max-height:min(720px,100dvh - 32px);border-radius:calc(var(--r) + 6px);box-shadow:0 24px 64px -12px rgba(0,0,0,.28),0 2px 8px rgba(0,0,0,.08);overflow:hidden}" +
    "dialog[open]{display:flex;flex-direction:column;animation:sa-in .32s cubic-bezier(.16,1,.3,1)}" +
    "dialog::backdrop{background:rgba(20,18,16,.42);backdrop-filter:blur(2px)}" +
    "@keyframes sa-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}" +
    "@media (max-width:560px){dialog{width:100vw;max-width:100vw;margin:auto 0 0;border-radius:calc(var(--r) + 8px) calc(var(--r) + 8px) 0 0;max-height:92dvh;padding-bottom:env(safe-area-inset-bottom)}@keyframes sa-in{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}}" +
    "@media (prefers-reduced-motion:reduce){dialog[open]{animation:none}}" +
    ".hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 22px 0}" +
    "h2{margin:0;font:inherit;font-size:20px;font-weight:650;letter-spacing:-.01em;line-height:1.25}" +
    ".x{appearance:none;border:0;background:none;color:var(--mut);width:40px;height:40px;margin:-8px -10px -8px 0;border-radius:50%;cursor:pointer;display:grid;place-items:center}" +
    ".x:hover{background:color-mix(in srgb,var(--ink) 7%,transparent);color:var(--ink)}" +
    ".bd{padding:8px 22px 22px;overflow:auto;overscroll-behavior:contain}" +
    "p{margin:0}.lead{color:var(--mut);margin:4px 0 18px}" +
    ".stack{display:grid;gap:10px}" +
    ".pv{appearance:none;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:48px;padding:0 16px;border-radius:var(--r);border:1px solid var(--line);background:var(--paper);color:var(--ink);font:inherit;font-weight:600;font-size:15px;cursor:pointer;transition:transform .12s ease,box-shadow .2s ease,opacity .2s}" +
    ".pv svg{width:18px;height:18px;flex:none}" +
    ".pv:hover:not(:disabled){box-shadow:0 2px 10px -2px rgba(0,0,0,.14)}.pv:active:not(:disabled){transform:translateY(1px)}" +
    ".pv:disabled{opacity:.42;cursor:not-allowed}" +
    ".pv.kakao{background:#FEE500;border-color:#FEE500;color:rgba(0,0,0,.85)}" +
    ".pv.apple{background:#000;border-color:#000;color:#fff}" +
    ".pv.naver{background:#03C75A;border-color:#03C75A;color:#fff}" +
    ".pv.soon{background:none;color:var(--mut);border-style:dashed}" +
    ".sep{display:flex;align-items:center;gap:12px;color:var(--mut);font-size:13px;margin:6px 0}.sep:before,.sep:after{content:'';flex:1;height:1px;background:var(--line)}" +
    ".sw{margin-top:18px;text-align:center;color:var(--mut);font-size:14px}" +
    ".lk{appearance:none;border:0;background:none;padding:2px;font:inherit;color:var(--ink);font-weight:600;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px;cursor:pointer}" +
    ".cs{border:1px solid var(--line);border-radius:var(--r);margin:0 0 16px;padding:4px 0}" +
    ".row{display:flex;align-items:flex-start;gap:10px;padding:9px 14px;min-height:44px}" +
    ".row.all{border-bottom:1px solid var(--line);padding:12px 14px;font-weight:650}" +
    ".row.sub{padding:4px 14px 4px 42px;min-height:36px}" +
    ".row label{flex:1;cursor:pointer;display:flex;gap:10px;align-items:flex-start}" +
    "input[type=checkbox]{appearance:none;flex:none;width:20px;height:20px;margin:1px 0 0;border:1.5px solid color-mix(in srgb,var(--ink) 45%,transparent);border-radius:5px;display:grid;place-items:center;cursor:pointer;background:var(--paper);transition:background .15s,border-color .15s}" +
    "input[type=checkbox]:checked{background:var(--acc);border-color:var(--acc)}" +
    "input[type=checkbox]:checked:after{content:'';width:10px;height:5px;border:2px solid var(--paper);border-top:0;border-right:0;transform:translateY(-1px) rotate(-45deg)}" +
    "input[type=checkbox]:disabled{opacity:.35;cursor:not-allowed}" +
    ".tag{font-size:12px;font-weight:600;color:var(--mut);margin-right:4px}.tag.req{color:var(--acc)}" +
    ".more{appearance:none;border:0;background:none;color:var(--mut);font:inherit;font-size:13px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:2px 0;white-space:nowrap}" +
    ".det{margin:0 14px 8px 44px;padding:10px 12px;font-size:13px;line-height:1.6;color:var(--mut);background:color-mix(in srgb,var(--ink) 4%,transparent);border-radius:calc(var(--r) - 4px)}" +
    ".det b{color:var(--ink);font-weight:600;margin-right:4px}" +
    ".hint{font-size:13px;color:var(--mut);margin-top:6px}" +
    ".msg{font-size:14px;margin-top:12px;padding:10px 12px;border-radius:calc(var(--r) - 4px);background:color-mix(in srgb,var(--ink) 5%,transparent)}.msg:empty{display:none}.msg.err{background:#fdecea;color:#8a1c12}" +
    "label.f{display:block;font-size:13px;font-weight:600;margin:0 0 6px}" +
    "input[type=email],input[type=password]{width:100%;min-height:48px;padding:0 14px;font:inherit;font-size:16px;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:var(--r)}" +
    "input[type=email]:focus,input[type=password]:focus{border-color:var(--acc);outline:2px solid color-mix(in srgb,var(--acc) 25%,transparent);outline-offset:0}" +
    ".pri{appearance:none;width:100%;min-height:48px;border:0;border-radius:var(--r);background:var(--acc);color:var(--paper);font:inherit;font-weight:650;font-size:15px;cursor:pointer}" +
    ".pri:disabled{opacity:.42;cursor:not-allowed}" +
    ".ghost{appearance:none;width:100%;min-height:44px;border:1px solid var(--line);border-radius:var(--r);background:none;color:var(--ink);font:inherit;font-weight:600;cursor:pointer}" +
    ".danger{color:#a3271a}" +
    "dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0 0 18px;font-size:14px}dt{color:var(--mut)}dd{margin:0;word-break:break-all}" +
    "h3{font:inherit;font-weight:650;font-size:15px;margin:18px 0 2px}" +
    ".tg{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid var(--line)}" +
    ".tg small{display:block;color:var(--mut);font-size:12px}" +
    ".sw2{appearance:none;flex:none;width:46px;height:28px;border-radius:14px;background:color-mix(in srgb,var(--ink) 18%,transparent);border:0;position:relative;cursor:pointer;transition:background .2s}" +
    ".sw2:after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s cubic-bezier(.16,1,.3,1)}" +
    ".sw2[aria-checked=true]{background:var(--acc)}.sw2[aria-checked=true]:after{transform:translateX(18px)}.sw2:disabled{opacity:.4;cursor:not-allowed}" +
    ".acts{display:grid;gap:8px;margin-top:20px}" +
    ".rad{display:flex;gap:10px;align-items:flex-start;padding:10px 0;cursor:pointer}.rad input{margin-top:3px;accent-color:var(--acc);width:18px;height:18px}" +
    ".note{font-size:13px;color:var(--mut);margin:10px 0 0}" +
    "button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--acc);outline-offset:2px}" +
    "::selection{background:color-mix(in srgb,var(--acc) 22%,transparent)}" +
    "a{color:inherit;text-underline-offset:3px}";

  var ICON = {
    google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
    kakao: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#000" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.67 6.77l-.95 3.48c-.08.3.26.54.52.37l4.15-2.75c.53.06 1.07.1 1.61.1 5.52 0 10-3.58 10-8S17.52 3 12 3z"/></svg>',
    apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.15 6.9c-.95 0-2.42-1.08-3.96-1.04-2.04.03-3.91 1.18-4.96 3.01-2.12 3.68-.55 9.1 1.52 12.09 1.01 1.45 2.2 3.09 3.79 3.04 1.52-.07 2.09-.99 3.93-.99 1.83 0 2.35.99 3.96.95 1.64-.03 2.68-1.48 3.68-2.95 1.16-1.69 1.64-3.33 1.66-3.42-.04-.01-3.18-1.22-3.22-4.86-.03-3.04 2.48-4.49 2.6-4.56-1.43-2.09-3.62-2.32-4.39-2.38-2-.16-3.68 1.09-4.61 1.09zm3.38-3.07c.84-1.01 1.4-2.43 1.25-3.83-1.21.05-2.66.8-3.53 1.82-.78.9-1.46 2.34-1.27 3.71 1.34.1 2.71-.69 3.55-1.7z"/></svg>',
    naver: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.56 12.84 8.16 2H2v20h6.44V11.16L15.84 22H22V2h-6.44z"/></svg>',
    email: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  /* ---------- 상태 ---------- */
  var sb = null, user = null, me = null, listeners = [], host, root, dlg, lastFocus;
  var view = "in";           // in | up | finish | email | reset | account | withdraw
  var emailMode = "in";

  /* ---------- Supabase 불러오기 ---------- */
  function loadSb(cb) {
    if (window.supabase && window.supabase.createClient) return cb();
    var s = document.createElement("script");
    s.src = SB_SRC; s.async = true; s.crossOrigin = "anonymous";
    s.onload = cb; s.onerror = function () { console.warn("[site-auth] supabase-js load failed"); };
    document.head.appendChild(s);
  }

  function redirectUrl() {
    var u = new URL(location.href);
    ["code", "error", "error_code", "error_description"].forEach(function (k) { u.searchParams.delete(k); });
    if (u.hash) ss(KEY + "-hash", u.hash);
    u.hash = "";
    return u.toString();
  }
  function cleanUrl() {
    try {
      var u = new URL(location.href), ch = false;
      ["code", "error", "error_code", "error_description", "type"].forEach(function (k) { if (u.searchParams.has(k)) { u.searchParams.delete(k); ch = true; } });
      var h = ss(KEY + "-hash"); if (h && !u.hash) { u.hash = h; ch = true; } ss(KEY + "-hash", null);
      if (ch) history.replaceState(history.state, "", u.toString());
    } catch (e) {}
  }

  function rpc(fn, args) {
    return sb.rpc(fn, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function refreshMe() {
    if (!user) { me = null; return Promise.resolve(null); }
    return rpc("sa_me", { p_site: SITE }).then(function (d) { me = d; return d; });
  }

  function pendingConsent() { var p = ls(KEY + "-consent"); return p && Date.now() - p.t < 24 * 3600 * 1000 ? p : null; }

  function join(consent, provider) {
    var src = ls(KEY + "-utm") || {};
    return rpc("sa_join", {
      p_site: SITE,
      p_provider: provider || (user && user.app_metadata && user.app_metadata.provider) || "email",
      p_source: (src.utm && (src.utm.utm_source || src.utm.r || src.utm.ref)) || (src.referrer ? "referral" : "direct"),
      p_utm: Object.assign({}, src.utm || {}, { referrer: src.referrer || "", landing: src.landing || "", first_seen: src.at || "" }),
      p_terms_version: V.terms, p_privacy_version: V.privacy, p_age14: !!consent.age,
      p_marketing: consent.mkt || {}, p_text_version: V.marketing
    }).then(function (d) { me = d; ls(KEY + "-consent", null); return d; });
  }

  function emit() { renderSlot(); listeners.forEach(function (fn) { try { fn(user, me); } catch (e) {} }); }

  function afterSignIn() {
    return refreshMe().then(function (d) {
      if (d && d.membership) { emit(); return; }
      var p = pendingConsent();
      if (p) return join(p, p.provider).then(function () { emit(); toast(T.welcome); });
      emit(); open("finish");
    }).catch(function (e) { console.warn("[site-auth]", e); emit(); });
  }

  /* ---------- 헤더 자리 ---------- */
  function slots() { return Array.prototype.slice.call(document.querySelectorAll(C.mount || "[data-auth-slot]")); }
  function renderSlot() {
    var signedIn = !!(user && me && me.membership);
    slots().forEach(function (el) {
      var b = el.querySelector("button[data-sa]");
      if (!b) {
        b = document.createElement("button");
        b.type = "button"; b.setAttribute("data-sa", "");
        b.className = C.buttonClass || "sa-btn";
        if (!C.buttonClass) b.style.cssText = "appearance:none;background:none;border:0;padding:6px 2px;margin:0;font:inherit;color:inherit;cursor:pointer;letter-spacing:inherit;text-transform:inherit;white-space:nowrap";
        // mimic: 헤더의 기존 링크 하나를 골라 글꼴·크기·자간·대소문자·색을 그대로 따라 한다 (사이트 톤 유지)
        var ref = C.mimic && document.querySelector(C.mimic);
        if (ref && !C.buttonClass) { var cs = getComputedStyle(ref); ["fontFamily", "fontSize", "fontWeight", "letterSpacing", "textTransform", "color", "lineHeight"].forEach(function (k) { b.style[k] = cs[k]; }); }
        b.addEventListener("click", function () { open(user && me && me.membership ? "account" : "in"); });
        el.appendChild(b);
      }
      b.textContent = signedIn ? T.account : T.signin;
      b.setAttribute("aria-haspopup", "dialog");
      el.hidden = false; el.removeAttribute("hidden"); el.style.flex = "none";
    });
  }

  /* ---------- 대화상자 ---------- */
  function ensureDialog() {
    if (dlg) return;
    host = document.createElement("div");
    host.setAttribute("data-site-auth", "");
    document.body.appendChild(host);
    root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var st = document.createElement("style"); st.textContent = CSS; root.appendChild(st);
    dlg = document.createElement("dialog");
    dlg.setAttribute("aria-labelledby", "sa-t");
    dlg.lang = LANG;
    root.appendChild(dlg);
    dlg.addEventListener("close", function () { if (view === "finish" && user && !(me && me.membership)) { rpc("sa_cancel_signup").catch(function () {}).then(function () { return sb.auth.signOut(); }); } if (lastFocus && lastFocus.focus) lastFocus.focus(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }

  function open(mode) {
    ensureDialog();
    lastFocus = document.activeElement;
    view = mode || "in";
    render();
    if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); } }
    var f = dlg.querySelector("[data-autofocus]") || dlg.querySelector(".bd button, .bd input");
    if (f) f.focus();
  }
  function close() { if (dlg && dlg.open) dlg.close(); }

  function head(title) { return '<div class="hd"><h2 id="sa-t">' + esc(title) + '</h2><button type="button" class="x" data-close aria-label="' + esc(T.close) + '">' + ICON.x + "</button></div>"; }

  function consentBlock() {
    var rowsMkt = CHANNELS.map(function (c) {
      return '<div class="row sub"><label><input type="checkbox" data-c="mkt" data-ch="' + c + '"><span>' + esc(chName(c)) + "</span></label></div>";
    }).join("");
    function link(href, txt) { return href ? ' <a href="' + esc(href) + '" target="_blank" rel="noopener" class="more">' + esc(T.view) + "</a>" : ""; }
    return '<fieldset class="cs" style="border:1px solid var(--line);min-width:0"><legend class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">' + esc(T.title_up) + "</legend>" +
      '<div class="row all"><label><input type="checkbox" data-c="all"><span>' + esc(T.all) + "</span></label></div>" +
      '<p class="hint" style="padding:6px 14px 0;margin:0">' + esc(T.all_hint) + "</p>" +
      '<div class="row"><label><input type="checkbox" data-c="terms" data-req><span><span class="tag req">[' + T.req + "]</span>" + esc(T.terms) + "</span></label>" + link(LINKS.terms) + "</div>" +
      '<div class="row"><label><input type="checkbox" data-c="privacy" data-req><span><span class="tag req">[' + T.req + "]</span>" + esc(T.privacy) + '</span></label><button type="button" class="more" data-more="pd" aria-expanded="false" aria-controls="sa-pd">' + esc(T.view) + "</button></div>" +
      '<div class="det" id="sa-pd" hidden>' + T.privacy_detail + (LINKS.privacy ? ' <a href="' + esc(LINKS.privacy) + '" target="_blank" rel="noopener">' + esc(LANG === "en" ? "Privacy policy" : "개인정보처리방침") + "</a>" : "") + "</div>" +
      '<div class="row"><label><input type="checkbox" data-c="age" data-req><span><span class="tag req">[' + T.req + "]</span>" + esc(T.age) + "</span></label></div>" +
      '<div class="row"><label><input type="checkbox" data-c="mktall"><span><span class="tag">[' + T.opt + "]</span>" + esc(T.mkt) + '</span></label><button type="button" class="more" data-more="md" aria-expanded="false" aria-controls="sa-md">' + esc(T.view) + "</button></div>" +
      '<div class="det" id="sa-md" hidden>' + fmt(T.mkt_detail, { senders: esc(SENDERS) }) + "</div>" + rowsMkt +
      (C.night === false ? "" : '<div class="row"><label><input type="checkbox" data-c="night" disabled><span><span class="tag">[' + T.opt + "]</span>" + esc(T.night) + "</span></label></div>") +
      '<p class="hint" style="padding:0 14px 10px;margin:0">' + esc(T.under14) + "</p></fieldset>";
  }

  function readConsent() {
    var q = function (s) { return dlg.querySelector(s); };
    var mkt = {};
    CHANNELS.forEach(function (c) { var el = q('[data-ch="' + c + '"]'); mkt[c] = !!(el && el.checked); });
    var n = q('[data-c="night"]'); mkt.night = !!(n && n.checked && !n.disabled);
    return { terms: !!(q('[data-c="terms"]') || {}).checked, privacy: !!(q('[data-c="privacy"]') || {}).checked, age: !!(q('[data-c="age"]') || {}).checked, mkt: mkt };
  }
  function consentOk() { var c = readConsent(); return c.terms && c.privacy && c.age; }

  function wireConsent(onChange) {
    var all = dlg.querySelector('[data-c="all"]'), mktAll = dlg.querySelector('[data-c="mktall"]'), night = dlg.querySelector('[data-c="night"]');
    var boxes = function (s) { return Array.prototype.slice.call(dlg.querySelectorAll(s)); };
    function sync() {
      var chs = boxes("[data-ch]"), anyCh = chs.some(function (b) { return b.checked; });
      if (mktAll) { mktAll.checked = chs.length && chs.every(function (b) { return b.checked; }); mktAll.indeterminate = anyCh && !mktAll.checked; }
      if (night) { night.disabled = !anyCh; if (!anyCh) night.checked = false; }
      var every = boxes('input[type=checkbox][data-c]:not([data-c="all"]):not([data-c="mktall"])').every(function (b) { return b.checked || b.disabled; }) && anyCh;
      all.checked = every; all.indeterminate = !every && boxes("input[data-c]").some(function (b) { return b !== all && b.checked; });
      onChange && onChange();
    }
    all.addEventListener("change", function () {
      boxes("input[data-c],input[data-ch]").forEach(function (b) { if (b !== all) { b.checked = all.checked; if (b === night) b.disabled = !all.checked; } });
      sync();
    });
    if (mktAll) mktAll.addEventListener("change", function () { boxes("[data-ch]").forEach(function (b) { b.checked = mktAll.checked; }); sync(); });
    boxes("input[data-c],input[data-ch]").forEach(function (b) { if (b !== all && b !== mktAll) b.addEventListener("change", sync); });
    boxes("[data-more]").forEach(function (b) {
      b.addEventListener("click", function () { var d = dlg.querySelector("#sa-" + b.getAttribute("data-more")); var o = d.hidden; d.hidden = !o; b.setAttribute("aria-expanded", String(o)); b.textContent = o ? T.hide : T.view; });
    });
    sync();
  }

  function providerButtons(gated) {
    var h = "";
    PROVIDERS.forEach(function (p) {
      if (p === "email") return;
      if (!T[p]) return;
      h += '<button type="button" class="pv ' + p + '" data-pv="' + p + '"' + (gated ? " disabled" : "") + ">" + ICON[p] + "<span>" + esc(T[p]) + "</span></button>";
    });
    if (C.naver === "soon") h += '<button type="button" class="pv soon" disabled aria-disabled="true">' + ICON.naver + "<span>" + esc(T.naver_soon) + "</span></button>";
    else if (typeof C.naver === "string" && /^https:\/\//.test(C.naver)) h += '<button type="button" class="pv naver" data-pv="naver"' + (gated ? " disabled" : "") + ">" + ICON.naver + "<span>" + esc(T.naver) + "</span></button>";
    if (PROVIDERS.indexOf("email") > -1) h += '<div class="sep" aria-hidden="true">' + esc(T.or) + '</div><button type="button" class="pv" data-pv="email"' + (gated ? " disabled" : "") + ">" + ICON.email + "<span>" + esc(T.email) + "</span></button>";
    return '<div class="stack">' + h + "</div>";
  }

  function render() {
    var h = "";
    if (view === "in") {
      h = head(T.title_in) + '<div class="bd"><p class="lead">' + esc(T.lead_in) + "</p>" + providerButtons(false) +
        '<p class="sw">' + esc(T.no_account) + ' <button type="button" class="lk" data-go="up">' + esc(T.go_up) + '</button></p><p class="msg" role="status" aria-live="polite"></p></div>';
    } else if (view === "up") {
      h = head(T.title_up) + '<div class="bd"><p class="lead">' + esc(T.lead_up) + "</p>" + consentBlock() + providerButtons(true) +
        '<p class="sw">' + esc(T.has_account) + ' <button type="button" class="lk" data-go="in">' + esc(T.go_in) + '</button></p><p class="msg" role="status" aria-live="polite"></p></div>';
    } else if (view === "finish") {
      h = head(T.title_finish) + '<div class="bd"><p class="lead">' + esc(T.lead_finish) + "</p>" + consentBlock() +
        '<div class="acts"><button type="button" class="pri" data-finish disabled>' + esc(T.finish) + '</button><button type="button" class="ghost" data-cancel-signup>' + esc(T.cancel_signup) + '</button></div><p class="msg" role="status" aria-live="polite"></p></div>';
    } else if (view === "email") {
      var up = emailMode === "up";
      h = head(up ? T.title_up : T.title_in) + '<div class="bd"><form data-email novalidate><label class="f" for="sa-em">' + esc(T.email_label) + '</label><input id="sa-em" type="email" autocomplete="email" inputmode="email" required data-autofocus>' +
        '<label class="f" for="sa-pw" style="margin-top:14px">' + esc(T.pw_label) + '</label><input id="sa-pw" type="password" autocomplete="' + (up ? "new-password" : "current-password") + '" minlength="8" aria-describedby="sa-pwh"><p class="hint" id="sa-pwh">' + esc(T.pw_hint) + "</p>" +
        '<div class="acts"><button type="submit" class="pri">' + esc(T.send_link) + '</button></div></form>' +
        (up ? "" : '<p class="sw"><button type="button" class="lk" data-forgot>' + esc(T.forgot) + "</button></p>") +
        '<p class="sw"><button type="button" class="lk" data-go="' + (up ? "up" : "in") + '">' + esc(T.back) + '</button></p><p class="msg" role="status" aria-live="polite"></p></div>';
    } else if (view === "reset") {
      h = head(T.new_pw) + '<div class="bd"><form data-reset><label class="f" for="sa-np">' + esc(T.new_pw) + '</label><input id="sa-np" type="password" autocomplete="new-password" minlength="8" required data-autofocus><div class="acts"><button class="pri" type="submit">' + esc(T.save_pw) + '</button></div></form><p class="msg" role="status" aria-live="polite"></p></div>';
    } else if (view === "account") {
      h = head(T.account) + '<div class="bd">' + accountHtml() + '<p class="msg" role="status" aria-live="polite"></p></div>';
    } else if (view === "withdraw") {
      var others = (me && me.sites || []).filter(function (s) { return s !== SITE; });
      h = head(T.withdraw_title) + '<div class="bd"><p class="lead">' + esc(T.withdraw_lead) + "</p>" +
        (others.length ? '<p class="note">' + esc(fmt(T.withdraw_other, { sites: others.map(function (s) { return SITE_NAMES[s] || s; }).join(", ") })) + "</p>" +
          '<div role="radiogroup" aria-label="' + esc(T.withdraw_title) + '"><label class="rad"><input type="radio" name="sa-w" value="site" checked><span>' + esc(T.withdraw_site) + '</span></label><label class="rad"><input type="radio" name="sa-w" value="all"><span>' + esc(T.withdraw_all) + "</span></label></div>" : "") +
        (C.iapNotice ? '<p class="note">' + esc(T.iap) + "</p>" : "") +
        '<div class="acts"><button type="button" class="pri" data-withdraw-go style="background:#a3271a">' + esc(T.withdraw_go) + '</button><button type="button" class="ghost" data-go="account">' + esc(T.close) + '</button></div><p class="msg" role="status" aria-live="polite"></p></div>';
    }
    dlg.innerHTML = h;
    wire();
  }

  function accountHtml() {
    var m = (me && me.marketing) || {};
    var mb = (me && me.membership) || {};
    var email = (user && user.email) || "";
    var prov = mb.provider || (user && user.app_metadata && user.app_metadata.provider) || "";
    var chs = CHANNELS.concat(C.night === false ? [] : ["night"]);
    var anyOn = CHANNELS.some(function (c) { return m[c] && m[c].granted; });
    var tg = chs.map(function (c) {
      var s = m[c] || {}, on = !!s.granted, dis = c === "night" && !anyOn;
      var sub = on ? T.since + " " + day(s.granted_at) + " · " + T.next_check + " " + day(s.reconfirm_due) : T.consent_off;
      return '<div class="tg"><span id="sa-l-' + c + '">' + esc(c === "night" ? T.night : chName(c)) + "<small>" + esc(sub) + "</small></span>" +
        '<button type="button" class="sw2" role="switch" aria-checked="' + on + '" aria-labelledby="sa-l-' + c + '" data-mkt="' + c + '"' + (dis ? " disabled" : "") + "></button></div>";
    }).join("");
    return '<dl><dt>' + esc(T.signed_as) + "</dt><dd>" + esc(email || "—") + "</dd><dt>" + esc(T.via) + "</dt><dd>" + esc(prov ? prov.charAt(0).toUpperCase() + prov.slice(1) : "—") + "</dd><dt>" + esc(T.joined) + "</dt><dd>" + esc(day(mb.joined_at) || "—") + "</dd></dl>" +
      "<h3>" + esc(T.settings) + '</h3><p class="hint" style="margin-bottom:8px">' + esc(T.settings_hint) + "</p>" + tg +
      '<div class="acts"><button type="button" class="ghost" data-signout>' + esc(T.signout) + '</button><button type="button" class="lk danger" data-go="withdraw" style="justify-self:center;margin-top:6px">' + esc(T.withdraw) + "</button></div>";
  }

  function say(t, err) { var m = dlg.querySelector(".msg"); if (m) { m.textContent = t || ""; m.className = "msg" + (err ? " err" : ""); } }
  function busy(btn, on) { if (!btn) return; if (on) { btn.dataset.l = btn.innerHTML; btn.disabled = true; btn.setAttribute("aria-busy", "true"); } else { btn.disabled = false; btn.removeAttribute("aria-busy"); if (btn.dataset.l) btn.innerHTML = btn.dataset.l; } }

  function oauth(p, consent) {
    if (consent) ls(KEY + "-consent", { t: Date.now(), terms: true, privacy: true, age: true, mkt: consent.mkt, provider: p });
    if (p === "naver") { location.href = C.naver + (C.naver.indexOf("?") > -1 ? "&" : "?") + "redirect_to=" + encodeURIComponent(redirectUrl()); return; }
    var opts = { redirectTo: redirectUrl() };
    if (p === "kakao" && C.kakaoScopes) opts.scopes = C.kakaoScopes;
    sb.auth.signInWithOAuth({ provider: p, options: opts }).then(function (r) { if (r.error) say(T.err, true); });
  }

  function wire() {
    dlg.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", close); });
    dlg.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { view = b.getAttribute("data-go"); render(); var f = dlg.querySelector("[data-autofocus]") || dlg.querySelector(".bd button,.bd input"); f && f.focus(); }); });
    var gated = view === "up" || view === "finish";
    if (dlg.querySelector('[data-c="all"]')) wireConsent(function () {
      var ok = consentOk();
      dlg.querySelectorAll("[data-pv],[data-finish]").forEach(function (b) { b.disabled = !ok; });
    });
    dlg.querySelectorAll("[data-pv]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = b.getAttribute("data-pv");
        if (gated && !consentOk()) { say(T.need, true); return; }
        var consent = gated ? readConsent() : null;
        if (p === "email") { if (consent) ls(KEY + "-consent", { t: Date.now(), terms: true, privacy: true, age: true, mkt: consent.mkt, provider: "email" }); emailMode = gated ? "up" : "in"; view = "email"; render(); var f = dlg.querySelector("[data-autofocus]"); f && f.focus(); return; }
        busy(b, true); oauth(p, consent);
      });
    });
    var fin = dlg.querySelector("[data-finish]");
    if (fin) fin.addEventListener("click", function () {
      if (!consentOk()) { say(T.need, true); return; }
      busy(fin, true);
      join(readConsent()).then(function () { view = "account"; close(); emit(); toast(T.welcome); }).catch(function () { busy(fin, false); say(T.err, true); });
    });
    var cs = dlg.querySelector("[data-cancel-signup]");
    if (cs) cs.addEventListener("click", function () {
      busy(cs, true);
      rpc("sa_cancel_signup").catch(function () {}).then(function () { return sb.auth.signOut(); }).then(function () { user = null; me = null; view = "in"; close(); emit(); });
    });
    var ef = dlg.querySelector("[data-email]");
    if (ef) {
      var sub = ef.querySelector('[type="submit"]'), pw = ef.querySelector("#sa-pw");
      pw.addEventListener("input", function () { sub.textContent = pw.value ? (emailMode === "up" ? T.pw_signup : T.pw_login) : T.send_link; });
      ef.addEventListener("submit", function (e) {
        e.preventDefault();
        var em = ef.querySelector("#sa-em").value.trim(), p = pw.value;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { say(T.err_email, true); ef.querySelector("#sa-em").focus(); return; }
        busy(sub, true); say(T.loading);
        var red = redirectUrl(), pr;
        if (p) pr = emailMode === "up" ? sb.auth.signUp({ email: em, password: p, options: { emailRedirectTo: red } }) : sb.auth.signInWithPassword({ email: em, password: p });
        else pr = sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: red, shouldCreateUser: emailMode === "up" } });
        pr.then(function (r) {
          busy(sub, false);
          if (r.error) {
            var m = String(r.error.message || "");
            say(/invalid login|credentials/i.test(m) ? T.err_cred : /signups not allowed|not found|otp_disabled/i.test(m) ? T.err_nouser : T.err, true);
            return;
          }
          if (r.data && r.data.session) return; // 비밀번호 로그인: onAuthStateChange 가 이어서 처리
          say(T.link_sent);
        });
      });
      var fg = dlg.querySelector("[data-forgot]");
      if (fg) fg.addEventListener("click", function () {
        var em = ef.querySelector("#sa-em").value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { say(T.err_email, true); ef.querySelector("#sa-em").focus(); return; }
        sb.auth.resetPasswordForEmail(em, { redirectTo: redirectUrl() }).then(function (r) { say(r.error ? T.err : T.reset_sent, !!r.error); });
      });
    }
    var rf = dlg.querySelector("[data-reset]");
    if (rf) rf.addEventListener("submit", function (e) {
      e.preventDefault();
      var b = rf.querySelector("button"); busy(b, true);
      sb.auth.updateUser({ password: rf.querySelector("#sa-np").value }).then(function (r) { busy(b, false); if (r.error) say(T.err, true); else { close(); toast(T.pw_saved); } });
    });
    var so = dlg.querySelector("[data-signout]");
    if (so) so.addEventListener("click", function () { sb.auth.signOut().then(function () { close(); toast(T.signed_out); }); });
    dlg.querySelectorAll("[data-mkt]").forEach(function (b) {
      b.addEventListener("click", function () {
        var ch = b.getAttribute("data-mkt"), on = b.getAttribute("aria-checked") !== "true";
        b.disabled = true;
        rpc("sa_set_marketing", { p_channel: ch, p_granted: on, p_site: SITE, p_text_version: V.marketing, p_via: "settings" }).then(function (r) {
          return refreshMe().then(function () {
            render();
            // 정보통신망법 제50조 제7항·시행령 제62조의2: 수신 동의·거부 처리 결과를 전송자 명칭·일시와 함께 알린다
            say(fmt(on ? T.notice_on : T.notice_off, { brand: BRAND, date: day((r && r.at) || new Date()), ch: ch === "night" ? T.night : chName(ch) }));
            var nb = dlg.querySelector('[data-mkt="' + ch + '"]'); nb && nb.focus();
          });
        }).catch(function () { b.disabled = false; say(T.err, true); });
      });
    });
    var wg = dlg.querySelector("[data-withdraw-go]");
    if (wg) wg.addEventListener("click", function () {
      var r = dlg.querySelector('input[name="sa-w"]:checked');
      var all = !r || r.value === "all";
      if ((me && me.sites || []).filter(function (s) { return s !== SITE; }).length === 0) all = true;
      busy(wg, true);
      rpc("sa_withdraw", { p_site: SITE, p_all: all }).then(function () { return sb.auth.signOut(); }).then(function () {
        user = null; me = null; ls(KEY + "-utm", null); view = "in"; close(); emit(); toast(T.withdraw_done);
      }).catch(function () { busy(wg, false); say(T.err, true); });
    });
  }

  /* ---------- 알림 ---------- */
  function toast(t) {
    ensureDialog();
    var el = root.querySelector(".sa-toast");
    if (!el) {
      el = document.createElement("div"); el.className = "sa-toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite");
      el.style.cssText = "position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483646;max-width:calc(100vw - 32px);padding:12px 18px;border-radius:999px;background:" + th.ink + ";color:" + th.paper + ";font-size:14px;line-height:1.4;font-family:inherit;box-shadow:0 8px 24px -6px rgba(0,0,0,.3);opacity:0;transition:opacity .25s";
      root.appendChild(el);
    }
    el.textContent = t; el.style.opacity = "1";
    clearTimeout(el._t); el._t = setTimeout(function () { el.style.opacity = "0"; }, 3600);
  }

  /* ---------- 시작 ---------- */
  function start() {
    sb = window.supabase.createClient(C.url, C.anonKey, { auth: { storageKey: KEY, flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    renderSlot();
    var first = true;
    sb.auth.onAuthStateChange(function (ev, session) {
      var was = user && user.id;
      user = session ? session.user : null;
      if (ev === "PASSWORD_RECOVERY") { cleanUrl(); open("reset"); return; }
      if (!user) { me = null; setTimeout(emit, 0); return; }
      if (first || ev === "SIGNED_IN" && was !== user.id) { first = false; cleanUrl(); setTimeout(afterSignIn, 0); }
      first = false;
    });
    var q = new URLSearchParams(location.search);
    if (q.get("error_description")) { setTimeout(function () { open("in"); say(T.err, true); cleanUrl(); }, 0); }
  }

  window.SiteAuth = {
    open: function (m) { open(m || (user && me && me.membership ? "account" : "in")); },
    close: close,
    user: function () { return user; },
    me: function () { return me; },
    get client() { return sb; },
    onChange: function (fn) { if (typeof fn === "function") { listeners.push(fn); if (sb) fn(user, me); } }
  };

  function boot() { loadSb(start); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
