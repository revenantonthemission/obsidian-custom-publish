<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-20T15:07:24Z — 이 단계는 AWS 프로비저닝이 아니라 검증 전용으로 수행했습니다. 네 단위의 인프라 명세가 "이 단위는 인프라를 추가하지 않는다 / VPC·서브넷·보안 그룹·시크릿 관리자 없음"을 명시하므로, 단계 템플릿의 AWS 네 항목을 환경의 동등물(오리진 바인딩, 터널 인입, 비밀 파일, 경계 경로)로 대응시켜 검증했습니다. 새 리소스는 만들지 않았습니다.
- 2026-11-20T15:07:24Z — Q1의 LAN 노출은 U3 명세가 "U3는 바꾸지 않고 유지관리자에게 남긴다"로 넘긴 지점의 확정이라, 명세가 지목한 결정 지점을 채운 것으로 기록했습니다. 그래서 "명세와 일치"가 아니라 "조치 완료"로 남겼습니다.
- 2026-11-20T15:07:24Z — 단계의 "단계 3: AWS 환경 프로비저닝"은 실행하지 않았습니다. 클라우드 자원이 없고 IaC도 없다는 것이 네 단위 명세와 `cd-config.md` §9가 이미 합의한 사실이므로, 이 단계의 산출물은 "무엇을 만들지 않는지"를 포함해 환경의 목록과 검증으로 정했습니다.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-20T15:07:24Z — 단계 템플릿이 말하는 "보안 자세 검증은 DevSecOps 에이전트가 수행"을 따르지 않았습니다. 이번 지시에 지원 에이전트가 없고 협업 모드가 꺼져 있어 플랫폼 엔지니어가 인라인으로 검증했고, 그 사실을 검증 보고서 §4의 인용문으로 남겼습니다.
- 2026-11-20T15:07:24Z — `launchctl kickstart -k`만으로는 plist 변경이 반영되지 않아, `bootout` 후 `bootstrap`으로 잡을 다시 등록했습니다. 첫 재시작의 PID 38839이 여전히 `*:8080`으로 리스닝한 것으로 확인했고, 이 절차는 `validation-report.md` §8의 되돌리기 절차에도 함께 적었습니다.
- 2026-11-20T15:07:24Z — Jenkins 기동에 `brew services start`를 쓰지 않고 `launchctl bootstrap`을 썼습니다. 프로젝트 규칙이 금지하는 명령이라 plist 재작성 없이 기존 정의를 그대로 로드하는 경로만 사용했습니다. 부팅 시 자동 시작도 `RunAtLoad`/`KeepAlive`로 유지됩니다.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-20T15:07:24Z — LAN 노출 폐쇄를 문서화만으로 두지 않고 plist 변경과 재적재로 반영했습니다. 유지관리자가 닫기로 한 항목이라 변경·재측정·되돌리기 절차까지 남기는 편이 운영상 정확하다고 판단했습니다. LAN에서 다른 기기로 미리 보던 용도가 사라지는 비용은 유지관리자가 선택한 것입니다.
- 2026-11-20T15:07:24Z — `Areas/Pages`는 비어 있는 상태로 만들었습니다. 입력 경계는 `Areas/Notes`와 `Areas/Pages` 두 폴더로 고정되어 있고(프로젝트 규칙), 빈 폴더는 전처리의 "없음" 알림 경로를 "0 site pages" 집계로 바꿀 뿐 파일을 만들지 않습니다.
- 2026-11-20T15:07:24Z — `typst`와 `chrome-headless-shell`의 미설치는 이번 단계에서 설치하지 않았습니다. 현재 볼트에 typst 블록이 0개라 영향이 없고, 도구 추가는 저장소 밖의 머신 상태를 더 넓게 바꾸므로 유지관리자의 결정으로 남겼습니다(검증 보고서 §5 F-05·F-06).

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-20T15:07:24Z — `origin/develop`이 `db7ecae`라 이 작업 전체가 아직 어떤 배포에도 실리지 않았습니다. push가 곧 릴리스이므로 첫 U3 배포의 시점은 유지관리자의 결정이며, deployment-execution 단계가 다룹니다.
- 2026-11-20T15:07:24Z — launchd plist 두 개(`dev.rvnnt.blog`, `homebrew.mxcl.jenkins`)는 저장소 밖에 있어 버전 관리 대상이 아닙니다. 이번에 바꾼 `HOST` 한 줄이 git 이력에 남지 않으므로 `environment-inventory.md` §4와 `validation-report.md` §8이 유일한 기록입니다. 저장소에 두 plist를 복사해 둘지는 별도 결정입니다.
- 2026-11-20T15:07:24Z — `typst` CLI와 `chrome-headless-shell`이 없습니다. typst 블록이 추가되거나 야간 부하에서 mmdc가 느려지면 전처리·빌드가 걸릴 수 있어, 설치 여부를 다음 실행 전에 정해야 합니다.
