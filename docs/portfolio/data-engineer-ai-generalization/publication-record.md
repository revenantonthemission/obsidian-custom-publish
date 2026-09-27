# 포트폴리오 일반화 게시 기록 — 2026-09-23

이 문서는 저장소 내부 변경·출처 기록이다. 공개 페이지의 콘텐츠가 아니며, 과거 승인을 덮어쓰거나 새로운 사람의 사실 검증을 만들어 내지 않는다.

## 게시 요청과 승인 범위

- 사용자 요청: “포트폴리오를 일반적인 데이터 엔지니어 / AI 개발 용도로 바꿔봐.”
- 후속 확인(질문 답변): 한국어 유지, 전면 개편(헤드라인·소개·이력서 요약·스킬 그룹·프로젝트 4건), receipt·digest 재발급 절차 수행 허가, 이력서 PDF 재생성 파이프라인 실행.
- 기록 시각: `2026-09-23T03:17:05Z`. 사용자 메시지의 발송 시각을 뜻하지 않는다.
- 범위: 기존 125개 팩트의 문구를 데이터 엔지니어/AI 개발 직무 관점으로 개편하고, 새 스킬 팩트 8개를 추가했다. 새 경력·학력·자격·프로젝트를 추가하거나 삭제하는 요청은 아니다.
- 기존 승인 `profile-fact-approval-2026-09-20-r2`의 변경하지 않은 사실과 근거는 승계한다. 새 `Approved` 상태는 이 요청을 코드의 승인 경계에 연결한 것이며, 사용자가 133개 사실을 새로 하나씩 검토했다는 뜻이 아니다.

## 변경한 사실과 구조

최종 팩트는 133개다. 기존 125개 중 82개는 값이 동일하고, 43개는 문구를 수정했으며, 8개를 추가했다. 삭제·중복은 없다.

- **문구 수정(43개)**: 정체성 헤드라인, 짧은 소개·상세 소개·이력서 요약·포트폴리오 요약(4), 스킬 그룹 제목 2개(`데이터·백엔드`, `인프라·배포`), DocSuri 요약·6개 차원 본문 33개, obsidian-custom-publish 요약·문제·결정·회고 4개, mcp-local-reference 요약·역할·결정·구조·성과 5개, AdiuBear 요약 1개.
- **추가(8개, E13)**: 스킬 `SQL`, `PostgreSQL`, `OpenSearch`(데이터·백엔드 그룹), 새 그룹 `AI·검색`(제목 + `Amazon Bedrock`, `Sentence Transformers`, `ChromaDB`, `Ollama`).
- **구조 변경**: 언어 그룹에서 Python을 첫 항목으로 재배열, 데이터·백엔드 그룹에 스킬 3개 추가 및 재배열, `ai-llm` 그룹 신설(order 25), 인프라 그룹 재배열, 프로젝트 순서를 DocSuri → mcp-local-reference → obsidian-custom-publish → AdiuBear로 조정. 프로젝트별 차원 block 수(2/2/8/11/5/4 등)와 근거 링크 9개는 유지했다.
- **변경하지 않은 사실**: 연락처, 한소노 경력, 학력, 자격, 근거 링크 label/destination 18개, identity-name.

DocSuri 본문은 다음 e2e 회귀 조건을 유지했다. 문제 차원의 `503`·백필·수집 표현, 역할 차원의 데이터 엔지니어·코퍼스·인프라 표현, k6 수치(`20 VU`, `664.9 ms`, `0.01%`, `전체 HTTP`, 단일 질의 반복 표현), em-dash 미사용, 내부 경로·docsuri.org 비노출.

## 근거 추가와 기존 근거 유지

E01–E12의 출처, verifier, checkedAt, 사실 ID별 membership은 변경하지 않았다. 값이 바뀐 사실도 기존 근거에 남는다.

- E13(새 user-provided): “User-directed publication of the general data-engineer/AI rescope (2026-09-23 request). The added skill facts mirror technologies evidenced by the linked DocSuri and mcp-local-reference repositories and the approved architecture facts. This is publication authorization, not a new human fact review.”
- 새 스킬 8개의 기술 근거: DocSuri 저장소·승인된 구조 본문(SQL/PostgreSQL/OpenSearch/Bedrock/Ollama), mcp-local-reference 저장소 pyproject(Sentence Transformers, ChromaDB). 새 human fact review로 기록하지 않는다.
- E09–E12의 URL 재검증은 수행하지 않았다. 기존 verifier·checkedAt을 유지한다.

## 새 receipt와 재현 기준

`site/verification/profile/fact-approval.json` 및 build-only 경계(`production-profile.ts`의 `EXPECTED_RECEIPT`)에 같은 값을 고정했다.

```json
{
  "schemaVersion": 1,
  "receiptId": "profile-fact-approval-2026-09-23-r1",
  "inventoryRevision": "profile-facts-r6",
  "inventoryDigest": "f642668821ae1edb6d94ea40a56df5e090658e60b3fa6a923ebed12aef961130",
  "productionDiffRevision": "profile-production-diff-r6",
  "productionDiffDigest": "19f2773fe78bc63250b633b70dffc37bf356246a9d5e53b776100e754716c877",
  "approvedRecordsDigest": "2d5d3ef49553348eb2b05ec1fde573bf87bead6c5448abc4d294c325cee6a19c",
  "materializedProfileDigest": "2a3c2ebe7abe12a1a88d5e563e18f5f42e93317c9c99d52d2f35b5c60820bd98",
  "decision": "Approved",
  "decisionAuditId": "PROFILE-DEAI-GENERALIZATION-20260923T031705Z",
  "decisionRecordedAt": "2026-09-23T03:17:05Z"
}
```

materialization·approved-records·production-diff는 기존 `productionProfileTesting`의 canonical SHA-256 알고리즘을 그대로 사용했다. inventory r6의 정확한 입력은 r5와 같은 payload로 계산했다.

```js
const publicationAuthorization = {
  kind: 'user-directed-editorial-publication',
  request:
    '포트폴리오를 일반적인 데이터 엔지니어 / AI 개발 직무에 넣을 수 있게 수정해봐. 전면 개편, receipt·digest 재발급, 이력서 PDF 재생성 파이프라인 실행을 함께 지시 (2026-09-23).',
  recordedAt: '2026-09-23T03:17:05Z',
  inheritedReceiptId: 'profile-fact-approval-2026-09-20-r2',
  scope:
    'Editorial rescope for general data-engineer/AI roles: reframe identity and narrative, rearrange and rename skill groups, add 8 new skill facts (E13), and rewrite all four project case studies. Not a new human review of every fact or metric.',
};
const inventoryDigest = canonicalDigest({
  domain: 'obsidian-press:profile-fact-inventory',
  schemaVersion: 1,
  revision: 'profile-facts-r6',
  evidenceSources: EVIDENCE_SOURCES,
  publicationAuthorization,
  publicSourceChecks, // E09–E12 기존 값 유지
  records,
  structuralDecisions,
});
```

계산은 빌드 파이프라인 밖의 일회성 도구로 재현했고, digest를 자동 수락하는 runtime 경로는 없다. 기존 r5 receipt는 Git 이력과 `docs/portfolio/kakaopay-data-platform/publication-record.md`에 보존된다. r5의 materialization은 레코드에 남아 있다.

## 실행 검증

- `npx vitest run tests/unit/production-profile.test.ts`: 22/22 통과. 133개 팩트·digest 일치, 변조·구조 변경 거부, private metadata 비노출, 기존 검증자 보존을 확인한다. 팩트 수와 digest 기대값을 새 값으로 갱신했다.
- `npx vitest run tests/unit tests/obligations`: 18개 파일, 238/238 통과.
- `npm run test:pbt`: 6개 파일, 37/37 통과(100회 설정).
- `npx astro check`: 150개 파일, 오류 0·경고 0. 기존 hint 6개 유지.
- `npx astro build`: 253개 페이지 생성, private approval 출력 경계 검사 통과.
- `npm run test:e2e`의 자동 Playwright 실행은 통과했고 `.artifacts/profile/verification/browser-evidence.json`의 `result`는 `pass`다(axe 16개 상태, Firefox·WebKit 매트릭스 포함).
- **전체 E2E 승인 명령은 성공으로 표시하지 않는다.** `verification.compose`에서 `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`로 종료했다. 새 화면의 수동 접근성 검토는 아직 없으므로 기존 검토자의 이름·시각을 복제하지 않았다. 현재 검토 대상 digest는 `3eb995414dfd58aea89719ec1f644c4959ed3c4ab22c51cabce4d0fbec2e933a`다.

## 이력서 PDF 재생성

`npm run resume:pdf -- --prepare`를 실행해 새 콘텐츠 기반 후보를 준비했다.

- candidateId: `87967b74aa24b42374acaaf8336dcd4c8ee9b62fd94b83d9e2fae84efdb9b90c`
- pdfSha256: `92da4b434a81783cde4231aac892d5d25383351fb706f376ea29c683844d9203`
- manifestFingerprint: `054cde423a536477d3e0f8bbf9441c09d7bf4aa8c3161dc9463072c9e589bc7c`
- 3페이지, mapped facts 61개, surfaceParity `pass`
- 후보·draft·viewer는 `.artifacts/profile/pdf/` 아래에 있다. viewer를 열어 정확한 SHA 후보를 검토한 뒤 검토 기록을 작성하고 `resume:pdf --promote <candidate-id> --review <path>`로 promo해야 한다. 공개 `site/public/resume.pdf`와 `site/verification/resume/current-release.json`은 이번 작업에서 승인·교체하지 않았다(2026-08-26 승인분 유지, `/resume`의 PDF 링크는 stale로 남는다).

## 이번 작업에서 수행하지 않은 것

- 이력서 PDF의 공개 승인(promote): 사람 검토 기록이 필요하다.
- 새 수동 웹 접근성 검토 기록(새 digest에 대한 human review).
- 외부 배포, Git 커밋·push. 승인 identity·receipt는 build/server-only 경계에 남고, 공개 페이지에는 프로젝트 문구와 공개 근거 링크만 투영한다.
- URL 재검증(E09–E12)과 새 human fact review.

## 후속 배포 — 2026-09-23

사용자 요청 “커밋하고 배포해”에 따라 커밋과 배포를 진행했다.

- 기능 커밋 `6dbc290`, `develop` 병합 커밋 `a3403f8`로 origin/develop에 push했다. 원격 반영 범위는 `site/`의 코드·테스트·빌드 승인 데이터 4개 파일이며, 본 기록과 내부 근거집 및 기존 로컬 변경(AI-DLC 문서 수정)은 원격에 포함하지 않았다.
- 이 셸에서는 iCloud Vault 읽기가 TCC `Operation not permitted`로 차단되어 진짜 전처리를 실행할 수 없었다. 로컬 `content/`(9월 1일분, fixture 페이지 포함)로 전체 배포하면 운영 사이트를 회귀시키므로, 기존과 동일한 부분 배포 방식으로 진행했다.
- 기존 운영 사이트를 `/private/tmp/obsidian-blog-deploy.YtqY/live-before`에 백업했다. 이 경로는 임시 백업이므로 영구 보관을 보장하지 않는다.
- 배포 파일: `/portfolio/index.html`, `/resume/index.html` 2개. 두 페이지가 참조하는 `/_astro` 자산은 운영본에 이미 존재해 그대로 사용한다. 검색 데이터·RSS·사이트맵·기존 글·PDF는 복사하거나 삭제하지 않았다.
- 홈페이지 hero는 프로필 팩트(이름·헤드라인·짧은 소개)가 렌더링되므로 문자열 치환만 수행했다. 이름과 게시물 목록은 건드리지 않았고, 헤드라인과 짧은 소개를 새 문구로 교체했다. 전체 빌드가 재개되면 이 치환은 빌드 출력과 일치한다.
- 검증: `https://rvnnt.dev/portfolio/`, `/resume/`, `/` 모두 HTTP 200. 127.0.0.1:8080 경유 비교에서 두 프로필 HTML은 빌드 출력과 바이트 단위로 일치했다. 공개 페이지에서 새 포트폴리오 요약·SQL 스킬·`AI·검색` 그룹·새 헤드라인 노출을 확인했다.
- 운영 사이트 전체(기존 글·검색 데이터) 최신화는 Vault 접근이 가능한 Jenkins 야간 job에 위임한다. 이력서 PDF 승인(promote)과 새 수동 웹 접근성 검토는 여전히 미완료이며, 이번 배포가 그 기록을 갱신하거나 전체 E2E 승인을 통과한 것으로 표시하지 않는다.

