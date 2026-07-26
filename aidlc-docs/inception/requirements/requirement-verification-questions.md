# 이력서·포트폴리오 요구사항 확인 질문

현재 요청은 사용자에게 직접 노출되는 새 기능이며 콘텐츠 구조, 유지보수 원본, 홈페이지 통합, 출력 방식, 접근성, 테스트 범위가 아직 열려 있습니다. 따라서 Requirements Analysis는 **Standard depth**로 진행합니다.

각 질문의 `[Answer]:` 뒤에 선택한 알파벳을 입력해 주세요. 원하는 선택지가 없다면 마지막 `X) Other`를 선택하고 같은 줄에 구체적인 답을 적어 주세요. 모든 질문에 답해야 다음 단계로 진행할 수 있습니다.

## Question 1
이번 개편의 가장 중요한 제품 목표와 주 사용자는 누구입니까?

A) 채용 담당자가 짧은 시간 안에 경력과 역량을 판단하도록 돕는 취업 중심 프로필

B) 블로그 독자와 동료 개발자에게 전문성과 작업 철학을 보여주는 개인 브랜드 중심 프로필

C) 채용, 협업, 블로그 독자를 동등하게 고려한 통합 프로필 (권장)

X) Other (please describe after [Answer]: tag below)

[Answer]: C) 채용, 협업, 블로그 독자를 동등하게 고려한 통합 프로필

## Question 2
새 이력서와 포트폴리오의 URL 구조는 어떻게 구성할까요?

A) 독립된 `/resume`와 `/portfolio` 페이지 두 개 (권장)

B) 하나의 `/about` 페이지 안에 Résumé와 Portfolio 섹션

C) `/resume`만 만들고 포트폴리오는 홈페이지에 통합

D) `/portfolio`만 만들고 이력서는 다운로드 문서로만 제공

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 독립된 resume와 portfolio 페이지

## Question 3
이력서와 포트폴리오 정보의 canonical source는 무엇으로 할까요?

A) 저장소 안의 타입이 있는 공용 구조화 데이터 한 벌을 두 페이지가 함께 사용 (권장)

B) 저장소 안의 Astro 페이지별 콘텐츠를 각각 직접 관리

C) Obsidian Vault의 Markdown을 canonical source로 유지

D) 핵심 경력·프로젝트 데이터는 저장소에서 관리하고 긴 설명만 Vault에서 관리하는 하이브리드

X) Other (please describe after [Answer]: tag below)

[Answer]: 저장소 안의 타입이 있는 공용 구조화 데이터 한 벌을 두 페이지가 함께 사용.

## Question 4
홈페이지 링크 원본인 외부 Vault의 `Areas/Notes/Passion Project.md`는 어떻게 처리할까요?

A) 구현 단계에서 이 파일만 범위를 제한해 수정하여 새 내부 URL로 연결하고 임시 Notion 링크를 제거하도록 허용

B) 외부 Vault는 수정하지 않고 저장소 코드만으로 홈페이지 통합 방식을 변경

C) Codex는 정확한 수정 안내만 만들고 Vault 편집은 사용자가 직접 수행

X) Other (please describe after [Answer]: tag below)

[Answer]: A)구현 단계에서 이 파일만 범위를 제한해 수정하여 새 내부 URL로 연결하고 임시 Notion 링크를 제거하도록 허용

## Question 5
실제 이력과 프로젝트 콘텐츠는 무엇을 기준으로 작성할까요?

A) 현재 Notion 페이지를 사실 기준으로 사용하되, 사용자가 export 또는 읽을 수 있는 원문을 제공

B) 사용자가 새 이력서·프로젝트 원문을 별도 Markdown이나 데이터 파일로 제공

C) 공개 GitHub와 저장소 이력을 바탕으로 초안을 만들고 사용자가 사실을 검수

D) 먼저 완성된 정보 구조와 샘플 콘텐츠를 구현하고 실제 내용은 이후 교체

X) Other (please describe after [Answer]: tag below)

[Answer]: C) 공개 GitHub와 저장소 이력을 바탕으로 초안을 만들고 사용자가 사실을 검수

## Question 6
언어 지원은 어떻게 할까요?

A) 한국어만 제공

B) 영어만 제공

C) 한국어와 영어를 별도 URL 또는 명확한 전환 기능으로 모두 제공

D) 한 페이지에서 한국어와 영어를 함께 표기

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 한국어만 제공

## Question 7
이력서의 정보 밀도는 어느 수준이 적절합니까?

A) 한 화면 또는 인쇄 1페이지에 가까운 요약형

B) 경력, 프로젝트, 기술, 교육, 자격과 성과를 모두 담는 상세형

C) 기본은 요약형으로 보여주고 세부 경력과 성과를 확장해 볼 수 있는 혼합형 (권장)

X) Other (please describe after [Answer]: tag below)

[Answer]: C) 기본은 요약형으로 보여주고 세부 경력과 성과를 확장해 볼 수 있는 혼합형 (권장)

## Question 8
포트폴리오 프로젝트는 어떻게 선정하고 관리할까요?

A) 대표 프로젝트 3~6개를 직접 선별해 case study로 관리 (권장)

B) 공개 GitHub 저장소를 가능한 한 많이 자동 또는 반자동으로 나열

C) 대표 case study와 별도의 GitHub 프로젝트 아카이브를 함께 제공

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 대표 프로젝트 3~6개를 직접 선별해 case study로 관리 (권장)

## Question 9
각 대표 프로젝트의 설명 깊이는 어느 정도로 할까요?

A) 문제, 역할, 핵심 결정, 구조, 결과, 배운 점까지 포함하는 case study (권장)

B) 한두 문단의 설명, 사용 기술, 링크만 제공하는 요약 카드

C) 블로그 글처럼 긴 서사형 프로젝트 회고

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 문제, 역할, 핵심 결정, 구조, 결과, 배운 점까지 포함하는 case study (권장)

## Question 10
연락 수단과 개인정보 공개 범위는 어떻게 할까요?

A) 공개 이메일과 GitHub 링크를 명확한 연락 CTA로 제공

B) GitHub와 기존 공개 프로필만 제공하고 이메일은 공개하지 않음

C) 별도 연락 서비스나 폼을 연동

D) 연락 CTA 없이 경력과 프로젝트 정보만 제공

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 공개 이메일과 GitHub 링크를 명확한 연락 CTA로 제공

## Question 11
시각 디자인은 기존 블로그와 어떤 관계를 가져야 합니까?

A) 현재 타이포그래피, 색상 변수, 헤더, 다크 모드를 그대로 확장한 일관된 디자인 (권장)

B) 공통 헤더와 테마만 유지하고 프로필 영역에는 더 강한 독립적 비주얼 사용

C) 이력서는 인쇄 중심의 절제된 디자인, 포트폴리오는 시각적 case study 디자인으로 분리

D) 홈페이지까지 포함해 전문 프로필 중심의 새 디자인 시스템으로 개편

X) Other (please describe after [Answer]: tag below)

[Answer]: C) 이력서는 인쇄 중심의 절제된 디자인, 포트폴리오는 시각적 case study 디자인으로 분리

## Question 12
홈페이지의 현재 `Portfolio.` 링크 목록은 어떻게 바꿀까요?

A) 짧은 자기소개와 Résumé·Portfolio CTA 카드로 교체 (권장)

B) 현재처럼 간결한 링크 목록을 유지하되 내부 URL로 변경

C) 대표 프로젝트를 홈페이지 전면에 보여주고 블로그 섹션을 그 아래로 이동

D) 표시 구조는 바꾸지 않고 URL만 내부 페이지로 변경

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 짧은 자기소개와 Résumé·Portfolio CTA 카드로 교체 (권장)

## Question 13
홈페이지 원본이면서 일반 글로도 노출되는 `/posts/passion-project` 중복은 어떻게 처리할까요?

A) 홈페이지 원본으로만 사용하고 일반 글, 검색, RSS, sitemap에서는 제외 (권장)

B) 일반 글은 유지하되 이력서·포트폴리오 섹션만 제거

C) 현재처럼 홈페이지와 일반 글에 동일 콘텐츠를 의도적으로 유지

D) 홈페이지가 Vault 글에 의존하지 않도록 바꾸고 `passion-project`는 일반 글로 전환

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 홈페이지 원본으로만 사용하고 일반 글, 검색, RSS, sitemap에서는 제외 (권장)

## Question 14
이력서 인쇄와 다운로드는 어떻게 지원할까요?

A) 브라우저 인쇄에 최적화된 print CSS만 제공

B) print CSS와 버전 관리되는 다운로드 PDF를 함께 제공 (권장)

C) 다운로드 PDF만 제공하고 웹 이력서는 화면 탐색에 집중

D) 인쇄나 PDF는 이번 범위에서 제외

X) Other (please describe after [Answer]: tag below)

[Answer]: B) print CSS와 버전 관리되는 다운로드 PDF를 함께 제공 (권장)

## Question 15
접근성 품질 목표는 어느 수준으로 잡을까요?

A) WCAG 2.2 AA를 목표로 시맨틱 구조, 키보드 탐색, 포커스, 명도 대비, reduced motion을 검증 (권장)

B) 현재 블로그의 접근성 수준과 관례를 그대로 따름

C) WCAG 2.2 AA 목표에 자동화된 접근성 검사까지 필수 게이트로 추가

X) Other (please describe after [Answer]: tag below)

[Answer]: A) WCAG 2.2 AA를 목표로 시맨틱 구조, 키보드 탐색, 포커스, 명도 대비, reduced motion을 검증 (권장)

## Question 16
성능과 브라우저 동작 원칙은 무엇으로 할까요?

A) 정적 HTML/CSS 우선, 새 클라이언트 JavaScript와 외부 런타임 의존성은 만들지 않음 (권장)

B) 필터, 섹션 확장, 언어 전환 등을 위해 가벼운 Preact 상호작용 허용

C) 외부 API, 이미지 CDN, 임베드 등 풍부한 기능을 위해 추가 런타임 의존성 허용

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 정적 HTML/CSS 우선, 새 클라이언트 JavaScript와 외부 런타임 의존성은 만들지 않음 (권장)

## Question 17
검색·공유를 위한 메타데이터 범위는 어떻게 할까요?

A) 페이지별 title, description, canonical, Open Graph, Twitter 카드, 적절한 구조화 데이터까지 제공 (권장)

B) 페이지별 title, description, canonical만 제공

C) 현재 공통 메타데이터를 그대로 사용

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 페이지별 title, description, canonical, Open Graph, Twitter 카드, 적절한 구조화 데이터까지 제공 (권장)

## Question 18
이번 기능의 검증 범위는 어느 수준으로 할까요?

A) Astro build, 라우트·콘텐츠·링크 단언, Playwright 반응형/접근성/인쇄 smoke test까지 수행 (권장)

B) Astro build와 라우트·콘텐츠·링크 단언만 수행

C) 기존 기준인 Astro build만 수행

X) Other (please describe after [Answer]: tag below)

[Answer]: A) Astro build, 라우트·콘텐츠·링크 단언, Playwright 반응형/접근성/인쇄 smoke test까지 수행 (권장)

## Question 19
역공학에서 발견한 기존 문제를 이번 작업 범위에 포함할까요?

A) 이력서·포트폴리오와 직접 관련된 변경만 수행하고 Jenkins, Terraform, 전처리기 부채는 제외 (권장)

B) 새 페이지를 실제 CI로 빌드하는 데 필요한 Jenkins 경로 문제만 함께 수정

C) 관련 CI 품질 게이트와 생성물 경계 문제까지 함께 정리

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 이력서·포트폴리오와 직접 관련된 변경만 수행하고 Jenkins, Terraform, 전처리기 부채는 제외 (권장)

## Question 20
`main`과 `develop`의 분기 때문에 막힌 feature branch 기준은 어떻게 해결할까요?

A) Construction 전에 history rewrite 없이 `main`을 `develop`에 병합해 기준을 정리한 뒤 `develop`에서 feature branch 생성

B) 사용자가 분기 상태를 별도로 정리하고 준비됐다고 알려준 뒤 Construction 시작

C) Inception 문서화는 계속하고 구체적인 해결 방법은 Workflow Planning 승인 게이트에서 결정 (권장)

X) Other (please describe after [Answer]: tag below)

[Answer]: C) Inception 문서화는 계속하고 구체적인 해결 방법은 Workflow Planning 승인 게이트에서 결정 (권장)


## Question 21
Resiliency Baseline 확장 규칙을 적용할까요?

이 확장은 AWS Well-Architected Reliability 원칙에 기반한 설계 시점의 방향성 지침입니다. 고가용성, 관측성, 복구, 변경 관리 등을 점검하지만 운영 준비 완료나 가용성·RTO·RPO를 보증하지는 않습니다.

A) 적용 — 비즈니스 핵심 워크로드를 위한 방향성 기준으로 사용

B) 적용하지 않음 — 개인 정적 사이트 범위에서는 빠른 반복을 우선

X) Other (please describe after [Answer]: tag below)

[Answer]: B) 적용하지 않음 — 개인 정적 사이트 범위에서는 빠른 반복을 우선

## Question 22
Security Baseline 확장 규칙을 적용할까요?

A) 적용 — 모든 SECURITY 규칙을 blocking constraint로 강제 (프로덕션 애플리케이션 권장)

B) 적용하지 않음 — 현재 개인 정적 사이트의 기존 보안 범위를 유지

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 적용 — 모든 SECURITY 규칙을 blocking constraint로 강제 (프로덕션 애플리케이션 권장)

## Question 23
Property-Based Testing 확장 규칙을 적용할까요?

A) 전체 적용 — 비즈니스 로직, 데이터 변환, 직렬화, 상태 컴포넌트에 모두 강제

B) 부분 적용 — 순수 함수와 직렬화 round-trip에만 적용

C) 적용하지 않음 — UI 중심의 얇은 정적 페이지이므로 예제 기반 테스트 사용

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 전체 적용 — 비즈니스 로직, 데이터 변환, 직렬화, 상태 컴포넌트에 모두 강제
