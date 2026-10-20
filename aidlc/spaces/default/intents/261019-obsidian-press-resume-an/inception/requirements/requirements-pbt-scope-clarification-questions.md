# Property-Based Testing 범위 보충 질문

## 발견된 충돌

- 원본 Question 19의 답변은 Jenkins 문제를 이번 작업에서 제외합니다.
- 원본 Question 23의 답변은 Property-Based Testing 규칙을 전체 적용합니다.

전체 적용 모드의 **PBT-08**은 property-based test가 프로젝트 CI에서 실행되고 실패 seed가 기록되도록 강제합니다. 현재 Jenkins는 테스트를 실행하지 않으며 Rust manifest와 binary 경로도 현재 저장소 구조와 맞지 않습니다. 따라서 PBT 전체 적용을 유지하려면 최소한 관련 Jenkins 경로 수정과 PBT 실행 단계가 이번 범위에 포함되어야 합니다.

## Clarification Question 1
프로필 중심 범위와 PBT-08의 CI 요구 충돌을 어떻게 해결할까요?

A) PBT 전체 적용을 유지하고, Jenkins 경로 수정과 PBT CI 실행을 이번 범위에 포함

B) 프로필 중심 범위를 유지하고 Property-Based Testing 확장은 비활성화 (권장)

C) PBT 전체 적용을 유지하되 사용자가 CI 문제를 별도로 해결할 때까지 Construction을 시작하지 않음

X) Other (please describe after [Answer]: tag below)

[Answer]: A) PBT 전체 적용을 유지하고, Jenkins 경로 수정과 PBT CI 실행을 이번 범위에 포함
