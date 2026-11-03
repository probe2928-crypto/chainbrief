// 회원가입 이벤트 공식 규칙 페이지 /event/ — 설계·근거: ops/events/PLAN.md
// 화면 표시 여부는 public/event/event-config.js 의 enabled 가 정한다(꺼져 있으면 '진행 중인 이벤트 없음'만 보임).
// 회차(월)가 바뀌면 ROUND 만 고친다. 규칙 문구를 바꾸면 RULES_VERSION 과 event-config.js versions.rules 를 같이 올린다.
export const RULES_VERSION = "2026-11-02";
export const ROUND = {
  id: "cb-2026-12", month: "12월",
  period: "2026년 12월 1일 00:00 ~ 12월 31일 23:59 (KST)",
  draw: "2027년 1월 4일(월) 21:00 이후 첫 비트코인 블록",
  announce: "2027년 1월 5일(화)",
  claimBy: "발표일로부터 14일 (2027년 1월 19일까지)",
};

export function eventPage({ esc, tg }) {
  const R = ROUND;
  const spec = [
    ["경품", "1인 20 USDT 상당", "테더(USDT)·솔라나(SOL)·이더리움(ETH) 중 당첨자가 선택"],
    ["당첨", "매달 7명", "1인 1회 응모, 무작위 공개 추첨"],
    ["응모 기간", R.period, "매달 1일 새 회차가 열려요"],
    ["추첨", R.draw, "블록 해시를 시드로 누구나 결과를 재현할 수 있어요"],
    ["발표", R.announce, "이 페이지와 당첨자 이메일"],
    ["비용", "없음", "구매·입금·거래 조건 없이 무료 응모"],
  ];
  return `<div class="wrap"><main class="single ev-page" data-event-main>
<style>
[data-event-hide] [data-event-main]{visibility:hidden}
main.single.ev-page{max-width:1080px;margin-top:16px}
.ev-page{padding-top:40px}
.ev-head h1{font-family:var(--f-serif);font-weight:800;font-size:clamp(28px,4.4vw,42px);line-height:1.25;letter-spacing:-.02em;margin:0 0 14px;text-wrap:balance;max-width:20em}
.ev-head p{margin:0;color:var(--mute);font-size:var(--fs-lead);max-width:40em;line-height:1.7}
.ev-top{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:48px;align-items:start;margin:40px 0 56px}
.ev-spec{margin:0;border-top:1px solid var(--ink)}
.ev-spec div{display:grid;grid-template-columns:7.5em 1fr;gap:4px 18px;padding:16px 0;border-bottom:1px solid var(--line)}
.ev-spec dt{font-size:var(--fs-meta);color:var(--mute);padding-top:2px}
.ev-spec dd{margin:0;font-weight:500;line-height:1.5}
.ev-spec dd small{display:block;font-weight:400;color:var(--mute);font-size:var(--fs-meta);margin-top:2px}
.ev-rules h2{font-family:var(--f-serif);font-weight:800;font-size:24px;margin:56px 0 16px;letter-spacing:-.01em}
.ev-rules ol{margin:0;padding-left:1.4em;display:grid;gap:14px;max-width:44em}
.ev-rules li{line-height:1.75;padding-left:.2em}
.ev-rules li b{font-weight:500}
.ev-rules table{border-collapse:collapse;width:100%;max-width:44em;font-size:var(--fs-small);margin-top:8px}
.ev-rules th,.ev-rules td{white-space:normal;border-top:1px solid var(--line);padding:10px 12px 10px 0;text-align:left;vertical-align:top;line-height:1.6}
.ev-rules th{font-weight:500;width:8.5em;color:var(--mute)}
.ev-foot{margin:48px 0 24px;color:var(--mute);font-size:var(--fs-small)}
@media (max-width:860px){.ev-rules table,.ev-rules tbody,.ev-rules tr,.ev-rules th,.ev-rules td{display:block;width:auto}.ev-rules th{padding-bottom:0;border-bottom:0}.ev-rules td{border-bottom:0}.ev-rules td{border-top:0;padding-top:2px}.ev-top{grid-template-columns:1fr;gap:32px;margin:28px 0 40px}.ev-page{padding-top:24px}.ev-spec div{grid-template-columns:6em 1fr}}
</style>
<header class="ev-head">
  <h1>회원이면 매달 한 번, 코인 추첨에 무료로 응모할 수 있어요</h1>
  <p>체인브리프에 가입한 회원 중 매달 7명에게 20 USDT 상당의 테더·솔라나·이더리움을 드려요. 응모는 로그인 후 버튼 한 번이면 끝나요.</p>
</header>
<div class="ev-top">
  <dl class="ev-spec">${spec.map(([k, v, s]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}<small>${esc(s)}</small></dd></div>`).join("")}</dl>
  <div data-event-entry></div>
</div>

<section class="ev-rules" id="rules" aria-labelledby="rules-h">
<h2 id="rules-h">이벤트 규칙</h2>
<ol>
  <li><b>주최</b> 체인브리프(CHAINBRIEF). 이 이벤트는 거래소·코인 발행사와 관계없는 체인브리프 자체 이벤트예요.</li>
  <li><b>응모 자격</b> 체인브리프 회원 중 만 19세 이상 대한민국 거주자. 체인브리프 운영자와 그 가족은 응모할 수 없어요.</li>
  <li><b>응모 방법</b> 로그인 후 이 페이지에서 응모하기를 누르면 돼요. 회차마다 1계정 1회, 1인 1회만 인정해요. 구매·입금·거래·공유는 응모 조건이 아니에요. 마케팅 수신 동의도 조건이 아니며, 동의하지 않아도 당첨 확률은 같아요.</li>
  <li><b>경품</b> 당첨자 1인당 20 USDT 상당의 테더(USDT)·솔라나(SOL)·이더리움(ETH) 중 하나(당첨자 선택). SOL·ETH는 지급일 시세로 20 USDT에 해당하는 수량을 드려요. 1인 경품 가치는 지급 시점 원화 5만 원을 넘지 않게 운영해요. 현금이나 다른 코인으로 바꿔 드리지 않아요.</li>
  <li><b>추첨 방식</b> ${esc(R.draw)}의 해시를 시드로, 응모 순번마다 SHA-256(시드:응모번호) 값을 계산해 작은 순서대로 7명을 뽑아요. 발표 때 시드와 전체 응모 수를 함께 공개해 누구나 결과를 확인할 수 있어요. 최근 90일 안에 당첨된 계정은 제외돼요.</li>
  <li><b>발표</b> ${esc(R.announce)} 이 페이지에 당첨자 이메일 일부(예: ab***@n***.com)를 공개하고, 당첨자에게 가입한 이메일로 따로 알려요. 이 안내는 응모하신 이벤트에 관한 연락이에요.</li>
  <li><b>수령</b> 당첨자는 ${esc(R.claimBy)} 로그인 후 받을 코인, 네트워크, 지갑 주소, 받는 거래소, 수령인 실명을 입력해요. 국내 거래소는 트래블룰에 따라 출금 주소 등록 때 받는 분의 거래소와 실명이 필요해요. 입력이 끝나면 7일 안에 보내 드려요. 기한 안에 신청하지 않으면 당첨이 취소되고 다시 추첨하지 않아요.</li>
  <li><b>부정 응모</b> 이메일 인증을 마친 계정만 응모할 수 있어요. 같은 사람이 여러 계정을 쓰거나(별칭 이메일 포함), 일회용 이메일, 자동화 도구, 다른 당첨자와 같은 지갑 주소를 쓴 것이 확인되면 응모와 당첨을 취소해요.</li>
  <li><b>세금</b> 경품은 1인 1회 5만 원 이하로 운영해 소득세법 제84조의 기타소득 과세최저한 안에서 지급해요. 그래서 주민등록번호를 받지 않아요. 받은 코인을 나중에 팔 때 생기는 세금은 받는 분의 몫이에요.</li>
  <li><b>네트워크 위험</b> 잘못 입력한 주소·네트워크로 보낸 코인은 되찾을 수 없어요. 전송 수수료는 체인브리프가 부담해요.</li>
  <li><b>변경·중단</b> 이벤트를 바꾸거나 멈춰야 할 때는 이 페이지에 먼저 알리고, 이미 응모한 회차는 처음 규칙대로 진행해요.</li>
  <li><b>문의</b> 텔레그램 ${tg ? `<a href="${tg}" style="text-decoration:underline;text-underline-offset:3px">@btcbullit</a>` : "@btcbullit"}</li>
</ol>

<h2>응모 개인정보 수집·이용</h2>
<table>
  <tr><th>목적</th><td>추첨, 당첨 안내, 부정 응모 확인</td></tr>
  <tr><th>항목</th><td>회원 이메일(가입 정보에서 확인, 따로 받지 않음), 거주 국가, 응모 일시 · 당첨자만: 받을 코인·네트워크·지갑 주소·받는 거래소·수령인 실명</td></tr>
  <tr><th>보유 기간</th><td>응모 정보는 당첨자 발표 후 30일 뒤 파기. 당첨자 수령 정보는 경품 지급 후 30일 뒤 파기(지급 증빙인 전송 해시·수량·일자만 보관)</td></tr>
  <tr><th>제3자 제공</th><td>없음. 정보는 회원 DB(Supabase)에 저장되며 본인과 운영자만 볼 수 있어요.</td></tr>
  <tr><th>거부할 권리</th><td>동의하지 않을 수 있어요. 이 경우 응모할 수 없지만 체인브리프 이용에는 아무 제한이 없어요.</td></tr>
</table>
<p class="ev-foot">규칙 버전 ${RULES_VERSION} · 마케팅 정보 수신은 선택이며 내 계정에서 언제든 끌 수 있어요.</p>
</section>
</main></div>`;
}
