import type { ProfileData } from './types.js';

function fact<Value>(factId: string, value: Value) {
  return { factId, value };
}

function paragraph(factId: string, value: string) {
  return { tag: 'paragraph' as const, text: fact(factId, value) };
}

const approvedProfileSource = {
  identity: {
    name: fact('identity-name', '조준희'),
    headline: fact(
      'identity-headline',
      '안녕하세요. IT 서비스를 만드는 조준희입니다.',
    ),
  },
  narrative: {
    shortIntro: fact(
      'narrative-short-intro',
      '백엔드 프로그래밍과 인프라 엔지니어링을 공부하며, 직접 쓰는 서비스를 만들고 운영합니다.',
    ),
    detailedIntro: [
      paragraph(
        'narrative-detailed-intro-0-text',
        '의료기술 제조사 소프트웨어 개발 인턴십으로 프로젝트 경험을 시작했습니다. 현재는 백엔드 프로그래밍과 인프라 엔지니어링을 공부하며, 문제 정의부터 구현·검증·운영까지 이어지는 작업을 쌓고 있습니다.',
      ),
    ],
    resumeSummary: fact(
      'narrative-resume-summary',
      '의료기술 제조사 인턴십에서 소프트웨어 개발을 경험했고, 백엔드와 인프라를 중심으로 프로젝트를 이어가고 있습니다.',
    ),
    portfolioSummary: fact(
      'narrative-portfolio-summary',
      '데이터의 수집·정규화·색인부터 서비스가 결과를 사용하는 순간까지 다룹니다. DocSuri의 데이터 파이프라인과 운영 안정화, 개인 프로젝트의 산출물 검증 경험을 소개합니다.',
    ),
  },
  contact: {
    email: fact('contact-email', 'corpseonthemission@icloud.com'),
    github: fact(
      'contact-github',
      'https://github.com/revenantonthemission',
    ),
    additionalLinks: [],
  },
  skillGroups: [
    {
      id: 'languages',
      order: 10,
      title: fact('skill-group-languages-title', '프로그래밍 언어'),
      skills: [
        { id: 'c', order: 10, name: fact('skill-c-name', 'C') },
        { id: 'cpp', order: 20, name: fact('skill-cpp-name', 'C++') },
        {
          id: 'python',
          order: 30,
          name: fact('skill-python-name', 'Python'),
        },
        {
          id: 'javascript',
          order: 40,
          name: fact('skill-javascript-name', 'JavaScript'),
        },
        {
          id: 'typescript',
          order: 50,
          name: fact('skill-typescript-name', 'TypeScript'),
        },
        { id: 'dart', order: 60, name: fact('skill-dart-name', 'Dart') },
        { id: 'rust', order: 70, name: fact('skill-rust-name', 'Rust') },
      ],
    },
    {
      id: 'backend-data',
      order: 20,
      title: fact('skill-group-backend-data-title', '백엔드·데이터'),
      skills: [
        {
          id: 'fastapi',
          order: 10,
          name: fact('skill-fastapi-name', 'FastAPI'),
        },
        {
          id: 'uvicorn',
          order: 20,
          name: fact('skill-uvicorn-name', 'Uvicorn'),
        },
        {
          id: 'sqlalchemy',
          order: 30,
          name: fact('skill-sqlalchemy-name', 'SQLAlchemy'),
        },
        { id: 'redis', order: 40, name: fact('skill-redis-name', 'Redis') },
        {
          id: 'apache-kafka',
          order: 50,
          name: fact('skill-apache-kafka-name', 'Apache Kafka'),
        },
        {
          id: 'mysql-mariadb',
          order: 60,
          name: fact('skill-mysql-mariadb-name', 'MySQL/MariaDB'),
        },
      ],
    },
    {
      id: 'infrastructure',
      order: 30,
      title: fact('skill-group-infrastructure-title', '인프라'),
      skills: [
        {
          id: 'docker',
          order: 10,
          name: fact('skill-docker-name', 'Docker'),
        },
        {
          id: 'kubernetes',
          order: 20,
          name: fact('skill-kubernetes-name', 'Kubernetes'),
        },
        { id: 'nginx', order: 30, name: fact('skill-nginx-name', 'NGINX') },
        { id: 'aws', order: 40, name: fact('skill-aws-name', 'AWS') },
        {
          id: 'github-actions',
          order: 50,
          name: fact('skill-github-actions-name', 'GitHub Actions'),
        },
      ],
    },
    {
      id: 'tooling-client',
      order: 40,
      title: fact('skill-group-tooling-client-title', '도구·클라이언트'),
      skills: [
        {
          id: 'flutter',
          order: 10,
          name: fact('skill-flutter-name', 'Flutter'),
        },
        { id: 'git', order: 20, name: fact('skill-git-name', 'Git') },
        { id: 'astro', order: 30, name: fact('skill-astro-name', 'Astro') },
        {
          id: 'sveltekit',
          order: 40,
          name: fact('skill-sveltekit-name', 'SvelteKit'),
        },
      ],
    },
  ],
  experiences: [
    {
      id: 'hansono',
      order: 10,
      organization: fact('experience-hansono-organization', '한소노'),
      role: fact('experience-hansono-role', '소프트웨어 개발 인턴'),
      period: fact('experience-hansono-period', {
        start: { tag: 'year-month', value: '2023-07' },
        end: { tag: 'year-month', value: '2023-08' },
      }),
      summary: fact(
        'experience-hansono-summary',
        'Flutter와 FFI를 활용한 의료기기 프로토타입 개발을 경험했습니다.',
      ),
      details: [
        paragraph(
          'experience-hansono-details-0-text',
          'Windows 환경에서 초음파 진단기를 인식하는 Flutter 프로토타입 개발에 참여했습니다.',
        ),
        paragraph(
          'experience-hansono-details-1-text',
          '2023년 10월 29일부터 11월 6일까지 독일에서 한소노 소속으로 의료기술 제조사 eZono와 FFI 기반 프로토타입을 개발했습니다.',
        ),
      ],
      evidence: [],
    },
  ],
  achievements: [],
  projects: [
    {
      id: 'docsuri',
      order: 10,
      title: fact('project-docsuri-title', 'DocSuri'),
      outcomeSummary: fact(
        'project-docsuri-outcome-summary',
        '4인 팀의 데이터 엔지니어로 멀티소스 논문 수집·구조화·임베딩·색인과 인프라를 맡았습니다. 백필 중 검색 503을 복구하고, 사용자 문서 생성의 큐·워커를 분리했습니다.',
      ),
      problem: [
        paragraph(
          'project-docsuri-problem-0-text',
          'AI/ML 논문을 탐색하고 원문에 근거한 한국어 요약을 제공하는 서비스입니다. 수집한 데이터가 검색·문서 열람·요약으로 이어지므로, 서로 다른 소스의 중복·버전·철회를 처리하면서 백필의 처리량과 사용자 응답성을 함께 관리해야 했습니다.',
        ),
        paragraph(
          'project-docsuri-problem-backfill-contention',
          '검색 503과 작업 적체 — 2026년 7월 AWS 운영 중 대량 arXiv 백필이 OpenSearch 읽기 경로에 영향을 주어 k-NN 검색의 2초 타임아웃이 발생했습니다. 사용자 문서 생성도 약 3.3만 건의 백필 뒤에서 기다렸습니다. 프로세스별 요청 제한을 지키더라도 워커 3개의 전체 요청량은 늘어난다는 점을 진단했습니다.',
        ),
      ],
      role: [
        paragraph(
          'project-docsuri-role-0-text',
          'AWS AI School 2기 4인 팀의 Data Engineer로 U1 코퍼스 수집·구조화·임베딩·색인, 인프라 운영과 후속 개선을 담당했습니다. 검색·요약·에이전트의 초기 전체 구현과 후속 GROBID TEI 구조 파서는 다른 팀원의 기여입니다.',
        ),
        paragraph(
          'project-docsuri-role-contract-collaboration',
          '데이터 계약과 협업 — 수집 데이터의 필드·의미를 바꿀 때 공용 JSON Schema·Python DTO와 요약·프런트 소비자를 함께 수정했습니다. 호출 동작은 Protocol 포트로 나누고 생산자·소비자·검토 책임을 맞췄습니다. 기존 문서 추적성 도구에는 한국어 요구사항 ID·모노레포 경로·유닛 계획을 해석하는 기능을 보완해 리뷰할 연결을 찾았습니다.',
        ),
      ],
      keyDecisions: [
        paragraph(
          'project-docsuri-key-decisions-0-text',
          '수집량 제어와 사용자 작업 격리 — 7월 1일 수집 워커를 3개에서 1개로 줄여 검색을 복구하고, 사용자 DocModel 작업에 전용 우선순위 큐를 뒀습니다. 7월 2일에는 별도 워커 서비스로 실행 자원까지 분리했습니다. 외부 소스의 한도를 고려한 확장 상한과 bulk 30분·DocModel 5분 대기 알람, 검색 지연을 함께 확인하는 DLQ 재처리 절차를 남겼습니다.',
        ),
        {
          tag: 'list',
          style: 'unordered',
          items: [
            fact(
              'project-docsuri-decision-canonical-records',
              '멀티소스 결합 — DOI→arXiv ID→정규화한 제목·첫 저자·연도 순서의 식별 키와 소스 우선순위로 대표 레코드를 선택했습니다. 낮은 우선순위의 중복은 원문 추출·임베딩 전에 걸렀고, 대표의 별칭·관측 소스를 보존했습니다. 버전·우선순위 조건부 갱신과 철회 시 청크·캐시·자산·canonical 상태 정리를 구성했습니다.',
            ),
            fact(
              'project-docsuri-decision-retry-watermarks',
              '재시도·완료 상태 — 같은 버전의 재전달과 bulk 부분 실패를 테스트하고, 항목 실패 시 완료 상태를 기록하지 않도록 했습니다. 재시도·DLQ에는 소스와 실패 단계를 보존했습니다. 소스별 watermark의 단조성·독립성을 속성 테스트로 확인하고, 재구축 중 스케줄·이벤트 등록과 기존 작업 실행을 제한했습니다.',
            ),
            fact(
              'project-docsuri-decision-reprocessing-modes',
              '목적별 재처리 — 저장 구조 변경은 기존 레코드 복사, 모델 변경은 저장된 청크의 재임베딩, 파서 변경은 원본 바이트 캐시의 재파싱으로 출발점을 나눴습니다. 문서 열람용 DocModel 재생성과 검색 청크·벡터 갱신도 구분해 불필요한 원문 재수집을 줄이도록 설계했습니다.',
            ),
            fact(
              'project-docsuri-decision-quota-resume',
              '호출 한도와 재시작 — 계정 전체의 모델 호출 한도를 고려해 예상 토큰 수로 배치를 pacing했습니다. 속도 제한 모드에서는 같은 대상 인덱스에 기록된 문서를 조회해 재임베딩을 생략하고, 토큰 버킷 용량보다 큰 배치의 처리도 회귀 테스트로 확인했습니다. 재사용은 같은 대상·설정으로 재시작한다는 전제입니다.',
            ),
            fact(
              'project-docsuri-decision-index-cutover',
              '인덱스 전환 — 후보 적재, 최소 문서 수·원본 대비 수량 점검, replica·refresh 복원, alias 전환, 수집 재개를 별도 절차로 뒀습니다. alias의 이전 대상 제거와 새 대상 추가는 한 요청으로 수행합니다. 차원 변경에는 reader/writer의 공유 스펙·이미지를 함께 맞추고, 복구 시 이전 이미지와 alias를 되돌리도록 문서화했습니다.',
            ),
            fact(
              'project-docsuri-decision-input-boundaries',
              '외부 입력 검증 — 공인 IP·리다이렉트 검사, 스트리밍 응답 상한, XML 엔티티 확장·압축 해제 제한을 보완했습니다. 6월 29일 기록의 상한은 외부 응답 64MB, XML 32MB, 압축 개별 항목 20MB·합계 200MB입니다. 외부 문서 입력 경계의 구현·회귀 검증에 해당합니다.',
            ),
            fact(
              'project-docsuri-decision-cost-quotas',
              '비용 제어 — 팀의 공통 비용 제어 기반 위에서 에이전트 warning/critical 처리 경계를 보완하고 실행 비용을 관측 지표에 기록했습니다. Redis 기반 사용자 쿼터를 연결해 공통 서비스 예산과 개별 사용량 제한을 구분했습니다.',
            ),
          ],
        },
      ],
      architecture: [
        paragraph(
          'project-docsuri-architecture-0-text',
          '수집에서 활용까지 — arXiv·Semantic Scholar·OpenAlex→수집 큐→문서 구조화→청크·임베딩→OpenSearch→검색·열람·요약으로 연결했습니다. AWS 시기에는 Python, PostgreSQL, SQS, ECS/Fargate, S3, Bedrock, CDK, CloudWatch, Redis를 사용했고, 사용자 열람용 문서 생성은 별도 큐·워커로 처리했습니다.',
        ),
        paragraph(
          'project-docsuri-architecture-docmodel-contract',
          'DocModel — 섹션·블록의 공통 표현에서 읽기 순서의 본문과 검색 청크를 만들었습니다. 문단·표·수식·그림 캡션에 논문·버전·섹션·블록 식별자를 연결하고 검색 토큰과 blockRefs를 분리했습니다. parser/schema 버전으로 저장물의 호환성을 판단하며, 소비자 측 파생 캐시는 DocModel 세대를 구분합니다.',
        ),
        paragraph(
          'project-docsuri-architecture-vector-contract',
          '벡터 계약 — 팀의 공용 스펙은 모델·specVersion·차원·거리 함수·정규화를 동일 공간의 조건으로 다루고 문서용·질의용 input type을 구분합니다. 비교 함수와 필드별 불일치 테스트를 사용하되, 모든 런타임에 강제되는 배포 게이트와는 구분했습니다.',
        ),
        {
          tag: 'list',
          style: 'unordered',
          items: [
            fact(
              'project-docsuri-architecture-derived-assets',
              '파생 자산 — 팀의 그림·도표 파이프라인은 주 색인 처리 뒤에 best-effort로 실행합니다. 객체 저장소에 먼저 쓰고 DB manifest를 갱신하며 문서 블록의 assetId와 연결합니다. 검색 가능 상태와 화면 자산 준비 상태를 구분하고 버전 변경·철회 시 파생물을 정리합니다.',
            ),
            fact(
              'project-docsuri-architecture-user-pdf',
              '사용자 PDF — 공개 논문과 구별되는 userdoc 식별자·작업 종류를 정의했습니다. job·owner·record reference의 일치를 검사하고 저장된 PDF를 공통 DocModel로 변환하며, 잘못된 입력과 파싱 불가는 영구 실패로 분류해 DLQ로 보냈습니다. 이는 메시지 입력 계약이며 읽기 API의 소유자 검사까지 해결한 것은 아닙니다.',
            ),
            fact(
              'project-docsuri-architecture-local-runtime',
              '환경 이전 — 2026년 8월 AWS 운영을 종료하고 컨테이너·로컬 서버, MinIO·ElasticMQ·Ollama로 연결을 변경했습니다. 외부 heartbeat로 호스트 장애를 관측하고, launchd 실행 권한에 따른 백업 정리 실패를 manifest·날짜 기준 retention·재시도로 보완했습니다. 현재 구성은 단일 호스트입니다.',
            ),
            fact(
              'project-docsuri-architecture-deployment-boundaries',
              '배포 경계 — 자산 조회에 필요한 prefix 범위의 S3 권한을 보완하고, metric namespace와 실제 IAM·전달 여부를 대조했습니다. 기존 큐는 재생성 충돌을 확인해 import하고 기능 플래그를 보존했으며 commit tag·서비스 안정화·health로 배포를 추적했습니다. 종료된 도메인 기본값 정리 시 재현 fixture와 식별용 namespace는 보존했습니다.',
            ),
          ],
        },
        paragraph(
          'project-docsuri-architecture-consumer-scope',
          '팀의 데이터 소비자 — 검색·요약·개인화·인용 기능은 제가 생산한 데이터가 쓰이는 경계로 함께 살폈습니다. 아래 항목은 팀의 구현·평가 사례이며 전체 기능의 개인 구현 성과와 구분합니다.',
        ),
        {
          tag: 'list',
          style: 'unordered',
          items: [
            fact(
              'project-docsuri-consumers-events-degradation',
              '이벤트·실패 의미 — 검색 이력은 requestId로 같은 이벤트의 재전달과 같은 질의의 새 실행을 구분합니다. 임베딩 장애의 lexical fallback과 색인 조회 불가를 나누고, 요약도 비용 제한·생성 장애·원문 부재를 별도 상태로 다룹니다.',
            ),
            fact(
              'project-docsuri-consumers-cache-personalization',
              '캐시·집계 — 파생 캐시는 논문·버전·언어·persona·용어집·모델·프롬프트·DocModel 세대를 구분합니다. 개인화 boost에는 개별 값과 절댓값 합의 상한을 두고, 세 범주의 동률 반례를 속성 테스트에 고정했습니다.',
            ),
            fact(
              'project-docsuri-consumers-evaluation-citations',
              '평가·외부 참조 — 요약 근거 평가는 실제 논문 8건의 수치 발췌로 만든 18개 사례와 false-pass/false-abstain을 구분합니다. confident 14개 성공 기록은 통제된 평가에 한정됩니다. 인용 그래프는 미해결 canonical ID, 순환·중복, 탐색량 제한과 부분 결과를 표현하도록 설계했습니다.',
            ),
          ],
        },
      ],
      outcomes: [
        paragraph(
          'project-docsuri-outcomes-0-text',
          '검색 복구 — 7월 1일 워커 3→1 축소 후 장애 재현 쿼리의 정상 응답을 확인했습니다. 다음 날의 추가 안정화에서는 수집·자동 확장을 일시 정지하고 큐를 보존했으며, 검색이 비저하 결과 20건을 반환했습니다. 아래 수치는 당시 문서·커밋의 관측값입니다.',
        ),
        paragraph(
          'project-docsuri-outcomes-bounded-canary',
          '제한된 재처리 — 단일 논문 파일럿에서 118개 청크와 13개 자산을 생성했습니다. 처리 대상 큐는 0, 수집 DLQ는 111건으로 유지됐고 검색도 비저하 상태였습니다. 7월 8일 문서 생성 DLQ 24→0은 다른 큐의 후속 복구 기록입니다. 전체 백필 완료나 장기 SLA를 의미하지 않습니다.',
        ),
        paragraph(
          'project-docsuri-outcomes-mixed-load',
          '혼합 부하 검증 — 조치 후 20 VU의 k6 기록은 검색 p95 664.9ms, 전체 HTTP 오류율 0.01%입니다. 프런트·readyz·검색을 섞었고 반복 단일 질의에는 캐시 영향이 있을 수 있습니다. 0.01%는 검색만의 오류율이 아닙니다. 이전 검색 p95 9,061ms는 12회·동시성 3의 다른 조건이므로 개선율을 계산하지 않았습니다.',
        ),
        paragraph(
          'project-docsuri-outcomes-runtime-diagnosis',
          '운영 상태 진단 — 별도 backlog 조사에서 약 15.3만 건이 대기할 때 코드·템플릿의 확장 상한 1과 실제 설정 0의 차이를 확인했습니다. 이는 워커가 실행되지 않는 원인을 좁힌 기록입니다. 관측 모듈에는 중복 이벤트 상태의 메모리 상한과 로그 redaction을 보완했으며, 오래된 ID 제거 후 재수신 가능성은 남습니다.',
        ),
        paragraph(
          'project-docsuri-outcomes-recovery-checks',
          '복구 확인 — AWS 시기에는 팀이 CloudWatch 이메일 수신과 RDS snapshot의 새 인스턴스 복원·available 상태를 확인했습니다. 로컬 이전 후에는 실제 launchd 실행과 백업 양쪽 dump 생성을 확인했습니다. dump 확인은 복원 시험과 다르며, AWS 검증이 현재 객체 저장소·검색 인덱스의 통합 복원을 보증하지는 않습니다.',
        ),
      ],
      lessons: [
        paragraph(
          'project-docsuri-lessons-0-text',
          '검증의 기준 — 작업 성공, 저장물 존재, 데이터 품질, 사용자의 활용 성공은 서로 다른 검증 대상입니다. 재처리와 온라인 조회의 목표를 나누고, 처리량뿐 아니라 실패의 영향 범위·복구 방법·데이터 소비자의 요구를 함께 설명하는 기준을 얻었습니다.',
        ),
        paragraph(
          'project-docsuri-lessons-verification-limits',
          '검증 범위 — 중복·부분 실패 테스트를 모든 동시성의 exactly-once나 저장소 간 원자성으로 확대하지 않습니다. 인덱스 점검은 수량 부족 감지이며 cutover 자체가 검증 실행을 강제하지 않습니다. 재파싱은 개별 실패 후에도 종료 코드 0일 수 있어 로그와 결과를 대조해야 합니다. 자산 저장도 분산 트랜잭션은 아닙니다.',
        ),
        paragraph(
          'project-docsuri-lessons-current-quality',
          '남은 품질 과제 — 최신 감사에는 코퍼스 fixture 혼입, 공유 캐시의 원문 결속, 사용자 문서 읽기 권한, 일부 타입 생성의 실패 전파와 빈 결과의 저하 표시 문제가 남아 있습니다. 원본·색인의 ID와 내용, 실패 건수와 종료 상태, source identity·소유권 경계, 호스트 장애 후 복원을 후속 검증 기준으로 삼았습니다.',
        ),
        paragraph(
          'project-docsuri-lessons-platform-direction',
          '앞으로의 방향 — 여러 소스의 정규화·결합과 재시작 가능한 배치, reader/writer 계약, 부하·비용·복구를 다룬 경험을 더 큰 데이터 플랫폼으로 확장하고 싶습니다. 새 기술을 선택할 때에도 데이터를 생산하는 과정과 사용하는 동료의 요구를 함께 살피겠습니다.',
        ),
      ],
      evidence: [
        {
          id: 'docsuri-team-repository',
          order: 10,
          label: fact(
            'project-docsuri-evidence-team-label',
            'DocSuri 팀 GitHub 저장소 보기',
          ),
          destination: fact('project-docsuri-evidence-team-destination', {
            tag: 'external',
            value: 'https://github.com/80-hours-a-week/DocSuri',
          }),
        },
        {
          id: 'docsuri-fork-repository',
          order: 20,
          label: fact(
            'project-docsuri-evidence-fork-label',
            'DocSuri 개인 fork 저장소 보기',
          ),
          destination: fact('project-docsuri-evidence-fork-destination', {
            tag: 'external',
            value: 'https://github.com/revenantonthemission/DocSuri',
          }),
        },
        {
          id: 'docsuri-search-recovery',
          order: 30,
          label: fact(
            'project-docsuri-evidence-search-recovery-label',
            '검색 복구를 위한 수집량 제어',
          ),
          destination: fact('project-docsuri-evidence-search-recovery-destination', {
            tag: 'external',
            value: 'https://github.com/80-hours-a-week/DocSuri/commit/7edbcc51',
          }),
        },
        {
          id: 'docsuri-worker-isolation',
          order: 40,
          label: fact(
            'project-docsuri-evidence-worker-isolation-label',
            '파이프라인·워커·인프라 개선 PR #323',
          ),
          destination: fact('project-docsuri-evidence-worker-isolation-destination', {
            tag: 'external',
            value: 'https://github.com/80-hours-a-week/DocSuri/pull/323',
          }),
        },
        {
          id: 'docsuri-request-limits',
          order: 50,
          label: fact(
            'project-docsuri-evidence-request-limits-label',
            '외부 요청량 제한 개선 PR #420',
          ),
          destination: fact('project-docsuri-evidence-request-limits-destination', {
            tag: 'external',
            value: 'https://github.com/80-hours-a-week/DocSuri/pull/420',
          }),
        },
      ],
    },
    {
      id: 'obsidian-custom-publish',
      order: 20,
      title: fact(
        'project-obsidian-custom-publish-title',
        'obsidian-custom-publish',
      ),
      outcomeSummary: fact(
        'project-obsidian-custom-publish-outcome-summary',
        'Obsidian 문서를 Rust·Astro 기반 정적 블로그로 게시합니다. CI가 성공해도 다이어그램이 누락되던 문제를 고쳐 렌더링 실패가 배포 흐름에 전달되도록 했습니다.',
      ),
      problem: [
        paragraph(
          'project-obsidian-custom-publish-problem-0-text',
          'Obsidian 문서의 위키링크·검색·탐색 트리·미리보기·다이어그램을 정적 사이트로 옮기는 개인 프로젝트입니다. 2026년 7월에는 CI가 성공했지만 28개 글에서 Mermaid 렌더링 65건이 실패해 다이어그램이 빠진 문서가 배포됐습니다.',
        ),
        paragraph(
          'project-obsidian-custom-publish-problem-renderer-exit',
          '원인 — 로컬 브라우저 설정 파일이 Git 관리 대상에서 제외되어 CI로 전달되지 않았고 Puppeteer가 브라우저를 찾지 못했습니다. 렌더러 오류가 경고로 처리돼 전처리 명령은 성공한 채 배포가 이어졌습니다.',
        ),
      ],
      role: [
        paragraph(
          'project-obsidian-custom-publish-role-0-text',
          '저장소 소유자로서 Rust 전처리기, Astro 렌더링 경로와 배포 구성을 설계·구현하고 운영했습니다.',
        ),
      ],
      keyDecisions: [
        paragraph(
          'project-obsidian-custom-publish-key-decisions-0-text',
          '스캔→링크→변환→검색→출력의 전처리와 Astro 렌더링을 분리했습니다. CI에 브라우저 실행 경로를 명시하고, Mermaid/D2 SVG 렌더링 실패를 집계해 전처리 명령의 실패로 전파하도록 변경했습니다. 조사에 필요한 생성 파일은 남겼습니다.',
        ),
      ],
      architecture: [
        paragraph(
          'project-obsidian-custom-publish-architecture-0-text',
          'Rust CLI가 Vault를 가공해 콘텐츠와 검색·그래프·탐색 데이터를 만들고, Astro 6 사이트가 unified·rehype·Shiki·KaTeX 파이프라인으로 정적 HTML을 생성합니다.',
        ),
      ],
      outcomes: [
        paragraph(
          'project-obsidian-custom-publish-outcomes-0-text',
          '당시 재현 기록 — 브라우저 경로가 없으면 종료 코드 1과 렌더 실패 65건, 경로가 있으면 종료 코드 0과 밝은·어두운 테마용 SVG 130개를 확인했습니다. 해당 렌더링 경로의 검증이며 모든 파일 쓰기 실패를 포괄하지는 않습니다.',
        ),
        paragraph(
          'project-obsidian-custom-publish-outcomes-artifact-validation',
          '입력·출력 검증 — 공개 범위와 홈페이지 참조 규칙을 출력 전에 검사하고, manifest와 실제 생성 파일 목록을 대조하는 테스트를 뒀습니다. 외부 다이어그램 렌더러를 제외한 fixture에서는 같은 입력을 재실행했을 때 출력 바이트가 일치하는지도 확인합니다.',
        ),
      ],
      lessons: [
        paragraph(
          'project-obsidian-custom-publish-lessons-0-text',
          '실행 성공과 산출물의 품질을 함께 확인해야 한다는 기준을 얻었습니다. 파이프라인 종료 상태에 렌더러 실패를 반영하고, 입력 계약과 출력 검증을 통해 재현 가능한 배포를 관리합니다.',
        ),
      ],
      evidence: [
        {
          id: 'obsidian-custom-publish-repository',
          order: 10,
          label: fact(
            'project-obsidian-custom-publish-evidence-label',
            'obsidian-custom-publish GitHub 저장소 보기',
          ),
          destination: fact(
            'project-obsidian-custom-publish-evidence-destination',
            {
              tag: 'external',
              value:
                'https://github.com/revenantonthemission/obsidian-custom-publish',
            },
          ),
        },
        {
          id: 'obsidian-custom-publish-render-failure',
          order: 20,
          label: fact(
            'project-obsidian-custom-publish-evidence-render-failure-label',
            '렌더링 실패를 CI로 전파한 수정',
          ),
          destination: fact(
            'project-obsidian-custom-publish-evidence-render-failure-destination',
            {
              tag: 'external',
              value:
                'https://github.com/revenantonthemission/obsidian-custom-publish/commit/f82c9eb370f34470d0c930b9e89630f7fceb278e',
            },
          ),
        },
      ],
    },
    {
      id: 'mcp-local-reference',
      order: 30,
      title: fact(
        'project-mcp-local-reference-title',
        'mcp-local-reference',
      ),
      outcomeSummary: fact(
        'project-mcp-local-reference-outcome-summary',
        '로컬 Zotero 라이브러리를 검색하고 PDF 텍스트·도판과 Harvard 인용을 제공하는 MCP 서버를 만들었습니다.',
      ),
      problem: [
        paragraph(
          'project-mcp-local-reference-problem-0-text',
          '연구 자료를 외부 서비스에 복제하지 않고 로컬 Zotero 데이터와 PDF에서 빠르게 찾고 인용 가능한 형태로 꺼낼 방법이 필요했습니다.',
        ),
      ],
      role: [
        paragraph(
          'project-mcp-local-reference-role-0-text',
          '저장소 소유자로서 MCP 도구, 로컬 데이터 접근, 인덱싱과 인용 출력 흐름을 설계·구현했습니다.',
        ),
      ],
      keyDecisions: [
        paragraph(
          'project-mcp-local-reference-key-decisions-0-text',
          'Zotero SQLite와 로컬 파일을 읽고 메타데이터 검색과 semantic index를 결합했습니다. 원본 데이터와 검색 인덱스를 분리하고, 조회·도판 추출·인용 생성을 별도 도구로 제공했습니다.',
        ),
      ],
      architecture: [
        paragraph(
          'project-mcp-local-reference-architecture-0-text',
          'Python MCP 서버가 Zotero 메타데이터, collections, PDF text·figures와 semantic index를 연결해 클라이언트 요청에 결과를 반환합니다.',
        ),
      ],
      outcomes: [
        paragraph(
          'project-mcp-local-reference-outcomes-0-text',
          '서지 메타데이터 검색, 컬렉션 탐색, PDF 본문·도판 추출, Harvard 인용과 라이브러리 인덱싱을 한 로컬 서버에서 제공합니다.',
        ),
      ],
      lessons: [
        paragraph(
          'project-mcp-local-reference-lessons-0-text',
          '저장된 데이터를 사용자가 찾고 참조할 수 있는 형태로 가공하는 경험입니다. 원본의 구조와 출처를 유지하면서 활용 목적에 맞는 검색·조회 인터페이스를 제공하는 데 집중했습니다.',
        ),
      ],
      evidence: [
        {
          id: 'mcp-local-reference-repository',
          order: 10,
          label: fact(
            'project-mcp-local-reference-evidence-label',
            'mcp-local-reference GitHub 저장소 보기',
          ),
          destination: fact(
            'project-mcp-local-reference-evidence-destination',
            {
              tag: 'external',
              value:
                'https://github.com/revenantonthemission/mcp-local-reference',
            },
          ),
        },
      ],
    },
    {
      id: 'adiubear',
      order: 40,
      title: fact('project-adiubear-title', 'AdiuBear'),
      outcomeSummary: fact(
        'project-adiubear-outcome-summary',
        '음성·이미지·텍스트 입력을 처리하는 Flutter 앱과 Gemini 연동용 Cloud Run 미들웨어를 구현했습니다.',
      ),
      problem: [
        paragraph(
          'project-adiubear-problem-0-text',
          '모바일 앱에서 멀티모달 입력을 Gemini에 전달하면서 API 키를 클라이언트에 노출하지 않아야 했습니다.',
        ),
      ],
      role: [
        paragraph(
          'project-adiubear-role-0-text',
          '저장소 소유자로서 Flutter 클라이언트와 Gemini 연동 방식을 구현하고 통합 방향을 반복 검토했습니다.',
        ),
      ],
      keyDecisions: [
        paragraph(
          'project-adiubear-key-decisions-0-text',
          'API 키 보호를 위해 Cloud Run 미들웨어를 두었고, Live API의 응답 파싱 문서가 충분하지 않아 서버 호출 방식으로 되돌렸습니다.',
        ),
      ],
      architecture: [
        paragraph(
          'project-adiubear-architecture-0-text',
          'Flutter 앱이 음성·이미지·텍스트 입력을 수집하고 Firebase·Vertex AI SDK 또는 Cloud Run 중계 계층을 통해 Gemini를 호출합니다.',
        ),
      ],
      outcomes: [
        paragraph(
          'project-adiubear-outcomes-0-text',
          '멀티모달 입력 흐름과 키 보호용 중계 계층을 구현했으며, Live API 실험 결과를 바탕으로 서버 호출 방식으로 전환했습니다.',
        ),
      ],
      lessons: [
        paragraph(
          'project-adiubear-lessons-0-text',
          'API 기능뿐 아니라 키 보안, 응답 파싱 문서와 운영 가능성을 함께 검토해야 통합 방식을 선택할 수 있음을 배웠습니다.',
        ),
      ],
      evidence: [
        {
          id: 'adiubear-repository',
          order: 10,
          label: fact(
            'project-adiubear-evidence-label',
            'AdiuBear GitHub 저장소 보기',
          ),
          destination: fact('project-adiubear-evidence-destination', {
            tag: 'external',
            value: 'https://github.com/revenantonthemission/AdiuBear',
          }),
        },
      ],
    },
  ],
  education: [
    {
      id: 'sogang-university',
      order: 10,
      title: fact('education-sogang-university-title', '서강대학교'),
      subtitle: fact(
        'education-sogang-university-subtitle',
        '중국문화학과·컴퓨터공학과',
      ),
      period: fact('education-sogang-university-period', {
        start: { tag: 'year', value: '2019' },
        end: { tag: 'year', value: '2026' },
      }),
      details: [],
      evidence: [],
    },
  ],
  certifications: [
    {
      id: 'opic-ih',
      order: 10,
      title: fact('certification-opic-ih-title', 'OPIc IH'),
      period: fact('certification-opic-ih-period', {
        start: { tag: 'year-month', value: '2025-09' },
        end: { tag: 'year-month', value: '2025-09' },
      }),
      details: [],
      evidence: [],
    },
    {
      id: 'hsk-6',
      order: 20,
      title: fact('certification-hsk-6-title', '新HSK 6급'),
      period: fact('certification-hsk-6-period', {
        start: { tag: 'year-month', value: '2024-09' },
        end: { tag: 'year-month', value: '2024-09' },
      }),
      details: [],
      evidence: [],
    },
  ],
} as const satisfies Unbranded<ProfileData>;

type Unbranded<Value> = Value extends string
  ? string
  : Value extends number
    ? number
    : Value extends readonly (infer Item)[]
      ? readonly Unbranded<Item>[]
      : Value extends object
        ? {
            readonly [Key in keyof Value as Key extends symbol
              ? never
              : Key]: Unbranded<Value[Key]>;
          }
        : Value;

function deepFreeze<Value>(value: Value): Value {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

/** Approved public facts only. Approval metadata remains build-private. */
export const profileData = deepFreeze(
  approvedProfileSource,
) as unknown as ProfileData;
