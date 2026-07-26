# U1 Step 14 — Profile Fact Inventory

## 문서 상태

- **상태**: Final — explicit human fact/public-disclosure approval recorded
- **Schema version**: 1
- **Inventory revision**: `profile-facts-r2`
- **Inventory SHA-256**: `25357f9902858abeafe17a3b3016c43328852ea8dce29453e48cd83da31fa345`
- **Ordered Approved-record SHA-256**: `356356f9dc5f8b2b93e4d7bf88a3f11a8181f55f1485ed82c8994ae994aa6474`
- **Records**: 77; 모두 `Approved`, 모든 decision record는 `U1-CG-S14-FACT-APPROVAL-20260725T034431Z` / `2026-07-25T03:44:31Z`
- **Approved records**: 77
- **Approval questions**: `profile-fact-review-questions.md`
- **Digest reproduction spec**: `profile-fact-digest-spec.md`

이 문서는 production source가 아니다. 아래 normalized fact와 structural decision은 사용자가 Question 1~4에서 정확성, 공개 가능성, external destination과 exact production materialization을 함께 승인한 review artifact다. Step 15는 이 exact Approved set만 production source로 materialize할 수 있다.

## 1. Digest와 review 의미

`Inventory SHA-256`은 UTF-8 canonical JSON의 SHA-256이다. Canonical payload는 domain `obsidian-press:profile-fact-inventory`, schema/revision, evidence registry, approved external URL human-check ledger, ordered Approved records와 structural decisions를 포함한다. Object key는 사전순으로 정렬하고 array 순서는 보존한다.

`evidence registry`의 `note`와 user-source 확인 metadata는 review 설명용 registry 항목이다. 각 Approved record의 `evidence`는 runtime `FactReviewEvidence` exact-key contract에 맞춰 user-provided의 `kind/reference` 또는 public-source의 `kind/reference/expectedDestination/verifier/checkedAt`만 포함하며, 이 projection을 ordered Approved-record digest에 사용한다.

`Ordered Approved-record SHA-256`은 domain `obsidian-press:profile-approved-records`, schema version과 77개 `Approved` record 순서를 같은 방식으로 해시한다. Normalized value, evidence, surface, structure 또는 decision identity가 바뀌면 approval은 stale이며 새 revision과 재승인이 필요하다.

Exact canonical payload와 executable algorithm은 `profile-fact-digest-spec.md`의 normative JavaScript block에 있다. 그 source digest, expected output과 이 inventory의 byte equality가 일치하지 않으면 review subject는 stale이다.

## 2. Privacy와 source boundary

- 공개 résumé/portfolio 요구사항에 필요한 email과 GitHub만 연락 fact 후보로 수집했다.
- 이전 자료에 있던 비공개 범위의 연락·거주 정보와 인물 이미지는 inventory에 수집하지 않았다. 이는 `Excluded` 결정이 아니라 애초 review/production scope 밖인 non-record다.
- 기존 임시 Notion résumé/portfolio URL은 교체 대상이므로 production 후보에 넣지 않았다.
- 테스트 fixture, persona, Git author identity, filesystem username과 합성 approval은 실제 fact 근거로 사용하지 않았다.
- External URL은 source content 수집만 했으며 automated reachability 판정을 하지 않았다.

## 3. Evidence registry

| ID | kind | reference | expectedDestination | source verifier | source checkedAt | note |
|---|---|---|---|---|---|---|
| E01 | user-provided | Vault attachment 2025년하반기포트폴리오_조준희.zip의 exported PDF pp. 1–3 | N/A — user-provided local basis | 프로필 당사자(사용자) | 2026-07-25T03:44:31Z | 사용자가 보유한 이전 포트폴리오. 이번 승인에서 정확성과 공개 가능성을 확인했다. |
| E02 | public-source | https://github.com/revenantonthemission | https://github.com/revenantonthemission | Codex public-source collector | 2026-07-25T03:15:19Z | 공개 GitHub profile/API와 profile README. |
| E03 | public-source | https://github.com/revenantonthemission/obsidian-custom-publish | https://github.com/revenantonthemission/obsidian-custom-publish | Codex public-source collector | 2026-07-25T03:15:19Z | 공개 repository와 현재 workspace의 authored source/AGENTS.md. |
| E04 | public-source | https://github.com/revenantonthemission/mcp-local-reference | https://github.com/revenantonthemission/mcp-local-reference | Codex public-source collector | 2026-07-25T03:15:19Z | 공개 repository README. |
| E05 | public-source | https://github.com/revenantonthemission/AdiuBear | https://github.com/revenantonthemission/AdiuBear | Codex public-source collector | 2026-07-25T03:15:19Z | 공개 repository README와 변경 기록. |

Public-source의 source verifier는 초안 수집자를 뜻한다. 링크의 실제 의미·공개 가능성은 아래 human ledger의 프로필 당사자와 Question 2 A 응답으로 별도 승인됐다.

## 4. External URL human verification ledger

| purpose | expectedDestination | human verifier | checkedAt | status |
|---|---|---|---|---|
| GitHub 연락 CTA | https://github.com/revenantonthemission | 프로필 당사자(사용자) | 2026-07-25T03:44:31Z | Approved |
| obsidian-custom-publish evidence | https://github.com/revenantonthemission/obsidian-custom-publish | 프로필 당사자(사용자) | 2026-07-25T03:44:31Z | Approved |
| mcp-local-reference evidence | https://github.com/revenantonthemission/mcp-local-reference | 프로필 당사자(사용자) | 2026-07-25T03:44:31Z | Approved |
| AdiuBear evidence | https://github.com/revenantonthemission/AdiuBear | 프로필 당사자(사용자) | 2026-07-25T03:44:31Z | Approved |

Question 2 A의 응답 시각 `2026-07-25T03:44:31Z`을 네 행의 human `checkedAt`으로 기록했다. Destination, purpose 또는 checked-at가 바뀌면 관련 URL fact와 receipt는 재승인 전까지 stale이다.

## 5. Atomic fact records

표기의 `text("…")`, `email("…")`, `github-url("…")`, `external-url("…")`는 구현의 exact `FactReviewValue.kind/value`를 뜻한다. Period는 `period(year:YYYY→year:YYYY)` 또는 `period(year-month:YYYY-MM→year-month:YYYY-MM)`로 표시한다. `targetSurfaces`는 canonical order `resume, portfolio, homepage, metadata, pdf`의 부분수열이다.

### 5.1 Identity, narrative와 contact

| # | factId | canonicalPath | normalizedValue | evidence | targetSurfaces | requirement | status |
|---|---|---|---|---|---|---|---|
| 1 | `identity-name` | `profile.identity.name` | `text("조준희")` | E01 | `[resume,homepage,metadata,pdf]` | required | Approved |
| 2 | `identity-headline` | `profile.identity.headline` | `text("안녕하세요. IT 서비스를 만드는 조준희입니다.")` | E01 | `[resume,homepage,pdf]` | required | Approved |

| # | factId | canonicalPath | normalizedValue | evidence | targetSurfaces | requirement | status |
|---|---|---|---|---|---|---|---|
| 3 | `narrative-short-intro` | `profile.narrative.shortIntro` | `text("백엔드 프로그래밍과 인프라 엔지니어링을 공부하며, 직접 쓰는 서비스를 만들고 운영합니다.")` | E01 | `[homepage]` | required | Approved |
| 4 | `narrative-detailed-intro-0-text` | `profile.narrative.detailedIntro[0].text` | `text("의료기술 제조사 소프트웨어 개발 인턴십으로 프로젝트 경험을 시작했습니다. 현재는 백엔드 프로그래밍과 인프라 엔지니어링을 공부하며, 문제 정의부터 구현·검증·운영까지 이어지는 작업을 쌓고 있습니다.")` | E01 | `[resume,pdf]` | required | Approved |
| 5 | `narrative-resume-summary` | `profile.narrative.resumeSummary` | `text("의료기술 제조사 인턴십에서 소프트웨어 개발을 경험했고, 백엔드와 인프라를 중심으로 프로젝트를 이어가고 있습니다.")` | E01 | `[resume,metadata,pdf]` | required | Approved |
| 6 | `narrative-portfolio-summary` | `profile.narrative.portfolioSummary` | `text("문제를 정의하고 구조를 설계한 뒤, 구현·검증·운영까지 연결한 프로젝트를 소개합니다.")` | E03 | `[portfolio,metadata]` | required | Approved |

| # | factId | canonicalPath | normalizedValue | evidence | targetSurfaces | requirement | status |
|---|---|---|---|---|---|---|---|
| 7 | `contact-email` | `profile.contact.email` | `email("corpseonthemission@icloud.com")` | E02 | `[resume,portfolio,metadata,pdf]` | required | Approved |
| 8 | `contact-github` | `profile.contact.github` | `github-url("https://github.com/revenantonthemission")` | E02 | `[resume,portfolio,metadata,pdf]` | required | Approved |

### 5.2 Skill groups와 skills

| # | factId | canonicalPath | normalizedValue | evidence | targetSurfaces | requirement | status |
|---|---|---|---|---|---|---|---|
| 9 | `skill-group-languages-title` | `profile.skillGroups[id=languages].title` | `text("프로그래밍 언어")` | E01 | `[resume,pdf]` | required | Approved |
| 10 | `skill-c-name` | `profile.skillGroups[id=languages].skills[id=c].name` | `text("C")` | E02 | `[resume,pdf]` | required | Approved |
| 11 | `skill-cpp-name` | `profile.skillGroups[id=languages].skills[id=cpp].name` | `text("C++")` | E02 | `[resume,pdf]` | required | Approved |
| 12 | `skill-python-name` | `profile.skillGroups[id=languages].skills[id=python].name` | `text("Python")` | E02 | `[resume,pdf]` | required | Approved |
| 13 | `skill-javascript-name` | `profile.skillGroups[id=languages].skills[id=javascript].name` | `text("JavaScript")` | E02 | `[resume,pdf]` | required | Approved |
| 14 | `skill-typescript-name` | `profile.skillGroups[id=languages].skills[id=typescript].name` | `text("TypeScript")` | E03 | `[resume,pdf]` | required | Approved |
| 15 | `skill-dart-name` | `profile.skillGroups[id=languages].skills[id=dart].name` | `text("Dart")` | E01 | `[resume,pdf]` | required | Approved |
| 16 | `skill-rust-name` | `profile.skillGroups[id=languages].skills[id=rust].name` | `text("Rust")` | E03 | `[resume,pdf]` | required | Approved |
| 17 | `skill-group-backend-data-title` | `profile.skillGroups[id=backend-data].title` | `text("백엔드·데이터")` | E01 | `[resume,pdf]` | required | Approved |
| 18 | `skill-fastapi-name` | `profile.skillGroups[id=backend-data].skills[id=fastapi].name` | `text("FastAPI")` | E02 | `[resume,pdf]` | required | Approved |
| 19 | `skill-uvicorn-name` | `profile.skillGroups[id=backend-data].skills[id=uvicorn].name` | `text("Uvicorn")` | E01 | `[resume,pdf]` | required | Approved |
| 20 | `skill-sqlalchemy-name` | `profile.skillGroups[id=backend-data].skills[id=sqlalchemy].name` | `text("SQLAlchemy")` | E01 | `[resume,pdf]` | required | Approved |
| 21 | `skill-redis-name` | `profile.skillGroups[id=backend-data].skills[id=redis].name` | `text("Redis")` | E01 | `[resume,pdf]` | required | Approved |
| 22 | `skill-apache-kafka-name` | `profile.skillGroups[id=backend-data].skills[id=apache-kafka].name` | `text("Apache Kafka")` | E01 | `[resume,pdf]` | required | Approved |
| 23 | `skill-mysql-mariadb-name` | `profile.skillGroups[id=backend-data].skills[id=mysql-mariadb].name` | `text("MySQL/MariaDB")` | E01 | `[resume,pdf]` | required | Approved |
| 24 | `skill-group-infrastructure-title` | `profile.skillGroups[id=infrastructure].title` | `text("인프라")` | E01 | `[resume,pdf]` | required | Approved |
| 25 | `skill-docker-name` | `profile.skillGroups[id=infrastructure].skills[id=docker].name` | `text("Docker")` | E02 | `[resume,pdf]` | required | Approved |
| 26 | `skill-kubernetes-name` | `profile.skillGroups[id=infrastructure].skills[id=kubernetes].name` | `text("Kubernetes")` | E01 | `[resume,pdf]` | required | Approved |
| 27 | `skill-nginx-name` | `profile.skillGroups[id=infrastructure].skills[id=nginx].name` | `text("NGINX")` | E02 | `[resume,pdf]` | required | Approved |
| 28 | `skill-aws-name` | `profile.skillGroups[id=infrastructure].skills[id=aws].name` | `text("AWS")` | E02 | `[resume,pdf]` | required | Approved |
| 29 | `skill-github-actions-name` | `profile.skillGroups[id=infrastructure].skills[id=github-actions].name` | `text("GitHub Actions")` | E02 | `[resume,pdf]` | required | Approved |
| 30 | `skill-group-tooling-client-title` | `profile.skillGroups[id=tooling-client].title` | `text("도구·클라이언트")` | E01 | `[resume,pdf]` | required | Approved |
| 31 | `skill-flutter-name` | `profile.skillGroups[id=tooling-client].skills[id=flutter].name` | `text("Flutter")` | E01 | `[resume,pdf]` | required | Approved |
| 32 | `skill-git-name` | `profile.skillGroups[id=tooling-client].skills[id=git].name` | `text("Git")` | E01 | `[resume,pdf]` | required | Approved |
| 33 | `skill-astro-name` | `profile.skillGroups[id=tooling-client].skills[id=astro].name` | `text("Astro")` | E03 | `[resume,pdf]` | required | Approved |
| 34 | `skill-sveltekit-name` | `profile.skillGroups[id=tooling-client].skills[id=sveltekit].name` | `text("SvelteKit")` | E01 | `[resume,pdf]` | required | Approved |

### 5.3 Experience

| # | factId | canonicalPath | normalizedValue | evidence | targetSurfaces | requirement | status |
|---|---|---|---|---|---|---|---|
| 35 | `experience-hansono-organization` | `profile.experiences[id=hansono].organization` | `text("한소노")` | E01 | `[resume,pdf]` | required | Approved |
| 36 | `experience-hansono-role` | `profile.experiences[id=hansono].role` | `text("소프트웨어 개발 인턴")` | E01 | `[resume,pdf]` | required | Approved |
| 37 | `experience-hansono-period` | `profile.experiences[id=hansono].period` | `period(year-month:2023-07→year-month:2023-08)` | E01 | `[resume,pdf]` | required | Approved |
| 38 | `experience-hansono-summary` | `profile.experiences[id=hansono].summary` | `text("Flutter와 FFI를 활용한 의료기기 프로토타입 개발을 경험했습니다.")` | E01 | `[resume,pdf]` | required | Approved |
| 39 | `experience-hansono-details-0-text` | `profile.experiences[id=hansono].details[0].text` | `text("Windows 환경에서 초음파 진단기를 인식하는 Flutter 프로토타입 개발에 참여했습니다.")` | E01 | `[resume,pdf]` | required | Approved |
| 40 | `experience-hansono-details-1-text` | `profile.experiences[id=hansono].details[1].text` | `text("2023년 10월 29일부터 11월 6일까지 독일에서 한소노 소속으로 의료기술 제조사 eZono와 FFI 기반 프로토타입을 개발했습니다.")` | E01 | `[resume,pdf]` | required | Approved |

Experience의 primary period는 인턴십 근거가 제공한 `2023-07→2023-08`만 사용한다. 이후 독일 협업은 day precision을 지원하지 않는 `Period`에 억지로 합치지 않고 별도 detail text로 유지했다. 이 모델링도 Question 3의 승인 대상이다.

### 5.4 Final approved projects

| # | factId | canonicalPath | normalizedValue | evidence | targetSurfaces | requirement | status |
|---|---|---|---|---|---|---|---|
| 41 | `project-obsidian-custom-publish-title` | `profile.projects[id=obsidian-custom-publish].title` | `text("obsidian-custom-publish")` | E03 | `[resume,portfolio,metadata,pdf]` | required | Approved |
| 42 | `project-obsidian-custom-publish-outcome-summary` | `profile.projects[id=obsidian-custom-publish].outcomeSummary` | `text("Obsidian Vault를 Rust 전처리기와 Astro 정적 사이트로 변환해 rvnnt.dev에 게시하는 시스템을 구축했습니다.")` | E03 | `[resume,portfolio,metadata,pdf]` | required | Approved |
| 43 | `project-obsidian-custom-publish-problem-0-text` | `profile.projects[id=obsidian-custom-publish].problem[0].text` | `text("Obsidian Publish를 대체하면서 위키링크, 검색, 탐색 트리, 미리보기와 다이어그램을 정적 사이트에서 재현해야 했습니다.")` | E03 | `[portfolio]` | required | Approved |
| 44 | `project-obsidian-custom-publish-role-0-text` | `profile.projects[id=obsidian-custom-publish].role[0].text` | `text("저장소 소유자로서 Rust 전처리기, Astro 렌더링 경로와 배포 구성을 설계·구현하고 운영했습니다.")` | E03 | `[portfolio]` | required | Approved |
| 45 | `project-obsidian-custom-publish-key-decisions-0-text` | `profile.projects[id=obsidian-custom-publish].keyDecisions[0].text` | `text("스캔→링크→변환→검색→출력의 5-pass 전처리와 Astro 렌더링을 분리하고, 생성물과 authored source의 경계를 명시했습니다.")` | E03 | `[portfolio]` | required | Approved |
| 46 | `project-obsidian-custom-publish-architecture-0-text` | `profile.projects[id=obsidian-custom-publish].architecture[0].text` | `text("Rust CLI가 Vault를 가공해 콘텐츠와 검색·그래프·탐색 데이터를 만들고, Astro 6 사이트가 unified·rehype·Shiki·KaTeX 파이프라인으로 정적 HTML을 생성합니다.")` | E03 | `[portfolio]` | required | Approved |
| 47 | `project-obsidian-custom-publish-outcomes-0-text` | `profile.projects[id=obsidian-custom-publish].outcomes[0].text` | `text("rvnnt.dev에서 운영되는 정적 블로그와 검색·그래프·탐색 데이터를 하나의 빌드 흐름으로 생성합니다.")` | E03 | `[portfolio]` | required | Approved |
| 48 | `project-obsidian-custom-publish-lessons-0-text` | `profile.projects[id=obsidian-custom-publish].lessons[0].text` | `text("콘텐츠 문법 변환과 화면 렌더링의 책임을 분리하고 생성물을 직접 수정하지 않아야 재현 가능한 배포를 유지할 수 있음을 확인했습니다.")` | E03 | `[portfolio]` | required | Approved |
| 49 | `project-obsidian-custom-publish-evidence-label` | `profile.projects[id=obsidian-custom-publish].evidence[id=obsidian-custom-publish-repository].label` | `text("obsidian-custom-publish GitHub 저장소 보기")` | E03 | `[portfolio]` | optional | Approved |
| 50 | `project-obsidian-custom-publish-evidence-destination` | `profile.projects[id=obsidian-custom-publish].evidence[id=obsidian-custom-publish-repository].destination` | `external-url("https://github.com/revenantonthemission/obsidian-custom-publish")` | E03 | `[portfolio,metadata]` | optional | Approved |
| 51 | `project-mcp-local-reference-title` | `profile.projects[id=mcp-local-reference].title` | `text("mcp-local-reference")` | E04 | `[resume,portfolio,metadata,pdf]` | required | Approved |
| 52 | `project-mcp-local-reference-outcome-summary` | `profile.projects[id=mcp-local-reference].outcomeSummary` | `text("로컬 Zotero 라이브러리를 검색하고 PDF 텍스트·도판과 Harvard 인용을 제공하는 MCP 서버를 만들었습니다.")` | E04 | `[resume,portfolio,metadata,pdf]` | required | Approved |
| 53 | `project-mcp-local-reference-problem-0-text` | `profile.projects[id=mcp-local-reference].problem[0].text` | `text("연구 자료를 외부 서비스에 복제하지 않고 로컬 Zotero 데이터와 PDF에서 빠르게 찾고 인용 가능한 형태로 꺼낼 방법이 필요했습니다.")` | E04 | `[portfolio]` | required | Approved |
| 54 | `project-mcp-local-reference-role-0-text` | `profile.projects[id=mcp-local-reference].role[0].text` | `text("저장소 소유자로서 MCP 도구, 로컬 데이터 접근, 인덱싱과 인용 출력 흐름을 설계·구현했습니다.")` | E04 | `[portfolio]` | required | Approved |
| 55 | `project-mcp-local-reference-key-decisions-0-text` | `profile.projects[id=mcp-local-reference].keyDecisions[0].text` | `text("Zotero SQLite와 로컬 파일을 읽고 메타데이터 검색과 semantic index를 결합하며, 조회·도판 crop·인용 생성을 별도 도구로 나눴습니다.")` | E04 | `[portfolio]` | required | Approved |
| 56 | `project-mcp-local-reference-architecture-0-text` | `profile.projects[id=mcp-local-reference].architecture[0].text` | `text("Python MCP 서버가 Zotero 메타데이터, collections, PDF text·figures와 semantic index를 연결해 클라이언트 요청에 결과를 반환합니다.")` | E04 | `[portfolio]` | required | Approved |
| 57 | `project-mcp-local-reference-outcomes-0-text` | `profile.projects[id=mcp-local-reference].outcomes[0].text` | `text("서지 메타데이터 검색, 컬렉션 탐색, PDF 본문·도판 추출, Harvard 인용과 라이브러리 인덱싱을 한 로컬 서버에서 제공합니다.")` | E04 | `[portfolio]` | required | Approved |
| 58 | `project-mcp-local-reference-lessons-0-text` | `profile.projects[id=mcp-local-reference].lessons[0].text` | `text("로컬 데이터의 원본 구조를 보존하면서 검색 인덱스를 분리해야 정확한 참조와 재색인을 함께 관리할 수 있음을 배웠습니다.")` | E04 | `[portfolio]` | required | Approved |
| 59 | `project-mcp-local-reference-evidence-label` | `profile.projects[id=mcp-local-reference].evidence[id=mcp-local-reference-repository].label` | `text("mcp-local-reference GitHub 저장소 보기")` | E04 | `[portfolio]` | optional | Approved |
| 60 | `project-mcp-local-reference-evidence-destination` | `profile.projects[id=mcp-local-reference].evidence[id=mcp-local-reference-repository].destination` | `external-url("https://github.com/revenantonthemission/mcp-local-reference")` | E04 | `[portfolio,metadata]` | optional | Approved |
| 61 | `project-adiubear-title` | `profile.projects[id=adiubear].title` | `text("AdiuBear")` | E05 | `[resume,portfolio,metadata,pdf]` | required | Approved |
| 62 | `project-adiubear-outcome-summary` | `profile.projects[id=adiubear].outcomeSummary` | `text("음성·이미지·텍스트 입력을 처리하는 Flutter 앱과 Gemini 연동용 Cloud Run 미들웨어를 구현했습니다.")` | E05 | `[resume,portfolio,metadata,pdf]` | required | Approved |
| 63 | `project-adiubear-problem-0-text` | `profile.projects[id=adiubear].problem[0].text` | `text("모바일 앱에서 멀티모달 입력을 Gemini에 전달하면서 API 키를 클라이언트에 노출하지 않아야 했습니다.")` | E05 | `[portfolio]` | required | Approved |
| 64 | `project-adiubear-role-0-text` | `profile.projects[id=adiubear].role[0].text` | `text("저장소 소유자로서 Flutter 클라이언트와 Gemini 연동 방식을 구현하고 통합 방향을 반복 검토했습니다.")` | E05 | `[portfolio]` | required | Approved |
| 65 | `project-adiubear-key-decisions-0-text` | `profile.projects[id=adiubear].keyDecisions[0].text` | `text("API 키 보호를 위해 Cloud Run 미들웨어를 두었고, Live API의 응답 파싱 문서가 충분하지 않아 서버 호출 방식으로 되돌렸습니다.")` | E05 | `[portfolio]` | required | Approved |
| 66 | `project-adiubear-architecture-0-text` | `profile.projects[id=adiubear].architecture[0].text` | `text("Flutter 앱이 음성·이미지·텍스트 입력을 수집하고 Firebase·Vertex AI SDK 또는 Cloud Run 중계 계층을 통해 Gemini를 호출합니다.")` | E05 | `[portfolio]` | required | Approved |
| 67 | `project-adiubear-outcomes-0-text` | `profile.projects[id=adiubear].outcomes[0].text` | `text("멀티모달 입력 흐름과 키 보호용 중계 계층을 구현했으며, Live API 실험 결과를 바탕으로 서버 호출 방식으로 전환했습니다.")` | E05 | `[portfolio]` | required | Approved |
| 68 | `project-adiubear-lessons-0-text` | `profile.projects[id=adiubear].lessons[0].text` | `text("API 기능뿐 아니라 키 보안, 응답 파싱 문서와 운영 가능성을 함께 검토해야 통합 방식을 선택할 수 있음을 배웠습니다.")` | E05 | `[portfolio]` | required | Approved |
| 69 | `project-adiubear-evidence-label` | `profile.projects[id=adiubear].evidence[id=adiubear-repository].label` | `text("AdiuBear GitHub 저장소 보기")` | E05 | `[portfolio]` | optional | Approved |
| 70 | `project-adiubear-evidence-destination` | `profile.projects[id=adiubear].evidence[id=adiubear-repository].destination` | `external-url("https://github.com/revenantonthemission/AdiuBear")` | E05 | `[portfolio,metadata]` | optional | Approved |

프로젝트 수치는 제안하지 않았다. Source로 확인되지 않은 성능·사용자·매출·절감률 같은 정량 성과는 0건이며, 모든 outcome은 기능 또는 공개 운영 상태의 정성 서술이다.

### 5.5 Optional education와 certifications

| # | factId | canonicalPath | normalizedValue | evidence | targetSurfaces | requirement | status |
|---|---|---|---|---|---|---|---|
| 71 | `education-sogang-university-title` | `profile.education[id=sogang-university].title` | `text("서강대학교")` | E02 | `[resume,pdf]` | optional | Approved |
| 72 | `education-sogang-university-subtitle` | `profile.education[id=sogang-university].subtitle` | `text("중국문화학과·컴퓨터공학과")` | E02 | `[resume,pdf]` | optional | Approved |
| 73 | `education-sogang-university-period` | `profile.education[id=sogang-university].period` | `period(year:2019→year:2026)` | E02 | `[resume,pdf]` | optional | Approved |
| 74 | `certification-opic-ih-title` | `profile.certifications[id=opic-ih].title` | `text("OPIc IH")` | E01 | `[resume,pdf]` | optional | Approved |
| 75 | `certification-opic-ih-period` | `profile.certifications[id=opic-ih].period` | `period(year-month:2025-09→year-month:2025-09)` | E01 | `[resume,pdf]` | optional | Approved |
| 76 | `certification-hsk-6-title` | `profile.certifications[id=hsk-6].title` | `text("新HSK 6급")` | E01 | `[resume,pdf]` | optional | Approved |
| 77 | `certification-hsk-6-period` | `profile.certifications[id=hsk-6].period` | `period(year-month:2024-09→year-month:2024-09)` | E01 | `[resume,pdf]` | optional | Approved |

교육 기간은 최신 공개 GitHub의 year precision `2019→2026`을 사용한다. 이전 PDF의 `2019-03→present` 표기와 충돌하므로 자동 병합하지 않았고, 사용자가 current year-precision value를 승인했다.

## 6. Structural approval subject

Entity ID, order, block shape, relation과 optional omission은 `FactReviewRecord`가 아니지만 production diff와 함께 승인해야 한다.

| scope | id/field | order/shape | exact decision |
|---|---|---|---|
| Root | detailedIntro | paragraph block 1개 | `narrative-detailed-intro-0-text` |
| Root | additionalLinks | 빈 collection | CTA 전체 생략 |
| SkillGroup | languages | order 10 | c:10, cpp:20, python:30, javascript:40, typescript:50, dart:60, rust:70 |
| SkillGroup | backend-data | order 20 | fastapi:10, uvicorn:20, sqlalchemy:30, redis:40, apache-kafka:50, mysql-mariadb:60 |
| SkillGroup | infrastructure | order 30 | docker:10, kubernetes:20, nginx:30, aws:40, github-actions:50 |
| SkillGroup | tooling-client | order 40 | flutter:10, git:20, astro:30, sveltekit:40 |
| Experience | hansono | order 10 | paragraph detail 2개, evidence 없음 |
| Achievement | collection | 빈 collection | section 전체 생략 |
| Project | obsidian-custom-publish | order 10 | period 없음, 6 dimensions 각 paragraph 1개, evidence obsidian-custom-publish-repository:10, relation 없음 |
| Project | mcp-local-reference | order 20 | period 없음, 6 dimensions 각 paragraph 1개, evidence mcp-local-reference-repository:10, relation 없음 |
| Project | adiubear | order 30 | period 없음, 6 dimensions 각 paragraph 1개, evidence adiubear-repository:10, relation 없음 |
| Education | sogang-university | order 10 | details/evidence 없음 |
| Certification | opic-ih | order 10 | issuer/details/evidence 없음 |
| Certification | hsk-6 | order 20 | issuer/details/evidence 없음 |

Project display order는 `obsidian-custom-publish → mcp-local-reference → AdiuBear`다. 세 project는 모두 독립 project이며 Experience/Achievement relation을 갖지 않는다.

## 7. Unselected and unresolved source items

- 이전 포트폴리오의 `sogangcomputerclub.org`와 `Flutter Sample Project`는 승인된 3-project set에 포함하지 않았다. 이는 reusable `Excluded` fact가 아니라 승인 대상 밖의 unselected alternative다.
- Achievement entity는 생성하지 않는다. Required résumé highlight는 Approved Hansono Experience 한 개로 충족한다.
- Education과 두 certification은 optional entity지만 현재 Approved production set에 포함한다.
- `SvelteKit`은 이전 포트폴리오 근거의 Approved skill이다.
- 이전 포트폴리오의 별도 `Svelte` 항목은 최신 공개 GitHub profile README에서 현재 사용하지 않는 기술로 표시되어 승인된 skill set에 포함하지 않았다. 이는 자동 `Excluded` fact가 아닌 unselected alternative다.

## 8. Gate result

Required와 selected optional record 77개 전부가 Approved이고 네 external destination과 structural decisions도 같은 audit identity에 결속됐다. Step 14는 value-free `site/verification/profile/fact-approval.json`만 생성한다. Actual `site/src/lib/profile/profile-data.ts` materialization은 Step 15에서 이 inventory와 final production diff를 exact하게 따를 때만 허용한다.
