# U1 Code Generation Summary — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 Code Generation, Part 2 Generation, Step 25
- **상태**: **미완** — Step 25 체크박스 8~11 완료, 12 는 열려 있다. §8 참조
- **작성 시각**: 2026-07-26T15:52:31Z
- **Unit**: U1 Profile Domain and Native Experience
- **Feature Branch**: `codex/feature/resume-profile-experience`
- **Validated Base**: local `develop` at `67f70a4240819ed8b9408360f9b59512660f8e10`
- **Deployment Authority**: 없음

## 1. 결론부터

U1 은 Step 1~24 를 닫았고 Step 25 의 검증 체크박스도 닫았으나 **U1 Code
Generation 완료를 주장하지 않는다.** 계획 §9 의 완료 정의 5항이 "five stable
commands 가 required evidence 를 만든다" 를 요구하는데 현재 트리에서
`npm run test:e2e` 가 실패한다. 이유는 §8 에 있다.

이 문서는 그 상태를 그대로 기록한다. 완료 주장과 미완 항목을 같은 표에 섞지
않는 것이 `verification-and-document-summary.md` 와 동일한 편집 규칙이다.

## 2. 생성·수정·삭제 파일

Validated base 대비 `site/` delta 는 **116 added / 9 modified / 0 removed** 다.

### 2.1 수정된 기존 파일 9개

계획 §4.2 가 허가한 shell 파일뿐이다.

| 경로 | 목적 |
| :--- | :--- |
| `site/.gitignore` | `.generated/`, `.artifacts/` private 경계 |
| `site/astro.config.mjs` | pre-module-graph 폰트/빌드 통합 |
| `site/package.json` | 정확한 도구 pin, stable 명령 5개 |
| `site/package-lock.json` | 재현 가능한 선택 의존성 |
| `site/README.md` | 명령·게이트·배포 경계 운영 문서 (Step 24) |
| `site/src/components/Header.astro` | 단일 nav 모델, desktop/static mobile parity |
| `site/src/islands/MobileNav.tsx` | in-place native disclosure/SSR anchor |
| `site/src/layouts/BaseLayout.astro` | typed metadata, JSON-LD host, 자원 정책 |
| `site/src/styles/global.css` | 기존 모바일 내비의 no-JS 지원 |

`MobileNav.tsx` 는 경로와 기존 search/theme 동작을 보존한 채 제자리에서
수정했다. 삭제된 파일은 없다.

### 2.2 새로 만든 116개

C01 도메인 (`src/lib/profile/`), C02 표현 (`src/components/profile/`),
routes 2, styles 5, layout/navigation 3, owner-local tooling
(`scripts/profile/`), 테스트 (unit 15 파일, PBT 5 파일 + arbitraries,
e2e 6 spec + support 5), obligation map 1, 설정 3, tracked 검증 기록 3,
공개 파생 자산 1.

### 2.3 AI-DLC 문서

`aidlc-docs/construction/profile-domain-and-native-experience/code/` 아래 12개.
계획 §4.7 이 요구한 10개와 Step 20/21 계약 문서 2개. 전부 markdown 이며
application 이 이 디렉터리를 import 하지 않는다.

## 3. 테스트

| 스위트 | 결과 |
| :--- | :--- |
| `test:unit` | 15 files / 179 tests pass |
| `test:pbt` | 5 files / 32 properties × 100 runs, seed `369705162` |
| 동일 seed 재실행 | 동일 통과 |
| Focused replay | `PBT_PATH=0` 로 1 passed / 4 skipped |
| `test:pbt:framework` | 1 file / 2 tests (internal proof, stable 명령 아님) |
| `test:e2e` | **현재 실패** — §8 |
| `npx astro check` | 0 errors, 0 warnings, 6 inherited hints |

Focused replay 는 `PBT_FILE`/`PBT_FOCUS` 환경변수로만 지정한다. CLI 인자
형태는 `PBT_CONFIG_INVALID` 로 거부된다. Step 24 README 가 이를 잘못 적었고
Step 25 가 실제로 실행하면서 발견해 고쳤다. 실행된 적 없는 문서화된 명령은
증거가 아니라는 것이 이 스텝의 교훈이다.

## 4. 의무 커버리지

| 항목 | 수 |
| :--- | :--- |
| Obligations | 135 |
| Canonical tests | 22 (pbt 5, unit 8, e2e 6, human-gate 3) |
| Deferred coverage | **0** |
| Explicit N/A | 9 |

`obligation-map.test.ts` 7 tests 가 missing mapping, unknown test ID, duplicate
semantic execution 을 fail-closed 로 검증한다.

Step 25 에서 `FD-P-C11-01` 을 `PBT-U1-DOCUMENT` 에서 `UNIT-U1-PDF` 로
재지정했다. 그 의무는 4-surface 매핑인데 `PBT-U1-DOCUMENT` 의 property 들은
`compareResumeFactManifests` 로 manifest 끼리만 비교하고
`compareRenderedManifest`, `mapPdfEvidence`, `compareResumeSurfaces` 를 전혀
호출하지 않는다. deferral 을 그대로 지웠다면 어떤 테스트도 수행하지 않는
커버리지를 주장하게 된다.

## 5. 사실

| 항목 | 값 |
| :--- | :--- |
| 승인 레코드 | 77, 전부 Approved (Pending/Excluded 0) |
| 결정 감사 ID | `U1-CG-S14-FACT-APPROVAL-20260725T034431Z` |
| 결정 시각 | 2026-07-25T03:44:31Z |
| Inventory digest | `25357f99…` |
| Approved records digest | `356356f9…` |
| Production diff digest | `a4ebc55b…` |
| Materialized profile digest | `775177b9…` |

`site/src/lib/profile/profile-data.ts` 가 유일한 production fact source 다.
tracked receipt `verification/profile/fact-approval.json` 은 11 키이며 **공개
사실 값을 하나도 복제하지 않는다.** revision/digest/decision identity 만 담는다.
빌드 시점 게이트가 이 digest 들을 재계산한 뒤에야 `FactApprovedProfile` 을
발급하므로, 사실이 하나라도 바뀌면 승인이 무효가 되고 빌드가 fail-closed 로
멈춘다.

## 6. PDF identity

| 항목 | 값 |
| :--- | :--- |
| Candidate | `e36d47c64b61c27cbcb4d59be5ca088f4f68dce4136c2a974a8b53d00859479b` |
| `pdfSha256` | `834faa3b827b34437c241d1c4d14ec1fc9bab7c1400d5d95f81e9a03b3f28f16` |
| `receiptSha256` | `2f6b24961b1c700e07e17335d7b9896e4b4bd9aa9d6b984f3b73f5b77f5fb3db` |
| `sourceIdentity` | `6ea953a03599ef112796bc6a4678f3eb27c3dd3f71874776e50cd1fba3f6e45e` |
| `manifestFingerprint` | `aab8a08b4699cbee0b9824b289211fe72989da647fd0ca077ceaf885468568c3` |
| 관측 | 페이지 3 · 매핑된 사실 51 · surface parity pass |

`resume:pdf:verify` 는 Step 25 에서 계획 §5.2 전체 흐름을 수행하도록 구현되었다.
값싼 대조를 먼저 돌려 stale pair 를 빌드 비용 없이 밀리초 안에 실패시킨 뒤
clean build → 감독된 loopback preview → web/print surface 관측 → **tracked**
PDF 재추출 → `mapPdfEvidence` → `compareResumeSurfaces` 로 이어진다. tracked
PDF 를 다시 렌더하지 않는다. 다시 렌더하면 소스를 자기 자신의 두 번째 렌더와
비교하게 되어 정작 발행된 파일이 검사되지 않는다. 현재 판정 `result: pass`,
`buildId: ea921152…`.

**후보 PDF 는 byte-reproducible 하지 않다.** 리뷰 레코드는 자신이 지목한 정확한
SHA 에만 유효하며, prepare 를 다시 돌리면 후보가 교체되어 리뷰가 무효가 된다.

## 7. 배포 결과

배포하지 않았고 배포 가능성을 주장하지 않는다.

| 대상 | 결과 |
| :--- | :--- |
| `infra/`, Terraform, `Jenkinsfile`, `Justfile`, `preprocessor/` | 변경 0 |
| `index.astro`, `data.ts`, `render.ts` | 변경 0 |
| AWS / DNS / CloudFront / 캐시 | mutation 없음 |
| external Vault | 쓰기 없음 |
| push / merge / PR | 없음 |

축소 직접 빌드는 profile 검증 산출물이며 배포 후보가 아니다. 전체 사이트 빌드는
preprocessor 가 만든 `content/` 를 요구하므로 이 `dist/` 를 S3 에 동기화하면
사이트 콘텐츠가 사라진다.

## 8. U1 이 완료가 아닌 이유

**`npm run test:e2e` 가 현재 트리에서 실패한다.**
`MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, stage `verification.compose`.

Step 25 가 계획 §5.2 를 구현하려고 `scripts/profile/verification-provider.mjs`
와 `scripts/profile/pdf-renderer.mjs` 를 수정했다. 두 파일 모두
`REVIEW_SUBJECT_SOURCE_FILES` 에 들어 있으므로 manual web accessibility 의
review subject digest 가 `e8ca5dcc…` 에서
`0c4ed919c96cb753ee132fb3097625369453cf9bc6b9ce3b3d56dc1016fab035` 로
이동했고, tracked 기록은 이전 digest 에 서명되어 있어 stale 이 되었다.

계획 §7 이 정확히 이 동작을 규정한다. "Fact/profile style/config/tool change
after review invalidates the relevant manual accessibility/PDF evidence and
returns to its checkpoint." 게이트는 설계대로 fail-closed 했다.

**주목할 점은 렌더링 표면이 실제로는 하나도 바뀌지 않았다는 것이다.**
`dc6acf8..HEAD` 에서 review subject 에 해당하는 변경은 위 두 tooling 파일뿐이고
`src/` 아래는 단 한 바이트도 바뀌지 않았다. review subject 가 verification
provider 전체를 포함하므로, 렌더링에 영향을 줄 수 없는 릴리스 검증 경로 변경조차
웹 접근성 사람 검토를 무효화한다. subject 를 좁힐지 여부는 승인된 계약의 설계
결정이므로 이 문서는 관측만 기록하고 변경하지 않는다.

닫으려면 사람이 digest `0c4ed919…` 기준으로 12개 상태를 다시 검토해
`site/verification/profile/manual-web-accessibility.json` 을 갱신해야 한다.
생성자가 대신할 수 없는 게이트다.

PDF 사람 게이트는 무효화되지 않았다. 그 증거는 `sourceIdentity` 와 manifest 에
묶여 있고 둘 다 이동하지 않았으며 `resume:pdf:verify` 는 계속 통과한다.

## 9. 남은 잔여

1. **§8 의 manual web accessibility 재검토.** 유일한 blocking 항목이다.
2. **Rollback arm 라이브 증거 없음.** 트랜잭션이 forward arm 을 끝까지 갔으므로
   4-state rollback 경로와 Step 22 가 넘긴 cross-device, stale review/source 는
   pure journal model 과 `release-state-machine.pbt.test.ts` 로만 검증된다.
   유도된 실패나, store 의 고정 경로 안전성을 약화시키지 않는 별도 주입 지점이
   필요하다.
3. **사람 체크리스트 11행의 note 가 빈 문자열이다.** receipt 는 관찰 기술 없는
   11개 판정을 싣는다. 감사 시 attested 로 읽어야 하며 described 로 읽으면 안
   된다.

## 10. U2/U3 로 이연

| 대상 | 내용 |
| :--- | :--- |
| U2 | FR-008~009, homepage composition, external Vault/publication 경계, EDGE-007/012 |
| U2 | `HomepageProfile`, `/resume`, `/portfolio` 계약을 read-only 로 소비한다 |
| U2 | ST-U01 parent (homepage CTA composition), ST-E03 parent (publication slice) |
| U3 | ST-E04. 네 read-only stable 명령을 CI 에 집계하되 assertion 을 복제하지 않는다. `resume:pdf` 는 호출하지 않는다 |
| U3 + 배포 권한자 | Infrastructure Design 이 남긴 호환성 위험 9건 (`deployment-artifacts-summary.md` §6) |

U1 은 ST-U01, ST-E03 parent, ST-E04 를 완료로 표시하지 않는다. `C12`/`S05` 는
U3 소유이며 U1 에서 구현하거나 복제하지 않았다.
