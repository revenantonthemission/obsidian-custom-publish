# DocSuri 전수 탐색 범위·기여 구분·추가 설계 소재

조사일: 2026-09-20. 이 문서는 지원 원고의 내부 근거집이다. 확인 가능한 경험을 넓게 보존하되, 팀의 설계·구현과 지원자 개인 기여, 실제 운영 기록과 앞으로 할 일을 구분한다.

## 1. 문서 전체를 어떻게 살펴보았는가

기준 저장소는 `/Users/revenantonthemission/Projects/DocSuri`, HEAD는 `32a424d1d58204bdab8810967fadecfe317457a2`다. 추적 중인 파일과 Git ignore에 걸리지 않는 미추적 파일을 함께 열거했다. 따라서 9월의 미추적 검증·교정 문서도 포함되지만, 저장소의 과거 모든 리비전·무시된 백업·의존성 캐시까지 조사한 것은 아니다.

| 구분 | 범위와 처리 |
|---|---|
| 문서 후보 | Markdown·MDX·RST·TXT·PDF·DOCX 확장자 419개 |
| 프로젝트 문서 | 356개. 텍스트 355개와 팀 프로젝트 계획서 DOCX 1개 |
| 텍스트 탐색 | 355개 전체 본문을 읽는 프로그램으로 장애·성능·데이터 계약·중복·재처리·운영·비용·역할 관련 표현 검색 |
| 추가 확인 | DOCX를 텍스트로 추출해 확인하고 아키텍처 PNG 2개를 시각 확인 |
| 제외 | 공통 에이전트 규칙·일반 개발 템플릿·의존성 목록·비밀번호 사전 등 63개. 지원자의 프로젝트 경험을 증명하는 자료로 사용하지 않음 |
| 상세 대조 | 관련 설계·코드 요약·감사·런북 본문, 구현·테스트 소스, 작성자·변경 이력 |

**전체 본문 검색은 355개를 모든 줄 수작업 정독했다거나 모든 기능을 검증했다는 뜻이 아니다.** 관련 근거를 선별해 정독하고, 중요한 주장과 충돌하는 최신 문서·소스·기여 기록을 대조했다. 한 문서에 여러 시점의 기록이 있으면 사건별 날짜를 분리했다. 재현 가능한 목록·파일 크기·행 수·SHA-256·검색 결과 수·coverage 상태는 [document-inventory.json](document-inventory.json)에 보존했다. 이 목록은 로컬 조사 시점의 파일 내용 기준이며 HEAD만으로 미추적 자료까지 복원할 수는 없다.

codebase-memory의 **bounded Tier 3 문서 감사**를 적용했다. DocSuri graph generation은 `2026-09-20T08:48:06Z`다. 356개 문서 경로를 모두 coverage 확인한 결과 350개는 기록된 문제 없음·metadata 일치, 6개는 의도적 제외였다. 제외된 DOCX, `aidlc-docs/scripts/README.md`, `tools/aidlc-designreview/` 문서 3개, `tools/aidlc-traceability/README.md`는 원문으로 확인했다. 이미지도 원문을 확인했다. 범위 조회의 추가 페이지는 없었고, 그래프가 보고한 다른 파일의 parse gap을 본문 근거로 사용하지 않았다. 이 결과는 인덱스나 구현 전체의 완전성을 보장하지 않는다.

분야별 조사 목록은 서로 겹친다. 각 근거집의 문서 수를 합해 전체 문서 수로 표현하지 않는다.

- [수집·정규화·DocModel·재처리·재색인](data-pipelines.md)
- [장애·성능·관측·비용·복구·환경 이전](operations.md)
- [공용 계약·데이터 품질·소비자·협업](contracts-quality.md)

## 2. 개인 담당 범위의 확정 근거

[팀 계획서 Markdown](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/inception/plans/hackathon-proposal.md:82)과 [DOCX 원본](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/inception/plans/DocSuri-팀프로젝트-계획서.docx)의 팀원 표를 대조했다. 4인 팀에서 **준희 — Data Engineer**가 맡은 범위는 U1 corpus 파이프라인, arXiv·Semantic Scholar·OpenAlex 멀티소스 수집, DocModel 구조화, 임베딩·색인, 코퍼스 구축이다. 인프라 담당 사실은 사용자의 이번 대화 설명과 후속 운영 커밋으로 함께 확인했다.

- 백엔드 리드·검색·요약 및 에이전트 기능의 초기 담당자는 별도로 기록되어 있다. U2/U7/U11의 모든 기능을 본인의 구현 성과로 합치지 않는다.
- Markdown의 `(본인)`은 해당 계획서를 쓴 다른 팀원을 뜻한다. 지원자에게 그대로 대입하지 않는다.
- 계획의 5주 일정과 이후 운영·개인 개선 시기를 구분한다. 7월 이후 커밋이 있으므로 프로젝트 전체가 5주 만에 종료됐다고 단정하지 않는다.
- 코퍼스·인프라의 주요 개인 개선은 `revenantonthemission` 작성 이력과 사용자 진술이 함께 뒷받침한다. 최초 공통 운영 유닛의 모든 구현까지 단독 소유한 것으로 확대하지 않는다.

계획서의 문헌 조사 시간 50% 절감, Top-5 적중률 80% 이상, 검색 p95 3초 이내, 환각 방지 관련 목표는 **목표값**이다. 실제 사용자 효과·정확도·운영 SLA로 사용하지 않는다. 계획서의 일부 기술 표기 역시 현재 소스와 다르므로 현재 기술 목록의 단독 근거로 쓰지 않는다.

## 3. 문서·리뷰 도구를 프로젝트에 맞게 고친 경험

[traceability 도구 README](/Users/revenantonthemission/Projects/DocSuri/tools/aidlc-traceability/README.md:17)는 기존 규칙 기반 파서가 한국어 요구사항 표제, 인라인 요구사항 ID, 모노레포의 코드 경로를 충분히 해석하지 못한 문제와 패치를 기록한다. 상위 도구를 포크하고 한국어 번호 섹션의 FR/NFR/SEC/RES/QT ID, 유닛과 코드 계획 관계, 프로젝트 경로 규칙을 인식하도록 보완했다. `90236f99`와 `72a76918`의 작성자는 `revenantonthemission`으로 확인했다.

**채택 문단:** 개발 문서가 많아질수록 요구사항과 구현 사이의 연결을 찾기 어려워져, 기존 추적성 도구를 프로젝트 문서 구조에 맞게 수정했습니다. 한국어 요구사항 ID와 모노레포 경로, 유닛별 계획을 해석하도록 파서를 보완해 요구사항→스토리→유닛→코드 관계를 점검할 수 있게 했습니다. 자동 보고서를 구현 완료의 증거로 삼지 않고, 누락된 연결과 추가 검토 대상을 찾는 데 사용했습니다.

README의 936 relationships·917 edges와 단계별 coverage 수치는 당시 **문서 파서가 찾은 관계**다. 기능 시험 커버리지, 요구사항 구현률 또는 서비스 품질 수치가 아니다. [design-review 보고서](/Users/revenantonthemission/Projects/DocSuri/tools/aidlc-designreview/review.md)는 AI 생성 검토 의견이며 그 자체로 모든 결함의 확인·수정을 증명하지 않는다. [이슈 동기화 절차](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/scripts/README.md)는 US-ID 기준 생성·갱신 규칙과 자동 닫기를 하지 않는 범위를 보여주지만, 이번 조사에서 외부 이슈를 만들거나 수정하지 않았다.

## 4. 확장 기능 문서에서 건진 데이터 플랫폼 설계 소재

아래 내용도 버리지 않고 보존한다. 다만 직접 구현·운영한 증거가 충분한 핵심 파이프라인 사례와 같은 1인칭 성과로 섞지 않는다. 본문에서는 소비자 요구를 이해한 맥락 또는 후속 설계 검토 항목으로 사용한다.

| 소재 | 문서에서 확인한 결정 | 서술 범위 |
|---|---|---|
| 관심사 온보딩 | `interest_set` 이벤트를 기존 개인화 집계로 전달하고 프로파일을 직접 덮어쓰지 않음. 건너뛰기에는 이벤트를 만들지 않음 | 집계·TTL 규칙을 보존하려는 설계. 문서의 DRAFT 상태와 구현 증거를 구분 |
| 주제 알림 | 주제 등록·수정 시 임베딩, 정기 작업은 벡터 재사용. 성공적으로 보낸 경우에만 `lastSentAt` 전진, 사용자별 실패 격리 | watermark와 재처리 의미를 설명하는 설계. 실제 스케줄 정상 가동·전달 보장은 별도 검증 필요 |
| 구독·사용 한도 | free/plus 등급의 한도를 기존 비용 제어 경로에 전달. 당시 유료 결제는 없고 관리자 부여 방식 | 결제·매출 시스템 구현 경험으로 바꾸지 않음. 모델별 비용 예산은 추정/설정값 |
| 사용자 라이브러리 | owner별 namespace, 저장 시점 메타데이터 snapshot, unique key, keyset pagination | 팀의 초기 설계·구현 기록. 실제 EventBridge 전달이나 모든 경쟁 조건의 원자성을 보장하지 않음 |
| 사용자 PDF | 공용 계약 PR→ingestion→backend→frontend 순서, owner/job/recordRef 및 `userdoc:` 식별자 사용. 외부 논문 ID를 허위로 생성하지 않음 | 데이터 출처·소유권·처리 상태의 계약 사례. 9월 감사에서 읽기 권한 결함이 별도 확인되어 완전한 격리 주장 금지 |
| 인용 그래프 | canonical ID가 해소되지 않은 참조를 구별하고, 순환·중복·탐색량·부분 결과를 표현 | 팀의 소비자 설계 사례. 실제 외부 provider 전체 여정 검증과 구분 |

주요 원문:

- [온보딩 설계](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u14-onboarding/functional-design/functional-design.md)
- [알림 설계](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u15-trends-notifications/functional-design/functional-design.md)
- [사용 한도 설계](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u16-subscription/functional-design/functional-design.md)
- [라이브러리 초기 구현 요약](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/u4-library/code/u4-library-code-summary.md)
- [사용자 DocModel 계약](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/plans/user-docmodel-contract.md)

## 5. 최신 감사·교정 계획에서 가져올 것과 가져오지 않을 것

[9월 18일 검증 보고서](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/build-and-test/project-verification-2026-09-18.md)와 [교정 요구사항](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/inception/requirements/verification-remediation-2026-09-18.md)는 현재 상태를 과거 성공 기록과 대조하는 자료다. 코퍼스의 fixture 혼입, source identity에 결속되지 않은 공유 캐시, 사용자 문서 읽기 권한, 일부 타입 생성 실패의 성공 처리, 저하 상태 누락 등이 남아 있다.

원고에는 **색인 문서 수·테스트 통과만으로 실제 데이터 품질을 보증할 수 없었다는 한계와 후속 검증 기준**을 반영한다. 이 조사에서 새로 재현하거나 고치지 않았으므로 지원자가 모든 감사 실험을 수행했다거나 교정을 완료했다고 쓰지 않는다.

9월 교정 설계의 TLS/mTLS, 불변 manifest·서명, offline 계약, outbox, 복원 리허설, RPO/RTO 등은 미래 요구사항·승인된 계획을 포함한다. [플랫폼 교정 NFR](/Users/revenantonthemission/Projects/DocSuri/aidlc-docs/construction/rem-1-platform-integrity/nfr-requirements/nfr-requirements.md)의 승인과 배포·실증을 동일시하지 않는다. 또한 RDS 암호화 전환 계획을 실제 완료한 암호화 이행으로 쓰지 않는다.

## 6. 원고 반영 원칙

핵심 원고에는 직접 담당한 수집·가공·재처리·장애·운영 개선과 확인된 작성 이력을 우선한다. 공용 스키마·벡터 의미·이벤트 중복·생성 품질 등 다른 유닛과 맞물리는 내용은 **협업한 팀 구조와 소비자 요구**로 표시한다. 계획뿐인 좋은 아이디어와 현재 결함은 이 근거집에 보존해 면접에서 구현 여부를 오인하지 않도록 한다.

문서 조사는 읽기 전용으로 진행했다. DocSuri 코드·진행 중 변경·외부 인프라·큐·이슈·배포를 변경하지 않았고, 애플리케이션 테스트나 부하 시험도 실행하지 않았다. 최종 수정 대상은 별도 포트폴리오 원고와 이 근거집뿐이다.
