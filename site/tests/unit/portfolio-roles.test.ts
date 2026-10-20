import { describe, expect, test } from 'vitest';
import { getProductionProfileAssembly } from '../../src/lib/profile/production-profile.js';
import { getPortfolioRole, selectPortfolioForRole } from '../../src/lib/profile/portfolio-roles.js';

describe('role-specific portfolio curation', () => {
  const profile = getProductionProfileAssembly().portfolio;

  test('keeps the complete data-engineering profile unchanged', () => {
    expect(selectPortfolioForRole(profile, 'data-engineer-ai')).toBe(profile);
  });

  test.each([
    { roleId: 'product-engineer', projectIds: ['docsuri'] },
    { roleId: 'infra-engineer', projectIds: ['docsuri', 'obsidian-custom-publish'] },
  ] as const)('$roleId preserves approved text, links and source objects', ({ roleId, projectIds }) => {
    const before = JSON.stringify(profile);
    const selected = selectPortfolioForRole(profile, roleId);
    expect(selected.projects.map(({ id }) => id)).toEqual(projectIds);
    expect(selected.contactActions).toBe(profile.contactActions);
    expect(Object.isFrozen(selected.projects)).toBe(true);

    for (const project of selected.projects) {
      const source = profile.projects.find(({ id }) => id === project.id)!;
      expect(project.title).toBe(source.title);
      expect(project.outcomeSummary).toBe(source.outcomeSummary);
      expect(project.evidence).toBe(source.evidence);
      for (const dimension of project.dimensions) {
        const sourceDimension = source.dimensions.find(({ key }) => key === dimension.key)!;
        for (const block of dimension.blocks) {
          expect(sourceDimension.blocks.some((candidate) => candidate === block)).toBe(true);
        }
      }
    }
    expect(JSON.stringify(profile)).toBe(before);
  });

  test('retains DocSuri team attribution and bounded measurement with its result', () => {
    const docsuri = selectPortfolioForRole(profile, 'product-engineer').projects[0]!;
    const text = JSON.stringify(docsuri);
    for (const required of ['4인 팀', '다른 팀원', '20 VU', '664.9 ms', '전체 HTTP', '하나의 질의를 반복', '접근 권한']) {
      expect(text).toContain(required);
    }
    expect(docsuri.dimensions.map(({ blocks }) => blocks.length)).toEqual([2, 2, 2, 2, 2, 2]);
  });

  test('curates infrastructure incidents, deployment and recovery with their scope intact', () => {
    const role = getPortfolioRole('infra-engineer');
    expect(role.pathname).toBe('/portfolio/infra-engineer');
    expect(role.title).toBe('Infra Engineer Portfolio');
    const selected = selectPortfolioForRole(profile, role.id);
    const [docsuri, publishing] = selected.projects;
    const factIds = docsuri!.dimensions.flatMap(({ blocks }) =>
      blocks.flatMap((block) => block.tag === 'paragraph' ? [block.text.factId] : block.items.map(({ factId }) => factId)),
    );
    expect(factIds).toEqual(expect.arrayContaining([
      'project-docsuri-problem-backfill-contention',
      'project-docsuri-role-0-text',
      'project-docsuri-key-decisions-0-text',
      'project-docsuri-decision-retry-watermarks',
      'project-docsuri-decision-index-cutover',
      'project-docsuri-decision-cost-quotas',
      'project-docsuri-architecture-deployment-boundaries',
      'project-docsuri-architecture-local-runtime',
      'project-docsuri-outcomes-runtime-diagnosis',
      'project-docsuri-outcomes-recovery-checks',
      'project-docsuri-lessons-verification-limits',
      'project-docsuri-lessons-current-quality',
    ]));
    expect(factIds).not.toContain('project-docsuri-lessons-platform-direction');
    expect(factIds).not.toContain('project-docsuri-architecture-docmodel-contract');
    const text = JSON.stringify(docsuri);
    for (const required of [
      '4인 팀', '다른 팀원', '2026년 7월 AWS', '단일 호스트',
      '코드와 템플릿의 확장 상한은 1인데 실제 설정은 0',
      'dump 생성 확인은 복원 시험과 다르며', '접근 권한',
    ]) {
      expect(text).toContain(required);
    }
    expect(publishing!.dimensions).toBe(profile.projects.find(({ id }) => id === publishing!.id)!.dimensions);
    expect(JSON.stringify(publishing)).toContain('종료 코드 1');
    expect(JSON.stringify(publishing)).toContain('SVG 130개');
  });

  test.each(['product-engineer', 'infra-engineer'] as const)('%s fails visibly if a curated source project or fact disappears', (roleId) => {
    expect(() => selectPortfolioForRole({ ...profile, projects: profile.projects.slice(1) }, roleId))
      .toThrow('Missing portfolio project: docsuri');
    const projects = profile.projects.map((project) => project.id !== 'docsuri' ? project : {
      ...project,
      dimensions: [{ ...project.dimensions[0], blocks: [] }, ...project.dimensions.slice(1)],
    });
    expect(() => selectPortfolioForRole({ ...profile, projects } as typeof profile, roleId))
      .toThrow('Missing portfolio source fact: project-docsuri-problem-0-text');
  });

  test('requires the infrastructure edition’s publishing case study and recovery evidence', () => {
    expect(() => selectPortfolioForRole({
      ...profile,
      projects: profile.projects.filter(({ id }) => id !== 'obsidian-custom-publish'),
    }, 'infra-engineer')).toThrow('Missing portfolio project: obsidian-custom-publish');
    const projects = profile.projects.map((project) => project.id !== 'docsuri' ? project : {
      ...project,
      dimensions: project.dimensions.map((dimension) => ({
        ...dimension,
        blocks: dimension.blocks.filter((block) =>
          block.tag !== 'paragraph' || block.text.factId !== 'project-docsuri-outcomes-recovery-checks'),
      })),
    });
    expect(() => selectPortfolioForRole({ ...profile, projects } as typeof profile, 'infra-engineer'))
      .toThrow('Missing portfolio source fact: project-docsuri-outcomes-recovery-checks');
  });
});
