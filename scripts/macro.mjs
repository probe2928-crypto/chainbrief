// 시세 페이지 '글로벌 마켓' — 주요 지수·선물·원자재·크립토 관련 주식·ETF·환율
// fetch-macro.mjs가 15분마다 data/macro.json을 만들고, 빌드가 표로 그린다(KO·EN·ZH 공용).
import fs from "node:fs";
import path from "node:path";

export const MACRO = [
  { id: "idx", ko: "주요 지수", en: "Indices", zh: "主要指数", items: [
    ["^GSPC", "S&P 500", "S&P 500", "标普500"],
    ["^IXIC", "나스닥", "Nasdaq", "纳斯达克"],
    ["^DJI", "다우존스", "Dow Jones", "道琼斯"],
    ["^KS11", "코스피", "KOSPI", "韩国综合指数"],
    ["^KQ11", "코스닥", "KOSDAQ", "韩国创业板"],
    ["^N225", "닛케이 225", "Nikkei 225", "日经225"],
    ["^HSI", "항셍", "Hang Seng", "恒生指数"],
  ] },
  { id: "fut", ko: "선물 · 원자재", en: "Futures & commodities", zh: "期货 · 大宗商品", items: [
    ["ES=F", "S&P 500 선물", "S&P 500 futures", "标普500期货"],
    ["NQ=F", "나스닥 100 선물", "Nasdaq 100 futures", "纳指100期货"],
    ["BTC=F", "CME 비트코인 선물", "CME Bitcoin futures", "CME比特币期货"],
    ["ETH=F", "CME 이더리움 선물", "CME Ether futures", "CME以太坊期货"],
    ["GC=F", "금", "Gold", "黄金"],
    ["SI=F", "은", "Silver", "白银"],
    ["CL=F", "WTI 원유", "WTI crude", "WTI原油"],
  ] },
  { id: "stk", ko: "크립토 관련 주식", en: "Crypto stocks", zh: "加密概念股", items: [
    ["COIN", "코인베이스", "Coinbase", "Coinbase"],
    ["MSTR", "스트래티지", "Strategy", "Strategy"],
    ["CRCL", "서클", "Circle", "Circle"],
    ["HOOD", "로빈후드", "Robinhood", "Robinhood"],
    ["MARA", "마라 홀딩스", "MARA Holdings", "MARA"],
    ["NVDA", "엔비디아", "Nvidia", "英伟达"],
    ["TSLA", "테슬라", "Tesla", "特斯拉"],
  ] },
  { id: "etf", ko: "현물 ETF", en: "Spot ETFs", zh: "现货ETF", items: [
    ["IBIT", "블랙록 비트코인 ETF", "iShares Bitcoin Trust", "贝莱德比特币ETF"],
    ["FBTC", "피델리티 비트코인 ETF", "Fidelity Wise Origin Bitcoin", "富达比特币ETF"],
    ["ETHA", "블랙록 이더리움 ETF", "iShares Ethereum Trust", "贝莱德以太坊ETF"],
  ] },
  { id: "fx", ko: "환율 · 금리", en: "FX & rates", zh: "汇率 · 利率", items: [
    ["KRW=X", "달러/원", "USD/KRW", "美元/韩元"],
    ["DX-Y.NYB", "달러 인덱스", "Dollar index", "美元指数"],
    ["JPY=X", "달러/엔", "USD/JPY", "美元/日元"],
    ["^TNX", "미 국채 10년", "US 10Y yield", "美国10年期国债"],
  ] },
];

export function loadMacro(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, "data/macro.json"), "utf8")); } catch { return null; }
}

const T = {
  ko: { label: "Global Markets", title: "글로벌 마켓", th: ["종목", "가격", "등락", "등락률", "오늘 흐름"], note: "지수·선물·주식·환율은 15분마다 갱신돼요. 거래소에 따라 15~20분 늦을 수 있고, 장이 닫힌 종목은 마지막 종가예요. 출처: Yahoo Finance.", empty: "글로벌 시세를 불러오는 중이에요.", upd: "기준", closed: "장 마감" },
  en: { label: "Global Markets", title: "Stocks, futures & FX", th: ["Market", "Price", "Change", "%", "Today"], note: "Indices, futures, stocks and FX refresh every 15 minutes and may be delayed 15–20 minutes by the exchange. Closed markets show the last close. Source: Yahoo Finance.", empty: "Loading global markets.", upd: "as of", closed: "Closed" },
  zh: { label: "Global Markets", title: "股指 · 期货 · 汇率", th: ["品种", "价格", "涨跌", "涨跌幅", "今日走势"], note: "股指、期货、股票与汇率每15分钟更新，交易所数据可能延迟15–20分钟；休市品种显示最近收盘价。来源：Yahoo Finance。", empty: "正在加载全球行情。", upd: "更新于", closed: "休市" },
};

const fmt = (v, d) => v == null || !isFinite(v) ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const short = (sym) => ({ "DX-Y.NYB": "DXY", "KRW=X": "USDKRW", "JPY=X": "USDJPY" })[sym] || sym.replace(/^\^/, "").replace(/=F$/, "");
const digits = (sym, p) => sym === "^TNX" ? 3 : /=X$/.test(sym) ? (p > 100 ? 2 : 3) : p >= 1000 ? 2 : 2;

function spark(pts, dir) {
  const v = (pts || []).filter((x) => x != null && isFinite(x));
  if (v.length < 3) return "";
  const lo = Math.min(...v), hi = Math.max(...v), w = 96, h = 28, r = hi - lo || 1;
  const d = v.map((y, i) => `${(i / (v.length - 1) * w).toFixed(1)},${(h - 2 - (y - lo) / r * (h - 4)).toFixed(1)}`).join(" ");
  return `<svg class="spark ${dir}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${d}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

export function macroSection(lang, data, { esc, secHead }) {
  const L = T[lang] || T.ko;
  const q = data?.quotes || {};
  const has = Object.keys(q).length > 0;
  const when = data?.updated ? new Date(data.updated) : null;
  const stamp = when ? when.toLocaleString(lang === "ko" ? "ko-KR" : lang === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Seoul", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + " KST" : "";
  const groups = MACRO.map((g) => {
    const rows = g.items.map(([sym, ko, en, zh]) => {
      const x = q[sym]; const name = { ko, en, zh }[lang] || ko;
      if (!x) return `<tr><td><span class="sym">${esc(short(sym))}</span><span class="name">${esc(name)}</span></td><td class="num">—</td><td class="num"></td><td class="num"></td><td></td></tr>`;
      const dir = x.chg > 0 ? "up" : x.chg < 0 ? "down" : "";
      const d = digits(sym, x.price);
      const sign = x.chg > 0 ? "+" : "";
      return `<tr><td><span class="sym">${esc(short(sym))}</span><span class="name">${esc(name)}</span></td><td class="num">${fmt(x.price, d)}${sym === "^TNX" ? "%" : ""}</td><td class="num ${dir}">${x.chg == null ? "" : sign + fmt(x.chg, d)}</td><td class="num ${dir}">${x.pct == null ? "" : sign + fmt(x.pct, 2) + "%"}</td><td class="sp">${spark(x.spark, dir)}</td></tr>`;
    }).join("");
    return `<div class="gm-group"><h3 class="gm-h">${esc(g[lang] || g.ko)}</h3><div class="wide"><table class="mkt-full gm"><thead><tr>${L.th.map((h, i) => `<th${i ? ' class="num"' : ""}>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }).join("");
  return `<section id="global">${secHead(L.label, esc(L.title), stamp ? `${esc(L.upd)} ${esc(stamp)}` : "", "h2")}${has ? groups : `<div class="empty">${esc(L.empty)}</div>`}<p class="note">${esc(L.note)}</p></section>`;
}
