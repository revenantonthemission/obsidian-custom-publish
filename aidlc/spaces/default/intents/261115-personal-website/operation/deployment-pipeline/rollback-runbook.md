# 롤백 런북 — `261115-personal-website`

- **단계**: Deployment Pipeline (`deployment-pipeline`), 2026-11-20
- **목표 시간**: **2시간 이내** — 회귀를 발견한 뒤 "다시 정상이어야 하는" 시점 (`deployment-pipeline-questions.md` Q6, 답 B)
- **질문과 답**: `deployment-pipeline-questions.md` Q4 (롤백 절차), Q6 (목표 시간)
- **상위 산출물**: `construction/ci-pipeline/ci-config.md`(`ci-config`), `construction/ci-pipeline/quality-gates.md`(`quality-gates`), 네 단위의 `construction/*/infrastructure-design/infrastructure-specification.md`(`infrastructure-specification`), `construction/*/infrastructure-design/cicd-pipeline.md`(`cicd-pipeline`)
- **같은 단계의 다른 산출물**: `cd-config.md`(파이프라인 구성·헬스 체크), `deployment-strategy.md`(전략)

## 1. 롤백의 정의

| 항목 | 내용 |
|---|---|
| 무엇을 되돌리는가 | `develop`의 커밋을 되돌립니다(소스 되돌림) |
| 무엇이 산출물인가 | 되돌린 소스에서 다시 만든 `site/dist/` 트리 |
| 이전 빌드 복원인가 | **아닙니다.** 릴리스에 태그가 없고 이전 빌드를 보존하지 않으므로(`team.md` `## Deployment`) 롤백은 항상 재빌드입니다 |
| 산출물 저장소에서 되돌리는가 | **아닙니다.** 산출물 저장소가 없습니다(`ci-config.md` §5) |
| 경로 | Jenkins 수동 실행(`RUN_DEPLOY` 체크) 또는 로컬 체크아웃에서 `just deploy` |
| 볼트가 되돌려지는가 | **아닙니다.** 전처리가 볼트에 남긴 `published` 날짜는 롤백으로 되돌아가지 않습니다. 볼트 자체를 손댄 것은 오직 야간 전처리기의 스탬핑뿐입니다(`cicd-pipeline.md`(U1) §4) |
| 목표 시간 | 2시간 이내. 야간 작업 대기는 이 목표를 채우지 못하므로 채택하지 않았습니다(Q6) |

## 2. 롤백 트리거

| # | 상황 | 심각도 | 근거 |
|---|---|---|---|
| T1 | 배포 후 `/` 또는 글 하나가 HTTP 200이 아님 | P1 | `monitoring-design.md` §"Post-deploy reachability failure", `team.md` `## Deployment` |
| T2 | 배포 후 `/tags` 가 301이 아니거나, `Location` 이 가리키는 대상이 200이 아님 | P2 | `monitoring-design.md` §"Legacy-address redirect mismatch", `cicd-pipeline.md`(U3) §"Manual release check" |
| T3 | 첫 병합 후 첫 야간 실행이 빨간색 | 중단 기준 | `cicd-pipeline.md`(U1) §4 |
| T4 | 요약의 글 수가 그날 추가·삭제한 수보다 많이 어긋남 | 중단 기준 | `cicd-pipeline.md`(U1) §4, `monitoring-design.md` |
| T5 | U2를 되돌려야 하는데 U3·U4가 병합된 상태 | 순서 제약 | `cicd-pipeline.md`(U2) §"Ordering constraint", U2 코드 생성 요약 |
| T6 | 되돌린 빌드가 이전 페이지 트리를 남김(링크 404) | 링크 무결성 | `just crossunit`의 링크 스윕이 잡아내는 종류의 문제. §4의 사전 검증이 막습니다 |

**롤백이 필요 없는 경우**: Verify나 Build Site 단계의 실패. 그 경우 배포는 일어나지 않았고 이전 빌드가 계속 살아 있습니다. property 카운터예시는 아카이브됩니다(`Jenkinsfile:68-74`).

## 3. 결정 권한과 에스컬레이션

- 저장소의 유일한 소유자가 결정합니다(`team.md` `## Way of Working` — "One maintainer owns the repository").
- **소유자 1인 구조이므로 외부 에스컬레이션 경로는 없습니다.** 목표 2시간이 위험해질 수 있다고 판단되는 순간(§4의 시간 예산이 40분의 여유를 잃는 순간)에는 결정을 미루지 말고 즉시 수동 배포 경로로 들어갑니다. 야간 대기는 목표를 충족하지 못합니다.
- 사고 분류·전파·사후 분석은 `incident-response` 단계(4.5)의 런북이 다룹니다. 이 런북은 site's 배포 되돌림만 다룹니다.

## 4. 절차

### 단계 0 — 준비 (판단 5분)

- [ ] 지금 무엇이 잘못됐는지 한 문장으로 적습니다(어떤 주소, 어떤 상태, 언제부터).
- [ ] 그 증명이 **배포 이후**에 생긴 것인지, **이번 빌드**에서 생긴 것인지 갈라줍니다. 빌드 이전에 있던 문제라면 롤백 대상이 아닙니다(§7).
- [ ] 되돌릴 대상 커밋을 가리킵니다. 최근 병합 커밋부터 역순으로 봅니다.
- [ ] 이 문서의 §5 표에서 해당 단위의 부작용을 확인합니다.

### 단계 1 — 되돌리기 (목표 5분)

```sh
git -C ~/Projects/obsidian-blog switch develop
git -C ~/Projects/obsidian-blog revert -m 1 --no-edit <병합 커밋 SHA>
git -C ~/Projects/obsidian-blog push origin develop
```

- 병합 커밋은 `-m 1`이 필요합니다(저장소의 병합은 `--no-ff`로 만들어졌습니다).
- **push가 곧 릴리스입니다.** 되돌리기 push와 동시에 야간 작업이 이 커밋을 배포할 수 있습니다. 배포를 멈추고 싶다면 Jenkins에서 `RUN_DEPLOY`를 체크 해제하고 수동 실행으로 처리합니다.
- 되돌린 것이 U2라면 **U3·U4도 함께 되돌립니다**(T5). 순서를 지키지 않으면 U3·U4의 링크가 깨집니다.
- 커밋 메시지는 `<type>: <한국어 서술형 …합니다>` 규칙을 따릅니다.

### 단계 2 — 사전 검증 (목표 30분, 생략 불가)

**배포 전에** 로컬 게이트를 돌립니다. Jenkins Verify는 Rust·단위·속성 스위트만 돌리고 링크 스윕은 돌리지 않으므로, 이 단계가 T6을 막는 유일한 지점입니다.

```
(cd preprocessor && cargo fmt --check && cargo test --release) && just preprocess && (cd site && npm run test:unit && npm run test:pbt && npm run format:check && npx astro check && npx playwright test --config playwright.hig.config.ts) && just crossunit
```

- 이 명령은 `aidlc-state.md`의 **Construction Verification Command**과 같고, Build and Test 5차 실행에서 통과한 명령입니다(`quality-gates.md` §3).
- **`just crossunit`가 특히 중요합니다.** U2를 되돌리는 경우(U2의 리뷰 R-01) 이 스윕이 깨진 링크를 잡습니다. 이 스윕은 Jenkins에 없으므로 로컬에서만 돌 수 있습니다.
- 전처리기는 볼트 전체가 아니라 `Areas/Notes`와 `Areas/Pages`만 읽습니다(프로젝트 규칙). `just preprocess`의 기본값은 fixture 쌍입니다.

### 단계 3 — 재배포 (목표 20분)

**경로 A — Jenkins 수동 실행 (권장)**

1. Jenkins 화면을 엽니다: `http://127.0.0.1:8081`.
2. `obsidian-blog-develop`를 실행하고 `RUN_DEPLOY`를 **체크한 상태**로 둡니다.
3. Verify → Preprocess → Build Site → Deploy가 모두 초록인지 확인합니다. Deploy 단계는 `bash site/scripts/publish-dist.sh site/dist "${WEB_ROOT}"`입니다(`Jenkinsfile:116`).

- **Jenkins를 `brew services start jenkins` 로 시작하지 않습니다.** 프로젝트 규칙이며, 이 명령은 포트 8080을 블로그에서 가져가 127.0.0.1:8080을 차지합니다.
- Jenkins가 이미 떠 있으면 그대로 쓰면 됩니다.

**경로 B — 로컬 배포**

```sh
just deploy
```

- 로컬 체크아웃이 **되돌린 커밋의 `develop`**이어야 합니다(`team.md` `## Deployment` — "run by hand only from `develop`, and only with the maintainer's go-ahead").
- `just deploy`는 야간 작업과 같은 전처리(볼트 날짜 스탬핑 포함)·빌드·복사를 수행하고, `site/scripts/publish-dist.sh`를 호출하므로 배포 정의가 둘로 갈라지지 않습니다.
- `VAULT_PATH`·`PAGES_PATH`는 `Areas/Notes`·`Areas/Pages`를 가리켜야 합니다.

### 단계 4 — 서버 재시작 (조건부)

되돌린 변경이 서버 스크립트(`site/scripts/local-server.mjs`, `site/scripts/redirect-table.mjs`)를 건드렸을 때만 필요합니다. 실행 중인 프로세스는 시작한 시점의 코드를 계속 씁니다.

```sh
git -C ~/Projects/obsidian-blog switch develop && git -C ~/Projects/obsidian-blog pull
launchctl kickstart -k gui/$(id -u)/dev.rvnnt.blog
```

**전제조건** (실측: 2026-11-20 13:14 KST)

| 전제 | 실측 | 판정 |
|---|---|---|
| 작업 복사본이 되돌린 커밋 이후의 `develop`에 있어야 한다 | 작업 복사본은 `develop`의 `d9a52d6` | 충족 (단계 3에서 pull 후 재확인) |
| 두 서버 스크립트가 해당 커밋과 달라지지 않았어야 한다 | 두 파일 모두 커밋된 상태 | 충족 |
| 재시작이 아직 일어나지 않았어야 한다 | 실행 중 프로세스 PID 2488, 시작 2026-11-17 00:53 — U3의 서버 코드 커밋 `b147d7b`(2026-11-20 10:12) 이전 | **재시작 필요** |

- 재시작 직후에도 예전 페이지가 200을 답하는 구간이 있습니다(테이블이 아직 없으므로). 이 구간에서는 깨지는 주소가 없습니다.
- 테이블은 수정 시간 변화로 서버가 다시 읽으므로, 배포 뒤에는 추가 재시작이 필요 없습니다.
- **주의**: 재시작을 안 하고 U3의 이동 페이지를 처음 싣으면, 배포가 예전 페이지 트리를 지운 뒤 구주소가 404를 답합니다(`infrastructure-specification.md` §Restart policy).

### 단계 5 — 배포 후 확인 (목표 5분)

| # | 확인 | 기준 |
|---|---|---|
| H1 | `http://127.0.0.1:8080/` | HTTP 200 |
| H2 | 글 하나 | HTTP 200 |
| H3 | `http://127.0.0.1:8080/tags` | 301 + `Cache-Control: no-cache`, `Location` 의 대상 200 |

- H3는 U3의 이동 페이지가 배포된 이후, 그리고 그 이전 주소가 리디렉션으로 답하는 모든 상태에서 확인합니다.
- 확인이 실패하면 롤백을 **한 단계 더** 되돌립니다(§2의 트리거 표). 되돌릴 것이 없으면(`develop`의 첫 릴리스 이전 상태) §7의 수동 복구 절차를 따릅니다.

### 단계 6 — 완료 판정과 기록 (목표 10분)

- [ ] H1·H2·H3가 모두 통과했습니다.
- [ ] 되돌린 커밋이 `develop`에 있고, 로컬 작업 복사본도 그 커밋과 일치합니다.
- [ ] 서버 스크립트를 건드렸다면 서비스가 새 커밋의 코드로 재시작된 상태입니다(`ps`의 시작 시각이 되돌린 커밋 이후인지 확인).
- [ ] `just crossunit`가 링크 스윕에서 통과했습니다(T5의 경우 필수).
- [ ] 무엇이 왜 나빴고 무엇을 되돌렸는지를 이 워크플로의 기록(`aidlc/` 레코드)과 커밋 메시지에 남깁니다.

## 5. 단위별 되돌림의 부작용

| 되돌리는 대상 | 부작용 | 처리 |
|---|---|---|
| U1 (`u1-publish-boundary`) | 예전 전처리 산출물 레이아웃이 돌아오고, `Areas/Pages`를 읽지 않습니다. `Areas/Pages` 폴더는 그대로 두어도 됩니다(구버전 바이너리는 무시합니다) | 볼트는 건드리지 않습니다. 자산 교체형 복사는 별도 커밋 `86ac5cc`으로 들어갔으므로 U1 병합만 되돌려도 교체 방식이 남습니다. **만약 그 커밋까지 함께 되돌린다면**, Jenkins 작업 공간의 `site/public/assets/pages/`와 `content/pages/`를 먼저 지워야 철회된 페이지 이미지가 계속 배포되지 않습니다(U1 인프라 리뷰 R-10) |
| U2 (`u2-writing-section`) | `/writing`, `/writing/all`이 사라지고, 홈페이지의 "모든 글 보기" 대상도 함께 사라집니다 | U1의 임시 목록이 되돌려진 상태로 돌아옵니다. **U3·U4도 함께 되돌리고**, push 전에 `just crossunit`을 실행합니다(T5) |
| U3 (`u3-writing-moves`) | 태그 인덱스·태그 페이지·그래프가 예전 위치로 돌아오고, 리디렉션 테이블이 사라집니다(배포 정의가 함께 되돌려집니다) | 서버 스크립트를 되돌렸다면 §4 단계 4의 재시작이 필요합니다. 예전 주소는 200으로 돌아오고, 301을 이미 받아 브라우저에 저장된 방문자는 `Cache-Control: no-cache` 덕분에 다음 방문에 다시 확인합니다 |
| U4 (`u4-navigation`) | 내비게이션 변경이 사라지고, 이전 트리 전체가 교체됩니다(`rsync --delete`이므로 부분 상태가 남지 않습니다) | 서버 스크립트를 건드리지 않았다면 재시작이 필요 없습니다 |

## 6. 시간 예산 (목표)

| 단계 | 목표 | 비고 |
|---|---|---|
| 진단 | 10분 | 목표 예산 |
| 되돌리기 + push | 5분 | 목표 예산 |
| 사전 검증(로컬 게이트) | 30분 | 목표 예산 |
| 재빌드 + 재배포 | 20분 | 야간 작업 약 10분이라는 기록된 추정치를 기준으로 잡은 목표 |
| 배포 후 확인 | 5분 | 목표 예산 |
| 기록 | 10분 | 목표 예산 |
| **합계** | **80분** | 2시간(120분) 목표 대비 40분 여유 |

이 표는 **목표이지 실측이 아닙니다.** 유일한 실측 기준은 야간 작업이 약 10분이라는 기록된 추정치입니다(`ci-config.md` §9). 실측이 모이는 단계가 생기면 다음 갱신 때 이 표를 실제 값으로 바꿉니다.

## 7. 롤백으로 고칠 수 없는 것

| 상황 | 왜 | 대신 할 수 있는 것 |
|---|---|---|
| 볼트의 `published` 날짜가 잘못 찍힌 경우 | 롤백은 소스만 되돌리고 볼트는 건드리지 않습니다 | 볼트 파일을 직접 고칩니다(앞으로의 배포는 야간 전처리가 다시 스탬핑합니다) |
| 배포 이전부터 있던 문제 | 되돌려도 같은 상태로 돌아옵니다 | 문제의 성격에 따라 별도 수정(다음 릴리스에 포함) |
| 브라우저가 이미 받아 둔 301 | 301은 `Cache-Control: no-cache`를 동반하므로 브라우저는 다음 방문에 재검증합니다. 다만 그 사이에 방문자가 새 주소(404)를 한 번 볼 수 있습니다 | 없음(설계상 허용된 잔여) |
| 이전 빌드 산출물 | 보존하지 않습니다 | 없음. 재빌드가 유일한 경로입니다 |
| Jenkins 작업 공간의 잔여물 | 작업 공간은 실행 사이에 유지됩니다 | 작업 공간을 정리한 뒤 수동 실행합니다(§5 U1 행) |

## 8. 검증 체크리스트 (완료 판정용)

- [ ] 되돌린 커밋이 `develop`에 있고 로컬 작업 복사본과 일치한다
- [ ] `git log -1`가 되돌린 커밋을 가리킨다
- [ ] 로컬 게이트(§4 단계 2)가 전부 통과했다 — 특히 `just crossunit`
- [ ] Jenkins Deploy 또는 `just deploy`가 완료되었고 `post` 블록이 성공 메시지를 냈다
- [ ] H1·H2·H3가 모두 통과했다
- [ ] (해당 시) `dev.rvnnt.blog`가 되돌린 커밋의 코드로 재시작되었다
- [ ] (U2 되돌림 시) U3·U4도 함께 되돌려졌다
- [ ] 무엇을 왜 되돌렸는지가 기록에 남았다
