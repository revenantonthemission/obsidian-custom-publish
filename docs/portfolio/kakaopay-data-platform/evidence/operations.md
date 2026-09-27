# DocSuri 추가 근거 — 운영·인프라·비용·장애 대응

작성일: 2026-09-20. 제출 원고에 사용할 사례를 고르는 편집용 근거집입니다. 기존 503 사례를 반복하기보다 배포·관측·복구·비용·실행 환경의 추가 근거를 정리했습니다.

## 조사 범위와 주장 경계

- 프로젝트 문서 21개를 대상으로 전문 또는 전문 키워드 검색 후 관련 문단을 읽었고, 구현·실험 조건을 확인하기 위해 소스 4개를 추가 확인했습니다. `AGENTS.md`는 별도 지침으로 읽었습니다. 문서별 확인 깊이는 부록에 기록했습니다.
- 그래프는 `Users-revenantonthemission-Projects-DocSuri`, 부모 조사에서 확인한 generation `2026-09-20T08:48:06Z`, fast/ready, HEAD `32a424d` 기준입니다. 재확인 시 15,863 nodes / 56,525 edges / ready였습니다. 근거 26개 경로의 coverage는 `no_recorded_issue`, freshness `metadata_match`였으며 운영·U6·reports·performance 범위 조회도 추가 누락 기록 없이 종료됐습니다. 이는 완전성 보장이 아닙니다.
- 코드 구조는 그래프를 먼저 확인했습니다. `CostGuardCircuitBreaker`의 정확한 구현과 양방향 1-depth 호출 관계를 확인했고, 비코드 문서·셸·실험 문자열은 원문을 직접 읽었습니다. 관련 결과는 `has_more=false`로 끝났습니다. 관련 범위 밖의 `elasticmq.conf` 및 `paperMeta.ts` 부분 파싱 문제, 제외된 테스트·생성물 등은 전역 인덱스 한계로 남습니다.
- 이번 작업에서 테스트·부하 실험·운영 명령·외부 서비스 확인은 새로 실행하지 않았습니다. 아래의 “성공”은 날짜가 있는 저장소 기록의 성공입니다.
- 사용자가 확인한 역할은 데이터 파이프라인·인프라입니다. 개인 기여에는 `revenantonthemission` 명의의 변경 이력을 사용하되, 커밋 작성자가 팀 전체 구현의 단독 저자라는 뜻은 아닙니다. 특히 초기 U6 운영 도메인 구현은 팀원 `ELSAPHABA`의 `1e99cf9e`(2026-06-16)이며, 후보자의 후속 통합·운영 수정과 구분합니다.
- AWS 시기와 현재 환경을 분리합니다. 7월 기록은 AWS 운영 경험이고, 8월 17일 이후 문서는 Mac 기반 로컬 운영으로 전환된 상태를 설명합니다. 과거 AWS 부하 수치·복구 결과를 현재 서비스의 수치로 쓰지 않습니다.
- [9월 18일 검증 보고서](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/build-and-test/project-verification-2026-09-18.md:5)는 미추적 작업 트리 문서입니다. 현재 데이터·보안·캐시·timeout·복구 검증 문제가 남았다는 자료이며, 이번 조사에서 재현하거나 해결하지 않았습니다.

## 원고 추가 우선순위

| 사례 | 강한 근거 | 주장 범위 |
|---|---|---|
| 대량 수집과 사용자 요청 워커 분리, 20 VU 혼합 부하 | 7월 2일 배포·k6 기록, 개인 커밋 | 과거 AWS 환경의 특정 실험 결과 |
| 코드·배포 템플릿·실제 리소스를 대조한 autoscaling drift 진단 | 7월 6일 실제 값의 불일치 기록 | 원인 진단; 전체 backlog 해소는 미입증 |
| 경보 생성에서 실제 메일 수신까지, 스냅샷 복원 확인 | 6월 18일 실행 기록 | 당시 AWS 검증; 현재 RPO/RTO는 미입증 |
| 로컬 백업의 권한 실패 대응, 외부 heartbeat | 8월 18일 개인 커밋·스크립트·런북 | dump 생성/목록 검증·양쪽 복사; 완전 복구 아님 |
| 비용 critical gate와 사용자 일별 quota | 7월 4일 수정·테스트 기록 | 제어 장치 구현; 실비 절감률 아님 |
| AWS 종료 후 어댑터 기반 실행 환경 전환 | 8월 17일 개인 커밋·현행 런북 | 런타임 교체; HA·전체 코퍼스 품질 완료 아님 |
| IAM·배포 충돌·도메인 수명주기 대응 | 날짜별 운영 기록·개인 커밋 | 확인된 개별 실패 경계의 수정 |
| 문서와 운영 현실의 불일치 추적 | 문서 감사·후속 정정 | 협업·운영 인수인계 보강 |

## O1. 대량 수집과 사용자 요청의 실행 경계를 분리하고 부하로 확인

**바로 쓸 문장**

> 대량 수집 작업과 사용자 요청에 필요한 DocModel 작업의 워커를 분리하고, API·프런트엔드의 실행 용량과 queue-age 경보를 조정했습니다. 배포에서는 기존 리소스와 설정의 차이를 확인하며 스택을 단계적으로 반영했습니다. 2026년 7월 AWS 환경의 20 VU 혼합 부하에서 반복 단일 검색어의 검색 p95는 664.9 ms였고, 전체 HTTP 요청 오류율은 0.01%로 기록됐습니다. 이 값은 해당 부하 조건의 결과로 관리하며 현재 환경의 성능이나 일반 검색 품질로 확대하지 않았습니다.

**근거와 실행 상태**

- [7월 2일 성능·워커 분리 변경](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3325): API 1 vCPU/2 GB, min 2/max 6, FE 0.5 vCPU/1 GB, min 2/max 4; bulk ingestion/reader DocModel 서비스 분리; ingestion·DocModel·summary·novelty queue-age 경보; summary Logs/PutMetricData IAM 보완. 이 단계는 로컬 검증이며 배포 완료가 아닙니다. 관련 36 tests, Ruff, diff check, CDK synth 성공 기록입니다.
- [단계별 배포](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3362): 세 스택을 먼저 배포한 뒤 Compute의 관련 없는 `RESEARCH_AGENT_ENABLED` 변경과 기존 큐 충돌 때문에 중단·확인했습니다. 기존 기능 플래그를 유지하고 기존 novelty 큐를 import하는 절차가 뒤따릅니다.
- [최종 배포 및 실험 결과](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3384): 2026-07-02 04:07:56Z, Compute 배포, amd64 API image, ECS desired/running/pending `2/2/0`; 20 VU k6에서 ready p95 `67.24 ms`, search p95 `664.9 ms`, FE p95 `58.31 ms`, **전체** `http_req_failed=0.01%`.
- [성능 작업 계획](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/plans/production-performance-hardening-code-generation-plan.md:5)과 [성능 실험 지침](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/build-and-test/performance-test-instructions.md:48).
- 개인 변경: `db31d28161c96835f0026e0cddef3a261104b8a2`(2026-07-02), `Harden production API and worker capacity`.

**실험 조건과 수치 사용 제한**

- [실험 스크립트](/Users/revenantonthemission/Projects/DocSuri/tests/performance/api_frontend_load_test.js:8)의 기본 stage는 30초 ramp-up → 20 VU 2분 유지 → 30초 ramp-down입니다. 기본 총 3분이며 환경변수로 변경 가능합니다. 저장된 결과 문단만으로 실제 실행에서 기본값을 모두 사용했는지 확정할 수 없습니다.
- [각 iteration](/Users/revenantonthemission/Projects/DocSuri/tests/performance/api_frontend_load_test.js:23)은 FE `/`와 API `/readyz`를 병렬 호출하고, 약 20% 확률로 검색을 추가한 후 1초 쉽니다. “검색이 전체 HTTP의 20%”가 아니라 **iteration의 약 20%에서 검색 요청이 추가**됩니다.
- [검색 입력](/Users/revenantonthemission/Projects/DocSuri/tests/performance/api_frontend_load_test.js:35)은 `transformer attention retrieval` 단일 문구를 반복합니다. cold/warm 및 캐시 적중 분리, 실제 총 요청 수, 검색 표본 수, 실제 실행 시간·override는 확보하지 못했습니다. 검색 status check는 `<500`이므로 검색 결과의 정확성 검증도 아닙니다.
- `0.01%`는 검색 endpoint 전용 실패율이 아니라 전역 `http_req_failed`입니다. 검색 전용 오류율로 바꾸지 않습니다.
- [변경 전 smoke](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/build-and-test/performance-test-instructions.md:74)는 FE 40요청/동시성 8, ready 80/10, search 12/3입니다. 검색 p95 `9061.0 ms`와 변경 후 `664.9 ms`는 부하 조건이 다르므로 **속도 개선 배수·개선율을 계산하지 않습니다**.
- [7월 10일 QA](/Users/revenantonthemission/Projects/DocSuri/reports/qa-user-stories-2026-07.md:64)에도 cold timeout과 warm 응답 차이가 기록됩니다. 7월 2일 결과가 모든 query·cache 상태의 지속 SLO를 입증하지 않습니다.

## O2. 큐 적체를 처리 코드가 아닌 실제 autoscaling 설정의 drift로 좁힘

**바로 쓸 문장**

> 수집 큐에 작업이 쌓였을 때 처리 로직만 의심하지 않고 큐 깊이, 워커 실행 수, autoscaling 설정을 함께 확인했습니다. 코드와 배포 템플릿은 최대 워커 1개였지만 실제 scalable target은 0으로 남아 있어, 처리 수요가 있어도 워커가 시작되지 않는 상태를 확인했습니다. 코드의 의도·배포된 템플릿·실제 리소스 상태를 구분해 원인을 좁혔습니다.

**근거·경계**

- [2026-07-06 06:51:22Z 점검](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3843): bulk queue visible `152,682`, ECS desired/running `0/0`, actual AutoScaling MaxCapacity `0`, 코드의 max `1`. 이 수치는 당시 queue snapshot이며 수집 완료 건수·현재 데이터 수가 아닙니다.
- [병목 가설 정정](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3883): 일반적인 파싱/임베딩 병목 설명을 실제 관측 값에 맞춰 정정합니다.
- [격리된 worktree의 재검증](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3894): CDK synth Max `1`/Min `0`, 배포된 CloudFormation template Max `1`, physical target Max `0`; CDK diff에는 이 설정 변경이 나타나지 않았고 관련 없는 index alias 차이도 확인했습니다. 이 점검에서는 운영 mutation을 하지 않았습니다.
- 이 사례는 **원인 진단**입니다. 152,682건 전체를 처리 완료했다거나 drift 수정 후 처리량을 얼마나 회복했다는 성과는 이 근거로 쓰지 않습니다.

## O3. 모니터링 설정에서 실제 알림 전달·복구 실행까지 확인

**바로 쓸 문장**

> 경보 리소스가 존재하는 것과 운영자에게 알림이 도착하는 것을 분리해 점검했습니다. AWS 운영 단계에서 SNS 구독과 실제 경보 메일 수신을 확인하고, RDS 스냅샷을 임시 인스턴스로 복원해 사용 가능한 상태에 도달하는지 검증했습니다. 애플리케이션의 metric namespace 설정만으로는 부족했던 IAM 권한과 연결되지 않은 Noop 관측 경로도 별도로 추적했습니다.

**근거·경계**

- [2026-06-18 운영 검증](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/aidlc-state.md:249): PR #79/#84의 운영 hardening, runbook, ALB 5xx/p95 경보, 비용 경보를 정리합니다.
- [실제 전달·복원](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/aidlc-state.md:252): Compute 배포 후 API health 200, SNS 구독 2개 confirmed, `SetAlarmState(ALARM)` 이후 실제 메일 수신; RDS snapshot을 임시 인스턴스로 복원해 `available`, DBName `docsuri`, PostgreSQL `16.13`을 확인한 뒤 테스트 인스턴스를 삭제한 기록입니다.
- [관측 사각지대](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/aidlc-state.md:253): PutMetricData namespace 및 Logs 권한/로그 그룹 보강; 환경변수만 넣으면 AccessDenied로 metric 전달이 실패할 수 있습니다. 다음 행은 일부 모듈의 NoopObs가 실제 hub와 연결되지 않았다는 남은 문제를 명시합니다.
- [런북의 recovery/alert 항목](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/operations/runbook.md:73)은 “복원 미검증”처럼 오래된 문구를 포함합니다. 더 뒤의 날짜 있는 실행 기록과 충돌하므로, 복원 사례는 6월 18일 실행 기록을 근거로 한정합니다.
- 런북의 5xx·p95·비용 임계값은 운영 목표·경보 설정이지 달성된 가용성 SLA가 아닙니다. 스냅샷이 `available`에 도달했다는 기록은 전체 애플리케이션 복구·데이터 정합성·RTO/RPO 달성을 입증하지 않습니다.
- [7월 2일 운영 dashboard 기록](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3470)은 API SLO/queue age/backlog/app failure/cost context와 로컬 lint/synth를 설명합니다. 이 항목만으로 실제 dashboard 배포·경보 전달을 추가 주장하지 않습니다.

## O4. 로컬 백업의 macOS 권한 실패와 호스트 자체 장애의 감지 경계

**바로 쓸 문장**

> 로컬 운영 전환 후에는 데이터베이스 백업 파일 생성과 보관 경로의 권한 실패를 분리했습니다. PostgreSQL 컨테이너 안에서 dump를 생성하고 목록을 검증한 뒤 로컬·iCloud 경로에 복사했습니다. macOS TCC 때문에 iCloud 목록 조회·정리가 막히는 경우에는 로컬 파일명 목록을 기준으로 만료 대상을 계산하고, 원격 삭제 실패 시 로컬 파일을 남겨 다음 실행에서 재시도하도록 했습니다. 호스트가 꺼지면 내부 모니터링도 멈추는 문제에는 외부 heartbeat와 일별 백업 ping을 추가했습니다.

**근거와 확인 수준**

- [백업 스크립트](/Users/revenantonthemission/Projects/DocSuri/ops/local/backup-db.sh:1): host `pg_dump` 버전 차이를 피하기 위해 PostgreSQL 16 컨테이너에서 실행합니다. [53행](/Users/revenantonthemission/Projects/DocSuri/ops/local/backup-db.sh:53)의 custom format dump와 `pg_restore --list`는 archive를 읽을 수 있다는 확인이지 실제 DB 복원 테스트가 아닙니다.
- [보관 경로 및 retention](/Users/revenantonthemission/Projects/DocSuri/ops/local/backup-db.sh:65): 로컬과 iCloud 복사, YYYYMMDD 파일명 기반 30일 보관; iCloud 삭제 실패는 경고하고 local copy를 남겨 재시도합니다. iCloud 디렉터리에 복사됐다는 사실만으로 클라우드 동기화·오프호스트 도착을 확정하지 않습니다.
- `af054136a1ef09a5dffe2ede16c5920d78910bae`(2026-07-23, 개인 변경)는 이전 S3/SSE 백업 단계, `e2c24b8c1c821a1030ea6ea963d59bfe7ef72392`(2026-08-18, 개인 변경)는 heartbeat·backup ping·TCC-safe retention 보완입니다. 후자 커밋 기록에는 launchd backup 실행 종료 `0`과 두 보관 경로의 dump 확인이 있습니다. 현재 재검증 결과로 쓰지 않습니다.
- [외부 모니터링 런북](/Users/revenantonthemission/Projects/DocSuri/ops/server/README.md:133): heartbeat 5분 주기/grace 5분, 백업 매일 03:30/grace 2시간; local API·local web·public BFF probe와 host-down 무응답 감지를 구분합니다.
- [heartbeat 구현](/Users/revenantonthemission/Projects/DocSuri/ops/server/heartbeat.sh:28): 각 probe 최대 3회 시도(최초 호출 + 재시도 2회), 재시도 간격 3초; API/web 5초, public 15초 timeout. [45행](/Users/revenantonthemission/Projects/DocSuri/ops/server/heartbeat.sh:45)은 ping URL이 없으면 모니터링이 blind라는 로그를 남깁니다. URL은 저장소 밖에서 공급되며, 이 조사에서는 실제 등록·메일 전달 여부를 확인하지 않았습니다.
- [남은 운영 위험](/Users/revenantonthemission/Projects/DocSuri/ops/server/README.md:177): 단일 호스트·디스크, MinIO의 별도 offsite 사본 미비, 권한 때문에 지연될 수 있는 pruning 등입니다. [9월 18일 검증](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/build-and-test/project-verification-2026-09-18.md:354)에서도 현행 환경의 restore drill·RPO/RTO·실제 경보 전달은 완료 입증이 없습니다.

## O5. 비용 상태를 실제 실행 제어에 연결하고 계측의 한계를 명시

**바로 쓸 문장**

> 비용 경고와 차단 상태가 실제 고비용 작업의 실행 제어에 일치하도록 통합 코드를 보완했습니다. critical 상태에서 evidence·novelty 작업이 도구와 모델을 호출하기 전에 중단되도록 수정하고, 사용자별 일일 quota와 비용 계측을 연결했습니다. 누적 비용 guard, 일일 quota, 사용자별 사용액 기록은 서로 다른 목적의 장치로 구분했으며, 당시 추정 모델을 실제 청구액이나 절감 성과로 제시하지 않았습니다.

**근거·개인 기여**

- 초기 [U6 코드 요약](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u6-reliability-ops/code/u6-reliability-ops-code-summary.md:4)과 [통합 제안](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u6-integration-proposal.md:3)은 팀의 운영 모듈과 후속 app-shell 통합을 구분해야 합니다. 최초 U6 구현 전체를 후보자의 단독 성과로 쓰지 않습니다.
- 개인 변경 `badaceb7`(2026-07-04): agent cost gate 및 일일 quota. `40d545d125147409b8f839bc093f740041fa30bd`(2026-07-04): cost tier의 critical 판정 수정.
- [2026-07-04 수정 기록](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3491): warning과 critical을 구분하는 `is_cost_critical`, evidence/novelty의 도구·Bedrock 호출 전 gate, 실제 cost guard 주입. backend agent tests 52개와 costguard tests 9개 성공 기록입니다.
- [7월 roadmap](/Users/revenantonthemission/Projects/DocSuri/reports/roadmap-2026-07.md:95): PR #364, 모델 호출 spend/invocation metrics, critical abstain, Redis 공유 일일 quota(evidence 30/day, novelty 5/day), fail-open 정책. Redis 장애 시 강제 제한을 보장하는 fail-closed 설계가 아닙니다.
- [현재 클래스](/Users/revenantonthemission/Projects/DocSuri/ops/src/docsuri_ops/cost_guard.py:11): 기본 cap 1,600, warning 80%, critical/degrade 95%, cap 도달 시 OPEN; `RERANK_OFF`/`LEXICAL_ONLY` 단계. 누적 값과 중복 집합은 인프로세스 상태이므로 이 클래스만으로 모든 worker/재시작을 통합한 영속 청구 집계를 주장하지 않습니다.
- [7월 24일 spend 보고서](/Users/revenantonthemission/Projects/DocSuri/reports/costguard-spend-report-2026-07.md:3)는 당시 전역 집계·휘발성 Redis counter, 사용자별 영속 이력 부재를 구분합니다. [18행](/Users/revenantonthemission/Projects/DocSuri/reports/costguard-spend-report-2026-07.md:18)의 요청당·월간 비용은 token 가정 기반 상한 계산이지 실측 비용이 아닙니다.
- 더 뒤의 [동일 날짜 roadmap U16 항목](/Users/revenantonthemission/Projects/DocSuri/reports/roadmap-2026-07.md:164)은 UserDailySpend rollup이 `97b8ba0`으로 추가됐다고 기록합니다. 따라서 “현재 영속 집계가 전혀 없다”고 단정하지 않되, 이 변화가 2~4주 실제 사용자별 비용 분포 확보나 청구액 보정을 완료했다는 뜻은 아닙니다.

### 부가 사례: 중복 이벤트의 메모리와 민감정보 처리

- 개인 변경 `eabf9519a056fd76a6f191b244863435a3fe8198`(2026-06-25)은 운영 모듈의 무제한 중복 집합을 bounded LRU로 바꾸고 redaction 키를 소문자·비영숫자 제거 기준으로 정규화했습니다. `ownerId`/`owner_id`/`OWNER-ID`, access/refresh token, API key 등을 다루면서 `tokenCount` 같은 계측 필드를 보존하고 이메일 backstop을 추가한 기록입니다. 커밋 메시지에 42 tests 및 Ruff 성공이 남아 있습니다.
- bounded LRU는 메모리 상한을 만들지만 오래된 ID가 빠진 뒤 재도착하면 다시 처리될 수 있습니다. 영구 중복 제거·exactly-once 보장으로 쓰지 않습니다. 또한 일부 키 redaction을 서비스 전체 개인정보·보안 검증 완료로 확대하지 않습니다.
- [ops README](/Users/revenantonthemission/Projects/DocSuri/ops/README.md:29)는 in-memory telemetry/local incident adapter와 실제 외부 시스템 seam을 구분하고, process-local limiter의 다중 worker 한계를 명시합니다.

## O6. AWS 종료 후 어댑터 경계를 이용해 실행 환경을 교체

**바로 쓸 문장**

> AWS 운영 종료에 맞춰 애플리케이션의 저장·큐·모델 호출 경계를 유지하면서 실행 환경을 전환했습니다. S3/SQS 사용 경로는 MinIO/ElasticMQ endpoint로, 모델 호출은 OpenAI-compatible 어댑터와 Ollama로 연결했습니다. 기존 Bedrock 경로는 보존하고 provider 설정으로 선택하도록 해 변경 범위를 통제했습니다. 공개 진입점은 프런트엔드 BFF에 한정하고 API·데이터 저장소는 loopback 경계에 두었습니다.

**근거·경계**

- 개인 변경 `f2ef0feaf3e86ec65ed9b3af6204f90b2e716936`(2026-08-17): runtime off-AWS, MinIO S3/ElasticMQ SQS, Ollama의 OpenAI-compatible API; `bge-m3` 1,024차원 embedding 및 `qwen3:8b`, provider/base/model 환경 설정; 기존 Bedrock 분기를 유지한 query/ingestion embedding 및 summary/evidence/novelty LLM 어댑터 추가. JSON 계약에 영향을 주는 think 출력 처리도 기록됩니다.
- 개인 변경 `f7251c9a`(2026-08-17): launchd·Cloudflare 기반 운영 연결.
- [현재 운영 런북](/Users/revenantonthemission/Projects/DocSuri/ops/server/README.md:3): AWS 종료 8월 17일, OrbStack·Ollama·launchd, Cloudflare tunnel은 3000의 BFF로 연결, API와 데이터 저장소는 loopback에 배치합니다.
- [프로세스 운영 제약](/Users/revenantonthemission/Projects/DocSuri/ops/server/README.md:43): process-local rate limit 때문에 uvicorn 단일 worker를 사용하며, launchAgent 및 OrbStack/Ollama의 사용자 로그인 의존성이 있습니다. 단일 호스트는 HA 구성이 아닙니다.
- [7월 roadmap의 hybrid 단계](/Users/revenantonthemission/Projects/DocSuri/reports/roadmap-2026-07.md:9)는 로컬 compute와 원격 Bedrock이 혼재하던 중간 상태입니다. 이를 8월 이후 현재 아키텍처와 합쳐 그리지 않습니다.
- 커밋의 재임베딩·alias 전환 기록만으로 전체 공개 코퍼스의 성공적 마이그레이션·검색 품질 동등성을 주장하지 않습니다. 9월 18일 보고서에는 실제 연결된 검색 데이터의 fixture 혼입과 범위 미충족이 남아 있습니다.

## O7. IAM·기존 리소스·도메인에서 생긴 배포 실패의 경계를 좁힘

**원고용 요약**

> 배포 실패를 애플리케이션 오류와 구분하고 실제 호출 주체·권한·리소스 상태를 대조했습니다. API의 자산 조회 권한은 필요한 S3 prefix 범위로 보완했으며, 기존 큐와 설정이 존재하는 환경에서는 단순 재생성보다 import·설정 보존을 적용했습니다. 운영 종료 뒤에는 더 이상 소유하지 않는 도메인의 기본값을 정리하면서 재현용 fixture와 안정적인 식별자 namespace는 보존했습니다.

**사례별 증거**

- [2026-07-01 자산 서빙 권한](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:2993): API 역할의 S3 GetObject 누락, `doc-model/*`·`assets/*` prefix에 대한 보강, Compute UPDATE_COMPLETE, API task revision 20 및 health 200 기록. 전체 bucket/admin 권한 부여 사례로 쓰지 않습니다.
- [7월 2일 기존 큐·설정 충돌](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3362): Compute를 바로 배포하지 않고 기능 플래그의 의도치 않은 변경 및 이미 존재하는 큐를 확인한 뒤 보존/import했습니다. O1의 배포 안정성 설명에 통합할 수 있습니다.
- [8월 5~6일 serverless dev 검증](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/aidlc-state.md:995): OAC의 Lambda Function URL 호출 권한 두 조건, POST payload hash 및 BFF 실제 전송 바이트의 일치를 구분해 403을 다뤘습니다. [후속 검증](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/aidlc-state.md:1010)은 JSON/binary/empty payload, dev browser login, SSE를 기록하며 `api_origin=alb` rollback 경로를 유지합니다. **dev 환경 검증**이므로 production serverless 전체 전환 완료라고 쓰지 않습니다.
- 개인 변경 `32a424d1d58204bdab8810967fadecfe317457a2`(2026-08-30): 접근 불가능해진 기존 조직 도메인 `docsuri.org`의 앱 URL·발신 기본값을 `docsuri.rvnnt.dev` 맥락으로 정리하고 AWS 런북을 과거로 표시했습니다. fixture와 AccountDeleted UUID5 namespace는 안정적인 식별을 위해 보존한 기록입니다. 현재 이메일 공급자 키 미설정 문제까지 해결됐다는 뜻은 아닙니다.

## O8. 운영 문서·검증 결과·현재 상태를 분리해 협업 비용을 줄임

**바로 쓸 문장**

> 문서의 설계값을 현재 운영값으로 오해하지 않도록 구현·배포·실측 상태를 구분해 기록했습니다. 오래된 런북·placeholder·모델 기본값과 실제 코드의 차이를 감사하고, 중복된 설정 설명은 실행 코드와 담당 문서로 연결했습니다. 변경 결과에는 테스트 범위와 남은 위험을 함께 남겨 다음 작업자가 완료된 부분과 다시 확인할 부분을 구분할 수 있게 했습니다.

**근거·경계**

- [2026-06-30 문서 감사](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/operations/code-reviews/2026-06-30/aidlc-suite-review.md:5)는 당시 265개 문서 범위이며, [51행](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/operations/code-reviews/2026-06-30/aidlc-suite-review.md:51)에 runbook 버전·index·stack, stale placeholder, 삭제된 script 참조 문제를 정리합니다.
- [operations placeholder 정정](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/operations/operations-placeholder.md:3)은 “운영 산출물 없음”이라는 문구가 이미 존재한 runbook과 충돌함을 바로잡고 기준 문서를 연결합니다.
- [2026-07-08 SSOT 감사](/Users/revenantonthemission/Projects/DocSuri/reports/aidlc-ssot-audit-2026-07.md:3)는 당시 303개 Markdown을 대상으로 했습니다. [87행](/Users/revenantonthemission/Projects/DocSuri/reports/aidlc-ssot-audit-2026-07.md:87)의 조치 원칙은 코드 pointer·문서 권한 범위를 명확히 하는 것이며, 진행 중 인프라 변경을 임의로 수정하지 않습니다. 265/303은 당시 감사 범위이고 현재 문서 수가 아닙니다.
- [당시 CI 설계](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/technical-environment.md:179)는 lint/test/schema drift/frontend build와 OIDC 기반 배포를 설명합니다. 조직·AWS 종료 이후에도 같은 CI가 현재 작동한다고 주장하지 않습니다.
- [7월 6일 delivery 기록](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3770)은 immutable commit tag와 latest image tag, 여러 ECS 서비스 안정화, health 200을 기록합니다. 배포 단위·추적 가능한 artifact를 설명하는 보조 근거입니다.
- 이 문서 감사·테스트 결과 상당수는 AI 협업 로그입니다. 기록의 존재와 개인이 모든 검토·테스트를 손으로 수행했다는 주장을 구분합니다.

## 제출 원고에서 제외하거나 반드시 한정할 주장

1. **RDS 암호화 migration 완료**: [전환 절차](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/operations/rds-encryption-migration.md:1)는 계획·런북입니다. [7월 2일 최종 기록](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3386)도 운영자 승인 write-freeze가 없어 실행하지 않았다고 명시합니다.
2. **실시간 스트리밍 경험 보유**: SQS 비동기 작업·배치 파이프라인 경험을 Kafka/Flink 기반 연속 스트림의 처리 보장과 동일시하지 않습니다.
3. **검색 13배 개선·검색 오류율 0.01%**: 서로 다른 사전/사후 부하 조건이고, 오류율은 전체 HTTP 기준입니다.
4. **현재 p95 664.9 ms 보장**: 과거 AWS의 반복 단일 검색어 실험입니다. 현재 환경과 다릅니다.
5. **완전한 백업·복구/무손실 보장**: dump list 검증, 두 디렉터리 복사, 과거 RDS available 확인을 현행 RTO/RPO·전체 복구 drill과 구분합니다.
6. **비용 절감액·절감률 달성**: guard·quota·토큰 가정은 통제·추정 근거이며 실측 청구액 차액이 아닙니다.
7. **인증·권한·관측 완성**: [9월 18일 보안·복원 평가](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/build-and-test/project-verification-2026-09-18.md:334)는 partial/fail을 포함합니다. 데이터 fixture, userdoc 소유자 검사, 캐시 및 embedding timeout 등의 알려진 문제를 닫힌 상태로 표시하지 않습니다.
8. **테스트 통과=운영 완료**: 같은 보고서의 Python 1,504/Vitest 338/WebKit 3 통과와 새 counterexample 4개 실패는 병존합니다. 이번에 재실행한 테스트 수가 아니며 일부 실제 provider test는 skip입니다.

## 부록 A. 직접 조사한 문서 목록 — 21개

`전문`은 문서 본문을 읽은 경우, `검색+발췌`는 전문 키워드 검색과 관련 문단 정독을 뜻합니다. 거대한 audit/state의 모든 문장을 수동 정독했다고 주장하지 않습니다. 전체 프로젝트 문서의 목록·분모는 [document-inventory.json](./document-inventory.json)과 [context-and-scope.md](./context-and-scope.md)을 따릅니다.

| 문서(모두 DocSuri 루트 기준) | 확인 깊이 |
|---|---|
| `ops/README.md` | 전문 |
| `ops/server/README.md` | 전문 |
| `aidlc-docs/audit.md` | 전문 키워드 검색 + 7월 운영·배포·장애 관련 문단 |
| `aidlc-docs/aidlc-state.md` | 전문 키워드 검색 + 6월 운영/8월 전환 관련 문단 |
| `aidlc-docs/technical-environment.md` | 전문 |
| `aidlc-docs/construction/u6-integration-proposal.md` | 전문 |
| `aidlc-docs/construction/u6-reliability-ops/code/u6-reliability-ops-code-summary.md` | 전문 |
| `aidlc-docs/construction/plans/u6-reliability-ops-code-generation-plan.md` | 전문 |
| `aidlc-docs/construction/plans/production-performance-hardening-code-generation-plan.md` | 전문 |
| `aidlc-docs/construction/build-and-test/performance-test-instructions.md` | 전문 |
| `aidlc-docs/construction/build-and-test/project-verification-2026-09-18.md` | 검색+발췌: 요약/실행/성능/보안/복원/잔여 위험 |
| `reports/aidlc-ssot-audit-2026-07.md` | 전문 |
| `reports/qa-user-stories-2026-07.md` | 전문 |
| `reports/roadmap-2026-07.md` | 검색+발췌: 운영/비용/전환/후속 상태 |
| `reports/runbook-docmodel-drain-344.md` | 전문 |
| `reports/costguard-spend-report-2026-07.md` | 전문 |
| `aidlc-docs/operations/operations-placeholder.md` | 전문 |
| `aidlc-docs/operations/rds-encryption-migration.md` | 전문 |
| `aidlc-docs/operations/runbook.md` | 전문 |
| `aidlc-docs/operations/code-reviews/2026-06-28/designreview-audit.md` | 전문 |
| `aidlc-docs/operations/code-reviews/2026-06-30/aidlc-suite-review.md` | 전문 |

추가 소스 4개: `ops/local/backup-db.sh`(전문), `ops/server/heartbeat.sh`(전문), `tests/performance/api_frontend_load_test.js`(전문), `ops/src/docsuri_ops/cost_guard.py`(그래프의 클래스 11~66행 및 호출 관계). 별도 지침 `AGENTS.md`를 포함하면 coverage 검증 경로는 26개입니다. 개인 기여 근거는 해당 파일들의 git log/show와 위에 명시한 커밋 메시지를 읽어 보완했습니다.

## 부록 B. 개인 변경 이력의 사용 가능한 기준점

아래는 `revenantonthemission` 작성 이력입니다. 짧은 hash는 같은 저장소 안의 식별자이며, 개별 코드·문서의 공동 작성 또는 AI 보조를 배제한다는 뜻이 아닙니다.

| 날짜 | 커밋 | 이 근거집에서의 용도 |
|---|---|---|
| 2026-06-25 | `eabf9519` | 운영 dedup의 bounded LRU·redaction 후속 hardening |
| 2026-07-02 | `db31d281` | AWS API/worker capacity·성능 검증 보강 |
| 2026-07-04 | `badaceb7` | agent cost gate·일일 quota 통합 |
| 2026-07-04 | `40d545d1` | critical tier 실행 제어 정정 |
| 2026-07-23 | `af054136` | 이전 S3 기반 DB 백업 경로 |
| 2026-08-17 | `f2ef0fea` | AWS 밖 runtime·model/storage/queue adapter 전환 |
| 2026-08-17 | `f7251c9a` | launchd·Cloudflare 운영 경로 |
| 2026-08-18 | `e2c24b8c` | 외부 heartbeat·backup ping·TCC-safe retention |
| 2026-08-30 | `32a424d1` | legacy domain 수명주기·역사적 문서 정리 |

초기 U6 구현 `1e99cf9e`(2026-06-16, `ELSAPHABA`)는 위 목록과 분리합니다. 기여 범위를 설명할 때는 “팀 운영 모듈을 통합·보완하고 이후 인프라 전환과 운영 문제를 담당”한 것으로 쓰는 편이 근거에 맞습니다.
