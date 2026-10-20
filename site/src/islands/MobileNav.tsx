import { Check, ChevronRight, Menu, X } from 'lucide-preact';
import type { NavigationState } from '../lib/navigation.js';

interface Props {
  items: readonly NavigationState[];
}

/**
 * The navigation sheet for phones (interaction-spec.md, "Navigation Sheet").
 * Header renders it without a client directive, so it ships as static HTML: a
 * native details disclosure that opens and navigates without JavaScript.
 * While it is open, CSS hides the page behind it from view and from focus.
 */
export default function MobileNav({ items }: Props) {
  return (
    <details class="mobile-nav-disclosure">
      <summary
        class="mobile-nav-toggle"
        aria-label="주요 탐색 메뉴"
        data-testid="mobile-navigation-toggle"
      >
        <Menu class="mobile-nav-icon-open" size={22} strokeWidth={1.75} aria-hidden="true" />
        <X class="mobile-nav-icon-close" size={22} strokeWidth={1.75} aria-hidden="true" />
      </summary>
      <nav class="mobile-nav-dropdown" aria-label="주요 탐색" data-material="thick">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            class="mobile-nav-link"
            aria-current={item.current ? 'page' : undefined}
            data-testid={`mobile-navigation-link-${item.href.slice(1)}`}
          >
            <span>{item.label}</span>
            {item.current ? (
              <Check size={20} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
            )}
          </a>
        ))}
      </nav>
    </details>
  );
}
