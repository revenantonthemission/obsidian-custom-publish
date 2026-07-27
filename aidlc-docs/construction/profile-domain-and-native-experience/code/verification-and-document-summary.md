# U1 Verification and Document Summary — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 Code Generation, Part 2 Generation, Step 24
- **상태**: 완료 — browser/manual/PDF 증거, receipt currentness, negative gate 기록
- **완료 시각**: 2026-07-26T15:52:31Z
- **Unit**: U1 Profile Domain and Native Experience
- **Bounded Context**: Profile Experience
- **Project Type**: Brownfield
- **Implementation Worktree**: `/private/tmp/obsidian-blog-u1-nfr`
- **Feature Branch**: `codex/feature/resume-profile-experience`
- **Validated Base**: local `develop` at `67f70a4240819ed8b9408360f9b59512660f8e10`

## 1. 이 문서가 주장하는 것과 주장하지 않는 것

이 문서는 U1 이 **owner-local 로 실제 실행해 관측한** 증거만 기록한다. 실행되지
않은 경로는 §6 에 명시적으로 미실행으로 남긴다. 통과 주장과 미실행 주장을 같은
표에 섞지 않는 것이 이 문서의 유일한 편집 규칙이다.

주장하지 않는 것: production 배포 적격성, 전체 사이트 빌드 동등성, 외부 URL 의
현재 도달 가능성, PDF 의 byte 재현성, 사람 검토 판정의 내용적 타당성.

## 2. Browser 증거 (Step 20)

`npm run test:e2e` 는 clean build → 소유된 loopback preview → Playwright/Axe
순으로 실행한다. 네 group 전부 `result: pass`.

| Group | 관측 |
| :--- | :--- |
| browser | 59 browser tests, 3 Playwright project (Chromium/Firefox/WebKit) |
| linkMetadata | route label/title/description/canonical 과 `/resume-old` prefix 충돌 거부 |
| resource | request ledger 43 attempted / 43 successful, **external request 0** |
| manualWebAccessibility | 12개 상태 기록의 digest 현재성 |

- **완료 매트릭스 48키.** 매트릭스가 3개 worker process 에 걸쳐 있어 어떤 단일
  process 도 전체를 관측할 수 없다. 각 spec 이 자기 fragment 를 디스크에 봉인하고
  `globalTeardown` 이 부모에서 병합한다. 불완전해도 기록을 쓰기 때문에 빠진 칸이
  **부재가 아니라 진단 가능한 실패**로 나타난다.
- fragment 는 그 obligation 을 뒷받침하는 검사가 실제로 성립한 뒤에만 기록된다.
  실패한 test 를 가진 spec 은 아무것도 기여하지 않는다.
- **Print**: A4/Letter 양쪽에서 pagination 2 pages. 본문 하한 10pt/1.35 를
  `isValidPrintCheck` 가 기계적으로 강제한다.
- **Resource**: profile route 의 jsDelivr/KaTeX 참조 0, client JS 0.
- **Tools**: `axe 4.12.1`, `chromium 149.0.7827.55`, `firefox 151.0`,
  `webkit 26.5`, `playwright 1.61.1`.

Axe 는 WCAG 2.0/2.1 A/AA 와 2.2 AA 를 blanket exclusion 없이 돌려 **실제 대비
결함 5건**을 찾아냈다. `--c-accent` (`#0d9488`) 가 light 배경에서 3.59:1 로 AA
4.5:1 에 미달했다. profile 은 `--c-profile-accent-text` (`#0f766e`, 5.31:1) 를
도입했고 dark theme 은 이미 10.6:1 이라 변경하지 않았다.

## 3. Manual 웹 접근성 증거

| 항목 | 값 |
| :--- | :--- |
| 기록 | `site/verification/profile/manual-web-accessibility.json` (tracked, non-public) |
| 검토자 | 조준희 |
| 상태 수 | 12 (양 route × light/dark × 320×800/1440×900 × details closed/all-open) |
| 현재 subject digest | `e8ca5dcc56ab04c9d913ef2bd3b49066e799edffaa686ba5754ab0f111ebc172` |
| 판정 | 전 상태 pass, target-size 예외 없음 |

**이 게이트는 두 번 stale 이 되었고 두 번 다시 검토되었다.** digest 는
`src/components/profile`, `src/lib/layout`, `src/styles/profile` 에서 계산한다.
Step 20 이 `f9688988…` 에서 기록했고, Step 21 의 print 본문 10pt 수정이
`ea01e41e…` 로 옮겼으며, Step 22 의 변경이 `e8ca5dcc…` 로 다시 옮겼다. 그때마다
`test:e2e` 가 `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` 로 fail-closed 했다.

이것이 이 게이트의 설계 의도다. 스타일 한 줄 수정이 사람 검토를 조용히
무효화하지 않고 명령이 실패하게 만든다.

## 4. PDF 문서 증거

### 4.1 Prepare 관측

| 항목 | 값 |
| :--- | :--- |
| result | `prepared` |
| mappedFacts | 51 |
| surfaceParity | `pass` |
| pageCount | 3 |
| candidate | `e36d47c64b61c27cbcb4d59be5ca088f4f68dce4136c2a974a8b53d00859479b` |
| pdfSha256 | `834faa3b827b34437c241d1c4d14ec1fc9bab7c1400d5d95f81e9a03b3f28f16` |
| sourceIdentity | `6ea953a03599ef112796bc6a4678f3eb27c3dd3f71874776e50cd1fba3f6e45e` |
| manifestFingerprint | `aab8a08b4699cbee0b9824b289211fe72989da647fd0ca077ceaf885468568c3` |
| draftSha256 | `4b1b1d7f79c041865be0934302a1b17389c26cce339fc2d227cefbee44f7c78b` |

Expected / screen web / print / PDF 네 surface 의 ordered full manifest 가 source
identity 까지 exact equality 여야 통과한다. set equality, core subset, flat-text
identity, PDF byte equality 는 parity oracle 로 쓰지 않는다.

**Ordinal 은 렌더된 문서에서 관측하고 manifest 에서 읽지 않는다.** manifest 에서
경계를 읽으면 정답지에서 답을 가져오는 것이라 PDF 가 렌더된 문서와 불일치해도
통과할 수 있다. renderer 가 print-media DOM 에서 section/entity/fact 골격을
관측하고 inspector 가 추출을 거기에 정렬한다.

### 4.2 Promote 트랜잭션

`result: released`. forward arm 전체를 통과했다. 현재 소스 기준 리뷰 재검증 →
최종 receipt 조립 → 단일 writer lock 하 승격 → clean second build →
transaction-scoped final gate `pass` → `finalize`.

- `receiptSha256`: `2f6b24961b1c700e07e17335d7b9896e4b4bd9aa9d6b984f3b73f5b77f5fb3db`
- `test:e2e` 는 build `ea921152229f6d987e29168ff397f570f57da70ab92a0075476a6a647ed82fb2`
  에서 `result: pass`.
- `public/resume.pdf` 는 modified 가 아니라 untracked 로 나타났다. receipt 를
  후보 rename 보다 먼저 쓰는 설계상 **첫 릴리스의 정상 서명**이다.

### 4.3 Receipt currentness

`npm run resume:pdf:verify` 는 tracked pair 를 mutation 없이 재검증한다.

| 항목 | 값 |
| :--- | :--- |
| releaseState | `ABSENT` (활성 lock/journal 없음) |
| candidateId | `e36d47c6…` |
| pdfSha256 | `834faa3b…` |
| receiptSha256 | `2f6b2496…` |
| sourceIdentity | `6ea953a0…` |
| manifestFingerprint | `aab8a08b…` |

receipt 는 **디스크의 바이트와 현재 소스 양쪽**을 기술해야 한다. 자기 자신과만
일치하는 receipt 는 소스 변경 뒤에도 stale 릴리스를 살려두기 때문이다.

## 5. Negative gate

skip-success 는 허용되지 않는다. 필요한 browser/tool/record 가 없으면 명령이
실패한다.

| 영역 | 이름으로 실패시키는 것 |
| :--- | :--- |
| PDF 검사 | missing, extra, changed, reordered, ambiguous occurrence; link, structure, outline; stale, unreadable candidate |
| Release store | symlink, non-regular, 허용목록 이탈/상위 탈출, lock 충돌, interrupted/unexplained journal state, digest 불일치, draft 를 release 로 위장, capability 위조·직렬화·재사용 (27 negative examples) |
| Fact gate | required Pending/Excluded, unapproved link/metric, inventory-production mismatch |
| Navigation | `/resume-old` prefix 충돌, multiple-current state |
| Verification | lock/journal 존재 시 거부, receipt-PDF 불일치, source/manifest stale |
| Obligation map | missing mapping, unknown test ID, duplicate semantic execution |

`resume:pdf` 는 모드를 추측하지 않고, 죽은 소유자의 lock 을 깨지 않으며,
pending capability 는 `WeakMap` 에만 살고 `toJSON` 이 throw 한다. 파일·환경변수·
CLI 인자에서 복원된 capability 는 **존재할 수 없다.**

## 6. 미실행 경로와 잔여

다음은 통과가 아니라 **미실행**이다.

1. **Rollback arm 미진입.** 트랜잭션이 forward arm 을 끝까지 갔으므로 4-state
   rollback 경로에 라이브 증거가 없다. pure journal model 과
   `release-state-machine.pbt.test.ts` 로만 검증된다.
2. **cross-device, stale review/source.** Step 22 가 이 경로들을 Step 23 라이브
   구동으로 넘겼으나 rollback arm 진입이 전제라 함께 닫히지 않았다. store 의
   고정 경로가 안전성 자체이므로 unit test 주입은 검증 대상 속성을 약화시킨다.
3. **사람 체크리스트 11행의 note 가 빈 문자열이다.**
   `validateResumeHumanReview` 는 NFC 문자열만 요구하므로 통과하지만 receipt 는
   관찰 기술이 없는 11개 판정을 싣는다. **감사 시 attested 로 읽어야 하며
   described 로 읽으면 안 된다.**
4. ~~`resume:pdf:verify` 의 계약 편차~~ — **Step 25 에서 해결됨.** 이제 계획
   §5.2 대로 `no lock/journal → clean build/preview → full reinspection` 을
   수행한다. 값싼 대조를 먼저 돌려 stale pair 는 빌드 비용 없이 밀리초 안에
   실패시키고, 그 다음에 clean build → 감독된 loopback preview → web/print
   surface 관측 → **tracked** PDF 재추출 → `mapPdfEvidence` →
   `compareResumeSurfaces` 로 이어진다. tracked PDF 를 다시 렌더하지 않는다.
   다시 렌더하면 소스를 자기 자신의 두 번째 렌더와 비교하게 되어 항상 일치하고
   정작 발행된 파일은 검사되지 않으며, 렌더러가 byte-reproducible 하지 않으므로
   새 바이트를 tracked 바이트와 비교할 수도 없다. digest 대조 대비 추가되는 것은
   명확하다. `sourceIdentity` 는 사실을 digest 하므로 사실 변경은 이미 잡지만,
   사실 digest 를 전혀 건드리지 않으면서 print 레이아웃이나 cross-surface parity
   를 깨뜨리는 **렌더링 회귀**는 잡지 못한다. 현재 판정은 `result: pass`,
   `buildId: ea921152…`, `pageCount: 3`, `mappedFacts: 51`,
   `surfaceParity: pass` 다. 51개 매핑은 tracked 바이트에서 추출한 것이므로 이
   단계는 구조적으로 비어 있지 않다. 비어 있다면 0 이 나온다.
5. ~~`FD-P-C11-01` 은 아직 `deferredCoverage` 에 있다~~ — **Step 25 에서
   해결됨.** `UNIT-U1-PDF` 로 `tests/unit/resume-pdf.test.ts` 를 등록하고 의무를
   거기로 옮긴 뒤 deferral 을 비웠다. 그냥 지우지 않은 이유는 그대로다.
   `PBT-U1-DOCUMENT` 를 가리킨 채 지웠다면 어떤 테스트도 수행하지 않는 커버리지를
   주장하게 된다.

## 7. 현재 검증 상태

| 검사 | 결과 |
| :--- | :--- |
| `npm run test:unit` | 15 files / 179 tests pass |
| `npx astro check` | 0 errors, 0 warnings, 6 inherited hints |
| `npm run resume:pdf:verify` | `result: pass`, tracked pair current |
| `npm run test:e2e` | `result: pass` at build `ea921152…` |
| `git diff --check` | clean |
| Local output | `/resume/index.html` 30,454B, `/portfolio/index.html` 34,277B, `/resume.pdf` 323,173B |
| Private evidence leak | 0 files |

`dist/resume.pdf` 와 `public/resume.pdf` 의 SHA-256 은 모두
`834faa3b827b34437c241d1c4d14ec1fc9bab7c1400d5d95f81e9a03b3f28f16` 로 승격된
`pdfSha256` 과 일치한다.
