/* App install prompt — one file shared by chainbrief · qurator · luft sites.
   Each site loads: <script src="https://probe2928-crypto.github.io/chainbrief/app-install.js" data-app="<chainbrief|qurator|luft>" defer></script>
   and puts <meta name="apple-itunes-app" content="app-id=<ID>"> in <head> (Safari on iOS shows Apple's own Smart App Banner from that tag).
   This script covers everyone Safari's banner does not reach: iOS in-app browsers (KakaoTalk, Instagram, Telegram, Facebook),
   Chrome/Firefox on iOS, and Android (once the Play listing is live).

   Switch: LIVE below. Everything stays off until the app is READY_FOR_SALE (ops/asc-status.json) — the app-store manager
   flips ios:true for that app (and android:true when its Play listing is public). Preview without flipping: add ?appbanner=1.
   Rules: never inside the apps themselves (Capacitor / TWA), never on checkout/pricing pages, dismiss = hidden for 14 days.
   Rendered in a shadow root so no site CSS leaks in or out. */
(function () {
  if (window.__appInstall) return; window.__appInstall = 1;

  var LIVE = {
    chainbrief: { ios: false, android: false },
    qurator: { ios: false, android: false },
    luft: { ios: false, android: false }
  };

  var APPS = {
    chainbrief: {
      ios: '6829091321', android: 'com.chainbrief.app', name: 'CHAINBRIEF', bg: '#0A0A0A', fg: '#F5F2EA', accent: '#C9A86A',
      copy: {
        en: ['Crypto news, briefed fast', 'Free app · no sign-up'],
        zh: ['加密快讯，一眼读懂', '免费 · 无需注册'],
        ko: ['코인 속보를 앱으로', '무료 · 가입 없음']
      },
      cta: { en: 'Get', zh: '获取', ko: '받기' }
    },
    qurator: {
      ios: '6829093287', android: 'kr.qurator.dailyart', name: 'QURATOR', bg: '#14120F', fg: '#F3EFE6', accent: '#D99A7E',
      copy: {
        ko: ['QR 도슨트를 앱으로', '카메라로 바로 스캔 · 무료'],
        en: ['The QR docent, as an app', 'Scan with your camera · free']
      },
      cta: { ko: '받기', en: 'Get' },
      skip: /#\/(checkout|pricing|pay)\b/,  // keep the web subscription flow clean
      skipIf: function () { try { return localStorage.getItem('q_member') === 'true'; } catch (e) { return false; } }  // web members keep using the web app (the iOS app has no member unlock)
    },
    luft: {
      ios: '6829093001', android: 'kr.luft.store', name: 'LUFT', bg: '#141210', fg: '#F4EFE8', accent: '#F1C7A6',
      copy: { ko: ['LUFT 앱으로 더 빠르게', '주문 조회 · 1:1 문의 · 무료'] },
      cta: { ko: '받기' },
      skip: /[?&]cart=|#(checkout|order|pay)/
    }
  };

  var me = document.currentScript || document.querySelector('script[src*="app-install.js"]');
  var ID = (me && me.getAttribute('data-app')) || '';
  var A = APPS[ID]; if (!A) return;

  var qs = location.search || '';
  var preview = /[?&]appbanner=1(&|$)/.test(qs);
  var ua = navigator.userAgent || '';
  var iOS = /iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1 && /Mobile/.test(ua));
  var android = /Android/.test(ua);

  // Never inside our own apps
  try {
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return;
    if (window.QURATOR_APP || window.LUFT_APP_INFO) return;
    if (/[?&]src=twa(&|$)/.test(qs) || document.referrer.indexOf('android-app://') === 0) return;
    if (sessionStorage.getItem('q_play') === '1') return;
    if (document.documentElement.classList.contains('q-play-app') || document.documentElement.classList.contains('q-store-app')) return;
  } catch (e) {}

  var live = LIVE[ID] || {};
  var platform = iOS ? 'ios' : android ? 'android' : '';
  if (!platform) return;                      // desktop: nothing
  if (!preview && !live[platform]) return;    // not launched on this store yet

  // iOS Safari already shows Apple's Smart App Banner from the meta tag — don't double up
  var inApp = /KAKAOTALK|Instagram|FBAN|FBAV|Line\/|Telegram|NAVER|DaumApps|Twitter/i.test(ua);
  var otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|Whale/i.test(ua);
  var safariOnly = platform === 'ios' && !inApp && !otherBrowser && !preview;

  var KEY = 'appInstall.' + ID + '.hide';
  try { var until = +localStorage.getItem(KEY) || 0; if (until > Date.now() && !preview) return; } catch (e) {}

  var path = location.pathname;
  var lang = /\/zh(\/|$)/.test(path) ? 'zh' : /\/en(\/|$)/.test(path) ? 'en' : ((document.documentElement.lang || 'ko').slice(0, 2));
  if (!A.copy[lang]) lang = A.copy.en ? 'en' : 'ko';
  var copy = A.copy[lang], cta = A.cta[lang] || A.cta.ko || 'Get';

  function storeUrl() {
    var src = inApp ? (ua.match(/KAKAOTALK|Instagram|FBAN|Telegram|NAVER|Line/i) || ['inapp'])[0].toLowerCase() : 'web';
    if (platform === 'ios') {
      // pt = App Store Connect provider token (App Analytics > Campaigns). Leave empty until Sejun copies it from ASC.
      var PT = '';
      var u = 'https://apps.apple.com/app/id' + A.ios;
      return PT ? u + '?pt=' + PT + '&ct=' + encodeURIComponent(ID + '-' + src) + '&mt=8' : u;
    }
    return 'https://play.google.com/store/apps/details?id=' + A.android +
      '&referrer=' + encodeURIComponent('utm_source=' + ID + '_site&utm_medium=banner&utm_campaign=' + src);
  }

  function track(action) {
    try { if (window.gtag) window.gtag('event', 'app_install_' + action, { app: ID, platform: platform, in_app_browser: inApp }); } catch (e) {}
  }

  function skipNow() { return (A.skip && A.skip.test(location.href)) || (A.skipIf && A.skipIf()); }

  // sit above the site's own fixed bottom UI (tab bars, chat / Telegram buttons) instead of covering it
  function clearance() {
    var vh = window.innerHeight, top = vh;
    try {
      var all = document.body.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i], cs = getComputedStyle(el);
        if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
        var r = el.getBoundingClientRect();
        if (r.height < 8 || r.height > vh * 0.4 || r.bottom < vh - 160) continue;
        if (r.top < top) top = r.top;
      }
    } catch (e) {}
    return Math.max(12, Math.round(vh - top + 10));
  }

  function mount() {
    if (document.getElementById('app-install-host')) return;
    var host = document.createElement('div'); host.id = 'app-install-host';
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    root.innerHTML =
      '<style>' +
      ':host{all:initial}' +
      '.bar{position:fixed;left:12px;right:12px;bottom:calc(' + clearance() + 'px + env(safe-area-inset-bottom,0px));z-index:2147483000;' +
      'display:flex;align-items:center;gap:12px;padding:12px 12px 12px 16px;border-radius:14px;background:' + A.bg + ';color:' + A.fg + ';' +
      'font:14px/1.3 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.28);' +
      'transform:translateY(140%);transition:transform .35s ease}' +
      '.bar.on{transform:none}' +
      '.mark{font-weight:800;letter-spacing:.04em;font-size:12px;color:' + A.accent + '}' +
      '.t{flex:1;min-width:0}.t b{display:block;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.t span{display:block;opacity:.72;font-size:12px;margin-top:2px}' +
      'a.go{flex:none;background:' + A.fg + ';color:' + A.bg + ';text-decoration:none;font-weight:700;font-size:13px;padding:9px 16px;border-radius:999px}' +
      'button.x{flex:none;background:none;border:0;color:inherit;opacity:.6;font-size:20px;line-height:1;padding:4px 2px 4px 6px;cursor:pointer}' +
      '</style>' +
      '<div class="bar" role="region" aria-label="' + A.name + ' app">' +
      '<div class="t"><div class="mark">' + A.name + '</div><b></b><span></span></div>' +
      '<a class="go" rel="noopener" target="_blank"></a>' +
      '<button class="x" type="button" aria-label="Close">×</button></div>';
    root.querySelector('b').textContent = copy[0];
    root.querySelector('span').textContent = copy[1];
    var go = root.querySelector('a.go'); go.textContent = cta; go.href = storeUrl();
    go.addEventListener('click', function () { track('click'); });
    root.querySelector('button.x').addEventListener('click', function () {
      track('dismiss');
      try { localStorage.setItem(KEY, String(Date.now() + 14 * 864e5)); } catch (e) {}
      bar.classList.remove('on'); setTimeout(function () { host.remove(); }, 400);
    });
    document.body.appendChild(host);
    var bar = root.querySelector('.bar');
    requestAnimationFrame(function () { setTimeout(function () { bar.classList.add('on'); track('view'); }, 600); });
  }

  // chainbrief site: turn the existing PWA "App 설치" button into a store link once the app is live
  function upgradeInstallButton() {
    var b = document.getElementById('installBtn'); if (!b) return;
    var c = b.cloneNode(true); c.hidden = false;
    c.addEventListener('click', function (e) { e.preventDefault(); track('click_header'); location.href = storeUrl(); });
    b.parentNode.replaceChild(c, b);
  }

  function start() {
    if (ID === 'chainbrief') upgradeInstallButton();
    if (safariOnly || skipNow()) return;
    // show after the visitor has engaged a little: 8 s on page or first scroll past 40% of a screen
    var shown = false;
    function show() { if (shown || skipNow()) return; shown = true; mount(); }
    setTimeout(show, 8000);
    window.addEventListener('scroll', function onS() { if (window.scrollY > window.innerHeight * 0.4) { window.removeEventListener('scroll', onS); show(); } }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
