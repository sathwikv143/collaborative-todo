"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./NotificationIcons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("todo-theme");
    const initial =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("todo-theme", next);
  }

  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="theme-toggle-icon" aria-hidden>
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}
