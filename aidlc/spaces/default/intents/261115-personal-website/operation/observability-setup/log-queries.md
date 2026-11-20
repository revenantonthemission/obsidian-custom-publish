# 로그 쿼리와 보존 — `261115-personal-website`

- **단계**: Observability Setup (`observability-setup`), 2026-11-21 KST
- **결정**: Q3 B — 30일 보존, Q2 C — 외부 대시보드로 전송
- **상위 산출물**: 네 단위의 `construction/*/nfr-design/{performance-design,security-design,reliability-design}.md`, `construction/*/infrastructure-design/{monitoring-design,infrastructure-specification}.md`(`monitoring-design`, `infrastructure-specification`), `construction/u1-publish-boundary/nfr-design/observability-design.md`

## 1. 로그 소스

| # | 경로 | 쓰는 주체 | 현재 크기(측정) | 보존 |
|---|---|---|---|---|
| L1 | `~/Library/Logs/obsidian-blog-server.log` | launchd `dev.rvnnt.blog` 표준 출력·오류 | 723 B | 30일 |
| L2 | `~/Library/Logs/obsidian-blog-tunnel.log` | launchd `dev.rvnnt.tunnel` | 47 KB | 30일 |
| L3 | `/opt/homebrew/var/log/jenkins/output.log` | Jenkins 프로세스 | 119 B | 30일 |
| L4 | `/opt/homebrew/var/log/jenkins/error.log` | Jenkins 프로세스 | 3.5 KB | 30일 |
| L5 | Jenkins 작업 콘솔(빌드별) | 빌드 단계 | 빌드마다 | 30일 |

plist에 회전·보존 설정은 없습니다(측정). Q3 B에 따라 Alloy 전송 시 Loki retention을 30일로 설정하고, 로컬 파일은 월 1회 30일 이상된 항목을 정리합니다.

## 2. 고정 형식 라인

전처리 출력은 `observability-design.md` §2의 순서를 따릅니다.

| 순서 | 스트림 | 패턴 |
|---|---|---|
| 1 | stderr | 사용 오류(exit 2) |
| 2 | stderr | `notice: site pages folder …` |
| 3 | stderr | `warning: skipped symbolic link …` |
| 4 | stderr | 기존 경고(잘못된 YAML, 슬러그 충돌) |
| 5 | stderr | `notice: … is empty; publishing no site pages` |
| 6 | stderr | `PUBxxx <path>: <detail>` (정렬, exit 1) |
| 7 | stderr | `warning: attachment not found` |
| 8 | stdout | `published <N> posts, <M> site pages, <K> assets` |

U3가 추가한 서버 라인: 리디렉션 테이블이 없거나 잘못됐을 때의 **한 줄 오류**. 성공한 리디렉션은 로그를 남기지 않습니다.

## 3. 자주 쓰는 쿼리

아래는 Loki LogQL이며, 괄호 안은 로컬 `grep` 대안입니다.

```logql
# 발행 요약 (최근 빌드 결과 확인)
{job="jenkins-console"} |= "published"                 # grep '^published ' <console>

# 사이트 페이지 수 불일치 / 빈 폴더 알림
{job="jenkins-console"} |= "site pages folder"          # grep 'site pages folder' <console>

# 코드 진단과 사용 오류
{job="jenkins-console"} =~ "PUB[0-9]{3}|usage:"         # grep -E 'PUB[0-9]{3}|usage:'

# 링크·첨부 경고
{job="jenkins-console"} |= "warning:"                   # grep 'warning:'

# 리디렉션 테이블 거부 (U3)
{job="blog-server"} |= "redirect table"                 # grep -i 'redirect table' <server-log>

# 서버 오류 라인 수(5분 버킷)
sum(count_over_time({job="blog-server"} |= "error" [5m]))

# 터널 연결 실패
{job="blog-tunnel"} =~ "ERR|failed|error"                # grep -iE 'ERR|failed|error' <tunnel-log>
```

## 4. 보존 절차(매월 1일, 수동)

1. 각 로그 파일의 타임스탬프와 30일 기준 시각을 비교합니다.
2. Loki에서는 retention 30일이 자동 적용되는지 확인합니다.
3. 로컬 파일은 오래된 줄만 잘라 별도 아카이브에 남기거나 삭제합니다(유지관리자 결정).
4. 체크 로그 `checks.jsonl`도 같은 30일 정책을 따릅니다.

automated log rotation은 만들지 않습니다. 파일이 작아 당분간 수동으로 충분합니다(최대 47 KB).

## 5. 비밀과 개인정보

- 로그에 자격 증명·웹훅 URL·터널 자격 증명 내용이 들어가지 않도록 합니다.
- 전처리 진단은 경로만 출력하고 파일 내용·환경 변수 값은 출력하지 않습니다(`security-requirements.md` NFR5.9).
- Alloy 설정과 Grafana API 키는 저장소 밖의 환경 변수로 관리합니다.
- 외부 전송 시 Slack 웹훅 URL은 alert 규칙 안에 노출하지 않습니다(`alarms.md` §1).
