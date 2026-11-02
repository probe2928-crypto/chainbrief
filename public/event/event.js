/* site-event v1 — 회원가입 이벤트·가입 혜택 (모든 사이트 공용, 사이트마다 같은 파일을 복사해 쓴다)
   설정: 같은 폴더의 event-config.js 가 window.SITE_EVENT 를 정한다.
   - enabled:false 이면 아무것도 하지 않는다(화면 변화 0).
   - 미리보기: localhost/127.0.0.1 에서 주소에 ?event_preview=1 을 붙였을 때만 켜진다(공개 사이트에서는 절대 안 켜짐).
   - 로그인·회원 DB 는 site-auth(window.SiteAuth, chainbrief/auth/auth.js)를 쓴다. 없으면 미리보기 화면만 보인다.
   - 서버 쪽 규칙(1인 1회, 이메일 인증, 다계정·지갑 중복 차단)은 ops/events/schema.sql 의 RPC 가 강제한다. 이 파일은 화면만.
   kind: "draw"(추첨 응모) | "welcome"(가입 혜택 받기) */
(function () {
  "use strict";
  var C = window.SITE_EVENT;
  if (!C || typeof C !== "object" || window.__siteEvent) return;
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var PREVIEW = LOCAL && /[?&]event_preview=1(&|$)/.test(location.search);
  if (!C.enabled && !PREVIEW) {
    // 규칙 페이지를 주소로 직접 연 경우: 내용 대신 '진행 중인 이벤트 없음'만 보인다
    if (document.documentElement.hasAttribute("data-event-page")) {
      var go = function () { var m = document.querySelector("[data-event-main]"); if (m) m.innerHTML = '<p style="padding:64px 0;text-align:center">' + ((C.lang || "ko") === "en" ? "There is no event running right now." : "지금 진행 중인 이벤트가 없어요.") + "</p>"; document.documentElement.removeAttribute("data-event-hide"); };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
    }
    return;
  }
  document.documentElement.removeAttribute("data-event-hide");
  window.__siteEvent = 1;

  var EN = (C.lang || "ko") === "en";
  var T = Object.assign(EN ? {
    login: "Sign in to enter", join: "Create a free account", enter: "Enter the draw", entering: "Entering…",
    entered: "You're in. Entry no.", already: "You have already entered this month's draw.",
    preview: "Preview — entries open once sign-in goes live.", preview_w: "Preview — available once sign-in goes live.", need: "Please confirm the required items.",
    req: "Required", opt: "Optional", country: "Country of residence", choose: "Select",
    mkt: "Send me news and offers", mkt_hint: "Not required to enter or to win. You can turn it off any time.",
    ch_email: "Email", ch_kakao: "KakaoTalk", view: "Details", err: "Something went wrong. Please try again.",
    claim: "Get it", claimed: "Added to your account", welcome_login: "Sign up to get it",
    errors: { "already entered": "You have already entered this draw.", "duplicate email": "An entry with this email already exists.", "email not verified": "Please verify your email first.", "disposable email": "Disposable email addresses can't enter.", "country not eligible": "Residents of this country can't enter.", "event closed": "This draw is closed.", "join site first": "Please finish creating your account first." }
  } : {
    login: "로그인하고 응모하기", join: "무료 회원가입", enter: "응모하기", entering: "응모 중…",
    entered: "응모됐어요. 응모번호", already: "이번 달 추첨에 이미 응모했어요.",
    preview: "미리보기 화면이에요. 로그인이 열리면 응모할 수 있어요.", preview_w: "미리보기 화면이에요. 로그인이 열리면 받을 수 있어요.", need: "필수 항목을 확인해 주세요.",
    req: "필수", opt: "선택", country: "거주 국가", choose: "선택",
    mkt: "새 소식·혜택 받아보기", mkt_hint: "동의하지 않아도 응모·당첨에 아무 영향이 없고, 언제든 끌 수 있어요.",
    ch_email: "이메일", ch_kakao: "카카오톡", view: "자세히", err: "잠시 후 다시 시도해 주세요.",
    claim: "받기", claimed: "내 계정에 들어왔어요", welcome_login: "가입하고 받기",
    errors: { "already entered": "이번 추첨에 이미 응모했어요.", "duplicate email": "같은 이메일로 이미 응모한 기록이 있어요.", "email not verified": "이메일 인증을 먼저 마쳐 주세요.", "disposable email": "일회용 이메일로는 응모할 수 없어요.", "country not eligible": "응모할 수 없는 지역이에요.", "event closed": "응모 기간이 아니에요.", "join site first": "회원가입을 먼저 마쳐 주세요." }
  }, C.text || {});

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var th = Object.assign({ ink: "#111", paper: "#fff", accent: "#111", muted: "#5c5c5c", line: "#e4e0d8", wash: "#f6f4ef", radius: "0px", font: "inherit", display: "inherit", dw: "600" }, C.theme || {});

  // ---------- 스타일 (이 파일이 그리는 요소에만, sev- 접두사) ----------
  var css = ".sev{--i:" + th.ink + ";--p:" + th.paper + ";--a:" + th.accent + ";--m:" + th.muted + ";--l:" + th.line + ";--w:" + th.wash + ";--r:" + th.radius + ";font-family:" + th.font + ";color:var(--i)}" +
    ".sev *{box-sizing:border-box}" +
    ".sev-band{background:var(--w);border-block:1px solid var(--l)}" +
    ".sev-band-in{max-width:" + (C.width || "1240px") + ";margin:0 auto;padding:22px max(20px,env(safe-area-inset-left,0px));display:grid;grid-template-columns:auto 1fr auto;gap:12px 28px;align-items:center}" +
    ".sev-fig{font-family:" + th.display + ";font-size:clamp(34px,5vw,52px);line-height:1;letter-spacing:-.02em;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}" +
    ".sev-fig small{display:block;font-family:" + th.font + ";font-size:12px;letter-spacing:.04em;color:var(--m);margin-top:8px;white-space:normal}" +
    ".sev-copy h2{margin:0 0 4px;font-family:" + th.display + ";font-weight:" + th.dw + ";font-size:clamp(19px,2.2vw,24px);line-height:1.3;letter-spacing:-.01em;text-wrap:balance}" +
    ".sev-copy p{margin:0;color:var(--m);font-size:14px;line-height:1.6;max-width:62ch}" +
    ".sev-cta{display:inline-flex;align-items:center;gap:10px;background:var(--a);color:var(--p);border:1px solid var(--a);border-radius:var(--r);padding:13px 22px;font:500 14px/1.2 " + th.font + ";text-decoration:none;white-space:nowrap;cursor:pointer;transition:background .2s,color .2s}" +
    ".sev-cta:hover{background:transparent;color:var(--a)}.sev-cta:focus-visible{outline:2px solid var(--a);outline-offset:3px}" +
    ".sev-cta[disabled]{opacity:.45;cursor:not-allowed}.sev-cta[disabled]:hover{background:var(--a);color:var(--p)}" +
    ".sev-cta svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.6}" +
    ".sev-x{appearance:none;background:none;border:0;color:var(--m);padding:8px;cursor:pointer;font-size:13px;text-decoration:underline;text-underline-offset:3px}" +
    "@media (max-width:760px){.sev-band-in{grid-template-columns:1fr;gap:10px;padding-block:20px}.sev-cta{justify-self:start}}" +
    ".sev-box{border:1px solid var(--l);border-radius:var(--r);background:var(--p);padding:24px;display:grid;gap:16px;max-width:560px}" +
    ".sev-box h3{margin:0;font-family:" + th.display + ";font-weight:" + th.dw + ";font-size:20px;line-height:1.35}" +
    ".sev-row{display:grid;grid-template-columns:20px 1fr;gap:10px;align-items:start;font-size:14px;line-height:1.55;cursor:pointer}" +
    ".sev-row input{width:18px;height:18px;margin:2px 0 0;accent-color:var(--a)}" +
    ".sev-tag{display:inline-block;font-size:12px;color:var(--m);margin-right:6px}.sev-tag.req{color:var(--a);font-weight:500}" +
    ".sev-sel{display:grid;gap:6px;font-size:13px;color:var(--m)}.sev-sel select{appearance:auto;font:inherit;font-size:15px;color:var(--i);background:var(--p);border:1px solid var(--l);border-radius:var(--r);padding:11px 12px;min-height:44px}" +
    ".sev-sub{border-top:1px solid var(--l);padding-top:14px;display:grid;gap:10px}.sev-sub p{margin:0;font-size:12.5px;color:var(--m);line-height:1.55}" +
    ".sev-chs{display:flex;gap:18px;flex-wrap:wrap}.sev-chs label{display:flex;gap:8px;align-items:center;font-size:14px;cursor:pointer}.sev-chs input{width:18px;height:18px;accent-color:var(--a)}" +
    ".sev-msg{margin:0;font-size:14px;line-height:1.55}.sev-msg.err{color:#a8201a}.sev-msg.ok{font-weight:500}" +
    ".sev-note{margin:0;font-size:12.5px;color:var(--m);line-height:1.55}" +
    ".sev details summary{cursor:pointer;font-size:13px;color:var(--m)}.sev details div{font-size:12.5px;color:var(--m);line-height:1.6;padding-top:8px}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';

  // ---------- 배너 ----------
  function banner() {
    var B = C.banner; if (!B || document.documentElement.hasAttribute("data-event-page")) return;
    var host = document.querySelector(B.mount); if (!host) return;
    var key = "sev-x-" + (C.id || C.site);
    try { if (!PREVIEW && sessionStorage.getItem(key) === "1") return; } catch (e) {}
    var el = document.createElement("aside");
    el.className = "sev sev-band"; el.setAttribute("aria-label", B.label || B.title);
    el.innerHTML = '<div class="sev-band-in">' +
      (B.figure ? '<div class="sev-fig">' + esc(B.figure) + (B.figureNote ? "<small>" + esc(B.figureNote) + "</small>" : "") + "</div>" : "<span></span>") +
      '<div class="sev-copy"><h2>' + esc(B.title) + "</h2>" + (B.body ? "<p>" + esc(B.body) + "</p>" : "") + "</div>" +
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><a class="sev-cta" href="' + esc(B.href || C.rulesUrl) + '">' + esc(B.cta) + ARROW + "</a>" +
      (B.dismiss === false ? "" : '<button class="sev-x" type="button">' + (EN ? "Hide" : "닫기") + "</button>") + "</div></div>";
    host.insertAdjacentElement(B.where || "beforebegin", el);
    var x = el.querySelector(".sev-x");
    if (x) x.addEventListener("click", function () { el.remove(); try { sessionStorage.setItem(key, "1"); } catch (e) {} });
  }

  // ---------- 로그인 연결 ----------
  function auth(cb) {
    var n = 0;
    if (!window.SITE_AUTH || !window.SITE_AUTH.url) return cb(null);   // 로그인 설정 전 = 미리보기
    (function wait() {
      if (window.SiteAuth && window.SiteAuth.client) return cb(window.SiteAuth);
      if (++n > 40) return cb(null);
      setTimeout(wait, 125);
    })();
  }
  function errText(e) {
    var m = (e && (e.message || e.error_description)) || "";
    for (var k in T.errors) if (m.indexOf(k) > -1) return T.errors[k];
    return T.err;
  }

  // ---------- 추첨 응모 상자 ----------
  function drawBox(host, A) {
    var E = C.entry || {};
    var user = A && A.user && A.user();
    if (A && !user) {
      host.innerHTML = '<div class="sev sev-box"><h3>' + esc(E.title) + '</h3><p class="sev-note">' + esc(E.loginNote || "") + '</p><button class="sev-cta" type="button" data-go>' + esc(T.login) + ARROW + "</button></div>";
      host.querySelector("[data-go]").addEventListener("click", function () { A.open("signup"); });
      A.onChange && A.onChange(function () { drawBox(host, A); });
      return;
    }
    var countries = E.countries || null;
    var rows = (E.attest || []).map(function (a, i) {
      return '<label class="sev-row"><input type="checkbox" data-req="' + i + '"><span><span class="sev-tag req">' + T.req + "</span>" + a.label +
        (a.detail ? ' <details><summary>' + T.view + "</summary><div>" + a.detail + "</div></details>" : "") + "</span></label>";
    }).join("");
    var chs = (E.marketing || []).map(function (c) { return '<label><input type="checkbox" data-mkt="' + c + '"> ' + T["ch_" + c] + "</label>"; }).join("");
    host.innerHTML = '<form class="sev sev-box" novalidate><h3>' + esc(E.title) + "</h3>" +
      (countries ? '<label class="sev-sel">' + T.country + ' <select required data-country><option value="">' + T.choose + "</option>" +
        countries.map(function (c) { return '<option value="' + c[0] + '">' + esc(c[1]) + "</option>"; }).join("") + "</select></label>" : "") +
      rows +
      (chs ? '<div class="sev-sub"><div><span class="sev-tag">' + T.opt + "</span>" + T.mkt + '</div><div class="sev-chs">' + chs + "</div><p>" + T.mkt_hint + "</p></div>" : "") +
      '<button class="sev-cta" type="submit"' + (A ? "" : " disabled") + ">" + T.enter + ARROW + '</button><p class="sev-msg" role="status" aria-live="polite">' + (A ? "" : esc(T.preview)) + "</p></form>";
    var f = host.querySelector("form"), msg = f.querySelector(".sev-msg"), btn = f.querySelector("button[type=submit]");
    if (!A) return;
    A.client.rpc("ev_my_entry", { p_event: C.id }).then(function (r) {
      if (r.data && r.data.entry) { f.innerHTML = '<h3>' + esc(E.title) + '</h3><p class="sev-msg ok">' + T.entered + " #" + r.data.entry.entry_no + '</p><p class="sev-note">' + esc(E.afterNote || "") + "</p>"; }
    });
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var sel = f.querySelector("[data-country]");
      var ok = Array.prototype.every.call(f.querySelectorAll("[data-req]"), function (i) { return i.checked; }) && (!sel || sel.value);
      if (!ok) { msg.className = "sev-msg err"; msg.textContent = T.need; return; }
      var mk = {}; Array.prototype.forEach.call(f.querySelectorAll("[data-mkt]"), function (i) { mk[i.getAttribute("data-mkt")] = i.checked; });
      btn.disabled = true; btn.textContent = T.entering; msg.className = "sev-msg"; msg.textContent = "";
      A.client.rpc("ev_enter", {
        p_event: C.id, p_country: sel ? sel.value : "KR", p_age_ok: true, p_residency_ok: true,
        p_rules_version: C.versions.rules, p_consent_version: C.versions.consent, p_marketing: mk, p_marketing_version: C.versions.marketing
      }).then(function (r) {
        if (r.error) throw r.error;
        f.innerHTML = '<h3>' + esc(E.title) + '</h3><p class="sev-msg ok">' + T.entered + " #" + r.data.entry_no + '</p><p class="sev-note">' + esc(E.afterNote || "") + "</p>";
      }).catch(function (e) { btn.disabled = false; btn.innerHTML = T.enter + ARROW; msg.className = "sev-msg err"; msg.textContent = errText(e); });
    });
  }

  // ---------- 가입 혜택 상자 ----------
  function welcomeBox(host, A) {
    var W = C.welcome || {};
    var user = A && A.user && A.user();
    var head = '<h3>' + esc(W.title) + "</h3>" + (W.points ? '<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7">' + W.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "");
    if (!A) { host.innerHTML = '<div class="sev sev-box">' + head + '<button class="sev-cta" type="button" disabled>' + esc(T.welcome_login) + ARROW + '</button><p class="sev-note">' + esc(T.preview_w) + "</p></div>"; return; }
    if (!user) {
      host.innerHTML = '<div class="sev sev-box">' + head + '<button class="sev-cta" type="button" data-go>' + esc(T.welcome_login) + ARROW + '</button><p class="sev-note">' + esc(W.note || "") + "</p></div>";
      host.querySelector("[data-go]").addEventListener("click", function () { A.open("signup"); });
      A.onChange && A.onChange(function () { welcomeBox(host, A); });
      return;
    }
    host.innerHTML = '<div class="sev sev-box">' + head + '<button class="sev-cta" type="button" data-claim>' + esc(T.claim) + ARROW + '</button><p class="sev-msg" role="status" aria-live="polite"></p></div>';
    var b = host.querySelector("[data-claim]"), m = host.querySelector(".sev-msg");
    b.addEventListener("click", function () {
      b.disabled = true;
      A.client.rpc("ev_claim_welcome", { p_site: C.site }).then(function (r) {
        if (r.error) throw r.error;
        var d = r.data || {};
        m.className = "sev-msg ok";
        m.textContent = (W.done ? W.done(d) : T.claimed);
        if (d.benefit === "guide_pdf" && W.pdf) { var a = document.createElement("a"); a.className = "sev-cta"; a.href = W.pdf; a.textContent = W.pdfLabel || "PDF"; a.setAttribute("download", ""); m.after(a); }
        b.remove();
      }).catch(function (e) { b.disabled = false; m.className = "sev-msg err"; m.textContent = errText(e); });
    });
  }

  function mount() {
    banner();
    var hosts = document.querySelectorAll("[data-event-entry]");
    if (!hosts.length) return;
    auth(function (A) {
      Array.prototype.forEach.call(hosts, function (h) { (C.kind === "welcome" ? welcomeBox : drawBox)(h, A); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
