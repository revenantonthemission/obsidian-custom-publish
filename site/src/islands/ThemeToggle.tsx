import { useState, useEffect, useCallback } from "preact/hooks";
import { Sun, Moon } from "lucide-preact";
import {
  getCachedGeo,
  requestGeoAndCache,
  getCachedSolar,
  fetchAndCacheSolar,
  getSolarTheme,
  msUntilNextBoundary,
  isManualOverrideActive,
  setManualOverride,
  clearManualOverride,
} from "../lib/solar";
import type { SolarCache, GeoCache } from "../lib/solar";

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Add .theme-transitioning to <html>, apply the change, then remove after 350ms.
 *
 * Uses a module-level timer so rapid successive toggles extend the window
 * rather than race each other. Does NOT use `transitionend` — that event
 * fires per-property per-descendant and the first firing from any child
 * would cut the window short.
 */
let transitionTimer: ReturnType<typeof setTimeout> | null = null;
function withTransition(apply: () => void): void {
  const el = document.documentElement;
  el.classList.add("theme-transitioning");
  apply();
  if (transitionTimer !== null) clearTimeout(transitionTimer);
  transitionTimer = setTimeout(() => {
    el.classList.remove("theme-transitioning");
    transitionTimer = null;
  }, 350);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;

    async function initSolar() {
      let geo = getCachedGeo();
      if (!geo) {
        geo = await requestGeoAndCache();
      }

      let solar = getCachedSolar();
      if (!solar && geo) {
        solar = await fetchAndCacheSolar(geo.lat, geo.lng);
      }

      if (!isManualOverrideActive(solar)) {
        clearManualOverride();
        const solarTheme = getSolarTheme(solar);
        if (solarTheme !== theme) {
          withTransition(() => setTheme(solarTheme));
        }
      }

      scheduleBoundary(solar, geo);
    }

    function scheduleBoundary(solar: SolarCache | null, geo: GeoCache | null) {
      // Clamp to at least 60s to avoid tight loops when fetches fail near a boundary
      const ms = Math.max(msUntilNextBoundary(solar), 60_000);
      timerId = setTimeout(async () => {
        clearManualOverride();

        // Keep prior solar data if fetch fails — avoids falling back to
        // stale-today defaults which could produce a near-zero ms on retry
        let freshSolar = solar;
        if (geo) {
          const fetched = await fetchAndCacheSolar(geo.lat, geo.lng);
          if (fetched) freshSolar = fetched;
        }

        const solarTheme = getSolarTheme(freshSolar);
        withTransition(() => setTheme(solarTheme));

        scheduleBoundary(freshSolar, geo);
      }, ms);
    }

    initSolar();

    return () => {
      if (timerId !== null) clearTimeout(timerId);
    };
  }, []);

  const toggle = useCallback(() => {
    setManualOverride();
    withTransition(() => setTheme((t) => (t === "light" ? "dark" : "light")));
  }, []);

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      style={{
        background: "none",
        border: "1px solid var(--c-border)",
        borderRadius: "var(--radius)",
        padding: "0.35em 0.5em",
        cursor: "pointer",
        color: "var(--c-text)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
