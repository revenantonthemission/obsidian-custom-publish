# U1 Deployment Artifacts Summary — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 Code Generation, Part 2 Generation, Step 24
- **상태**: 완료 — Infrastructure implementation N/A / no-change 기록
- **완료 시각**: 2026-07-26T15:52:31Z
- **Unit**: U1 Profile Domain and Native Experience
- **Bounded Context**: Profile Experience
- **Project Type**: Brownfield
- **Feature Branch**: `codex/feature/resume-profile-experience`
- **Validated Base**: local `develop` at `67f70a4240819ed8b9408360f9b59512660f8e10`
- **Deployment Authority**: 없음

## 1. 판정

U1 의 deployment infrastructure 생성은 **No-change / N/A** 다.

U1 은 static read-only 출력만 만든다. 기존 S3 + CloudFront topology 를 그대로
쓰고, 새 환경·리소스·파이프라인 단계를 만들지 않는다. Infrastructure Design 은
설계 시점 호환성 검증만 EXECUTE 로 승인되었고 Terraform 편집, AWS mutation,
배포는 별도 권한으로 남아 있으며 그 권한은 부여되지 않았다.

## 2. 계층별 처분

| Layer | 판정 | 근거 |
| :--- | :--- | :--- |
| Network API layer | N/A | runtime endpoint 없음 |
| Repository/data-access | N/A | database/persistence adapter 없음 |
| Database entities/migrations | N/A | schema, migration, per-user 가변 상태 없음 |
| Runtime service/queue/cache | N/A | Astro static build 와 local operator process 뿐 |
| Deployment infrastructure | No-change | 기존 S3/CloudFront 유지, Terraform/AWS/Jenkins Deploy 변경 금지 |

## 3. 무변경 검증

`67f70a4240819ed8b9408360f9b59512660f8e10..HEAD` 기준 diff 로 확인했다.

| 대상 | 결과 |
| :--- | :--- |
| `infra/` (`main.tf`, `outputs.tf`, `variables.tf`) | 변경 0 |
| `Jenkinsfile` | 변경 0 |
| `Justfile` | 변경 0 |
| `preprocessor/` | 변경 0 |
| `site/src/pages/index.astro`, `site/src/lib/data.ts`, `site/src/lib/render.ts` | 변경 0 |
| AWS / DNS / CloudFront / 캐시 | mutation 수행 없음 |
| external Obsidian Vault | 쓰기 없음 |
| `git push` / merge / pull request | 없음 |

`site/scripts/` 어디에도 `aws s3`, `cloudfront`, `terraform` 참조가 없다. U1 의
도구는 로컬 파일시스템, 로컬 브라우저, 로컬 preview 프로세스만 다룬다.

U1 이 만든 site delta 는 116 added / 8 modified 이며, 수정된 8개는 계획 §4.2 가
허가한 shell 파일뿐이다. `.gitignore`, `astro.config.mjs`, `package.json`,
`package-lock.json`, `Header.astro`, `MobileNav.tsx`, `BaseLayout.astro`,
`global.css`. `MobileNav.tsx` 는 in-place 로 수정했고 경로와 기존 search/theme
동작을 보존한다.

## 4. 축소 직접 빌드는 배포 후보가 아니다

**이 구분이 이 문서에서 가장 중요하다.**

`cd site && npx astro build` 가 만드는 출력은 **profile 검증 산출물**이다.
전체 사이트 배포 산출물이 아니다.

- 전체 사이트 빌드는 Rust preprocessor 가 production Vault 를 전처리해 만든
  `content/` 를 입력으로 요구한다. 축소 빌드는 그 단계를 실행하지 않으므로
  Vault 유래 페이지가 존재하지 않는다.
- 검증된 base 에서 preprocessor 는 220 페이지를 만들었다. 축소 빌드는 profile
  route 와 shell 만 만든다.
- 따라서 **축소 빌드의 `dist/` 를 S3 에 동기화하면 사이트 콘텐츠가 사라진다.**
  이 산출물은 배포 후보로 승격될 수 없다.

배포 적격성은 exact production Vault 전처리에 의존하며 U1 은 이를 실행하지도
주장하지도 않는다. U1 이 주장하는 것은 profile route 와 파생 PDF 가 로컬에서
계약을 만족한다는 것뿐이다.

## 5. 로컬 출력 관측

축소 빌드 결과에서 확인한 것.

| 항목 | 관측 |
| :--- | :--- |
| `/resume/index.html` | 30,454 bytes, non-empty |
| `/portfolio/index.html` | 34,277 bytes, non-empty |
| `/resume.pdf` | 323,173 bytes, `.pdf` 확장자로 `application/pdf` MIME 결정 |
| Hashed CSS | `/_astro/` 아래 4개 (`foundation`, `resume`, `BaseLayout`, `_slug_`) |
| Hashed WOFF2 | `/_astro/` 아래 92개, 전부 `url(/_astro/…)` 루트 상대 same-origin |
| 외부 CDN/폰트 참조 | profile route 에서 0 |
| private evidence 유출 | 0 files |

`dist/resume.pdf` 와 tracked `public/resume.pdf` 의 SHA-256 은 모두
`834faa3b827b34437c241d1c4d14ec1fc9bab7c1400d5d95f81e9a03b3f28f16` 이며 승격된
`pdfSha256` 과 일치한다. 파생 자산이 원본과 동일하게 전달된다.

## 6. Infrastructure Design 이 남긴 호환성 위험

다음은 U1 이 **해결하지 않았고 해결 권한도 없는** 기존 배포 경로의 위험이다.
U3 와 배포 권한 보유자에게 넘긴다.

1. Fresh-clone 폰트 구체화 — 새 클론에서 `.generated/profile-font/` 부재.
2. 축소/profile 출력과 배포 시 전처리된 전체 사이트 출력의 차이 (§4).
3. `just deploy` 의 안전하지 않은 fixture 기본값.
4. 배포 경로·완전성 게이트 부재.
5. Jenkins 야간 무조건 Deploy.
6. 안정 경로 `/resume.pdf` 의 공유 캐시 — 갱신 시 무효화 필요.
7. 비원자적 S3 sync/invalidation.
8. **production exact rollback 부재.** 로컬 PDF pair rollback 은 exact 하지만,
   production 은 보존된 완전한 릴리스나 repository + Vault/generated-input
   스냅숏 없이는 exact rollback 이 불가능하고 현재는 best-effort 재배포뿐이다.
9. `nosniff` 하에서의 MIME 증거.

## 7. 경계 선언

U1 Code Generation 은 배포를 수행하지 않았고 배포 가능성을 주장하지 않는다.
Sites hosting, `just deploy`, Jenkins Deploy, AWS/Terraform/DNS mutation,
external Vault 쓰기, push, merge 중 어느 것도 수행되지 않았으며 어느 것도
이 단계에서 승인되지 않았다.
