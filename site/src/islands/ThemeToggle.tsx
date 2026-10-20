import { useState } from 'preact/hooks';
import { Moon, Sun, SunMoon } from 'lucide-preact';
import {
  APPEARANCES,
  appearanceAnnouncement,
  appearanceLabel,
  browserStorage,
  nextAppearance,
  parseAppearance,
  themeAttribute,
  writeStoredAppearance,
  type Appearance,
} from '../lib/appearance';

const ICONS = { auto: SunMoon, light: Sun, dark: Moon } as const;

/**
 * The appearance button (FR3.2; interaction-spec.md, "Appearance Button").
 *
 * It cycles 자동, 라이트 and 다크. The current mode lives on
 * <html data-appearance>, which BaseLayout's inline bootstrap sets before
 * first paint, and CSS shows the matching icon and name. The server-rendered
 * button therefore already names the stored choice before hydration (R-07),
 * and hydration changes nothing on screen.
 */
export default function ThemeToggle() {
  const [announcement, setAnnouncement] = useState('');

  const cycle = (): void => {
    const root = document.documentElement;
    const next: Appearance = nextAppearance(parseAppearance(root.getAttribute('data-appearance')));
    const theme = themeAttribute(next);
    if (theme === null) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    root.setAttribute('data-appearance', next);
    // Blocked storage keeps the choice for this page only (AC3.3).
    writeStoredAppearance(browserStorage(), next);
    setAnnouncement(appearanceAnnouncement(next));
  };

  return (
    <>
      <button type="button" class="appearance-toggle" onClick={cycle}>
        {APPEARANCES.map((mode) => {
          const Icon = ICONS[mode];
          return (
            <span key={mode} class="appearance-option" data-mode={mode}>
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span class="visually-hidden">{appearanceLabel(mode)}</span>
            </span>
          );
        })}
      </button>
      <span
        class="visually-hidden"
        role="status"
        aria-live="polite"
        data-testid="appearance-status"
      >
        {announcement}
      </span>
    </>
  );
}
