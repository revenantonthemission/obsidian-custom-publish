# 배포 후 확인 결과 — `261115-personal-website`

- **단계**: Deployment Execution (`deployment-execution`), 2026-11-21 01:28 KST
- **확인 대상**: 2026-11-21 01:27에 `just deploy`로 배포된 웹 루트(`~/Sites/obsidian-blog`)
- **기준**: `operation/deployment-pipeline/cd-config.md` §4(H1–H3), `deployment-strategy.md` §7, `construction/build-and-test/test-results.md`(`build-test-results`), `operation/environment-provisioning/environment-inventory.md`(`environment-inventory`)
- **방법**: 실제 HTTP 응답과 상태 헤더를 `curl`로 측정. 자동 post-deploy 러너(`F1`)가 없어 수동 확인입니다

## 1. 요약

| # | 확인 | 기준 | 측정 | 판정 |
|---|---|---|---|---|
| H1 | `/` | HTTP 200 | 200 | ✅ |
| H2 | 글 하나 | HTTP 200 | `/posts/infrastructure-as-code` → 200 | ✅ |
| H3 | `/tags` | 301 + `Cache-Control: no-cache` + 대상 200 | 301, `Location: /writing/tags`, `no-cache`, 대상 200 | ✅ |
| O1 | 공개 사이트 `/` | HTTP 200 | `https://rvnnt.dev/` → 200 | ✅ |
| O2 | 공개 이동 페이지 | HTTP 200 | `https://rvnnt.dev/writing/tags` → 200 | ✅ |

세 게이트와 두 공개 확인이 모두 통과했습니다. `rollback-runbook.md` §2의 트리거 T1·T2가 발생하지 않았습니다.

## 2. H1 — 홈페이지

```
curl --head http://127.0.0.1:8080/
→ HTTP/1.1 200 OK
```

## 3. H2 — 글 하나

```
curl --head http://127.0.0.1:8080/posts/infrastructure-as-code
→ HTTP/1.1 200 OK
```

이 글은 빌드 로그에서 생성된 155개 글 중 하나입니다.

## 4. H3 — 예전 주소의 영구 리디렉션

원본 응답 헤더:

```
HTTP/1.1 301 Moved Permanently
Location: /writing/tags
Cache-Control: no-cache
Content-Length: 0
Date: Fri, 20 Nov 2026 16:28:20 GMT
Connection: keep-alive
```

| 판정 항목 | 결과 |
|---|---|
| 상태 301 | ✅ |
| `Cache-Control: no-cache` | ✅ — 브라우저에 저장된 301을 다음 방문에 재검증하게 합니다(`rollback-runbook.md` §7) |
| `Location` 대상 | `/writing/tags` → 로컬 200, 공개 200 ✅ |

이 확인은 U3의 이동 페이지를 처음 실은 배포에서 처음으로 의미를 가집니다. `cd-config.md` §4의 H3을 그대로 수행했습니다.

## 5. 공개 경로

| 경로 | 응답 |
|---|---|
| `https://rvnnt.dev/` | 200 |
| `https://rvnnt.dev/writing/tags` | 200 |

터널(`http://127.0.0.1:8080` 단일 인입)은 오리진 바인딩이 `127.0.0.1`로 바뀐 뒤에도 정상입니다.

## 6. 이동 페이지와 테이블

| 항목 | 확인 |
|---|---|
| `_redirects.json` | 웹 루트에 존재(6,788 B, 79 규칙). 빌드가 작성한 같은 파일이 배포됐습니다 |
| `writing/` 트리 | `index.html`, `all/`, `graph/`, `tags/` 존재 |
| 예전 `tags/`, `graph/` | 삭제됨 — 구주소는 파일이 아니라 테이블의 301로 답합니다 |
| 서버 재시작 | 불필요. PID 40304가 계속 서비스하며, 테이블은 수정 시간 변화로 재읽습니다(`cd-config.md` §3) |

## 7. 확인하지 않은 것

| 항목 | 이유 |
|---|---|
| `npm run test:e2e` | 수동 접근성 기록 만료(`MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, digest `3d578e5b…`)로 배포 전부터 막혀 있었습니다. Q2 A(알려진 격차 수용)와 Q3 A(재검증 생략)에 따라 배포 후에도 실행하지 않았습니다 |
| HIG·crossunit·단위 스위트 | 이 단계의 범위가 아닙니다. 마지막 결과는 `test-results.md` R5.4에 기록되어 있고 모두 통과했습니다 |
| `U1-NFR6.1`(Jenkins Verify on merge commit) | push가 없어 원격 커밋이 없습니다. `origin/develop`은 여전히 `db7ecae`입니다 |
| 30일 SLO 신호 | 운영 데이터가 쌓여야 합니다(`observability-setup` 소유) |

## 8. 결론

배포는 **성공**했고, 배포 후 확인 항목 전부가 통과했습니다. 수동 접근성 검토와 Jenkins Verify는 이번 배포의 게이트가 아니었으며, 그 격차는 `deployment-log.md` §7과 `health-check-report.md` §6에 남겼습니다.
