import { describe, expect, test } from 'vitest';
import { getProductionProfileAssembly } from '../../src/lib/profile/production-profile.js';
import { selectPortfolioForRole } from '../../src/lib/profile/portfolio-roles.js';

describe('role-specific portfolio curation', () => {
  const profile = getProductionProfileAssembly().portfolio;

  test('keeps the complete data-engineering profile unchanged', () => {
    expect(selectPortfolioForRole(profile, 'data-engineer-ai')).toBe(profile);
  });

  test('selects only DocSuri while preserving approved text, links and source objects', () => {
    const before = JSON.stringify(profile);
    const selected = selectPortfolioForRole(profile, 'product-engineer');
    expect(selected.projects.map(({ id }) => id)).toEqual(['docsuri']);
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

  test('fails visibly if a curated source project or fact disappears', () => {
    expect(() => selectPortfolioForRole({ ...profile, projects: profile.projects.slice(1) }, 'product-engineer'))
      .toThrow('Missing portfolio project: docsuri');
    const projects = profile.projects.map((project) => project.id !== 'docsuri' ? project : {
      ...project,
      dimensions: [{ ...project.dimensions[0], blocks: [] }, ...project.dimensions.slice(1)],
    });
    expect(() => selectPortfolioForRole({ ...profile, projects } as typeof profile, 'product-engineer'))
      .toThrow('Missing portfolio source fact: project-docsuri-problem-0-text');
  });
});
