# U1 Infrastructure Design Clarification — Public CSS Delivery

## 문서 상태

- **단계**: CONSTRUCTION — U1 Infrastructure Design
- **상태**: 답변 A 검증 완료; clarification 해소
- **Unit**: U1 Profile Domain and Native Experience
- **생성일**: 2026-07-24
- **원 질문**: Infrastructure Design Plan Q3
- **관련 계약**: [NFR-U1-004](../profile-domain-and-native-experience/nfr-requirements/nfr-requirements.md), [ProfileStyleOwnership and Asset Analyzer](../profile-domain-and-native-experience/nfr-design/logical-components.md)
- **Question Validation**: 2026-07-24T07:09:57Z 통과; 1 question, 1 empty answer, 2 meaningful options, 1 final Other
- **Independent Review**: 2026-07-24T07:09:57Z 최종 통과; blocking 또는 material finding 없음

## 발견된 충돌

Q3의 A 선택은 `dist/resume/index.html`, `dist/portfolio/index.html`, `dist/resume.pdf`와 `_astro/<hash>.woff2`**만** public set이라고 표현한다. 그러나 승인된 NFR-U1-004와 NFR Design은 profile-owned compiled CSS를 Astro/Vite build graph에 emit하고, 두 route가 reach하는 unique gzip CSS를 24KiB 이하로 검증하도록 요구한다. Existing site의 다른 generated static assets도 정상 `site/dist/` 배포에서 계속 필요하다.

따라서 Q3가 “새 U1 object class의 대표 목록”인지, 아니면 “새 profile CSS file을 금지하고 HTML inline CSS로 바꾸는 결정”인지 한 번만 명확히 해야 한다. Receipt, candidate, journal, diagnostics가 `site/dist/` 밖에 남는다는 결정은 어느 선택에서도 유지된다.

## Clarification Question 1

U1 public static set에서 compiled profile CSS를 어떻게 처리할까요?

A) Q3 목록을 새 U1 delivery object의 대표 목록으로 해석한다. Actual deployable set은 전체 `site/dist/`이며, 여기에는 `/resume/index.html`, `/portfolio/index.html`, `/resume.pdf`, Astro/Vite hashed `_astro/*.css`, `_astro/*.woff2`와 기존 site assets가 포함된다. Profile-owned route-reachable CSS file union은 승인된 24KiB gzip gate를 그대로 적용한다. **(권장)**

B) 새 profile-owned CSS를 route HTML에 inline해 별도 `_astro/*.css` object를 만들지 않는다. Existing shared CSS/assets는 계속 전체 `site/dist/`에 포함하지만, NFR-U1-004의 compiled profile CSS resource 측정 계약과 NFR Design을 변경한 뒤 Infrastructure Design을 다시 검증한다.

X) Other (please describe after [Answer]: tag below) — 전체 `site/dist/` 배포 집합, profile CSS의 inline/file 형태와 24KiB measurement authority를 설명한다.

[Answer]: A) Q3 목록을 새 U1 delivery object의 대표 목록으로 해석한다. Actual deployable set은 전체 `site/dist/`이며, 여기에는 `/resume/index.html`, `/portfolio/index.html`, `/resume.pdf`, Astro/Vite hashed `_astro/*.css`, `_astro/*.woff2`와 기존 site assets가 포함된다. Profile-owned route-reachable CSS file union은 승인된 24KiB gzip gate를 그대로 적용한다.

## Gate

답변 A는 exact option match와 기존 NFR 일관성 검증을 통과했다. Actual deployable set은 전체 `site/dist/`이고 Q3의 original list는 새 U1 delivery object의 대표 목록이다. 이 해소는 Terraform, AWS, CloudFront, deployment 또는 invalidation 실행 권한을 만들지 않는다.
