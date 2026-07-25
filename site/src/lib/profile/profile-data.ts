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
      '문제를 정의하고 구조를 설계한 뒤, 구현·검증·운영까지 연결한 프로젝트를 소개합니다.',
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
      id: 'obsidian-custom-publish',
      order: 10,
      title: fact(
        'project-obsidian-custom-publish-title',
        'obsidian-custom-publish',
      ),
      outcomeSummary: fact(
        'project-obsidian-custom-publish-outcome-summary',
        'Obsidian Vault를 Rust 전처리기와 Astro 정적 사이트로 변환해 rvnnt.dev에 게시하는 시스템을 구축했습니다.',
      ),
      problem: [
        paragraph(
          'project-obsidian-custom-publish-problem-0-text',
          'Obsidian Publish를 대체하면서 위키링크, 검색, 탐색 트리, 미리보기와 다이어그램을 정적 사이트에서 재현해야 했습니다.',
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
          '스캔→링크→변환→검색→출력의 5-pass 전처리와 Astro 렌더링을 분리하고, 생성물과 authored source의 경계를 명시했습니다.',
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
          'rvnnt.dev에서 운영되는 정적 블로그와 검색·그래프·탐색 데이터를 하나의 빌드 흐름으로 생성합니다.',
        ),
      ],
      lessons: [
        paragraph(
          'project-obsidian-custom-publish-lessons-0-text',
          '콘텐츠 문법 변환과 화면 렌더링의 책임을 분리하고 생성물을 직접 수정하지 않아야 재현 가능한 배포를 유지할 수 있음을 확인했습니다.',
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
      ],
    },
    {
      id: 'mcp-local-reference',
      order: 20,
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
          'Zotero SQLite와 로컬 파일을 읽고 메타데이터 검색과 semantic index를 결합하며, 조회·도판 crop·인용 생성을 별도 도구로 나눴습니다.',
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
          '로컬 데이터의 원본 구조를 보존하면서 검색 인덱스를 분리해야 정확한 참조와 재색인을 함께 관리할 수 있음을 배웠습니다.',
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
      order: 30,
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
