// Project News — 파트너(스폰서) 프로젝트 소개. 편집국 기사와 분리된 섹션.
// content/projects/<slug>/{ko,en,zh}.md  +  public/projects/<slug>/{cover.jpg,cover-m.jpg,logo.png,square.jpg}
// 진행 순서: docs/PROJECT_PROMO.md
import fs from "node:fs";
import path from "node:path";

const T = {
  ko: {
    nav: "프로젝트", kicker: "Project News", title: "프로젝트 뉴스",
    lead: "체인브리프가 소개하는 블록체인·AI 프로젝트. 모든 글은 프로젝트 측 자료를 바탕으로 한 파트너 콘텐츠(광고)이며, 편집국 기사와 따로 운영합니다.",
    sponsored: "Sponsored · 파트너 콘텐츠", by: "체인브리프 파트너스", read: "자세히 보기", facts: "Fact sheet",
    f: { project: "프로젝트", cat: "분야", period: "노출", web: "웹사이트", x: "X", tg: "텔레그램", contact: "제휴 문의" },
    period: { Weekly: "이번 주 프로젝트", Monthly: "이번 달 프로젝트" },
    disclose: "이 글은 프로젝트 측 요청과 제공 자료를 바탕으로 작성된 파트너 콘텐츠(광고)입니다. 체인브리프 편집국의 취재 기사가 아니며, 투자 권유가 아닙니다. 토큰·NFT 등 가상자산은 가격 변동이 크고 원금 손실 위험이 있습니다.",
    links: "공식 링크", copy: "링크 복사", empty: "곧 첫 프로젝트를 소개합니다.", more: "다른 프로젝트", inquiry: "프로젝트 소개 문의",
  },
  en: {
    nav: "Projects", kicker: "Project News", title: "Project News",
    lead: "Blockchain and AI projects featured on CHAINBRIEF. Every post is partner content based on material from the project, published separately from our newsroom.",
    sponsored: "Sponsored · Partner content", by: "CHAINBRIEF Partners", read: "Read more", facts: "Fact sheet",
    f: { project: "Project", cat: "Sector", period: "Feature", web: "Website", x: "X", tg: "Telegram", contact: "Business" },
    period: { Weekly: "Project of the week", Monthly: "Project of the month" },
    disclose: "This is partner content prepared at the project's request, based on material it supplied. It is not reporting by the CHAINBRIEF newsroom and is not investment advice. Crypto assets, including tokens and NFTs, are volatile and you can lose money.",
    links: "Official links", copy: "Copy link", empty: "Our first featured project is coming soon.", more: "More projects", inquiry: "Feature your project",
  },
  zh: {
    nav: "项目", kicker: "Project News", title: "项目动态",
    lead: "CHAINBRIEF 推荐的区块链与 AI 项目。所有文章均为基于项目方资料撰写的合作内容（广告），与编辑部新闻分开运营。",
    sponsored: "Sponsored · 合作内容", by: "CHAINBRIEF Partners", read: "阅读全文", facts: "Fact sheet",
    f: { project: "项目", cat: "领域", period: "推荐", web: "官网", x: "X", tg: "Telegram", contact: "商务合作" },
    period: { Weekly: "本周项目", Monthly: "本月项目" },
    disclose: "本文为应项目方要求、基于其提供资料撰写的合作内容（广告），并非 CHAINBRIEF 编辑部报道，亦不构成投资建议。代币、NFT 等加密资产价格波动大，存在本金损失风险。",
    links: "官方链接", copy: "复制链接", empty: "首个推荐项目即将上线。", more: "更多项目", inquiry: "项目合作咨询",
  },
};
export const projectNav = (lang) => ["projects/", T[lang].nav];

function fm(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const data = {};
  if (!m) return { data, body: src };
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":"); if (i < 0) continue;
    let v = line.slice(i + 1).trim(); if (v === "true") v = true; else if (v === "false") v = false;
    data[line.slice(0, i).trim()] = v;
  }
  return { data, body: m[2] };
}

export function loadProjects(root, lang) {
  const dir = path.join(root, "content/projects");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((s) => fs.existsSync(path.join(dir, s, `${lang}.md`))).map((slug) => {
    const { data, body } = fm(fs.readFileSync(path.join(dir, slug, `${lang}.md`), "utf8"));
    return { slug, ...data, date: new Date(data.date), body };
  }).filter((p) => !p.draft && p.date <= new Date(Date.now() + 36e5)).sort((a, b) => b.date - a.date);
}

// write(rel, html) · layout({...}) · u(path) for links in this edition · asset(path) for root files · esc · markdown · fmtDate(date)
export function writeProjects({ root, lang, prefix = "", write, layout, u, asset, esc, markdown, fmtDate, telegram }) {
  const S = T[lang], list = loadProjects(root, lang);
  const img = (p, f) => asset(`projects/${p.cover || p.slug}/${f}`);
  const ext = (href, label) => href ? `<a href="${esc(href)}" target="_blank" rel="noopener sponsored">${esc(label)}</a>` : "";
  const tag = (p) => `<span class="tag pj-sp">${esc(S.sponsored)}</span>${p.period && S.period[p.period] ? `<span class="tag fmt">${esc(S.period[p.period])}</span>` : ""}`;
  const card = (p) => `<a class="pj-card" href="${u(`projects/${p.slug}/`)}">
    <span class="pj-img"><img src="${img(p, "cover-m.jpg")}" alt="" loading="lazy" decoding="async"><img class="pj-logo" src="${img(p, "logo.png")}" alt="${esc(p.project || "")}" loading="lazy"></span>
    <span class="pj-meta">${tag(p)}</span>
    <strong class="pj-name">${esc(p.project || p.title)}</strong>
    <span class="pj-tl">${esc(p.tagline || p.summary || "")}</span>
    ${p.summary && p.tagline ? `<span class="pj-sum">${esc(p.summary)}</span>` : ""}
    <span class="pj-go">${esc(S.read)} →</span></a>`;

  const hero = `<section class="pj-head"><div class="wrap"><span class="label">${esc(S.kicker)}</span><h1>${esc(S.title)}</h1><p>${esc(S.lead)}</p>${telegram ? `<a class="btn ghost" href="${esc(telegram)}" target="_blank" rel="noopener">${esc(S.inquiry)}</a>` : ""}</div></section>`;
  write(`${prefix}projects/index.html`, layout({
    title: S.title, description: S.lead, active: "projects/", canonical: "projects/",
    body: `${hero}<div class="wrap"><div class="pj-grid">${list.map((p, i) => i === 0 ? card(p).replace('class="pj-card"', 'class="pj-card pj-feat"') : card(p)).join("") || `<div class="empty">${esc(S.empty)}</div>`}</div></div>`,
  }));

  for (const p of list) {
    const others = list.filter((x) => x !== p).slice(0, 3);
    const facts = [[S.f.project, esc(p.project || "")], [S.f.cat, esc(p.category || "")], [S.f.period, esc(S.period[p.period] || "")],
      [S.f.web, ext(p.website, (p.website || "").replace(/^https?:\/\//, ""))],
      [S.f.x, [ext(p.x, "@" + (p.x || "").split("/").filter(Boolean).pop()), ext(p.x2, "@" + (p.x2 || "").split("/").filter(Boolean).pop())].filter(Boolean).join(" · ")],
      [S.f.tg, ext(p.telegram, (p.telegram || "").replace(/^https?:\/\//, ""))], [S.f.contact, esc(p.contact || "")]].filter(([, v]) => v);
    write(`${prefix}projects/${p.slug}/index.html`, layout({
      title: p.title, description: p.summary || p.tagline, active: "projects/", canonical: `projects/${p.slug}/`, type: "article",
      body: `<div class="cover pj-cover"><picture><source media="(max-width:700px)" srcset="${img(p, "cover-m.jpg")}"><img src="${img(p, "cover.jpg")}" alt="${esc(p.project || "")}" fetchpriority="high" decoding="async"></picture></div>
<div class="wrap"><p class="crumbs"><a href="${u("projects/")}">${esc(S.kicker)}</a><i class="sep" aria-hidden="true">/</i><span class="here">${esc(p.project || "")}</span></p>
<main class="pj-doc"><article class="doc">
  <div class="kicker">${tag(p)}</div>
  <h1>${esc(p.title)}</h1>
  ${p.summary ? `<p class="lede">${esc(p.summary)}</p>` : ""}
  <div class="byrow"><span class="byline"><b>${esc(S.by)}</b></span><time class="byline">${fmtDate(p.date)}</time></div>
  <div class="pj-body"><div class="prose">${markdown(p.body)}</div>
  <aside class="pj-facts"><div class="pj-fh"><img src="${img(p, "logo.png")}" alt=""><span class="label">${esc(S.facts)}</span></div><dl>${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>${p.website ? `<a class="btn" href="${esc(p.website)}" target="_blank" rel="noopener sponsored">${esc((p.website || "").replace(/^https?:\/\//, ""))} →</a>` : ""}</aside></div>
  <p class="pj-disc">${esc(S.disclose)}</p>
  <div class="share"><button class="btn ghost" type="button" data-copy>${esc(S.copy)}</button></div>
</article>
${others.length ? `<section class="pj-more"><h2 class="label">${esc(S.more)}</h2><div class="pj-grid">${others.map(card).join("")}</div></section>` : ""}
</main></div>`,
    }));
  }
  return list;
}
