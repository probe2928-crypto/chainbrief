// 새 속보 파일 만들기
// 사용법: npm run new -- "속보 제목" 카테고리 [중요]
// 예:     npm run new -- "비트코인 7만 달러 돌파" 비트코인 중요
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [title, category = "비트코인", imp] = process.argv.slice(2);
if (!title) { console.log('사용법: npm run new -- "속보 제목" 카테고리 [중요]'); process.exit(1); }

const now = new Date(Date.now() + 9 * 3600e3); // KST
const pad = (n) => String(n).padStart(2, "0");
const ymd = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
const hm = `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
const iso = `${ymd}T${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:00+09:00`;
const file = path.join(ROOT, "content/flash", `${ymd}-${hm}-${Date.now().toString(36).slice(-4)}.md`);

fs.writeFileSync(file, `---\ntitle: ${title}\ntime: ${iso}\ncategory: ${category}\nimportant: ${imp === "중요" || imp === "true"}\n---\n여기에 2~3문장으로 핵심 내용을 적어주세요.\n`);
console.log("만들었어요:", path.relative(ROOT, file));
