// 체인브리프 클라이언트: 시세·김프·심리, 속보 필터, 상장 소식, 급등 레이더, 커뮤니티 게시판, PWA
(() => {
  const CB = window.CB || { base: "/", coins: [], sb: {} };
  const T = Object.assign({
    locale: "ko-KR", tz: "Asia/Seoul", now: "방금", min: "분 전", hr: "시간 전", day: "일 전", yday: "어제 ",
    newN: "새 속보 {n}건 보기", basis: "{src} BTC 기준", upbit: "업비트", bithumb: "빗썸", asOf: "{t} 기준",
    priceErr: "시세를 불러오지 못했어요. 잠시 뒤 다시 시도해요.", won: "원", wonPre: "", copied: "복사됨", expand: "펼쳐 읽기", collapse: "접기",
    fng: { "Extreme Fear": "극단적 공포", Fear: "공포", Neutral: "중립", Greed: "탐욕", "Extreme Greed": "극단적 탐욕" },
  }, CB.t || {});
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
  const kst = (o = { hour: "2-digit", minute: "2-digit" }) => new Intl.DateTimeFormat(T.locale, { timeZone: T.tz, hour12: false, ...o }).format(new Date());
  const clock = $("#clock");
  if (clock) setInterval(() => (clock.textContent = kst()), 15000);

  /* 스크롤하면 메뉴줄만 남고 작은 워드마크가 나타남 */
  const brand = $(".site-header .brand");
  if (brand && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => document.body.classList.toggle("stuck", !e.isIntersecting), { threshold: 0, rootMargin: "-4px 0px 0px 0px" }).observe(brand);
  }

  /* 기사 읽기 진행선: 고정 메뉴줄 아래 머리카락 한 줄 */
  const prose = $(".doc .prose"), head = $(".site-header");
  if (prose && head) {
    const bar = document.createElement("i");
    bar.className = "readbar";
    bar.setAttribute("aria-hidden", "true");
    head.appendChild(bar);
    let ticking = false;
    const paint = () => {
      ticking = false;
      const r = prose.getBoundingClientRect();
      const span = r.height - innerHeight * 0.6;
      const p = span > 0 ? Math.min(1, Math.max(0, (innerHeight * 0.4 - r.top) / span)) : 0;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      bar.classList.toggle("on", p > 0 && p < 1);
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    addEventListener("resize", paint);
    paint();
  }

  /* 포맷 */
  const usd = (p) => p == null ? "—" : p >= 1000 ? p.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p >= 1 ? p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : p.toPrecision(4);
  const krw = (p) => p == null || isNaN(p) ? "—" : p >= 100 ? Math.round(p).toLocaleString("ko-KR") : (+p).toLocaleString("ko-KR", { maximumFractionDigits: p >= 1 ? 2 : 4 });
  const pct = (c) => c == null || isNaN(c) ? "" : (c > 0 ? "+" : "") + (+c).toFixed(2) + "%";
  const dir = (c) => (c >= 0 ? "up" : "down");
  const eok = (n) => n == null ? "—" : T.locale !== "ko-KR" ? T.wonPre + new Intl.NumberFormat(T.locale, { notation: "compact", maximumFractionDigits: 1 }).format(n) : n >= 1e12 ? (n / 1e12).toFixed(1) + "조" : n >= 1e8 ? Math.round(n / 1e8).toLocaleString("ko-KR") + "억" : Math.round(n / 1e4).toLocaleString("ko-KR") + "만";

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
      let src = T.upbit;
      try { for (const t of await getJSON(`https://api.upbit.com/v1/ticker?markets=${markets}`)) up[t.market.slice(4)] = t.trade_price; } catch {}
      if (!Object.keys(up).length) {
        // 업비트가 응답하지 않으면 빗썸 원화 가격으로 김프 계산
        try { for (const t of await getJSON(`https://api.bithumb.com/v1/ticker?markets=${CB.coins.filter((c) => c.symbol !== "BNB").map((c) => "KRW-" + c.symbol).join(",")}`)) up[t.market.slice(4)] = t.trade_price; src = T.bithumb; } catch {}
      }
      $$("[data-kimp-src]").forEach((el) => (el.textContent = T.basis.replace("{src}", src)));
      const data = {};
      for (const c of CB.coins) {
        const d = g[c.id]; if (!d) continue;
        const fx = d.krw && d.usd ? d.krw / d.usd : null, upbit = up[c.symbol] ?? null;
        data[c.id] = { ...d, upbit, kimp: upbit && fx ? (upbit / (d.usd * fx) - 1) * 100 : null };
      }
      paint(data); last = data; store.set("cb-prices", data);
      if (upd) upd.textContent = T.asOf.replace("{t}", kst());
    } catch { if (upd) upd.textContent = T.priceErr; }
  }
  if (Object.keys(last).length) paint(last);
  if (CB.coins.length) every(loadPrices, 60000);

  /* 공포·탐욕, 도미넌스 */
  const FNG = T.fng;
  async function loadSentiment() {
    if (!$("#fngVal") && !$("[data-fng]")) return;
    try {
      const [now, prev] = (await getJSON("https://api.alternative.me/fng/?limit=2")).data;
      const v = +now.value;
      $$("[data-fng]").forEach((el) => (el.textContent = v));
      $$("[data-fng-lbl]").forEach((el) => (el.textContent = (FNG[now.value_classification] || now.value_classification) + (prev ? ` · ${T.yday}${prev.value}` : "")));
      if (!$("#fngVal")) return;
      $("#fngVal").textContent = v;
      const lbl = $("#fngLbl"); lbl.textContent = FNG[now.value_classification] || now.value_classification;
      lbl.className = "lbl " + (v < 45 ? "down" : v > 55 ? "up" : "");
      $("#fngBar").style.left = v + "%";
      if (prev) $("#fngPrev").textContent = T.yday + prev.value;
    } catch {}
    try { const g = await cached("cb-global", 300000, () => getJSON("https://api.coingecko.com/api/v3/global")); $("#btcDom").textContent = g.data.market_cap_percentage.btc.toFixed(1) + "%"; } catch {}
  }
  every(loadSentiment, 300000);

  /* 상대 시간 */
  function rel() {
    const now = Date.now();
    $$("[data-rel]").forEach((el) => {
      const m = Math.round((now - new Date(el.dataset.rel)) / 60000);
      el.textContent = m < 1 ? T.now : m < 60 ? m + T.min : m < 1440 ? Math.floor(m / 60) + T.hr : Math.floor(m / 1440) + T.day;
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
      $$(".tg-inline", feed).forEach((x) => (x.hidden = cat !== "전체" || !!q));
      $$(".day", feed).forEach((d) => { let n = d.nextElementSibling, any = false; while (n && !n.classList.contains("day")) { if (!n.hidden) any = true; n = n.nextElementSibling; } d.hidden = !any; });
      const nm = $("#noMatch"); if (nm) nm.hidden = shown > 0 || !$(".item", feed);
    };
    // 모바일: 속보 본문은 3줄로 접고 '펼쳐 읽기' — 넘치는 항목에만 버튼을 붙인다
    const narrow = matchMedia("(max-width:640px)");
    const clamp = () => {
      if (!narrow.matches) return;
      $$(".item:not([hidden]) .body", feed).forEach((b) => {
        if (b.dataset.cl) return;
        if (b.scrollHeight <= b.clientHeight + 2) return;
        b.dataset.cl = "1";
        const it = b.closest(".item"), btn = document.createElement("button");
        btn.type = "button"; btn.className = "more-b"; btn.setAttribute("aria-expanded", "false"); btn.textContent = T.expand;
        btn.addEventListener("click", () => { const o = it.classList.toggle("open"); btn.setAttribute("aria-expanded", o); btn.textContent = o ? T.collapse : T.expand; });
        const m = $(".meta", it); m ? m.append(btn) : b.after(btn);
      });
    };
    (document.fonts?.ready || Promise.resolve()).then(clamp);
    narrow.addEventListener?.("change", clamp);
    tabs("#filters", "c", (v) => { cat = v; apply(); clamp(); });
    $("#q")?.addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); apply(); clamp(); });
    setInterval(async () => {
      if (!visible()) return;
      try {
        const list = await getJSON(CB.base + "flash.json?t=" + Date.now());
        const idx = list.findIndex((f) => f.id === CB.latest), n = idx === -1 ? list.length : idx;
        if (n > 0) { $("#newBtn").textContent = T.newN.replace("{n}", n); $("#newWrap").hidden = false; }
      } catch {}
    }, 60000);
    $("#newBtn")?.addEventListener("click", () => location.reload());
  }

  /* 해외 거래소 상장 원장: 거래소 × 유형 필터 */
  $$("[data-gl-filters]").forEach((bar) => {
    const sec = bar.closest(".gl"); let ex = "all", ty = "all";
    const apply = () => {
      let n = 0;
      $$(".gl-row", sec).forEach((r) => { const ok = (ex === "all" || r.dataset.ex === ex) && (ty === "all" || r.dataset.type === ty); r.hidden = !ok; if (ok) n++; });
      const none = $("[data-gl-none]", sec); if (none) none.hidden = n > 0;
    };
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const key = b.dataset.glEx ? "glEx" : "glTy";
      $$(`button[data-${key === "glEx" ? "gl-ex" : "gl-ty"}]`, bar).forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      if (key === "glEx") ex = b.dataset.glEx; else ty = b.dataset.glTy;
      apply();
    });
  });

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
          rows.forEach((r) => { const x = px[r.dataset.sym], box = $("[data-px]", r); if (box && x) box.innerHTML = `${T.wonPre}${krw(x.trade_price)}${T.won}<small class="${dir(x.signed_change_rate)}">${pct(x.signed_change_rate * 100)}</small>`; });
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

  /* ---------- 히어로 슬라이더 ---------- */
  $$("[data-hero]").forEach((h) => {
    const slides = $$(".slide", h), bars = $$(".hero-bar", h), count = $(".hero-count b", h);
    if (slides.length < 2) return;
    const DUR = 7000, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0, timer = 0, busy = false, paused = false, left = DUR, started = Date.now();
    h.style.setProperty("--dur", DUR + "ms");
    // 지연 로딩된 슬라이드 그림 채우기 (source 먼저, img 나중)
    const fill = (s) => { if (!s) return; $$("[data-srcset]", s).forEach((e) => { e.srcset = e.dataset.srcset; e.removeAttribute("data-srcset"); }); $$("img[data-src]", s).forEach((e) => { e.src = e.dataset.src; e.removeAttribute("data-src"); }); };
    const warm = () => { fill(slides[1]); fill(slides[slides.length - 1]); };
    if (document.readyState === "complete") setTimeout(warm, 300); else window.addEventListener("load", () => setTimeout(warm, 300), { once: true });
    const mark = () => {
      bars.forEach((b, k) => { b.classList.toggle("done", k < i); b.classList.remove("on"); });
      void h.offsetWidth;
      if (!reduce) bars[i]?.classList.add("on"); else bars[i]?.classList.add("done");
      if (count) count.textContent = String(i + 1).padStart(2, "0");
    };
    const schedule = (ms) => { clearTimeout(timer); left = ms; started = Date.now(); if (!paused && !reduce) timer = setTimeout(() => go(i + 1, 1), ms); };
    function go(n, dir = 1) {
      n = (n + slides.length) % slides.length;
      if (busy || n === i) return;
      busy = true;
      fill(slides[n]); fill(slides[(n + 1) % slides.length]); fill(slides[(n - 1 + slides.length) % slides.length]);
      const cur = slides[i], nxt = slides[n], back = dir < 0;
      cur.classList.remove("is-active"); cur.classList.add("is-leaving"); cur.classList.toggle("back", back);
      nxt.classList.add("is-entering"); nxt.classList.toggle("back", back); nxt.removeAttribute("aria-hidden");
      i = n; mark();
      setTimeout(() => {
        cur.classList.remove("is-leaving", "back"); cur.setAttribute("aria-hidden", "true");
        nxt.classList.remove("is-entering", "back"); nxt.classList.add("is-active");
        busy = false;
      }, reduce ? 30 : 1150);
      schedule(DUR);
    }
    const pause = () => { if (paused) return; paused = true; h.classList.add("paused"); clearTimeout(timer); left -= Date.now() - started; };
    const resume = () => { if (!paused) return; paused = false; h.classList.remove("paused"); schedule(Math.max(900, left)); };
    h.addEventListener("mouseenter", pause); h.addEventListener("mouseleave", resume);
    h.addEventListener("focusin", pause); h.addEventListener("focusout", resume);
    document.addEventListener("visibilitychange", () => (document.hidden ? pause() : resume()));
    $$(".hero-nav", h).forEach((b) => b.addEventListener("click", () => go(i + +b.dataset.dir, +b.dataset.dir)));
    bars.forEach((b, k) => b.addEventListener("click", () => go(k, k > i ? 1 : -1)));
    h.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") go(i + 1, 1); if (e.key === "ArrowLeft") go(i - 1, -1); });
    let x0 = null, y0 = 0;
    h.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    h.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    mark(); schedule(DUR);
  });

  /* 복사 버튼 */
  $$("[data-copy],[data-copytext]").forEach((b) => b.addEventListener("click", async () => {
    const text = b.dataset.copytext || location.href, label = b.textContent;
    try { await navigator.clipboard.writeText(text); b.textContent = T.copied; } catch { b.textContent = text; }
    setTimeout(() => (b.textContent = label), 2000);
  }));

  /* PWA */
  if ("serviceWorker" in navigator && !window.Capacitor) navigator.serviceWorker.register(CB.base + "sw.js").catch(() => {});
  let deferred;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; const b = $("#installBtn"); if (b) b.hidden = false; });
  $("#installBtn")?.addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $("#installBtn").hidden = true; });

  // "/" 키: 어디서든 검색으로 (입력 중일 땐 무시)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    e.preventDefault();
    const box = document.getElementById("sq");
    if (box) box.focus(); else if (CB.searchUrl) location.href = CB.searchUrl;
  });
  // 가로 스크롤 줄(메뉴·시세 테이프): 양끝 페이드는 스크롤 위치에 맞춰, 현재 메뉴는 화면 안으로
  document.querySelectorAll("nav.top, .tape").forEach((el) => {
    const cur = el.querySelector('[aria-current="page"]');
    if (cur && cur.offsetLeft + cur.offsetWidth > el.clientWidth - 24) el.scrollLeft = cur.offsetLeft - 24;
    const edge = () => {
      const max = el.scrollWidth - el.clientWidth;
      el.classList.toggle("is-fit", max <= 2);
      el.classList.toggle("is-end", max > 2 && el.scrollLeft >= max - 2);
      el.classList.toggle("is-mid", el.scrollLeft > 2 && el.scrollLeft < max - 2);
    };
    el.addEventListener("scroll", edge, { passive: true });
    window.addEventListener("resize", edge, { passive: true });
    edge();
  });
})();
