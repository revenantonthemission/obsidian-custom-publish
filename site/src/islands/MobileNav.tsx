import { useState } from "preact/hooks";

interface Props {
  links: { href: string; label: string }[];
}

export default function MobileNav({ links }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        class="mobile-nav-toggle"
        onClick={() => setOpen(!open)}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        )}
      </button>
      {open && (
        <div class="mobile-nav-dropdown">
          {links.map((link) => (
            <a key={link.href} href={link.href} class="mobile-nav-link">
              {link.label}
            </a>
          ))}
        </div>
      )}
    </>
  );
}
