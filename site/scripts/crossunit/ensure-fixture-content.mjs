#!/usr/bin/env node
// U3 Verify precondition. The Verify stage runs before Preprocess (Q2-A), so
// a fresh workspace has no content/ yet — and the U1 isolated profile build
// inside test:unit fails closed at HP001 without a homepage artifact. Reuse
// U2's subject-safe fixture materializer: it writes only when the artifact is
// absent, so a real preprocessor run's output always wins (FR-017).
import { ensureHomepageFixtureContent } from '../profile/homepage-fixture-content.mjs';

await ensureHomepageFixtureContent();
console.log('ensure-fixture-content: homepage artifact present');
