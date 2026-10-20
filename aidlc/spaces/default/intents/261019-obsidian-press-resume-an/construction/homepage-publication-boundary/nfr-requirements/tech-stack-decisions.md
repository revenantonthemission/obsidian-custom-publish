# U2 Tech Stack Decisions — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 NFR Requirements
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **결정 근거**: [NFR Requirements Plan](../../plans/homepage-publication-boundary-nfr-requirements-plan.md) Q1~Q10 (모두 A)

## TSD-U2-01 — proptest 1.11.0 채택과 PBT-09 증명

`cargo add --dev proptest`로 **proptest 1.11.0**이 `preprocessor/Cargo.toml`의 `[dev-dependencies]`에 추가되고 `Cargo.lock`이 갱신됐다. 이것이 이 단계가 승인한 유일한 manifest 변경이다.

PBT-09의 네 의무는 이 branch에서 실제 실행으로 증명했다 (`preprocessor/tests/pbt_framework_smoke.rs`):

| 의무 | 증거 |
|---|---|
| 구조적 custom generator | 한국어 음절(가~힣)·Latin·숫자·공백 도메인의 `synthetic_title()` Strategy와 `SyntheticNote`(title × scope) 합성 Strategy로 두 property가 기본 256 cases씩 통과 |
| 자동 shrinking | 일회용 실패 property(`v.len() < 5` on `vec(0u32..100, 0..10)`)가 최소 반례 `[0, 0, 0, 0, 0]`(길이 5로 최소화, 원소 전부 0으로 축소)으로 shrink됨 |
| seed 지속·재현 | 실패가 `tests/pbt_framework_smoke.proptest-regressions`에 `cc d5a76a82528e0885c10de595a3e848a659cc2ce00b4732d3ad974ee4935dd4b9 # shrinks to v = [0, 0, 0, 0, 0]`로 기록·출력됨. 재실행은 0.00s에 `successes: 0`으로 novel case 생성 전에 지속 사례를 정확히 재현함 |
| cargo test 통합 | `cargo test --test pbt_framework_smoke` 및 전체 `cargo test`(87 passed / 0 failed, 약 26초)로 실행 |

증거 확보 후 일회용 실패 property와 지속 파일은 U1 선례에 따라 제거했고, smoke 파일에는 영구 property 2개가 남는다.

## TSD-U2-02 — seed 재현 메커니즘의 정밀화 (계획 문구 교정)

계획 Q1 선택지는 "환경 변수 기반 seed 재현"이라고 적었다. 정밀화: **기록된 특정 실패의 재현 경로는 실패 지속 파일이다** — 실패 시 `cc <seed>` 라인(32-byte ChaCha 지속 seed)이 파일에 기록·출력되고, 이후 실행이 그 사례를 novel case보다 먼저 재검사한다. proptest 1.11.0에는 `PROPTEST_RNG_SEED` 환경 변수(u64, 실행 전체 RNG seed 고정)가 존재하지만, 그 형식으로는 지속 파일의 `cc` seed를 주입할 수 없으므로 기록된 실패의 replay 경로가 아니다. Q1-A의 실질(재현 가능한 seed)은 충족되며, 메커니즘 서술만 이 문서가 정밀화한다. **U3 CI 지침**: CI 실패 로그의 `cc` 라인을 지속 파일에 추가하면 로컬에서 같은 최소 실패를 network 없이 재현한다 (FR-016.3 충족 방식).

## TSD-U2-03 — site 도구 재사용 (신규 의존성 없음)

site 쪽 U2 test는 U1이 승인·설치한 Vitest 4.x, fast-check 4.x(`@fast-check/vitest`), Playwright, axe 구성을 그대로 재사용한다. `site/package.json`에 U2가 추가하는 의존성은 없다.

## TSD-U2-04 — "오늘" 주입 메커니즘 경계

NFR-U2-006은 주입 가능성(build 시작 1회 계산, test 고정 주입)을 요구로 고정한다. 정확한 메커니즘(모듈 매개변수, 환경 변수, Astro 설정 중 택일)은 U2 NFR Design/Code Generation이 정하되, 조합 로직 내부의 `new Date()` 직접 호출 금지는 불변이다.

## TSD-U2-05 — 명령 topology (신규 명령 없음)

Rust stable command는 기존 `just test`이고 site는 기존 `npm run test:unit`·`test:pbt`·`test:e2e`에 suite를 추가한다. Justfile과 package.json에 U2 전용 신규 명령을 만들지 않으며, U3는 기존 명령을 변경 없이 aggregation한다.

## TSD-U2-06 — Manifest 변경 경계

이 단계의 저장소 변경은 (a) `preprocessor/Cargo.toml`·`Cargo.lock`의 proptest dev-dependency 추가, (b) `preprocessor/tests/pbt_framework_smoke.rs` 신설, (c) AI-DLC 문서뿐이다. application source, external Vault, generated output, Terraform/AWS, Jenkins, push, deployment는 변경되지 않았다.

## TSD-U2-07 — Browser Matrix 전제 교정 (Q8)

Q8-A는 "U1과 동일한" chromium·firefox·webkit × 320×800·1440×900 matrix를 전제했으나, U1의 실제 topology는 다르다: firefox·webkit project는 집중된 `profile-cross-browser.spec.ts`만 실행하고 그 viewport는 320×800·**1280×800**이며, 1440×900은 chromium 전용 axe/responsive 검사에서만 쓰인다. 따라서 U2가 요구하는 3-browser × 320×800·1440×900 `/` smoke는 **재사용이 아니라 신규 Playwright project/spec 추가**로 달성한다. 도구 버전 재사용 주장은 유효하다 (`@playwright/test` 1.61.1 pin). NFR-U2-008은 이 교정을 전제로 읽는다.

## Traceability

| 결정 | 근거 |
|---|---|
| TSD-U2-01 | Q1~Q3; FR-015.3; NFR-U2-001~003 |
| TSD-U2-02 | Q1, Q2; FR-015.6, FR-016.3; NFR-U2-002 |
| TSD-U2-03 | 승인 전제(U1 도구 재사용); NFR-U2-007~009 |
| TSD-U2-04 | Q6; NFR-U2-006 |
| TSD-U2-05 | Q10; NFR-U2-010 |
| TSD-U2-06 | unit-of-work §4.6; FR-017 |
| TSD-U2-07 | Q8; NFR-U2-008; FR-014.6 |
