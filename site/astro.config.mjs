import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import profileBuildIntegration from './scripts/profile/astro-profile-integration.mjs';
import legacyRedirectsIntegration from './scripts/build/legacy-redirects-integration.mjs';

// Note: Markdown rendering is handled by the custom unified pipeline in src/lib/render.ts,
// not by Astro's built-in markdown processor. Content is loaded as raw strings and processed manually.
// legacyRedirectsIntegration writes dist/_redirects.json after the build (U3 BR3.1).
export default defineConfig({
  site: 'https://rvnnt.dev',
  integrations: [preact(), sitemap(), profileBuildIntegration(), legacyRedirectsIntegration()],
  output: 'static',
});
