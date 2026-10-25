// 체인브리프 클라이언트: 시세, 김프, 공포탐욕, 속보 필터, 새 속보 알림, PWA
(() => {
  const CB = window.CB || { base: "/", coins: [] };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  async function getJSON(url, ms = 10000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  /* 시계 (KST) */
  const clock = $("#clock");
  const kst = () => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  if (clock) { clock.textContent = kst(); setInterval(() => (clock.textContent = kst()), 15000); }

  /* 숫자 포맷 */
  const usd = (p) => p == null ? "—" : p >= 1000 ? p.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p >= 1 ? p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : p.toPrecision(4);
  const krw = (p) => p == null ? "—" : p >= 100 ? Math.round(p).toLocaleString("ko-KR") : p.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  const pct = (c) => c == null || isNaN(c) ? "" : (c > 0 ? "+" : "") + c.toFixed(2) + "%";
  const dir = (c) => (c >= 0 ? "up" : "down");
  const big = (n) => n == null ? "—" : n >= 1e12 ? (n / 1e12).toFixed(1) + "조" : n >= 1e8 ? Math.round(n / 1e8).toLocaleString("ko-KR") + "억" : Math.round(n).toLocaleString("ko-KR");

  /* 시세 */
  const ids = CB.coins.map((c) => c.id).join(",");
  // 업비트에 없는 코인이 하나라도 섞이면 요청 전체가 404가 나므로, 설정에서 upbit:false인 코인은 뺀다
  const markets = CB.coins.filter((c) => c.upbit !== false).map((c) => "KRW-" + c.symbol).join(",");
  let last = store.get("cb-prices") || {};

  function paint(data) {
    for (const c of CB.coins) {
      const d = data[c.id];
      if (!d) continue;
      const prev = last[c.id]?.usd;
      $$(`[data-tape="${c.id}"], [data-row="${c.id}"]`).forEach((el) => {
        const p = $(".p", el), ch = $(".c", el);
        if (p) {
          p.textContent = (el.dataset.tape ? "$" : "") + usd(d.usd);
          if (prev && prev !== d.usd) {
            p.classList.remove("flash-up", "flash-down"); void p.offsetWidth;
            p.classList.add(d.usd > prev ? "flash-up" : "flash-down");
          }
        }
        if (ch) { ch.textContent = pct(d.usd_24h_change); ch.className = "num c " + dir(d.usd_24h_change); }
        const k = $(".krw", el); if (k) k.textContent = d.upbit ? krw(d.upbit) : "—";
        const kp = $(".kimp", el);
        if (kp) { kp.textContent = d.kimp == null ? "—" : pct(d.kimp); kp.className = "num kimp " + (d.kimp == null ? "" : dir(d.kimp)); }
        const v = $(".vol", el); if (v) v.textContent = d.krw_24h_vol ? big(d.krw_24h_vol) + "원" : "—";
      });
    }
    const btc = data.bitcoin;
    const kb = $("#kimpBtc");
    if (kb && btc && btc.kimp != null) { kb.textContent = pct(btc.kimp); kb.className = "num " + dir(btc.kimp); }
  }

  async function loadPrices() {
    const upd = $("#mktUpdated");
    try {
      const g = await getJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,krw&include_24hr_change=true&include_24hr_vol=true`);
      let up = {};
      try {
        const u = markets ? await getJSON(`https://api.upbit.com/v1/ticker?markets=${markets}`) : [];
        for (const t of u) up[t.market.replace("KRW-", "")] = t.trade_price;
      } catch { /* 업비트 실패 시 김프만 비움 */ }
      const data = {};
      for (const c of CB.coins) {
        const d = g[c.id]; if (!d) continue;
        const fx = d.krw && d.usd ? d.krw / d.usd : null;
        const upbit = up[c.symbol] ?? null;
        data[c.id] = { ...d, upbit, kimp: upbit && fx ? (upbit / (d.usd * fx) - 1) * 100 : null };
      }
      paint(data);
      last = data; store.set("cb-prices", data);
      if (upd) upd.textContent = kst() + " 기준";
    } catch {
      if (upd) upd.textContent = "시세를 불러오지 못했어요. 1분 뒤 다시 시도해요.";
    }
  }
  if (Object.keys(last).length) paint(last);
  if (CB.coins.length) { loadPrices(); setInterval(loadPrices, 60000); }

  /* 공포·탐욕, 도미넌스 */
  const FNG = { "Extreme Fear": "극단적 공포", Fear: "공포", Neutral: "중립", Greed: "탐욕", "Extreme Greed": "극단적 탐욕" };
  async function loadSentiment() {
    if (!$("#fngVal")) return;
    try {
      const f = await getJSON("https://api.alternative.me/fng/?limit=2");
      const [now, prev] = f.data;
      const v = +now.value;
      $("#fngVal").textContent = v;
      const lbl = $("#fngLbl");
      lbl.textContent = FNG[now.value_classification] || now.value_classification;
      lbl.className = "lbl " + (v < 45 ? "down" : v > 55 ? "up" : "");
      $("#fngBar").style.left = v + "%";
      if (prev) $("#fngPrev").textContent = "어제 " + prev.value;
    } catch {}
    try {
      const g = await getJSON("https://api.coingecko.com/api/v3/global");
      $("#btcDom").textContent = g.data.market_cap_percentage.btc.toFixed(1) + "%";
    } catch {}
  }
  loadSentiment(); setInterval(loadSentiment, 300000);

  /* 상대 시간 */
  function rel() {
    const now = Date.now();
    $$("[data-rel]").forEach((el) => {
      const m = Math.round((now - new Date(el.dataset.rel)) / 60000);
      el.textContent = m < 1 ? "방금" : m < 60 ? m + "분 전" : m < 1440 ? Math.floor(m / 60) + "시간 전" : Math.floor(m / 1440) + "일 전";
    });
  }
  rel(); setInterval(rel, 60000);

  /* 속보 필터·검색 */
  const feed = $("#feed");
  if (feed) {
    let cat = "전체", q = "";
    const apply = () => {
      let shown = 0;
      $$(".item", feed).forEach((it) => {
        const okCat = cat === "전체" || (cat === "중요" ? it.dataset.imp === "1" : it.dataset.cat === cat);
        const ok = okCat && (!q || it.textContent.toLowerCase().includes(q));
        it.hidden = !ok; if (ok) shown++;
      });
      $$(".day", feed).forEach((d) => {
        let n = d.nextElementSibling, any = false;
        while (n && !n.classList.contains("day")) { if (!n.hidden) any = true; n = n.nextElementSibling; }
        d.hidden = !any;
      });
      const nm = $("#noMatch"); if (nm) nm.hidden = shown > 0 || !$(".item", feed);
    };
    $("#filters")?.addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      cat = b.dataset.c;
      $$("#filters .chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
      apply();
    });
    $("#q")?.addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); apply(); });

    // 새 속보 확인 (1분마다)
    const latest = CB.latest;
    setInterval(async () => {
      try {
        const list = await getJSON(CB.base + "flash.json?t=" + Date.now());
        const idx = list.findIndex((f) => f.id === latest);
        const n = idx === -1 ? list.length : idx;
        if (n > 0) { $("#newBtn").textContent = `새 속보 ${n}건 보기`; $("#newWrap").hidden = false; }
      } catch {}
    }, 60000);
    $("#newBtn")?.addEventListener("click", () => location.reload());
  }

  /* 헤드라인 매체 필터 */
  $("#srcFilters")?.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    $$("#srcFilters .chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
    const s = b.dataset.src;
    $$("#hlList li").forEach((li) => (li.hidden = s !== "전체" && $(".src b", li).textContent !== s));
  });

  /* 용어 검색 */
  $("#tq")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase(); let n = 0;
    $$("#terms .term").forEach((t) => { const ok = !q || t.textContent.toLowerCase().includes(q); t.hidden = !ok; if (ok) n++; });
    $("#noTerm").hidden = n > 0;
  });

  /* 링크 복사 */
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); b.textContent = "복사됨"; }
    catch { b.textContent = location.href; }
    setTimeout(() => (b.textContent = "링크 복사"), 2000);
  }));

  /* PWA */
  if ("serviceWorker" in navigator) navigator.serviceWorker.register(CB.base + "sw.js").catch(() => {});
  let deferred;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; $("#installBtn").hidden = false; });
  $("#installBtn")?.addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $("#installBtn").hidden = true; });
})();
