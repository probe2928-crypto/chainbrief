// 템플릿 → functions/_shared/templates.gen.ts 로 묶고, 금지어 검사 후 미리보기 HTML 을 만든다.
//   node ops/crm/templates/build.mjs [미리보기 출력 폴더]
// 미리보기의 전송자 정보는 '확인 필요' 자리표시. 실제 값은 DB crm_sender_profiles 에서 발송 때 채운다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderEmail } from "../functions/_shared/render.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(HERE, f), "utf8");
const SITES = ["qurator", "perpline", "luft", "lifejunjun", "chainbrief"];

const T = {
  layout: read("layout.html"),
  legal: { ko: read("legal.ko.html"), en: read("legal.en.html") },
  brands: JSON.parse(read("brands.json")),
  notices: JSON.parse(read("notices.json")),
  welcome: Object.fromEntries(SITES.map((s) => [s, JSON.parse(read(`welcome/${s}.json`))])),
};
delete T.brands._note; delete T.notices._note;

// 금지어 검사(LUFT): policy.ts 의 BANNED 와 같은 목록
const BANNED = { luft: [/탈취/, /항균/, /천연/, /무해/, /무독성/, /안심/, /에코/, /히노키/, /[0-9][0-9,]*\s*원/] };
let bad = 0;
for (const s of SITES) for (const st of T.welcome[s].steps) {
  const txt = [st.subject, st.preheader, st.headline, st.body, st.cta_text].join(" ");
  for (const re of BANNED[s] ?? []) if (re.test(txt)) { console.error(`금지어 ${re} → ${s} step${st.step}`); bad++; }
  if (st.kind === "ad" && /\(광고\)/.test(st.subject)) { console.error(`제목에 (광고) 직접 기재 금지(자동 삽입) → ${s} step${st.step}`); bad++; }
}
if (bad) process.exit(1);

const out = path.join(HERE, "../functions/_shared/templates.gen.ts");
fs.writeFileSync(out, "// 자동 생성: node ops/crm/templates/build.mjs — 직접 고치지 말 것\n" +
  "// deno-lint-ignore-file\nexport const TEMPLATES = " + JSON.stringify(T, null, 0) + " as const;\nexport default TEMPLATES;\n");
console.log("wrote", path.relative(process.cwd(), out));

const prevDir = process.argv[2];
if (prevDir) {
  fs.mkdirSync(prevDir, { recursive: true });
  const sample = (site) => ({
    brand_name: T.brands[site].wordmark === "인생준준" ? "인생준준" : T.brands[site].wordmark,
    legal_name: "[상호 확인 필요]", representative: "[대표자]", biz_reg_no: "[사업자등록번호]",
    address: "[사업장 주소]", phone: "[전화]", contact_email: "[연락 이메일]",
  });
  const AD = "(광고)";
  const index = [];
  for (const site of SITES) for (const st of T.welcome[site].steps) {
    const brand = sample(site).brand_name;
    const subject = st.kind === "ad" ? `${AD} ${brand} ${st.subject}` : st.subject;
    const html = renderEmail(T, {
      site, kind: st.kind, sender: sample(site), content: st, subject,
      unsubscribeUrl: "https://probe2928-crypto.github.io/chainbrief/crm/unsubscribe.html?t=PREVIEW",
      consentDate: T.brands[site].lang === "en" ? "Nov 2, 2026" : "2026년 11월 2일", campaignKey: `welcome_${site}_${st.step}`,
    });
    const f = `welcome-${site}-${st.step}.html`;
    fs.writeFileSync(path.join(prevDir, f), html);
    index.push({ f, subject, kind: st.kind, days: st.days });
  }
  for (const type of ["result", "biennial"]) for (const lang of ["ko", "en"]) {
    const n = T.notices[type][lang];
    const site = lang === "en" ? "perpline" : "luft";
    const vars = { brand_name: sample(site).brand_name, change_text: lang === "en" ? "Unsubscribed" : "거부", channel_text: lang === "en" ? "email" : "이메일",
      event_date: "2026-11-02", consent_date: "2024-11-12" };
    const fillv = (s) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
    const html = renderEmail(T, { site, kind: "info", lang, sender: sample(site), subject: fillv(n.subject),
      content: { label: n.label, headline: fillv(n.headline), body: fillv(n.body), preheader: "",
        cta_text: type === "biennial" ? T.notices.biennial.cta[lang] : "", cta_url: type === "biennial" ? "https://probe2928-crypto.github.io/chainbrief/crm/unsubscribe.html?t=PREVIEW" : "" } });
    const f = `notice-${type}-${lang}.html`;
    fs.writeFileSync(path.join(prevDir, f), html);
    index.push({ f, subject: fillv(n.subject), kind: "legal", days: "-" });
  }
  fs.writeFileSync(path.join(prevDir, "index.json"), JSON.stringify(index, null, 2));
  console.log("previews:", index.length, "→", prevDir);
}
