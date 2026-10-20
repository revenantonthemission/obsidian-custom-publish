# Security Baseline 범위 보충 질문

## 발견된 충돌

- 원본 Question 19의 답변은 이력서·포트폴리오와 직접 관련된 변경만 수행하고 Jenkins, Terraform, 전처리기 부채를 제외합니다.
- 원본 Question 22의 답변은 모든 SECURITY 규칙을 blocking constraint로 강제합니다.

활성화된 Security Baseline을 현재 시스템에 적용하면 다음 기존 항목도 blocking finding입니다.

- **SECURITY-01**: S3 리소스에 명시적 암호화 설정과 non-TLS 요청 거부 정책이 없습니다.
- **SECURITY-10**: CI에 의존성 취약점 검사와 SBOM 생성이 없고 도구 버전도 완전히 고정되지 않았습니다.
- **SECURITY-13**: jsDelivr에서 읽는 CSS 리소스에 SRI가 없습니다.
- **SECURITY-14**: CloudFront 로그와 90일 보존은 있지만 보안 알림과 모니터링 대시보드는 정의되지 않았습니다.

Security Baseline 규칙상 applicable finding을 예외로 두고 다음 단계로 진행할 수는 없습니다.

## Clarification Question 1
기능 범위와 Security Baseline의 충돌을 어떻게 해결할까요?

A) Security Baseline을 유지하고 위 applicable 보안 항목까지 이번 AI-DLC 범위에 포함

B) 이력서·포트폴리오 중심 범위를 유지하고 Security Baseline은 비활성화 (권장)

C) Security Baseline을 유지하되 사용자가 기존 보안 항목을 별도로 해결할 때까지 Construction을 시작하지 않음

X) Other (please describe after [Answer]: tag below)

[Answer]: B) 이력서·포트폴리오 중심 범위를 유지하고 Security Baseline은 비활성화 (권장)
