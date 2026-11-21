# 16상태 수동 접근성 검토 워크시트 (F-2)

이 문서는 **검토 기록 템플릿**입니다. 실제 기록은 `site/verification/profile/manual-web-accessibility.json`에 사람이 직접 작성합니다. 이 파일을 그대로 복사해 통과시킨 결과를 만들면 안 됩니다.

## 1. 검토 대상과 현재 digest

- 예상 digest: `3d578e5b96f849a73c2dfeba708d5582305fffd625b28e8cb1efb4ac5855c0de`
- 확인 방법: `cd site && npm run test:e2e` → `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` 오류의 `details.reviewSubjectDigest` 값
- 기록 경로: `site/verification/profile/manual-web-accessibility.json`
- 스키마 근거: `site/scripts/profile/accessibility-review-contract.mjs` (`REQUIRED_MANUAL_MATRIX`, `REQUIRED_MANUAL_CHECKS`)
- 기존 기록의 digest는 `494dc4df…`로 **stale** → `npm run test:e2e`가 실패 닫힘 상태입니다.

digest는 다음 파일의 내용에서 계산되므로, 하나라도 바뀌면 검토를 다시 해야 합니다: `src/components/profile/**`, `src/lib/layout/**`, `src/styles/profile/**`, `BaseLayout.astro`, `Header.astro`, `MobileNav.tsx`, `navigation.ts`, `global.css`, `tokens.css`, `fonts.css`, `base.css`, `chrome.css`, 두 프로필 페이지, `astro.config.mjs`, `package.json`, lockfile, 빌드·서빙 스크립트.

## 2. 16상태 매트릭스

 Chromium에서 `/resume`과 `/portfolio` × `320x800`과 `1440x900` × light/dark × `<details>` 펼침 상태 `closed`/`all-open` = 16상태.

| # | route | viewport | theme | details | 색 의미 독립 | 포커스 모양 | 포커스 가림 | 읽기 순서 | 메모 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | /resume | 320x800 | light | closed |  |  |  |  |  |
| 2 | /resume | 320x800 | light | all-open |  |  |  |  |  |
| 3 | /portfolio | 320x800 | light | closed |  |  |  |  |  |
| 4 | /portfolio | 320x800 | light | all-open |  |  |  |  |  |
| 5 | /resume | 320x800 | dark | closed |  |  |  |  |  |
| 6 | /resume | 320x800 | dark | all-open |  |  |  |  |  |
| 7 | /portfolio | 320x800 | dark | closed |  |  |  |  |  |
| 8 | /portfolio | 320x800 | dark | all-open |  |  |  |  |  |
| 9 | /resume | 1440x900 | light | closed |  |  |  |  |  |
| 10 | /resume | 1440x900 | light | all-open |  |  |  |  |  |
| 11 | /portfolio | 1440x900 | light | closed |  |  |  |  |  |
| 12 | /portfolio | 1440x900 | light | all-open |  |  |  |  |  |
| 13 | /resume | 1440x900 | dark | closed |  |  |  |  |  |
| 14 | /resume | 1440x900 | dark | all-open |  |  |  |  |  |
| 15 | /portfolio | 1440x900 | dark | closed |  |  |  |  |  |
| 16 | /portfolio | 1440x900 | dark | all-open |  |  |  |  |  |

판정 기준:
- **색 의미 독립**: 색만으로 전달되는 정보가 없는가
- **포커스 모양**: 키보드 포커스가 어디 있는지 명확히 보이는가
- **포커스 가림**: 포커스된 요소가 다른 요소에 가려지지 않는가
- **읽기 순서**: DOM/시각 순서가 논리적인가

## 3. 기록 작성

`site/verification/profile/manual-web-accessibility.json`의 각 상태는 다음 형태입니다(실제 검토 결과로 채움):

```json
{
  "route": "/resume",
  "engine": "chromium",
  "viewport": "320x800",
  "theme": "light",
  "details": "closed",
  "checks": {
    "colorIndependentMeaning": "pass",
    "focusAppearance": "pass",
    "focusObscuration": "pass",
    "readingOrder": "pass"
  }
}
```

상위 필드: `schemaVersion: 1`, `result: "pass"`, `reviewSubjectSchemaVersion: 1`, `reviewSubjectDigest` (위 1번 값), `reviewer`, `reviewedAt` (ISO 8601), `states` (16개), `targetSizeExceptions: []`, `skippedReasons: []`.

## 4. 재실행 절차

1. 사이트 확인용 로컬 서버 실행: `cd site && npm run dev` → `http://localhost:4321/resume`, `/portfolio`를 브라우저에서 위 16상태로 검토
2. 위 JSON 기록 갱신 후 저장
3. `cd site && npm run test:e2e` — 성공하면 이전 단계의 `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`가 사라집니다
4. 변경 사항 커밋(`docs`/검증 기록은 develop 직접 커밋 허용) 후 push 여부는 유지관리자 결정

주의: review subject 파일을 하나라도 수정하면 digest가 다시 바뀌므로, 스타일 수정은 검토 **전에** 끝내고 검토는 마지막에 한 번만 수행합니다.
