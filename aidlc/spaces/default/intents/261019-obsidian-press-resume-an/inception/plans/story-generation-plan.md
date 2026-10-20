# Story Generation Plan

## 문서 상태

- **단계**: INCEPTION - User Stories / Planning
- **상태**: Generation 완료 — User Stories 승인됨
- **Artifact 승인**: 2026-07-23T09:01:31Z
- **Plan 승인**: 2026-07-23T08:44:59Z
- **답변 검증**: 2026-07-23T08:39:06Z — A/A/A, 유효하며 모순 없음
- **상세 수준**: Standard
- **입력**: `aidlc-docs/inception/requirements/requirements.md`
- **산출물**:
  - `aidlc-docs/inception/user-stories/personas.md`
  - `aidlc-docs/inception/user-stories/stories.md`

## 1. 목적

승인된 요구사항을 사용자 가치 중심의 persona와 INVEST stories로 변환한다. 각 story는 구현 작업 목록이 아니라 사용자가 달성하려는 결과, 검증 가능한 acceptance criteria, 요구사항 추적성을 표현한다.

## 2. Story Development 원칙

- 사용자 대면 기능은 채용 담당자, 협업자, 블로그 독자의 실제 여정을 기준으로 표현한다.
- 콘텐츠 관리, 사실 승인, PBT·CI처럼 직접 화면 기능이 아닌 범위는 사이트 운영자의 가치에 연결된 enabling story로 표현할 수 있다.
- story는 하나의 독립적으로 검증 가능한 사용자 결과를 중심으로 작게 유지한다.
- acceptance criteria는 구현 파일이나 함수보다 관찰 가능한 행동과 결과를 서술한다.
- 접근성, 정적 동작, 반응형, 메타데이터, 콘텐츠 무결성 같은 품질 조건은 적용되는 story에서 추적 가능해야 한다.
- PBT framework, schema 타입, 컴포넌트 구조 같은 아직 승인되지 않은 설계 결정을 story에서 미리 확정하지 않는다.
- 실제 이메일, 경력, 성과, 프로젝트 사실을 story 문서에서 만들어 내지 않는다.

## 3. Story Breakdown 선택지

| 접근 | 장점 | 주의점 |
|---|---|---|
| User Journey-Based | 홈페이지 발견부터 판단·연락·인쇄까지 사용자 흐름이 선명함 | 공용 데이터와 CI 같은 enabling 범위를 별도로 연결해야 함 |
| Feature-Based | 이력서, 포트폴리오, 홈페이지, PDF별 범위가 명확함 | persona 가치보다 화면 또는 컴포넌트 목록으로 흐르기 쉬움 |
| Persona-Based | 채용·협업·독자·운영자 요구의 차이가 잘 드러남 | 여러 persona가 공유하는 기능이 중복될 수 있음 |
| Domain-Based | 프로필 데이터, 게시물 가시성, 문서 출력, 품질처럼 규칙별 응집도가 높음 | 최종 사용자 여정이 분절될 수 있음 |
| Epic-Based | 큰 결과 아래 stories를 계층화해 추적하기 쉬움 | epic이 너무 크면 story 독립성과 작음 기준이 약해질 수 있음 |
| Hybrid | 사용자 여정 중심 story와 여러 여정에 걸친 운영 enabling story를 함께 사용 가능 | 어떤 결과를 enabling story로 분리할지 명확한 규칙이 필요함 |

### 3.1 확정 방법론

- **Breakdown**: 네 사용자 여정을 중심으로 구성하고 공용 데이터, 홈페이지 전용 필터, PDF 일치, PBT·CI처럼 여러 여정에 걸친 운영 결과만 별도 enabling story로 분리하는 Journey-first Hybrid 방식
- **Granularity**: 독립적으로 검증 가능한 작은 사용자 결과 단위의 vertical story와 필요한 enabling story
- **Story statement**: `As a / I want / so that` 구조
- **Acceptance criteria**: 관찰 가능한 핵심 행동은 Given/When/Then으로 작성하고 제약·증거 checklist와 FR/NFR/USCN/EDGE 참조로 보완
- **Personas**: 채용 담당자, 개발자·잠재 협업자, 블로그 독자, 사이트 운영자
- **Quality placement**: 공통 품질 정책과 story별 적용 기준을 함께 기록
- **Content approval**: 사이트 운영자의 독립 story와 영향을 받는 공개 기능 story에 모두 연결
- **PBT·CI**: 운영자 품질·재현성 enabling story와 PBT 대상 규칙 story에 연결
- **Edge/error behavior**: 관련 story의 acceptance criteria에 포함하고 독립적인 사용자 가치가 있는 복구 결과만 별도 story로 분리
- **Traceability**: story별 persona 및 FR/NFR/USCN/EDGE ID와 향후 테스트 증거 matrix
- **Clarification result**: 추가 clarification 불필요

## 4. 실행 체크리스트

### Planning

- [x] 승인된 요구사항과 네 가지 사용자 시나리오를 읽는다.
- [x] User Stories 실행 필요성을 평가하고 `user-stories-assessment.md`에 기록한다.
- [x] 가능한 breakdown 접근과 trade-off를 비교한다.
- [x] story 품질에 영향을 주는 미확정 방법론 결정을 질문으로 만든다.
- [x] 모든 `[Answer]:` 값을 수집하고 선택지 문자와 설명을 검증한다.
- [x] 답변 사이의 모순, 모호함, 승인된 요구사항과의 충돌을 분석한다.
- [x] clarification이 필요하지 않음을 확인해 별도의 질문 파일을 생성하지 않는다.
- [x] 확정된 persona, granularity, format, breakdown, traceability 규칙을 이 계획에 반영한다.
- [x] story generation plan 승인 프롬프트를 audit에 기록한다.
- [x] 사용자의 명시적인 plan 승인을 기록한다.

### Generation — Personas

- [x] 승인된 persona 구성에 따라 `personas.md`를 생성한다.
- [x] 각 persona의 목표, 동기, 주요 질문, 제약, 성공 상태를 정의한다.
- [x] 실제 개인이나 확인되지 않은 경력 사실을 persona에 투영하지 않는다.
- [x] 각 persona를 관련 story ID에 매핑한다.

### Generation — Stories

- [x] 승인된 breakdown 방식에 따라 epic 또는 story group을 구성한다.
- [x] `As a / I want / so that` 형태의 사용자 가치 문장을 작성한다.
- [x] 각 story에 승인된 형식의 acceptance criteria를 작성한다.
- [x] 정상 흐름과 관련 edge/error behavior를 승인된 방식으로 포함한다.
- [x] 각 story를 관련 persona 및 FR/NFR ID에 매핑한다.
- [x] 콘텐츠 사실 승인과 공용 프로필 관리 범위를 story로 추적한다.
- [x] 홈페이지 전용 `passion-project` 동작을 사용자 관찰 결과로 추적한다.
- [x] 이력서 인쇄·PDF와 포트폴리오 case study 결과를 story로 추적한다.
- [x] PBT·seed·CI 의무를 승인된 enabling story 방식으로 추적한다.

### Quality Review

- [x] 모든 story가 Independent, Negotiable, Valuable, Estimable, Small, Testable인지 검토한다.
- [x] 두 story가 같은 사용자 결과를 중복 소유하지 않는지 확인한다.
- [x] 모든 FR-001~FR-018이 하나 이상의 story 또는 명시적 공통 정책에 매핑되는지 확인한다.
- [x] 모든 NFR-001~NFR-010이 적용 story 또는 공통 품질 기준에 매핑되는지 확인한다.
- [x] 구현 기술, 우선순위, 일정 또는 sprint task가 story에 섞이지 않았는지 확인한다.
- [x] `personas.md`와 `stories.md`의 상호 참조와 Markdown을 검증한다.
- [x] 완료된 generation checklist를 모두 `[x]`로 갱신한다.
- [x] User Stories 완료 프롬프트를 audit에 기록하고 승인 게이트를 제시한다.

## 5. Story Planning Questions

승인된 요구사항으로 다음 항목은 이미 확정되어 다시 질문하지 않는다.

- 채용 담당자, 개발자·잠재 협업자, 블로그 독자, 사이트 운영자의 네 persona를 사용한다.
- 각 story를 persona와 FR/NFR/USCN/EDGE ID에 연결하고 향후 검증 증거 matrix를 제공한다.
- 공통 품질 정책을 정의하되 적용되는 story에도 관련 조건을 연결한다.
- 사실 검수는 사이트 운영자의 독립 story와 영향을 받는 공개 기능 story 모두에서 추적한다.
- PBT·shrinking·seed·CI는 운영자 가치의 enabling story와 관련 비즈니스 규칙 story에 연결한다.
- edge/error behavior는 관련 story의 acceptance criteria에 포함하고 독립적 사용자 가치가 있는 복구 결과만 별도 story로 만든다.
- 실제 신원·경력·프로젝트 사실, framework, schema, viewport, PDF 메커니즘은 각각 승인된 이후 게이트에서 확정한다.
- feature branch는 `develop` 기반 Git Flow를 따르며, 현재 branch divergence의 안전한 해결은 Workflow Planning에서 다루므로 story 방법론 질문으로 다시 열지 않는다.

아래 세 질문의 `[Answer]:` 뒤에 선택한 알파벳을 입력해 주세요. 원하는 선택지가 없으면 마지막 `X) Other`를 선택하고 같은 줄에 구체적인 규칙을 적어 주세요. 모든 질문이 답변되고 모호함이 해소되어야 plan 승인 단계로 진행할 수 있습니다.

## Question 1
stories를 어떤 구조로 나누는 것이 가장 적합합니까?

A) 네 사용자 여정을 중심으로 구성하고, 공용 데이터·홈페이지 전용 필터·PDF 일치·PBT/CI처럼 여러 여정에 걸친 운영 결과만 enabling story로 분리하는 Hybrid 방식 (권장)

B) 홈페이지 발견부터 연락·인쇄까지 순서대로 나누는 User Journey-Based 방식

C) 홈페이지, 이력서, 포트폴리오, PDF, 품질처럼 기능별로 나누는 Feature-Based 방식

D) 채용 담당자, 협업자, 독자, 운영자별로 나누는 Persona-Based 방식

E) 큰 사용자 결과를 Epic으로 묶고 그 아래에 하위 stories를 두는 Epic-Based 방식

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 네 사용자 여정을 중심으로 구성하고, 공용 데이터·홈페이지 전용 필터·PDF 일치·PBT/CI처럼 여러 여정에 걸친 운영 결과만 enabling story로 분리하는 Hybrid 방식 (권장)

## Question 2
개별 story의 granularity는 어떻게 잡을까요?

A) 독립적으로 검증 가능한 작은 사용자 결과 단위의 vertical story와 필요한 enabling story로 나눔 (권장)

B) 홈페이지 발견부터 판단·연락·인쇄까지 큰 end-to-end 사용자 여정 하나를 story 하나로 묶음

C) CTA, 상세 펼치기, 인쇄, 다운로드처럼 개별 상호작용마다 매우 작은 story로 분리

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 독립적으로 검증 가능한 작은 사용자 결과 단위의 vertical story와 필요한 enabling story로 나눔 (권장)

## Question 3
acceptance criteria 형식은 무엇으로 할까요?

A) 관찰 가능한 핵심 행동은 Given/When/Then으로 쓰고, 제약·증거 checklist와 FR/NFR/USCN/EDGE 참조로 보완 (권장)

B) 모든 acceptance criteria를 Given/When/Then으로만 작성

C) 모든 acceptance criteria를 검증 checklist로만 작성

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 관찰 가능한 핵심 행동은 Given/When/Then으로 쓰고, 제약·증거 checklist와 FR/NFR/USCN/EDGE 참조로 보완 (권장)

## 6. 답변 검증 규칙

- 모든 3개 `[Answer]:`가 비어 있지 않아야 한다.
- 답변은 해당 질문의 유효한 선택지 문자로 시작해야 한다.
- `X`를 선택하면 같은 줄에 적용 규칙을 구체적으로 설명해야 한다.
- 승인된 requirements의 제품 범위나 확정 결정을 다시 여는 답변은 충돌로 기록하고 clarification을 요청한다.
- `혼합`, `상황에 따라`, `아마도`처럼 판단 기준이 없는 답변은 clarification 대상이다.
- 유효한 답변을 바탕으로 계획의 미완료 Planning 체크리스트를 순서대로 수행한다.

## 7. 계획 승인과 Generation 경계

답변을 검증한 뒤 확정 방법론을 이 문서에 반영하고 별도의 plan 승인 게이트를 제시한다. 사용자의 명시적 plan 승인 전에는 `personas.md` 또는 `stories.md`를 생성하지 않는다.
