#!/usr/bin/env node
// Verification precondition for the HIG and profile verification builds:
// materialize the e2e fixture post before a fixture build. It writes only when
// the post is absent, so a real preprocessor run's output always wins. U1
// (BR7.2): no homepage artifact is written any more.
import { ensureE2eFixtureContent } from '../profile/homepage-fixture-content.mjs';

await ensureE2eFixtureContent();
console.log('ensure-fixture-content: e2e fixture post present');
