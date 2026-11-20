import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getContainerRenderer as getPreactContainerRenderer } from '@astrojs/preact/container-renderer';
import { loadRenderers } from 'astro:container';
import { beforeAll, describe, expect, test } from 'vitest';
import Header from '../../src/components/Header.astro';

// U4 NFR5.21 (review-02 R-07): a navigation state that
// `getPrimaryNavigationState` rejects must stop the build at `Header.astro`
// with its TypeError, never render a fallback bar. The container renders the
// real component through the unit config's Astro Vite setup, so this checks
// the throw itself rather than the validation underneath it.

const INVALID_PRIMARY_NAVIGATION_STATE = 'Invalid primary navigation state.';
const REJECTED_PATHNAMES = ['/writing%zz', '/writing\\all'] as const;

let container: AstroContainer;

beforeAll(async () => {
  const renderers = await loadRenderers([getPreactContainerRenderer()]);
  container = await AstroContainer.create({ renderers });
});

function renderHeader(pathname: string): Promise<string> {
  return container.renderToString(Header, { props: { pathname } });
}

/** The desktop bar's own markup, so the MobileNav island's copy is not counted. */
function desktopNav(html: string): string {
  const match = /<nav class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(html);
  if (match === null) {
    throw new Error('Rendered Header has no .desktop-nav element.');
  }
  return match[1];
}

describe('Header.astro fails closed on a rejected navigation state (U4 NFR5.21)', () => {
  test.each(REJECTED_PATHNAMES)('rejects %s with the TypeError', async (pathname) => {
    const rendering = renderHeader(pathname);

    await expect(rendering).rejects.toThrow(TypeError);
    await expect(rendering).rejects.toThrow(INVALID_PRIMARY_NAVIGATION_STATE);
  });

  test('renders /writing with exactly one marked bar link, to /writing', async () => {
    const html = await renderHeader('/writing');
    const bar = desktopNav(html);

    const links = [...bar.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag);
    expect(links).toHaveLength(1);
    expect(links[0]).toContain('href="/writing"');
    expect(links[0]).toContain('aria-current="page"');
    expect(bar.match(/aria-current=/g)).toHaveLength(1);
  });

  test('renders /writing/all with the section marker and no page marker in the bar', async () => {
    const bar = desktopNav(await renderHeader('/writing/all'));

    expect(bar.match(/aria-current="true"/g)).toHaveLength(1);
    expect(bar).not.toContain('aria-current="page"');
  });
});
