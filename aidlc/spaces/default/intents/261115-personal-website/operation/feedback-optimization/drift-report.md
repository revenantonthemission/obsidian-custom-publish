# 설정 드리프트 보고 — `261115-personal-website`

- **단계**: Feedback & Optimization (`feedback-optimization`), 2026-11-21 KST
- **결정**: Q3 C — 외부 드리프트 감지 서비스 도입
- **상위 산출물**: `operation/observability-setup/{dashboards,alarms,slo-config}.md`(`dashboards`, `alarms`, `slo-config`), `operation/deployment-execution/deployment-log.md`(`deployment-log`), `operation/performance-validation/test-results.md`(`test-results`), `operation/incident-response/incident-plan.md`(`incident-plan`), `infrastructure-specification`

## 1. 현재 비교 결과

| 대상 | 명세/기대 | 실제(2026-11-21) | 판정 |
|---|---|---|---|
| 오리진 스크립트 | 작업 복사본 `develop`의 `site/scripts/local-server.mjs` | plist가 같은 경로를 가리킴. 서버 PID 40304가 U3 코드 실행 | ✅ |
| 오리진 바인딩 | `127.0.0.1:8080` (이번 단계에서 명시적 변경) | `lsof` → `127.0.0.1:8080` | ✅ |
| 웹 루트 | `site/dist/`의 미러(`_redirects.json` 포함) | 01:27 빌드, `writing/` 존재, 예전 `tags/`·`graph/` 삭제 | ✅ |
| 터널 인입 | `rvnnt.dev` → `http://127.0.0.1:8080` | 설정 파일과 일치, 공개 200 | ✅ |
| Jenkins | `127.0.0.1:8081`, plist 재작성 금지 | PID 38904, 기존 plist 그대로 | ✅ |
| 저장소 소스 | `develop` @ 현재 커밋 | `site/`·`preprocessor/` 변경 없음 | ✅ |

**발견된 드리프트**: 없음. 다만 launchd plist 두 개(`dev.rvnnt.blog`, `homebrew.mxcl.jenkins`)는 저장소 밖에 있어 git이 변경을 추적하지 못합니다. `dev.rvnnt.blog.plist`의 `HOST` 변경은 이번 단계에서 문서로만 남겼습니다.

## 2. 외부 드리프트 감지 도입안(Q3 C)

| 항목 | 내용 |
|---|---|
| 감지 대상 | launchd plist 2개, `~/.cloudflared/obsidian-blog.yml`, `~/Sites/obsidian-blog`의 파일 목록, Jenkins plist의 포트 인자 |
| 방법 | 설정 파일의 해시·핵심 값(HOST/PORT/ProgramArguments/ingress)을 주기적으로 기록하고 기준값과 비교 |
| 기준값 | 이 보고서 §1의 "명세/기대" 열 |
| 임계값 | 한 항목이라도 불일치 → P3 알림(`alarms.md`) |
| 주기 | 매일 배포 후 또는 주 1회 |
| 자격 증명 | 저장소 밖. 서비스 가입·연동은 유지관리자 작업 |
| 상태 | **설계만** — 실제 서비스는 미도입 |

## 3. 왜 git으로 충분하지 않은가

- plist는 홈 디렉터리(`~/Library/LaunchAgents/`)에 있어 버전 관리 대상이 아닙니다.
- `launchctl kickstart -k`는 디스크의 plist 변경을 읽지 않아, 변경 후 재적재(`bootout`→`bootstrap`)가 필요합니다(이번 단계에서 확인).
- 따라서 "파일 값"과 "실행 중 잡의 설정"을 모두 비교해야 합니다(§1 표는 두 층 모두 확인).

## 4. 재발 방지

| 조치 | 소유 |
|---|---|
| plist 핵심 값을 이 문서에 기준값으로 고정 | 이 단계 완료 |
| 외부 감지 서비스 연동 | 유지관리자(Q3 C) |
| 월 1회 수동 plist 검토 | 유지관리자(기존 관행) |
| 드리프트 발견 시 `runbooks.md` RB-9 및 되돌리기 절차 적용 | 유지관리자 |

## 5. 결론

현재 드리프트는 없습니다. 저장소 밖 설정의 추적 공백을 메우기 위해 외부 감지 서비스 도입안을 남겼고, 실제 연동 전에는 수동 검토가 그 역할을 합니다.
