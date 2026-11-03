// 경제 일정 (Macro Calendar) — 코인 시장을 흔드는 미국 거시 일정. 코인니스 '경제 일정'에서 배운 아이디어(2026-11-03).
// 날짜는 공식 발표만 쓴다: FOMC = 연준 federalreserve.gov/monetarypolicy/fomccalendars.htm,
// CPI = 미 노동통계국 bls.gov/schedule/news_release/cpi.htm (2026-11-03 확인). 목록이 끝나기 전에(2027-11) 다음 해 일정을 넣는다.
// 시각은 미국 동부시간(ET) 기준으로 적고, 빌드가 에디션 시간대(KST·ET·HKT)로 바꾼다.

const SRC = {
  fomc: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
  cpi: "https://www.bls.gov/schedule/news_release/cpi.htm",
};
// [종류, ET 날짜, ET 시각, 부가]  fomc 부가 = 점도표(SEP) 여부, cpi 부가 = 대상 월(YYYY-MM)
const RAW = [
  ["cpi", "2026-11-10", "08:30", "2026-10"],
  ["fomc", "2026-12-09", "14:00", true],
  ["cpi", "2026-12-10", "08:30", "2026-11"],
  ["cpi", "2027-01-13", "08:30", "2026-12"],
  ["fomc", "2027-01-27", "14:00", false],
  ["cpi", "2027-02-11", "08:30", "2027-01"],
  ["cpi", "2027-03-10", "08:30", "2027-02"],
  ["fomc", "2027-03-17", "14:00", true],
  ["cpi", "2027-04-13", "08:30", "2027-03"],
  ["fomc", "2027-04-28", "14:00", false],
  ["cpi", "2027-05-12", "08:30", "2027-04"],
  ["fomc", "2027-06-09", "14:00", true],
  ["cpi", "2027-06-10", "08:30", "2027-05"],
  ["cpi", "2027-07-14", "08:30", "2027-06"],
  ["fomc", "2027-07-28", "14:00", false],
  ["cpi", "2027-08-11", "08:30", "2027-07"],
  ["cpi", "2027-09-14", "08:30", "2027-08"],
  ["fomc", "2027-09-15", "14:00", true],
  ["cpi", "2027-10-14", "08:30", "2027-09"],
  ["fomc", "2027-10-27", "14:00", false],
  ["cpi", "2027-11-10", "08:30", "2027-10"],
  ["fomc", "2027-12-08", "14:00", true],
  ["cpi", "2027-12-10", "08:30", "2027-11"],
];

// 뉴욕 현지 시각 → UTC 순간 (서머타임 자동)
function etToDate(d, t) {
  const guess = new Date(`${d}T${t}:00Z`);
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(guess).map((x) => [x.type, x.value]));
  const asNY = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(guess.getTime() - (asNY - guess.getTime()));
}
export const EVENTS = RAW.map(([kind, d, t, x]) => ({ kind, at: etToDate(d, t), sep: kind === "fomc" ? x : false, ref: kind === "cpi" ? x : "" }));

const T = {
  ko: {
    tz: "Asia/Seoul", tzl: "KST", loc: "ko-KR", label: "Macro Calendar", title: "경제 일정", rail: "다가오는 경제 일정", today: "오늘", tmr: "내일",
    name: (e) => e.kind === "fomc" ? "FOMC 금리 결정" : "미국 소비자물가(CPI)",
    sub: (e) => e.kind === "fomc" ? (e.sep ? "연준 · 점도표 함께 발표" : "연준 · 회의 이틀째") : `${+e.ref.slice(5)}월분 · 노동통계국`,
    src: () => "공식 일정",
    more: "경제 일정 전체", note: "미국 연준(FOMC)·노동통계국(CPI)이 공식 발표한 일정이에요. 시각은 한국시간이고, 발표 기관 사정으로 바뀔 수 있어요. 결과 수치는 발표 직후 속보로 전해요.",
    aside: "시각 · 한국시간", key: "점도표",
  },
  en: {
    tz: "America/New_York", tzl: "ET", loc: "en-US", label: "Macro Calendar", title: "Macro calendar", rail: "Coming up", today: "Today", tmr: "Tomorrow",
    name: (e) => e.kind === "fomc" ? "FOMC rate decision" : "US CPI",
    sub: (e) => e.kind === "fomc" ? (e.sep ? "Fed · with dot plot" : "Fed · day two of the meeting") : `${new Date(Date.UTC(2000, +e.ref.slice(5) - 1, 15)).toLocaleString("en-US", { month: "long", timeZone: "UTC" })} data · BLS`,
    src: () => "Official schedule",
    more: "Full macro calendar", note: "Dates are the official schedules of the Federal Reserve (FOMC) and the Bureau of Labor Statistics (CPI). Times are US Eastern and can change if the agency reschedules. We report the numbers as flash news when they land.",
    aside: "Times · US Eastern", key: "Dot plot",
  },
  zh: {
    tz: "Asia/Hong_Kong", tzl: "HKT", loc: "zh-CN", label: "Macro Calendar", title: "经济日历", rail: "近期经济日程", today: "今天", tmr: "明天",
    name: (e) => e.kind === "fomc" ? "美联储利率决议" : "美国CPI",
    sub: (e) => e.kind === "fomc" ? (e.sep ? "美联储 · 同时公布点阵图" : "美联储 · 会议第二天") : `${+e.ref.slice(5)}月数据 · 美国劳工统计局`,
    src: () => "官方日程",
    more: "全部经济日程", note: "日期来自美联储（FOMC）与美国劳工统计局（CPI）的官方日程。时间为香港/北京时间，如发布机构调整将随之变化。数据公布后我们会以快讯报道。",
    aside: "时间 · 香港/北京时间", key: "点阵图",
  },
};

const parts = (d, L) => Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: L.tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", weekday: "short" }).formatToParts(d).map((x) => [x.type, x.value]));
const dayNo = (d, L) => { const p = parts(d, L); return Date.UTC(+p.year, +p.month - 1, +p.day) / 864e5; };
const WK = { ko: { Sun: "일", Mon: "월", Tue: "화", Wed: "수", Thu: "목", Fri: "금", Sat: "토" }, zh: { Sun: "周日", Mon: "周一", Tue: "周二", Wed: "周三", Thu: "周四", Fri: "周五", Sat: "周六" } };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ddLabel(e, now, L) {
  const n = dayNo(e.at, L) - dayNo(now, L);
  return n <= 0 ? L.today : n === 1 ? L.tmr : `D-${n}`;
}
export function upcoming(now = new Date(), n = 8) {
  return EVENTS.filter((e) => e.at.getTime() > now.getTime() - 3 * 36e5).slice(0, n);
}

function row(e, lang, now, { esc, withSrc }) {
  const L = T[lang] || T.ko;
  const p = parts(e.at, L);
  const time = lang === "en" ? new Intl.DateTimeFormat("en-US", { timeZone: L.tz, hour: "numeric", minute: "2-digit" }).format(e.at).replace(" AM", " am").replace(" PM", " pm") : `${p.hour}:${p.minute}`;
  const mLine = lang === "en" ? `${MON[+p.month - 1]} · ${p.weekday}` : lang === "zh" ? `${p.month}月 ${WK.zh[p.weekday]}` : `${p.month}월 ${WK.ko[p.weekday]}`;
  const dd = ddLabel(e, now, L);
  const cj = lang === "en" ? "" : " cjk";
  const soon = dd === L.today || dd === L.tmr;
  return `<li class="cal-i${e.sep ? " key" : ""}" data-at="${e.at.getTime()}">
    <time class="cal-d" datetime="${e.at.toISOString()}"><span class="cal-n">${+p.day}</span><span class="cal-m${cj}">${esc(mLine)}</span></time>
    <div class="cal-b"><strong class="cal-t${cj}">${esc(L.name(e))}${e.sep ? `<i class="cal-k" title="${esc(L.key)}" aria-hidden="true"></i>` : ""}</strong><span class="cal-s${cj}"><span class="num">${esc(time)}</span> ${esc(L.tzl)} · ${esc(L.sub(e))}${withSrc ? ` · <a href="${SRC[e.kind]}" target="_blank" rel="noopener">${esc(L.src(e))}</a>` : ""}</span></div>
    <span class="cal-dd${soon ? " soon" : ""}">${esc(dd)}</span>
  </li>`;
}
const dataAttrs = (lang) => { const L = T[lang] || T.ko; return ` data-tz="${L.tz}" data-today="${L.today}" data-tmr="${L.tmr}"`; };

export function calRail(lang, { esc, href, now = new Date() }) {
  const L = T[lang] || T.ko;
  const list = upcoming(now, 3);
  if (!list.length) return "";
  return `<section class="block cal-rail"><div class="block-head"><h2>${esc(L.rail)}</h2><span class="label">${L.tzl}</span></div>
  <ol class="cal"${dataAttrs(lang)}>${list.map((e) => row(e, lang, now, { esc })).join("")}</ol>
  <a class="more${lang === "en" ? "" : " cjk"}" href="${href}">${esc(L.more)}</a></section>`;
}

export function calSection(lang, { esc, secHead, now = new Date() }) {
  const L = T[lang] || T.ko;
  const list = upcoming(now, 8);
  if (!list.length) return "";
  return `<section id="calendar" class="cal-sec">${secHead(L.label, esc(L.title), esc(L.aside), "h2")}
  <ol class="cal wide-cal"${dataAttrs(lang)}>${list.map((e) => row(e, lang, now, { esc, withSrc: true })).join("")}</ol>
  <p class="note">${esc(L.note)}</p></section>`;
}
