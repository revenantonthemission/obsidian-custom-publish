import type {
  PortfolioProfile,
  PortfolioProject,
  ProjectDimension,
  ProjectDimensionKey,
} from './types.js';

export type PortfolioRoleId = 'data-engineer-ai' | 'product-engineer' | 'infra-engineer';

export interface PortfolioRole {
  readonly id: PortfolioRoleId;
  readonly pathname: '/portfolio' | '/portfolio/product-engineer' | '/portfolio/infra-engineer';
  readonly label: string;
  readonly title: 'Portfolio' | 'Product Engineer Portfolio' | 'Infra Engineer Portfolio';
  readonly eyebrow: string;
  readonly introduction?: string;
  readonly projectFocus: Readonly<Record<string, string>>;
}

/** Editorial framing is separate from the approved facts it introduces. */
export const PORTFOLIO_ROLES: readonly PortfolioRole[] = Object.freeze([
  Object.freeze({
    id: 'data-engineer-ai',
    pathname: '/portfolio',
    label: 'Data Engineer / AI',
    title: 'Portfolio',
    eyebrow: '데이터 엔지니어링 · 플랫폼 운영',
    projectFocus: Object.freeze({}),
  }),
  Object.freeze({
    id: 'product-engineer',
    pathname: '/portfolio/product-engineer',
    label: 'Product Engineer',
    title: 'Product Engineer Portfolio',
    eyebrow: '프로덕트 엔지니어링 · 사용자 경험 · 구현과 운영',
    introduction:
      '사용자의 검색과 열람 경험을 기준으로 구현과 운영의 우선순위를 정합니다. AI/ML 논문 서비스 DocSuri에서 데이터 파이프라인과 인프라 운영을 맡아, 대량 수집이 사용자 요청을 방해하던 문제를 해결하고 팀과 데이터 계약을 맞춘 경험을 소개합니다.',
    projectFocus: Object.freeze({
      docsuri: '검색과 열람을 지키는 운영과 협업',
    }),
  }),
  Object.freeze({
    id: 'infra-engineer',
    pathname: '/portfolio/infra-engineer',
    label: 'Infra Engineer',
    title: 'Infra Engineer Portfolio',
    eyebrow: '클라우드 인프라 · 배포 자동화 · 장애 대응',
    introduction:
      '수집 부하로 멈춘 검색을 복구하고, 배포 설정과 실제 리소스의 차이를 추적했습니다. DocSuri의 AWS 운영과 로컬 서버 이전, 정적 사이트의 CI/CD 개선 경험을 바탕으로 부하 격리, 배포 검증, 관측과 복구를 다룹니다.',
    projectFocus: Object.freeze({
      docsuri: '부하 격리 · 설정 드리프트 · 백업과 복구',
      'obsidian-custom-publish': '산출물 검증 · CI/CD 실패 전파',
    }),
  }),
]);

export function getPortfolioRole(roleId: PortfolioRoleId): PortfolioRole {
  const role = PORTFOLIO_ROLES.find(({ id }) => id === roleId);
  if (role === undefined) throw new TypeError('Unknown portfolio role.');
  return role;
}

type DimensionSelection = Readonly<Record<ProjectDimensionKey, readonly string[]>>;

// Keep the incident, personal/team scope and measurement limits together.
// The data-engineering page retains the full case study.
const PRODUCT_DOCSURI_SELECTION = {
  problem: ['project-docsuri-problem-0-text', 'project-docsuri-problem-backfill-contention'],
  role: ['project-docsuri-role-0-text', 'project-docsuri-role-contract-collaboration'],
  keyDecisions: ['project-docsuri-key-decisions-0-text', 'project-docsuri-decision-cost-quotas'],
  architecture: [
    'project-docsuri-architecture-0-text',
    'project-docsuri-architecture-docmodel-contract',
  ],
  outcomes: ['project-docsuri-outcomes-0-text', 'project-docsuri-outcomes-mixed-load'],
  lessons: ['project-docsuri-lessons-0-text', 'project-docsuri-lessons-current-quality'],
} as const satisfies DimensionSelection;

// Keep historical AWS incidents, the later single-host runtime and the scope
// of recovery checks together. Each paragraph retains its approved fact ID.
const INFRA_DOCSURI_SELECTION = {
  problem: ['project-docsuri-problem-0-text', 'project-docsuri-problem-backfill-contention'],
  role: ['project-docsuri-role-0-text'],
  keyDecisions: [
    'project-docsuri-key-decisions-0-text',
    'project-docsuri-decision-index-cutover',
    'project-docsuri-decision-retry-watermarks',
    'project-docsuri-decision-cost-quotas',
  ],
  architecture: [
    'project-docsuri-architecture-0-text',
    'project-docsuri-architecture-deployment-boundaries',
    'project-docsuri-architecture-local-runtime',
  ],
  outcomes: [
    'project-docsuri-outcomes-0-text',
    'project-docsuri-outcomes-runtime-diagnosis',
    'project-docsuri-outcomes-recovery-checks',
  ],
  lessons: [
    'project-docsuri-lessons-0-text',
    'project-docsuri-lessons-verification-limits',
    'project-docsuri-lessons-current-quality',
  ],
} as const satisfies DimensionSelection;

interface CuratedProject {
  readonly id: string;
  readonly dimensions?: DimensionSelection;
}

const CURATED_PROJECTS: Readonly<
  Record<Exclude<PortfolioRoleId, 'data-engineer-ai'>, readonly CuratedProject[]>
> = {
  'product-engineer': [{ id: 'docsuri', dimensions: PRODUCT_DOCSURI_SELECTION }],
  'infra-engineer': [
    { id: 'docsuri', dimensions: INFRA_DOCSURI_SELECTION },
    { id: 'obsidian-custom-publish' },
  ],
};

/** Select and order existing facts; never rewrite or mint approved facts. */
export function selectPortfolioForRole(
  profile: PortfolioProfile,
  roleId: PortfolioRoleId
): PortfolioProfile {
  getPortfolioRole(roleId);
  if (roleId === 'data-engineer-ai') return profile;

  const projects = CURATED_PROJECTS[roleId].map(({ id, dimensions }, index) => {
    const source = profile.projects.find((project) => project.id === id);
    if (source === undefined) {
      throw new TypeError(`Missing portfolio project: ${id}.`);
    }
    const project = dimensions === undefined ? source : selectDimensions(source, dimensions);
    return Object.freeze({ ...project, order: profile.projects[index].order });
  });

  return Object.freeze({ ...profile, projects: Object.freeze(projects) });
}

function selectDimensions(
  project: PortfolioProject,
  selection: DimensionSelection
): PortfolioProject {
  function dimension<Key extends ProjectDimensionKey>(key: Key): ProjectDimension<Key> {
    const source = project.dimensions.find((candidate) => candidate.key === key);
    const blocks = selection[key].map((factId) => {
      const block = source?.blocks.find(
        (candidate) => candidate.tag === 'paragraph' && candidate.text.factId === factId
      );
      if (block === undefined) {
        throw new TypeError(`Missing portfolio source fact: ${factId}.`);
      }
      return block;
    });
    const [first, ...rest] = blocks;
    if (first === undefined) throw new TypeError(`Empty portfolio dimension: ${key}.`);
    return Object.freeze({ key, blocks: Object.freeze([first, ...rest] as const) });
  }

  return Object.freeze({
    ...project,
    dimensions: Object.freeze([
      dimension('problem'),
      dimension('role'),
      dimension('keyDecisions'),
      dimension('architecture'),
      dimension('outcomes'),
      dimension('lessons'),
    ] as const),
  });
}
