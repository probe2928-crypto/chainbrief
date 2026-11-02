# 제3자 스킬 기록

원본은 `git clone --depth 1`로 받은 고정 커밋에서 내용을 직접 읽어 확인한 뒤 필요한 파일만 복사했다. 설치 스크립트(npx/install.sh/postinstall)는 실행하지 않았다. 업데이트는 사람이 원본 변경분을 검토한 뒤에만.

## impeccable
- 원본: https://github.com/pbakaus/impeccable
- 커밋: `e89e3ada3e875a89ac2c5d33d11e65ebef6fe285`
- 라이선스: Apache-2.0 (LICENSE·NOTICE.md 동봉)
- 설치일: 2026-11-02
- 복사: `.claude/skills/impeccable/SKILL.md`(v4.8.0)와 `reference/*.md`·`reference/degraded/*.md` → `impeccable/`. SKILL.md 상단에 로컬 정책 블록 추가(수정 표시).
- 뺀 것: `scripts/` 전체(첫 실행 때 바이너리를 내려받는 런처, 563KB 번들 JS, concept-seed 사용 신호 전송 등 — 제3자 실행 코드), `reference/live.md`·`live-setup.md`·`generate.md`(로컬 서버·브라우저 주입·CSP 수정 필요), `hooks.md`(편집마다 자동 실행 훅 설치). 스킬은 런처 없이 'Launcher unavailable' 경로로 PRODUCT.md/DESIGN.md를 직접 읽어 동작.
