import type { NavigationState } from "../lib/navigation.js";

interface Props {
  items: readonly NavigationState[];
}

export default function MobileNav({ items }: Props) {
  return (
    <details class="mobile-nav-disclosure">
      <summary
        class="mobile-nav-toggle"
        aria-label="주요 탐색 메뉴"
        data-testid="mobile-navigation-toggle"
      >
        <span class="mobile-nav-toggle-label">메뉴</span>
      </summary>
      <nav class="mobile-nav-dropdown" aria-label="주요 탐색">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            class="mobile-nav-link"
            aria-current={item.current ? "page" : undefined}
            data-testid={`mobile-navigation-link-${item.href.slice(1)}`}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </details>
  );
}
