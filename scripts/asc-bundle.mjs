// 번들 ID(App ID)가 애플 개발자 계정에 없으면 만들고, App Store Connect에 앱 레코드가 있는지 알려준다.
// 사용: node scripts/asc-bundle.mjs <번들ID> "<이름>"
// 비밀값은 환경변수로만: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 (원문 또는 base64). 출력에 비밀값 없음.
import crypto from "node:crypto";
const [bundle, name = bundle] = process.argv.slice(2);
if (!bundle) { console.error("번들 ID가 필요해요"); process.exit(2); }
const raw = process.env.ASC_KEY_P8 || "";
const pem = raw.includes("BEGIN PRIVATE KEY") ? raw : Buffer.from(raw, "base64").toString("utf8");
const b64u = (b) => Buffer.from(b).toString("base64url");
function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "ES256", kid: process.env.ASC_KEY_ID, typ: "JWT" }));
  const body = b64u(JSON.stringify({ iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 900, aud: "appstoreconnect-v1" }));
  const sig = crypto.sign("sha256", Buffer.from(`${head}.${body}`), { key: pem, dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${b64u(sig)}`;
}
async function api(method, p, body) {
  const r = await fetch("https://api.appstoreconnect.apple.com" + p, { method, headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${p} → ${r.status}: ${(j.errors || []).map((x) => x.detail || x.title).join(" | ")}`);
  return j;
}
const ids = await api("GET", `/v1/bundleIds?filter[identifier]=${encodeURIComponent(bundle)}&filter[platform]=IOS`);
if ((ids.data || []).some((x) => x.attributes.identifier === bundle)) console.log(`번들 ID 있음: ${bundle}`);
else { await api("POST", "/v1/bundleIds", { data: { type: "bundleIds", attributes: { identifier: bundle, name, platform: "IOS" } } }); console.log(`번들 ID 새로 등록: ${bundle} (${name})`); }
const apps = await api("GET", `/v1/apps?filter[bundleId]=${encodeURIComponent(bundle)}`);
const has = (apps.data || []).some((a) => a.attributes.bundleId === bundle);
console.log(has ? `App Store Connect 앱 레코드 있음` : `App Store Connect 앱 레코드 없음 — 웹(appstoreconnect.apple.com → 앱 → +)에서 번들 ID ${bundle}로 앱을 한 번 만들어야 업로드돼요`);
if (process.env.GITHUB_OUTPUT) (await import("node:fs")).appendFileSync(process.env.GITHUB_OUTPUT, `has_app=${has}\n`);
