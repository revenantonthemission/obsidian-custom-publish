# U1 Step 14 — Profile Fact Digest Reproduction Spec

## 문서 상태

- **상태**: Normative final approved digest fixture
- **Schema version**: 1
- **Generator source SHA-256**: `a186c6989f06fe95d98d143e4329f04a87b11298e4c3c40199b8a371f2f29e59`
- **Runtime**: Node.js 24.14.0 and 26.5.0 verified; only `node:crypto` and deterministic in-memory data are used
- **Network/filesystem inputs**: None after extracting the code block

이 문서는 Step 14의 네 final approved identity를 독립적으로 재계산할 수 있게 하는 exact canonical payload와 algorithm을 보존한다. 아래 JavaScript code block 전체가 normative generator다. Review prose나 table을 다시 해석해 임의 payload를 만들지 않는다.

## 1. Reproduction procedure

1. 아래 `javascript` code block의 body를 UTF-8/LF 파일 `profile-fact-digest-generator.mjs`로 추출한다.
2. 추출 파일의 SHA-256이 위 `Generator source SHA-256`과 같은지 확인한다.
3. `node profile-fact-digest-generator.mjs`를 실행한다.
4. JSON output의 record count와 네 digest를 Section 3의 expected values와 비교한다.
5. `--patch` mode가 만든 네 review Markdown과 repository file을 byte-for-byte 비교한다.

Object key canonicalization, array ordering, domain separation, evidence expansion, human URL ledger, every atomic value와 exact structural object는 generator 본문에 모두 포함되어 있다.

## 2. Normative generator

```javascript
import { createHash } from 'node:crypto';

const SOURCE_CHECKED_AT = '2026-07-25T03:15:19Z';
const REVIEW_PROMPT_AT = '2026-07-25T03:22:28Z';
const REVIEW_AUDIT_ID =
  'U1-CG-S14-FACT-APPROVAL-20260725T034431Z';
const DECISION_RECORDED_AT = '2026-07-25T03:44:31Z';
const INVENTORY_REVISION = 'profile-facts-r2';
const DIFF_REVISION = 'profile-production-diff-r2';
const RECEIPT_ID = 'profile-fact-approval-2026-07-25-r1';
const SCHEMA_VERSION = 1;
const SURFACE_ORDER = ['resume', 'portfolio', 'homepage', 'metadata', 'pdf'];

const evidenceSources = {
  E01: {
    kind: 'user-provided',
    reference:
      'Vault attachment 2025년하반기포트폴리오_조준희.zip의 exported PDF pp. 1–3',
    verifier: '프로필 당사자(사용자)',
    checkedAt: DECISION_RECORDED_AT,
    note: '사용자가 보유한 이전 포트폴리오. 이번 승인에서 정확성과 공개 가능성을 확인했다.',
  },
  E02: {
    kind: 'public-source',
    reference: 'https://github.com/revenantonthemission',
    expectedDestination: 'https://github.com/revenantonthemission',
    verifier: 'Codex public-source collector',
    checkedAt: SOURCE_CHECKED_AT,
    note: '공개 GitHub profile/API와 profile README.',
  },
  E03: {
    kind: 'public-source',
    reference:
      'https://github.com/revenantonthemission/obsidian-custom-publish',
    expectedDestination:
      'https://github.com/revenantonthemission/obsidian-custom-publish',
    verifier: 'Codex public-source collector',
    checkedAt: SOURCE_CHECKED_AT,
    note: '공개 repository와 현재 workspace의 authored source/AGENTS.md.',
  },
  E04: {
    kind: 'public-source',
    reference: 'https://github.com/revenantonthemission/mcp-local-reference',
    expectedDestination:
      'https://github.com/revenantonthemission/mcp-local-reference',
    verifier: 'Codex public-source collector',
    checkedAt: SOURCE_CHECKED_AT,
    note: '공개 repository README.',
  },
  E05: {
    kind: 'public-source',
    reference: 'https://github.com/revenantonthemission/AdiuBear',
    expectedDestination: 'https://github.com/revenantonthemission/AdiuBear',
    verifier: 'Codex public-source collector',
    checkedAt: SOURCE_CHECKED_AT,
    note: '공개 repository README와 변경 기록.',
  },
};

function toFactReviewEvidence(source) {
  if (source.kind === 'user-provided') {
    return {
      kind: source.kind,
      reference: source.reference,
    };
  }
  return {
    kind: source.kind,
    reference: source.reference,
    expectedDestination: source.expectedDestination,
    verifier: source.verifier,
    checkedAt: source.checkedAt,
  };
}

const records = [];

function addRecord({
  factId,
  canonicalPath,
  kind,
  value,
  evidence,
  targetSurfaces,
  requirement = 'required',
  category,
}) {
  records.push({
    factId,
    canonicalPath,
    normalizedValue: { kind, value },
    evidence,
    targetSurfaces,
    requirement,
    status: 'Approved',
    decisionRecord: {
      decision: 'Approved',
      auditInteractionId: REVIEW_AUDIT_ID,
      recordedAt: DECISION_RECORDED_AT,
    },
    category,
  });
}

function text(
  factId,
  canonicalPath,
  value,
  evidence,
  targetSurfaces,
  requirement,
  category,
) {
  addRecord({
    factId,
    canonicalPath,
    kind: 'text',
    value,
    evidence,
    targetSurfaces,
    requirement,
    category,
  });
}

function period(
  factId,
  canonicalPath,
  startTag,
  startValue,
  endTag,
  endValue,
  evidence,
  requirement,
  category,
) {
  addRecord({
    factId,
    canonicalPath,
    kind: 'period',
    value: {
      start: { tag: startTag, value: startValue },
      end:
        endTag === 'present'
          ? { tag: 'present' }
          : { tag: endTag, value: endValue },
    },
    evidence,
    targetSurfaces: ['resume', 'pdf'],
    requirement,
    category,
  });
}

text(
  'identity-name',
  'profile.identity.name',
  '조준희',
  'E01',
  ['resume', 'homepage', 'metadata', 'pdf'],
  'required',
  'identity',
);
text(
  'identity-headline',
  'profile.identity.headline',
  '안녕하세요. IT 서비스를 만드는 조준희입니다.',
  'E01',
  ['resume', 'homepage', 'pdf'],
  'required',
  'identity',
);
text(
  'narrative-short-intro',
  'profile.narrative.shortIntro',
  '백엔드 프로그래밍과 인프라 엔지니어링을 공부하며, 직접 쓰는 서비스를 만들고 운영합니다.',
  'E01',
  ['homepage'],
  'required',
  'narrative',
);
text(
  'narrative-detailed-intro-0-text',
  'profile.narrative.detailedIntro[0].text',
  '의료기술 제조사 소프트웨어 개발 인턴십으로 프로젝트 경험을 시작했습니다. 현재는 백엔드 프로그래밍과 인프라 엔지니어링을 공부하며, 문제 정의부터 구현·검증·운영까지 이어지는 작업을 쌓고 있습니다.',
  'E01',
  ['resume', 'pdf'],
  'required',
  'narrative',
);
text(
  'narrative-resume-summary',
  'profile.narrative.resumeSummary',
  '의료기술 제조사 인턴십에서 소프트웨어 개발을 경험했고, 백엔드와 인프라를 중심으로 프로젝트를 이어가고 있습니다.',
  'E01',
  ['resume', 'metadata', 'pdf'],
  'required',
  'narrative',
);
text(
  'narrative-portfolio-summary',
  'profile.narrative.portfolioSummary',
  '문제를 정의하고 구조를 설계한 뒤, 구현·검증·운영까지 연결한 프로젝트를 소개합니다.',
  'E03',
  ['portfolio', 'metadata'],
  'required',
  'narrative',
);
addRecord({
  factId: 'contact-email',
  canonicalPath: 'profile.contact.email',
  kind: 'email',
  value: 'corpseonthemission@icloud.com',
  evidence: 'E02',
  targetSurfaces: ['resume', 'portfolio', 'metadata', 'pdf'],
  requirement: 'required',
  category: 'contact',
});
addRecord({
  factId: 'contact-github',
  canonicalPath: 'profile.contact.github',
  kind: 'github-url',
  value: 'https://github.com/revenantonthemission',
  evidence: 'E02',
  targetSurfaces: ['resume', 'portfolio', 'metadata', 'pdf'],
  requirement: 'required',
  category: 'contact',
});

const skillGroups = [
  {
    id: 'languages',
    order: 10,
    title: '프로그래밍 언어',
    titleEvidence: 'E01',
    skills: [
      ['c', 10, 'C', 'E02'],
      ['cpp', 20, 'C++', 'E02'],
      ['python', 30, 'Python', 'E02'],
      ['javascript', 40, 'JavaScript', 'E02'],
      ['typescript', 50, 'TypeScript', 'E03'],
      ['dart', 60, 'Dart', 'E01'],
      ['rust', 70, 'Rust', 'E03'],
    ],
  },
  {
    id: 'backend-data',
    order: 20,
    title: '백엔드·데이터',
    titleEvidence: 'E01',
    skills: [
      ['fastapi', 10, 'FastAPI', 'E02'],
      ['uvicorn', 20, 'Uvicorn', 'E01'],
      ['sqlalchemy', 30, 'SQLAlchemy', 'E01'],
      ['redis', 40, 'Redis', 'E01'],
      ['apache-kafka', 50, 'Apache Kafka', 'E01'],
      ['mysql-mariadb', 60, 'MySQL/MariaDB', 'E01'],
    ],
  },
  {
    id: 'infrastructure',
    order: 30,
    title: '인프라',
    titleEvidence: 'E01',
    skills: [
      ['docker', 10, 'Docker', 'E02'],
      ['kubernetes', 20, 'Kubernetes', 'E01'],
      ['nginx', 30, 'NGINX', 'E02'],
      ['aws', 40, 'AWS', 'E02'],
      ['github-actions', 50, 'GitHub Actions', 'E02'],
    ],
  },
  {
    id: 'tooling-client',
    order: 40,
    title: '도구·클라이언트',
    titleEvidence: 'E01',
    skills: [
      ['flutter', 10, 'Flutter', 'E01'],
      ['git', 20, 'Git', 'E01'],
      ['astro', 30, 'Astro', 'E03'],
      ['sveltekit', 40, 'SvelteKit', 'E01'],
    ],
  },
];

for (const group of skillGroups) {
  text(
    `skill-group-${group.id}-title`,
    `profile.skillGroups[id=${group.id}].title`,
    group.title,
    group.titleEvidence,
    ['resume', 'pdf'],
    'required',
    'skills',
  );
  for (const [id, , name, evidence] of group.skills) {
    text(
      `skill-${id}-name`,
      `profile.skillGroups[id=${group.id}].skills[id=${id}].name`,
      name,
      evidence,
      ['resume', 'pdf'],
      'required',
      'skills',
    );
  }
}

text(
  'experience-hansono-organization',
  'profile.experiences[id=hansono].organization',
  '한소노',
  'E01',
  ['resume', 'pdf'],
  'required',
  'experience',
);
text(
  'experience-hansono-role',
  'profile.experiences[id=hansono].role',
  '소프트웨어 개발 인턴',
  'E01',
  ['resume', 'pdf'],
  'required',
  'experience',
);
period(
  'experience-hansono-period',
  'profile.experiences[id=hansono].period',
  'year-month',
  '2023-07',
  'year-month',
  '2023-08',
  'E01',
  'required',
  'experience',
);
text(
  'experience-hansono-summary',
  'profile.experiences[id=hansono].summary',
  'Flutter와 FFI를 활용한 의료기기 프로토타입 개발을 경험했습니다.',
  'E01',
  ['resume', 'pdf'],
  'required',
  'experience',
);
text(
  'experience-hansono-details-0-text',
  'profile.experiences[id=hansono].details[0].text',
  'Windows 환경에서 초음파 진단기를 인식하는 Flutter 프로토타입 개발에 참여했습니다.',
  'E01',
  ['resume', 'pdf'],
  'required',
  'experience',
);
text(
  'experience-hansono-details-1-text',
  'profile.experiences[id=hansono].details[1].text',
  '2023년 10월 29일부터 11월 6일까지 독일에서 한소노 소속으로 의료기술 제조사 eZono와 FFI 기반 프로토타입을 개발했습니다.',
  'E01',
  ['resume', 'pdf'],
  'required',
  'experience',
);

const projects = [
  {
    id: 'obsidian-custom-publish',
    order: 10,
    evidence: 'E03',
    title: 'obsidian-custom-publish',
    outcomeSummary:
      'Obsidian Vault를 Rust 전처리기와 Astro 정적 사이트로 변환해 rvnnt.dev에 게시하는 시스템을 구축했습니다.',
    problem:
      'Obsidian Publish를 대체하면서 위키링크, 검색, 탐색 트리, 미리보기와 다이어그램을 정적 사이트에서 재현해야 했습니다.',
    role:
      '저장소 소유자로서 Rust 전처리기, Astro 렌더링 경로와 배포 구성을 설계·구현하고 운영했습니다.',
    keyDecisions:
      '스캔→링크→변환→검색→출력의 5-pass 전처리와 Astro 렌더링을 분리하고, 생성물과 authored source의 경계를 명시했습니다.',
    architecture:
      'Rust CLI가 Vault를 가공해 콘텐츠와 검색·그래프·탐색 데이터를 만들고, Astro 6 사이트가 unified·rehype·Shiki·KaTeX 파이프라인으로 정적 HTML을 생성합니다.',
    outcomes:
      'rvnnt.dev에서 운영되는 정적 블로그와 검색·그래프·탐색 데이터를 하나의 빌드 흐름으로 생성합니다.',
    lessons:
      '콘텐츠 문법 변환과 화면 렌더링의 책임을 분리하고 생성물을 직접 수정하지 않아야 재현 가능한 배포를 유지할 수 있음을 확인했습니다.',
    evidenceId: 'obsidian-custom-publish-repository',
    evidenceLabel: 'obsidian-custom-publish GitHub 저장소 보기',
    evidenceDestination:
      'https://github.com/revenantonthemission/obsidian-custom-publish',
  },
  {
    id: 'mcp-local-reference',
    order: 20,
    evidence: 'E04',
    title: 'mcp-local-reference',
    outcomeSummary:
      '로컬 Zotero 라이브러리를 검색하고 PDF 텍스트·도판과 Harvard 인용을 제공하는 MCP 서버를 만들었습니다.',
    problem:
      '연구 자료를 외부 서비스에 복제하지 않고 로컬 Zotero 데이터와 PDF에서 빠르게 찾고 인용 가능한 형태로 꺼낼 방법이 필요했습니다.',
    role:
      '저장소 소유자로서 MCP 도구, 로컬 데이터 접근, 인덱싱과 인용 출력 흐름을 설계·구현했습니다.',
    keyDecisions:
      'Zotero SQLite와 로컬 파일을 읽고 메타데이터 검색과 semantic index를 결합하며, 조회·도판 crop·인용 생성을 별도 도구로 나눴습니다.',
    architecture:
      'Python MCP 서버가 Zotero 메타데이터, collections, PDF text·figures와 semantic index를 연결해 클라이언트 요청에 결과를 반환합니다.',
    outcomes:
      '서지 메타데이터 검색, 컬렉션 탐색, PDF 본문·도판 추출, Harvard 인용과 라이브러리 인덱싱을 한 로컬 서버에서 제공합니다.',
    lessons:
      '로컬 데이터의 원본 구조를 보존하면서 검색 인덱스를 분리해야 정확한 참조와 재색인을 함께 관리할 수 있음을 배웠습니다.',
    evidenceId: 'mcp-local-reference-repository',
    evidenceLabel: 'mcp-local-reference GitHub 저장소 보기',
    evidenceDestination:
      'https://github.com/revenantonthemission/mcp-local-reference',
  },
  {
    id: 'adiubear',
    order: 30,
    evidence: 'E05',
    title: 'AdiuBear',
    outcomeSummary:
      '음성·이미지·텍스트 입력을 처리하는 Flutter 앱과 Gemini 연동용 Cloud Run 미들웨어를 구현했습니다.',
    problem:
      '모바일 앱에서 멀티모달 입력을 Gemini에 전달하면서 API 키를 클라이언트에 노출하지 않아야 했습니다.',
    role:
      '저장소 소유자로서 Flutter 클라이언트와 Gemini 연동 방식을 구현하고 통합 방향을 반복 검토했습니다.',
    keyDecisions:
      'API 키 보호를 위해 Cloud Run 미들웨어를 두었고, Live API의 응답 파싱 문서가 충분하지 않아 서버 호출 방식으로 되돌렸습니다.',
    architecture:
      'Flutter 앱이 음성·이미지·텍스트 입력을 수집하고 Firebase·Vertex AI SDK 또는 Cloud Run 중계 계층을 통해 Gemini를 호출합니다.',
    outcomes:
      '멀티모달 입력 흐름과 키 보호용 중계 계층을 구현했으며, Live API 실험 결과를 바탕으로 서버 호출 방식으로 전환했습니다.',
    lessons:
      'API 기능뿐 아니라 키 보안, 응답 파싱 문서와 운영 가능성을 함께 검토해야 통합 방식을 선택할 수 있음을 배웠습니다.',
    evidenceId: 'adiubear-repository',
    evidenceLabel: 'AdiuBear GitHub 저장소 보기',
    evidenceDestination: 'https://github.com/revenantonthemission/AdiuBear',
  },
];

for (const project of projects) {
  const base = `profile.projects[id=${project.id}]`;
  text(
    `project-${project.id}-title`,
    `${base}.title`,
    project.title,
    project.evidence,
    ['resume', 'portfolio', 'metadata', 'pdf'],
    'required',
    'projects',
  );
  text(
    `project-${project.id}-outcome-summary`,
    `${base}.outcomeSummary`,
    project.outcomeSummary,
    project.evidence,
    ['resume', 'portfolio', 'metadata', 'pdf'],
    'required',
    'projects',
  );
  for (const [dimension, value] of [
    ['problem', project.problem],
    ['role', project.role],
    ['keyDecisions', project.keyDecisions],
    ['architecture', project.architecture],
    ['outcomes', project.outcomes],
    ['lessons', project.lessons],
  ]) {
    const idDimension = dimension
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase();
    text(
      `project-${project.id}-${idDimension}-0-text`,
      `${base}.${dimension}[0].text`,
      value,
      project.evidence,
      ['portfolio'],
      'required',
      'projects',
    );
  }
  text(
    `project-${project.id}-evidence-label`,
    `${base}.evidence[id=${project.evidenceId}].label`,
    project.evidenceLabel,
    project.evidence,
    ['portfolio'],
    'optional',
    'projects',
  );
  addRecord({
    factId: `project-${project.id}-evidence-destination`,
    canonicalPath: `${base}.evidence[id=${project.evidenceId}].destination`,
    kind: 'external-url',
    value: project.evidenceDestination,
    evidence: project.evidence,
    targetSurfaces: ['portfolio', 'metadata'],
    requirement: 'optional',
    category: 'projects',
  });
}

text(
  'education-sogang-university-title',
  'profile.education[id=sogang-university].title',
  '서강대학교',
  'E02',
  ['resume', 'pdf'],
  'optional',
  'education-certification',
);
text(
  'education-sogang-university-subtitle',
  'profile.education[id=sogang-university].subtitle',
  '중국문화학과·컴퓨터공학과',
  'E02',
  ['resume', 'pdf'],
  'optional',
  'education-certification',
);
period(
  'education-sogang-university-period',
  'profile.education[id=sogang-university].period',
  'year',
  '2019',
  'year',
  '2026',
  'E02',
  'optional',
  'education-certification',
);
text(
  'certification-opic-ih-title',
  'profile.certifications[id=opic-ih].title',
  'OPIc IH',
  'E01',
  ['resume', 'pdf'],
  'optional',
  'education-certification',
);
period(
  'certification-opic-ih-period',
  'profile.certifications[id=opic-ih].period',
  'year-month',
  '2025-09',
  'year-month',
  '2025-09',
  'E01',
  'optional',
  'education-certification',
);
text(
  'certification-hsk-6-title',
  'profile.certifications[id=hsk-6].title',
  '新HSK 6급',
  'E01',
  ['resume', 'pdf'],
  'optional',
  'education-certification',
);
period(
  'certification-hsk-6-period',
  'profile.certifications[id=hsk-6].period',
  'year-month',
  '2024-09',
  'year-month',
  '2024-09',
  'E01',
  'optional',
  'education-certification',
);

const structuralDecisions = {
  identityAndNarrative: {
    detailedIntroBlocks: [{ tag: 'paragraph', factId: 'narrative-detailed-intro-0-text' }],
    additionalLinks: [],
  },
  skillGroups: skillGroups.map((group) => ({
    id: group.id,
    order: group.order,
    skills: group.skills.map(([id, order]) => ({ id, order })),
  })),
  experiences: [
    {
      id: 'hansono',
      order: 10,
      detailBlocks: [
        { tag: 'paragraph', factId: 'experience-hansono-details-0-text' },
        { tag: 'paragraph', factId: 'experience-hansono-details-1-text' },
      ],
      evidence: [],
    },
  ],
  achievements: [],
  projects: projects.map((project) => ({
    id: project.id,
    order: project.order,
    period: 'absent',
    dimensions: [
      'problem',
      'role',
      'keyDecisions',
      'architecture',
      'outcomes',
      'lessons',
    ].map((dimension) => ({ dimension, blocks: [{ tag: 'paragraph' }] })),
    evidence: [{ id: project.evidenceId, order: 10 }],
    relatedProfileEntity: 'absent',
  })),
  education: [
    {
      id: 'sogang-university',
      order: 10,
      details: [],
      evidence: [],
    },
  ],
  certifications: [
    { id: 'opic-ih', order: 10, issuer: 'absent', details: [], evidence: [] },
    { id: 'hsk-6', order: 20, issuer: 'absent', details: [], evidence: [] },
  ],
};

const humanUrlChecks = [
  {
    purpose: 'GitHub 연락 CTA',
    expectedDestination: 'https://github.com/revenantonthemission',
    verifier: '프로필 당사자(사용자)',
    checkedAt: DECISION_RECORDED_AT,
    status: 'Approved',
  },
  ...projects.map((project) => ({
    purpose: `${project.title} evidence`,
    expectedDestination: project.evidenceDestination,
    verifier: '프로필 당사자(사용자)',
    checkedAt: DECISION_RECORDED_AT,
    status: 'Approved',
  })),
];

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function digest(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)), 'utf8')
    .digest('hex');
}

const reviewRecords = records.map(({ category, ...record }) => ({
  ...record,
  evidence: toFactReviewEvidence(evidenceSources[record.evidence]),
}));

const inventoryPayload = {
  domain: 'obsidian-press:profile-fact-inventory',
  schemaVersion: SCHEMA_VERSION,
  revision: INVENTORY_REVISION,
  evidenceSources,
  humanUrlChecks,
  records: reviewRecords,
  structuralDecisions,
};
const inventoryDigest = digest(inventoryPayload);
const approvedRecords = reviewRecords.filter(
  (record) => record.status === 'Approved',
);
const approvedRecordsDigest = digest({
  domain: 'obsidian-press:profile-approved-records',
  schemaVersion: SCHEMA_VERSION,
  records: approvedRecords,
});
const proposedMaterializedProfileDigest = digest({
  domain: 'obsidian-press:profile-materialization-proposal',
  schemaVersion: SCHEMA_VERSION,
  facts: reviewRecords.map((record) => ({
    factId: record.factId,
    canonicalPath: record.canonicalPath,
    normalizedValue: record.normalizedValue,
    targetSurfaces: record.targetSurfaces,
    requirement: record.requirement,
  })),
  structuralDecisions,
});
const productionDiffPayload = {
  domain: 'obsidian-press:profile-production-diff',
  schemaVersion: SCHEMA_VERSION,
  revision: DIFF_REVISION,
  inventoryRevision: INVENTORY_REVISION,
  inventoryDigest,
  approvedRecordsDigest,
  materializedProfileDigest: proposedMaterializedProfileDigest,
  operations: reviewRecords.map((record) => ({
    factId: record.factId,
    canonicalPath: record.canonicalPath,
    normalizedValue: record.normalizedValue,
    targetSurfaces: record.targetSurfaces,
    requirement: record.requirement,
  })),
  structuralOperations: structuralDecisions,
};
const productionDiffDigest = digest(productionDiffPayload);

function validate() {
  const errors = [];
  const ids = new Set();
  const paths = new Set();
  const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const pathPattern =
    /^profile(?:\.[A-Za-z][A-Za-z0-9]*|\[id=[a-z0-9]+(?:-[a-z0-9]+)*\]|\[\d+\])+$/;

  for (const record of records) {
    if (!idPattern.test(record.factId)) {
      errors.push(`invalid factId ${record.factId}`);
    }
    if (ids.has(record.factId)) {
      errors.push(`duplicate factId ${record.factId}`);
    }
    ids.add(record.factId);
    if (!pathPattern.test(record.canonicalPath)) {
      errors.push(`invalid canonicalPath ${record.canonicalPath}`);
    }
    if (paths.has(record.canonicalPath)) {
      errors.push(`duplicate canonicalPath ${record.canonicalPath}`);
    }
    paths.add(record.canonicalPath);
    const sorted = [...record.targetSurfaces].sort(
      (left, right) =>
        SURFACE_ORDER.indexOf(left) - SURFACE_ORDER.indexOf(right),
    );
    if (JSON.stringify(sorted) !== JSON.stringify(record.targetSurfaces)) {
      errors.push(`surface order ${record.factId}`);
    }
    if (
      record.status !== 'Approved' ||
      record.decisionRecord?.decision !== 'Approved' ||
      record.decisionRecord?.auditInteractionId !== REVIEW_AUDIT_ID ||
      record.decisionRecord?.recordedAt !== DECISION_RECORDED_AT
    ) {
      errors.push(`approval state ${record.factId}`);
    }
    if (
      !['required', 'optional'].includes(record.requirement) ||
      !evidenceSources[record.evidence]
    ) {
      errors.push(`shape ${record.factId}`);
    }
    if (
      ['github-url', 'external-url'].includes(record.normalizedValue.kind) &&
      evidenceSources[record.evidence].expectedDestination !==
        record.normalizedValue.value
    ) {
      errors.push(`URL evidence destination ${record.factId}`);
    }
    if (record.normalizedValue.kind === 'period') {
      const { start, end } = record.normalizedValue.value;
      if (
        !['year', 'year-month'].includes(start.tag) ||
        (end.tag !== 'present' && end.tag !== start.tag)
      ) {
        errors.push(`period precision ${record.factId}`);
      }
    }
  }

  for (const record of reviewRecords) {
    const expectedEvidenceKeys =
      record.evidence.kind === 'user-provided'
        ? ['kind', 'reference']
        : [
            'checkedAt',
            'expectedDestination',
            'kind',
            'reference',
            'verifier',
          ];
    const actualEvidenceKeys = Object.keys(record.evidence).sort();
    if (
      JSON.stringify(actualEvidenceKeys) !==
      JSON.stringify(expectedEvidenceKeys)
    ) {
      errors.push(`contract evidence shape ${record.factId}`);
    }
  }

  const requiredRootPaths = [
    'profile.identity.name',
    'profile.identity.headline',
    'profile.narrative.shortIntro',
    'profile.narrative.detailedIntro[0].text',
    'profile.narrative.resumeSummary',
    'profile.narrative.portfolioSummary',
    'profile.contact.email',
    'profile.contact.github',
  ];
  for (const path of requiredRootPaths) {
    if (!paths.has(path)) {
      errors.push(`missing root ${path}`);
    }
  }

  if (projects.length < 3 || projects.length > 6) {
    errors.push('project count');
  }
  for (const project of projects) {
    for (const dimension of [
      'problem',
      'role',
      'keyDecisions',
      'architecture',
      'outcomes',
      'lessons',
    ]) {
      if (!paths.has(`profile.projects[id=${project.id}].${dimension}[0].text`)) {
        errors.push(`missing ${project.id} ${dimension}`);
      }
    }
  }

  const serializedCandidates = JSON.stringify(
    records.map((record) => record.normalizedValue),
  );
  for (const forbidden of [
    /(?:^|[^\d])01[016789][-\s]?\d{3,4}[-\s]?\d{4}(?:[^\d]|$)/,
    /[가-힣]+(?:특별시|광역시|특별자치시|도)\s+[가-힣]+(?:구|군|시)\s+[가-힣0-9-]+/,
    /TBD/i,
    /placeholder/i,
  ]) {
    if (forbidden.test(serializedCandidates)) {
      errors.push(`forbidden candidate ${forbidden}`);
    }
  }

  if (approvedRecords.length !== records.length) {
    errors.push('approved record closure');
  }
  for (const check of humanUrlChecks) {
    if (
      check.status !== 'Approved' ||
      check.verifier !== '프로필 당사자(사용자)' ||
      check.checkedAt !== DECISION_RECORDED_AT
    ) {
      errors.push(`human URL approval ${check.expectedDestination}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function escapeCell(value) {
  return String(value)
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
}

function valueDisplay(normalizedValue) {
  if (normalizedValue.kind === 'period') {
    const { start, end } = normalizedValue.value;
    const endText =
      end.tag === 'present' ? 'present' : `${end.tag}:${end.value}`;
    return `period(${start.tag}:${start.value}→${endText})`;
  }
  return `${normalizedValue.kind}(${JSON.stringify(normalizedValue.value)})`;
}

function markdownTable(headers, rows) {
  const header = `| ${headers.map(escapeCell).join(' | ')} |`;
  const divider = `|${headers.map(() => '---').join('|')}|`;
  const body = rows
    .map((row) => `| ${row.map(escapeCell).join(' | ')} |`)
    .join('\n');
  return `${header}\n${divider}\n${body}`;
}

function recordTable(category) {
  const selected = records.filter((record) => record.category === category);
  return markdownTable(
    [
      '#',
      'factId',
      'canonicalPath',
      'normalizedValue',
      'evidence',
      'targetSurfaces',
      'requirement',
      'status',
    ],
    selected.map((record) => [
      records.indexOf(record) + 1,
      `\`${record.factId}\``,
      `\`${record.canonicalPath}\``,
      `\`${valueDisplay(record.normalizedValue)}\``,
      record.evidence,
      `\`[${record.targetSurfaces.join(',')}]\``,
      record.requirement,
      record.status,
    ]),
  );
}

const sourceRows = Object.entries(evidenceSources).map(([id, source]) => [
  id,
  source.kind,
  source.reference,
  source.expectedDestination ?? 'N/A — user-provided local basis',
  source.verifier ?? '사용자 승인 대기',
  source.checkedAt ?? '사용자 승인 대기',
  source.note,
]);

const structuralRows = [
  [
    'Root',
    'detailedIntro',
    'paragraph block 1개',
    '`narrative-detailed-intro-0-text`',
  ],
  ['Root', 'additionalLinks', '빈 collection', 'CTA 전체 생략'],
  ...skillGroups.map((group) => [
    'SkillGroup',
    group.id,
    `order ${group.order}`,
    group.skills
      .map(([id, order]) => `${id}:${order}`)
      .join(', '),
  ]),
  [
    'Experience',
    'hansono',
    'order 10',
    'paragraph detail 2개, evidence 없음',
  ],
  ['Achievement', 'collection', '빈 collection', 'section 전체 생략'],
  ...projects.map((project) => [
    'Project',
    project.id,
    `order ${project.order}`,
    `period 없음, 6 dimensions 각 paragraph 1개, evidence ${project.evidenceId}:10, relation 없음`,
  ]),
  [
    'Education',
    'sogang-university',
    'order 10',
    'details/evidence 없음',
  ],
  [
    'Certification',
    'opic-ih',
    'order 10',
    'issuer/details/evidence 없음',
  ],
  [
    'Certification',
    'hsk-6',
    'order 20',
    'issuer/details/evidence 없음',
  ],
];

const inventoryMarkdown = `# U1 Step 14 — Profile Fact Inventory

## 문서 상태

- **상태**: Final — explicit human fact/public-disclosure approval recorded
- **Schema version**: ${SCHEMA_VERSION}
- **Inventory revision**: \`${INVENTORY_REVISION}\`
- **Inventory SHA-256**: \`${inventoryDigest}\`
- **Ordered Approved-record SHA-256**: \`${approvedRecordsDigest}\`
- **Records**: ${records.length}; 모두 \`Approved\`, 모든 decision record는 \`${REVIEW_AUDIT_ID}\` / \`${DECISION_RECORDED_AT}\`
- **Approved records**: ${approvedRecords.length}
- **Approval questions**: \`profile-fact-review-questions.md\`
- **Digest reproduction spec**: \`profile-fact-digest-spec.md\`

이 문서는 production source가 아니다. 아래 normalized fact와 structural decision은 사용자가 Question 1~4에서 정확성, 공개 가능성, external destination과 exact production materialization을 함께 승인한 review artifact다. Step 15는 이 exact Approved set만 production source로 materialize할 수 있다.

## 1. Digest와 review 의미

\`Inventory SHA-256\`은 UTF-8 canonical JSON의 SHA-256이다. Canonical payload는 domain \`obsidian-press:profile-fact-inventory\`, schema/revision, evidence registry, approved external URL human-check ledger, ordered Approved records와 structural decisions를 포함한다. Object key는 사전순으로 정렬하고 array 순서는 보존한다.

\`evidence registry\`의 \`note\`와 user-source 확인 metadata는 review 설명용 registry 항목이다. 각 Approved record의 \`evidence\`는 runtime \`FactReviewEvidence\` exact-key contract에 맞춰 user-provided의 \`kind/reference\` 또는 public-source의 \`kind/reference/expectedDestination/verifier/checkedAt\`만 포함하며, 이 projection을 ordered Approved-record digest에 사용한다.

\`Ordered Approved-record SHA-256\`은 domain \`obsidian-press:profile-approved-records\`, schema version과 77개 \`Approved\` record 순서를 같은 방식으로 해시한다. Normalized value, evidence, surface, structure 또는 decision identity가 바뀌면 approval은 stale이며 새 revision과 재승인이 필요하다.

Exact canonical payload와 executable algorithm은 \`profile-fact-digest-spec.md\`의 normative JavaScript block에 있다. 그 source digest, expected output과 이 inventory의 byte equality가 일치하지 않으면 review subject는 stale이다.

## 2. Privacy와 source boundary

- 공개 résumé/portfolio 요구사항에 필요한 email과 GitHub만 연락 fact 후보로 수집했다.
- 이전 자료에 있던 비공개 범위의 연락·거주 정보와 인물 이미지는 inventory에 수집하지 않았다. 이는 \`Excluded\` 결정이 아니라 애초 review/production scope 밖인 non-record다.
- 기존 임시 Notion résumé/portfolio URL은 교체 대상이므로 production 후보에 넣지 않았다.
- 테스트 fixture, persona, Git author identity, filesystem username과 합성 approval은 실제 fact 근거로 사용하지 않았다.
- External URL은 source content 수집만 했으며 automated reachability 판정을 하지 않았다.

## 3. Evidence registry

${markdownTable(
  [
    'ID',
    'kind',
    'reference',
    'expectedDestination',
    'source verifier',
    'source checkedAt',
    'note',
  ],
  sourceRows,
)}

Public-source의 source verifier는 초안 수집자를 뜻한다. 링크의 실제 의미·공개 가능성은 아래 human ledger의 프로필 당사자와 Question 2 A 응답으로 별도 승인됐다.

## 4. External URL human verification ledger

${markdownTable(
  ['purpose', 'expectedDestination', 'human verifier', 'checkedAt', 'status'],
  humanUrlChecks.map((check) => [
    check.purpose,
    check.expectedDestination,
    check.verifier,
    check.checkedAt,
    check.status,
  ]),
)}

Question 2 A의 응답 시각 \`${DECISION_RECORDED_AT}\`을 네 행의 human \`checkedAt\`으로 기록했다. Destination, purpose 또는 checked-at가 바뀌면 관련 URL fact와 receipt는 재승인 전까지 stale이다.

## 5. Atomic fact records

표기의 \`text("…")\`, \`email("…")\`, \`github-url("…")\`, \`external-url("…")\`는 구현의 exact \`FactReviewValue.kind/value\`를 뜻한다. Period는 \`period(year:YYYY→year:YYYY)\` 또는 \`period(year-month:YYYY-MM→year-month:YYYY-MM)\`로 표시한다. \`targetSurfaces\`는 canonical order \`resume, portfolio, homepage, metadata, pdf\`의 부분수열이다.

### 5.1 Identity, narrative와 contact

${recordTable('identity')}

${recordTable('narrative')}

${recordTable('contact')}

### 5.2 Skill groups와 skills

${recordTable('skills')}

### 5.3 Experience

${recordTable('experience')}

Experience의 primary period는 인턴십 근거가 제공한 \`2023-07→2023-08\`만 사용한다. 이후 독일 협업은 day precision을 지원하지 않는 \`Period\`에 억지로 합치지 않고 별도 detail text로 유지했다. 이 모델링도 Question 3의 승인 대상이다.

### 5.4 Final approved projects

${recordTable('projects')}

프로젝트 수치는 제안하지 않았다. Source로 확인되지 않은 성능·사용자·매출·절감률 같은 정량 성과는 0건이며, 모든 outcome은 기능 또는 공개 운영 상태의 정성 서술이다.

### 5.5 Optional education와 certifications

${recordTable('education-certification')}

교육 기간은 최신 공개 GitHub의 year precision \`2019→2026\`을 사용한다. 이전 PDF의 \`2019-03→present\` 표기와 충돌하므로 자동 병합하지 않았고, 사용자가 current year-precision value를 승인했다.

## 6. Structural approval subject

Entity ID, order, block shape, relation과 optional omission은 \`FactReviewRecord\`가 아니지만 production diff와 함께 승인해야 한다.

${markdownTable(['scope', 'id/field', 'order/shape', 'exact decision'], structuralRows)}

Project display order는 \`obsidian-custom-publish → mcp-local-reference → AdiuBear\`다. 세 project는 모두 독립 project이며 Experience/Achievement relation을 갖지 않는다.

## 7. Unselected and unresolved source items

- 이전 포트폴리오의 \`sogangcomputerclub.org\`와 \`Flutter Sample Project\`는 승인된 3-project set에 포함하지 않았다. 이는 reusable \`Excluded\` fact가 아니라 승인 대상 밖의 unselected alternative다.
- Achievement entity는 생성하지 않는다. Required résumé highlight는 Approved Hansono Experience 한 개로 충족한다.
- Education과 두 certification은 optional entity지만 현재 Approved production set에 포함한다.
- \`SvelteKit\`은 이전 포트폴리오 근거의 Approved skill이다.
- 이전 포트폴리오의 별도 \`Svelte\` 항목은 최신 공개 GitHub profile README에서 현재 사용하지 않는 기술로 표시되어 승인된 skill set에 포함하지 않았다. 이는 자동 \`Excluded\` fact가 아닌 unselected alternative다.

## 8. Gate result

Required와 selected optional record ${records.length}개 전부가 Approved이고 네 external destination과 structural decisions도 같은 audit identity에 결속됐다. Step 14는 value-free \`site/verification/profile/fact-approval.json\`만 생성한다. Actual \`site/src/lib/profile/profile-data.ts\` materialization은 Step 15에서 이 inventory와 final production diff를 exact하게 따를 때만 허용한다.
`;

const proposalRows = records.map((record, index) => [
  index + 1,
  record.factId,
  record.canonicalPath,
  'Approved → exact same factId/value/path/surfaces',
]);

const productionDiffMarkdown = `# U1 Step 14 — Profile Production Diff

## 문서 상태

- **상태**: Final — Approved-only materialization authorized
- **Schema version**: ${SCHEMA_VERSION}
- **Diff revision**: \`${DIFF_REVISION}\`
- **Inventory revision**: \`${INVENTORY_REVISION}\`
- **Inventory SHA-256**: \`${inventoryDigest}\`
- **Production diff SHA-256**: \`${productionDiffDigest}\`
- **Ordered Approved-record SHA-256**: \`${approvedRecordsDigest}\`
- **Materialized-profile SHA-256**: \`${proposedMaterializedProfileDigest}\`
- **Digest reproduction spec**: \`profile-fact-digest-spec.md\`

## 1. Final Approved-only diff

현재 inventory의 ${approvedRecords.length}개 record와 structural decision 전체가 같은 explicit user decision으로 Approved됐다. 이 문서는 Step 15가 수행할 exact operation을 승인하지만 아직 \`profile-data.ts\`를 생성하지 않는다.

${markdownTable(
  ['operation set', 'count', 'result'],
  [
    ['Approved fact operations', approvedRecords.length, 'Step 15 exact materialization authorized'],
    ['Approved structural decision groups', structuralRows.length, 'Step 15 exact structure authorized'],
    ['Step 14 generated verification files', 1, 'value-free fact-approval.json only'],
    ['Step 14 production profile files', 0, 'profile-data.ts remains absent until Step 15'],
  ],
)}

\`Production diff SHA-256\`은 domain \`obsidian-press:profile-production-diff\`, schema/revision, final inventory identity, ordered Approved-record digest, materialized-profile digest, 77개 fact operation과 exact structural decisions를 canonical JSON으로 직렬화해 계산했다.

Exact payload와 algorithm은 \`profile-fact-digest-spec.md\`의 normative JavaScript block이 소유한다. Extracted generator의 source SHA와 expected output, 이 문서의 generated bytes가 모두 같아야 final diff identity가 유효하다.

## 2. Approved fact materialization

아래 각 operation은 inventory의 exact normalized value를 같은 \`factId\`, \`canonicalPath\`, \`targetSurfaces\`, \`requirement\`로 materialize한다. 값은 \`profile-fact-inventory.md\`에만 한 번 표시하며 이 문서에서 다른 문장으로 다시 쓰지 않는다.

${markdownTable(
  ['#', 'factId', 'canonicalPath', 'approved operation'],
  proposalRows,
)}

## 3. Approved structural operations

${markdownTable(
  ['scope', 'id/field', 'order/shape', 'approved operation'],
  structuralRows.map((row) => [...row.slice(0, 3), `materialize ${row[3]}`]),
)}

## 4. Exact materialized-profile identity

\`Materialized-profile SHA-256\`은 승인 전에 검토한 domain \`obsidian-press:profile-materialization-proposal\`, schema version, ordered ${records.length}개 fact의 \`factId/canonicalPath/normalizedValue/targetSurfaces/requirement\`와 structural decisions를 그대로 유지한다. Evidence, review status와 decision record는 production profile에 복사하지 않으므로 이 digest payload에서 제외한다.

이 Approved diff에는 다음이 없다.

- Pending/Excluded 값을 public source에 쓰는 operation
- fixture/persona/placeholder를 production fact로 쓰는 operation
- project period 또는 quantitative metric 추정
- Achievement/additional contact link 생성
- external Vault, infrastructure, deployment, push 또는 merge mutation

## 5. Approval result

Question 1~4는 모두 exact A option으로 검증됐다. 77개 record의 decision record와 네 URL human checked-at는 \`${REVIEW_AUDIT_ID}\` / \`${DECISION_RECORDED_AT}\`에 결속됐다. Final inventory, approved-record, production-diff와 materialized-profile identities는 human receipt와 value-free machine receipt에서 exact하게 일치해야 한다. Step 15는 이 diff와 byte-for-byte 대응하는 production source만 만들 수 있다.
`;

const receiptMarkdown = `# U1 Step 14 — Profile Fact Approval Receipt

## 문서 상태

- **상태**: Complete — explicit human decision \`Approved\`
- **Machine receipt 여부**: Yes; value-free identity copy
- **Schema version**: ${SCHEMA_VERSION}
- **Receipt ID**: \`${RECEIPT_ID}\`

사용자는 Question 1~4의 exact A option으로 77개 normalized fact, 네 external destination, structural selection/order/omission과 exact production diff를 함께 승인했다.

## 1. Final identity

${markdownTable(
  ['field', 'final value'],
  [
    ['schemaVersion', SCHEMA_VERSION],
    ['receiptId', RECEIPT_ID],
    ['inventoryRevision', INVENTORY_REVISION],
    ['inventoryDigest', inventoryDigest],
    ['productionDiffRevision', DIFF_REVISION],
    ['productionDiffDigest', productionDiffDigest],
    ['approvedRecordsDigest', approvedRecordsDigest],
    ['materializedProfileDigest', proposedMaterializedProfileDigest],
    ['decision', 'Approved'],
    ['decisionAuditId', REVIEW_AUDIT_ID],
    ['decisionRecordedAt', DECISION_RECORDED_AT],
  ],
)}

## 2. Review subject

- Inventory: \`profile-fact-inventory.md\` revision \`${INVENTORY_REVISION}\`
- Production diff: \`profile-production-diff.md\` revision \`${DIFF_REVISION}\`
- Digest fixture: \`profile-fact-digest-spec.md\`
- Questions: \`profile-fact-review-questions.md\`; answers A/A/A/A
- Review prompt prepared at: \`${REVIEW_PROMPT_AT}\`
- Approval audit ID: \`${REVIEW_AUDIT_ID}\`
- Approval recorded at: \`${DECISION_RECORDED_AT}\`

## 3. Completion evidence

1. 네 답변은 각 available A option과 exact하게 일치하며 모순이 없다.
2. Required와 selected optional fact 77개가 모두 Approved다.
3. 네 external destination은 프로필 당사자가 확인했고 같은 timestamp를 갖는다.
4. Project 3개/order, entity/block/relation/omission structure가 승인됐다.
5. Final inventory, production diff, approved-record set과 materialized profile의 네 digest를 normative generator가 재현한다.
6. Machine receipt는 아래 identity만 복사하며 public fact value를 포함하지 않는다.

## 4. Machine receipt boundary

\`site/verification/profile/fact-approval.json\`은 Section 1의 exact 11-key identity만 포함한다. 이름, 이메일, career/project 문장, evidence URL 또는 structural content를 복제하지 않는다. Production profile data는 Step 15 전까지 absent다.
`;

const questionsMarkdown = `# U1 Step 14 — Profile Fact Review Questions

\`profile-fact-inventory.md\`, \`profile-production-diff.md\`, \`profile-fact-approval-receipt.md\`를 함께 검토해 주세요. 각 질문의 \`[Answer]:\` 뒤에 문자 하나를 입력해 주세요. \`X\`를 선택하면 같은 줄에 원하는 변경을 구체적으로 작성해 주세요.

## Question 1 — Atomic fact accuracy and public disclosure

Inventory의 ${records.length}개 normalized candidate value를 정확성과 공개 가능성 관점에서 어떻게 처리할까요?

A) 모든 candidate value가 정확하고 공개 가능하므로, 현재 factId/path/evidence/surface와 함께 승인합니다.

B) Inventory의 candidate value를 직접 수정했습니다. 아직 승인하지 말고 수정본을 재검증해 주세요.

C) 모든 candidate value를 Pending으로 유지하고 production에 materialize하지 않습니다.

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 모든 candidate value가 정확하고 공개 가능하므로, 현재 factId/path/evidence/surface와 함께 승인합니다.

## Question 2 — External destination verification

Inventory의 human verification ledger에 있는 GitHub profile과 project repository 3개를 어떻게 처리할까요?

A) 네 destination을 직접 열어 예상한 공개 대상임을 확인했습니다. 이 답변의 audit timestamp를 human checked-at로 기록하고 URL fact를 승인합니다.

B) Human verification ledger의 URL 또는 목적을 직접 수정했습니다. 아직 승인하지 말고 수정본을 재검증해 주세요.

C) 네 destination을 모두 확인하지 않았으므로 관련 URL fact를 Pending으로 유지합니다.

X) Other (please describe after [Answer]: tag below)

[Answer]: A) 네 destination을 직접 열어 예상한 공개 대상임을 확인했습니다. 이 답변의 audit timestamp를 human checked-at로 기록하고 URL fact를 승인합니다.


## Question 3 — Structure, selection, order and omissions

제안한 4개 skill group, Hansono Experience 1개, final project 3개와 그 순서, Education 1개, Certification 2개, 빈 Achievement/additionalLinks, 모든 block shape와 relation 없음 결정을 어떻게 처리할까요?

A) Inventory Section 6의 exact structural decisions와 project 순서 \`obsidian-custom-publish → mcp-local-reference → AdiuBear\`를 승인합니다.

B) Inventory Section 6의 structure, selection, order 또는 omission을 직접 수정했습니다. 아직 승인하지 말고 수정본을 재검증해 주세요.

C) Structural proposal을 Pending으로 유지하고 production aggregate를 만들지 않습니다.

X) Other (please describe after [Answer]: tag below)

[Answer]: A) Inventory Section 6의 exact structural decisions와 project 순서 \`obsidian-custom-publish → mcp-local-reference → AdiuBear\`를 승인합니다.

## Question 4 — Inventory and production diff joint approval

Question 1~3의 승인 내용과 exact proposed materialization을 하나의 hard fact gate로 어떻게 처리할까요?

A) Question 1~3도 모두 A입니다. Inventory와 proposed production diff를 함께 승인하며, exact decision/audit identity로 final human receipt와 value-free machine receipt를 생성하도록 승인합니다.

B) Production diff를 직접 수정했습니다. 아직 승인하지 말고 수정본을 재검증해 주세요.

C) Inventory와 production diff를 승인하지 않으며 Step 15로 진행하지 않습니다.

X) Other (please describe after [Answer]: tag below)

[Answer]: A) Question 1~3도 모두 A입니다. Inventory와 proposed production diff를 함께 승인하며, exact decision/audit identity로 final human receipt와 value-free machine receipt를 생성하도록 승인합니다.
`;

function validateMarkdown() {
  const documents = [
    inventoryMarkdown,
    productionDiffMarkdown,
    receiptMarkdown,
    questionsMarkdown,
  ];
  for (const [index, document] of documents.entries()) {
    if (document.includes('\t')) {
      throw new Error(`tab in document ${index}`);
    }
    if (document.includes('```mermaid') || document.includes('┌')) {
      throw new Error(`diagram in document ${index}`);
    }
    if (!document.endsWith('\n')) {
      throw new Error(`missing final newline ${index}`);
    }
  }
  const questionCount = (questionsMarkdown.match(/^## Question /gm) ?? []).length;
  const expectedAnswers = [
    '[Answer]: A) 모든 candidate value가 정확하고 공개 가능하므로, 현재 factId/path/evidence/surface와 함께 승인합니다.',
    '[Answer]: A) 네 destination을 직접 열어 예상한 공개 대상임을 확인했습니다. 이 답변의 audit timestamp를 human checked-at로 기록하고 URL fact를 승인합니다.',
    '[Answer]: A) Inventory Section 6의 exact structural decisions와 project 순서 `obsidian-custom-publish → mcp-local-reference → AdiuBear`를 승인합니다.',
    '[Answer]: A) Question 1~3도 모두 A입니다. Inventory와 proposed production diff를 함께 승인하며, exact decision/audit identity로 final human receipt와 value-free machine receipt를 생성하도록 승인합니다.',
  ];
  const answerCount = expectedAnswers.filter((answer) =>
    questionsMarkdown.split('\n').includes(answer),
  ).length;
  const otherCount = (
    questionsMarkdown.match(/^X\) Other \(please describe after \[Answer\]: tag below\)$/gm) ??
    []
  ).length;
  if (questionCount !== 4 || answerCount !== 4 || otherCount !== 4) {
    throw new Error(
      `question structure ${questionCount}/${answerCount}/${otherCount}`,
    );
  }
}

function addFilePatch(path, content) {
  return [
    `*** Add File: ${path}`,
    ...content
      .split('\n')
      .slice(0, -1)
      .map((line) => `+${line}`),
  ].join('\n');
}

validate();
validateMarkdown();

const outputs = {
  'aidlc-docs/construction/profile-domain-and-native-experience/code/profile-fact-inventory.md':
    inventoryMarkdown,
  'aidlc-docs/construction/profile-domain-and-native-experience/code/profile-production-diff.md':
    productionDiffMarkdown,
  'aidlc-docs/construction/profile-domain-and-native-experience/code/profile-fact-approval-receipt.md':
    receiptMarkdown,
  'aidlc-docs/construction/profile-domain-and-native-experience/code/profile-fact-review-questions.md':
    questionsMarkdown,
};

if (process.argv.includes('--patch')) {
  const patch = [
    '*** Begin Patch',
    ...Object.entries(outputs).map(([path, content]) =>
      addFilePatch(path, content),
    ),
    '*** End Patch',
    '',
  ].join('\n');
  process.stdout.write(patch);
} else {
  process.stdout.write(
    `${JSON.stringify(
      {
        records: records.length,
        approvedRecords: approvedRecords.length,
        projects: projects.length,
        evidenceSources: Object.keys(evidenceSources).length,
        humanUrlChecks: humanUrlChecks.length,
        inventoryDigest,
        approvedRecordsDigest,
        productionDiffDigest,
        proposedMaterializedProfileDigest,
        reviewAuditId: REVIEW_AUDIT_ID,
        files: Object.entries(outputs).map(([path, content]) => ({
          path,
          lines: content.split('\n').length - 1,
          bytes: Buffer.byteLength(content),
        })),
      },
      null,
      2,
    )}\n`,
  );
}
```

## 3. Expected output identity

| field | expected value |
|---|---|
| records | 77 |
| approvedRecords | 77 |
| inventoryDigest | `25357f9902858abeafe17a3b3016c43328852ea8dce29453e48cd83da31fa345` |
| approvedRecordsDigest | `356356f9dc5f8b2b93e4d7bf88a3f11a8181f55f1485ed82c8994ae994aa6474` |
| productionDiffDigest | `a4ebc55bd3e3d78ae8d3239abdc81e0a52921d19e1c0c0cb28ea49cbad53c6e1` |
| proposedMaterializedProfileDigest | `775177b9cd3dd6b662e25a3094d96ba56260084de06d9d527c531481b4c9e15e` |

## 4. Approval and change rule

- 이 generator와 네 review Markdown의 byte comparison이 통과하지 않으면 final approval은 stale이고 Step 15로 진행할 수 없다.
- Candidate value, evidence, surface, requirement, structural decision, external human-check row 또는 review state가 바뀌면 generator와 affected Markdown을 함께 갱신하고 네 digest를 다시 계산한다.
- Final revision은 77개 Approved decision record와 네 URL의 human checked-at를 approval audit identity에 결속한다.
- Application은 이 Markdown 또는 generator를 import하지 않는다. Production source와 machine receipt는 별도 hard gate 뒤에만 생성한다.
