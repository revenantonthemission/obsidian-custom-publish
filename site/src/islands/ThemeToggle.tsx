import { useState, useEffect } from "preact/hooks";

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      style={{
        background: "none",
        border: "1px solid var(--c-border)",
        borderRadius: "var(--radius)",
        padding: "0.35em 0.6em",
        cursor: "pointer",
        color: "var(--c-text)",
        fontSize: "0.9rem",
      }}
    >
      {theme === "light" ? "\u263E" : "\u2600"}
    </button>
  );
}
