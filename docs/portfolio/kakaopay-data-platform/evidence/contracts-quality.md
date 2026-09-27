# DocSuri 근거 조사 — 데이터 계약·품질·검색 소비·협업

조사일: 2026-09-20. 기준 저장소: `/Users/revenantonthemission/Projects/DocSuri`, HEAD `32a424d`. 이 문서는 카카오페이 데이터 플랫폼 지원용 소재를 고르기 위한 내부 근거집이다. 외부 제출 문서에서는 아래의 팀 프로젝트 사실과 지원자 개인의 담당 작업을 구분해야 한다. 코드가 저장소에 있거나 작성자가 한 명으로 표시된다는 사실만으로 모든 작업을 개인 기여로 귀속하지 않았다.

지정 범위의 Markdown **111개**를 목록·제목·본문 키워드로 스캔하고, 채택한 주장과 충돌 기록의 본문을 상세 확인했다. 111개 모두를 처음부터 끝까지 정독했다는 뜻은 아니다. 세부 수는 shared 설계 7, U2 8, U7 18, U8 12, U9 10, U11 11, application-design 13, requirements 28, shared README 3, 최신 검증 보고서 1이다. 정확한 경로 목록은 끝에 보존했다. 현재 구현·테스트 대조에 사용한 코드 파일은 11개다.

근거 수준: bounded Tier 3 문서 감사, graph project `Users-revenantonthemission-Projects-DocSuri`, fast generation `2026-09-20T08:48:06Z`. 122개 증거 경로와 8개 문서 범위 모두 coverage 확인: `no_recorded_issue / metadata_match`, 범위 결과 추가 페이지 없음. 이는 인덱스 완전성 보장이 아니다. 관련 심볼 검색과 사용한 양방향 호출 추적은 전 페이지를 확인했지만 fast 그래프의 추론 엣지는 정확한 소스로 대조했다. 저장소의 다른 parse gap 두 개는 본 근거 범위에 사용하지 않았다. 이번 조사에서 테스트·외부 인프라 작업은 실행하지 않았다.

## 1. 공용 스키마와 변경 책임을 먼저 정한 병렬 개발

**채택용 문단 — 팀 구조·구현 범위:** DocSuri는 수집, 검색, 사용자 데이터, 프런트엔드가 각자 DTO를 복제하지 않도록 JSON Schema를 공용 계약으로 두고 Python Pydantic 모델을 생성하는 구조를 사용했다. 계약의 생산자와 소비자, 확정 여부, 호환성 규칙을 함께 문서화했으며, 변경 시 공용 계약 PR과 영향을 받는 유닛의 검토를 요구했다. 데이터 형상은 스키마로, 호출 동작은 Protocol 포트로 구분해 여러 작업 흐름이 같은 경계에 맞춰 개발할 수 있게 했다.

- 근거: `shared/README.md:21` 계약 원본·FROZEN/PROVISIONAL, `:35` 단일 owner·영향 유닛 sign-off, `:93` 스키마와 행위 포트 구분, `:103` Python 생성 경로. `shared/python/README.md:38` 재생성·drift 검사, `:56` roundtrip·ref·불변식 시험 목록.
- 확인 수준: 계약·생성 체계 및 당시 Python 검증 기록. 최신 감사 `aidlc-docs/construction/build-and-test/project-verification-2026-09-18.md:54`는 shared Python 73 passed, `:66`은 Python schema drift PASS를 기록한다. 이번 재실행 결과가 아니다.
- **현재 한계:** 같은 보고서 `:211` F13은 frontend generator가 일부 schema의 원격 ref 해소 실패를 건너뛰고 exit 0으로 종료하며 실제 빌드용 타입 전체를 검증하지 못한다고 기록한다. “Python/TypeScript 전 계약의 자동 정합을 보장했다”는 표현은 제외한다.
- 개인 기여로 쓰려면: 지원자가 소유한 shared 계약, 직접 제안한 변경, 영향을 받은 소비자와 실제 검토 PR을 좁혀 연결한다.

## 2. 임베딩 공간을 생산자–소비자 데이터 계약으로 관리

**채택용 문단 — 구현:** 벡터 검색에서는 모델 이름뿐 아니라 specVersion, 차원, 거리 함수, 정규화 설정을 동일 공간의 식별자로 취급했다. 문서를 쓰는 인제스천과 질의를 읽는 검색 서비스가 서로 다른 공간을 섞지 않도록 공용 비교 함수를 두고, 버전을 올리지 않은 채 모델이나 차원만 바꾸는 경우도 실패하도록 테스트했다. 문서용 입력과 질의용 입력의 역할 차이는 별도로 표현했다. 검색 데이터의 호환성 문제를 API 형상 밖의 데이터 의미까지 확장한 사례다.

- 근거: `aidlc-docs/construction/shared/vector-spec.md:5`, `:17`, `:53`; 실제 `shared/python/src/docsuri_shared/vector_spec.py:83`의 `assert_same_space`; `shared/python/tests/test_vector_spec.py:119`의 필드별 불일치 거부, `:132`의 input-type 역할 분리.
- 확인 수준: 구현과 테스트 코드 존재. 조사에서 확인된 `assert_same_space` 직접 caller는 테스트 2개다. 이를 모든 런타임·배포 경로에 강제되는 게이트로 확대하지 않는다.
- **시점 주의:** vector 설계는 Cohere v4/v2 계약의 역사적 맥락이다. 최신 감사 `project-verification-2026-09-18.md:44`는 현재 로컬 bge-m3 임베딩 경로를 기록한다. “현재 Cohere v4 운영 중”이라고 쓰지 않는다.

## 3. DocModel을 여러 소비자가 함께 쓰는 구조화 데이터로 설계

**채택용 문단 — 설계+현재 부분 구현:** 논문 원문을 요약용 텍스트, 뷰어용 화면 데이터, 에이전트용 인용 데이터로 각각 만드는 대신 DocModel을 공용 표현으로 정의했다. 읽기 순서의 fullText와 섹션·블록 트리를 함께 제공하고, 표는 행·셀 데이터, 수식은 LaTeX, 이미지는 assetId 참조로 보존한다. 출처와 parser/schema 버전을 provenance에 담아 파서가 변경됐을 때 기존 저장물과 새 소비자의 호환성을 판단할 수 있게 했다.

- 근거: `aidlc-docs/construction/shared/docmodel.md:6`, `:21`, `:34`, `:49`, `:79`; 버전 원본 `shared/python/src/docsuri_shared/docmodel_contract.py:5`부터 `:33`.
- 현재 reader 근거: `backend/modules/summarization/src/summarization/adapters/s3_docmodel.py:90`은 provenance, source tier, 최소 parser generation, schema version을 판정한다. **현재 구현은 parser가 최신 버전과 정확히 같아야만 읽히는 구조가 아니다.** 일정 기준 이상인 오래된 parser도 읽을 수 있어 “모든 구버전 즉시 차단”이라고 쓰지 않는다.
- **계약 충돌:** `docmodel.md:66`과 `aidlc-docs/construction/shared/evidence-formation-port.md:95`는 DocModel id 앵커와 레거시 U7 label/span 앵커의 충돌을 미해결로 명시한다. 모든 소비자의 앵커가 완전히 통일됐다는 주장은 제외한다.
- 가치: 데이터 생산자 변경이 검색·요약·화면·에이전트에 미치는 영향을 설명하기 좋은 사례다.

## 4. 중복 전달과 사용자의 의도적 반복을 구분한 이벤트 의미

**채택용 문단 — 구현:** 검색 이력에는 질의 문자열만으로 중복을 판단하지 않고 요청 식별자를 포함했다. 같은 이벤트가 재전달되면 이력을 추가하지 않되, 사용자가 동일한 질의를 다시 실행한 별도 요청은 새 이력으로 남긴다. 검색 결과를 반환하는 경로와 이력을 기록하는 계약을 분리하고, owner와 requestId를 중심으로 이벤트의 의미를 정의했다.

- 계약 근거: `aidlc-docs/construction/shared/events.md:85`–100의 SearchExecutedEvent, requestId, at-least-once 전제.
- 구현 근거: `backend/modules/library/services/history.py:33`은 owner·requestId·query의 dedupe key 조회 후 기록한다.
- 시험 근거: `tests/library/test_history_service.py:31`은 동일 이벤트 두 번 처리 후 한 행, `:44`는 같은 질의·같은 시각이라도 requestId가 다르면 두 행임을 확인한다.
- 확인 수준: 단위 수준 구현·회귀 시험. **분산 시스템 전체 exactly-once 보장이나 경쟁 상황의 완전한 원자성을 이 근거만으로 주장하지 않는다.** 현재 운영에 과거 EventBridge 백본이 그대로 가동 중이라는 주장도 별도 런타임 근거가 필요하다.

## 5. 검색과 요약의 의존성 실패를 각 도메인의 의미로 반환

**채택용 문단 — 구현 기록+잔여 결함:** 검색에서는 벡터 검색과 BM25 결과를 결합하고, 임베딩 의존성이 실패하면 lexical 검색으로 낮춰 응답하도록 구성했다. 인덱스 자체를 사용할 수 없는 경우와 결과가 없는 경우를 구분했으며, 요약에서는 비용 제한, 생성 의존성 장애, 원문 부재를 서로 다른 상태로 다뤘다. 같은 비용 신호라도 검색은 부분 기능을 제공할 수 있고 요약은 생성 호출을 생략해야 한다는 차이를 계약에 반영했다.

- 근거: `aidlc-docs/construction/u2-discovery/code/README.md:23` k-NN/BM25/RRF·paper dedupe, `:29` degrade matrix, `:43`–47 단일 grounding gate·fallback·fail-closed.
- 요약 근거: `aidlc-docs/construction/u7-summarization/code/README.md:24`–31, `aidlc-docs/construction/u7-summarization/nfr-design/nfr-design-patterns.md:27`–32의 비용/장애/소스 구분 및 도메인별 저하 매핑.
- **현재 한계:** 최신 감사 `project-verification-2026-09-18.md:196` F11은 empty 결과 조립이 알려진 lexical-only 상태를 정상 무결과로 지우는 결함을 확인했다. fallback 경로의 존재를 “사용자에게 모든 저하가 정확하게 전달됨”으로 확대하지 않는다.
- 당시 U2 문서의 43 tests·라이브 로컬 3 tests는 2026-06-17 기록이며 현재 성능 수치가 아니다.

## 6. 캐시 키를 결과 생성 조건과 연결하고 원문 결속의 누락을 식별

**채택용 문단 — 구현+감사 학습:** 요약·번역 캐시는 논문 ID와 버전 외에도 작업 종류, 언어, persona, 용어집, 모델·프롬프트, DocModel 세대를 구분하도록 설계했다. parser 수정으로 원문 표현이 바뀌면 이전 세대에서 만든 생성 결과를 재사용하지 않는 회귀 시험을 두었다. 이후 감사에서는 클라이언트가 보내는 abstract와 공유 캐시의 원문 식별자가 연결되지 않은 별도 오염 경로를 확인했고, 공유 생성물의 원문을 서버가 확인한 source identity에 결속해야 한다는 교정 요구사항을 정리했다.

- 구현: `backend/modules/summarization/src/summarization/domain/cache_key.py:35`–72. `backend/modules/summarization/tests/test_orchestrator.py:427`은 오래된 parser 세대로 만든 캐시를 새 parser 결과가 재사용하지 않음을 검증한다.
- 설계 배경: `aidlc-docs/construction/u7-summarization/code/README.md:28`–30. 강한 용어집 조건과 읽기 시점의 가벼운 오버레이를 분리하는 캐시 재사용 결정이 기록돼 있다.
- 감사: `project-verification-2026-09-18.md:120`–126 F02. 기본 glossary의 owner-agnostic 키에는 원문 hash가 없고 cache hit가 source 검증보다 먼저 반환되는 경로가 합성 데이터로 재현됐다.
- **교정은 계획:** `aidlc-docs/inception/requirements/verification-remediation-2026-09-18.md:36`은 server-verified source identity/content version 결속 요구사항이다. 이 조사 기준으로 F02를 수정 완료한 성과로 적지 않는다.

## 7. 행동 데이터 집계의 한도를 속성 테스트로 확인

**채택용 문단 — 구현:** 개인화는 의미 있는 행동 이벤트와 제한된 metadata를 입력으로 받고, 검색 서비스에는 작은 category/keyword boost만 제공하도록 경계를 뒀다. 개별 boost와 전체 절댓값 합에 상한을 정하고, 다양한 입력을 생성하는 속성 테스트에 세 범주의 가중치가 같은 반례를 고정해 회귀를 막았다. 개인화 저장소나 집계가 실패하면 기본 검색으로 돌아가고, 적용·폴백·실패 이유를 지표로 남기도록 구성했다.

- 규칙: `aidlc-docs/construction/u9-personalization/functional-design/business-rules.md:8`, `:20`, `:36`, `:58`, `:66`.
- 구현: `backend/modules/personalization/service.py:211` boost 조정, `:275`–310 기본값 폴백·지표.
- 테스트: `backend/tests/test_personalization.py:469` Hypothesis + 세 동일 범주 example, `:477` 개별 절댓값 ≤0.1 및 총합 ≤0.2.
- **문서 최신성 주의:** `aidlc-docs/construction/u9-personalization/code/summary.md:43`–82는 과거 shadow-only 단계와 검색 중 raw-event 미집계를 서술한다. 현재 `service.py:295`는 profile miss 시 load-or-build를 호출하며 `test_personalization.py:485`는 첫 검색의 집계·저장을 검증한다. “현재 shadow-only” 또는 “핫패스에서 집계하지 않음”은 쓰지 않는다.
- **운영 한계:** `project-verification-2026-09-18.md:245`, `:261`은 현재 환경의 90일 retention 작업 배선·실행 증거를 미확인으로 둔다.

## 8. 근거 검증의 통과율과 평가 데이터의 한계를 함께 기록

**채택용 문단 — 평가 하니스·제한된 실험 기록:** 요약의 수치 근거를 검사할 때 날조된 내용을 통과시키는 오류와 올바른 내용을 기권하는 오류를 나눠 평가하도록 하니스를 구성했다. 합성 데이터뿐 아니라 실제 논문의 수치 발췌를 바탕으로 통제된 평가 사례를 만들고 임계값을 비교했다. 구성된 평가 문장의 성적을 실제 운영 생성물의 품질로 일반화하지 않고, 자연스러운 matcher miss와 정책 경계의 불확실성을 함께 기록했다.

- 근거: `aidlc-docs/construction/u7-summarization/build-and-test/qt1-grounding-eval-corpus-spec.md:24` 사례 계약, `:37` false_pass/false_abstain, `:63` 합성 평가, `:65` 실 논문 8건의 수치 발췌 기반 18케이스 및 임계값 0.5 유지 결정.
- **정확한 숫자 범위:** 문서에는 confident 14개에서 false_pass/false_abstain 0이 기록돼 있다. faithful draft 자체는 구성된 것이며, 운영 draft의 자연 오차율을 과소평가할 수 있다고 같은 줄에 명시한다. “운영 환각 0%”, “실사용 정확도 100%”, “전체 요약 품질 보장”으로 쓰지 않는다.
- 표제의 미구축 인계 상태와 하단의 평가 갱신 기록을 함께 읽어야 한다. 최신 감사 `project-verification-2026-09-18.md:231`은 별도 F02/F03/F12로 엄격 grounding 인수 실패를 기록한다.

## 9. 인용 그래프의 불확실성과 탐색량을 데이터에 표현

**채택용 문단 — 설계·로컬 시험 기록:** 인용 그래프는 해소된 canonical ID와 미해결 참조를 구분하고, 미해결 항목을 저장하거나 확장하지 않도록 계약을 정했다. 중복 노드는 참조로 접고 순환에서 확장을 멈추며, 응답의 깊이와 노드 수를 제한했다. 외부 제공자가 실패하면 기존 snapshot을 유지하고, 잘린 결과와 부분 결과를 상태로 표현해 외부 데이터의 불확실성을 소비자가 알 수 있게 했다.

- 근거: `aidlc-docs/construction/u8-citation-graph/functional-design/business-rules.md:16` 깊이≤2·노드≤50, `:28` canonical ID·unresolved, `:36` 중복·순환, `:40` snapshot·cache fallback, `:64` 상태 계약.
- 시험 설계: `aidlc-docs/construction/u8-citation-graph/nfr-design/test-strategy.md:7`–18은 fixture provider·순환·중복·미해결·timeout 검증과 live provider의 opt-in gate를 분리한다.
- 확인 수준: 설계와 최신 감사의 부분 검증 기록. `project-verification-2026-09-18.md:241`–242에 실제 provider 계약 gate skip, 외부 citation→저장 여정 미검증이 기록돼 있다. 이번 조사에서 해당 구현 전체를 소스 감사한 것은 아니다.
- 우선순위: 데이터 플랫폼 핵심 사례의 보조 자료로 적합하며, 인제스천·계약·재처리보다 먼저 내세울 필요는 없다.

## 10. 팀 간 책임을 추상 포트와 검토 경계로 관리

**채택용 문단 — 협업 방식:** 검색·인제스천이 공통 운영 기능을 각각 구현하지 않도록 grounding, 비용 상태 조회, 관측 제출을 공용 포트에 정의했다. 근거형성 기능도 제공 유닛과 소비 유닛을 나누고 소비자가 구현 내부를 가져다 쓰지 않도록 계약을 뒀다. 공유 스키마, 앱 조립 지점, 인프라 증분을 검토가 필요한 경계로 명시해 변경의 영향과 승인 책임을 드러냈다.

- 근거: `shared/ports/README.md:22` 의존 역전, `:98` 소비자는 비용 신호 조회·판정은 제공자, `:155` EvidenceFormationPort 및 양쪽 검토; `aidlc-docs/construction/u7-summarization/code/README.md:44`–65 앱 조립·인프라 협업 경계.
- 현재 계약명·유닛명 주의: `shared/ports/README.md:157`은 evidence 구현자를 구명칭 U4로 적고, `aidlc-docs/construction/shared/evidence-formation-port.md:4`는 여전히 provisional, 다른 명세는 frozen이라고 표기한다. 최신 유닛 U11과 옛 이름·상태가 섞여 있으므로 제출 문단에서는 현재 역할 이름을 사용하고, 모든 문서가 완전히 동기화됐다고 쓰지 않는다.
- **개인 귀속:** U2 code summary에는 @kyjness, evidence 포트에는 다른 담당자가 명시돼 있다. 지원자 기여로 쓸 때는 실제 맡은 공용 계약·통합·리뷰·운영 작업만 골라야 한다. “검색·에이전트 전 기능을 단독 구현”은 이 근거로 뒷받침되지 않는다.

## 제출 초안 반영 순서와 제외할 문구

우선 반영: ① 공용 데이터 계약과 변경 책임, ② 생산자/소비자 벡터 공간 정합성, ③ DocModel 세대·파생 캐시의 재사용 조건, ④ 이벤트 중복과 의도적 반복 구분, ⑤ 속성 테스트와 운영 감사의 차이. 이는 데이터 플랫폼의 품질·재처리·계약·운영 관점으로 연결할 수 있다. 지원자의 직접 담당 근거가 확인되면 1인칭 성과 문장으로 바꾼다.

최신 감사가 확인한 **fixture 오염·공유 캐시 source 오염·TS 생성 fail-open·degraded-empty 손실**을 해결 완료로 표현하지 않는다. 문제 발견과 재현, 교정 요구사항 정리는 각각 가치가 있지만 구현 완료와 별개다. Cohere/AWS 설계와 현재 로컬 모델/스토어 운영을 구분한다. 테스트 통과 개수는 그 날짜·격리 환경·시험 범위에 한정하며 운영 SLA나 정확도 지표로 사용하지 않는다.

## 스캔 문서 목록 — 111개

다음은 이번 담당 범위의 목록·본문 검색 대상이다. 전체 DocSuri 문서의 총수가 아니며 다른 조사 담당자의 범위와 겹칠 수 있다.

- `aidlc-docs/construction/build-and-test/project-verification-2026-09-18.md`
- `aidlc-docs/construction/shared/00-shared-contracts-overview.md`
- `aidlc-docs/construction/shared/docmodel.md`
- `aidlc-docs/construction/shared/dtos.md`
- `aidlc-docs/construction/shared/events.md`
- `aidlc-docs/construction/shared/evidence-formation-port.md`
- `aidlc-docs/construction/shared/ports.md`
- `aidlc-docs/construction/shared/vector-spec.md`
- `aidlc-docs/construction/u11-evidence-agent/code/user-docmodel-backend-code-summary.md`
- `aidlc-docs/construction/u11-evidence-agent/functional-design/business-logic-model.md`
- `aidlc-docs/construction/u11-evidence-agent/functional-design/business-rules.md`
- `aidlc-docs/construction/u11-evidence-agent/functional-design/domain-entities.md`
- `aidlc-docs/construction/u11-evidence-agent/functional-design/web-references-extension.md`
- `aidlc-docs/construction/u11-evidence-agent/infrastructure-design/deployment-architecture.md`
- `aidlc-docs/construction/u11-evidence-agent/infrastructure-design/infrastructure-design.md`
- `aidlc-docs/construction/u11-evidence-agent/nfr-design/logical-components.md`
- `aidlc-docs/construction/u11-evidence-agent/nfr-design/nfr-design-patterns.md`
- `aidlc-docs/construction/u11-evidence-agent/nfr-requirements/nfr-requirements.md`
- `aidlc-docs/construction/u11-evidence-agent/nfr-requirements/tech-stack-decisions.md`
- `aidlc-docs/construction/u2-discovery/code/README.md`
- `aidlc-docs/construction/u2-discovery/functional-design/business-logic-model.md`
- `aidlc-docs/construction/u2-discovery/functional-design/business-rules.md`
- `aidlc-docs/construction/u2-discovery/functional-design/domain-entities.md`
- `aidlc-docs/construction/u2-discovery/nfr-design/logical-components.md`
- `aidlc-docs/construction/u2-discovery/nfr-design/nfr-design-patterns.md`
- `aidlc-docs/construction/u2-discovery/nfr-requirements/nfr-requirements.md`
- `aidlc-docs/construction/u2-discovery/nfr-requirements/tech-stack-decisions.md`
- `aidlc-docs/construction/u7-summarization/build-and-test/build-and-test-summary.md`
- `aidlc-docs/construction/u7-summarization/build-and-test/build-instructions.md`
- `aidlc-docs/construction/u7-summarization/build-and-test/integration-test-instructions.md`
- `aidlc-docs/construction/u7-summarization/build-and-test/qt1-grounding-eval-corpus-spec.md`
- `aidlc-docs/construction/u7-summarization/build-and-test/security-test-instructions.md`
- `aidlc-docs/construction/u7-summarization/build-and-test/unit-test-instructions.md`
- `aidlc-docs/construction/u7-summarization/code/README.md`
- `aidlc-docs/construction/u7-summarization/code/u7-multimodal-read-code-summary.md`
- `aidlc-docs/construction/u7-summarization/functional-design/business-logic-model.md`
- `aidlc-docs/construction/u7-summarization/functional-design/business-rules.md`
- `aidlc-docs/construction/u7-summarization/functional-design/domain-entities.md`
- `aidlc-docs/construction/u7-summarization/functional-design/glossary-term-decisions.md`
- `aidlc-docs/construction/u7-summarization/infrastructure-design/deployment-architecture.md`
- `aidlc-docs/construction/u7-summarization/infrastructure-design/infrastructure-design.md`
- `aidlc-docs/construction/u7-summarization/nfr-design/logical-components.md`
- `aidlc-docs/construction/u7-summarization/nfr-design/nfr-design-patterns.md`
- `aidlc-docs/construction/u7-summarization/nfr-requirements/nfr-requirements.md`
- `aidlc-docs/construction/u7-summarization/nfr-requirements/tech-stack-decisions.md`
- `aidlc-docs/construction/u8-citation-graph/functional-design/business-logic-model.md`
- `aidlc-docs/construction/u8-citation-graph/functional-design/business-rules.md`
- `aidlc-docs/construction/u8-citation-graph/functional-design/domain-entities.md`
- `aidlc-docs/construction/u8-citation-graph/infrastructure-design/configuration.md`
- `aidlc-docs/construction/u8-citation-graph/infrastructure-design/deployment-topology.md`
- `aidlc-docs/construction/u8-citation-graph/infrastructure-design/infrastructure-components.md`
- `aidlc-docs/construction/u8-citation-graph/nfr-design/logical-components.md`
- `aidlc-docs/construction/u8-citation-graph/nfr-design/patterns.md`
- `aidlc-docs/construction/u8-citation-graph/nfr-design/runtime-architecture.md`
- `aidlc-docs/construction/u8-citation-graph/nfr-design/test-strategy.md`
- `aidlc-docs/construction/u8-citation-graph/nfr-requirements/nfr-requirements.md`
- `aidlc-docs/construction/u8-citation-graph/nfr-requirements/tech-stack-decisions.md`
- `aidlc-docs/construction/u9-personalization/code/summary.md`
- `aidlc-docs/construction/u9-personalization/functional-design/business-logic-model.md`
- `aidlc-docs/construction/u9-personalization/functional-design/business-rules.md`
- `aidlc-docs/construction/u9-personalization/functional-design/domain-entities.md`
- `aidlc-docs/construction/u9-personalization/infrastructure-design/deployment-architecture.md`
- `aidlc-docs/construction/u9-personalization/infrastructure-design/infrastructure-design.md`
- `aidlc-docs/construction/u9-personalization/nfr-design/logical-components.md`
- `aidlc-docs/construction/u9-personalization/nfr-design/nfr-design-patterns.md`
- `aidlc-docs/construction/u9-personalization/nfr-requirements/nfr-requirements.md`
- `aidlc-docs/construction/u9-personalization/nfr-requirements/tech-stack-decisions.md`
- `aidlc-docs/inception/application-design/agent-chat-frontend-component-dependency.md`
- `aidlc-docs/inception/application-design/agent-chat-frontend-component-methods.md`
- `aidlc-docs/inception/application-design/agent-chat-frontend-components.md`
- `aidlc-docs/inception/application-design/agent-chat-frontend-services.md`
- `aidlc-docs/inception/application-design/agent-tool-port-contract-draft.md`
- `aidlc-docs/inception/application-design/application-design.md`
- `aidlc-docs/inception/application-design/component-dependency.md`
- `aidlc-docs/inception/application-design/component-methods.md`
- `aidlc-docs/inception/application-design/components.md`
- `aidlc-docs/inception/application-design/services.md`
- `aidlc-docs/inception/application-design/unit-of-work-dependency.md`
- `aidlc-docs/inception/application-design/unit-of-work-story-map.md`
- `aidlc-docs/inception/application-design/unit-of-work.md`
- `aidlc-docs/inception/requirements/onboarding.md`
- `aidlc-docs/inception/requirements/requirement-clarification-questions.md`
- `aidlc-docs/inception/requirements/requirement-review-questions-remediation-public-jobs-2026-09-19.md`
- `aidlc-docs/inception/requirements/requirement-verification-clarification-verification-remediation-2026-09-18.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-account-production.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-agent-chat-frontend.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-citation-graph.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-docmodel.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-literature-evidence-agent.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-multimodal-display.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-novelty-agent.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-orcid-login.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-u1-corpus.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-u10-mypage.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-u11-novelty-agent.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-u2-discovery.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-u7-summarization.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-u7.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-u9-personalization.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-v4-migration.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions-verification-remediation-2026-09-18.md`
- `aidlc-docs/inception/requirements/requirement-verification-questions.md`
- `aidlc-docs/inception/requirements/requirements.md`
- `aidlc-docs/inception/requirements/subscription.md`
- `aidlc-docs/inception/requirements/summarization-translation-pipeline.md`
- `aidlc-docs/inception/requirements/trends-notifications.md`
- `aidlc-docs/inception/requirements/verification-remediation-2026-09-18.md`
- `aidlc-docs/inception/requirements/web-references.md`
- `shared/README.md`
- `shared/ports/README.md`
- `shared/python/README.md`

## 현재 구현·시험 대조 파일 — 11개

- `backend/modules/library/services/history.py`
- `backend/modules/personalization/service.py`
- `backend/modules/summarization/src/summarization/adapters/s3_docmodel.py`
- `backend/modules/summarization/src/summarization/domain/cache_key.py`
- `backend/modules/summarization/tests/test_docmodel_endpoint.py`
- `backend/modules/summarization/tests/test_orchestrator.py`
- `backend/tests/test_personalization.py`
- `shared/python/src/docsuri_shared/docmodel_contract.py`
- `shared/python/src/docsuri_shared/vector_spec.py`
- `shared/python/tests/test_vector_spec.py`
- `tests/library/test_history_service.py`

