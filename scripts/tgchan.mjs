// 텔레그램 채널 3곳(KO·EN·中文) — 사이트 곳곳에 붙는 구독 안내 (build.mjs·build-intl.mjs 공용)
// 채널 주소는 site.config.json "tgChannels". 게시는 scripts/post-telegram.mjs가 맡는다.
const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 3.6 2.9 10.8c-1.3.5-1.3 1.2-.2 1.6l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.6.2 1.8-.8l3.2-15.2c.3-1.3-.5-1.9-1.4-1.6zM8.6 13.6l9.6-6c.5-.3.9-.1.5.2l-8.2 7.4-.3 3.4z"/></svg>';

const C = {
  ko: {
    eye: "Telegram Channel", short: "텔레그램 채널",
    title: "속보를 텔레그램으로 받아보세요",
    text: "속보와 스캇 박의 해설을 채널로 바로 보내드려요. 무료, 가입 없이 구독만 하면 돼요.",
    cta: "채널 구독하기", other: "Other editions",
    inline: "속보를 텔레그램 채널로 받아보세요",
    slideT: "속보는 텔레그램에서 먼저", slideD: "새 속보와 해설이 올라오면 채널로 바로 보내드려요. 무료, 가입 없이.",
    contactT: "뉴스 채널", contactX: "제보·문의가 아니라 뉴스만 받아보고 싶다면 언어별 채널을 구독하세요.",
    names: { ko: "한국어", en: "English", zh: "中文" },
  },
  en: {
    eye: "Telegram Channel", short: "Telegram",
    title: "Get the wire on Telegram",
    text: "Breaking news and Scott Park's analysis, sent straight to the channel. Free, no sign-up.",
    cta: "Join the channel", other: "Other editions",
    inline: "Get CHAINBRIEF breaking news on Telegram",
    slideT: "Breaking news, first on Telegram", slideD: "New stories and analysis go to the channel as they publish. Free, no sign-up.",
    contactT: "News channels", contactX: "Just want the news? Join the channel for your language.",
    names: { ko: "한국어", en: "English", zh: "中文" },
  },
  zh: {
    eye: "Telegram 频道", short: "Telegram 频道",
    title: "在 Telegram 接收快讯",
    text: "快讯与 Scott Park 的深度分析，第一时间推送到频道。免费，无需注册。",
    cta: "加入频道", other: "其他版本",
    inline: "在 Telegram 频道接收链报快讯",
    slideT: "快讯，Telegram 先到", slideD: "新快讯与分析发布后即刻推送到频道。免费，无需注册。",
    contactT: "新闻频道", contactX: "只想看新闻？加入对应语言的频道即可。",
    names: { ko: "한국어", en: "English", zh: "中文" },
  },
};

export function tgChan(cfg, lang) {
  const ch = cfg.tgChannels || {};
  const url = (h) => h ? `https://t.me/${String(h).replace(/^@/, "")}` : "";
  const handle = ch[lang] || "";
  if (!handle) return null;
  const L = C[lang] || C.en;
  const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const href = url(handle);
  const ext = 'target="_blank" rel="noopener"';
  const others = ["ko", "en", "zh"].filter((k) => k !== lang && ch[k]);
  const otherLinks = others.map((k) => `<a href="${url(ch[k])}" ${ext} lang="${k === "zh" ? "zh-Hans" : k}">${esc(L.names[k])}</a>`).join("");
  return {
    href, handle, L, icon: ICON,
    // 상단 띠 오른쪽 작은 링크
    topline: `<a class="tl-tg" href="${href}" ${ext} aria-label="${esc(L.short)} ${esc(handle)}">${ICON}<span>${esc(L.short)}</span></a>`,
    // 사이드 레일
    rail: `<section class="block tgc"><div class="block-head"><h2>${esc(L.title)}</h2><span class="label">${esc(L.eye)}</span></div>
  <a class="tgc-main" href="${href}" ${ext}><span class="tgc-ic">${ICON}</span><span class="tgc-h"><b>${esc(handle)}</b><small>${esc(L.text)}</small></span></a>
  <div class="tgc-foot"><a class="btn" href="${href}" ${ext}>${esc(L.cta)}</a>${otherLinks ? `<span class="tgc-o">${otherLinks}</span>` : ""}</div>
</section>`,
    // 기사·속보 본문 끝
    card: `<aside class="tgcard"><a class="tgcard-in" href="${href}" ${ext}><span class="tgc-ic">${ICON}</span><span class="tgcard-t"><span class="label">${esc(L.eye)} · <span class="tgc-hd">${esc(handle)}</span></span><strong>${esc(L.title)}</strong><small>${esc(L.text)}</small></span><span class="tgcard-cta">${esc(L.cta)} <span aria-hidden="true">→</span></span></a></aside>`,
    // 홈 속보 목록 사이에 한 줄
    inline: `<a class="tg-inline" href="${href}" ${ext}><span class="tgc-ic">${ICON}</span><span class="tgi-t">${esc(L.inline)}</span><span class="tgi-h">${esc(handle)} <span aria-hidden="true">→</span></span></a>`,
    // 히어로 슬라이드
    slide: { art: "blue-hour", eye: `${esc(L.eye)} · ${esc(handle)}`, title: L.slideT, dek: L.slideD, href, cta: L.cta },
    // 푸터 칼럼 링크
    footer: `<a href="${href}" ${ext}>${esc(L.short)} ${esc(handle)}</a>`,
    // 문의 페이지
    contact: `<div class="tgc-contact"><span class="label">${esc(L.contactT)}</span><p>${esc(L.contactX)}</p><ul>${[lang, ...["ko", "en", "zh"].filter((k) => k !== lang)].filter((k) => ch[k]).map((k) => `<li><a href="${url(ch[k])}" ${ext}><span class="tgc-ic">${ICON}</span><b>${esc(ch[k])}</b><span>${esc(L.names[k])}</span></a></li>`).join("")}</ul></div>`,
    sameAs: ["ko", "en", "zh"].filter((k) => ch[k]).map((k) => url(ch[k])),
  };
}
