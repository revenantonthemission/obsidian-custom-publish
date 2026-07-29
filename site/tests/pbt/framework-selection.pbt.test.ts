import { fc, test } from '@fast-check/vitest';
import { expect } from 'vitest';

const profileSummaryArbitrary = fc.record({
  title: fc
    .array(fc.constantFrom('가', '나', '다', 'é', '🙂'), {
      minLength: 1,
      maxLength: 24,
    })
    .map((characters) => characters.join('').normalize('NFC')),
  projects: fc.array(
    fc.record({
      id: fc
        .integer({ min: 1, max: 999 })
        .map((value) => `project-${value}`),
      order: fc.integer({ min: 1, max: 1_000 }),
    }),
    { minLength: 3, maxLength: 6 },
  ),
});

test.prop([profileSummaryArbitrary])(
  'runs a structured domain arbitrary through the Vitest connector',
  (profile) => {
    expect(profile.title).toBe(profile.title.normalize('NFC'));
    expect(profile.projects.length).toBeGreaterThanOrEqual(3);
    expect(profile.projects.length).toBeLessThanOrEqual(6);
  },
);

test('shrinks a counterexample and replays it from seed and path', () => {
  const property = fc.property(
    fc.integer({ min: 0, max: 1_000 }),
    (value) => value < 10,
  );
  const firstRun = fc.check(property, {
    numRuns: 1,
    seed: 4_242,
  });

  expect(firstRun.failed).toBe(true);
  expect(firstRun.numShrinks).toBeGreaterThan(0);
  expect(firstRun.counterexamplePath).toBeTypeOf('string');
  if (!firstRun.failed || firstRun.counterexamplePath === null) {
    throw new Error('Expected a replayable shrunk counterexample');
  }

  const seedReplay = fc.check(property, {
    numRuns: 1,
    seed: firstRun.seed,
  });
  const replay = fc.check(property, {
    numRuns: 1,
    path: firstRun.counterexamplePath,
    seed: firstRun.seed,
  });

  expect(seedReplay.failed).toBe(true);
  expect(seedReplay.counterexample).toEqual(firstRun.counterexample);
  expect(replay.failed).toBe(true);
  expect(replay.counterexample).toEqual(firstRun.counterexample);
});
