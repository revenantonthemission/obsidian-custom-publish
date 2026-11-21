# 운영 관측·비용 설정 (F-4, F-5)

이 문서는 `261115-personal-website`의 Observability 산출물(`dashboards.md`, `alarms.md`, `cost-analysis.md`)을 실제 서비스에 연결하기 위한 설정안입니다. **계정 생성·API 키 발급·웹훅 등록은 유지관리자 작업**이며, 자격 증명은 저장소에 커밋하지 않습니다.

최신 공식 문서를 기준으로 수정했습니다(2026-11-21 확인):
- Grafana Alloy — `loki.source.file` / `loki.write` / `prometheus.remote_write` / `sys.env`
- Grafana Alerting — Slack contact point
- Grafana Cloud Pricing / Logs pricing — Free tier 한도와 보존 기간
- Grafana Loki — Compactor retention

## F-4. Grafana Cloud + Alloy + Slack

### 1. 자격 증명(저장소 밖)

| 환경 변수 | 용도 |
|---|---|
| `GRAFANA_CLOUD_PROM_URL` | Prometheus remote_write URL (예: `https://prometheus-<region>.grafana.net/api/prom/push`) |
| `GRAFANA_CLOUD_PROM_USER` | Prometheus numeric user ID |
| `GRAFANA_CLOUD_API_KEY` | Grafana Cloud API key (Prometheus·Loki 공용) |
| `GRAFANA_LOKI_URL` | Loki push URL (예: `https://logs-<region>.grafana.net/loki/api/v1/push`) |
| `GRAFANA_LOKI_TENANT` | Loki numeric tenant ID |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL(`https://hooks.slack.com/services/...`) |

`.env*`는 `.gitignore`로 제외됩니다. Alloy 설정은 환경 변수 이름만 참조하고 값은 저장하지 않습니다.

**주의**: Alloy River에서 환경 변수는 `env("NAME")`이 아니라 **`sys.env("NAME")`** 입니다. Grafana Alloy 문서의 managed-service 예제도 `sys.env(...)`를 사용합니다.

### 2. Alloy 설정(`~/.config/alloy/config.alloy`)

```hcl
loki.source.file "blog" {
  targets    = [{ __path__ = "/Users/revenantonthemission/Library/Logs/obsidian-blog-*.log" }]
  forward_to = [loki.write.default.receiver]

  file_match {
    enabled     = true
    sync_period = "10s"
  }
}

loki.write "default" {
  endpoint {
    url       = sys.env("GRAFANA_LOKI_URL")
    tenant_id = sys.env("GRAFANA_LOKI_TENANT")

    basic_auth {
      username = sys.env("GRAFANA_LOKI_TENANT")
      password = sys.env("GRAFANA_CLOUD_API_KEY")
    }
  }
}

prometheus.remote_write "default" {
  endpoint {
    url = sys.env("GRAFANA_CLOUD_PROM_URL")

    basic_auth {
      username = sys.env("GRAFANA_CLOUD_PROM_USER")
      password = sys.env("GRAFANA_CLOUD_API_KEY")
    }
  }
}
```

- Alloy 문서는 `local.file_match`보다 `loki.source.file`의 내장 `file_match` 블록을 권장합니다(컴포넌트 간 통신 오버헤드 제거). 이전 초안의 `local.file_match` 방식은 여전히 동작하지만 비권장입니다.
- Jenkins 프로세스 로그(`/opt/homebrew/var/log/jenkins/{output,error}.log`)도 같은 패턴의 `loki.source.file` 블록으로 추가합니다.
- `loki.write` endpoint는 `password`를 직접 받지 않습니다. 인증은 `basic_auth` / `authorization` / `bearer_token` 중 하나여야 합니다. 이전 초안의 `password = env(...)`는 잘못된 설정이었습니다.
- `prometheus.remote_write`도 `basic_auth` 안에 username/password를 둡니다. URL은 실제 스택의 region 값으로 교체해야 합니다.

**체크 기록**: `~/Library/Logs/obsidian-blog/checks.jsonl`은 아직 생성하는 코드가 없습니다(F-7 러너는 표준 출력만 하고 파일 기록은 미구현). 가용성 게이지를 채우려면 이 내보내기를 먼저 구현해야 합니다.

### 3. Slack contact point

Grafana 공식 절차(`Configure Slack for Alerting`):

1. Slack 앱에서 Incoming Webhook을 만들고 `https://hooks.slack.com/services/...` URL을 복사합니다.
2. Grafana → **Alerts & IRM → Alerting → Notification configuration → Contact points → + Add contact point**.
3. Integration으로 **Slack** 선택 → Webhook 필드에 URL 입력 → **Test** → **Save contact point**.
4. Alert rule의 *Configure labels and notifications* → *Select contact point*에서 방금 만든 지점을 선택합니다.

주의 사항:
- Webhook 방식은 **contact point당 Slack 채널 하나**만 지원합니다.
- Grafana Cloud에서 webhook URL은 **protected field**라 관리자 권한이 있어야 변경할 수 있습니다(RBAC `alert.notifications.receivers.protected:write`).
- 웹훅 URL은 Grafana에 평문 저장되므로 저장소·로그·대시보드에 복사하지 않습니다.

### 4. 등록 순서

1. Grafana Cloud 계정 생성 → API 키/username/tenant ID 확인.
2. Slack Incoming Webhook 생성 → `SLACK_WEBHOOK_URL`.
3. Alloy 설치 후 위 설정 배치, launchd 등록, 로그·지표 전송 확인.
4. 대시보드 import(`dashboards.md` §3), 알림 규칙 등록(`alarms.md` §2 A1~A8), 테스트 알림 1회.
5. 플랜·보존 기간 결정(아래 F-5) 후 첫 청구월에 비용 기준선 기록.

## F-5. 비용 추적과 보존 기간

### 1. 최신 Free tier 한도(Grafana Cloud Pricing 기준)

| 항목 | Free | Pro |
|---|---|---|
| 비용 | $0 | $19/월 + 사용량 |
| Metrics active series | 10,000/월 | 10,000 포함 후 종량 |
| Logs 수집 | 50 GB/월 | 50 GB 포함 후 종량 |
| **보존 기간** | **14일** | metrics 13개월, logs 30일 |
| 지원 | Community | 8×5 email |

**충돌 기록**: 이전 설계(`Q3 B`)는 로그 30일 보존을 결정했지만, Grafana Cloud Free tier는 **14일**만 제공합니다. 30일 보존이 필요하면 **Pro 플랜($19/월)** 으로 올려야 합니다. 유지관리자가 플랜을 결정할 때까지 Free tier에서는 14일로 운영하고, 30일은 로컬 파일 정리 정책(월 1회)으로만 맞춥니다.

Grafana Loki 자체 호스팅이라면 `limits_config.retention_period: 720h`(30일)와 `compactor.retention_enabled: true`가 필요하고, 인덱스 period는 24h여야 합니다. Grafana Cloud tenant는 self-serve API/Support로 보존 기간을 조정합니다(로컬 Loki 설정 파일이 아님).

### 2. 비용 장부

인프라 비용은 0원입니다(자체 Mac + 무료 터널). 추적 대상은 Grafana Cloud와 Slack 플랜뿐입니다.

| 항목 | 기준선 | 기록 위치 |
|---|---|---|
| Grafana Cloud | Free $0 → Pro $19/월 검토 | 아래 장부 |
| Slack | 무료 플랜 | 아래 장부 |
| 도메인 `rvnnt.dev` | 기존 소유, 변경 없음 | 아래 장부 |

월 1일에 실제 청구액을 한 줄 추가합니다. 절감액은 추정하지 않고, Free 한도(10k series / 50 GB logs) 도달 여부만 확인합니다(`cost-analysis.md` §4).

```json
{
  "entries": []
}
```

자동 비용 수집 API는 연결하지 않습니다. 외부 서비스 계정과 자격 증명이 준비된 뒤决定합니다.

## 참고 문서

- https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/
- https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- https://grafana.com/docs/grafana-cloud/send-data/alloy/reference/components/prometheus/prometheus.remote_write/
- https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-slack/
- https://grafana.com/pricing/
- https://grafana.com/docs/grafana-cloud/platform/pricing-and-usage/logs/
- https://grafana.com/docs/loki/latest/operations/storage/retention/
