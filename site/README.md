# obsidian-press — site

Astro static site for https://rvnnt.dev, plus the U1 profile domain that renders
`/resume`, `/portfolio` and the derived `/resume.pdf`.

> **이 디렉터리의 어떤 명령도 배포하지 않는다.** `npm run build` 는 로컬 검증
> 산출물만 만든다. S3 동기화, CloudFront 무효화, Terraform/AWS/DNS 변경,
> Jenkins Deploy, external Vault 쓰기는 모두 이 명령들 바깥에 있으며 별도의
> 명시적 권한을 요구한다. 아래 "배포 경계" 를 반드시 읽을 것.

## 안정 명령 다섯 개

U1 이 제공하는 stable command surface 는 정확히 다섯 개이며 이 목록은 닫혀
있다. CI 와 U3 는 읽기 전용 네 개만 실행하고 `resume:pdf` 는 절대 호출하지
않는다.

| Command | Mutation | 하는 일 |
| :--- | :--- | :--- |
| `npm run test:unit` | 없음 (읽기 전용) | Vitest 예제 + obligation map 완전성 |
| `npm run test:pbt` | 없음 (읽기 전용) | seed 검증 후 U1 property 스위트만 실행 |
| `npm run test:e2e` | `dist/` 와 private evidence 만 | 폰트 검증 → clean build → loopback preview → Playwright/Axe |
| `npm run resume:pdf -- --prepare` | private artifacts 만 | 후보 PDF, PDF.js 증거, 4-surface parity, draft receipt |
| `npm run resume:pdf -- --promote <candidate-id> --review <path>` | 유일한 tracked mutation 경로 | 리뷰 재검증 → receipt/PDF 트랜잭션 → clean second build → finalize/rollback |
| `npm run resume:pdf:verify` | 없음 (항상 읽기 전용) | 현재 tracked PDF/receipt 재검증 |

`npm run test:pbt:framework` 는 PBT-09 도구 선정 증거로 남겨둔 내부
스크립트다. stable command 가 아니고 U3 가 호출하지 않으며 실제 U1 property
수를 대신하지 않는다.

`resume:pdf` 는 `--prepare` 나 `--promote` 를 생략하면 모드를 추측하지 않고
거부한다. 공개 파일을 건드리는 일은 매번 의도적인 행위여야 한다.

## PBT 재현

```sh
npm run test:pbt                          # 로컬 기본 100 runs, seed 를 출력한다
PBT_RUNS=1000 npm run test:pbt            # CI 기본값
PBT_SEED=1729 npm run test:pbt            # 같은 seed 전체 재실행
PBT_SEED=1729 PBT_PATH=0:1:0 npm run test:pbt -- <file> -t '<exact test name>'
```

- seed 는 worker 를 띄우기 전에 하나 생성·검증하고 **항상 출력한다.**
- `PBT_PATH` 는 explicit seed + exact file + exact full test name 이 모두
  있을 때만 허용한다. 셋 중 하나라도 빠지면 거부한다.
- 기본 shrinking 과 counterexample 출력을 보존한다. retry, 일반 실행에서의
  `endOnFailure`, `fc.gen()` 은 금지다.
- property 가 찾아낸 shrunk defect 는 고친 뒤 **영구 example regression 으로
  승격하고 원래 property 도 그대로 유지한다.**

## 사람 게이트 세 개

세 게이트는 서로 독립이며 어느 하나도 자동으로 통과되지 않는다.

### 1. Fact 승인 게이트

`src/lib/profile/profile-data.ts` 는 유일한 production fact source 이고 승인된
사실만 담는다. 빌드 시점에 `production-profile.ts` 가 tracked non-public receipt
`verification/profile/fact-approval.json` 을 읽어 inventory digest, production
diff, 구조 digest 를 재계산한 뒤에야 `FactApprovedProfile` 을 발급한다. receipt
없이는 route, metadata, manifest, PDF 중 무엇도 조립되지 않는다.

사실을 하나라도 바꾸면 digest 가 움직이고 승인은 무효가 된다. 새 승인 없이는
빌드가 fail-closed 로 멈춘다.

### 2. 수동 웹 접근성 게이트

`verification/profile/manual-web-accessibility.json` 은 12개 상태에 대한 사람
검토 기록이며 **review subject digest 에 묶여 있다.** digest 는
`src/components/profile`, `src/lib/layout`, `src/styles/profile` 의 현재 내용에서
계산한다. 이 세 디렉터리 중 하나라도 바뀌면 digest 가 이동하고 기록은 즉시
stale 이 되며 `npm run test:e2e` 가 `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`
로 실패한다. 스타일을 한 줄만 고쳐도 12개 상태를 다시 검토해야 한다.

### 3. Exact-SHA PDF 리뷰 게이트

```sh
npm run resume:pdf -- --prepare
# 후보 ID/SHA, sourceIdentity, manifestFingerprint, viewer 경로를 출력한다.
# viewer: .artifacts/profile/pdf/viewer/<candidate-id>.html

#  ↓ 사람이 그 정확한 후보를 검토하고 고정 리뷰 레코드를 작성한다  ↓

npm run resume:pdf -- --promote <candidate-id> --review <review-path>
npm run resume:pdf:verify
```

**후보 PDF 는 byte-reproducible 하지 않다.** 동일한 소스로 prepare 를 두 번
돌리면 `pdfSha256` 과 후보 ID 가 달라진다 (`sourceIdentity` 와
`manifestFingerprint` 는 동일하게 유지된다). 그래서 리뷰 레코드는 자신이 지목한
정확한 SHA 에만 유효하다. 소스가 바뀌지 않았다면 **promote 전에 prepare 를 다시
돌리지 말 것.** 리뷰가 가리키던 후보가 교체된다.

리뷰 레코드 작성 시 함정 하나. `sourceIdentity`, `manifestFingerprint`,
`manifestDigest` 는 prepare 요약이 출력하는 맨 hex 문자열이 아니라 canonical
digest **객체** (`{domain, schemaVersion, algorithm, digest}`) 다. 출력된 hex 는
그 객체의 `.digest` 필드일 뿐이다. `manifestFingerprint` 와 `manifestDigest` 는
U1 별칭이므로 둘 다 존재해야 하고 값이 같아야 한다.

promote 는 단일 writer lock 아래 journal 트랜잭션으로 실행된다.
`PREPARED → PROMOTION_VALIDATED → RECOVERY_SNAPSHOTTED → RECEIPT_PROMOTED →
PDF_COMMITTED → FINAL_VERIFIED`. `PDF_COMMITTED` 가 공개 파일 커밋 지점이다. 그
전에 실패하면 복원할 것이 없고, 그 후에 실패하면 journal 이 지목한 검증된
스냅숏만으로 복원한다. 실패하면 원래 오류를 non-zero 로 반환한다.

죽은 소유자의 lock 은 **일부러 깨지 않는다.** 밖에서 보면 stale lock 과 live
lock 은 구별되지 않고, 잘못 추측하면 공개 파일에 writer 가 둘 붙는다.

## 생성물 경계

| 경로 | 상태 |
| :--- | :--- |
| `src/lib/profile/profile-data.ts` | tracked, 유일한 production fact source |
| `verification/profile/*.json` | tracked, non-public 기계 영수증 |
| `verification/resume/current-release.json` | tracked, non-public 릴리스 영수증 |
| `public/resume.pdf` | tracked, 공개 파생 자산 — placeholder 금지 |
| `.generated/profile-font/` | gitignored, 검증된 Pretendard 구체화 |
| `.artifacts/profile/` | gitignored, 후보·증거·뷰어·journal |
| `dist/` | gitignored 빌드 출력 |

`.artifacts/` 와 `.generated/` 는 절대 tracked 가 되지 않으며 빌드 출력에도 새지
않는다. 빌드 종료 시 sitemap 생성 이후 private receipt 마커를 내용과 경로 양쪽에서
스캔해 fail-closed 로 막는다.

## 배포 경계

**`npm run build` 의 출력은 배포 후보가 아니다.**

이 디렉터리에서 직접 실행하는 축소 빌드는 profile 검증 산출물이다. 전체 사이트
배포는 Rust preprocessor 가 production Vault 를 전처리해 만든 `content/` 를
입력으로 요구하며 그 단계는 여기서 실행되지 않는다. 축소 빌드로 만든 `dist/` 를
S3 에 올리면 전체 사이트 콘텐츠가 사라진다.

다음은 이 README 의 어떤 명령으로도 수행되지 않으며 별도 권한이 필요하다.

- S3 동기화, CloudFront 무효화 또는 캐시 조작
- Terraform / AWS / DNS 변경
- Jenkins Deploy job
- external Obsidian Vault 쓰기
- `git push`, merge, pull request

전체 빌드 파이프라인은 저장소 루트의 `Justfile` 과 `CLAUDE.md` 를 참조한다.
`preprocessor/`, `infra/`, `Justfile`, `Jenkinsfile` 은 U1 의 no-edit set 이다.
