# DocSuri 추가 근거 — 데이터 파이프라인

작성일: 2026-09-20. 편집용 근거집이며 제출 원고 자체가 아닙니다. 문서 전체 조사 중 수집·정규화·재처리·인덱스 전환 범위를 담당했습니다.

## 검토 범위와 해석

- 대상 Markdown 48개를 목록화하고 제목·상태·완료/검증·주제 검색으로 선별했습니다. 구현 요약·빌드 결과·런북 등 16개는 전문을 읽었습니다. 아래 부록에서 각 문서의 확인 깊이를 구분합니다.
- 강한 후보는 현재 코드의 정확한 함수, 관련 테스트, 양방향 호출 관계, Git 변경 이력과 대조했습니다. 테스트를 새로 실행하거나 외부 인프라에 접근하지 않았습니다.
- 사용자에게 확인된 역할은 데이터 파이프라인·인프라입니다. `revenantonthemission` 작성 커밋은 기여 근거로 사용하되 팀 전체 설계·모든 하위 파서 구현을 개인 단독 성과로 바꾸지 않습니다.
- 아래 사례는 대부분 2026년 6~7월의 설계·구현 경험입니다. AWS는 8월 17일 종료되었으며, 현재 서비스 품질을 보증하는 내용이 아닙니다.
- [9월 18일 검증 보고서](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/build-and-test/project-verification-2026-09-18.md:5)에는 공개 코퍼스 fixture 혼입·범위 미충족, userdoc 읽기의 소유자 검사 결함, 이미지 서빙 및 공유 번역 캐시 결함이 남아 있습니다. 이 보고서는 작업 트리의 검토 문서이며 이번 조사에서 실험을 재실행하지 않았습니다.

## 추가 우선순위

| 사례 | 원고 활용 | 입증되는 범위 |
|---|---|---|
| 다중 소스 canonical 식별·대표 레코드 선택 | 본문 주요 사례 | 구현, fake/PBT, 개인 작성 변경 이력 |
| DocModel에서 검색·요약·열람으로 이어지는 데이터 계약 | 본문 주요 사례 | 생산자/소비자 변경과 계약 테스트 |
| 재임베딩·재파싱·복사 경로의 분리 | 본문 주요 사례 | 런북과 구현, 전체 완료 시간은 미입증 |
| 호출량 제한과 재시작 가능한 재임베딩 | 본문 주요 사례 | pacing·mget-skip 코드, bounded 단위 테스트 |
| 후보 인덱스 검증과 alias 전환 | 본문 주요 사례 | count 기반 점검과 별도 전환 도구, 운영 무중단 보장은 아님 |
| 증분 watermark·재구축 실행 충돌 제어 | 설계 설명 보강 | 단조성·독립성 PBT와 스케줄/워커 분기 |
| 외부 문서 입력의 경계 검증 | 본문 또는 기술 부록 | 입력 크기·XML·주소 검증 구현, 앱 전체 보안은 아님 |
| 그림·도표 저장의 실패 경계 | 데이터 품질 사례 | S3→DB 쓰기 순서와 비차단 처리, 분산 트랜잭션은 아님 |
| 업로드 PDF 작업의 식별 계약 | 기술 부록 | 큐 입력 검증, 읽기 API 소유자 격리 완료는 아님 |
| 철회·버전 변경의 파생 데이터 정리 | canonical 사례에 병합 | tombstone·캐시/자산 정리 경로와 회귀 테스트 |

## P1. 다중 소스에서 같은 논문을 식별하고 대표 레코드를 유지

**바로 쓸 문장**

> arXiv, Semantic Scholar, OpenAlex의 레코드를 공통 수집 경로에 연결하면서 동일 논문을 서로 다른 소스가 제공하는 문제를 다뤘습니다. DOI, arXiv ID, 정규화한 제목·첫 저자·연도의 순서로 식별 키를 만들고, 소스 우선순위에 따라 대표 레코드를 선택했습니다. 낮은 우선순위의 중복 데이터는 PDF 추출·임베딩 전에 걸러내고, 더 높은 우선순위의 데이터가 나중에 들어오면 기존 검색 청크와 파생 산출물을 정리하도록 구성했습니다. 별칭과 관측 소스를 보존해 어떤 자료가 대표 레코드로 합쳐졌는지도 추적할 수 있게 했습니다.

**근거**

- [구현 요약: sourceRecord·priority·alias·withdrawal](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u1-ingestion/code/u1-corpus-code-summary.md:23)과 같은 문서 94~101행의 후속 보정. 초기 48행의 “실 HTTP provider 범위 밖”은 96행의 6월 27일 provider 추가와 함께 읽어야 합니다.
- [canonical_key](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/domain/canonical.py:9): DOI → arXiv 버전 접미사 제거 ID → title/author/year hash.
- [_ingest_source_record](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/application.py:356): 기존 winner 판정이 fetch_full_text보다 먼저 위치합니다.
- [조건부 winner upsert](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/adapters/postgres.py:244): `ON CONFLICT`에서 소스 우선순위·버전 조건에 맞을 때 대표 정보를 갱신하고 `seen_sources`를 합집합 처리합니다.
- [DOI-only 외부 레코드를 title alias로 arXiv와 연결하는 테스트](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_orchestration.py:855), [상위 소스 winner 대체 테스트](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_orchestration.py:966).
- 기여 이력: `5b813aea`(2026-06-26, U1 corpus), `1a232c8f`(2026-06-29, winner guard), 작성자 `revenantonthemission`.

**검증 범위·직무 연결**

여러 생산자의 데이터 결합, 대표 키, 중복 비용 제어, lineage를 설명하기에 좋습니다. 실제 전체 코퍼스의 중복률 감소·데이터 정확도 향상 수치는 확보하지 않았습니다. Postgres 한 행의 조건부 갱신을 OpenSearch/S3까지 포함하는 전역 원자성으로 표현하지 않습니다.

## P2. 문서 모델을 생산자와 소비자가 공유하는 데이터 계약으로 사용

**바로 쓸 문장**

> 문서를 평문으로만 넘기면 검색 결과가 원문의 어느 부분에서 나왔는지 연결하기 어려웠습니다. DocModel을 섹션·블록 단위로 정규화하고, 같은 구조에서 본문 텍스트와 검색 청크를 만들었습니다. 검색 레코드에는 논문·버전·섹션·블록 식별자를 남겨 원문 위치를 연결하고, 요약과 화면 소비자에도 같은 필수 필드를 반영했습니다. 파서·스키마 버전이 맞지 않는 캐시는 재사용하지 않도록 해 생산자 변경이 오래된 산출물과 섞이는 경계를 다뤘습니다.

**근거**

- [fullText·블록·blockRefs 계약](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u1-ingestion/code/u1-corpus-code-summary.md:13): paragraph/table/formula/figure caption/list/code를 읽기 순서로 투영. `blockRefs`는 BM25 검색 토큰과 분리된 provenance입니다.
- 같은 문서 [요약·프론트 소비자 동기화](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u1-ingestion/code/u1-corpus-code-summary.md:71), [parserVersion/schemaVersion 캐시 검사](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u1-ingestion/code/u1-corpus-code-summary.md:100).
- [local runtime blockRefs 테스트](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_runtime.py:8): fake runtime에서 생성한 검색 레코드의 blockRefs 존재를 확인합니다.
- [6월 26일 계약·소비자 검증 결과](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u1-ingestion/build-and-test/build-and-test-summary.md:20): 당시 shared 66, ingestion 129 passed/1 skipped, 요약 116 passed/3 skipped, 프론트 targeted 19 tests. 서로 다른 레인의 수치를 합쳐 운영 품질 지표로 쓰지 않습니다.
- `5b813aea`가 U1/공유 DTO/U7/frontend 변경을 함께 포함합니다. GROBID TEI 구조 파서의 후속 `ff159e80`(2026-06-28)은 `kyjness` 작성이므로 개인 단독 작성으로 합치지 않습니다.

**검증 범위·직무 연결**

데이터 스키마 변경, 생산자·소비자 정합, lineage, cache invalidation 경험입니다. 구조 참조의 존재가 원 출처 진실성·전체 근거 품질을 보장하지 않습니다. PDF fallback 등 입력 경로별 구조 품질 차이도 남습니다.

## P3. 재색인 목적에 따라 복사·재임베딩·재파싱 경로를 분리

**바로 쓸 문장**

> 인덱스를 다시 만든다는 요청을 변경 대상에 따라 나눴습니다. 샤드 구성만 바꾸는 경우에는 기존 레코드를 복사하고, 임베딩 모델을 바꾸는 경우에는 저장된 텍스트를 읽어 벡터를 다시 생성하도록 했습니다. 파서 변경에는 기존 청크를 재사용할 수 없으므로 원본 바이트 캐시를 읽어 다시 파싱하는 경로를 마련했습니다. 재처리 목적에 맞게 출발점을 선택해 외부 원문을 불필요하게 다시 내려받는 작업을 줄이도록 설계했습니다.

**근거**

- [copy/re-embed 모드 구분](/Users/revenantonthemission/Projects/DocSuri/ops/runbooks/reembed-fast-rebuild.md:8), [원본 캐시 기반 reparse 경로](/Users/revenantonthemission/Projects/DocSuri/ops/runbooks/reembed-fast-rebuild.md:122).
- [reembed](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/reembed.py:171): 기존 인덱스 sliced scroll, vector만 교체하고 나머지 source 필드는 복사.
- [reparse](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/reparse.py:24): offline target과 `raw_cache_mode=only`로 runtime을 만들고 `ingest_metadata` 경로 재사용.
- 기여 이력: `d32ef28e`(2026-07-06, 재임베딩), `2b9e51f9`(같은 날, raw-cache/reparse), 작성자 `revenantonthemission`.

**검증 범위·직무 연결**

재처리 설계·백필 비용·데이터 파생 관계를 설명합니다. 런북 첫 문장의 “hours, not days”는 뒤의 quota 제약 설명과 충돌하므로 성과 수치로 쓰지 않습니다. `reparse`는 개별 실패를 기록한 뒤 마지막에 0을 반환하며, 재처리 전체 성공을 종료 코드만으로 보증하지 않습니다. 런북의 “DocModel은 HTML-only/lazy” 설명도 현재 eager/fallback 코드와 시점이 달라 그대로 옮기지 않습니다.

## P4. 계정 단위 호출 한도에 맞춘 pacing과 재시작 처리

**바로 쓸 문장**

> 재임베딩에서는 워커를 늘려도 계정 전체의 모델 호출 한도를 넘을 수 없다는 제약을 반영했습니다. 배치의 예상 토큰 수로 호출 속도를 제한하고, 속도 제한 모드에서는 대상 인덱스에 이미 기록된 문서를 확인해 재시작 시 임베딩을 생략하도록 했습니다. 처리량을 높이는 방법뿐 아니라 중단 후 이미 수행한 작업을 재사용하는 방법을 함께 다뤘습니다.

**근거**

- [당시 quota·단일 paced task·mget-skip 판단](/Users/revenantonthemission/Projects/DocSuri/ops/runbooks/reembed-fast-rebuild.md:35). 432M tokens/day·2~4일은 당시 런북의 제한/추정이며 현재 요금·쿼터나 실측 완료 시간으로 인용하지 않습니다.
- [TPM limiter·mget skip·bulk 오류 검사](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/reembed.py:206). skip은 `reembed_target_tpm > 0`인 모드에만 적용됩니다.
- [용량보다 큰 토큰 배치 회귀 테스트](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_reembed.py:80): fake clock으로 한 번의 bucket capacity를 초과하는 요청이 여러 refill 구간을 거쳐 처리되는지 검사.
- `f4c8d151`(2026-07-06, pacing), `bb7897f7`(같은 날, oversized batch 처리), 작성자 `revenantonthemission`.

**검증 범위·직무 연결**

외부 서비스 quota와 내부 병렬성 관계, 비용 통제, 재시작 가능한 배치 작업의 사례입니다. 추정 토큰 기반 제한을 모든 외부 quota 위반이 사라졌다는 보장으로 쓰지 않습니다. mget 존재 확인은 동일 target·설정으로 재시작한다는 운영 전제가 필요합니다.

## P5. 후보 인덱스 점검과 읽기 alias 전환·복구 절차

**바로 쓸 문장**

> 새 인덱스를 만드는 작업과 읽기 경로를 전환하는 작업을 나눴습니다. 후보 인덱스에는 별도로 데이터를 적재하고 최소 문서 수를 점검한 뒤, 운영 절차에 따라 읽기 alias를 전환하도록 구성했습니다. 원본과 대상의 문서 수 차이를 읽기 전용으로 확인하는 명령도 추가했습니다. 벡터 차원이 바뀔 때는 인덱스뿐 아니라 질의 임베딩과 쓰기 측의 공유 계약도 함께 배포해야 하며, 복구에는 이전 이미지와 alias 대상의 복원이 필요하다는 점을 런북에 남겼습니다.

**근거**

- [validate_generation](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/adapters/aws.py:459): 실제 검사는 `total_documents < min_documents`, 기본 하한 1.
- [빈 후보 거부 테스트](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_orchestration.py:467), [alias remove/add 요청 분리 테스트](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_orchestration.py:477).
- [finalize](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/reembed.py:271): replica/refresh 복원과 최소 count 점검.
- [read-only verify](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/reembed.py:292): target count가 source count보다 작을 때 실패. 동일 ID·내용·source 진실성·초과 문서까지 검증하는 도구는 아닙니다.
- [별도 alias cutover 함수](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/reembed.py:314): 한 `update_aliases` 요청으로 remove/add. 이 함수 자체가 verify를 호출하지 않으므로 검증 강제의 범위는 운영 순서와 각 도구의 개별 동작입니다.
- [freeze/load/finalize/cutover/resume 순서](/Users/revenantonthemission/Projects/DocSuri/ops/runbooks/reembed-fast-rebuild.md:85), [1024↔1536 reader/writer 공동 변경·rollback](/Users/revenantonthemission/Projects/DocSuri/ops/runbooks/reembed-fast-rebuild.md:102).
- `e5e57d74`(2026-07-06, 차원 변경 지원), `8e5e3c96`(같은 날, writer alias 정합), `ef3ac553`(2026-07-07, read-only verify), 작성자 `revenantonthemission`.

**검증 범위·직무 연결**

배치 변경의 배포 경계와 롤백, 데이터 스토어 마이그레이션입니다. “데이터 완전성을 자동 검증해 무중단 전환 완료”, “모든 실패에서 alias 전환 불가능”으로 확대하지 않습니다. 초기 v4 문서의 Docker 로컬 검증과 운영 마이그레이션 완료도 구분합니다.

## P6. 소스별 증분 상태와 재구축 실행 충돌 제어

**바로 쓸 문장**

> 증분 수집의 진행 위치를 소스별 watermark로 관리하고, 한 소스의 진행 상태가 다른 소스에 영향을 주지 않도록 했습니다. watermark가 뒤로 가지 않는지와 소스별 독립성을 속성 기반 테스트로 확인했습니다. 전체 재구축 중에는 스케줄·이벤트 수집과 워커 실행 경로를 제한해 재구축이 초기화한 진행 상태를 기존 작업이 다시 바꾸는 상황을 막도록 구성했습니다.

**근거**

- [소스별 watermark 단조성·독립성 PBT](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_properties.py:82).
- [on_schedule_tick](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/application.py:1007): rebuild active 시 반환. 외부 Semantic Scholar/OpenAlex 소스별 예외를 관측하고 다음 소스로 진행.
- [rebuild lock 시 tick/event 미등록 테스트](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_orchestration.py:500).
- [워커 실행 시 rebuild fencing](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/worker.py:114): INCREMENTAL/EVENT는 기록 후 ack; 재구축이 해당 논문을 다시 포함한다는 전제.
- [초기 dedup/watermark/tombstone/rebuild 테스트 매핑](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u1-ingestion/code/u1-ingestion-code-summary.md:57).
- `1a232c8f`(2026-06-29)의 실행 fencing 변경.

**검증 범위·직무 연결**

체크포인트·재처리 충돌·속성 기반 테스트 경험입니다. watermark monotonic만으로 모든 out-of-order 작업의 무누락을 보장하지 않습니다. arXiv 경로까지 모든 소스 오류가 서로 완전히 격리된다고 쓰지 않습니다. 문서의 outbox 또는 페이지 단위 durable checkpoint를 별도 구현 검증 없이 성과에 추가하지 않습니다.

## P7. 외부 데이터 입력의 크기·주소·파싱 경계 검증

**바로 쓸 문장**

> 외부 논문 수집은 데이터 가공 이전에 입력 자체를 검증해야 했습니다. URL의 공인 IP 여부를 확인하고 리다이렉트 경로를 통제했으며, 다운로드를 스트리밍하면서 크기 상한을 넘으면 중단하도록 했습니다. XML 엔티티 확장과 과도한 압축 해제에도 제한을 두었습니다. 외부 입력의 실패를 수집 단계에서 설명할 수 있도록 경계를 좁힌 경험입니다.

**근거**

- `1a232c8f`(2026-06-29) 감사 보정: XML 32MB cap, 외부 응답 64MB cap, e-print member 20MB/총 200MB 제한 기록. 당시 신규 하드닝 테스트 9개, 전체 206 passed/1 skipped 기록. 이는 커밋 기록이며 이번 재실행 결과가 아닙니다.
- [호스트 해석·비공인 주소 거부·연결할 IP 반환](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/adapters/corpus_http.py:396); 현재 코드는 DNS rebinding을 줄이기 위한 pinned IP를 반환합니다.
- [스트림 read_capped](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/http_limits.py:26), [safe XML parse](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/xmlsafe.py:25).
- `470f03e4`(2026-07-01, release security gates) 등 후속 변경이 있으므로 모든 현재 방어를 6월 29일 단일 커밋에 귀속시키지 않습니다.

**검증 범위·직무 연결**

외부 데이터 수집기 운영·입력 검증·리소스 소진 방어입니다. 금융 개인정보 처리 실무나 서비스 전체 보안 검증으로 확대하지 않습니다.

## P8. 그림·도표 산출물의 저장 순서와 실패 영향 분리

**바로 쓸 문장**

> 검색 색인과 화면용 그림·도표는 실패의 영향이 달라야 한다고 보고 처리 경계를 나눴습니다. 자산 추출은 주 인덱스 처리 뒤에 best-effort로 수행하고, 자산 저장에서는 객체를 먼저 기록한 후 데이터베이스의 매니페스트를 갱신하도록 했습니다. 자산 ID와 문서 블록의 연결을 유지하고 버전 변경·철회 시 관련 산출물을 정리하는 흐름도 마련했습니다.

**근거**

- [assetId·문서 캡션 대응·쓰기 순서·실패 경계](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u1-ingestion/code/u1-multimodal-asset-code-summary.md:22).
- [store_assets](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/adapters/assets.py:90): 같은 버전의 기존 자산 삭제 → S3 put → RDS upsert. 데이터베이스와 객체 저장소의 분산 트랜잭션은 아닙니다.
- [주 인덱스 완료 상태 이후 자산 처리](/Users/revenantonthemission/Projects/DocSuri/ingestion/src/docsuri_ingestion/application.py:508).
- 문서의 6월 22일 검증은 compile/import smoke이며 전체 자산 테스트 실행 완료를 뜻하지 않습니다. 최신 9월 18일 보고서는 PostgreSQL 자산 통합 테스트와 별개로 원격 이미지 서빙 결함을 지적합니다.

**검증 범위·직무 연결**

파생 데이터의 일관성·가용성 trade-off, 저장 순서, 부분 실패 처리입니다. “고아 객체 0”, “표시까지 완전한 정합성 확보”는 입증되지 않습니다. 자산 추출 상세는 팀 구현으로 소개하는 것이 안전합니다.

## P9. 업로드 PDF와 공개 코퍼스 작업의 식별 계약

**바로 쓸 문장**

> 사용자가 올린 PDF는 공개 논문과 다른 식별 체계로 처리했습니다. 전용 작업 종류와 userdoc ID를 정의하고, 큐 입력의 job·owner·record reference가 서로 맞는지 검사한 뒤 저장된 PDF를 읽어 표준 DocModel을 생성하도록 했습니다. 잘못된 입력과 파싱 불가 문서는 영구 실패로 분류해 DLQ 경로로 보냈습니다.

**근거**

- [userdoc 입력 계약](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u1-ingestion/code/user-docmodel-ingestion-code-summary.md:11): `userdoc-{uuid}`, `userdoc:{uuid}`, version=1, `upload:{ownerId}:{jobId}:{attachmentId}`, module 범위 검사.
- 같은 문서 34~35행: 당시 focused 35 tests, 전체 281 passed/1 skipped 기록.
- `0b2df488`(2026-07-05, initial user-PDF), `fe9d27b0`(같은 날, identity contract), `0356b966`(2026-07-06, GROBID 구조 활용), 작성자 `revenantonthemission`.
- 문서의 “첫 PR pdfplumber-only”는 당시 범위이며 이후 GROBID 사용/빈 결과 fallback이 추가되었습니다.

**검증 범위·직무 연결**

비동기 메시지의 입력 계약과 식별자 설계에 한정합니다. [F01](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/build-and-test/project-verification-2026-09-18.md:107)의 userdoc 읽기 API 소유자 검사 결함 때문에 “사용자 간 접근 격리 완료” 사례로 쓰면 안 됩니다.

## P10. 철회·버전 변경에 따른 파생 데이터 정리

**바로 쓸 문장**

> 원본 논문이 철회되거나 대표 소스가 바뀌는 경우도 수집 결과의 일부로 다뤘습니다. 철회된 논문은 검색 청크를 tombstone 처리하고 문서 캐시·자산을 정리했습니다. 철회된 레코드가 canonical 대표로 계속 남아 정상 외부 복본의 수집을 막지 않도록 대표 상태도 삭제하는 회귀 테스트를 추가했습니다.

**근거**

- [winner 교체·철회·파생 산출물 정리](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u1-ingestion/code/u1-corpus-code-summary.md:28).
- [철회 arXiv winner 제거 테스트](/Users/revenantonthemission/Projects/DocSuri/ingestion/tests/test_orchestration.py:1068).
- `89294d2a`(2026-06-27, withdrawn canonical winners cleanup), 작성자 `revenantonthemission`.
- 초기 [highest-version tombstone 테스트 매핑](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u1-ingestion/code/u1-ingestion-code-summary.md:65).

**검증 범위·직무 연결**

소스의 수정·철회에 대한 데이터 라이프사이클, stale data 제거를 설명합니다. 모든 저장소의 동시 삭제·재색인 경쟁에서 선형화 가능성이나 유실 0을 증명한 것은 아닙니다.

## 문서 충돌과 성과에서 제외할 주장

| 문서 표현 | 이번 판정 |
|---|---|
| OpenSearch bulk 위 “논문 단위 원자성” | 성공 상태를 기록하는 순서·실패 검사 구현으로만 서술. 독자는 쓰기 도중 일부 청크를 볼 수 있으므로 스토어 트랜잭션으로 확대 금지 |
| v4 migration performance “Pass”와 3초 delay | 구체 부하·오류율·전후 수치가 없어 성능 성과로 채택하지 않음 |
| 초창기 migration은 로컬 실행·자동 cutover | 이후 canonical runner는 SigV4/in-VPC ECS와 별도 cutover로 변경. 최신 구현 기준 |
| fast rebuild “hours, not days” | 같은 런북의 quota 제약·2~4일 추정과 충돌. 시간 단축 수치 제외 |
| `reembed_verify`의 completeness 명칭 | count 부족 감지에 한정. source/target ID 집합·내용 일치 검증은 아님 |
| 최초 설계의 모든 DocModel eager·전체 코퍼스 완성 | 구현 경로와 당시 일부 배포 기록을 구분. 9월 18일 현재 코퍼스는 요구 범위 미충족 |
| 약 1.5M 청크 | 과거 pivot 문서에 적힌 시점 한정 값. 현재 규모·전체 최근 1년 corpus 완성 증거로 사용하지 않음 |
| 순수 title/abstract→body 확장으로 recall 향상 | 설계 동기는 확인되나 비교 평가 수치가 없어 품질 향상률 제외 |
| outbox·모든 입력의 무누락·재전달 exactly-once | 이 조사에서 해당 강도의 구현·통합 증거가 확보되지 않아 성과로 추가하지 않음 |
| 사용자 업로드 namespace 사용=접근 격리 | 큐 입력 계약만 확인. 읽기 API F01 미해결 |
| 자산 write-order=고아/누락 0 | S3와 RDS 사이 원자성이 없고 최신 이미지 서빙 결함 존재 |

## 검증 이력과 한계

Codebase Memory project: `Users-revenantonthemission-Projects-DocSuri`, generation `2026-09-20T08:48:06Z`, fast index, HEAD `32a424d1d58204bdab8810967fadecfe317457a2`. bounded Tier 3 문서 감사로 수행했습니다.

대상 문서 48개와 추가 근거 파일 20개에 `check_index_coverage`를 적용했고 모두 `no_recorded_issue / metadata_match`였습니다. 이는 기록된 gap이 없다는 뜻이며 구현의 완전성 증명은 아닙니다. 전역 parse_partial 2개는 이번 근거 경로 밖의 `backend/elasticmq.conf`, `frontend/types/paperMeta.ts`였습니다.

`_ingest_source_record`, `reembed_cutover`, canonical Postgres upsert, asset store를 양방향 trace했고 관련 페이지는 모두 끝까지 확인했습니다. fast graph는 duck-typed DB/client 메서드를 unrelated fake class로 연결하기도 했으므로 그 소유 관계를 근거로 사용하지 않고 정확한 함수 본문으로 동작을 확인했습니다. “호출자 0”을 미사용 증거로 해석하지 않았습니다.

이번 감사는 문서의 모든 요구를 현재 코드 전체에서 입증하는 보안·정합성 감사가 아닙니다. 테스트 존재·당시 실행 기록과 현재 운영 결과는 구분했습니다. 진행 중 DocSuri 파일을 수정하지 않았습니다.

## 조사 문서 목록

F = 전문 읽기. S = 제목·상태·완료/검증·주제 검색으로 후보 선별. S 문서의 설계 의도만으로 구현 완료를 주장하지 않았습니다. 총 48개(F 16개, S 32개).

- F — `aidlc-docs/construction/plans/docmodel-fulltext-index-pivot-plan.md`
- S — `aidlc-docs/construction/plans/u1-corpus-code-generation-plan.md`
- S — `aidlc-docs/construction/plans/u1-corpus-functional-design-plan.md`
- S — `aidlc-docs/construction/plans/u1-corpus-infrastructure-design-plan.md`
- S — `aidlc-docs/construction/plans/u1-corpus-nfr-design-plan.md`
- S — `aidlc-docs/construction/plans/u1-corpus-nfr-requirements-plan.md`
- S — `aidlc-docs/construction/plans/u1-ingestion-code-generation-plan.md`
- S — `aidlc-docs/construction/plans/u1-ingestion-functional-design-plan.md`
- S — `aidlc-docs/construction/plans/u1-ingestion-multimodal-code-generation-plan.md`
- S — `aidlc-docs/construction/plans/u1-ingestion-multimodal-functional-design-plan.md`
- S — `aidlc-docs/construction/plans/u1-ingestion-multimodal-infrastructure-design-plan.md`
- S — `aidlc-docs/construction/plans/u1-ingestion-multimodal-nfr-design-plan.md`
- S — `aidlc-docs/construction/plans/u1-ingestion-multimodal-nfr-requirements-plan.md`
- S — `aidlc-docs/construction/plans/u1-ingestion-nfr-design-plan.md`
- S — `aidlc-docs/construction/plans/u1-ingestion-nfr-requirements-plan.md`
- F — `aidlc-docs/construction/plans/user-docmodel-ingestion-code-generation-plan.md`
- S — `aidlc-docs/construction/plans/v4-migration-code-generation-plan.md`
- S — `aidlc-docs/construction/plans/v4-migration-infrastructure-design-plan.md`
- S — `aidlc-docs/construction/plans/v4-migration-nfr-design-plan.md`
- F — `aidlc-docs/construction/u1-ingestion/build-and-test/build-and-test-summary.md`
- S — `aidlc-docs/construction/u1-ingestion/build-and-test/build-instructions.md`
- S — `aidlc-docs/construction/u1-ingestion/build-and-test/integration-test-instructions.md`
- S — `aidlc-docs/construction/u1-ingestion/build-and-test/performance-test-instructions.md`
- S — `aidlc-docs/construction/u1-ingestion/build-and-test/unit-test-instructions.md`
- F — `aidlc-docs/construction/u1-ingestion/code/u1-corpus-code-summary.md`
- F — `aidlc-docs/construction/u1-ingestion/code/u1-ingestion-code-summary.md`
- F — `aidlc-docs/construction/u1-ingestion/code/u1-multimodal-asset-code-summary.md`
- F — `aidlc-docs/construction/u1-ingestion/code/user-docmodel-ingestion-code-summary.md`
- S — `aidlc-docs/construction/u1-ingestion/functional-design/business-logic-model.md`
- S — `aidlc-docs/construction/u1-ingestion/functional-design/business-rules.md`
- S — `aidlc-docs/construction/u1-ingestion/functional-design/domain-entities.md`
- S — `aidlc-docs/construction/u1-ingestion/infrastructure-design/deployment-architecture.md`
- S — `aidlc-docs/construction/u1-ingestion/infrastructure-design/infrastructure-design.md`
- S — `aidlc-docs/construction/u1-ingestion/nfr-design/logical-components.md`
- S — `aidlc-docs/construction/u1-ingestion/nfr-design/nfr-design-patterns.md`
- S — `aidlc-docs/construction/u1-ingestion/nfr-requirements/nfr-requirements.md`
- S — `aidlc-docs/construction/u1-ingestion/nfr-requirements/tech-stack-decisions.md`
- F — `aidlc-docs/construction/v4-migration/build-and-test/build-and-test-summary.md`
- F — `aidlc-docs/construction/v4-migration/code/README.md`
- F — `aidlc-docs/construction/v4-migration/infrastructure-design/deployment-architecture.md`
- F — `aidlc-docs/construction/v4-migration/infrastructure-design/infrastructure-design.md`
- F — `aidlc-docs/construction/v4-migration/nfr-design/logical-components.md`
- F — `aidlc-docs/construction/v4-migration/nfr-design/nfr-design-patterns.md`
- S — `aidlc-docs/inception/requirements/requirement-verification-questions-docmodel.md`
- S — `aidlc-docs/inception/requirements/requirement-verification-questions-u1-corpus.md`
- F — `aidlc-docs/inception/requirements/requirement-verification-questions-v4-migration.md`
- F — `ingestion/README.md`
- F — `ops/runbooks/reembed-fast-rebuild.md`

추가 검증 파일 20개:

- `aidlc-docs/construction/build-and-test/project-verification-2026-09-18.md`
- `ingestion/src/docsuri_ingestion/adapters/assets.py`
- `ingestion/src/docsuri_ingestion/adapters/aws.py`
- `ingestion/src/docsuri_ingestion/adapters/corpus_http.py`
- `ingestion/src/docsuri_ingestion/adapters/postgres.py`
- `ingestion/src/docsuri_ingestion/application.py`
- `ingestion/src/docsuri_ingestion/domain/canonical.py`
- `ingestion/src/docsuri_ingestion/http_limits.py`
- `ingestion/src/docsuri_ingestion/reembed.py`
- `ingestion/src/docsuri_ingestion/reparse.py`
- `ingestion/src/docsuri_ingestion/worker.py`
- `ingestion/src/docsuri_ingestion/xmlsafe.py`
- `ingestion/tests/test_audit_hardening.py`
- `ingestion/tests/test_canonical_dedup.py`
- `ingestion/tests/test_docmodel_build_job.py`
- `ingestion/tests/test_domain_units.py`
- `ingestion/tests/test_orchestration.py`
- `ingestion/tests/test_properties.py`
- `ingestion/tests/test_reembed.py`
- `ingestion/tests/test_runtime.py`
