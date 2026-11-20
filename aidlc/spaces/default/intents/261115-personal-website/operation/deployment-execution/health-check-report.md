# 헬스 체크 보고서 — `261115-personal-website`

- **단계**: Deployment Execution (`deployment-execution`), 2026-11-21 01:28 KST
- **대상**: `just deploy`로 갱신된 단일 macOS 프로덕션 환경
- **기준**: `operation/deployment-pipeline/cd-config.md`(`cd-config`) §4·§5, `deployment-strategy.md`(`deployment-strategy`) §7·§8, `operation/environment-provisioning/environment-inventory.md`(`environment-inventory`), `operation/environment-provisioning/validation-report.md`, `construction/build-and-test/test-results.md`(`build-test-results`)
- **판정**: 프로덕션 트래픽을 받을 상태입니다. 미해결 격차는 §6에 명시했습니다

## 1. 구성요소 상태

| 구성요소 | 배포 전 | 배포 후 | 판정 |
|---|---|---|---|
| 정적 서버 | PID 40304, `127.0.0.1:8080`, U3 코드 | 동일(PID 40304). 재시작 없음 | ✅ 정상 |
| 터널 | PID 2511, `rvnnt.dev` → `http://127.0.0.1:8080` | 동일 | ✅ 정상 |
| Jenkins | PID 38904, `127.0.0.1:8081` | 동일 | ✅ 정상 |
| 웹 루트 | 2026-11-07 빌드 | 2026-11-21 01:27 빌드(260 pages) | ✅ 갱신 |
| 소스 체크아웃 | `develop` @ `d5a6e86` | 동일. `site/`·`preprocessor/` 변경 없음 | ✅ 정상 |
| `origin/develop` | `db7ecae` | 동일(push 없음) | ⚠️ 아래 §6 |

## 2. HTTP 헬스 체크

| # | 확인 | 실제 값 | 기준 | 판정 |
|---|---|---|---|---|
| H1 | 로컬 `/` | 200 | 200 | ✅ |
| H2 | 로컬 글 하나 | `/posts/infrastructure-as-code` → 200 | 200 | ✅ |
| H3 | 로컬 `/tags` | 301, `Location: /writing/tags`, `Cache-Control: no-cache`, 대상 200 | 301 + 대상 200 | ✅ |
| O1 | 공개 `/` | 200 | 200 | ✅ |
| O2 | 공개 `/writing/tags` | 200 | 200 | ✅ |

상세한 응답 헤더는 `smoke-test-results.md`에 있습니다.

## 3. 빌드·전처리 건전성

| 지표 | 값 | 판정 |
|---|---|---|
| 스캔 소스 | 156 (`Areas/Notes`만, `Areas/Pages`는 빈 폴더) | ✅ 볼트 경계 준수 |
| 발행 | 155 posts, 0 site pages, 305 assets | ✅ 예상대로 |
| 날짜 스탬핑 | 2 posts에 `published` 기록 | ✅ 정상 동작(볼트에 쓰기 발생) |
| 빌드 페이지 | 260, 35.18 s | ✅ 정상 |
| 리디렉션 규칙 | 79 | ✅ 전처리 출력과 함께 배포됨 |
| 빌드 경고 | `[lightningcss minify] Unknown at rule: @license` (Pretendard 라이선스 주석) | ✅ 비치명적. 기존에도 나타날 수 있는 경고 |
| 자산 복사 | 교체형(`sync-public-assets.mjs`) + 웹 루트 두 번 복사 | ✅ `cd-config.md` §3 절차 준수 |

## 4. 보안 관점

| 항목 | 상태 |
|---|---|
| 오리진 바인딩 | `127.0.0.1:8080` — LAN 직접 경로는 Environment Provisioning에서 폐쇄됐습니다 |
| 공개 파일 | 웹 루트와 `_redirects.json`은 공개 대상. 안전은 서버의 형식 검증에 달려 있습니다(`environment-inventory.md` §7) |
| 비밀 | 새 자격 증명을 만들지 않았습니다. `publish-dist.sh`는 로컬 파일 복사만 수행 |
| 볼트 쓰기 | 전처리가 `published` 날짜 2건을 기록했습니다. 볼트 자체의 다른 내용은 바뀌지 않았습니다 |

## 5. 배포 후 상태 전이

```
[예전 트리] ──just deploy──▶ [새 트리 + 79개 리디렉션 규칙]
   /tags → 200                 /tags → 301 → /writing/tags → 200
   /graph → 200                /graph → 301 → /writing/graph → 200
   /writing/* → 404            /writing/* → 200
```

`rsync --delete`로 예전 `tags/`·`graph/` 트리는 사라졌고, 테이블이 페이지보다 뒤에 놓여 새 규칙이 대상보다 먼저 살아 있는 창은 없습니다(`cd-config.md` §3).

## 6. 미해결·격차

| # | 항목 | 상태 | 영향 |
|---|---|---|---|
| G-1 | `origin/develop` = `db7ecae` (이 작업 미push) | 유지관리자의 결정 | 이번 변경은 로컬 배포로만 실렸습니다. 다음 야간 Jenkins는 예전 커밋을 배포합니다 |
| G-2 | `U1-NFR6.1` (Jenkins Verify on merge commit) | Unverified | Q3 A에 따라 로컬 재검증을 생략했고 `just deploy`는 Verify를 돌리지 않습니다. push 뒤 Jenkins 실행이 닫습니다 |
| G-3 | `TEAM-E2E-A11Y` / `npm run test:e2e` | Not Met | 수동 16상태 검토(2–4시간) 뒤 재실행. Q2 A로 수용한 격차입니다 |
| G-4 | `U1-SLO-NIGHTLY`, `U1-SLO-PAGECOUNT` | Unverified | 30일 운영 신호 필요(`observability-setup`) |
| G-5 | 자동 post-deploy 러너(`F1`) | 미착수 | 이번 H1–H3도 수동이었습니다 |
| G-6 | `typst`, `chrome-headless-shell` 미설치 | 미해결(낮음) | 볼트에 typst 블록이 0개라 이번 빌드에 영향 없음. Chrome 대체 경로로 정상 빌드 |

G-1~G-5는 배포 자체의 실패가 아니라 **남은 게이트와 운영 준비**입니다. G-2·G-3은 Q2·Q3의 결정으로 이번 배포에서 수용됐습니다.

## 7. 롤백 준비 상태

| 항목 | 상태 |
|---|---|
| 절차 | `rollback-runbook.md` §4 — 되돌리기 → 로컬 게이트 → 재배포 → 필요 시 재시작 → H1–H3, 목표 2시간 |
| 트리거 | T1(H1·H2 실패), T2(H3 실패) — 이번에는 미발생 |
| 이전 빌드 | 보존하지 않음. 되돌림은 항상 재빌드입니다(`deployment-strategy.md` §6) |
| 볼트 날짜 | 되돌림으로 복구되지 않습니다(`rollback-runbook.md` §7) |

## 8. 종합 판정

**정상 배포.** H1–H3과 공개 경로가 모두 통과했고, 구성요소·빌드·보안 관점에서 이상이 없습니다. 미해결 격차는 push와 Jenkins Verify, 수동 접근성 검토, 30일 SLO, 자동화 러너로 한정되며 각각의 소유자와 처리 경로가 기록되어 있습니다.
