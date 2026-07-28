# U2 Infrastructure Design — Clarification Questions

## 문서 상태

- **단계**: CONSTRUCTION — U2 Infrastructure Design (답변 명확화)
- **작성일**: 2026-07-28
- **대상**: [Infrastructure Design Plan](homepage-publication-boundary-infrastructure-design-plan.md) Q4-B와 Q6-B
- **사유**: Q4-B는 허용 범위의 경계 확인이 필요하고, Q6-B("일부 항목을 재검토한다")는 재검토 대상·깊이·공유 문서 처리가 특정되지 않아 모호하다.

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 구체적인 규칙을 작성해 주세요.

### Clarification 1 — Q4-B "추가 정리"의 경계

Justfile 추가 정리를 어디까지 허용합니까?

A) **동작 보존 refactoring으로 한정한다**: 복사되는 파일 집합, `deploy`의 sync/invalidation 명령, 각 recipe의 관찰 가능한 산출 결과는 불변이다. 예시의 "복사 목록 재구성"은 형태 변경(반복문화 등)이지 집합 변경이 아니며, Q3-A(homepage artifact·manifest 비복사)와 충돌할 수 없다. **(권장)**

B) 복사되는 파일 집합의 변경까지 허용한다 — 단, Q3-A와 충돌하는 변경(homepage/manifest 공개)은 Q3의 재승인 없이는 불가하다.

X) Other (please describe after [Answer]: tag below) — 허용 경계를 직접 설명한다.

[Answer]:

### Clarification 2 — Q6-B 재검토의 대상과 깊이

무엇을 재검토하고, 결과를 어떻게 기록합니까?

A) **문서 검증 수준의 재검토로 한정한다**: U1이 기록한 기존 logging/monitoring 구성(CloudFront/S3 로깅 등)이 여전히 유효한지 이 단계에서 확인·기록하고, 새 도구·서비스 도입 없이 각 항목의 N/A 또는 현상-유지 판정을 근거와 함께 갱신한다. `shared-infrastructure.md`의 U2 호환성 row 추가는 그대로 수행한다. 어떤 AWS/Terraform 변경도 없다. **(권장)**

B) 특정 항목의 실제 구성 변경(예: alarm, 로그 보존 정책)을 요청한다 — 별도 infra 권한이 필요하며 이 workflow에서는 실행할 수 없으므로, 요구 사항 기록과 권한자 이관으로만 처리된다.

X) Other (please describe after [Answer]: tag below) — 재검토할 항목, 기대 결과와 공유 문서 처리를 직접 지정한다.

[Answer]:
