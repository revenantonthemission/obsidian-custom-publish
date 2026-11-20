# 배포 실행 로그 — `261115-personal-website`

- **단계**: Deployment Execution (`deployment-execution`), 2026-11-21 01:27–01:28 KST
- **역할**: 릴리스 엔지니어 (aidlc-pipeline-deploy-agent)
- **질문과 답**: `deployment-execution-questions.md` Q1 A(지금 `just deploy`), Q2 A(`test:e2e` 격차 수용), Q3 A(검증은 배포 경로의 Verify에 맡김)
- **상위 산출물**: `operation/deployment-pipeline/cd-config.md`(`cd-config`), `deployment-strategy.md`(`deployment-strategy`), `operation/environment-provisioning/environment-inventory.md`(`environment-inventory`), `construction/build-and-test/test-results.md`(`build-test-results`), `operation/deployment-pipeline/rollback-runbook.md`
- **배포 소스**: 로컬 `develop` @ `d5a6e86` (네 단위 병합 커밋 `5cecf58`과 빌드·테스트 마감 병합 `dfaf5a2` 포함). `origin/develop`은 `db7ecae` — **push하지 않았습니다**

## 1. 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 배포 경로 | 로컬 `just deploy` (Q1 A) | 유지관리자의 명시적 허가. 같은 `site/scripts/publish-dist.sh`를 호출하므로 야간 배포와 절차가 동일합니다(`deployment-strategy.md` §4) |
| `test:e2e` 격차 | 알려진 격차로 수용(Q2 A) | 5차 실행에 assertion 실패가 없고 Jenkins Verify 게이트에 e2e가 없습니다(`cd-config.md` §2) |
| 배포 전 재검증 | 생략(Q3 A) | 검증 명령이 `8d19fde`에서 통과했고 `dfaf5a2`로 `develop`에 병합됐습니다(`test-results.md` R5.4) |
| 고정 재시작 | 이미 완료(Environment Provisioning) | 서버 PID 40304가 U3 코드를 실행 중입니다(`environment-inventory.md` §9) |

## 2. 배포 전 상태

| 관찰 | 값 |
|---|---|
| 웹 루트 | 2026-11-07 빌드. `tags/`·`graph/` 있음, `_redirects.json` 없음 |
| 오리진 | `127.0.0.1:8080`, PID 40304(U3 코드) |
| 터널 | `dev.rvnnt.tunnel`, PID 2511, `rvnnt.dev` → `http://127.0.0.1:8080` |
| Jenkins | `127.0.0.1:8081`, PID 38904 |
| 볼트 입력 | `Areas/Notes` 존재, `Areas/Pages` 존재(빈 폴더) |

## 3. 실행한 명령

### 단계 1 — 전처리 (`Justfile:36`, `deploy-preprocess`)

```
PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  cargo run --release --manifest-path preprocessor/Cargo.toml -- \
  --stamp-published "<vault>/Areas/Notes" ./content --pages "<vault>/Areas/Pages"
cp ./content/{search-index,graph,previews,nav-tree}.json ./site/public/
node ./site/scripts/sync-public-assets.mjs ./content/assets ./site/public/assets
```

| 출력 | 값 |
|---|---|
| 스캔 | `Found 156 sources (0 site pages)` |
| 알림 | `site pages folder …/Areas/Pages is empty; publishing no site pages` |
| 스탬핑 | **`Stamped 2 posts with published date`** — 실제 볼트에 날짜가 기록됐습니다 |
| 요약 | `published 155 posts, 0 site pages, 305 assets` |
| 자산 | `sync-public-assets: …/site/public/assets now mirrors …/content/assets` (교체형 복사) |

전처리는 볼트 전체가 아니라 `Areas/Notes`와 `Areas/Pages` 두 폴더만 읽었습니다(프로젝트 규칙).

### 단계 2 — 사이트 빌드 (`Justfile:26`, `site-build`)

```
cd ./site && npx astro build
```

| 출력 | 값 |
|---|---|
| 페이지 | **260 page(s) built in 35.18 s** |
| 리디렉션 | `@astrojs/rvnnt-legacy-redirects wrote _redirects.json (**79 rules**)` |
| 프로필 | `verified private profile approval boundary` |
| 경고 | `[vite][lightningcss minify] Unknown at rule: @license` — Pretendard 라이선스 주석에 대한 비치명적 경고. 빌드는 성공 |
| 종료 | `[build] Complete!` (exit 0) |

### 단계 3 — 배포 (`Justfile:29` → `site/scripts/publish-dist.sh`)

```
bash ./site/scripts/publish-dist.sh ./site/dist "/Users/revenantonthemission/Sites/obsidian-blog"
```

`cd-config.md` §3의 두 번의 복사가 그대로 실행됐습니다.

1. `rsync -a --delete --exclude="/_redirects.json" --exclude="/.redirects.json.tmp" site/dist/ "$WEB_ROOT/"`
2. `cp site/dist/_redirects.json "$WEB_ROOT/.redirects.json.tmp"` → `mv -f` (테이블은 페이지보다 뒤에, 원자적 이름 변경)

## 4. 배포 후 상태

| 항목 | 배포 전 | 배포 후 |
|---|---|---|
| 웹 루트 수정 시각 | 2026-11-07 11:07 | 2026-11-21 01:27 |
| `_redirects.json` | 없음 | 있음(6,788 B, 79 rules) |
| `writing/` | 없음 | 있음(`tags/`, `graph/`, `index.html`, `all/`) |
| 예전 `tags/`, `graph/` | 있음 | 삭제됨(`rsync --delete`) |
| 서버 PID | 40304 | 40304(재시작 없음 — 테이블은 수정 시간 변화로 재읽음) |
| 공개 사이트 | 200(예전 트리) | 200(새 트리) |

자세한 검증 결과는 `smoke-test-results.md`와 `health-check-report.md`에 있습니다.

## 5. 실행하지 않은 것

| 항목 | 이유 |
|---|---|
| `git push origin develop` | Q1 A는 로컬 배포입니다. push는 릴리스이므로 유지관리자의 별도 결정입니다(`origin/develop`은 여전히 `db7ecae`) |
| Jenkins 수동 실행 / 야간 Verify | 로컬 배포에는 Jenkins Verify가 없습니다. `U1-NFR6.1`은 원격 커밋에 대한 Jenkins 실행까지 Unverified로 남습니다(Q3 A의 결과) |
| `npm run test:e2e` | 수동 접근성 기록 만료로 거부된 상태를 유지했습니다(Q2 A).Q3 A에 따라 다시 실행하지 않았습니다 |
| 재시작 | U3 고정 재시작은 Environment Provisioning에서 이미 완료. 테이블은 수정 시간 변화로 재읽히므로 배포 후 추가 재시작이 필요 없습니다 |
| DB 마이그레이션 | 데이터베이스가 없음(`environment-inventory.md` §10) |

## 6. 되돌리기

이전 빌드를 보존하지 않으므로(`deployment-strategy.md` §6) 되돌림은 언제나 **소스 되돌림 + 재빌드**입니다. 절차는 `rollback-runbook.md` §4(목표 2시간 이내)를 그대로 따릅니다.

- 트리거 T1(H1·H2 실패), T2(H3 실패)는 이번 배포에서 발생하지 않았습니다.
- 이번 배포는 **push하지 않았으므로** 되돌리기에서 `git revert` + `push` 단계는 아직 해당하지 않습니다. 웹 루트만 되돌리려면 `develop`에서 해당 커밋을 되돌린 뒤 `just deploy`를 다시 실행합니다.
- 전처리가 볼트에 기록한 2개의 `published` 날짜는 롤백으로 되돌아가지 않습니다(`rollback-runbook.md` §7).

## 7. 후속 항목

| 항목 | 상태 | 처리 |
|---|---|---|
| `origin/develop` = `db7ecae` | 미해결 | push = 릴리스. 유지관리자가 결정. push 뒤 Jenkins Validate/Deploy가 원격 커밋을 다룹니다 |
| `U1-NFR6.1` | Unverified | 원격 커밋에 대한 Jenkins Verify 실행이 필요합니다 |
| `TEAM-E2E-A11Y` / `npm run test:e2e` | Not Met | 16상태 수동 검토(2–4시간) 뒤 재실행 |
| `U1-SLO-NIGHTLY`, `U1-SLO-PAGECOUNT` | Unverified | 30일 운영 신호 — `observability-setup` 소유 |
| 자동 post-deploy 러너(`F1`) | 미착수 | 별도 작업. 이번 확인도 수동이었습니다 |
| 페이지 바이트 예산의 반복 측정 | 후속 | 측정 스크립트가 커밋되어 있지 않습니다 |
