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

**실제 동작하는 구성(2026-11-21 확인)**: launchd 서비스(`sh.brew.alloy`)는 `.zshrc`의 환경 변수를 상속하지 않아 `sys.env(...)`가 빈 값이 되었습니다. 그래서 설정 파일(`/opt/homebrew/etc/alloy/config.alloy`)의 토큰은 `password_file`로 바꾸고, 권한 600인 토큰 파일 두 개를 사용합니다.
- `~/.config/alloy/fleet.token` — Fleet Management용, scope `set:alloy-data-write`
- `~/.config/alloy/cloud.token` — Loki/Prometheus 전송용, scope `metrics:write` + `logs:write`
- 토큰 스코프가 부족하면 `remotecfg`는 `invalid scope requested`, 전송은 401 `invalid scope requested`, 빈 값이면 `invalid token`이 납니다.
- 설정 변경 후 재시작: `launchctl kickstart -k gui/$(id -u)/sh.brew.alloy`

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

### 3. Slack contact point와 알림 규칙 (최신 UI)

Grafana 공식 절차(`Configure Slack for Alerting`, `Configure Grafana-managed alert rules`) 기준입니다. 예전 문서의 "Configure labels and notifications → Select contact point"는 현재 UI에 없습니다.

**Contact point 만들기**

1. Slack 앱에서 Incoming Webhook을 만들고 `https://hooks.slack.com/services/...` URL을 복사합니다.
2. Grafana → **Alerts & IRM → Alerting → Notification configuration → Contact points**.
3. **Choose Alertmanager** 드롭다운에서 Alertmanager 선택(기본: Grafana Alertmanager).
4. **+ New contact point** → 이름 입력 → **Integration: Slack** → Webhook 필드에 URL 입력 → **Test** → **Save**.

**알림 규칙에서 contact point 연결 (Grafana-managed rule)**

1. Alerts & IRM → Alert rules → **+ New alert rule** → 이름 입력.
2. **Define query and condition** — 데이터 소스·쿼리·조건 입력(Default 또는 Advanced).
3. **Set folder and labels** — 폴더 선택, 라벨은 이 별도 섹션에서 추가(선택).
4. **Configure alert evaluation behavior** — evaluation group과 pending period 지정.
5. **Configure notifications** ← 여기서 contact point 지정:
   - **Default**: contact point를 직접 선택. notification policy를 쓰지 않고 이 규칙의 알림이 모두 그 contact point로 감(단순한 구성에 적합).
   - **Advanced**: notification policy 트리로 라벨 기반 라우팅. `Preview routing`으로 확인 가능.
6. **Configure notification message** — summary, description, Runbook URL(선택).
7. **Save rule**.

규칙마다 지정하지 않으려면 **Notification configuration → Notification policies → Default policy → Default contact point**를 Slack contact point로 바꾸면 모든 알림이 그쪽으로 갑니다.

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

**결정(2026-11-21)**: **Free 플랜 유지**. Grafana Cloud 보존 기간은 **14일**을 그대로 수용하고, Pro($19/월)로 올리지 않습니다. 이전 설계(`Q3 B`)의 30일 보존은 클라우드 쪽에서 포기하고, **로컬 로그 파일만 월 1회 정리로 30일**을 맞춥니다. 대시보드의 보존 기간 표기도 14일 기준으로 둡니다.

Grafana Loki 자체 호스팅이라면 `limits_config.retention_period: 720h`(30일)와 `compactor.retention_enabled: true`가 필요하고, 인덱스 period는 24h여야 합니다. Grafana Cloud tenant는 self-serve API/Support로 보존 기간을 조정합니다(로컬 Loki 설정 파일이 아님).

### 2. 비용 장부

인프라 비용은 0원입니다(자체 Mac + 무료 터널). 추적 대상은 Grafana Cloud와 Slack 플랜뿐입니다.

| 항목 | 기준선 | 기록 위치 |
|---|---|---|
| Grafana Cloud | Free $0 (Pro 전환 안 함) | 아래 장부 |
| Slack | 무료 플랜 | 아래 장부 |
| 도메인 `rvnnt.dev` | 기존 소유, 변경 없음 | 아래 장부 |

월 1일에 실제 청구액을 한 줄 추가합니다. 절감액은 추정하지 않고, Free 한도(10k series / 50 GB logs) 도달 여부만 확인합니다(`cost-analysis.md` §4).

```json
{
  "entries": []
}
```

자동 비용 수집 API는 연결하지 않습니다. 외부 서비스 계정과 자격 증명이 준비된 뒤 결정합니다.

## 참고 문서

- https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/
- https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- https://grafana.com/docs/grafana-cloud/send-data/alloy/reference/components/prometheus/prometheus.remote_write/
- https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-slack/
- https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/
- https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/
- https://grafana.com/pricing/
- https://grafana.com/docs/grafana-cloud/platform/pricing-and-usage/logs/
- https://grafana.com/docs/loki/latest/operations/storage/retention/
