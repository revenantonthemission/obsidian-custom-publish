# Logical Components — U4 `u4-navigation`

Upstream: `inception/domain-design/components.md` (SiteChrome); `functional-design/frontend-components.md`, `rules.md`; the NFR designs in this folder (`performance-design.md`, `security-design.md`); `nfr-requirements/tech-stack-decisions.md`.

U4 is a UI unit: it has no service, no queue, no cache and no runtime. Its components are build-time modules with one failure domain — the site build.

| Logical component | File | NFR patterns | Failure domain | Blast radius |
|---|---|---|---|---|
| Primary navigation model | `site/src/lib/navigation.ts` (`getPrimaryNavigation`) | one frozen item; fail-closed model validation (`navigation.model.invalid`) | site build | the build stops, so nothing ships; no page can render a wrong menu |
| Marker rule | `site/src/lib/navigation.ts` (`resolveNavigationMarker`) | pure, O(1), path-only; no I/O, clock or locale (NFR4.8) | site build | a wrong marker on every page; unit- and property-tested, deterministic |
| Navigation state | `site/src/lib/navigation.ts` (`getPrimaryNavigationState`) | frozen states; `current` boolean for the sheet icon, `ariaCurrent` for the attribute; fail-closed path validation (`navigation.current.invalid`) | site build | every page's chrome; the build stops on an invalid path |
| Header (top bar) | `site/src/components/Header.astro` | renders the one Writing link and its marker; throws `TypeError` on an invalid state (NFR5.21) | site build | no bar on any page — but the build fails first, so no broken page is published |
| MobileNav (phone sheet) | `site/src/islands/MobileNav.tsx` | static `<details>`, no client directive; check icon from `current`; same-origin anchor | phone widths (< 768 px) | the sheet is the only phone navigation; it still opens and navigates without JavaScript |
| Chrome indicator rules | `site/src/styles/chrome.css` | attribute selectors for `aria-current='page'` and `'true'`; `--c-` tokens only; no motion (NFR1.14) | every page | the current item is not visually distinguished — the weight, the underline and the icon carry it, never colour alone |
| Profile local navigation | `site/src/components/profile/ProfileLocalNavigation.astro` | unchanged; keeps `aria-current="page"` on the current profile route | `/resume`, `/portfolio` | unchanged |

**Isolation:** the marker rule reads nothing from the chrome, so a change in the stylesheet cannot change the marker's result and a change in the marker cannot change the stylesheet's behaviour. The desktop bar and the phone sheet render the same frozen state list, so the two surfaces cannot disagree.

**Shared resources (unchanged by U4):**

- `HIG_ROUTES` in `site/tests/e2e/support/hig.ts` — the axe matrix; `/resume` and `/portfolio` are already in it.
- The `--target` token (44 px), `--c-bar-indicator`, `--c-tint` and the other `--c-` colour tokens in `site/src/styles/tokens.css`.
- `site/src/lib/profile/issues.ts` — the coded validation issues the fail-closed path raises.
- The fixture vault `fixtures/vault/` — U4 adds no fixture and changes no content.
- The site build pipeline, the Astro config and the static server — untouched; U3 owns the redirect table.
