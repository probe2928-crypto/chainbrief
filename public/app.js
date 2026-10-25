// 체인브리프 클라이언트: 시세·김프·심리, 속보 필터, 상장 소식, 급등 레이더, 커뮤니티 게시판, PWA
(() => {
  const CB = window.CB || { base: "/", coins: [], sb: {} };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  async function getJSON(url, opts = {}, ms = 12000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { cache: "no-store", ...opts, signal: ctl.signal });
      if (!r.ok) { const e = new Error(r.status); e.status = r.status; try { e.body = await r.json(); } catch {} throw e; }
      return r.status === 204 ? null : await r.json();
    } finally { clearTimeout(t); }
  }
  const visible = () => document.visibilityState === "visible";
  function every(fn, ms) { fn(); setInterval(() => visible() && fn(), ms); }
  async function cached(key, ttl, load) {
    const c = store.get(key);
    if (c && Date.now() - c.t < ttl) return c.v;
    const v = await load(); store.set(key, { t: Date.now(), v }); return v;
  }

  /* 시계 (KST) */
  const kst = (o = { hour: "2-digit", minute: "2-digit" }) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour12: false, ...o }).format(new Date());
  const clock = $("#clock");
  if (clock) setInterval(() => (clock.textContent = kst()), 15000);

  /* 포맷 */
  const usd = (p) => p == null ? "—" : p >= 1000 ? p.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p >= 1 ? p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : p.toPrecision(4);
  const krw = (p) => p == null || isNaN(p) ? "—" : p >= 100 ? Math.round(p).toLocaleString("ko-KR") : (+p).toLocaleString("ko-KR", { maximumFractionDigits: p >= 1 ? 2 : 4 });
  const pct = (c) => c == null || isNaN(c) ? "" : (c > 0 ? "+" : "") + (+c).toFixed(2) + "%";
  const dir = (c) => (c >= 0 ? "up" : "down");
  const eok = (n) => n == null ? "—" : n >= 1e12 ? (n / 1e12).toFixed(1) + "조" : n >= 1e8 ? Math.round(n / 1e8).toLocaleString("ko-KR") + "억" : Math.round(n / 1e4).toLocaleString("ko-KR") + "만";

  /* ---------- 주요 시세 · 김프 ---------- */
  const ids = CB.coins.map((c) => c.id).join(",");
  const markets = CB.coins.filter((c) => c.upbit !== false).map((c) => "KRW-" + c.symbol).join(",");
  let last = store.get("cb-prices") || {};
  function paint(data) {
    for (const c of CB.coins) {
      const d = data[c.id]; if (!d) continue;
      const prev = last[c.id]?.usd;
      $$(`[data-tape="${c.id}"], [data-row="${c.id}"]`).forEach((el) => {
        const p = $(".p", el), ch = $(".c", el);
        if (p) {
          p.textContent = (el.dataset.tape ? "$" : "") + usd(d.usd);
          if (prev && prev !== d.usd) { p.classList.remove("flash-up", "flash-down"); void p.offsetWidth; p.classList.add(d.usd > prev ? "flash-up" : "flash-down"); }
        }
        if (ch) { ch.textContent = pct(d.usd_24h_change); ch.className = "num c " + dir(d.usd_24h_change); }
        const k = $(".krw", el); if (k) k.textContent = d.upbit ? krw(d.upbit) : "—";
        const kp = $(".kimp", el); if (kp) { kp.textContent = d.kimp == null ? "—" : pct(d.kimp); kp.className = "num kimp " + (d.kimp == null ? "" : dir(d.kimp)); }
        const v = $(".vol", el); if (v) v.textContent = d.krw_24h_vol ? eok(d.krw_24h_vol) : "—";
      });
    }
    const btc = data.bitcoin, kb = $("#kimpBtc");
    if (kb && btc && btc.kimp != null) { kb.textContent = pct(btc.kimp); kb.className = "num " + dir(btc.kimp); }
    if (btc && btc.kimp != null) $$("[data-kimp]").forEach((el) => (el.textContent = pct(btc.kimp)));
  }
  async function loadPrices() {
    const upd = $("#mktUpdated");
    try {
      const g = await getJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,krw&include_24hr_change=true&include_24hr_vol=true`);
      const up = {};
      let src = "업비트";
      try { for (const t of await getJSON(`https://api.upbit.com/v1/ticker?markets=${markets}`)) up[t.market.slice(4)] = t.trade_price; } catch {}
      if (!Object.keys(up).length) {
        // 업비트가 응답하지 않으면 빗썸 원화 가격으로 김프 계산
        try { for (const t of await getJSON(`https://api.bithumb.com/v1/ticker?markets=${CB.coins.filter((c) => c.symbol !== "BNB").map((c) => "KRW-" + c.symbol).join(",")}`)) up[t.market.slice(4)] = t.trade_price; src = "빗썸"; } catch {}
      }
      $$("[data-kimp-src]").forEach((el) => (el.textContent = `${src} BTC 기준`));
      const data = {};
      for (const c of CB.coins) {
        const d = g[c.id]; if (!d) continue;
        const fx = d.krw && d.usd ? d.krw / d.usd : null, upbit = up[c.symbol] ?? null;
        data[c.id] = { ...d, upbit, kimp: upbit && fx ? (upbit / (d.usd * fx) - 1) * 100 : null };
      }
      paint(data); last = data; store.set("cb-prices", data);
      if (upd) upd.textContent = kst() + " 기준";
    } catch { if (upd) upd.textContent = "시세를 불러오지 못했어요. 잠시 뒤 다시 시도해요."; }
  }
  if (Object.keys(last).length) paint(last);
  if (CB.coins.length) every(loadPrices, 60000);

  /* 공포·탐욕, 도미넌스 */
  const FNG = { "Extreme Fear": "극단적 공포", Fear: "공포", Neutral: "중립", Greed: "탐욕", "Extreme Greed": "극단적 탐욕" };
  async function loadSentiment() {
    if (!$("#fngVal") && !$("[data-fng]")) return;
    try {
      const [now, prev] = (await getJSON("https://api.alternative.me/fng/?limit=2")).data;
      const v = +now.value;
      $$("[data-fng]").forEach((el) => (el.textContent = v));
      $$("[data-fng-lbl]").forEach((el) => (el.textContent = (FNG[now.value_classification] || now.value_classification) + (prev ? ` · 어제 ${prev.value}` : "")));
      if (!$("#fngVal")) return;
      $("#fngVal").textContent = v;
      const lbl = $("#fngLbl"); lbl.textContent = FNG[now.value_classification] || now.value_classification;
      lbl.className = "lbl " + (v < 45 ? "down" : v > 55 ? "up" : "");
      $("#fngBar").style.left = v + "%";
      if (prev) $("#fngPrev").textContent = "어제 " + prev.value;
    } catch {}
    try { const g = await cached("cb-global", 300000, () => getJSON("https://api.coingecko.com/api/v3/global")); $("#btcDom").textContent = g.data.market_cap_percentage.btc.toFixed(1) + "%"; } catch {}
  }
  every(loadSentiment, 300000);

  /* 상대 시간 */
  function rel() {
    const now = Date.now();
    $$("[data-rel]").forEach((el) => {
      const m = Math.round((now - new Date(el.dataset.rel)) / 60000);
      el.textContent = m < 1 ? "방금" : m < 60 ? m + "분 전" : m < 1440 ? Math.floor(m / 60) + "시간 전" : Math.floor(m / 1440) + "일 전";
    });
  }
  rel(); setInterval(rel, 60000);

  /* 탭 그룹 공통 */
  function tabs(container, attr, onPick) {
    const c = typeof container === "string" ? $(container) : container; if (!c) return;
    c.addEventListener("click", (e) => {
      const b = e.target.closest(`[data-${attr}]`); if (!b) return;
      $$(`[data-${attr}]`, c).forEach((x) => x.setAttribute("aria-pressed", x === b));
      onPick(b.dataset[attr], b);
    });
  }

  /* ---------- 라이브 속보 ---------- */
  const feed = $("#feed");
  if (feed) {
    let cat = "전체", q = "";
    const apply = () => {
      let shown = 0;
      $$(".item", feed).forEach((it) => {
        const ok = (cat === "전체" || (cat === "중요" ? it.dataset.imp === "1" : it.dataset.cat === cat)) && (!q || it.textContent.toLowerCase().includes(q));
        it.hidden = !ok; if (ok) shown++;
      });
      $$(".day", feed).forEach((d) => { let n = d.nextElementSibling, any = false; while (n && !n.classList.contains("day")) { if (!n.hidden) any = true; n = n.nextElementSibling; } d.hidden = !any; });
      const nm = $("#noMatch"); if (nm) nm.hidden = shown > 0 || !$(".item", feed);
    };
    tabs("#filters", "c", (v) => { cat = v; apply(); });
    $("#q")?.addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); apply(); });
    setInterval(async () => {
      if (!visible()) return;
      try {
        const list = await getJSON(CB.base + "flash.json?t=" + Date.now());
        const idx = list.findIndex((f) => f.id === CB.latest), n = idx === -1 ? list.length : idx;
        if (n > 0) { $("#newBtn").textContent = `새 속보 ${n}건 보기`; $("#newWrap").hidden = false; }
      } catch {}
    }, 60000);
    $("#newBtn")?.addEventListener("click", () => location.reload());
  }

  /* 기사 종류 필터 */
  tabs("#kindTabs", "kind", (k) => $$("#artList .art").forEach((a) => (a.hidden = k !== "전체" && a.dataset.kind !== k)));

  /* 해외 헤드라인 매체 필터 */
  tabs("#srcFilters", "src", (s) => $$("#hlList li").forEach((li) => (li.hidden = s !== "전체" && $(".src b", li).textContent !== s)));

  /* ---------- 상장 소식: 상장 코인 현재가 ---------- */
  const API = { upbit: "https://api.upbit.com/v1", bithumb: "https://api.bithumb.com/v1" };
  const lsRows = $$(".lst[data-type='listing']");
  if (lsRows.length) {
    const fill = async () => {
      for (const ex of ["upbit", "bithumb"]) {
        const rows = lsRows.filter((r) => r.dataset.ex === ex && r.dataset.sym);
        if (!rows.length) continue;
        try {
          const names = await cached("cb-names-" + ex, 864e5, async () => Object.fromEntries((await getJSON(API[ex] + "/market/all")).filter((m) => m.market.startsWith("KRW-")).map((m) => [m.market.slice(4), m.korean_name])));
          const syms = [...new Set(rows.map((r) => r.dataset.sym))].filter((s) => names[s]);
          if (!syms.length) continue;
          const t = await getJSON(API[ex] + "/ticker?markets=" + syms.map((s) => "KRW-" + s).join(","));
          const px = Object.fromEntries(t.map((x) => [x.market.slice(4), x]));
          rows.forEach((r) => { const x = px[r.dataset.sym], box = $("[data-px]", r); if (box && x) box.innerHTML = `${krw(x.trade_price)}원<small class="${dir(x.signed_change_rate)}">${pct(x.signed_change_rate * 100)}</small>`; });
        } catch {}
      }
    };
    every(fill, 60000);
  }
  if ($("#daytabs")) {
    let ex = "all", ty = "all";
    const apply = () => $$(".lst", $("#daypanels")).forEach((r) => (r.hidden = (ex !== "all" && r.dataset.ex !== ex) || (ty !== "all" && !r.dataset.type.startsWith(ty))));
    tabs("#daytabs", "day", (d) => $$(".daypanel").forEach((p) => (p.hidden = p.dataset.day !== d)));
    tabs("#lsFilters", "ex", (v) => { ex = v; apply(); });
    tabs("#lsFilters", "type", (v) => { ty = v; apply(); });
  }

  /* ---------- 커뮤니티 ---------- */
  tabs("#extTabs", "g", (g) => $$("[data-gpanel]").forEach((p) => (p.hidden = p.dataset.gpanel !== g)));
  const SB = CB.sb && CB.sb.url && CB.sb.anonKey ? CB.sb : null;
  const sbHead = SB ? { apikey: SB.anonKey, Authorization: "Bearer " + SB.anonKey, "Content-Type": "application/json" } : {};
  const rest = (p) => getJSON(`${SB.url}/rest/v1/${p}`, { headers: sbHead });
  const rpc = (fn, body) => getJSON(`${SB.url}/rest/v1/rpc/${fn}`, { method: "POST", headers: sbHead, body: JSON.stringify(body) });
  const errMsg = (e) => (e.body && (e.body.message || e.body.hint)) || "잠시 후 다시 시도해 주세요.";
  const ago = (t) => { const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 1 ? "방금" : m < 60 ? m + "분 전" : m < 1440 ? Math.floor(m / 60) + "시간 전" : new Date(t).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }); };
  const postUrl = (id) => `${CB.base}community/post/?id=${id}`;
  const COLS = "id,created_at,category,nickname,title,views,likes,comment_count";
  const postLi = (p, rank) => `<li>${rank ? `<span class="rk" style="grid-row:span 2">${rank}</span>` : ""}<div style="min-width:0"><a class="tt" href="${postUrl(p.id)}">${esc(p.title)}</a>${p.comment_count ? `<span class="cc">[${p.comment_count}]</span>` : ""}<div class="sub" style="margin-top:4px"><span>${esc(p.category)}</span><span>${esc(p.nickname)}</span><span>${ago(p.created_at)}</span><span>조회 ${p.views}</span>${p.likes ? `<span>추천 ${p.likes}</span>` : ""}</div></div></li>`;

  if (SB && $("#weekly")) {
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    rest(`posts?select=${COLS}&created_at=gte.${since}&order=views.desc,likes.desc&limit=10`).then((l) => {
      $("#weekly").innerHTML = l.length ? l.map((p, i) => postLi(p, i + 1)).join("").replace(/<li>/g, '<li style="grid-template-columns:36px minmax(0,1fr)">') : '<li><span class="sub">이번 주 첫 글을 남겨보세요.</span></li>';
    }).catch(() => ($("#weekly").innerHTML = '<li><span class="sub">글을 불러오지 못했어요.</span></li>'));
  }
  if (SB && $("#board")) {
    let cat = "전체", page = 0;
    const load = async (reset) => {
      if (reset) { page = 0; $("#board").innerHTML = ""; }
      try {
        const l = await rest(`posts?select=${COLS}${cat !== "전체" ? `&category=eq.${encodeURIComponent(cat)}` : ""}&order=id.desc&limit=20&offset=${page * 20}`);
        $("#board").insertAdjacentHTML("beforeend", l.length || page ? l.map((p) => postLi(p)).join("") : '<li><span class="sub">아직 글이 없어요.</span></li>');
        $("#morePosts").hidden = l.length < 20; page++;
      } catch { $("#board").innerHTML = '<li><span class="sub">글을 불러오지 못했어요.</span></li>'; }
    };
    tabs("#boardTabs", "bc", (v) => { cat = v; load(true); });
    $("#morePosts").addEventListener("click", () => load(false));
    load(true);
  }
  if ($("#postView")) {
    const id = +new URLSearchParams(location.search).get("id");
    const view = $("#postView");
    const nick = store.get("cb-nick") || "";
    if ($("#cNick")) $("#cNick").value = nick;
    if (!SB || !id) view.innerHTML = '<div class="empty">글을 찾을 수 없어요.</div>';
    else {
      const loadComments = async () => {
        const cs = await rest(`comments?select=id,created_at,nickname,body&post_id=eq.${id}&order=id.asc`);
        $("#cmtCount").textContent = cs.length + "개";
        $("#cmts").innerHTML = cs.map((c) => `<li><b>${esc(c.nickname)}</b><time>${ago(c.created_at)}</time><p>${esc(c.body)}</p></li>`).join("") || '<li style="color:var(--mute)">첫 댓글을 남겨보세요.</li>';
      };
      rpc("view_post", { p_id: id }).then((rows) => {
        const p = Array.isArray(rows) ? rows[0] : rows;
        if (!p) throw new Error("없음");
        document.title = `${p.title} | 커뮤니티`;
        const liked = (store.get("cb-liked") || []).includes(id);
        view.innerHTML = `<span class="tag kr">${esc(p.category)}</span><h1>${esc(p.title)}</h1>
          <div class="byrow" style="display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--line);font-size:13px;color:var(--mute)"><span><b style="color:var(--ink);font-weight:500">${esc(p.nickname)}</b> · ${new Date(p.created_at).toLocaleString("ko-KR")}</span><span>조회 ${p.views}</span></div>
          <div class="pbody">${esc(p.body)}</div>
          <div class="actions"><button class="btn${liked ? "" : " ghost"}" id="likeBtn" type="button"${liked ? " disabled" : ""}>추천 <span class="num">${p.likes}</span></button><a class="btn ghost" href="${CB.base}community/">목록</a><button class="btn ghost" id="delBtn" type="button" style="margin-left:auto">삭제</button></div>
          <form class="f" id="delForm" hidden style="grid-template-columns:1fr auto;align-items:end"><div class="field"><label for="dPw">작성 시 입력한 비밀번호</label><input id="dPw" type="password" required></div><button class="btn" type="submit">삭제 확인</button><div class="msg" id="dMsg" style="grid-column:1/-1"></div></form>`;
        $("#cmtSec").hidden = false;
        $("#likeBtn").addEventListener("click", async (e) => {
          const b = e.currentTarget; b.disabled = true;
          try { const n = await rpc("like_post", { p_id: id }); $(".num", b).textContent = n; b.classList.remove("ghost"); store.set("cb-liked", [...(store.get("cb-liked") || []), id]); } catch { b.disabled = false; }
        });
        $("#delBtn").addEventListener("click", () => { $("#delForm").hidden = false; $("#dPw").focus(); });
        $("#delForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          try { const ok = await rpc("delete_post", { p_id: id, p_password: $("#dPw").value }); if (ok) location.href = CB.base + "community/"; else $("#dMsg").textContent = "비밀번호가 맞지 않아요."; }
          catch (er) { $("#dMsg").textContent = errMsg(er); }
        });
        loadComments();
      }).catch(() => (view.innerHTML = '<div class="empty">삭제됐거나 없는 글이에요.</div>'));
      $("#cmtForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const b = $("button[type=submit]", e.target); b.disabled = true; $("#cMsg").textContent = "";
        try {
          await rpc("create_comment", { p_post_id: id, p_nickname: $("#cNick").value.trim(), p_password: $("#cPw").value, p_body: $("#cBody").value.trim() });
          store.set("cb-nick", $("#cNick").value.trim()); $("#cBody").value = ""; await loadComments();
        } catch (er) { $("#cMsg").textContent = errMsg(er); }
        b.disabled = false;
      });
    }
  }
  if ($("#postForm")) {
    const f = $("#postForm");
    $("#pNick").value = store.get("cb-nick") || "";
    const draft = store.get("cb-draft"); if (draft) { $("#pTitle").value = draft.t || ""; $("#pBody").value = draft.b || ""; }
    f.addEventListener("input", () => store.set("cb-draft", { t: $("#pTitle").value, b: $("#pBody").value }));
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = $("button[type=submit]", f); b.disabled = true; $("#pMsg").textContent = "";
      try {
        const newId = await rpc("create_post", { p_category: $("#pCat").value, p_nickname: $("#pNick").value.trim(), p_password: $("#pPw").value, p_title: $("#pTitle").value.trim(), p_body: $("#pBody").value.trim() });
        store.set("cb-nick", $("#pNick").value.trim()); store.set("cb-draft", null);
        location.href = postUrl(newId);
      } catch (er) { $("#pMsg").textContent = errMsg(er); b.disabled = false; }
    });
  }

  /* 복사 버튼 */
  $$("[data-copy],[data-copytext]").forEach((b) => b.addEventListener("click", async () => {
    const text = b.dataset.copytext || location.href, label = b.textContent;
    try { await navigator.clipboard.writeText(text); b.textContent = "복사됨"; } catch { b.textContent = text; }
    setTimeout(() => (b.textContent = label), 2000);
  }));

  /* PWA */
  if ("serviceWorker" in navigator && !window.Capacitor) navigator.serviceWorker.register(CB.base + "sw.js").catch(() => {});
  let deferred;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; const b = $("#installBtn"); if (b) b.hidden = false; });
  $("#installBtn")?.addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $("#installBtn").hidden = true; });
})();
