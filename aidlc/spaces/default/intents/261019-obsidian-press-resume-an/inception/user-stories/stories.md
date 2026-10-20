# 이력서·포트폴리오 User Stories

## 문서 상태

- **단계**: INCEPTION - User Stories / Generation
- **상세 수준**: Standard
- **상태**: 승인됨
- **승인 시각**: 2026-07-23T09:01:31Z
- **방법론**: Journey-first Hybrid
- **Story 수**: 사용자 결과 6개 + 운영 enabling 결과 4개
- **입력**:
  - `aidlc-docs/inception/requirements/requirements.md`
  - `aidlc-docs/inception/plans/story-generation-plan.md`
  - `aidlc-docs/inception/user-stories/personas.md`

## 1. Story 구조

각 story는 다음을 포함한다.

- `As a / I want / so that` 사용자 가치 문장
- 관찰 가능한 Given/When/Then acceptance criteria
- 공통 정책과 story별 제약·증거 checklist
- Persona, FR/NFR, USCN, EDGE 추적성

사용자 여정 전체를 하나의 큰 story로 만들지 않는다. 여러 작은 vertical stories가 함께 요구사항의 네 여정을 구성하며, 여러 여정에 걸친 데이터·사실 승인·품질 검증만 enabling story로 분리한다.

## 2. 용어

| 용어 | 정의 |
|---|---|
| 승인된 사실 | 사용자가 공개 가능성과 정확성을 명시적으로 검수한 신원, 연락처, 경력, 역할, 성과, 프로젝트 정보 |
| 공용 프로필 데이터 | 이력서와 포트폴리오가 함께 사용하는 저장소 소유의 타입 기반 canonical data |
| 홈페이지 전용 콘텐츠 | 홈페이지 원본으로 렌더링되지만 일반 게시물 경로와 일반 탐색면에는 노출되지 않는 콘텐츠 |
| 일반 탐색면 | 일반 글 페이지와 목록, 검색, RSS, sitemap 및 Application Design에서 같은 성격으로 판정되는 파생 탐색 출력 |
| 이력서 사본 | 브라우저 인쇄 결과 또는 버전 관리되는 다운로드 PDF |
| 검증 증거 | build, assertion, Playwright smoke, PDF 시각 검증, 예제 기반 테스트 또는 PBT 실행 결과 |

## 3. 공통 품질 및 Delivery 정책

### QP-01 — 접근성과 반응형

모든 사용자-facing story는 WCAG 2.2 AA를 목표로 시맨틱 구조, 키보드 탐색, 보이는 포커스, 명도 대비, reduced motion, 논리적 읽기 순서를 유지한다. 긴 한국어·Unicode·URL과 좁은 화면에서도 핵심 콘텐츠가 잘리거나 불필요한 가로 스크롤을 만들지 않아야 한다. 이는 완전한 준수 인증을 주장하는 조건은 아니다.

### QP-02 — 정적 동작

핵심 콘텐츠, 내부 이동, 상세 확인, 연락, 인쇄와 다운로드는 새 client-side JavaScript, 새 Preact island, 외부 런타임 API 또는 새 외부 런타임 의존성 없이 사용할 수 있어야 한다.

### QP-03 — 콘텐츠 무결성과 링크

사용자-facing 결과와 메타데이터에는 승인된 사실만 사용한다. 필수 연락 링크가 유효하지 않으면 공개 결과 생성을 실패시키고, 선택적인 프로젝트 링크가 없으면 깨진 CTA나 placeholder를 만들지 않는다.

### QP-04 — Source/Generated 경계

동작은 authored source에서 정의하고 문서화된 명령으로 생성 결과를 재현한다. generated artifact를 유일한 동작 원본으로 직접 수정하지 않는다. 외부 Vault 편집은 `Areas/Notes/Passion Project.md`로 제한하며, 접근할 수 없으면 다른 파일로 우회하지 않고 blocker로 보고한다.

### QP-05 — 검증 증거

각 story는 acceptance criteria에 맞는 예제 기반 검증 증거를 가져야 한다. 검증은 네트워크나 외부 서비스의 가용성에 의존하지 않는다. testable property가 있는 데이터 검증과 홈페이지 전용 필터링은 Functional Design에서 PBT 대상을 식별하며, PBT는 예제 기반 테스트를 대체하지 않는다.

### QP-06 — Git Flow와 배포 경계

Construction의 feature branch는 안전성이 확인된 `develop`에서 분기하고 `--no-ff`로 병합한다. 관련 없는 dirty working-tree 변경을 보존한다. 구현과 테스트 완료는 배포 승인이 아니며, 별도 요청 없이 AWS·Terraform mutation 또는 배포를 수행하지 않는다.

## 4. Story Inventory

| ID | Story | Primary Persona | 유형 |
|---|---|---|---|
| ST-U01 | 홈페이지에서 프로필 발견과 이동 | PER-01, PER-02, PER-03 | 사용자 결과 |
| ST-U02 | 핵심 이력 판단과 상세 검토 | PER-01 | 사용자 결과 |
| ST-U03 | 이력서 사본 인쇄·다운로드 | PER-01 | 사용자 결과 |
| ST-U04 | 대표 프로젝트와 작업 방식 판단 | PER-02 | 사용자 결과 |
| ST-U05 | 공개 근거 확인과 연락 | PER-01, PER-02 | 사용자 결과 |
| ST-U06 | 중복 없는 블로그 탐색 | PER-03 | 사용자 결과 |
| ST-E01 | 공용 프로필 데이터의 일관된 관리 | PER-04 | Enabling 결과 |
| ST-E02 | 승인된 사실만 공개 | PER-04 | Enabling 결과 |
| ST-E03 | 재현 가능한 예제·PBT 품질 검증 | PER-04 | Enabling 결과 |
| ST-E04 | CI에서 동일한 품질 게이트 실행 | PER-04 | Enabling 결과 |

## 5. 사용자 여정 Stories

### ST-U01 — 홈페이지에서 프로필 발견과 이동

**Persona**: PER-01, PER-02, PER-03

> **As a** 채용 담당자, 잠재 협업자 또는 블로그 독자로서,  
> **I want** 홈페이지에서 운영자의 맥락을 짧게 이해하고 내부 이력서나 포트폴리오로 이동하고 싶다.  
> **so that** 외부 서비스로 문맥을 잃지 않고 내 목적에 맞는 프로필을 살펴볼 수 있다.

**Traceability**

- **FR**: FR-003, FR-008, FR-012, FR-013
- **NFR**: NFR-001, NFR-002, NFR-003, NFR-008
- **Scenarios**: USCN-001, USCN-002, USCN-003
- **Edges**: EDGE-005, EDGE-011
- **Policies**: QP-01, QP-02, QP-04, QP-05, QP-06

**Acceptance Criteria**

| ID | Given | When | Then |
|---|---|---|---|
| AC-U01-01 | 승인된 홈페이지 콘텐츠가 생성되어 있다 | 사용자가 홈페이지를 연다 | 짧은 소개와 목적이 구분되는 Résumé·Portfolio CTA를 볼 수 있다 |
| AC-U01-02 | 사용자가 두 CTA 중 하나를 선택한다 | CTA가 실행된다 | 외부 Notion이 아니라 각각 `/resume` 또는 `/portfolio` 내부 경로로 이동한다 |
| AC-U01-03 | 사용자가 홈페이지나 두 프로필 페이지에 있다 | 공통 또는 교차 탐색을 사용한다 | 홈페이지, 이력서, 포트폴리오 사이를 목적이 분명한 링크로 이동할 수 있다 |
| AC-U01-04 | 키보드만 사용하거나 JavaScript를 사용할 수 없다 | CTA와 탐색을 순서대로 이용한다 | 모든 내부 이동을 완료하고 현재 페이지의 목적을 이해할 수 있다 |

**Constraint and Evidence Checklist**

- [ ] 홈페이지에서 임시 외부 Notion URL이 제거된다.
- [ ] 좁은 화면과 넓은 화면에서 CTA의 텍스트와 포커스가 잘리거나 가려지지 않는다.
- [ ] 홈페이지·이력서·포트폴리오 route 및 내부 링크 assertion이 통과한다.
- [ ] Playwright 키보드·반응형 smoke가 AC-U01-01~04를 확인한다.

### ST-U02 — 핵심 이력 판단과 상세 검토

**Persona**: PER-01

> **As a** 신속 심사형 채용 담당자로서,  
> **I want** 핵심 이력을 먼저 파악하고 관심 있는 상세만 선택적으로 확인하고 싶다.  
> **so that** 제한된 검토 시간 안에 적합성을 판단하면서도 필요한 근거를 놓치지 않을 수 있다.

**Traceability**

- **FR**: FR-002, FR-003, FR-004, FR-007, FR-011, FR-012, FR-013
- **NFR**: NFR-001, NFR-002, NFR-003, NFR-006, NFR-007, NFR-008
- **Scenarios**: USCN-001
- **Edges**: EDGE-005, EDGE-006, EDGE-011
- **Policies**: QP-01, QP-02, QP-03, QP-05

**Acceptance Criteria**

| ID | Given | When | Then |
|---|---|---|---|
| AC-U02-01 | 사용자가 `/resume`에 처음 진입한다 | 상세를 펼치지 않은 상태로 페이지를 읽는다 | 승인된 핵심 소개, 역량, 주요 경력 또는 대표 성과를 먼저 파악할 수 있다 |
| AC-U02-02 | 검수된 세부 경력이나 성과가 있다 | 사용자가 관심 있는 상세를 펼치거나 닫는다 | 키보드와 기본 HTML 동작으로 해당 상세를 확인하고 요약 문맥으로 돌아갈 수 있다 |
| AC-U02-03 | 선택적인 교육·자격 또는 경력 데이터가 없거나 미승인 상태다 | 이력서가 생성된다 | 빈 제목, 예시 사실 또는 placeholder 없이 해당 선택 섹션이 생략된다 |
| AC-U02-04 | 사용자가 직접 URL, 검색 결과 또는 공유 미리보기에서 접근한다 | `/resume`가 표시된다 | 페이지 목적과 실제 내용에 맞는 고유 title, description, canonical, 공유 metadata와 승인된 구조화 데이터를 확인할 수 있다 |

**Constraint and Evidence Checklist**

- [ ] 이력서는 인쇄 중심의 절제된 정보 위계와 기존 `--c-` 테마 문맥을 유지한다.
- [ ] 이력서의 사용자 대면 콘텐츠와 페이지 metadata는 고유명사·기술 식별자를 제외하고 한국어로 제공된다.
- [ ] 상세 확인에는 새 client JavaScript가 필요하지 않다.
- [ ] 긴 한국어·기술 문자열과 선택 섹션 누락에 대한 렌더링 assertion이 통과한다.
- [ ] 한국어 핵심 heading·요약·상세가 존재하고 영어 전용 대체 페이지가 아님을 content assertion으로 확인한다.
- [ ] Playwright 키보드·포커스·reduced-motion·반응형 smoke가 적용된다.
- [ ] head metadata와 JSON-LD는 승인된 화면 콘텐츠와 모순되지 않는다.

### ST-U03 — 이력서 사본 인쇄·다운로드

**Persona**: PER-01

> **As a** 신속 심사형 채용 담당자로서,  
> **I want** 검토한 이력서를 읽기 좋은 인쇄본이나 PDF로 확보하고 싶다.  
> **so that** 화면 밖에서도 같은 승인 사실을 보관하고 다음 검토에 사용할 수 있다.

**Traceability**

- **FR**: FR-002, FR-004, FR-010, FR-013
- **NFR**: NFR-001, NFR-002, NFR-007, NFR-009
- **Scenarios**: USCN-001, USCN-004
- **Edges**: EDGE-005, EDGE-008, EDGE-009, EDGE-011
- **Policies**: QP-01, QP-02, QP-03, QP-05

**Acceptance Criteria**

| ID | Given | When | Then |
|---|---|---|---|
| AC-U03-01 | 사용자가 `/resume`에서 브라우저 인쇄를 시작한다 | print media가 적용된다 | 화면 전용 탐색과 장식은 제거되고 핵심 텍스트는 잘림이나 의도하지 않은 주요 섹션 분리 없이 읽힌다 |
| AC-U03-02 | 승인된 다운로드 PDF가 제공된다 | 사용자가 PDF CTA를 실행한다 | 유효한 버전 관리 파일을 내려받아 읽을 수 있다 |
| AC-U03-03 | 웹 이력서, 인쇄 결과, PDF가 같은 승인 상태를 표현한다 | 사용자가 핵심 소개·경력·연락 정보를 비교한다 | 세 표현에서 서로 모순되지 않는 동일한 핵심 사실을 확인한다 |
| AC-U03-04 | PDF가 없거나 링크가 깨졌거나 핵심 사실이 웹과 다르다 | 완료 검증이 실행된다 | 공개 가능한 완료 상태로 처리되지 않고 명확한 실패 증거를 제공한다 |

**Constraint and Evidence Checklist**

- [ ] 일반적인 A4 출력과 흑백 또는 제한된 색상에서도 정보 위계가 유지된다.
- [ ] print-media smoke와 실제 PDF 렌더링 시각 검증을 수행한다.
- [ ] PDF 링크 assertion과 핵심 사실 parity 검증이 통과한다.
- [ ] PDF 파일명·경로·생성 방식은 Application Design 전에는 이 story가 선결하지 않는다.

### ST-U04 — 대표 프로젝트와 작업 방식 판단

**Persona**: PER-02

> **As a** 증거 중심 개발자 또는 잠재 협업자로서,  
> **I want** 선별된 대표 프로젝트를 일정한 case study 구조로 비교하고 깊이 살펴보고 싶다.  
> **so that** 문제 해결 방식, 기술적 판단과 협업 가능성을 근거 있게 평가할 수 있다.

**Traceability**

- **FR**: FR-002, FR-003, FR-005, FR-007, FR-011, FR-012, FR-013
- **NFR**: NFR-001, NFR-002, NFR-003, NFR-006, NFR-007, NFR-008
- **Scenarios**: USCN-002
- **Edges**: EDGE-002, EDGE-003, EDGE-004, EDGE-005
- **Policies**: QP-01, QP-02, QP-03, QP-05

**Acceptance Criteria**

| ID | Given | When | Then |
|---|---|---|---|
| AC-U04-01 | 승인된 대표 프로젝트가 있다 | 사용자가 `/portfolio`를 연다 | 명시된 결정적 순서로 3개 이상 6개 이하의 case study를 비교할 수 있다 |
| AC-U04-02 | 사용자가 한 case study를 검토한다 | 내용을 순서대로 읽는다 | 문제, 역할, 핵심 결정, 구조, 확인 가능한 결과, 배운 점을 모두 이해할 수 있다 |
| AC-U04-03 | 선택적인 공개 프로젝트 링크가 없거나 공개할 수 없다 | case study가 생성된다 | 깨진 CTA나 placeholder 없이 설명 자체는 완전하게 제공된다 |
| AC-U04-04 | 사용자가 직접 URL, 검색 결과 또는 공유 미리보기에서 접근한다 | `/portfolio`가 표시된다 | 페이지 목적과 실제 내용에 맞는 고유 title, description, canonical, 공유 metadata와 승인된 구조화 데이터를 확인할 수 있다 |

**Constraint and Evidence Checklist**

- [ ] 포트폴리오는 case study 구분이 선명한 시각적 구조와 기존 라이트·다크 테마를 함께 유지한다.
- [ ] 포트폴리오의 사용자 대면 콘텐츠와 페이지 metadata는 고유명사·기술 식별자를 제외하고 한국어로 제공된다.
- [ ] 프로젝트 수, 필수 field, 순서, 선택 링크에 대한 데이터·렌더링 assertion이 통과한다.
- [ ] 한국어 핵심 heading과 case-study field label이 존재함을 content assertion으로 확인한다.
- [ ] 긴 한국어, 기술명, URL이 좁은 화면에서 핵심 레이아웃을 깨지 않는다.
- [ ] Playwright 키보드·포커스·reduced-motion·반응형 smoke가 적용된다.
- [ ] head metadata와 JSON-LD는 승인된 case study 내용과 모순되지 않는다.

### ST-U05 — 공개 근거 확인과 연락

**Persona**: PER-01, PER-02

> **As a** 채용 담당자 또는 잠재 협업자로서,  
> **I want** 실제 공개 근거를 확인하고 승인된 연락 경로를 사용하고 싶다.  
> **so that** 프로필 판단을 검증하고 다음 대화로 안전하게 이동할 수 있다.

**Traceability**

- **FR**: FR-002, FR-005, FR-006, FR-013
- **NFR**: NFR-001, NFR-002, NFR-003, NFR-007, NFR-008
- **Scenarios**: USCN-001, USCN-002
- **Edges**: EDGE-004, EDGE-011
- **Policies**: QP-01, QP-02, QP-03, QP-05

**Acceptance Criteria**

| ID | Given | When | Then |
|---|---|---|---|
| AC-U05-01 | 승인된 공개 이메일과 GitHub identity가 있다 | 사용자가 이력서 또는 포트폴리오에서 연락 CTA를 찾는다 | 목적과 대상이 명확한 이메일 및 GitHub 경로를 확인할 수 있다 |
| AC-U05-02 | 저장소, 운영 페이지 또는 관련 글이 실제로 존재하고 공개 가능하다 | 사용자가 프로젝트 근거 링크를 실행한다 | 표시된 목적과 일치하는 공개 리소스로 이동한다 |
| AC-U05-03 | 선택적인 프로젝트 근거 링크가 없거나 비공개다 | 페이지가 생성된다 | 존재하지 않는 링크를 만들지 않고 나머지 승인 콘텐츠를 정상적으로 이용할 수 있다 |
| AC-U05-04 | 필수 이메일 또는 GitHub URL이 유효하지 않거나 미승인 상태다 | 공개 결과 검증이 실행된다 | 잘못된 연락 CTA가 생성되지 않고 명확한 검증 실패가 발생한다 |

**Constraint and Evidence Checklist**

- [ ] 모든 CTA는 키보드로 접근 가능하고 보조 기술에 명확한 이름과 목적을 제공한다.
- [ ] 연락과 근거 확인에는 새 client JavaScript나 연락 폼이 필요하지 않다.
- [ ] 필수 연락 링크와 선택 프로젝트 링크의 서로 다른 실패·생략 규칙을 테스트한다.
- [ ] 실제 이메일, GitHub identity 또는 프로젝트 URL을 story 예시로 추정하지 않는다.

### ST-U06 — 중복 없는 블로그 탐색

**Persona**: PER-03

> **As a** 맥락 탐색형 블로그 독자로서,  
> **I want** 홈페이지 소개를 보면서도 같은 원본을 일반 게시물로 다시 만나지 않고 싶다.  
> **so that** 글 목록, 검색, RSS와 sitemap을 실제 게시물 탐색면으로 신뢰할 수 있다.

**Traceability**

- **FR**: FR-008, FR-009, FR-013, FR-017
- **NFR**: NFR-003, NFR-004, NFR-005, NFR-006, NFR-008
- **Scenarios**: USCN-003
- **Edges**: EDGE-007, EDGE-012
- **Policies**: QP-02, QP-04, QP-05, QP-06

**Acceptance Criteria**

| ID | Given | When | Then |
|---|---|---|---|
| AC-U06-01 | `Passion Project.md`가 홈페이지 원본으로 승인되어 있다 | 사용자가 홈페이지를 연다 | 소개와 내부 프로필 CTA를 포함한 홈페이지 콘텐츠를 볼 수 있다 |
| AC-U06-02 | 사이트가 같은 원본으로 생성된다 | 사용자가 일반 글 경로·목록, 검색, RSS 또는 sitemap을 확인한다 | `/posts/passion-project`와 해당 일반 게시물 항목이 어느 명시된 탐색면에도 나타나지 않는다 |
| AC-U06-03 | 홈페이지 전용 규칙이 적용된다 | 사용자가 다른 일반 글과 탐색면을 사용한다 | 다른 게시물의 route, 목록, 검색·피드 노출은 유지된다 |
| AC-U06-04 | 허용된 외부 Vault 원본에 접근할 수 없다 | 홈페이지 콘텐츠 갱신 또는 검증을 시도한다 | 저장소의 다른 파일이나 generated output으로 우회하지 않고 blocker가 명확히 보고된다 |

**Constraint and Evidence Checklist**

- [ ] 홈페이지 전용 상태는 authored source와 전처리 규칙에서 선언적이고 재현 가능하다.
- [ ] 외부 Vault 편집은 `Areas/Notes/Passion Project.md` 하나에 한정된다.
- [ ] route 부재, 글 목록, search index, RSS, sitemap exclusion assertion이 통과한다.
- [ ] 다른 fixture 게시물 보존에 대한 예제 기반 회귀 테스트가 통과한다.
- [ ] 필터링 invariant와 idempotence 후보를 Functional Design의 PBT 분석으로 전달한다.

## 6. Cross-Journey Enabling Stories

### ST-E01 — 공용 프로필 데이터의 일관된 관리

**Persona**: PER-04

> **As a** 정확성 책임 사이트 운영자로서,  
> **I want** 공유 프로필 사실을 타입이 있는 canonical data 한 벌에서 관리하고 싶다.  
> **so that** 유효한 변경은 모든 관련 결과에 일관되게 반영되고 잘못된 입력은 공개 전에 차단된다.

**Traceability**

- **FR**: FR-001, FR-005, FR-011, FR-017
- **NFR**: NFR-004, NFR-005
- **Scenarios**: USCN-004
- **Edges**: EDGE-001, EDGE-002, EDGE-003, EDGE-004, EDGE-006
- **Policies**: QP-03, QP-04, QP-05, QP-06

**Acceptance Criteria**

| ID | Given | When | Then |
|---|---|---|---|
| AC-E01-01 | 유효하고 승인된 공용 프로필 데이터가 있다 | 공유 사실을 한 번 변경하고 결과를 생성한다 | 이력서, 포트폴리오와 관련 metadata가 중복 편집 없이 같은 변경을 반영한다 |
| AC-E01-02 | 필수값 누락, 유효하지 않은 필수 URL, 중복 식별자·순서 또는 허용 범위 밖 프로젝트 수가 있다 | validation 또는 build가 실행된다 | 잘못된 field와 규칙을 식별하는 오류로 실패하고 불완전한 공개 결과를 만들지 않는다 |
| AC-E01-03 | 선택 field 또는 선택 섹션의 데이터가 없다 | 결과를 생성한다 | 빈 heading, 깨진 CTA 또는 placeholder 없이 해당 선택 결과만 생략된다 |
| AC-E01-04 | 같은 유효 입력과 설정이 반복해서 사용된다 | 프로필 결과를 여러 번 생성한다 | 사용자에게 관찰되는 데이터와 순서는 결정적으로 동일하다 |

**Constraint and Evidence Checklist**

- [ ] 데이터 type과 validation mechanism은 Application Design 전에는 선결하지 않는다.
- [ ] 프로젝트 수 3~6, 고유 식별자, 결정적 순서, 필수·선택 URL 규칙을 검증한다.
- [ ] Domain generator는 유효한 한국어·Unicode, URL, 선택 field와 경계 프로젝트 수를 포함한다.
- [ ] 데이터 invariant PBT와 구체적 오류 예제 테스트를 상호 보완한다.

### ST-E02 — 승인된 사실만 공개

**Persona**: PER-04

> **As a** 정확성 책임 사이트 운영자로서,  
> **I want** 공개 출처로 만든 초안과 사용자가 승인한 실제 사실을 구분하고 싶다.  
> **so that** 확인되지 않은 신원, 경력, 역할, 성과 또는 연락처가 사실처럼 공개되지 않는다.

**Traceability**

- **FR**: FR-002, FR-004, FR-005, FR-006, FR-010, FR-011
- **NFR**: NFR-006, NFR-007, NFR-009
- **Scenarios**: USCN-001, USCN-002, USCN-004
- **Edges**: EDGE-004, EDGE-009
- **Policies**: QP-03, QP-05, QP-06

**Acceptance Criteria**

| ID | Given | When | Then |
|---|---|---|---|
| AC-E02-01 | 공개 GitHub와 저장소 이력으로 콘텐츠 초안이 작성된다 | 공개 근거만으로 증명할 수 없는 사실을 만난다 | 해당 사실을 추정하지 않고 사용자 검수 대상으로 명시한다 |
| AC-E02-02 | 신원, 이메일, GitHub identity, 경력, 프로젝트 선정·역할·성과·결과 또는 수치가 미승인 상태다 | 공개 페이지, metadata 또는 PDF 완료 여부를 판단한다 | 미승인 사실이나 실제 사실처럼 보이는 placeholder가 최종 결과에 포함되지 않는다 |
| AC-E02-03 | 사용자가 사실의 정확성과 공개 가능성을 명시적으로 승인한다 | 해당 프로필 결과를 생성한다 | 승인된 범위 안에서 이력서, 포트폴리오, metadata와 PDF가 같은 사실을 사용한다 |
| AC-E02-04 | 웹 이력서와 PDF의 핵심 사실이 다르다 | 콘텐츠 완료 검수가 실행된다 | 불일치가 완료를 막는 결함으로 기록된다 |

**Constraint and Evidence Checklist**

- [ ] 실제 공개 사실은 사용자의 명시적 승인 기록으로 추적된다.
- [ ] 미확인 고용 관계, 직함, 기간, 학력, 자격, 역할, 수치 결과를 만들지 않는다.
- [ ] 페이지·metadata·PDF 콘텐츠 inventory가 같은 승인 상태를 가리킨다.
- [ ] PBT는 사람의 사실 승인을 대신하지 않으며 구조적 불변 조건만 검증한다.

### ST-E03 — 재현 가능한 예제·PBT 품질 검증

**Persona**: PER-04

> **As a** 정확성 책임 사이트 운영자로서,  
> **I want** 데이터와 필터링 규칙을 예제 기반 테스트와 재현 가능한 PBT로 검증하고 싶다.  
> **so that** 알려진 회귀와 알지 못했던 경계 실패를 공개 전에 발견하고 같은 최소 사례로 다시 확인할 수 있다.

**Traceability**

- **FR**: FR-014, FR-015
- **NFR**: NFR-005
- **Scenarios**: USCN-004
- **Edges**: EDGE-010
- **Policies**: QP-05

**Acceptance Criteria**

| ID | Given | When | Then |
|---|---|---|---|
| AC-E03-01 | business rule, data transformation 또는 filtering이 적용되는 컴포넌트가 있다 | Functional Design에서 testability를 분석한다 | 각 컴포넌트에 property category 또는 PBT N/A 근거가 기록된다 |
| AC-E03-02 | 식별된 property와 핵심 예제 시나리오가 있다 | 로컬 테스트가 실행된다 | domain generator 기반 PBT와 구체적 예제 기반 테스트가 서로 다른 범위를 보완한다 |
| AC-E03-03 | property-based test가 실패하는 생성 입력을 찾는다 | framework가 실패를 보고한다 | 자동 shrinking이 동작하고 seed와 최소 counterexample으로 같은 실패를 재현할 수 있다 |
| AC-E03-04 | 같은 코드, 입력과 seed가 사용된다 | 실패 사례를 네트워크 연결 없이 다시 실행한다 | 외부 서비스 가용성과 관계없이 같은 property 실패를 재현한다 |

**Constraint and Evidence Checklist**

- [ ] ST-E01의 데이터 invariant와 ST-U06의 홈페이지 전용 filtering invariant·idempotence를 우선 분석한다.
- [ ] NFR Requirements에서 PBT 적용 언어별 framework를 선택하고 custom generator, shrinking, seed와 test-runner 통합을 확인한다.
- [ ] 비즈니스 핵심 경로에는 PBT와 별도로 명시적인 예제 기반 테스트가 존재한다.
- [ ] PBT가 발견한 최소 반례는 적절한 경우 영구 예제 기반 회귀 테스트로 추가한다.
- [ ] 테스트 fixture와 생성기는 외부 네트워크 또는 서비스에 의존하지 않는다.

### ST-E04 — CI에서 동일한 품질 게이트 실행

**Persona**: PER-04

> **As a** 정확성 책임 사이트 운영자로서,  
> **I want** 승인된 build·example·PBT 품질 게이트가 CI에서도 같은 재현 정보를 남기며 실행되기를 원한다.  
> **so that** 로컬 환경 밖에서도 회귀를 차단하고 실패를 정확히 다시 실행할 수 있다.

**Traceability**

- **FR**: FR-014, FR-015, FR-016, FR-017, FR-018
- **NFR**: NFR-005, NFR-010
- **Scenarios**: USCN-004
- **Edges**: EDGE-010
- **Policies**: QP-04, QP-05, QP-06

**Acceptance Criteria**

| ID | Given | When | Then |
|---|---|---|---|
| AC-E04-01 | 관련 예제 테스트와 PBT가 로컬에서 실행 가능하다 | Jenkins pipeline이 기능 변경을 검증한다 | 현재 저장소 구조에 맞는 경로로 해당 build와 테스트를 실행한다 |
| AC-E04-02 | CI의 property-based test가 실행된다 | 성공하거나 실패한다 | 사용한 seed가 항상 기록되고 실패 시 shrunk counterexample을 확인할 수 있다 |
| AC-E04-03 | 같은 commit과 실패 seed가 있다 | 운영자가 CI 실패를 로컬에서 재실행한다 | 외부 서비스 가용성에 의존하지 않고 같은 최소 실패를 재현할 수 있다 |
| AC-E04-04 | 관련 없는 Jenkins 부채, 배포 또는 AWS·Terraform mutation이 필요하지 않다 | 기능 완료를 검증한다 | 경로·관련 gate·seed 기록의 최소 CI 범위를 넘지 않고 배포를 수행하지 않는다 |

**Constraint and Evidence Checklist**

- [ ] Jenkins 변경은 경로 수정, 관련 테스트 실행, seed 기록의 최소 범위를 넘지 않는다.
- [ ] CI는 PBT의 shrinking을 비활성화하거나 실패를 조용히 retry하지 않는다.
- [ ] Build and Test 산출물에 실제 CI 명령, 결과, 실패 seed와 건너뛴 gate의 구체적 이유를 기록한다.
- [ ] 검증 단계에서 배포 또는 AWS mutation을 실행하지 않는다.

## 7. Journey Composition

| Scenario | Story 흐름 |
|---|---|
| USCN-001 — 채용 담당자의 빠른 이력 확인 | ST-U01 → ST-U02 → ST-U05 또는 ST-U03 |
| USCN-002 — 협업자의 프로젝트 판단 | ST-U01 → ST-U04 → ST-U05 |
| USCN-003 — 블로그 독자의 일반 탐색 | ST-U01 + ST-U06 |
| USCN-004 — 운영자의 콘텐츠 갱신 | ST-E01 → ST-E02 → ST-E03 → ST-E04, PDF 영향 시 ST-U03 |

## 8. Requirements Traceability

### 8.1 Functional Requirements

| Requirement | Stories 또는 정책 | Coverage |
|---|---|---|
| FR-001 | ST-E01 | canonical typed data와 validation |
| FR-002 | ST-U02, ST-U03, ST-U04, ST-U05, ST-E02 | 승인된 사실만 사용자 결과에 반영 |
| FR-003 | ST-U01, ST-U02, ST-U04 | 내부 `/resume`, `/portfolio`와 한국어 콘텐츠 |
| FR-004 | ST-U02, ST-U03, ST-E02 | 요약·상세 이력과 사본 일치 |
| FR-005 | ST-U04, ST-U05, ST-E01, ST-E02 | 3~6 case studies와 공개 근거 |
| FR-006 | ST-U05, ST-E02 | 승인된 이메일·GitHub CTA |
| FR-007 | ST-U02, ST-U04 | 페이지별 시각 방향을 사용자 결과의 품질로 반영 |
| FR-008 | ST-U01, ST-U06 | 홈페이지 소개·내부 CTA와 제한된 Vault 원본 |
| FR-009 | ST-U06 | 홈페이지 전용 상태와 일반 탐색면 제외 |
| FR-010 | ST-U03, ST-E02 | print CSS, versioned PDF, 사실 일치 |
| FR-011 | ST-U02, ST-U04, ST-E01, ST-E02 | 페이지별 metadata와 승인된 구조화 데이터 |
| FR-012 | ST-U01, ST-U02, ST-U04 | 홈페이지 및 프로필 교차 탐색 |
| FR-013 | QP-02, ST-U01~ST-U06 | 정적 HTML/CSS 우선과 no-JS 핵심 동작 |
| FR-014 | ST-E03, ST-E04, 각 사용자 story 증거 checklist | build, assertion, Playwright smoke |
| FR-015 | ST-E01, ST-U06, ST-E03, ST-E04 | property 식별, generator, shrinking, seed, 보완 테스트 |
| FR-016 | ST-E04 | 최소 Jenkins 경로와 PBT CI 실행 |
| FR-017 | QP-04, ST-U06, ST-E01, ST-E04 | authored/generated 경계와 재생성 |
| FR-018 | QP-06, ST-E04 | 배포 비승인 경계 |

### 8.2 Non-Functional Requirements

| Requirement | Stories 또는 정책 | Coverage |
|---|---|---|
| NFR-001 | QP-01, ST-U01~ST-U05 | 접근성 목표와 인쇄 읽기 순서 |
| NFR-002 | QP-01, ST-U01~ST-U05 | 반응형과 긴 한국어·URL |
| NFR-003 | QP-02, ST-U01~ST-U06 | 정적 성능과 새 runtime 요청 없음 |
| NFR-004 | ST-U06, ST-E01 | 선언적 홈페이지 전용 규칙과 single source |
| NFR-005 | QP-05, ST-U06, ST-E01, ST-E03, ST-E04 | 네트워크 비의존 결정성, seed와 실패 출력 |
| NFR-006 | ST-U02, ST-U04, ST-U06, ST-E02 | metadata와 일반 검색·피드 누출 방지 |
| NFR-007 | QP-03, ST-U03~ST-U05, ST-E02 | 개인정보 승인, 링크, 성과 근거 |
| NFR-008 | QP-01, QP-02, ST-U01~ST-U06 | no-JS와 reduced-motion 호환성 |
| NFR-009 | ST-U03, ST-E02 | 인쇄·PDF 품질과 사실 일치 |
| NFR-010 | QP-05, QP-06, ST-E04 | risk-proportional CI gate와 no-deploy 검증 |

### 8.3 Edge/Error Coverage

| Edge | Stories 또는 정책 | Expected Coverage |
|---|---|---|
| EDGE-001 | ST-E01 | 필수값 누락은 명확한 실패 |
| EDGE-002 | ST-U04, ST-E01 | 프로젝트 3~6 범위 강제 |
| EDGE-003 | ST-U04, ST-E01 | 고유 식별자와 결정적 순서 |
| EDGE-004 | ST-U04, ST-U05, ST-E01, ST-E02 | 필수 연락 URL 실패와 선택 링크 생략 구분 |
| EDGE-005 | QP-01, ST-U01~ST-U04 | 긴 한국어·Unicode·URL 레이아웃 |
| EDGE-006 | ST-U02, ST-E01 | 선택 섹션은 빈 표시 없이 생략 |
| EDGE-007 | ST-U06 | 일반 route·목록·search·RSS·sitemap 회귀 실패 |
| EDGE-008 | ST-U03 | PDF 파일 또는 링크 문제 실패 |
| EDGE-009 | ST-U03, ST-E02 | 웹·PDF 핵심 사실 불일치 실패 |
| EDGE-010 | ST-E03, ST-E04 | seed와 shrunk counterexample으로 로컬·CI 실패 재현 |
| EDGE-011 | QP-01, QP-02, ST-U01~ST-U05 | no-JS·reduced-motion에서도 핵심 사용 가능 |
| EDGE-012 | QP-04, ST-U06 | Vault 접근 불가를 명시적 blocker로 보고 |

## 9. Verification Evidence Matrix

| Story | Required Evidence |
|---|---|
| ST-U01 | Homepage·route·link assertions, narrow/wide Playwright keyboard smoke |
| ST-U02 | Resume content·optional-section·metadata assertions, detail keyboard/focus/reduced-motion smoke |
| ST-U03 | Print-media smoke, rendered print/PDF visual verification, PDF link and fact-parity checks |
| ST-U04 | Project-count·field·order·metadata assertions, narrow/wide portfolio smoke |
| ST-U05 | Required contact and optional evidence-link tests, accessible-name keyboard smoke |
| ST-U06 | Homepage render, route absence, post-list/search/RSS/sitemap exclusion, unrelated-post regression |
| ST-E01 | Type/build validation examples, invalid-input errors, deterministic-output and domain-invariant PBT |
| ST-E02 | User fact-approval record, content inventory and cross-surface approval-state checks |
| ST-E03 | Property inventory, domain generators, complementary examples, shrinking and local seed replay |
| ST-E04 | Jenkins build/example/PBT execution, seed output, local replay and no-deploy evidence |

## 10. INVEST Review

| Story | Independent | Negotiable | Valuable | Estimable | Small | Testable | Review Note |
|---|---|---|---|---|---|---|---|
| ST-U01 | Pass | Pass | Pass | Pass | Pass | Pass | 프로필 발견과 내부 이동이라는 한 결과 |
| ST-U02 | Pass | Pass | Pass | Pass | Pass | Pass | 이력 판단에 필요한 요약·선택 상세만 소유 |
| ST-U03 | Pass | Pass | Pass | Pass | Pass | Pass | 보관 가능한 일관된 이력서 사본 결과 |
| ST-U04 | Pass | Pass | Pass | Pass | Pass | Pass | 개별 프로젝트가 아닌 case-study 판단 capability |
| ST-U05 | Pass | Pass | Pass | Pass | Pass | Pass | 공개 근거 확인 후 연락이라는 검증 가능한 결과 |
| ST-U06 | Pass | Pass | Pass | Pass | Pass | Pass | 모든 일반 탐색면의 중복 제거를 하나의 독자 결과로 소유 |
| ST-E01 | Pass | Pass | Pass | Pass | Pass | Pass | 단일 데이터 변경과 구조적 validation 결과 |
| ST-E02 | Pass | Pass | Pass | Pass | Pass | Pass | 사람의 사실 승인이라는 독립 운영 결과 |
| ST-E03 | Pass | Pass | Pass | Pass | Pass | Pass | property 식별과 로컬 최소 반례 재현으로 한정 |
| ST-E04 | Pass | Pass | Pass | Pass | Pass | Pass | 이미 정의된 gate의 CI 실행과 재현 정보로 한정 |

`Negotiable`은 아직 schema, framework, 컴포넌트, viewport, PDF 생성 메커니즘을 고정하지 않았음을 뜻한다. `Estimable`과 `Small`은 각 story가 하나의 사용자 또는 운영 결과를 소유하고, 전체 여정·디자인·구현 작업 목록을 한 story에 합치지 않았음을 근거로 판정했다.

## 11. PBT Handoff

User Stories는 PBT enforcement table의 적용 단계가 아니므로 현재 PBT-01~10 준수 판정은 **N/A**이며 blocking finding은 없다. 이후 적용 단계로 다음 의무를 전달한다.

- **Functional Design / PBT-01**: ST-E01의 데이터 invariant와 ST-U06의 홈페이지 전용 filtering invariant·idempotence를 분석한다. 다른 컴포넌트는 property 또는 N/A 근거를 기록한다.
- **NFR Requirements / PBT-09**: PBT 적용 언어별 framework가 custom generator, shrinking, seed 재현과 기존 test runner 통합을 지원하는지 결정한다.
- **Code Generation / PBT-02~10**: ST-E03의 승인된 properties, domain generator, 예제 기반 회귀 테스트와 seed 출력을 구현 계획에 포함한다.
- **Build and Test / PBT-08**: ST-E03과 ST-E04에 따라 로컬과 Jenkins에서 PBT를 실행하고 seed와 최소 반례 재현 증거를 기록한다.

## 12. 승인 후 경계

이 stories의 승인은 사용자 결과와 acceptance criteria를 확정하지만 실제 신원·경력·프로젝트 사실, application architecture, PBT framework, PDF 생성 방식, branch divergence 해결 또는 배포를 승인하지 않는다. 해당 결정은 이후 지정된 AI-DLC 게이트에서 별도로 처리한다.
