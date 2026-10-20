# Security Test Instructions: Repository Cleanup and HIG Redesign

## Targets

- **NFR4 (privacy and third parties):**
  - Choosing the appearance sends no reader data to any third party.
  - Fonts are served only from this site.
  - The KaTeX stylesheet is self-hosted, or kept on a CDN only with a Subresource Integrity hash.
- **Construction guardrails:**
  - No credential or secret in the source.
  - Fetched data is validated at its boundary.
  - No unsanitized HTML injection.

Out of scope by `requirements.md`: Content-Security-Policy and security headers at the server or Cloudflare edge. Dynamic application scanning does not apply, because the site is static with no server-side input.

## Framework Setup

Playwright request logging (in the HIG specs), `git grep` over a committed tree, and `npm audit` against the npm registry advisory database (the only check here that uses the network). The tree is `aeb36cc` in run 1 and `204066f` in run 2, after the loop-back 1 repair. Substitute the commit under test in ST-3 and ST-4.

## Checks

| ID | What | Command | Pass criterion |
|---|---|---|---|
| ST-1 | no cross-origin request on any route | "third parties (NFR4)" in `hig-performance.spec.ts`, run by IT-4 | 0 requests to another origin |
| ST-2 | the appearance model asks for no location and calls no sunrise service | the first-visit test in `hig-appearance.spec.ts`, run by IT-4 | 0 geolocation calls and no `api.sunrise-sunset.org` request |
| ST-3 | no secret in the tracked source | `git grep -nIE "AKIA[0-9A-Z]{16}\|BEGIN [A-Z ]*PRIVATE KEY\|(api[_-]?key\|secret\|passw(or)?d\|token)[\"']?[[:space:]]*[:=][[:space:]]*[\"'][A-Za-z0-9+/_-]{16,}" aeb36cc -- site/src site/scripts site/tests preprocessor/src` | no hit, or only fixture text that is explained |
| ST-4 | HTML injection sinks | `git grep -nE "innerHTML\|outerHTML\|insertAdjacentHTML\|dangerouslySetInnerHTML\|set:html" aeb36cc -- site/src` | every `set:html` receives trusted vault HTML or an icon constant; no other sink exists |
| ST-5 | known advisories in production dependencies | `cd site && npm audit --omit=dev` | no high or critical advisory |
| ST-6 | validation of fetched JSON | read the four fetch sites (`GraphView.tsx`, `Search.tsx`, `NavTree.tsx`, `link-preview.ts`) | each validates its payload before use |
| ST-7 | the build-time image reader the loop-back 1 repair added (`site/src/lib/image-size.ts`) reads only inside the assets folder | `npx vitest run tests/unit/render-images.test.ts` (an `/assets/../` image stays unsized), plus reading the containment check | no path outside `content/assets/` is read; malformed files give no size and never throw |

## Test Data and Environment

- ST-1 and ST-2 use the fixture build and the HIG runner.
- ST-3 and ST-4 read the committed tree only.
- ST-5 sends the dependency list, and nothing from the site's content, to the npm registry.
