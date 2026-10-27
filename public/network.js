/* Network band — one file shared by every site.
   Each site loads: <script src="https://probe2928-crypto.github.io/chainbrief/network.js" data-site="<id>" defer></script>
   It inserts a band just above the site's footer. Rules:
   - Web3 sites (chainbrief, blockkey, perpline) show the digital row large, the life row small.
   - Life sites (lifejunjun, yeobaek, qurator, luft) show the life row large, a short digital line
     with CHAINBRIEF and BLOCKKEY only (Perpline is not for Korean residents, so it never shows there).
   - Oriel (giving) is the bridge: shows on every site; on Oriel itself both rows show, without Perpline.
   - Cards carry ?ref=network&from=<site> so cross-traffic can be counted later.
   Edit SITES / CTX below to change copy. Rendered in a shadow root so no site CSS leaks in or out. */
(function () {
  if (window.__cbNetwork) return; window.__cbNetwork = 1;
  var me = document.currentScript || document.querySelector('script[src*="network.js"]');
  var SELF = (me && me.getAttribute('data-site')) || '';
  try { if (document.documentElement.classList.contains('adclean')) return; } catch (e) {}

  var B = 'https://probe2928-crypto.github.io/';
  var path = location.pathname;
  var lang = /\/zh(\/|$)/.test(path) ? 'zh' : /\/en(\/|$)/.test(path) ? 'en' : ((document.documentElement.lang || 'ko').slice(0, 2));
  if (lang !== 'ko' && lang !== 'zh') lang = 'en';
  if (SELF === 'oriel' && lang === 'ko' && !/[가-힣]/.test(document.title)) lang = 'en';

  /* Brand book: colour field, wordmark style, copy. */
  var SITES = {
    chainbrief: { g: 'web3', bg: '#121212', fg: '#F3EEE6', mark: 'CHAINBRIEF', font: 'serif', url: 'chainbrief/', urlEn: 'chainbrief/en/', urlZh: 'chainbrief/zh/',
      cat: { ko: '코인 뉴스', en: 'Crypto news', zh: '加密快讯' },
      line: { ko: '가장 빠른 코인 속보와 상장 소식', en: 'Fast crypto news and Korean listings', zh: '最快的加密快讯与韩国上币' } },
    blockkey: { g: 'web3', bg: '#1F2A44', fg: '#F2F0EA', mark: 'BLOCKKEY', font: 'sans', url: 'blockkey/', urlEn: 'blockkey/en/',
      cat: { ko: 'AI · 블록체인 개발', en: 'AI · Blockchain build', zh: 'AI · 区块链开发' },
      line: { ko: 'AI 마케팅, AI 개발, 블록체인 연동', en: 'AI marketing, AI development, chain integration', zh: 'AI 营销、AI 开发、区块链对接' } },
    perpline: { g: 'web3', bg: '#E8E2D6', fg: '#111111', mark: 'Perpline', font: 'sans', url: 'perpline/', noKR: true,
      cat: { ko: '선물 수수료 페이백', en: 'Futures fee rebate', zh: '合约返佣' },
      line: { ko: '거래소 수수료 최대 50% 페이백 · 한국 거주자 제외', en: 'Up to 50% back on futures fees', zh: '合约手续费最高返还 50%' } },
    lifejunjun: { g: 'life', bg: '#2E3B2F', fg: '#EFE8DA', mark: '인생준준', font: 'serifko', url: 'lifejunjun/',
      cat: { ko: '역사 동행 여행', en: 'History travel', zh: '历史同行旅行' },
      line: { ko: '역사를 함께 배우며 떠나는 3~10명 여행', en: 'Small-group trips through history', zh: '与 3–10 人一同走进历史' } },
    yeobaek: { g: 'life', bg: '#F1E7DA', fg: '#1A1714', mark: '여백의 지도', font: 'serifko', url: 'yeobaek/',
      cat: { ko: '감성 여행', en: 'Margin Atlas', zh: '旅行' },
      line: { ko: '사진으로 먼저 떠나는 작은 여행', en: 'Small trips, seen first in photographs', zh: '先用照片出发的小旅行' } },
    qurator: { g: 'life', bg: '#EDE6F0', fg: '#18151C', mark: 'QURATOR', font: 'serif', url: 'qurator/',
      cat: { ko: '오늘의 작품', en: 'Daily art', zh: '每日艺术' },
      line: { ko: '매일 세 점, 미술사 전공자의 작품 해설', en: 'Three artworks a day, explained', zh: '每天三件作品与解说' } },
    luft: { g: 'life', bg: '#F1C7A6', fg: '#141210', mark: 'LUFT', font: 'cond', url: 'luft/',
      cat: { ko: '여행 생활용품', en: 'Travel goods', zh: '旅行用品' },
      line: { ko: '가볍게 떠나는 물건 10가지', en: 'Ten things for lighter travel', zh: '让旅行更轻的十件物品' } },
    oriel: { g: 'give', bg: '#E9CFBB', fg: '#161514', mark: 'oriel', font: 'grot', url: 'oriel/',
      cat: { ko: '재단', en: 'Foundation', zh: '基金会' },
      line: { ko: '동남아 아이들의 배움과 생활을 돕는 재단', en: 'Learning and daily support for children in Southeast Asia', zh: '支持东南亚儿童的学习与生活' } }
  };

  /* Context: when site A shows site B, a line written for that pair beats the generic one. */
  var CTX = {
    lifejunjun: { yeobaek: '사진으로 고르는 가벼운 여행은 여백의 지도에서', luft: '떠나기 전 짐 싸기, 목베개부터 압축 파우치까지', qurator: '여행지 미술관, 가기 전에 작품부터 만나보세요' },
    yeobaek: { lifejunjun: '한 도시를 더 깊이, 역사와 함께 걷는 인생준준', luft: '캐리어를 가볍게, 공항부터 숙소까지', qurator: '사진 다음은 그림, 매일 세 점의 작품' },
    luft: { lifejunjun: '챙긴 짐으로 떠날 곳, 역사 동행 여행', yeobaek: '어디로 갈지 모르겠다면, 사진으로 먼저', qurator: '하루 한 번, 손 안의 미술관' },
    qurator: { oriel: 'QURATOR 수익 일부는 오리엘 재단에 기부돼요', lifejunjun: '그림 속 그곳으로, 함께 떠나는 역사 여행', yeobaek: '작품 같은 풍경을 찾아 떠나는 여행' },
    chainbrief: { perpline: { en: 'Read the move, then trade it with fees back', ko: '해외 거주자라면 거래 수수료 최대 50% 페이백' }, blockkey: 'AI·블록체인 프로젝트 개발과 마케팅' },
    blockkey: { chainbrief: '매일 업데이트되는 코인 속보와 상장 레이더', perpline: { en: 'Fee rebates for active futures traders', ko: '해외 거주자 대상 선물 수수료 페이백' } },
    perpline: { chainbrief: { en: 'Korean listings, the minute they drop' }, blockkey: { en: 'Build your token, app or AI campaign' } }
  };
  var GIVE = { ko: '아이들의 교실을 함께 짓습니다', en: 'Classrooms, built together', zh: '一起为孩子们建教室' };
  if (SELF === 'qurator') GIVE.ko = CTX.qurator.oriel;

  var T = {
    ko: { kick: 'Network', title: '함께 운영하는 곳', life: 'Life · 여행 · 문화 · 생활', web3: 'Digital · 블록체인 · AI', give: 'Giving', more: '디지털', visit: '바로가기' },
    en: { kick: 'Network', title: 'Our other houses', life: 'Life · Travel · Art · Goods', web3: 'Digital · Blockchain · AI', give: 'Giving', more: 'Digital', visit: 'Visit' },
    zh: { kick: 'Network', title: '我们的其他品牌', life: 'Life · 旅行 · 艺术 · 生活', web3: 'Digital · 区块链 · AI', give: 'Giving', more: 'Digital', visit: '前往' }
  }[lang];

  var me0 = SITES[SELF] || { g: 'web3' };
  var mode = me0.g; // web3 | life | give
  function pick(o) { return typeof o === 'string' ? o : (o[lang] || o.en || o.ko); }
  function href(id) {
    var s = SITES[id], u = s.url;
    if (lang === 'en' && s.urlEn) u = s.urlEn;
    if (lang === 'zh') u = s.urlZh || s.urlEn || s.url;
    return B + u + '?ref=network&from=' + encodeURIComponent(SELF || 'unknown');
  }
  function line(id) {
    var c = CTX[SELF] && CTX[SELF][id];
    if (c) { var v = typeof c === 'string' ? (lang === 'ko' ? c : null) : (c[lang] || null); if (v) return v; }
    return pick(SITES[id].line);
  }
  function ids(group) { return Object.keys(SITES).filter(function (k) { return SITES[k].g === group && k !== SELF; }); }

  // Which rows, in which size
  var bigIds, smallIds, smallLabel;
  var lifeIds = ids('life');
  var web3Ids = ids('web3');
  if (mode === 'life') {
    bigIds = lifeIds;
    smallIds = web3Ids.filter(function (k) { return !SITES[k].noKR; });
    smallLabel = T.web3;
  } else if (mode === 'give') {
    bigIds = lifeIds;
    smallIds = web3Ids.filter(function (k) { return !SITES[k].noKR; });
    smallLabel = T.web3;
  } else {
    bigIds = web3Ids;
    smallIds = lifeIds;
    smallLabel = T.life;
  }
  var bigLabel = mode === 'web3' ? T.web3 : T.life;
  // Context-first ordering: pairs with written lines come first
  // (Korean pages keep Perpline last, since it is for non-Korean residents)
  function rank(k) { return (lang === 'ko' && SITES[k].noKR ? 10 : 0) - (CTX[SELF] && CTX[SELF][k] ? 1 : 0); }
  bigIds.sort(function (a, b) { return rank(a) - rank(b); });

  var FONTS = {
    serif: '"Bodoni Moda","Bodoni 72","Didot","Bodoni MT",Georgia,"Times New Roman",serif',
    sans: '"Helvetica Neue",Helvetica,Arial,"Apple SD Gothic Neo","Malgun Gothic",sans-serif',
    cond: '"Archivo Narrow","Arial Narrow","Helvetica Neue Condensed",Impact,sans-serif',
    grot: '"Familjen Grotesk","Helvetica Neue",Arial,sans-serif',
    serifko: '"Nanum Myeongjo","Noto Serif KR","AppleMyungjo","Batang",serif'
  };
  var MARKCSS = {
    serif: 'font-weight:500;letter-spacing:.06em',
    sans: 'font-weight:800;letter-spacing:-.01em',
    cond: 'font-weight:900;font-stretch:condensed;letter-spacing:-.01em;transform:scaleX(.86);transform-origin:left',
    grot: 'font-weight:800;letter-spacing:-.04em;text-transform:lowercase',
    serifko: 'font-weight:800;letter-spacing:-.02em'
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function card(id, size, i) {
    var s = SITES[id];
    return '<a class="c ' + size + '" href="' + href(id) + '" style="--bg:' + s.bg + ';--fg:' + s.fg + ';--d:' + (i * 70) + 'ms" aria-label="' + esc(s.mark + ' — ' + line(id)) + '">' +
      '<span class="lab tl">' + esc(pick(s.cat)) + '</span>' +
      '<span class="lab tr">' + (s.noKR && lang === 'ko' ? 'Global' : String(i + 1).padStart(2, '0')) + '</span>' +
      '<span class="mark" style="font-family:' + FONTS[s.font] + ';' + MARKCSS[s.font] + '">' + esc(s.mark) + '</span>' +
      '<span class="ln">' + esc(line(id)) + '</span>' +
      '<span class="go">' + esc(T.visit) + ' <i>→</i></span></a>';
  }
  function chip(id) {
    var s = SITES[id];
    return '<a class="chip" href="' + href(id) + '" style="--bg:' + s.bg + ';--fg:' + s.fg + '"><b style="font-family:' + FONTS[s.font] + ';' + MARKCSS[s.font].replace(/transform[^;]*;?/g, '') + '">' + esc(s.mark) + '</b><span>' + esc(pick(s.cat)) + '</span><i>→</i></a>';
  }

  var giveCard = SELF === 'oriel' ? '' :
    '<a class="give" href="' + href('oriel') + '"><span class="lab">' + esc(T.give) + ' · ' + esc(pick(SITES.oriel.cat)) + '</span>' +
    '<span class="gm" style="font-family:' + FONTS.grot + '">oriel</span><span class="gl">' + esc(GIVE[lang] || GIVE.en) + '</span>' +
    '<span class="gs">' + esc(pick(SITES.oriel.line)) + ' <i>→</i></span></a>';

  var css = [
    ':host{all:initial;display:block}',
    '*{box-sizing:border-box;margin:0}',
    '.band{--ink:#141210;--paper:#F6F1EA;--line:rgba(20,18,16,.14);background:var(--paper);color:var(--ink);font:15px/1.55 "Helvetica Neue",Helvetica,Arial,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;-webkit-font-smoothing:antialiased;word-break:keep-all;border-top:1px solid var(--line);padding:56px 0 48px;overflow:hidden}',
    '.w{max-width:1200px;margin:0 auto;padding:0 max(16px,env(safe-area-inset-left,0px))}',
    '.mono{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase}',
    '.head{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap;margin-bottom:22px}',
    '.head h2{font:900 clamp(34px,5vw,60px)/.92 "Helvetica Neue",Helvetica,Arial,"Apple SD Gothic Neo",sans-serif;letter-spacing:-.02em}',
    '.head .k{color:#6A625A;margin-bottom:8px;display:block}',
    '.row{display:grid;gap:12px}',
    '.big{grid-template-columns:repeat(var(--n,3),minmax(0,1fr)) minmax(0,1.15fr)}',
    '.big.nog{grid-template-columns:repeat(var(--n,3),minmax(0,1fr))}',
    '.c{position:relative;display:flex;flex-direction:column;justify-content:flex-end;min-height:260px;padding:18px;border-radius:4px;background:var(--bg);color:var(--fg);text-decoration:none;overflow:hidden;isolation:isolate;transition:transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .45s}',
    '.c::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.06));z-index:-1}',
    '.c:hover{transform:translateY(-4px);box-shadow:0 22px 40px -22px rgba(20,18,16,.45)}',
    '.lab{position:absolute;font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;opacity:.72}',
    '.tl{left:18px;top:16px}.tr{right:18px;top:16px}',
    '.c{container-type:inline-size}',
    '.mark{display:block;font-size:clamp(26px,2.6vw,40px);font-size:clamp(26px,15cqi,46px);line-height:.95;margin-bottom:12px;white-space:nowrap;transition:transform .5s cubic-bezier(.2,.8,.2,1)}',
    '.c:hover .mark{transform:translateX(4px)}',
    '.ln{display:block;font-size:14px;line-height:1.45;opacity:.86;max-width:30ch;min-height:2.9em}',
    '.go{display:inline-flex;gap:6px;align-items:center;margin-top:14px;font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;border-top:1px solid currentColor;padding-top:10px;opacity:.9}',
    '.go i,.gs i,.chip i{font-style:normal;transition:transform .25s}',
    '.c:hover .go i,.give:hover .gs i,.chip:hover i{transform:translateX(5px)}',
    '.give{position:relative;display:flex;flex-direction:column;justify-content:space-between;min-height:260px;padding:18px;border-radius:4px;background:#E9CFBB;color:#161514;text-decoration:none;overflow:hidden;transition:transform .45s cubic-bezier(.2,.8,.2,1)}',
    '.give::before{content:"";position:absolute;right:-30%;top:-40%;width:90%;aspect-ratio:1;border-radius:50%;background:radial-gradient(closest-side,rgba(255,236,214,.95),rgba(255,236,214,0));pointer-events:none}',
    '.give:hover{transform:translateY(-4px)}',
    '.give .lab{position:static;opacity:.7}',
    '.gm{position:relative;font-weight:800;letter-spacing:-.05em;font-size:clamp(64px,7vw,104px);line-height:.8}',
    '.gl{position:relative;font-size:17px;font-weight:700;line-height:1.3;max-width:20ch}',
    '.gs{position:relative;font-size:13px;opacity:.78;display:flex;justify-content:space-between;gap:10px;border-top:1px solid rgba(22,21,20,.3);padding-top:10px}',
    '.sub{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}',
    '.sub .mono{color:#6A625A;min-width:max-content}',
    '.chips{display:flex;gap:8px;flex-wrap:wrap}',
    '.chip{display:inline-flex;align-items:center;gap:10px;padding:8px 14px 8px 8px;border-radius:999px;background:#fff;border:1px solid var(--line);color:var(--ink);text-decoration:none;transition:border-color .2s,transform .2s}',
    '.chip b{display:inline-grid;place-items:center;min-height:30px;padding:0 12px;border-radius:999px;background:var(--bg);color:var(--fg);font-size:14px;white-space:nowrap}',
    '.chip span{font-size:13px;color:#4A433D}',
    '.chip:hover{border-color:var(--ink);transform:translateY(-1px)}',
    '.fx{opacity:0;transform:translateY(18px)}',
    '.in .fx{opacity:1;transform:none;transition:opacity .7s var(--d,0ms),transform .8s cubic-bezier(.2,.8,.2,1) var(--d,0ms)}',
    ':focus-visible{outline:2px solid #B4441F;outline-offset:3px}',
    '@media (max-width:980px){.big,.big.nog{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax(240px,72%);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px;scrollbar-width:none}.big::-webkit-scrollbar{display:none}.big>*{scroll-snap-align:start}.c,.give{min-height:240px}}',
    '@media (prefers-reduced-motion:reduce){*{transition:none!important}.fx{opacity:1;transform:none}}'
  ].join('');

  var html = '<section class="band" aria-label="' + esc(T.title) + '"><div class="w">' +
    '<div class="head"><div><span class="k mono">' + esc(T.kick) + ' · ' + esc(bigLabel) + '</span><h2>' + esc(T.title) + '</h2></div>' +
    '<span class="mono" style="color:#6A625A">' + (bigIds.length + smallIds.length + (giveCard ? 1 : 0)) + ' houses</span></div>' +
    '<div class="row big' + (giveCard ? '' : ' nog') + '" style="--n:' + bigIds.length + '">' +
      bigIds.map(function (id, i) { return '<div class="fx" style="--d:' + i * 70 + 'ms;display:grid">' + card(id, 'b', i) + '</div>'; }).join('') +
      (giveCard ? '<div class="fx" style="--d:' + bigIds.length * 70 + 'ms;display:grid">' + giveCard + '</div>' : '') +
    '</div>' +
    (smallIds.length ? '<div class="sub fx" style="--d:' + (bigIds.length + 1) * 70 + 'ms"><span class="mono">' + esc(smallLabel) + '</span><div class="chips">' + smallIds.map(chip).join('') + '</div></div>' : '') +
    '</div></section>';

  function fonts() {
    if (document.getElementById('cb-network-fonts')) return;
    var l = document.createElement('link'); l.id = 'cb-network-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@700&family=Bodoni+Moda:wght@500&family=Familjen+Grotesk:wght@800&family=Nanum+Myeongjo:wght@800&display=swap&text=' +
      encodeURIComponent(Object.keys(SITES).map(function (k) { return SITES[k].mark; }).join('') + 'oriel');
    document.head.appendChild(l);
  }
  function mount() {
    fonts();
    var host = document.createElement('div');
    host.id = 'cb-network';
    host.setAttribute('data-nosnippet', '');
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    root.innerHTML = '<style>' + css + '</style>' + html;
    var foots = document.querySelectorAll('body > footer, body > * > footer, footer');
    var f = foots.length ? foots[foots.length - 1] : null;
    if (f && f.parentNode) f.parentNode.insertBefore(host, f); else document.body.appendChild(host);
    var band = root.querySelector('.band');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { band.classList.add('in'); io.disconnect(); } }); }, { rootMargin: '0px 0px -10% 0px' });
      io.observe(host);
    } else band.classList.add('in');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
