import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// Note: Markdown rendering is handled by the custom unified pipeline in src/lib/render.ts,
// not by Astro's built-in markdown processor. Content is loaded as raw strings and processed manually.
export default defineConfig({
  integrations: [preact()],
  output: 'static',
});
