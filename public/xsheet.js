/* 거래소 선택 시트 — 하단 탭·상단 메뉴·분류를 누르면 Perpline 제휴 거래소 목록을 한 번 띄운다.
   데이터: Perpline 공개 피드 (perpline/api/venues.json, 같은 github.io 출처). 못 불러오면 아무것도 막지 않는다.
   빈도: 기기당 COOL_H 시간에 한 번. 광고 유입(adclean)·검색봇·접근성 축소 모드에서는 띄우지 않는다. */
(function () {
  if (window.__cbx) return; window.__cbx = 1;
  var D = document, H = D.documentElement;
  try { if (H.classList.contains("adclean")) return; } catch (e) {}
  if (/bot|crawl|spider|lighthouse/i.test(navigator.userAgent)) return;

  var FEED = "https://probe2928-crypto.github.io/perpline/api/venues.json";
  var COOL_H = 3, KEY = "cbx-last", SHOW = 6;
  var lang = (H.lang || "ko").slice(0, 2); if (lang !== "ko" && lang !== "zh") lang = "en";
  var T = {
    ko: { eye: "Partner · Perpline", tab: "거래소 페이백", tabTop: "{n}%", title: "거래할 거래소를 선택하세요", pay: function (n) { return "수수료 " + n + "% 페이백"; }, code: "코드", all: function (n) { return n + "곳 전체 비교"; }, cancel: "취소", go: "거래소로 이동", close: "닫기",
      notes: ["Perpline 제휴 링크예요. 가입 후 UID를 텔레그램 @{tg}로 보내면 거래 수수료 페이백을 매주 USDT로 받아요.", "해외 거주자 대상 서비스예요. 한국·미국 거주자는 이용할 수 없어요.", "선물·레버리지 거래는 원금을 모두 잃을 수 있어요. 체인브리프는 특정 거래소나 거래를 권유하지 않아요."] },
    en: { eye: "Partner · Perpline", tab: "Fee payback", tabTop: "{n}%", title: "Choose an exchange to trade on", pay: function (n) { return n + "% Payback"; }, code: "Code", all: function (n) { return "Compare all " + n; }, cancel: "Cancel", go: "Go to exchange", close: "Close",
      notes: ["Perpline partner links. After you sign up, send your UID to @{tg} on Telegram and get part of your trading fees back in USDT every week.", "Not available to residents of South Korea or the United States.", "Futures and leverage can lose your entire margin. CHAINBRIEF does not recommend any exchange or trade."] },
    zh: { eye: "合作 · Perpline", tab: "手续费返佣", tabTop: "{n}%", title: "请选择交易所", pay: function (n) { return "手续费返佣 " + n + "%"; }, code: "邀请码", all: function (n) { return "比较全部 " + n + " 家"; }, cancel: "取消", go: "前往交易所", close: "关闭",
      notes: ["以上为 Perpline 合作链接。注册后将 UID 发送至 Telegram @{tg}，每周以 USDT 返还部分交易手续费。", "不向韩国及美国居民提供服务。", "合约与杠杆交易可能损失全部保证金。CHAINBRIEF 不推荐任何交易所或交易。"] },
  }[lang];

  var data = null, open = false;
  function recent() { try { return Date.now() - (+localStorage.getItem(KEY) || 0) < COOL_H * 3600e3; } catch (e) { return true; } }
  function mark() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  fetch(FEED, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (j && j.venues && j.venues.length) { data = j; addTab(); }
  }).catch(function () {});

  // 언제든 다시 열 수 있는 오른쪽 가장자리 반투명 버튼
  function addTab() {
    if (D.querySelector(".cbx-tab")) return;
    var top = data.venues.reduce(function (m, v) { return Math.max(m, v.rebate || 0); }, 0);
    var b = D.createElement("button");
    b.type = "button"; b.className = "cbx-tab";
    b.setAttribute("aria-label", T.title);
    b.innerHTML = '<span class="cbx-tab-p">' + esc(T.tabTop.replace("{n}", top)) + '</span><span class="cbx-tab-l">' + esc(T.tab) + "</span>";
    b.addEventListener("click", function () { if (!open) show(""); });
    D.body.appendChild(b);
  }

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var TRIG = "nav.tabs a, nav.top a:not(.nav-wm):not(.nav-search), #filters .tab, #kindTabs .tab, .desks a";

  D.addEventListener("click", function (e) {
    if (open || !data || recent() || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var el = e.target.closest && e.target.closest(TRIG); if (!el) return;
    var href = el.tagName === "A" ? el.href : "";
    if (href) e.preventDefault();          // 링크: 시트를 닫으면 원래 가려던 곳으로
    show(href);                             // 분류 버튼: 필터는 그대로 적용되고 시트만 위에 뜸
  }, true);

  function show(next) {
    open = true; if (next !== "") mark();
    var vs = data.venues.slice(0, SHOW), more = data.venues.length;
    var notes = T.notes.map(function (n) { return "<li>" + esc(n.replace("{tg}", data.telegram || "btcbullit")) + "</li>"; }).join("");
    var wrap = D.createElement("div");
    wrap.className = "cbx"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-labelledby", "cbxT");
    wrap.innerHTML = '<div class="cbx-bg" data-x></div><div class="cbx-sheet"><div class="cbx-grip" aria-hidden="true"></div>' +
      '<div class="cbx-head"><span class="label">' + esc(T.eye) + '</span><button type="button" class="cbx-x" data-x aria-label="' + esc(T.close) + '">×</button></div>' +
      '<h2 id="cbxT">' + esc(T.title) + '</h2>' +
      '<div class="cbx-list" role="radiogroup">' + vs.map(function (v, i) {
        var lg = v.logo ? '<img src="' + esc(v.logo) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement(\'b\'),{textContent:\'' + esc(v.name.charAt(0)) + '\'}))">' : "<b>" + esc(v.name.charAt(0)) + "</b>";
        return '<button type="button" class="cbx-row" role="radio" aria-checked="false" data-i="' + i + '"><span class="cbx-lg">' + lg + '</span><span class="cbx-nm">' + esc(v.name) + (v.code ? '<small>' + esc(T.code) + " " + esc(v.code) + "</small>" : "") + '</span><span class="cbx-pay">' + esc(T.pay(v.rebate)) + "</span></button>";
      }).join("") + "</div>" +
      '<a class="cbx-all" href="' + esc(data.url) + '?ref=chainbrief" target="_blank" rel="noopener sponsored">' + esc(T.all(more)) + ' · Perpline <span aria-hidden="true">→</span></a>' +
      '<ul class="cbx-notes">' + notes + "</ul>" +
      '<div class="cbx-btns"><button type="button" class="cbx-cancel" data-x>' + esc(T.cancel) + '</button><a class="cbx-go" aria-disabled="true" target="_blank" rel="noopener sponsored">' + esc(T.go) + "</a></div></div>";
    D.body.appendChild(wrap);
    var prevOverflow = D.body.style.overflow; D.body.style.overflow = "hidden";
    requestAnimationFrame(function () { wrap.classList.add("on"); });
    var go = wrap.querySelector(".cbx-go"), rows = wrap.querySelectorAll(".cbx-row");
    rows.forEach(function (r) {
      r.addEventListener("click", function () {
        rows.forEach(function (x) { x.setAttribute("aria-checked", x === r ? "true" : "false"); });
        go.href = vs[+r.dataset.i].ref; go.removeAttribute("aria-disabled");
      });
    });
    function close(follow) {
      if (!open) return; open = false;
      wrap.classList.remove("on"); D.body.style.overflow = prevOverflow;
      D.removeEventListener("keydown", onKey);
      setTimeout(function () { wrap.remove(); if (follow && next) location.href = next; }, 260);
    }
    function onKey(e) { if (e.key === "Escape") close(true); }
    D.addEventListener("keydown", onKey);
    wrap.querySelectorAll("[data-x]").forEach(function (b) { b.addEventListener("click", function () { close(true); }); });
    go.addEventListener("click", function (e) {
      if (go.hasAttribute("aria-disabled")) { e.preventDefault(); return; }
      setTimeout(function () { close(true); }, 50);   // 새 창으로 거래소를 열고, 이 창은 원래 가려던 곳으로
    });
    var first = wrap.querySelector(".cbx-row"); if (first) first.focus({ preventScroll: true });
  }
})();
