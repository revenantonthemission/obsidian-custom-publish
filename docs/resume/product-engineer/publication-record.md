# 프로덕트 엔지니어 이력서 수정 기록 — 2026-09-27

## 사용자 요청과 사실 확인

첫 요청은 “Let's update my resume too. The resume should be truthful.”이며, 후속 요청은 “인터넷에서 이력서 양식을 검색하고 부족한 내용을 채워봐.”다.

사용자는 서강대학교 2026년 2월 졸업, 한소노 2023년 7–8월 인턴십, 그와 별도인 독일 eZono 협업(2023년 10월 29일–11월 6일)을 확인했다. 이 확인은 E15에 기록했다. 실제 DocSuri 담당 역할은 4인 팀의 데이터 엔지니어로 유지하며, 프로덕트 엔지니어는 지원 직무로 구분한다.

[양식 조사와 부족한 항목 대조](template-research.md)에 Harvard·MIT 공식 자료와 반영 근거를 남겼다. 양식의 예시 인물, 학점, 직함, 성과는 가져오지 않았다.

## 수정 범위

- 실제 이메일·GitHub 주소를 화면과 PDF에 표시한다.
- DocSuri만 이력서에 선별하고 역할·기술·검색 장애 복구·데이터 계약 협업·재처리 검증을 프로젝트 항목으로 모은다. 프로젝트 요약과 상세 기여는 기존 구현·운영 근거에서 가져왔다.
- 검색·요약·에이전트 초기 구현과 GROBID TEI 구조 파서는 팀원 기여임을 명시한다. 사용자 수, 매출, 보장된 가용성이나 근거 없는 성능 개선률은 추가하지 않는다.
- 전체 기술 목록을 29개에서 11개로 줄이고, DocSuri에 실제 사용한 기술을 따로 표시한다.
- 인턴십과 이후 독일 협업을 구분하고 졸업 월을 명확히 한다.
- 이름이 잘 보이는 한 단 구성, 간결한 기술 행, 구체적인 기여 항목을 사용한다. 기존 포트폴리오의 네 프로젝트 본문은 유지한다.

새 원본 필드 Project.resumeDetails는 이력서에만 투영되며, 승인 팩트 수집과 PDF manifest의 canonical path에도 포함된다. 선택이 없는 기존 자료는 원래 동작을 유지한다. 모든 변경은 고정된 receipt와 digest 경계를 거친다.

## 사실과 승인 이력

첫 초안 r7은 118개 팩트였으며, [기록](revision-r7.md)과 [정확한 digest 입력](inventory-r7.json)을 보존한다. 후속 r8은 소개에 있던 세 기여 팩트를 없애고 프로젝트의 역할·기술·세 기여 팩트로 다시 구성해 120개가 됐다. 이번 작업 이전 r6(133개)과 비교하면 110개 값은 같고, 5개 값은 수정, 18개 기술 팩트는 제거, 5개 프로젝트 상세 팩트가 추가됐다.

E01–E13의 기존 근거 정의와 공개 링크 검사자·시각을 보존했다. E14는 사용자의 편집 요청과 이미 수집한 DocSuri 기술 근거를 연결한다. 이 기록은 사용자가 모든 기술 사실을 개별 검토했거나 PDF의 수동 검토를 완료했다는 뜻이 아니다.

현재 receipt는 다음과 같다. [inventory-r8.json](inventory-r8.json)에 canonical inventory digest의 정확한 입력을 저장했다. digest는 기존 productionProfileTesting.canonicalDigest 알고리즘으로 빌드 밖에서 한 번 계산해 production-profile.ts와 verification/profile/fact-approval.json에 고정했다.

```json
{
  "schemaVersion": 1,
  "receiptId": "profile-fact-approval-2026-09-27-r2",
  "inventoryRevision": "profile-facts-r8",
  "inventoryDigest": "5bcfa4743718a00b5c802e6ee842da27e22671409909ea6adacaa0872c8200c1",
  "productionDiffRevision": "profile-production-diff-r8",
  "productionDiffDigest": "e6aa8ea7935abbccdf4de1c1bc22c8eb38c2d3e2b63874a3c9e36ffc005f3e4b",
  "approvedRecordsDigest": "2161243cca522ef5c0e9178a747741906bab771459e69fb01c48e91efab5c313",
  "materializedProfileDigest": "2511983e344f58e0e575b8c7ca6dc03584381f4bc63b559d67d9749969d6b65c",
  "decision": "Approved",
  "decisionAuditId": "PROFILE-RESUME-TRUTHFUL-20260927T140225005Z",
  "decisionRecordedAt": "2026-09-27T14:02:25.005Z"
}
```

## 공개 PDF 상태

기존 public/resume.pdf와 verification/resume/current-release.json은 교체하지 않았다. 저장소의 PDF promotion은 정확한 후보 파일에 대한 사람의 검토 기록을 요구한다. 검사자 이름이나 체크리스트를 임의로 만들지 않았다.

이력서 페이지는 현재 승인된 원본·manifest·실제 PDF 바이트가 저장된 release와 일치할 때만 다운로드 링크를 표시한다. 기존 PDF URL은 유지되지만 최신 이력서인 것처럼 안내되지 않는다. 내부 승인 데이터는 공개 페이지나 클라이언트 코드에 들어가지 않는다.

커밋, push, 배포는 이번 이력서 수정 작업에서 실행하지 않았다.

## 최종 검증과 PDF 후보

- 전체 unit suite: 22개 파일, 289개 테스트 통과.
- Astro check: 159개 파일, 오류 0·경고 0·기존 hint 6개.
- 새 프로젝트 상세 필드의 fixture 테스트와 strict TypeScript 검사 통과. 기존 선택·도메인·presentation property 테스트는 100회 설정으로 통과했으며, 새 상세 필드의 비정상 입력은 추가 단위 테스트로 확인했다.
- 독립 빌드의 브라우저 검사 16개 통과: 데스크톱·375px 모바일, 밝은/어두운 테마, 접힌/펼친 경력. axe 위반·가로 넘침·런타임 오류 0개. 실제 이메일·GitHub 표기, 절대 주소의 프로젝트 링크, 5개 상세 기여 팩트, 졸업 월, 별도 해외 협업, 프로젝트 선택 범위를 확인했다.
- PDF prepare: A4 한 페이지, 본문 최소 10pt·줄 간격 1.35, 42개 표시 팩트의 웹·print·PDF 일치. 초기 출력 검사에서 발견된 entry break-inside와 줄 간격 조건을 수정했고, 최종 검증을 다시 통과했다.
- 마지막 어학 자격이 둘째 페이지로 넘어가는 문제는 단순 자격 항목의 제목·날짜를 같은 줄에 배치해 해결했다. 글자 크기나 내용을 줄여서 숨기지 않았다.

```json
{
  "candidateId": "9320ede01522f12e5b165470d1bfee0760c2e97d9f6952aac83a0c768fac8617",
  "pdfSha256": "ecd05a93cc021725ff39a5e109838badd01a763dbb9ae92ed6795a10153d7fd0",
  "sourceIdentity": "2cd2d13d4807d77b5d9969eeb0320182eb9b996386d11f4da0c50755caee4841",
  "manifestFingerprint": "b31ee0c2ebdb1fb8c29e65164d15e2870821fbdebfad040fac4cb8d56f54caae",
  "pageCount": 1,
  "mappedFacts": 42,
  "surfaceParity": "pass"
}
```

결과 파일은 output/pdf/조준희_프로덕트엔지니어_이력서_2026-09-27.pdf이며 pipeline 후보와 바이트가 같다. 이전 r7 기록의 2페이지 후보는 이번 파일로 대체됐다. 실제 DocSuri 전체 참여 기간은 사용자 답변을 기다리고 있어 기간 필드를 임의로 추가하지 않았다.

최종 후보 한 페이지를 Poppler PNG로 렌더링해 어시스턴트가 다시 확인했다. 본문·연락처·기술·프로젝트 기여·학력·두 어학 자격이 잘림이나 겹침 없이 보인다. 최종 파일 SHA-256은 위 후보와 일치한다. 이 시각 점검은 사람의 PDF 승인 기록을 대체하지 않는다.

## develop 병합 전 검증 — 2026-09-28

사용자가 현재 이력서 작업을 커밋하고 develop에 병합한 뒤 인프라 엔지니어 포트폴리오 브랜치를 만들도록 요청했다. 병합 전 기존 검증 명령을 실행했다.

- `npm run test:unit`: 22개 파일, 289개 테스트 통과.
- 첫 `npm run test:pbt` 실행(seed `-444008970`)은 이력서 연락처가 실제 주소를 표시하는데도 예전 버튼 문구를 기대해 37개 중 1개가 실패했다.
- `site/tests/pbt/u1/profile-presentation.pbt.test.ts`의 기대값을 이력서의 실제 주소 표기와 프로젝트 상세 링크에 맞췄다. 포트폴리오의 기존 연락처 문구 검증은 유지하고 프로젝트 상세 블록의 보존도 확인한다.
- `PBT_SEED=-444008970 npm run test:pbt`: 같은 seed와 100회 설정으로 6개 파일, 37개 테스트 통과.
- `npm run build`: Astro 정적 페이지 252개 빌드 성공.

이번 병합 전 검증에서는 커버리지 측정, 브라우저 검사, PDF 생성을 다시 실행하지 않았다. 위의 이전 검증 기록과 이번 실행 결과를 구분한다.
