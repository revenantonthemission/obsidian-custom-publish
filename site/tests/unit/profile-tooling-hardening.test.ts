import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import {
  assetBudgetTesting,
} from '../../scripts/profile/asset-budget.mjs';
import {
  installRequestLedger,
} from '../../scripts/profile/request-ledger.mjs';

describe('profile resource evidence hardening', () => {
  test('binds inline CSS to its exact final HTML occurrence', () => {
    const profileCss = Buffer.from('.profile{display:grid}', 'utf8');
    const documentBytes = Buffer.from(
      '<!doctype html><style>astro-island{display:contents}</style>' +
        `<style>${profileCss.toString('utf8')}</style>`,
      'utf8',
    );
    const documentIdentity = {
      bytes: documentBytes.byteLength,
      sha256: digest(documentBytes),
    };
    const routeDocument =
      assetBudgetTesting.resolveProfileRouteDocument({
        route: '/portfolio',
        routeOutputs: [
          {
            route: '/portfolio',
            outputs: ['portfolio/index.html'],
          },
        ],
        outputFiles: new Map([
          ['portfolio/index.html', documentIdentity],
        ]),
        emittedBytes: new Map([
          ['portfolio/index.html', documentBytes],
        ]),
      });

    expect(routeDocument.claimInlineStyle(profileCss)).toMatchObject({
      documentPath: 'portfolio/index.html',
      documentSha256: documentIdentity.sha256,
      styleIndex: 1,
      sha256: digest(profileCss),
      rawBytes: profileCss.byteLength,
    });
  });

  test('classifies a newly reachable global island as unapproved', () => {
    const clientBytes = Buffer.from('export default function ProfileWidget(){}');
    const evidence = assetBudgetTesting.analyzeClientJavaScript({
      routeDocuments: [
        {
          route: '/resume',
          documentPath: 'resume/index.html',
          clientRoots: [
            {
              role: 'component',
              path: '_astro/ProfileWidget.js',
            },
          ],
        },
      ],
      viteManifest: {
        'src/islands/ProfileWidget.tsx': {
          src: 'src/islands/ProfileWidget.tsx',
          file: '_astro/ProfileWidget.js',
          isEntry: true,
        },
      },
      outputs: [
        {
          type: 'chunk',
          file: '_astro/ProfileWidget.js',
          modules: ['src/islands/ProfileWidget.tsx'],
        },
      ],
      outputFiles: new Map([
        [
          '_astro/ProfileWidget.js',
          {
            bytes: clientBytes.byteLength,
            sha256: digest(clientBytes),
          },
        ],
      ]),
    });

    expect(evidence.profileEntries).toEqual([]);
    expect(evidence.profileChunks).toEqual([]);
    expect(evidence.unknownReachableEntries).toEqual([
      expect.objectContaining({
        route: '/resume',
        source: 'src/islands/ProfileWidget.tsx',
      }),
    ]);
  });
});

describe('browser request ledger lifecycle hardening', () => {
  test('maps extensionless documents and waits for the route barrier before disposing', async () => {
    const context = createBarrierContext();
    const html = Buffer.from('<!doctype html><title>Résumé</title>');
    const ledger = await installRequestLedger(context, {
      baseURL: 'http://127.0.0.1:43117',
      buildIdentity: {
        id: 'a'.repeat(64),
        routes: ['/resume', '/portfolio'],
      },
      emittedAssets: [
        {
          path: 'resume/index.html',
          bytes: html.byteLength,
          sha256: digest(html),
        },
      ],
    });
    const request = fakeRequest(
      'http://127.0.0.1:43117/resume',
      'document',
    );

    const routeOperation = context.dispatchRoute(request);
    await Promise.resolve();
    let finalized = false;
    const finalization = ledger.finalize({
      requireProfileRoutes: false,
      timeoutMs: 1_000,
    }).then((evidence) => {
      finalized = true;
      return evidence;
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(finalized).toBe(false);
    expect(context.disposed).toBe(true);

    context.releaseContinue();
    context.dispatchResponse(request, 200);
    await routeOperation;
    const evidence = await finalization;

    expect(evidence.successful[0].emittedAssetIdentity).toMatchObject({
      path: 'resume/index.html',
      sha256: digest(html),
    });
    expect(evidence.guard).toMatchObject({
      routeRegistration: 'playwright-disposable',
      pendingHandlers: 0,
      inFlightRequests: 0,
      pages: 0,
    });
    expect(context.listenerCount()).toBe(0);
  });
});

function createBarrierContext() {
  let routeHandler: ((route: any) => Promise<void>) | undefined;
  const listeners = new Map<string, Set<(value: any) => void>>();
  let releaseContinue: (() => void) | undefined;
  const continueBarrier = new Promise<void>((resolve) => {
    releaseContinue = resolve;
  });

  return {
    disposed: false,
    pages() {
      return [];
    },
    async route(_pattern: string, handler: (route: any) => Promise<void>) {
      routeHandler = handler;
      return {
        dispose: async () => {
          this.disposed = true;
        },
      };
    },
    on(event: string, handler: (value: any) => void) {
      const handlers = listeners.get(event) ?? new Set();
      handlers.add(handler);
      listeners.set(event, handlers);
    },
    off(event: string, handler: (value: any) => void) {
      listeners.get(event)?.delete(handler);
    },
    async dispatchRoute(request: ReturnType<typeof fakeRequest>) {
      if (routeHandler === undefined) throw new Error('route not installed');
      return routeHandler({
        request: () => request,
        abort: async () => {},
        continue: async () => continueBarrier,
      });
    },
    dispatchResponse(
      request: ReturnType<typeof fakeRequest>,
      status: number,
    ) {
      for (const handler of listeners.get('response') ?? []) {
        handler({
          request: () => request,
          url: () => request.url(),
          status: () => status,
        });
      }
    },
    releaseContinue() {
      releaseContinue?.();
    },
    listenerCount() {
      return [...listeners.values()]
        .reduce((total, handlers) => total + handlers.size, 0);
    },
  };
}

function fakeRequest(url: string, resourceType: string) {
  return {
    url: () => url,
    resourceType: () => resourceType,
    isNavigationRequest: () => resourceType === 'document',
    frame: () => ({ url: () => url }),
  };
}

function digest(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}
