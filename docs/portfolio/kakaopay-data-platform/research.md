# 카카오페이 데이터 플랫폼 지원용 작성 근거

작성·확장일: 2026-09-20. 이 문서는 편집·검토용이며 지원 원고는 [portfolio.md](portfolio.md)입니다. 사용자 요청에 따라 DocSuri 문서 전체를 탐색해 사례를 확장했습니다. 조사 목록과 깊이는 [범위 기록](evidence/context-and-scope.md), 문서별 메타데이터는 [인벤토리](evidence/document-inventory.json)에 있습니다.

## 1. 공고에서 실제로 요구하는 것

[공고 214480](https://kakaopay.career.greetinghr.com/ko/o/214480)의 공식 HTML 본문을 확인했습니다. 검색 도구의 직접 열기는 403이었지만 공식 사이트의 HTML 조회로 본문을 확보했습니다. 다른 시기의 동일 제목 공고를 기준으로 삼지 않았습니다.

공고 상단 경력사항은 **신입**입니다. 본문에서는 실시간·배치 파이프라인 설계·운영, 분산 처리의 이해와 적용, 지연·유실·중복 장애 해결, 프로덕션 운영 경험을 요구합니다. 데이터 엔지니어링 경력 3년 이상은 **선호 역량**에 포함됩니다. 신입 표기가 운영 경험 요구를 없애는 것은 아닙니다.

| 공고의 평가 근거 | 이번 원고에 연결한 경험 | 증거의 범위와 남은 차이 |
|---|---|---|
| 실시간·배치 파이프라인 | DocSuri 비동기 수집, watermark·재구축 제어, 목적별 재처리, 블로그 배치 | 메시지 큐 기반 작업 처리 경험. 대규모 스트림 처리 엔진 운영과 동일시하지 않음 |
| 목적에 맞는 가공·결합 | 멀티소스 canonical 결합, 논문→DocModel→청크·임베딩→검색·열람 | 논문 데이터 경험. 금융 거래 정합성을 다뤘다고 표현하지 않음 |
| 파이프라인 장애 해결 | 검색 503와 백필 경쟁, 렌더링 실패가 성공으로 처리된 CI | 각각 원인·조치·검증 기록 확보 |
| 프로덕션 운영 | 2026년 7월 AWS 운영 대응 | 과거 운영 시점을 명시. 현재 환경과 구분 |
| 병목 진단 | 큐 적체, 외부 요청 제한, OpenSearch 타임아웃, 실제 확장 설정 drift | 조치 후 20 VU 기록 확보. 동일 조건 전후 비교·장기 지연 분포는 미확인 |
| 데이터 품질·알림 | canonical·철회 처리, bulk 부분 실패, 속성 테스트, 큐 알람, 렌더링 실패 전파 | 구현·테스트와 운영에서의 실효성을 구분. 최신 품질 결함도 표시 |
| 협업 | DocModel·DTO 생산자/소비자 변경, shared 계약, 한국어 문서 추적성 도구 개선 | 최초 검색·요약·공통 운영 전체 구현을 개인 성과로 합치지 않음 |

공고에는 특정 스트리밍 엔진·Hadoop·Spark·Pinot 사용이 필수 기술로 나열되어 있지 않습니다. 기술 블로그의 스택을 현재 공고의 필수 조건처럼 덧붙이지 않았습니다. 공고가 권장한 처리 규모, 담당 역할, 장애 원인·해결 과정·결과를 원고 구조로 반영했습니다.

## 2. 제공된 회사 자료를 원고에 반영한 방식

아래의 연결 방향은 공개 사례를 읽고 내린 작성 판단입니다. 각 글은 게시 당시 특정 조직의 경험이며, 현재 채용팀의 전체 구조를 보증하지 않습니다.

| 자료 | 확인한 맥락 | 원고에 반영한 판단 |
|---|---|---|
| [Data: Pinot 운영, 2025-05-13](https://tech.kakaopay.com/post/realtime-olap-with-apache-pinot/) | 실시간 OLAP의 복구, 권한, Upsert 및 자원 관리 | 도입 기술명과 함께 장애·운영 판단을 보여줌 |
| [Data: CXM, 2023-01-30](https://tech.kakaopay.com/post/bella-cmx-platform-segmentation/) | 서비스·마케팅 조직의 데이터 활용 | 산출물을 누가 어떤 목적으로 쓰는지 명시 |
| [Data: 페이프로파일, 2022-05-03](https://tech.kakaopay.com/post/pay-profile/) | 공통 형식의 프로파일·Feature와 활용 인터페이스 | 수집 이후 구조화·검색·서빙까지의 흐름 강조 |
| [BE: 마이데이터 개선, 2024-07-10](https://tech.kakaopay.com/post/mydata-platfrom-improvement/) | 조회·저장·배치 부하와 시스템 개선 | 병목 위치, 변경 이유, 관측 결과를 연결 |
| [BE: 지연이체, 2024-12-10](https://tech.kakaopay.com/post/ifkakao2024-delayed-transfer/) | 이벤트 처리의 순서·중복·동시성 | 후보자의 중복 처리 테스트를 한정된 증거로 제시 |
| [FE: 앙몬드 2편, 2024-08-27](https://tech.kakaopay.com/post/slack-angmondbot-2/) | 여러 서버에서 발생하는 중복 실행 문제 | 클라이언트 기능 나열보다 실행·운영 조건의 설명을 우선 |
| [DevRel: 개발 문화, 2024-06-05](https://tech.kakaopay.com/post/kakaopay-dr-03/) | 자발적인 개선과 공유 | 장애 대응을 런북·검증 기준으로 남긴 점 강조 |
| [코드 리뷰, 2022-10-06](https://tech.kakaopay.com/post/remote-work-code-review/) | 팀의 리뷰 목표·기준 합의 | 기술 선택 이유와 의사결정 전달 방식을 보완 대상으로 선정 |
| [송금 서비스](https://www.kakaopay.com/services/life/money_transfer/) | 친구 송금·정산·예약 송금 등 일상 금융 경험 | 서비스 신뢰의 맥락만 참고. 데이터 플랫폼 팀이 송금 원장을 직접 처리한다고 추론하지 않음 |
| [크루의 일하는 방법 재생목록](https://www.youtube.com/playlist?list=PL81piZbFXadQEIb_SkkPaO3Khjjise0gb) | 재생목록 제목 확인, 영상·자막 본문 미확보 | 인터뷰 발언이나 영상의 구체적인 문화 규칙은 인용하지 않음 |

## 3. DocSuri 검색 503 사건의 근거와 단계별 결과

사용자가 이번 대화에서 **데이터 파이프라인·인프라 담당**과 **검색 503 경험**을 직접 알려주었습니다. 파이프라인 분리가 해결 방식이었는지는 잠정적으로 말씀하셨으므로, 아래 문서와 변경 이력으로 대조했습니다.

시점은 운영 기록의 UTC 표기를 따릅니다. 런북은 사건을 7월 1일 장애로 지칭하고, 상세 안정화·개선 로그는 7월 2일에 작성되어 있어 본문에는 7월 사례로 표기했습니다.

| 단계·시점 | 문서에 기록된 사실 | 정확한 서술 범위 |
|---|---|---|
| 진단 | 수집 큐 backlog·DLQ, arXiv rate limit/timeout, OpenSearch read timeout으로 검색 503 | 검색 장애와 백필 부하를 함께 진단 |
| 7월 1일 초기 복구 | 워커 3→1 축소 후 재현 쿼리 정상 응답, CDK max 1 반영 (`7edbcc51`) | 최초 복구는 수집 동시성 제한의 결과 |
| 7월 2일 추가 안정화 | 수집 desired count 0, autoscaling 일시 정지, 큐 보존, 비저하 검색 결과 20건 | 수집 부하를 중지한 단계. 위 조치와 구분 |
| 처리 제한 | poll당 1건, 초기 루프 간격 3초 설정·검증 | 같은 날 `aac6c98e`에서 외부 소스 limiter와의 중복 대기를 제거해 루프 간격 0으로 변경. 최종 구성을 3초로 쓰지 않음 |
| 파일럿 준비 | 별도 승인 후 오래된 작업 큐 정리와 파일럿 등록 | 초기 큐 보존과 이후 큐 정리는 다른 단계 |
| 단일 워커 canary | 한 논문 118 chunks·13 assets, 큐 0, ingestion DLQ 111 유지, 검색 비저하 | 한 논문의 bounded 검증. 전체 백필·성능 보장 아님 |
| 큐·실행 자원 분리 | 7월 1일 별도 우선순위 큐, 7월 2일 별도 워커 서비스·queue age alarms, 관련 PR #323 | 첫 단계는 같은 워커의 우선 처리. 이후 실행 자원까지 분리 |
| 조치 후 부하 시험 | 20 VU 혼합 시나리오, 검색 p95 664.9ms, 전체 HTTP 오류율 0.01% | 반복 단일 질의·캐시 영향 가능. 실제 전체 요청 수 및 cold/warm 분리는 미확인 |
| 추가 throttle | PR #420, 프로세스별 외부 요청 제한을 고려한 max 1·burst 제거 | 큐 분리만으로 외부 요청 한도 문제가 해결된 것은 아님 |
| 후속 복구 | 7월 8일 DocModel DLQ 24→0 | 다른 날짜·다른 큐. ingestion DLQ가 111→0이라고 쓰지 않음 |

핵심 출처:

- [DocSuri audit: 조사·안정화·파일럿·개선](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3257)
- [복구 런북: 원인·제한·큐 분리](/Users/revenantonthemission/Projects/DocSuri/reports/runbook-docmodel-drain-344.md:8)
- [로드맵: 7월 8일 후속 DLQ 복구](/Users/revenantonthemission/Projects/DocSuri/reports/roadmap-2026-07.md:16)
- [성능·운영 개선 계획](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/plans/production-performance-hardening-code-generation-plan.md:5)
- Git 변경 이력: `7edbcc51`(수집량 제어와 검색 복구), `c83abc9e`(약 3.3만 건 backlog·문서 생성 우선순위 큐), `db31d281`(워커 서비스·인프라 개선), `aac6c98e`(중복 대기 제거). 이 커밋들의 작성자 기록과 사용자의 역할 설명을 함께 대조했습니다.
- [CDK: 큐 대기 알람](/Users/revenantonthemission/Projects/DocSuri/ops/cdk/stacks/ingestion_stack.py:151), [전용 워커](/Users/revenantonthemission/Projects/DocSuri/ops/cdk/stacks/ingestion_stack.py:364), [확장 제한과 장애 설명](/Users/revenantonthemission/Projects/DocSuri/ops/cdk/stacks/ingestion_stack.py:410).
- [전용 큐 격리 테스트](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_orchestration.py:312)는 FakeQueue 기반입니다. [동일 버전 재처리](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_orchestration.py:118), [bulk 부분 실패](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_orchestration.py:131)도 구현 범위를 확인하는 근거이며, 이번 조사에서 다시 실행하지 않았습니다.

검색 읽기 재시도·request timeout 개선 커밋 `0d058bde`, `ea71b31e`는 다른 팀원(`kyjness`)의 작성 기록이므로 개인의 구현 성과로 합치지 않았습니다. 선택적 v2 이중 쓰기는 best-effort 경로여서, 모든 인덱스에 대한 원자적 쓰기라고 표현하지 않았습니다.

추가 조사로 [audit의 7월 2일 부하 시험 기록](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/audit.md:3386)을 확보했습니다. 20 VU 시나리오의 검색 p95는 664.9ms, 전체 HTTP 오류율은 0.01%입니다. [시험 스크립트](/Users/revenantonthemission/Projects/DocSuri/tests/performance/api_frontend_load_test.js:8)의 기본값은 30초 증가·2분 유지·30초 감소입니다. 실행 기록만으로 당시 override가 없었다고 단정하지 않아 본문에 실제 시험 시간으로 쓰지 않았습니다.

각 반복에서 프런트·readyz를 호출하고 20% 확률로 동일한 검색어를 요청합니다. 따라서 “전체 요청의 20%가 검색”이나 “검색 오류율 0.01%”라고 쓰지 않습니다. cold/warm 상태·원시 요청 수를 확보하지 않았으며 반복 검색의 캐시 효과가 있을 수 있습니다. 이전 smoke load의 검색 p95 9,061ms는 검색 12회·동시성 3의 다른 조건이므로 두 값을 개선율로 계산하지 않았습니다. 이후 cold-query 504도 별도 사건으로 구분합니다. 자세한 조건과 출처는 [운영 근거집](evidence/operations.md)에 보존했습니다.

## 4. 기존 포트폴리오와 최신 상태의 차이

기존 승인 사실 목록보다 현재 [profile-data.ts](../../../site/src/lib/profile/profile-data.ts)가 최신이며 DocSuri가 포함되어 있습니다. 다만 이 소개에도 과거 운영 환경과 도메인이 남아 있어 그대로 옮기지 않았습니다.

- DocSuri의 현재 코드 기준: `32a424d1d58204bdab8810967fadecfe317457a2`. 해당 커밋은 기존 도메인 참조를 정리한 이력입니다.
- [서버 런북](/Users/revenantonthemission/Projects/DocSuri/ops/server/README.md:3)은 2026-08-17 AWS 폐기 이후 로컬 운영을 명시합니다. AWS CDK·SQS·Bedrock 경험은 해당 운영 시점의 경험으로 썼습니다.
- [2026-09-18 검증 보고서](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/build-and-test/project-verification-2026-09-18.md:1)에는 운영 코퍼스의 fixture 혼입, 공유 번역 캐시의 원문 검증 문제 등 미해결 사항이 기록되어 있습니다. 이 문서는 작업 트리의 미추적 검토 문서이며, 이번 작업에서는 그 실험을 재실행하지 않았습니다. 현재 서비스 전체의 데이터 품질 보장·요구사항 충족을 성과로 쓰지 않았습니다.
- 과거의 논문 수와 현재 코퍼스 규모를 혼합하지 않았습니다. 과거 사건의 복구 기록이 현재 모든 품질 문제의 해결을 뜻하지도 않습니다.
- AdiuBear는 구현 경험이 있지만 이번 직무와의 직접성이 낮아 본문에서 제외했습니다. DocSuri, 블로그 운영 장애, 로컬 데이터 활용 순으로 집중도를 높였습니다.

## 5. 나머지 사례의 근거

블로그 기준 커밋: `aafcc3ad4d670fee41929f270754423fda953509`.

| 본문 주장 | 근거 | 제한 |
|---|---|---|
| 문서 수집·구조화·검색 산출물 생성 | `preprocessor/src/scanner.rs:191`, `preprocessor/src/output.rs:59`, `:253` | 문서 배치 파이프라인. 대규모 분산 처리로 확대하지 않음 |
| 28개 글·렌더 실패 65건·SVG 130개 | 커밋 `f82c9eb370f34470d0c930b9e89630f7fceb278e` | 당시 커밋 기록. Jenkins 원본 로그를 이번에 다시 확인하지 않음 |
| 렌더 실패 집계·종료 코드 전파 | `preprocessor/src/main.rs:57`, `preprocessor/src/transform.rs:675`, `:705`, `:733`, `Jenkinsfile:24` | SVG 파일 쓰기 실패 등 모든 실패를 포괄하지 않음 |
| 출력 전 계약 검증 | `preprocessor/src/catalog.rs:192`, `preprocessor/tests/publication_catalog.rs:84` | 공개 범위·홈페이지 관련 규칙에 한정 |
| manifest·재실행 검사 | `preprocessor/tests/publication_output.rs:199`, `:237` | 외부 다이어그램 렌더러 없는 fixture |
| Zotero·PDF·인용·semantic index | `site/src/lib/profile/profile-data.ts`의 mcp-local-reference 항목 | 기존 포트폴리오 사실에 근거. 이번에 해당 서버 성능을 측정하지 않음 |

## 6. 제출 전에 보완하면 좋은 증거

현재 원고는 근거가 있는 복구 결과까지 담았습니다. 아래 항목을 확보하면 공고가 요청한 규모·기여·협업 설명이 더 구체적이 됩니다. 수치가 없으면 정성적으로 유지합니다.

| 보완할 항목 | 필요한 내용 |
|---|---|
| DocSuri 개인 기여의 구체성 | 팀 계획서의 U1 담당과 주요 작성 커밋은 확인. 실제 대안 논의·리뷰에서 직접 내린 판단을 더하면 좋음 |
| 처리 규모 | 당시 운영 날짜·코퍼스 논문/청크 수·일일 유입량. 파일럿과 전체 운영 규모를 구분 |
| 비교 가능한 성능 | 동일 입력·부하·환경에서 오류율, 검색 p50/p95/p99, queue age, 처리량의 전후 기록 |
| 복구 시간 | 장애 감지→수집 중지→검색 정상화 시각. 현재 로그의 작업 시각만으로 MTTR을 계산하지 않음 |
| 협업의 구체성 | 팀에 공유한 진단, 검토한 대안, 합의한 제한과 그 이유를 보여주는 리뷰·이슈 하나 |
| 최신 서비스 확인 | 현재 공개 데이터 품질 문제의 해결·검증 이후 데모 링크 추가 여부 판단 |

측정을 추가할 때에는 당시 운영 로그나 별도 검증 환경을 사용합니다. 이 포트폴리오 작성 작업에서는 실서비스 부하 테스트·큐 재처리·배포를 실행하지 않았습니다.

## 7. 전체 문서 탐색으로 추가한 소재

프로젝트 문서 356개(텍스트 355개·DOCX 1개)와 아키텍처 이미지 2개를 조사 범위로 삼았습니다. 텍스트는 전체 본문 검색 후 관련 근거를 상세 확인했으며, 모든 줄의 정독이나 구현 전수 검증을 뜻하지 않습니다. 공통 규칙·템플릿·의존성 자료 63개는 지원자 경험의 근거에서 제외했습니다.

| 원고 위치 | 추가·보강한 내용 | 근거집 |
|---|---|---|
| 소개·담당 | 4인 팀, 준희의 Data Engineer/U1 역할과 후속 인프라 기여 | [범위·기여](evidence/context-and-scope.md) |
| 1.1 | 조치 후 20 VU 측정, 전후 조건 차이 | [운영](evidence/operations.md) |
| 1.2 | DOI/arXiv/title 기반 canonical, 대표 소스·별칭·철회·파생 정리 | [파이프라인](evidence/data-pipelines.md) |
| 1.3 | DocModel blockRefs·provenance·parser 세대와 소비자 동기화 | [파이프라인](evidence/data-pipelines.md), [계약](evidence/contracts-quality.md) |
| 1.4 | 중복 버전·부분 bulk 실패, 소스별 watermark, 재구축 실행 충돌 | [파이프라인](evidence/data-pipelines.md) |
| 1.5~1.7 | 복사/재임베딩/재파싱, TPM pacing·재시작, 후보 인덱스·alias·rollback | [파이프라인](evidence/data-pipelines.md) |
| 1.8~1.10 | 외부 입력 제한, 자산의 부분 실패, 사용자 PDF 식별·입력 계약 | [파이프라인](evidence/data-pipelines.md) |
| 1.11~1.13 | 실제 설정 drift, bounded 중복 상태·redaction, 비용·쿼터, 복원·백업·로컬 이전, 배포 권한·기존 리소스 | [운영](evidence/operations.md) |
| 1.14 | 공용 Schema·벡터 의미, 한국어 문서 추적성 도구 | [계약](evidence/contracts-quality.md), [도구·기여](evidence/context-and-scope.md) |
| 1.15 | requestId, 기능 저하, 캐시 조건, 개인화 PBT, 제한된 grounding 평가, 인용 그래프 | [계약](evidence/contracts-quality.md) |
| 1.16 | 최신 결함과 검증 기준, 완료·계획의 구분 | [범위·한계](evidence/context-and-scope.md) |

### 기여 귀속에서 조정한 부분

팀 계획서에 준희의 U1 담당이 명시돼 있어 원고의 소개를 구체화했습니다. 기존 “백엔드·검색·요약 파이프라인 개발 참여”처럼 넓은 문구는 데이터 생산자·소비자 변경과 운영 통합의 실제 경계로 좁혔습니다. U1 corpus 계약 변경 `5b813aea`, 입력 하드닝 `1a232c8f`, 재처리·인덱스 전환, 관측 개선 `eabf9519`, 비용 제어 `badaceb7`/`40d545d1`, 로컬 백업 `e2c24b8c` 등 확인된 개인 작성 이력을 분야별 근거집에 남겼습니다.

초기 U6 운영 구현은 다른 팀원의 작성 기록입니다. 검색 읽기 재시도, GROBID TEI 파서 등도 개인의 모든 구현 성과로 합치지 않았습니다. 작성자 표시는 사용자의 담당 설명과 문서 맥락을 보강하는 근거이지 팀의 공동 설계·리뷰를 배제하는 증거가 아닙니다.

### 좋은 소재라도 성과로 바꾸지 않은 것

- 팀 계획의 문헌 조사 시간 50% 절감, Top-5 80% 이상, 검색·요약 지연 목표.
- fast rebuild의 “hours, not days”, 약 1.5M 청크 등 시점·실측 범위가 맞지 않는 처리 규모·속도 주장.
- 인덱스 문서 수 점검을 ID·내용·원 출처의 완전성 검증으로 확대하는 표현.
- 사용자 PDF 큐 입력 식별 계약을 읽기 API의 소유자 격리 완료로 바꾸는 표현.
- 평가용으로 구성한 18개 grounding 사례를 실제 운영의 환각률 0%로 바꾸는 표현.
- 공용 벡터 비교 함수·Python 생성 검사를 모든 runtime/TypeScript 경로의 강제 게이트로 확대하는 표현.
- 계획된 알림 스케줄·유료 결제·outbox·서명 manifest·TLS/mTLS·RPO/RTO 목표를 완료한 운영 기능으로 제시하는 것.
- AWS 복원 기록과 현재 로컬 백업 파일 검사를 결합해 전체 서비스 복원이 검증됐다고 주장하는 것.

온보딩·알림·사용량 등급·라이브러리·인용 그래프의 데이터 설계도 근거집에 보존했습니다. 직접 담당하고 검증한 수집·운영 사례보다 앞세우지 않고, 소비자 요구를 이해하는 보조 설명으로 배치했습니다.

## 8. 이번 검증 범위

- 회사 자료는 공식 채용 원문·서비스 소개·기술 블로그를 읽고 정리했습니다. YouTube 본문 미확보는 위에 표시했습니다.
- 최초 저장소 탐색은 codebase-memory Tier 2, 추가 DocSuri 문서 조사는 bounded Tier 3로 진행했습니다. 사용한 파일의 coverage를 확인하고 의도적 제외·미포함 파일은 원문으로 대조했습니다. 최초 블로그 인덱스 generation은 `2026-09-20T08:41:32Z`, DocSuri 조사 기준은 `2026-09-20T08:48:06Z`입니다. coverage에 기록된 문제가 없다는 사실만으로 전체 구현의 완전성을 판단하지 않았습니다.
- 함수와 테스트의 존재, 관련 호출과 변경 이력, 당시 운영 문서의 결과를 대조했습니다. 기존 운영 실험과 테스트를 이번 세션에서 다시 실행한 것은 아닙니다.
- Markdown 6개를 파싱하고 표 15개·코드 블록 1개와 링크 194개를 점검했습니다. 로컬 링크의 대상 파일·명시된 행 번호, 표 열 수, 코드 블록 경계에 문제가 없었습니다. 문서 인벤토리 419개 중 프로젝트 문서 356개라는 집계도 대조했습니다. 최초 원고의 핵심 GitHub 근거 4개(PR #323·#420, 검색 복구·블로그 렌더링 수정 커밋)는 HTTP 200 응답을 확인했습니다. 추가 근거는 로컬 원문과 변경 이력을 기준으로 대조했으며 모든 외부 URL을 다시 검증한 것은 아닙니다.
- DocSuri 작업 트리의 진행 중 변경과 현재 사이트의 production profile·승인 기록은 수정하지 않았습니다. 이번 결과물은 이 디렉터리의 별도 원고와 작성 근거입니다.
