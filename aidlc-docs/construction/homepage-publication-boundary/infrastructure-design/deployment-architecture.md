# U2 Deployment Architecture — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 Infrastructure Design
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **결정 근거**: [Infrastructure Design](infrastructure-design.md) — no-change 판정

## 1. Build → 배포 흐름 (U2 이후)

```
external Vault (Passion Project.md에 visibility: homepage + slot — 승인된 단일 편집)
  → preprocessor (자체 정리 포함: PD-U2-03) → content/
       ├─ posts/, meta/          (post-only)
       ├─ homepage/index.md + meta.json   [build 입력 — 배포 비대상]
       ├─ manifest.json                    [build 입력 — 배포 비대상]
       ├─ 4개 discovery JSON → site/public/ 복사 (deploy-preprocess, 목록 불변)
       └─ assets/ → site/public/assets/ 복사 (기존 동작, 불변)
  → astro build → site/dist/ (`/` HTML 갱신, /posts/passion-project/ 부재)
  → [U2가 호출하지 않음] aws s3 sync --delete + cloudfront invalidation "/*"
```

## 2. 배포 표면 delta

| 경로 | U2 이전 | U2 이후 | 전달 메커니즘 |
|---|---|---|---|
| `/` | normal post 우회로 조합 | dedicated artifact + slot 조합 | 내용만 변경, 동일 경로 |
| `/posts/passion-project/` | 존재 | 부재 → 404 (403→404 mapping) | `sync --delete` + `/*` invalidation |
| discovery JSON, RSS, sitemap | homepage 포함 | post-only | 내용만 변경, 동일 경로 |
| 새 공개 경로 | — | 없음 | — |

## 3. 경계

- U2는 어떤 배포 명령도 호출하지 않는다. `deploy` recipe의 sync/invalidation 명령은 불변이며, Justfile 접촉은 C1-A의 동작 보존 refactoring으로 한정된다.
- Jenkins pipeline은 U3 ST-E04 소유로 U2가 변경하지 않는다.
- 상속 위험 9건과 배포 완전성 gate 부재는 U1 기록 그대로 U3/배포 권한자 이관 사안이다.
- Rollback 입장은 U1 기록 유지 (best-effort 재배포; local은 git + 결정적 재생성).
