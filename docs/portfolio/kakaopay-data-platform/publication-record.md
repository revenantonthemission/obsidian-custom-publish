# 포트폴리오 페이지 반영 기록 — 2026-09-20

이 문서는 공개 페이지의 콘텐츠가 아닌 저장소 내부 변경·출처 기록이다. 과거 승인 문서와 검증자를 덮어쓰거나 새로운 사람의 사실 검증을 만들어 내지 않는다.

## 게시 요청과 승인 범위

- 사용자 요청: “이제 그걸 실제 블로그의 포트폴리오 페이지에 구현해”
- 기록 시각: `2026-09-20T09:35:34Z`. 요청 메시지 자체의 발송 시각을 뜻하지 않는다.
- 범위: 앞서 작성·근거 대조한 [지원용 원고](portfolio.md)를 실제 `/portfolio`에 반영한다. 새 경력·학력·자격·기술 숙련도를 추가하는 요청은 아니다.
- 기존 승인 `profile-fact-approval-2026-08-26-r1`의 변경하지 않은 사실과 근거는 승계한다. 새 `Approved` 상태는 이 특정 원고의 게시 요청을 코드의 승인 경계에 연결한 것이며, 사용자가 125개 사실·모든 수치를 새로 하나씩 검토했다는 뜻이 아니다.
- 원고의 근거는 [리서치](research.md), `evidence/`의 소스·커밋·운영 기록 대조에 따른다. HTTP 접근 성공은 기여 범위나 운영 수치의 인간 검증을 대신하지 않는다.

## 변경한 사실과 구조

기존 89개 fact 중 15개의 문구를 수정하고 36개를 추가했다. 삭제·중복은 없으며 최종 125개다. 기존 사실 74개는 값이 동일하다.

- 기존 문구 수정: 포트폴리오 소개 1개, DocSuri 요약·6개 차원 7개, 블로그 요약·문제·결정·성과·회고 5개, MCP 프로젝트 결정·회고 2개.
- 추가: DocSuri 본문 26개와 근거 링크 3개의 label/destination 6개, 블로그 본문 2개와 근거 링크 1개의 label/destination 2개.
- 새 본문은 개인 담당 범위와 팀 구현, AWS 과거 운영과 현행 단일 호스트, 통제된 평가와 서비스 전체 지표를 구분한다. 현재 품질 문제와 측정 조건의 한계도 포함한다.
- 기존 `paragraph`/`list` 모델로 표현한다. DocSuri 6개 차원의 block 수는 `2/2/2/6/5/4`, 근거 링크는 5개다. 블로그 문제·성과는 각각 paragraph 2개, 근거 링크는 2개다.
- identity/contact/skillGroups/experiences/achievements/education/certifications, 이력서 전용 소개, AdiuBear는 변경하지 않았다. 다만 프로젝트 공통 요약은 `/resume`에도 투영된다.

사실 ID별 근거 소속은 `site/src/lib/profile/production-profile.ts`의 정적 allowlist에 명시했다. candidate를 읽어 자동으로 승인 ID를 늘리는 경로는 추가하지 않았다. shape·URL 목적지·정확한 receipt key·digest 검증은 그대로 fail-closed다.

## 근거와 URL 확인의 의미

기존 E01–E07의 출처, verifier, checkedAt 값은 유지했다. 기존에 수정하지 않은 사실은 기존 근거에 남는다.

- E08: 새 본문 28개와 수정 문구 15개, 총 43개의 게시 원고·근거집 참조. `user-provided`는 사용자의 **게시 요청**을 기존 근거 타입에 표현한 것이며, 사용자가 모든 문장을 직접 제공하거나 새로 검증했다는 뜻이 아니다. reference에도 새 human fact review가 아님을 명시했다.
- E09–E12: 새 외부 링크 4개와 각각의 label/destination. `2026-09-20T09:30:23Z`까지 `curl -L`로 모두 HTTP 200 및 동일 최종 URL을 확인했다.
- 새 URL verifier는 `Codex HTTP reachability collector (HTTP 200 only)`다. 이전 Codex/Claude verifier를 새 검증자로 바꾸지 않았고, 새 human URL review라고 기록하지 않았다.

| 근거 | 확인한 공개 목적지 |
| --- | --- |
| E09 | `https://github.com/80-hours-a-week/DocSuri/commit/7edbcc51` |
| E10 | `https://github.com/80-hours-a-week/DocSuri/pull/323` |
| E11 | `https://github.com/80-hours-a-week/DocSuri/pull/420` |
| E12 | `https://github.com/revenantonthemission/obsidian-custom-publish/commit/f82c9eb370f34470d0c930b9e89630f7fceb278e` |

## 새 receipt와 재현 기준

`site/verification/profile/fact-approval.json` 및 build-only 경계에 같은 값을 고정했다.

```json
{
  "schemaVersion": 1,
  "receiptId": "profile-fact-approval-2026-09-20-r1",
  "inventoryRevision": "profile-facts-r4",
  "inventoryDigest": "6c2cabccd2c08665c0959d5c1ea050e227afce3134acbc3198c5fc81537774df",
  "productionDiffRevision": "profile-production-diff-r4",
  "productionDiffDigest": "a11bdc31249ec329b87f759901519181df1c77999e661454f929141479e6000a",
  "approvedRecordsDigest": "0c2a8a5f00317f19f9a184aa9462f88c253a700cff54c887437f6cd0592bc394",
  "materializedProfileDigest": "6c261396ae32e95a38c4a4bff2fa4d63138098092a91c561e3eca23f8717f1a4",
  "decision": "Approved",
  "decisionAuditId": "PROFILE-PUBLICATION-20260920T093534Z",
  "decisionRecordedAt": "2026-09-20T09:35:34Z"
}
```

materialization・approved-records・production-diff는 기존 `productionProfileTesting`의 canonical SHA-256 알고리즘을 그대로 사용했다. object key는 정렬하고 array 순서는 보존한다. inventory r4의 정확한 입력은 다음과 같다. 이름이 있는 변수는 `production-profile.ts`의 상수 또는 materialize/buildReviewRecords 결과이며, 생성된 digest를 자동 수락하는 runtime 경로는 없다.

```js
const publicationAuthorization = {
  kind: 'user-directed-publication',
  request: '이제 그걸 실제 블로그의 포트폴리오 페이지에 구현해',
  recordedAt: '2026-09-20T09:35:34Z',
  inheritedReceiptId: 'profile-fact-approval-2026-08-26-r1',
  scope: 'Publish the source-grounded KakaoPay portfolio adaptation; not a new human review of every fact or metric.',
};
const publicSourceChecks = Object.fromEntries(
  Object.entries(EVIDENCE_SOURCES)
    .filter(([id]) => ['E09', 'E10', 'E11', 'E12'].includes(id))
    .map(([id, evidence]) => [id, {
      url: evidence.expectedDestination,
      status: 200,
      effectiveUrl: evidence.expectedDestination,
      verifier: evidence.verifier,
      checkedAt: evidence.checkedAt,
    }]),
);
const inventoryDigest = canonicalDigest({
  domain: 'obsidian-press:profile-fact-inventory',
  schemaVersion: 1,
  revision: 'profile-facts-r4',
  evidenceSources: EVIDENCE_SOURCES,
  publicationAuthorization,
  publicSourceChecks,
  records,
  structuralDecisions,
});
```

기존 r3 receipt는 Git 이력에 보존된다. 그 materialization은 `3f9a26e5e8f789f0017d9804a2c199dfcd68d2eb562b6f4c0e407e8f230b3a24`, approved-records는 `973acc65bdddf7f7404af2ef507b5b92d4311ad2b195be0b4a18a6e26d2e7d16`이었다. 그 승인 interaction을 이번 승인으로 재사용하지 않았다.

## 실행 검증과 남은 제한

- 변경 전 원본 profile/receipt의 production 평가 및 기존 단위 테스트 21개가 통과했다.
- 변경 후 `npx vitest run tests/unit/production-profile.test.ts --reporter=dot`: 22/22 통과. 125개 fact와 digest 일치, 변조·구조 변경 거부, private metadata 비노출, 기존 검증자 보존과 신규 HTTP 확인의 구분을 검증한다.
- receipt revision drift 부정 테스트는 특정 미래 revision을 정상값으로 오인하지 않도록 `${receiptDocument.inventoryRevision}-unapproved`를 사용한다.
- 새 코드의 빌드·브라우저 화면 검증은 별도 실행 결과로 판단한다. 이 기록이 수동 접근성 검사나 PDF 승인을 새로 부여하지 않는다.
- `site/public/resume.pdf`와 `site/verification/resume/current-release.json`은 이번 작업에서 재생성·재승인하지 않았다. 현행 PDF release 기록은 `2026-08-26T15:46:15.231Z`이고, 새 웹 콘텐츠와 동일한 이력서로 소개할 수 없다.
- 기존 `getResumeDocumentLink()`는 receipt/source freshness를 검사하지 않고 `/resume.pdf`를 반환한다. `/resume`은 이 링크를 무조건 전달하고 일반 Astro build는 오래된 PDF 링크를 자동으로 차단하지 않는다. 따라서 새 웹 내용 반영과 PDF 갱신 완료는 구분해야 한다.
- 기존 수동 접근성 검증과 PDF human review 기록은 그대로 보존했다. 이번 결과를 이유로 그 기록의 timestamp·reviewer·source identity를 갱신하지 않는다.

승인 identity·receipt는 build/server-only 경계에 남는다. 공개 페이지에는 프로젝트 문구와 공개 근거 링크만 투영하고, build 완료의 private-output 누출 검사를 유지한다.

## 페이지 구현과 통합 검증

- `/portfolio`의 기존 4개 프로젝트와 6개 차원, 공용 프로필 모델을 유지했다. DocSuri를 첫 사례로 두고 16개 주제를 웹용 문단·목록으로 재구성했다.
- 프로젝트 바로가기, 사례 번호, 결과 영역 강조를 추가했다. 문제·역할·결과는 항상 표시하고, 긴 핵심 결정·구조·배운 점은 첫 문단 다음에 native `details`로 펼친다. 새 클라이언트 스크립트나 의존성은 추가하지 않았다.
- 본문에 작성된 `주제 — 설명`의 주제만 강조한다. 승인된 문구의 문자는 유지하며 Astro의 기본 escaping을 사용한다. 연락처·학력·자격·기존 AdiuBear 사례는 보존했다.
- `npm run build`: 251개 페이지 생성 및 private approval 출력 경계 검사 통과.
- `astro check`: 150개 파일, 오류 0·경고 0. 기존 코드의 hint 6개는 남아 있다.
- `npm run test:unit`: 18개 파일, 237개 테스트 통과. 최초 sandbox 실행의 프로세스 조회 제한(`ps` EPERM)은 사용자 승인 후 재실행해 검증했다.
- 공식 `npm run test:e2e`의 Playwright 자동 실행은 통과했다(`.last-run.json`의 `status: passed`, `failedTests: []`). 기존 6개 검증 spec의 48개 matrix cell, Chromium axe·반응형·키보드 및 Firefox/WebKit 검증이 pass로 기록됐다. 추가 포트폴리오 회귀 8개도 Chromium의 실제 발견 대상이며, 수치 조건·로컬 경로 비노출·앵커·375/1280px·테마·키보드·JS 비활성 동작을 검사한다.
- **전체 E2E 승인 명령은 성공으로 표시하지 않는다.** 자동 실행 뒤 `verification.compose`에서 `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`로 종료했다. 새 화면의 수동 접근성 검토는 아직 없으므로 기존 검토자의 이름·시각을 복제하지 않았다.
- 포트폴리오에 disclosure가 추가되어 수동 검토 계약을 기존 12개에서 16개 상태(두 경로 × 두 viewport × 두 theme × closed/all-open)로 갱신하고, 이전 12개 상태 기록을 거부하는 회귀 테스트를 추가했다.
- 외부 배포·Git push·커밋·이력서 PDF 재생성은 수행하지 않았다. 공용 프로젝트 요약이 `/resume`에도 반영되므로, 기존 PDF를 갱신하려면 별도 생성·검토 절차가 필요하다.

## 후속 배포 — 2026-09-20

- 후속 사용자 요청 “우선 배포해봐”에 따라 배포를 진행했다. 이후 “배포 후 코드만 커밋·push” 선택으로 코드의 원격 반영도 승인받았다.
- 기존 운영 사이트를 `/private/tmp/obsidian-blog-deploy.Pz5Klp/live-before`에 백업했다. 이 경로는 임시 백업이므로 영구 보관을 보장하지 않는다.
- 기존 `just deploy-preprocess site-build`를 정확한 운영 Vault 경로로 실행했으나, 게시일 기록 단계에서 macOS의 iCloud 디렉터리 접근 제한(`Operation not permitted`)으로 중단됐다. 이 실패를 우회해 Vault를 읽거나 운영 사이트 전체를 교체하지 않았다.
- 대신 새 Astro 빌드에서 `/portfolio/index.html`, `/resume/index.html`과 필요한 새 CSS `/_astro/portfolio@_@astro.CV12qqII.css`만 부분 배포했다. 정적 자산을 먼저 추가하고 HTML을 마지막에 교체했다. 검색 데이터·RSS·사이트맵·홈페이지·기존 글·PDF는 복사하거나 삭제하지 않았다.
- 배포 전후 전체 파일의 SHA-256 비교 결과: 변경 HTML 2개, 추가 CSS 1개, 삭제 0개. 기존 글 153개와 PDF를 포함한 나머지 운영 파일은 동일했다. 두 페이지가 참조하는 `/_astro` CSS·JS·폰트 103개의 운영 파일은 새 빌드와 일치했다.
- 공개 `/portfolio`, `/resume`, 새 CSS는 모두 HTTP 200이었다. CSS는 빌드와 SHA-256이 동일했고, 두 HTML은 Cloudflare의 기존 이메일 보호 변환을 해제한 비교에서 빌드와 정확히 일치했다. 전체 Vault 콘텐츠의 최신화 완료를 의미하지 않는다.
- 기능 커밋은 `ee8e8d7`, `develop` 병합 커밋은 `15321f6`이다. 원격에 반영한 범위는 `site/`의 코드·테스트·빌드 승인 데이터 16개 파일이며, 지원용 원고와 내부 근거집 및 AI-DLC 문서 변경은 로컬에만 남겼다.
- 수동 접근성 검토와 이력서 PDF 재생성·승인은 여전히 미완료다. 이번 배포는 그 기록을 갱신하거나 전체 E2E 승인을 통과한 것으로 표시하지 않는다.

## 후속 문장·소제목 편집 — inventory r5

사용자 요청 원문:

> 제목에 "소개랑 연락"이라 되어 있는데, 좀 부적절한데? 다른 제목으로 바꿔. 그리고 em-dash 쓰지 말고 부제로 바꿔. 문장도 자연스러운 한국어로 쓰고.

이 요청을 제목·소제목 표현과 한국어 문장 편집에 대한 허가로 기록한다. 새로운 경력·성과를 추가하거나, 사용자가 모든 사실을 다시 검증했다는 의미로 확장하지 않는다. 기록 시각 `2026-09-20T10:18:16Z`는 이 변경 기록을 만든 시각이며 사용자 메시지의 발송 시각이 아니다.

- 사실 ID 125개와 순서, 공개 링크의 목적지, target surfaces와 requirement는 동일하다. 문구 57개가 바뀌었고, 비포트폴리오 사실은 바뀌지 않았다.
- 소제목이 있는 본문은 `소제목\n본문`으로 분리했다. 공백이 정규화된 사실값에 대해서도 새 digest를 계산했다.
- 목록 항목은 single-line 규칙을 지켜야 하므로 DocSuri의 목록 항목 14개를 같은 ID의 paragraph로 바꿨다. 검증기를 약화하지 않았다. 기존 문단 하나의 위치 이동을 포함해 canonicalPath 15개가 달라졌다.
- DocSuri의 문제·역할·결정·구조·성과·회고는 각각 paragraph `2/2/8/11/5/4`개다. 이 구조 변경도 materialization과 production-diff에 포함했다.
- 숫자 토큰 비교에서 문장 내 위치 변화 2건과 `20명(20 VU)`의 설명용 반복 1건을 확인했다. 측정값·조건이 새로 생긴 것은 아니다.
- E01–E12와 정적 사실 ID별 evidence membership은 전혀 수정하지 않았다. URL을 새로 검증했다고 기록하지 않고 기존 verifier·checkedAt을 유지했다. 새 human fact review, 수동 접근성 검토, PDF 검토·승인을 추가하지 않았다.

새 receipt는 다음과 같다. 이전 r4 receipt와 그 게시 경위는 이 문서 위쪽 기록에 그대로 보존한다.

```json
{
  "schemaVersion": 1,
  "receiptId": "profile-fact-approval-2026-09-20-r2",
  "inventoryRevision": "profile-facts-r5",
  "inventoryDigest": "9a547fee6461ed2334cad080ad558edd899e38e61f94b16bbcb37469a3425a28",
  "productionDiffRevision": "profile-production-diff-r5",
  "productionDiffDigest": "1e4bfa50e4956891bcbcd3a7d50210f97c2a1485192de772c02c972a5237e60c",
  "approvedRecordsDigest": "a38977724005927088a2231406839070b5a8d1de5cf2d0ebd0a49ef2ce96c2cb",
  "materializedProfileDigest": "4358e527292d20cd5db3d77add05c75e055ebef3b4393c470fbb6fd95f3c0fd8",
  "decision": "Approved",
  "decisionAuditId": "PROFILE-EDITORIAL-20260920T101816Z",
  "decisionRecordedAt": "2026-09-20T10:18:16Z"
}
```

r5 inventory는 앞선 r4와 같은 payload·canonical SHA-256 계산식을 사용한다. `revision`은 `profile-facts-r5`, `records`와 `structuralDecisions`는 편집 완료 소스에서 계산한 값이다. `evidenceSources`와 `publicSourceChecks`는 이전 값을 그대로 사용하고, `publicationAuthorization`만 다음 편집 요청으로 대체했다.

```js
const publicationAuthorization = {
  kind: 'user-directed-editorial-publication',
  request: '제목에 "소개랑 연락"이라 되어 있는데, 좀 부적절한데? 다른 제목으로 바꿔. 그리고 em-dash 쓰지 말고 부제로 바꿔. 문장도 자연스러운 한국어로 쓰고.',
  recordedAt: '2026-09-20T10:18:16Z',
  inheritedReceiptId: 'profile-fact-approval-2026-09-20-r1',
  scope: 'Editorial changes only: revise the section title, render topic subtitles without em dashes, and improve Korean prose; no new facts or human fact review.',
};
```

변경 전 r4와 변경 후 r5에서 각각 `npx vitest run tests/unit/production-profile.test.ts --reporter=dot` 22/22가 통과했다. 정확한 receipt와 정적 allowlist·digest 일치, 변조 거부, 기존 근거 검증자 보존, private-output 경계를 유지한다. 이 단위 검증은 전체 사이트·브라우저 검증이나 배포 완료를 대신하지 않는다.

이 후속 편집 기록은 로컬 근거집에 남기며 이 작업에서 직접 커밋·push하지 않는다. 기존 PDF와 수동 접근성 기록에 대한 제한도 그대로다.

### 편집본 통합 검증과 배포

- 이력서·포트폴리오 소개 영역의 제목을 `프로필`로 변경했다. 포트폴리오의 영문 장식 문구는 한국어로 바꾸고, 자료 링크 영역은 `관련 자료`로 표시했다.
- 소제목 33개를 `h5`와 별도 본문 `p`로 렌더링했다. 본문 앞의 원문 줄바꿈을 보존해 HTML 압축 후에도 소제목과 본문 텍스트가 붙지 않도록 했다. 렌더링한 모든 사실의 ID·텍스트를 원본과 대조하는 브라우저 회귀 검사를 추가했다.
- 최종 전체 단위 테스트 238/238, 속성 테스트 37/37(100회 설정), Astro 검사 오류 0·경고 0이 통과했다. 기존 hint 6개는 유지됐다.
- 공식 E2E의 자동 Playwright 실행은 통과했고 `.last-run.json`은 `passed`, `failedTests: []`였다. 전체 승인 명령은 기존과 같이 `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`로 종료했다. 현재 검토 대상 digest는 `512141a10b97c80f417dfbd1c79dfc9803599905bed349e8749d8dfbc913cbc1`이며 수동 검토를 대신 승인하지 않았다.
- 운영본은 `/private/tmp/obsidian-blog-copyedit.Am3bai/live-before`에 임시 백업했다. 두 프로필 HTML과 새 CSS `/_astro/portfolio@_@astro.CdoQQu9L.css`만 부분 배포했다. 전체 파일 비교에서 HTML 2개 변경·CSS 1개 추가·삭제 0개였고, 기존 글 153개와 PDF는 그대로였다.
- 공개 두 페이지와 새 CSS가 HTTP 200임을 확인했다. Cloudflare의 기존 이메일 보호 변환만 해제한 비교에서 두 HTML은 빌드와 일치했고, CSS도 SHA-256이 같았다. 운영 포트폴리오에 소제목 33개가 포함된 것을 확인했다.
- 코드·테스트·빌드 승인 데이터 13개 파일을 `d2e9cb7`에 커밋하고 `712bbe3`으로 `develop`에 병합·push했다. 원고·내부 근거집과 AI-DLC 문서 변경은 원격에 포함하지 않았다.
