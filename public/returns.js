/* 코인 수익률 히트맵 (월별·분기별) — 체인브리프 /returns/ · Perpline returns.html 공용
   <div data-returns data-src=".../api/returns.json" data-lang="ko|en|zh"></div>
   데이터: 일봉 종가(UTC 0시) 월말 값 + 최근 400일. 진행 중인 달·분기는 현재가 기준(통계 제외). */
(function () {
  "use strict";
  var T = {
    ko: { m: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"], q: ["1분기", "2분기", "3분기", "4분기"], yr: "연간",
      monthly: "월별", quarterly: "분기별", avg: "평균", med: "중앙값", win: "상승 확률", best: "최고", worst: "최저",
      mtd: "이번 달 누적", qtd: "이번 분기 누적", ytd: "올해 누적", d30: "최근 30일", medOf: "역대 {p} 중앙값", sameM: "{m}", sameQ: "{q}", year: "연간",
      season: "월별 계절성", seasonD: "달마다 역대 수익률의 중앙값 · 막대 위 숫자는 상승 확률", live: "점선 칸: 진행 중 · 현재가 기준, 통계 제외",
      basis: "{c} · 달러 기준 · {a}–{b}년 통계 · UTC 0시 종가", disc: "과거 수익률은 미래 수익을 보장하지 않아요. 투자 권유가 아닌 참고 자료예요.",
      loading: "불러오는 중…", fail: "데이터를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.", years: "{n}년", coin: "코인", period: "기간", updated: "업데이트" },
    en: { m: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], q: ["Q1", "Q2", "Q3", "Q4"], yr: "Year",
      monthly: "Monthly", quarterly: "Quarterly", avg: "Average", med: "Median", win: "Win rate", best: "Best", worst: "Worst",
      mtd: "Month to date", qtd: "Quarter to date", ytd: "Year to date", d30: "Last 30 days", medOf: "Historical {p} median", sameM: "{m}", sameQ: "{q}", year: "annual",
      season: "Monthly seasonality", seasonD: "Median return for each month · win rate above each bar", live: "Dashed cell: in progress · live price, excluded from stats",
      basis: "{c} · USD · {a}–{b} statistics · 00:00 UTC closes", disc: "Past returns do not guarantee future results. Information only, not investment advice.",
      loading: "Loading…", fail: "Couldn't load the data. Please try again shortly.", years: "{n} yrs", coin: "Coin", period: "Period", updated: "Updated" },
    zh: { m: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"], q: ["第一季度", "第二季度", "第三季度", "第四季度"], yr: "全年",
      monthly: "月度", quarterly: "季度", avg: "平均", med: "中位数", win: "上涨概率", best: "最高", worst: "最低",
      mtd: "本月累计", qtd: "本季累计", ytd: "年初至今", d30: "近30天", medOf: "历史{p}中位数", sameM: "{m}", sameQ: "{q}", year: "年度",
      season: "月度季节性", seasonD: "各月历史收益中位数 · 柱上数字为上涨概率", live: "虚线格：进行中 · 按现价计算，不计入统计",
      basis: "{c} · 美元计价 · {a}–{b}年统计 · UTC 0点收盘价", disc: "历史收益不代表未来表现。仅供参考，不构成投资建议。",
      loading: "加载中…", fail: "数据加载失败，请稍后再试。", years: "{n}年", coin: "币种", period: "周期", updated: "更新" },
  };
  var CG = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple" };
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ""; }); }
  function pct(x, d) { if (x == null || !isFinite(x)) return "—"; var v = x * 100; return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d == null ? 2 : d) + "%"; }
  function median(a) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function stats(a) { if (!a.length) return null; var sum = 0, up = 0; a.forEach(function (x) { sum += x; if (x > 0) up++; }); return { avg: sum / a.length, med: median(a), win: up / a.length, best: Math.max.apply(null, a), worst: Math.min.apply(null, a), n: a.length }; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function shade(x) { if (x == null) return ""; var a = Math.min(1, Math.abs(x) / 0.35); var k = 14 + Math.round(a * 62); return x >= 0 ? "--rt-a:" + k + "%;" : "--rt-a:" + k + "%;"; }

  function build(root, data) {
    var L = T[root.getAttribute("data-lang")] || T.en;
    var coins = Object.keys(data.coins || {}); if (!coins.length) { root.innerHTML = '<p class="rt-empty">' + L.fail + "</p>"; return; }
    var state = { coin: coins[0], per: "m" };
    try { var saved = JSON.parse(localStorage.getItem("rt-state") || "null"); if (saved && data.coins[saved.coin]) state = saved; } catch (e) {}
    root.innerHTML = "";
    var bar = el("div", "rt-bar");
    var ctabs = el("div", "rt-tabs"); ctabs.setAttribute("role", "group"); ctabs.setAttribute("aria-label", L.coin);
    coins.forEach(function (c) { var b = el("button", "rt-tab", c); b.type = "button"; b.dataset.coin = c; ctabs.appendChild(b); });
    var ptabs = el("div", "rt-tabs rt-per"); ptabs.setAttribute("role", "group"); ptabs.setAttribute("aria-label", L.period);
    [["m", L.monthly], ["q", L.quarterly]].forEach(function (p) { var b = el("button", "rt-tab", p[1]); b.type = "button"; b.dataset.per = p[0]; ptabs.appendChild(b); });
    bar.appendChild(ctabs); bar.appendChild(ptabs); root.appendChild(bar);
    var cards = el("div", "rt-cards"); root.appendChild(cards);
    var wrap = el("div", "rt-wrap"); wrap.tabIndex = 0; root.appendChild(wrap);
    var foot = el("p", "rt-note"); root.appendChild(foot);
    var seasonBox = el("section", "rt-season"); root.appendChild(seasonBox);
    var disc = el("p", "rt-disc", L.disc); root.appendChild(disc);

    function series(sym) {
      var c = data.coins[sym], keys = Object.keys(c.monthEnd).sort(), me = c.monthEnd;
      var live = c.livePrice || c.live, now = new Date(c.liveAt || Date.now());
      var curKey = now.toISOString().slice(0, 7);
      var mret = {}; // "YYYY-MM" → return
      for (var i = 1; i < keys.length; i++) mret[keys[i]] = me[keys[i]] / me[keys[i - 1]] - 1;
      var prevKey = keys[keys.length - 1], cur = null;
      if (live && prevKey && prevKey < curKey) cur = { key: curKey, r: live / me[prevKey] - 1 };
      // 분기·연간: 분기말/연말 종가 기준
      function endOf(y, m) { var k = y + "-" + (m < 10 ? "0" : "") + m; return me[k]; }
      var years = {}; keys.forEach(function (k) { years[k.slice(0, 4)] = 1; }); if (cur) years[curKey.slice(0, 4)] = 1;
      var ylist = Object.keys(years).sort().reverse();
      var qret = {}, yret = {}, curQ = null, curY = null;
      ylist.forEach(function (y) {
        y = +y;
        for (var q = 1; q <= 4; q++) {
          var e = endOf(y, q * 3), s = q === 1 ? endOf(y - 1, 12) : endOf(y, q * 3 - 3);
          if (e && s) qret[y + "-Q" + q] = e / s - 1;
        }
        var ye = endOf(y, 12), ys = endOf(y - 1, 12); if (ye && ys) yret[y] = ye / ys - 1;
      });
      if (cur) {
        var cy = +curKey.slice(0, 4), cm = +curKey.slice(5, 7), cq = Math.ceil(cm / 3);
        var qs = cq === 1 ? endOf(cy - 1, 12) : endOf(cy, cq * 3 - 3); if (qs) curQ = { key: cy + "-Q" + cq, r: live / qs - 1 };
        var ys2 = endOf(cy - 1, 12); if (ys2) curY = { key: String(cy), r: live / ys2 - 1 };
      }
      var d = c.daily || [], d30 = null;
      if (live && d.length > 30) d30 = live / d[d.length - 30][1] - 1;
      return { mret: mret, qret: qret, yret: yret, cur: cur, curQ: curQ, curY: curY, d30: d30, years: ylist, first: keys[1] || keys[0], last: prevKey, now: now };
    }

    function card(label, v, sub) { return '<div class="rt-card"><span class="rt-cl">' + label + '</span><b class="rt-cv ' + (v == null ? "" : v >= 0 ? "up" : "dn") + '">' + pct(v) + '</b><span class="rt-cs">' + (sub || "&nbsp;") + "</span></div>"; }

    function render() {
      try { localStorage.setItem("rt-state", JSON.stringify(state)); } catch (e) {}
      [].forEach.call(ctabs.children, function (b) { b.setAttribute("aria-pressed", b.dataset.coin === state.coin); });
      [].forEach.call(ptabs.children, function (b) { b.setAttribute("aria-pressed", b.dataset.per === state.per); });
      var S = series(state.coin), now = S.now, cm = now.getUTCMonth(), cq = Math.floor(cm / 3);
      // 요약 카드
      var sameM = [], sameQ = [], yrs = [];
      Object.keys(S.mret).forEach(function (k) { if (+k.slice(5, 7) === cm + 1) sameM.push(S.mret[k]); });
      Object.keys(S.qret).forEach(function (k) { if (k.slice(-1) === String(cq + 1)) sameQ.push(S.qret[k]); });
      Object.keys(S.yret).forEach(function (k) { yrs.push(S.yret[k]); });
      cards.innerHTML =
        card(L.mtd, S.cur && S.cur.r, fmt(L.medOf, { p: L.m[cm] }) + " " + pct(median(sameM))) +
        card(L.qtd, S.curQ && S.curQ.r, fmt(L.medOf, { p: L.q[cq] }) + " " + pct(median(sameQ))) +
        card(L.ytd, S.curY && S.curY.r, fmt(L.medOf, { p: L.year }) + " " + pct(median(yrs))) +
        card(L.d30, S.d30, "");
      // 표
      var cols = state.per === "m" ? L.m.map(function (n, i) { return { n: n, k: function (y) { return y + "-" + (i < 9 ? "0" : "") + (i + 1); }, src: S.mret, curKey: S.cur && S.cur.key, cur: S.cur } })
                                   : L.q.map(function (n, i) { return { n: n, k: function (y) { return y + "-Q" + (i + 1); }, src: S.qret, curKey: S.curQ && S.curQ.key, cur: S.curQ } });
      cols.push({ n: L.yr, k: function (y) { return String(y); }, src: S.yret, curKey: S.curY && S.curY.key, cur: S.curY, yr: true });
      var h = '<table class="rt-table"><thead><tr><th scope="col"></th>' + cols.map(function (c) { return '<th scope="col"' + (c.yr ? ' class="rt-yr"' : "") + ">" + c.n + "</th>"; }).join("") + "</tr></thead><tbody>";
      var colVals = cols.map(function () { return []; });
      S.years.forEach(function (y) {
        h += '<tr><th scope="row">' + y + "</th>";
        cols.forEach(function (c, ci) {
          var key = c.k(y), v = c.src[key], isCur = c.curKey === key && v == null;
          if (isCur) v = c.cur.r;
          if (v != null && !isCur) colVals[ci].push(v);
          h += "<td" + (v == null ? "" : ' class="' + (v >= 0 ? "up" : "dn") + (isCur ? " cur" : "") + (c.yr ? " rt-yr" : "") + '" style="' + shade(v) + '"') + ">" + (v == null ? "" : pct(v)) + "</td>";
        });
        h += "</tr>";
      });
      h += "</tbody><tfoot>";
      [["avg", L.avg], ["med", L.med], ["win", L.win], ["best", L.best], ["worst", L.worst]].forEach(function (r) {
        h += '<tr><th scope="row">' + r[1] + "</th>" + colVals.map(function (vals) { var s = stats(vals); if (!s) return "<td></td>"; var v = s[r[0]]; return r[0] === "win" ? "<td>" + Math.round(v * 100) + "%</td>" : '<td class="' + (v >= 0 ? "up" : "dn") + '">' + pct(v) + "</td>"; }).join("") + "</tr>";
      });
      h += "</tfoot></table>";
      wrap.innerHTML = h;
      foot.innerHTML = fmt(L.basis, { c: state.coin, a: S.first.slice(0, 4), b: S.last.slice(0, 4) }) + " · " + L.live;
      // 계절성 (월별 중앙값 + 상승 확률)
      var med = [], win = [], mx = 0;
      for (var m = 0; m < 12; m++) {
        var arr = []; Object.keys(S.mret).forEach(function (k) { if (+k.slice(5, 7) === m + 1) arr.push(S.mret[k]); });
        var st = stats(arr); med.push(st ? st.med : 0); win.push(st ? st.win : null); mx = Math.max(mx, Math.abs(st ? st.med : 0));
      }
      mx = mx || 0.01;
      var bars = med.map(function (v, i) {
        var hgt = Math.round(Math.abs(v) / mx * 46);
        return '<div class="rt-sb' + (i === cm ? " now" : "") + '"><span class="rt-sw">' + (win[i] == null ? "" : Math.round(win[i] * 100) + "%") + '</span><div class="rt-sc"><i class="' + (v >= 0 ? "up" : "dn") + '" style="height:' + hgt + "px;" + (v >= 0 ? "bottom:50%" : "top:50%") + '"></i></div><span class="rt-sv ' + (v >= 0 ? "up" : "dn") + '">' + pct(v, 1) + '</span><span class="rt-sm">' + L.m[i] + "</span></div>";
      }).join("");
      seasonBox.innerHTML = '<h3 class="rt-h">' + L.season + " · " + state.coin + '</h3><p class="rt-sub">' + L.seasonD + '</p><div class="rt-sbars">' + bars + "</div>";
    }
    ctabs.addEventListener("click", function (e) { var b = e.target.closest("[data-coin]"); if (b) { state.coin = b.dataset.coin; render(); } });
    ptabs.addEventListener("click", function (e) { var b = e.target.closest("[data-per]"); if (b) { state.per = b.dataset.per; render(); } });
    render();
    // 현재가로 진행 중 칸 갱신 (실패하면 데이터 파일 값 사용)
    try {
      var ids = coins.map(function (c) { return CG[c]; }).filter(Boolean).join(",");
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=" + ids + "&vs_currencies=usd").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!j) return; var hit = false;
        coins.forEach(function (c) { var p = j[CG[c]] && j[CG[c]].usd; if (p) { data.coins[c].livePrice = p; data.coins[c].liveAt = Date.now(); hit = true; } });
        if (hit) render();
      }).catch(function () {});
    } catch (e) {}
  }

  function init(root) {
    var L = T[root.getAttribute("data-lang")] || T.en;
    root.innerHTML = '<p class="rt-empty">' + L.loading + "</p>";
    fetch(root.getAttribute("data-src"), { cache: "no-cache" }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { build(root, d); })
      .catch(function () { root.innerHTML = '<p class="rt-empty">' + L.fail + "</p>"; });
  }
  function start() { [].forEach.call(document.querySelectorAll("[data-returns]"), init); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
