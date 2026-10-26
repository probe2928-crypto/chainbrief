// 체인브리프 사이트 검색 — search.json(기사·속보)을 받아 브라우저에서 바로 찾는다
(() => {
  const root = document.querySelector("[data-search]");
  if (!root) return;
  const T = JSON.parse(root.dataset.i18n || "{}");
  const $ = (s) => root.querySelector(s);
  const input = $("#sq"), res = $("#sRes"), stat = $("#sStat"), tabs = $("#sTabs");
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s = "") => s.normalize("NFKC").toLowerCase();
  const fmt = new Intl.DateTimeFormat(T.locale || "ko-KR", { timeZone: T.tz || "Asia/Seoul", year: "numeric", month: "short", day: "numeric" });
  let idx = null, kind = "", q = "";

  const params = new URLSearchParams(location.search);
  input.value = params.get("q") || "";

  // 검색어 하이라이트: 이스케이프된 문자열 위에 <mark>를 씌운다
  function mark(text, terms) {
    let out = esc(text);
    for (const t of terms) {
      const re = new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      out = out.replace(re, (m) => `<mark>${m}</mark>`);
    }
    return out;
  }
  // 본문에서만 맞은 경우, 맞은 자리 주변을 잘라 보여준다
  function snippet(it, terms) {
    const hay = norm(it.s);
    if (!terms.length || terms.some((t) => hay.includes(t)) || !it.x) return it.s;
    const body = it.x, at = norm(body).indexOf(terms.find((t) => norm(body).includes(t)) || "");
    if (at < 0) return it.s;
    const start = Math.max(0, at - 50);
    return (start ? "…" : "") + body.slice(start, start + 150).trim() + "…";
  }

  function render() {
    if (!idx) return;
    const terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) {
      res.innerHTML = ""; tabs.hidden = true;
      stat.textContent = T.hint || "";
      return;
    }
    const hits = idx.map((it) => {
      const title = norm(it.t), meta = norm(`${it.c} ${it.w}`), sum = norm(it.s), body = norm(it.x);
      let score = 0;
      for (const t of terms) {
        if (title.includes(t)) score += 10;
        else if (meta.includes(t)) score += 6;
        else if (sum.includes(t)) score += 4;
        else if (body.includes(t)) score += 1;
        else return null;
      }
      if (it.k === "a") score += 1;
      return { it, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score || (a.it.d < b.it.d ? 1 : -1));
    const counts = { "": hits.length, a: hits.filter((h) => h.it.k === "a").length, f: hits.filter((h) => h.it.k === "f").length };
    tabs.hidden = !hits.length;
    tabs.querySelectorAll("[data-n]").forEach((n) => { n.textContent = counts[n.dataset.n] || "0"; });
    const shown = hits.filter((h) => !kind || h.it.k === kind).slice(0, 60);
    stat.textContent = hits.length ? (T.found || "").replace("{n}", hits.length).replace("{q}", q) : (T.none || "").replace("{q}", q);
    res.innerHTML = shown.map(({ it }) => `<li><a class="sr-it" href="${esc(it.u)}">
      <span class="sr-meta"><span class="tag${it.k === "f" ? " fl" : ""}">${esc(it.k === "a" ? T.art : T.fl)}</span>${it.c ? `<span class="sr-c">${mark(it.c, terms)}</span>` : ""}<time class="num">${fmt.format(new Date(it.d))}</time>${it.w ? `<span class="sr-w">${mark(it.w, terms)}</span>` : ""}</span>
      <span class="sr-t">${mark(it.t, terms)}</span>
      ${it.s ? `<span class="sr-s">${mark(snippet(it, terms), terms)}</span>` : ""}</a></li>`).join("");
  }

  let timer;
  function update(push) {
    q = input.value.trim();
    const url = new URL(location.href);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
    history[push ? "pushState" : "replaceState"](null, "", url);
    render();
  }
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => update(false), 120); });
  root.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); clearTimeout(timer); update(false); input.blur(); });
  root.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => { input.value = b.dataset.q; update(false); input.focus(); }));
  tabs.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => {
    kind = b.dataset.k;
    tabs.querySelectorAll("[data-k]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  }));
  addEventListener("popstate", () => { input.value = new URLSearchParams(location.search).get("q") || ""; q = input.value.trim(); render(); });

  q = input.value.trim();
  stat.textContent = T.loading || "";
  fetch(root.dataset.index).then((r) => r.json()).then((d) => { idx = d; render(); }).catch(() => { stat.textContent = T.fail || ""; });
  if (!q && matchMedia("(min-width:960px)").matches) input.focus();
})();
