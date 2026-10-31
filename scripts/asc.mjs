// App Store Connect 자동화 (체인브리프 · LUFT · QURATOR)
// 사용: node scripts/asc.mjs <status|sync|submit> [앱이름,...]
// 비밀값은 환경변수로만 받는다: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 (원문 또는 base64)
// 앱별 설정: store/asc/<앱>.json — 스토어 문구·카테고리·연령·국가·심사 메모·스크린샷 폴더
// 결과: ops/asc-status.json (비밀값 없음) — 워크플로가 ops-status 브랜치에 올린다
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const API = "https://api.appstoreconnect.apple.com";
const [cmd = "status", only = ""] = process.argv.slice(2);
const ROOT = process.cwd();
const CFG_DIR = path.join(ROOT, "store/asc");
const OUT = path.join(ROOT, "ops/asc-status.json");

function keyPem() {
  const raw = process.env.ASC_KEY_P8 || "";
  return raw.includes("BEGIN PRIVATE KEY") ? raw : Buffer.from(raw, "base64").toString("utf8");
}
const b64u = (b) => Buffer.from(b).toString("base64url");
let tok = null, tokAt = 0;
function token() {
  const now = Math.floor(Date.now() / 1000);
  if (tok && now - tokAt < 600) return tok;
  const head = b64u(JSON.stringify({ alg: "ES256", kid: process.env.ASC_KEY_ID, typ: "JWT" }));
  const body = b64u(JSON.stringify({ iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 1100, aud: "appstoreconnect-v1" }));
  const sig = crypto.sign("sha256", Buffer.from(`${head}.${body}`), { key: keyPem(), dsaEncoding: "ieee-p1363" });
  tok = `${head}.${body}.${b64u(sig)}`; tokAt = now;
  return tok;
}

async function api(method, p, body) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(p.startsWith("http") ? p : API + p, {
      method, headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 2000 * (i + 1))); continue; }
    const text = await r.text();
    const json = text ? JSON.parse(text) : {};
    if (!r.ok) {
      const e = new Error(`${method} ${p} → ${r.status}: ${(json.errors || []).map((x) => `${x.code} ${x.detail || x.title}${x.source?.pointer ? ` (${x.source.pointer})` : ""}`).join(" | ")}`);
      e.status = r.status; e.json = json; throw e;
    }
    return json;
  }
  throw new Error(`${method} ${p} → 재시도 실패`);
}
const get = (p) => api("GET", p);
async function getAll(p) {
  let out = [], next = p;
  while (next) { const j = await get(next); out = out.concat(j.data || []); next = j.links?.next || null; }
  return out;
}

// ── 개별 단계 ──────────────────────────────────────────────
const log = [];
const note = (app, msg) => { const line = `[${app}] ${msg}`; console.log(line); log.push(line); };

async function findApp(bundle) {
  const j = await get(`/v1/apps?filter[bundleId]=${encodeURIComponent(bundle)}`);
  const a = (j.data || []).find((x) => x.attributes.bundleId === bundle);
  if (!a) throw new Error(`앱 레코드 없음: ${bundle}`);
  return a;
}

async function builds(appId) {
  const j = await get(`/v1/builds?filter[app]=${appId}&sort=-uploadedDate&limit=10&include=preReleaseVersion&fields[builds]=version,uploadedDate,processingState,expired,preReleaseVersion`);
  const pre = Object.fromEntries((j.included || []).map((x) => [x.id, x.attributes.version]));
  return (j.data || []).map((b) => ({
    id: b.id, build: b.attributes.version, version: pre[b.relationships?.preReleaseVersion?.data?.id] || null,
    state: b.attributes.processingState, uploaded: b.attributes.uploadedDate, expired: b.attributes.expired,
  }));
}

async function editableVersion(appId) {
  const vs = await getAll(`/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=50`);
  const editable = ["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"];
  const all = vs.map((v) => ({ id: v.id, version: v.attributes.versionString, state: v.attributes.appVersionState || v.attributes.appStoreState, storeState: v.attributes.appStoreState, created: v.attributes.createdDate }));
  return { all, editable: vs.find((v) => editable.includes(v.attributes.appStoreState) || editable.includes(v.attributes.appVersionState)) || null };
}

async function appInfo(appId) {
  const infos = await getAll(`/v1/apps/${appId}/appInfos`);
  // 편집 가능한 appInfo (출시 전이면 하나뿐)
  return infos.find((i) => !["READY_FOR_DISTRIBUTION", "READY_FOR_SALE"].includes(i.attributes.appStoreState || i.attributes.state)) || infos[0];
}

async function upsertLocalized(kind, parentRel, parentId, listPath, locale, attrs, app) {
  const list = await getAll(listPath);
  const cur = list.find((l) => l.attributes.locale === locale);
  const clean = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  if (cur) {
    const diff = Object.fromEntries(Object.entries(clean).filter(([k, v]) => cur.attributes[k] !== v));
    if (!Object.keys(diff).length) return cur.id;
    await api("PATCH", `/v1/${kind}/${cur.id}`, { data: { type: kind, id: cur.id, attributes: diff } });
    note(app, `${kind} ${locale} 갱신: ${Object.keys(diff).join(", ")}`);
    return cur.id;
  }
  const j = await api("POST", `/v1/${kind}`, { data: { type: kind, attributes: { locale, ...clean }, relationships: { [parentRel]: { data: { type: parentRel === "appInfo" ? "appInfos" : "appStoreVersions", id: parentId } } } } });
  note(app, `${kind} ${locale} 생성`);
  return j.data.id;
}

const FREQ = new Set(["alcoholTobaccoOrDrugUseOrReferences", "contests", "gamblingSimulated", "horrorOrFearThemes", "matureOrSuggestiveThemes", "medicalOrTreatmentInformation", "profanityOrCrudeHumor", "sexualContentGraphicAndNudity", "sexualContentOrNudity", "violenceCartoonOrFantasy", "violenceRealistic", "violenceRealisticProlongedGraphicOrSadistic", "gunsOrOtherWeapons"]);
const SKIP = new Set(["kidsAgeBand", "developerAgeRatingInfoUrl", "ageRatingOverride", "ageRatingOverrideV2", "koreaAgeRatingOverride", "seventeenPlus"]);
async function ageRating(infoId, cfg, app) {
  const j = await get(`/v1/appInfos/${infoId}/ageRatingDeclaration`);
  const d = j.data; const cur = d.attributes || {};
  const want = {};
  for (const [k, v] of Object.entries(cur)) {
    if (SKIP.has(k)) continue;
    if (k in (cfg.ageRating || {})) { if (v !== cfg.ageRating[k]) want[k] = cfg.ageRating[k]; continue; }
    if (v !== null && v !== undefined) continue;
    want[k] = FREQ.has(k) || /Themes|References|Content|Violence|Humor|Information|Weapons/.test(k) ? "NONE" : false;
  }
  for (const [k, v] of Object.entries(cfg.ageRating || {})) if (!(k in cur) && !(k in want)) want[k] = v;
  if (!Object.keys(want).length) return "설정됨";
  try {
    await api("PATCH", `/v1/ageRatingDeclarations/${d.id}`, { data: { type: "ageRatingDeclarations", id: d.id, attributes: want } });
  } catch (e) {
    // 모르는 항목이 섞여 있으면 하나씩 다시
    note(app, `연령 등급 일괄 저장 실패 → 항목별 재시도 (${e.message.slice(0, 160)})`);
    for (const [k, v] of Object.entries(want)) {
      try { await api("PATCH", `/v1/ageRatingDeclarations/${d.id}`, { data: { type: "ageRatingDeclarations", id: d.id, attributes: { [k]: v } } }); }
      catch (e2) { const alt = v === false ? "NONE" : v === "NONE" ? false : null; if (alt === null) { note(app, `연령 ${k} 실패`); continue; }
        try { await api("PATCH", `/v1/ageRatingDeclarations/${d.id}`, { data: { type: "ageRatingDeclarations", id: d.id, attributes: { [k]: alt } } }); } catch { note(app, `연령 ${k} 실패: ${e2.message.slice(0, 120)}`); } }
    }
  }
  note(app, `연령 등급 저장: ${Object.keys(want).length}항목`);
  return "저장함";
}

async function freePrice(appId, app) {
  try {
    const s = await get(`/v1/apps/${appId}/appPriceSchedule?include=manualPrices`);
    if ((s.included || []).length) return "설정됨";
  } catch (e) { if (e.status !== 404) throw e; }
  const pts = await getAll(`/v1/apps/${appId}/appPricePoints?filter[territory]=USA&limit=200`);
  const free = pts.find((p) => Number(p.attributes.customerPrice) === 0);
  if (!free) throw new Error("무료 가격 포인트를 못 찾음");
  await api("POST", "/v1/appPriceSchedules", {
    data: { type: "appPriceSchedules", relationships: {
      app: { data: { type: "apps", id: appId } },
      baseTerritory: { data: { type: "territories", id: "USA" } },
      manualPrices: { data: [{ type: "appPrices", id: "${p0}" }] },
    } },
    included: [{ type: "appPrices", id: "${p0}", attributes: { startDate: null }, relationships: { appPricePoint: { data: { type: "appPricePoints", id: free.id } } } }],
  });
  note(app, "가격: 무료로 설정");
  return "무료로 설정함";
}

async function availability(appId, cfg, app) {
  const terr = (await getAll("/v1/territories?limit=200")).map((t) => t.id);
  const allow = cfg.territories?.only ? new Set(cfg.territories.only) : new Set(terr.filter((t) => !(cfg.territories?.exclude || []).includes(t)));
  let av = null;
  try { av = (await get(`/v1/apps/${appId}/appAvailabilityV2`)).data; } catch (e) { if (e.status !== 404) throw e; }
  if (av) {
    const tas = await getAll(`/v2/appAvailabilities/${av.id}/territoryAvailabilities?include=territory&limit=200`);
    let changed = 0;
    for (const ta of tas) {
      const t = ta.relationships?.territory?.data?.id; const want = allow.has(t);
      if (ta.attributes.available !== want) {
        try { await api("PATCH", `/v1/territoryAvailabilities/${ta.id}`, { data: { type: "territoryAvailabilities", id: ta.id, attributes: { available: want } } }); changed++; }
        catch (e) { note(app, `국가 ${t} 변경 실패: ${e.message.slice(0, 100)}`); }
      }
    }
    if (changed) note(app, `판매 국가 ${changed}곳 조정`);
    return `${[...allow].length}개국`;
  }
  const inc = terr.map((t) => ({ type: "territoryAvailabilities", id: `\${t-${t}}`, attributes: { available: allow.has(t) }, relationships: { territory: { data: { type: "territories", id: t } } } }));
  await api("POST", "/v2/appAvailabilities", {
    data: { type: "appAvailabilities", attributes: { availableInNewTerritories: !cfg.territories?.only },
      relationships: { app: { data: { type: "apps", id: appId } }, territoryAvailabilities: { data: inc.map((x) => ({ type: x.type, id: x.id })) } } },
    included: inc,
  });
  note(app, `판매 국가 설정: ${allow.size}개국`);
  return `${allow.size}개국`;
}

async function reviewDetail(versionId, cfg, app) {
  const attrs = { contactFirstName: cfg.review.firstName, contactLastName: cfg.review.lastName, contactPhone: cfg.review.phone, contactEmail: cfg.review.email, demoAccountRequired: false, notes: cfg.review.notes };
  let cur = null;
  try { cur = (await get(`/v1/appStoreVersions/${versionId}/appStoreReviewDetail`)).data; } catch (e) { if (e.status !== 404) throw e; }
  if (cur) {
    const diff = Object.fromEntries(Object.entries(attrs).filter(([k, v]) => cur.attributes[k] !== v));
    if (Object.keys(diff).length) { await api("PATCH", `/v1/appStoreReviewDetails/${cur.id}`, { data: { type: "appStoreReviewDetails", id: cur.id, attributes: diff } }); note(app, "심사 정보 갱신"); }
    return;
  }
  await api("POST", "/v1/appStoreReviewDetails", { data: { type: "appStoreReviewDetails", attributes: attrs, relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: versionId } } } } });
  note(app, "심사 정보 생성");
}

async function screenshots(locId, dir, app, displayType = "APP_IPHONE_67") {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^ios-.*\.png$/.test(f)).sort().slice(0, 10) : [];
  if (!files.length) { note(app, `스크린샷 폴더 비어 있음: ${dir}`); return 0; }
  const sets = await getAll(`/v1/appStoreVersionLocalizations/${locId}/appScreenshotSets`);
  let set = sets.find((s) => s.attributes.screenshotDisplayType === displayType);
  if (!set) set = (await api("POST", "/v1/appScreenshotSets", { data: { type: "appScreenshotSets", attributes: { screenshotDisplayType: displayType }, relationships: { appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: locId } } } } })).data;
  const have = await getAll(`/v1/appScreenshotSets/${set.id}/appScreenshots`);
  const done = have.filter((s) => s.attributes.assetDeliveryState?.state !== "FAILED");
  if (done.length >= files.length) return done.length;
  for (const s of have) await api("DELETE", `/v1/appScreenshots/${s.id}`).catch(() => {});
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    const r = await api("POST", "/v1/appScreenshots", { data: { type: "appScreenshots", attributes: { fileName: f, fileSize: buf.length }, relationships: { appScreenshotSet: { data: { type: "appScreenshotSets", id: set.id } } } } });
    for (const op of r.data.attributes.uploadOperations) {
      const headers = Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value]));
      const up = await fetch(op.url, { method: op.method, headers, body: buf.subarray(op.offset, op.offset + op.length) });
      if (!up.ok) throw new Error(`스크린샷 업로드 실패 ${f}: ${up.status}`);
    }
    await api("PATCH", `/v1/appScreenshots/${r.data.id}`, { data: { type: "appScreenshots", id: r.data.id, attributes: { uploaded: true, sourceFileChecksum: crypto.createHash("md5").update(buf).digest("hex") } } });
  }
  note(app, `스크린샷 ${files.length}장 업로드 (${path.basename(dir)})`);
  return files.length;
}

// ── 앱 하나 처리 ───────────────────────────────────────────
async function runApp(name, cfg) {
  const r = { app: name, bundle: cfg.bundle, errors: [] };
  const step = async (label, fn) => { try { return await fn(); } catch (e) { r.errors.push(`${label}: ${e.message}`); note(name, `✗ ${label}: ${e.message}`); return null; } };
  const app = await findApp(cfg.bundle);
  r.appId = app.id; r.name = app.attributes.name; r.primaryLocale = app.attributes.primaryLocale;
  r.builds = await step("빌드 목록", () => builds(app.id)) || [];
  const latest = r.builds.find((b) => b.state === "VALID" && !b.expired) || null;
  r.latestValidBuild = latest;
  let { all, editable } = await editableVersion(app.id);
  r.versions = all;

  if (cmd === "sync" || cmd === "submit") {
    const info = await step("앱 정보", () => appInfo(app.id));
    if (info) {
      await step("앱 정보 현지화", async () => {
        for (const [loc, t] of Object.entries(cfg.locales)) {
          await upsertLocalized("appInfoLocalizations", "appInfo", info.id, `/v1/appInfos/${info.id}/appInfoLocalizations`, loc, { name: t.name, subtitle: t.subtitle, privacyPolicyUrl: t.privacyUrl }, name);
        }
      });
      await step("카테고리", async () => {
        const rel = { primaryCategory: { data: { type: "appCategories", id: cfg.category } } };
        if (cfg.category2) rel.secondaryCategory = { data: { type: "appCategories", id: cfg.category2 } };
        await api("PATCH", `/v1/appInfos/${info.id}`, { data: { type: "appInfos", id: info.id, relationships: rel } });
      });
      r.ageRating = await step("연령 등급", () => ageRating(info.id, cfg, name));
    }
    await step("콘텐츠 권리", async () => {
      if (app.attributes.contentRightsDeclaration !== cfg.contentRights)
        await api("PATCH", `/v1/apps/${app.id}`, { data: { type: "apps", id: app.id, attributes: { contentRightsDeclaration: cfg.contentRights } } });
    });
    r.price = await step("가격", () => freePrice(app.id, name));
    r.availability = await step("판매 국가", () => availability(app.id, cfg, name));

    if (!editable) {
      if (latest && !all.some((v) => v.version === latest.version)) {
        editable = (await step("버전 만들기", () => api("POST", "/v1/appStoreVersions", { data: { type: "appStoreVersions", attributes: { platform: "IOS", versionString: latest.version }, relationships: { app: { data: { type: "apps", id: app.id } } } } })))?.data || null;
      } else note(name, "편집 가능한 버전 없음 (심사 중이거나 출시됨)");
    }
    if (editable) {
      const vId = editable.id;
      // 버전 번호를 최신 빌드에 맞춤
      if (latest && editable.attributes?.versionString !== latest.version) {
        await step("버전 번호", () => api("PATCH", `/v1/appStoreVersions/${vId}`, { data: { type: "appStoreVersions", id: vId, attributes: { versionString: latest.version } } }));
      }
      await step("버전 정보", () => api("PATCH", `/v1/appStoreVersions/${vId}`, { data: { type: "appStoreVersions", id: vId, attributes: { copyright: cfg.copyright, releaseType: "AFTER_APPROVAL" } } }));
      for (const [loc, t] of Object.entries(cfg.locales)) {
        const locId = await step(`설명 ${loc}`, () => upsertLocalized("appStoreVersionLocalizations", "appStoreVersion", vId, `/v1/appStoreVersions/${vId}/appStoreVersionLocalizations`, loc,
          { description: t.description, keywords: t.keywords, promotionalText: t.promo, supportUrl: t.supportUrl, marketingUrl: t.marketingUrl }, name));
        if (locId && cfg.screenshots) await step(`스크린샷 ${loc}`, () => screenshots(locId, path.join(ROOT, cfg.screenshots), name));
      }
      await step("심사 정보", () => reviewDetail(vId, cfg, name));
      if (latest) {
        await step("빌드 연결", async () => {
          const cur = await get(`/v1/appStoreVersions/${vId}/relationships/build`);
          if (cur.data?.id !== latest.id) { await api("PATCH", `/v1/appStoreVersions/${vId}/relationships/build`, { data: { type: "builds", id: latest.id } }); note(name, `빌드 ${latest.version} (${latest.build}) 연결`); }
        });
      } else r.errors.push("처리 완료된(VALID) 빌드가 아직 없음");
    }
  }

  if (cmd === "submit" && editable && cfg.submit === true) {
    await step("심사 제출", async () => {
      const subs = await getAll(`/v1/reviewSubmissions?filter[app]=${app.id}&filter[platform]=IOS`);
      let sub = subs.find((s) => s.attributes.state === "READY_FOR_REVIEW");
      if (subs.some((s) => ["WAITING_FOR_REVIEW", "IN_REVIEW"].includes(s.attributes.state))) { note(name, "이미 심사 대기/진행 중"); return; }
      if (!sub) sub = (await api("POST", "/v1/reviewSubmissions", { data: { type: "reviewSubmissions", attributes: { platform: "IOS" }, relationships: { app: { data: { type: "apps", id: app.id } } } } })).data;
      const items = await getAll(`/v1/reviewSubmissions/${sub.id}/items`);
      if (!items.length) await api("POST", "/v1/reviewSubmissionItems", { data: { type: "reviewSubmissionItems", relationships: { reviewSubmission: { data: { type: "reviewSubmissions", id: sub.id } }, appStoreVersion: { data: { type: "appStoreVersions", id: editable.id } } } } });
      await api("PATCH", `/v1/reviewSubmissions/${sub.id}`, { data: { type: "reviewSubmissions", id: sub.id, attributes: { submitted: true } } });
      note(name, "심사 제출 완료");
    });
  }

  // 최종 상태 다시 읽기
  r.versions = (await editableVersion(app.id)).all;
  r.reviewSubmissions = (await getAll(`/v1/reviewSubmissions?filter[app]=${app.id}&filter[platform]=IOS`).catch(() => [])).map((s) => ({ state: s.attributes.state, submitted: s.attributes.submittedDate }));
  return r;
}

const apps = fs.readdirSync(CFG_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))
  .filter((a) => !only || only.split(",").includes(a));
const result = { at: new Date().toISOString(), cmd, apps: [] };
for (const a of apps) {
  const cfg = JSON.parse(fs.readFileSync(path.join(CFG_DIR, `${a}.json`), "utf8"));
  try { result.apps.push(await runApp(a, cfg)); }
  catch (e) { result.apps.push({ app: a, errors: [e.message] }); note(a, `✗ ${e.message}`); }
}
result.log = log;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.apps.map((x) => ({ app: x.app, versions: x.versions, build: x.latestValidBuild, errors: x.errors })), null, 2));
