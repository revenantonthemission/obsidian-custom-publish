import type { PortfolioProfile, PortfolioProject, ProjectDimension, ProjectDimensionKey } from './types.js';

export type PortfolioRoleId = 'data-engineer-ai' | 'product-engineer';

export interface PortfolioRole {
  readonly id: PortfolioRoleId;
  readonly pathname: '/portfolio' | '/portfolio/product-engineer';
  readonly label: string;
  readonly title: 'Portfolio' | 'Product Engineer Portfolio';
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
]);

export function getPortfolioRole(roleId: PortfolioRoleId): PortfolioRole {
  const role = PORTFOLIO_ROLES.find(({ id }) => id === roleId);
  if (role === undefined) throw new TypeError('Unknown portfolio role.');
  return role;
}

const PRODUCT_PROJECTS = [
  'docsuri',
] as const;

// Keep the incident, personal/team scope and measurement limits together.
// The data-engineering page retains the full case study.
const DOCSURI_SELECTION = {
  problem: [
    'project-docsuri-problem-0-text',
    'project-docsuri-problem-backfill-contention',
  ],
  role: [
    'project-docsuri-role-0-text',
    'project-docsuri-role-contract-collaboration',
  ],
  keyDecisions: [
    'project-docsuri-key-decisions-0-text',
    'project-docsuri-decision-cost-quotas',
  ],
  architecture: [
    'project-docsuri-architecture-0-text',
    'project-docsuri-architecture-docmodel-contract',
  ],
  outcomes: [
    'project-docsuri-outcomes-0-text',
    'project-docsuri-outcomes-mixed-load',
  ],
  lessons: [
    'project-docsuri-lessons-0-text',
    'project-docsuri-lessons-current-quality',
  ],
} as const;

/** Select and order existing facts; never rewrite or mint approved facts. */
export function selectPortfolioForRole(
  profile: PortfolioProfile,
  roleId: PortfolioRoleId,
): PortfolioProfile {
  getPortfolioRole(roleId);
  if (roleId === 'data-engineer-ai') return profile;

  const projects = PRODUCT_PROJECTS.map((id, index) => {
    const source = profile.projects.find((project) => project.id === id);
    if (source === undefined) {
      throw new TypeError(`Missing portfolio project: ${id}.`);
    }
    const project = id === 'docsuri' ? selectDocsuri(source) : source;
    return Object.freeze({ ...project, order: profile.projects[index].order });
  });

  return Object.freeze({ ...profile, projects: Object.freeze(projects) });
}

function selectDocsuri(project: PortfolioProject): PortfolioProject {
  function dimension<Key extends ProjectDimensionKey>(key: Key): ProjectDimension<Key> {
    const source = project.dimensions.find((candidate) => candidate.key === key);
    const blocks = DOCSURI_SELECTION[key].map((factId) => {
      const block = source?.blocks.find((candidate) =>
        candidate.tag === 'paragraph' && candidate.text.factId === factId,
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
