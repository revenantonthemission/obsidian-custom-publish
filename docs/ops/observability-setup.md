# 운영 관측·비용 설정 (F-4, F-5)

이 문서는 `261115-personal-website`의 Observability 산출물(`dashboards.md`, `alarms.md`, `cost-analysis.md`)을 실제 서비스에 연결하기 위한 설정안입니다. **계정 생성·API 키 발급·웹훅 등록은 유지관리자 작업**이며, 자격 증명은 저장소에 커밋하지 않습니다.

## F-4. Grafana Cloud + Alloy + Slack

### 1. 자격 증명(저장소 밖)

| 환경 변수 | 용도 |
|---|---|
| `GRAFANA_CLOUD_API_KEY` | Prometheus 원격 기록 / Loki 전송 |
| `GRAFANA_PROM_URL` | Prometheus remote_write 엔드포인트 |
| `GRAFANA_LOKI_URL` | Loki 전송 엔드포인트 |
| `SLACK_WEBHOOK_URL` | Grafana Alerting 알림 채널 |

`.env*`는 `.gitignore`로 제외됩니다. 저장소에는 예시 파일만 둡니다.

### 2. Alloy 설정(`~/.config/alloy/config.alloy`)

```hcl
local.file_match "blog_logs" {
  path_targets = [{
    __path__  = "/Users/revenantonthemission/Library/Logs/obsidian-blog-*.log",
    job       = "blog",
  }]
}

loki.source.file "blog" {
  targets    = local.file_match.blog_logs.targets
  forward_to = [loki.write.default.receiver]
}

loki.write "default" {
  endpoint {
    url       = env("GRAFANA_LOKI_URL")
    tenant_id = env("GRAFANA_CLOUD_USER")
    password  = env("GRAFANA_CLOUD_API_KEY")
  }
}
```

Jenkins 콘솔 로그(`/opt/homebrew/var/log/jenkins/{output,error}.log`)도 같은 패턴으로 추가하고, 보존 기간은 Loki에서 **30일**로 설정합니다(Q3 B).

### 3. 대시보드·알림

- 대시보드: `operation/observability-setup/dashboards.md` §3의 4행 레이아웃을 Grafana JSON으로 import. 지표는 `prometheus_remote_write`, 로그 패널은 `loki`.
- 알림: `operation/observability-setup/alarms.md` §2의 A1~A8 규칙을 Grafana Alerting으로 등록하고, 연락 지점은 Slack 웹훅. 심각도는 P1/P2/P3 그대로 사용.
- 가용성 SLO: 99.9%/30일 롤링, 오류 예산 43분 12초(`slo-config.md` §2).
- 체크 기록 `~/Library/Logs/obsidian-blog/checks.jsonl`은 아직 생성하는 코드가 없습니다(F-7 러너가 출력만 하고 파일 기록은 미구현). 대시보드의 가용성 게이지가 비어 있으면 이 내보내기를 먼저 구현해야 합니다.

### 4. 등록 순서

1. Grafana Cloud 계정 생성 → API 키 발급.
2. Slack Incoming Webhook URL 발급 → `SLACK_WEBHOOK_URL`.
3. Alloy 설치 후 위 설정 배치, launchd 등록, 로그 전송 확인.
4. 대시보드 import, 알림 규칙 등록, 테스트 알림 1회.
5. 첫 청구월에 비용 기준선 기록(아래).

## F-5. 비용 추적

인프라 비용은 0원입니다(자체 Mac + 무료 터널). 추적 대상은 Grafana Cloud와 Slack의 무료 티어 사용량뿐입니다.

| 항목 | 기준선 | 기록 위치 |
|---|---|---|
| Grafana Cloud | 무료 티어 | 아래 장부 |
| Slack | 무료 플랜 | 아래 장부 |
| 도메인 `rvnnt.dev` | 기존 소유, 변경 없음 | 아래 장부 |

월 1일에 아래 장부에 실제 청구액을 한 줄 추가합니다. 절감액은 추정하지 않고, 무료 티어 한도에 도달했을 때만 플랜 변경을 검토합니다(`cost-analysis.md` §4).

```json
{
  "entries": []
}
```

자동 비용 수집 API는 연결하지 않습니다. 외부 서비스 계정과 자격 증명이 준비된 뒤决定합니다.
