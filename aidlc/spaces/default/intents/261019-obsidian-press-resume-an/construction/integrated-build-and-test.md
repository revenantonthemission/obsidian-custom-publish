# Integrated Build and Test — 산출물 기록

## 문서 상태

- **단계**: CONSTRUCTION — Integrated Build and Test (U1·U2·U3 병합 뒤 1회 실행, unit-of-work §1.5-6)
- **실행일**: 2026-07-30
- **대상 tree**: 병합된 `develop`(`700766c`)과 **바이트 동일** — 실행 worktree(HEAD `f138673`)와의 `git diff --stat` 공백으로 증명
- **규정**: NFR-010 (교차 pipeline → `just build`; example/PBT/Playwright smoke/최소 Jenkins 검증 기록; 배포 명령 금지), PBT-08 (로컬·Jenkins PBT + seed·반례 재현 증거)

## 1. Gate 실행 결과 — 전부 green

| Gate | 결과 | 비고 |
|---|---|---|
| `just test` | **19 suites 전부 ok** | debug, 50초 |
| `just build` (실제 Vault) | **140 posts + 1 homepage → 221 pages** | 3분 14초 (diagram 렌더 포함); §2.1 결함 수정 후 성립 |
| `just crossunit` | **7,330개 내부 참조 전부 해석** (221 pages) + no-JS smoke **8/8** | 실빌드 dist 대상 |
| `npm run test:unit` | 16 files / **195 passed** | |
| `npm run test:pbt` | 6 files / **37 passed**, seed `-656865565` | 로컬 @100 runs |
| `npx astro check` | **0 errors** / 0 warnings / 6 hints | U1 baseline 동일 |
| `npm run test:e2e` (기본) | `result: pass` | buildId `4c9ca1ed…` |
| `HOMEPAGE_TODAY_OVERRIDE=2024-03-01 test:e2e` | `result: pass` | buildId `1ef33e80…` |
| `npm run resume:pdf:verify` | pass, `surfaceParity: "pass"` | U1 provider 계약 무손상 |
| **Jenkins 최소 검증** (참조) | Verify green @ **numRuns 1,000**, seed `1804141478`, `Stage "Deploy" skipped` | [st-e04-report.md §7.1](u3-quality-gate-and-ci-integration/code/st-e04-report.md) — 재실행하지 않고 전사 참조 |

배포 명령은 사용되지 않았다. `just build`가 덮어쓴 tracked `site/public/*.json` 4종은 실행 직후 `git restore site/public/`으로 복원되었다 (확립된 처리, 비침묵 기록).

## 2. 이 단계가 적발·처리한 사실

### 2.1 Justfile vault 경로 인용 결함 (수정)

`preprocess`/`deploy-preprocess` recipe가 `{{vault}}`를 따옴표 없이 전달해 **공백 포함 실제 Vault 경로가 인자 분리**로 실패했다 (`error: unexpected argument 'Vault/Areas/Notes'`). 기본 fixture 경로(공백 없음)만 써 온 탓의 잠재 결함이며, 이 단계가 실경로로 `just build`를 처음 실행하며 드러났다. **동작 보존 수정**: 두 recipe의 `{{vault}}`에 따옴표 추가 (공백 없는 경로 동작 불변; Jenkinsfile은 binary 직접 인용 호출이라 무영향). 이 수정으로 CLAUDE.md가 문서화한 실제 `VAULT_PATH` 로컬 흐름이 비로소 성립한다.

### 2.2 PBT-08 준수 확인

- 로컬 PBT: fast-check seed `-656865565` (이 실행), proptest는 example 회귀 포함 전 suite green.
- Jenkins PBT: seed `1804141478` @ 1,000 runs (console log 전사).
- **실패 없음 → 새 shrunk counterexample 없음**: `preprocessor/tests/*.proptest-regressions`는 이 단계에서 변화 없음 (기존 커밋본 그대로 — 재현 경로 유효).

## 3. 판정

- 전 gate green — **reopen되는 story 없음** (§6: failures reopen owning stories의 발동 없음).
- **ST-E04는 이 handoff에서 마감 확정** ([st-e04-report.md §7.2](u3-quality-gate-and-ci-integration/code/st-e04-report.md)가 증거 문서).
- 남은 잔여는 기존 기록 그대로: U1 rollback-arm live evidence, Deploy skip 시 "Blog deployed successfully." 표시 결함, 배포 권한 소유 리스크 목록.
