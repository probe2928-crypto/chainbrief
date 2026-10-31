// 지금의 이슈 (In Focus) — 속보·기사를 주제별로 묶는다. 코인니스 '테마 큐레이션'에서 배운 정보 구조를 체인브리프식으로.
// 키워드는 제목(가중 2) + 본문 앞부분에서 찾는다. 숫자·문구를 만들어내지 않고, 우리 기사·속보를 다시 묶기만 한다.
export const ISSUES = [
  { slug: "security", ko: ["해킹·보안", "거래소·지갑 해킹, 피싱, 자산 탈취와 그 뒤의 대응을 한 줄로 따라갑니다."], en: ["Hacks & Security", "Exchange and wallet breaches, phishing, drained funds — and what happened next."], zh: ["黑客与安全", "交易所与钱包被盗、钓鱼诈骗及后续处置，一条线追踪。"],
    re: { ko: /해킹|해커|탈취|플래시론|사칭|피싱|침해|익스플로잇|도난|무단 인출|개인정보 유출|보안 사고/, en: /\bhack|exploit|breach|phishing|stolen|drain|attacker|cyber|security incident/i, zh: /黑客|被盗|盗取|攻击|漏洞|钓鱼|安全事件|泄露|骗局|伪冒|冻结/ } },
  { slug: "stablecoins", ko: ["스테이블코인", "USDT·USDC부터 은행·국가 스테이블코인까지, 발행·인가·유통의 흐름."], en: ["Stablecoins", "From USDT and USDC to bank and sovereign coins: issuance, licensing and flows."], zh: ["稳定币", "从USDT、USDC到银行与港元稳定币：发行、牌照与流通。"],
    re: { ko: /스테이블코인|USDC|USDT|테더|RLUSD|EURC|JPYC|PYUSD|서클/, en: /stablecoin|\bUSDC\b|\bUSDT\b|Tether|RLUSD|EURC|PYUSD|\bCircle\b/i, zh: /稳定币|USDC|USDT|Tether|RLUSD|泰达/ } },
  { slug: "etf", ko: ["ETF 자금 흐름", "비트코인·이더리움·알트코인 현물 ETF의 유입과 유출, 새 상품."], en: ["ETF Flows", "Spot bitcoin, ether and altcoin ETFs: inflows, outflows and new products."], zh: ["ETF资金流向", "比特币、以太坊及山寨币现货ETF的流入流出与新产品。"],
    re: { ko: /ETF/, en: /\bETFs?\b/, zh: /ETF/ } },
  { slug: "regulation", ko: ["규제·정책", "SEC·CFTC·금융위 등 당국의 결정과 입법, 인가·제재 소식."], en: ["Policy & Regulation", "Decisions from the SEC, CFTC, FCA and others — bills, charters, licences, sanctions."], zh: ["监管与政策", "SEC、CFTC、香港证监会等监管决定、立法、牌照与制裁。"],
    re: { ko: /\bSEC\b|CFTC|OCC|금융위|금융당국|금감원|규제|인가(?:\s?(?:신청|획득|취득)|를|받)|최종 인가|법안|입법|당정|제재|MiCA|접속차단|재무부/, en: /\bSEC\b|CFTC|\bOCC\b|\bFCA\b|MiCA|regulat|\bbill\b|CLARITY|charter|licen[cs]e|lawsuit|\bsues?\b|enforcement|sanction|Treasury/i, zh: /监管|证监会|\bSEC\b|CFTC|牌照|法案|货币监理署|制裁|金管局|合规|起诉/ } },
  { slug: "fed", ko: ["연준·금리", "FOMC와 금리, 물가 지표가 코인 시장에 주는 신호."], en: ["Fed & Rates", "The FOMC, rates and inflation data, and what they signal for crypto."], zh: ["美联储与利率", "议息会议、利率与通胀数据对加密市场的信号。"],
    re: { ko: /연준|FOMC|금리|워시|물가|CPI|기준금리/, en: /\bFed\b|FOMC|rate (?:cut|hike)|holds rates|inflation|\bCPI\b|Warsh|Powell/i, zh: /美联储|议息|利率|加息|降息|通胀|CPI/ } },
  { slug: "prediction-markets", ko: ["예측시장", "칼시·폴리마켓 등 예측시장의 성장과 규제 충돌."], en: ["Prediction Markets", "Kalshi, Polymarket and the fight over who regulates event contracts."], zh: ["预测市场", "Kalshi、Polymarket等预测市场的扩张与监管冲突。"],
    re: { ko: /예측시장|칼시|폴리마켓/, en: /prediction[- ]market|Kalshi|Polymarket/i, zh: /预测市场|Kalshi|Polymarket/ } },
  { slug: "tokenization", ko: ["토큰화·RWA", "주식·펀드·채권을 블록체인에 올리는 실물자산 토큰화."], en: ["Tokenization & RWA", "Stocks, funds and bonds moving on-chain: real-world asset tokenization."], zh: ["代币化与RWA", "股票、基金与债券上链：现实世界资产代币化。"],
    re: { ko: /토큰화|토큰증권|RWA/, en: /tokeni[sz]|\bRWA\b/i, zh: /代币化|RWA|通证化/ } },
  { slug: "tax", ko: ["코인 과세", "가상자산 과세 유예·세부 기준을 둘러싼 국회·정부 논의."], en: ["Crypto Tax", "Debates over crypto taxation, delays and reporting rules."], zh: ["加密征税", "围绕加密资产征税、推迟与申报规则的讨论。"],
    re: { ko: /과세|세금|세제|양도세/, en: /crypto tax|\btax(?:ation|es)?\b/i, zh: /征税|税收|课税/ } },
];

const head = (s = "", n = 260) => String(s).replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").slice(0, n);
// 한 글이 속하는 이슈(최대 2개): 제목 매치 우선
export function issuesOf(item, lang) {
  const t = item.title || "", b = head(item.summary || item.body);
  // 제목에 있으면 포함, 본문 앞부분만이면 서로 다른 키워드 2개 이상일 때만(곁가지 언급 제외)
  const inBody = (re) => new Set((b.match(new RegExp(re.source, re.flags.replace("g", "") + "g")) || []).map((w) => w.toLowerCase())).size;
  const hit = ISSUES.map((x) => ({ x, s: x.re[lang].test(t) ? 3 : inBody(x.re[lang]) >= 2 ? 1 : 0 })).filter((r) => r.s > 0);
  return hit.sort((a, b2) => b2.s - a.s).slice(0, 2).map((r) => r.x.slug);
}

// 이슈별 묶음: 최근 hours 시간 점수(속보 1, 기사 2, 중요 +1, 24시간 안 ×1.5)로 순위, 페이지는 days일치
export function issueGroups({ flashes = [], articles = [], lang, now = new Date(), hours = 72, days = 30 }) {
  const map = new Map(ISSUES.map((x) => [x.slug, { x, f: [], a: [], score: 0, recentF: 0, recentA: 0, latest: null }]));
  const tag = (it, kind) => {
    if (String(it.id || "").startsWith("auto-")) return;
    const age = now - it.date;
    if (age < 0 || age > days * 864e5) return;
    for (const s of issuesOf(it, lang)) {
      const g = map.get(s);
      g[kind].push(it);
      if (age <= hours * 36e5) {
        g.score += (kind === "a" ? 2 : 1 + (it.important ? 1 : 0)) * (age <= 864e5 ? 1.5 : 1);
        kind === "a" ? g.recentA++ : g.recentF++;
        if (!g.latest || it.date > g.latest.date) g.latest = { ...it, kind };
      }
    }
  };
  flashes.forEach((f) => tag(f, "f"));
  articles.forEach((a) => tag(a, "a"));
  const all = [...map.values()].filter((g) => g.f.length + g.a.length >= 2);
  const top = all.filter((g) => g.recentF + g.recentA >= 2).sort((a, b) => b.score - a.score).slice(0, 4);
  return { all, top, bySlug: Object.fromEntries(all.map((g) => [g.x.slug, g])) };
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
// 홈 띠: 4칸, 번호(로마 숫자) · 이슈 이름 · 72시간 건수 · 열기 막대 · 최신 제목
export function issueBand({ groups, S, u, esc, lang }) {
  const top = groups.top;
  if (top.length < 2) return "";
  const max = Math.max(...top.map((g) => g.score));
  return `<section class="issues" aria-label="${esc(S.title)}"><div class="wrap">
  <div class="is-head"><span class="label">In Focus</span><h2>${esc(S.title)}</h2><span class="is-win">${esc(S.win)}</span><a class="is-all" href="${u("issue/")}">${esc(S.all)} <span aria-hidden="true">→</span></a></div>
  <ol class="is-row">${top.map((g, i) => {
    const l = g.latest;
    const href = l ? u(`${l.kind === "a" ? "articles" : "flash"}/${l.id}/`) : "";
    return `<li class="is"><span class="is-n" aria-hidden="true">${ROMAN[i]}</span>
    <a class="is-t" href="${u(`issue/${g.x.slug}/`)}">${esc(g.x[lang][0])}</a>
    <span class="is-c">${S.count(g.recentF, g.recentA)}</span>
    <span class="is-bar" aria-hidden="true"><i style="width:${Math.max(18, Math.round((g.score / max) * 100))}%"></i></span>
    ${l ? `<a class="is-h" href="${href}">${esc(l.title)}</a>` : ""}
  </li>`;
  }).join("")}</ol></div></section>`;
}

// 이슈 색인(분야 색인 .desks와 같은 목차 언어)
export function issueIndex({ groups, S, u, esc, lang, cur = "" }) {
  return `<nav class="desks" aria-label="${esc(S.title)}"><span class="label">In Focus</span><ul>${groups.all.map((g) => `<li><a href="${u(`issue/${g.x.slug}/`)}"${g.x.slug === cur ? ' aria-current="page"' : ""}>${esc(g.x[lang][0])}<sup class="num">${g.f.length + g.a.length}</sup></a></li>`).join("")}</ul></nav>`;
}

// 기사·속보 상세에서 '이 이슈 따라가기' 한 줄
export function issueLink({ item, groups, S, u, esc, lang }) {
  const s = issuesOf(item, lang).find((k) => groups.bySlug[k]);
  if (!s) return "";
  const g = groups.bySlug[s];
  return `<p class="is-link"><span class="label">In Focus</span><a href="${u(`issue/${s}/`)}">${esc(g.x[lang][0])}</a><span class="is-lc">${S.count(g.f.length, g.a.length)}</span><span aria-hidden="true" class="is-go">→</span></p>`;
}
