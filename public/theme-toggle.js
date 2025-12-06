// public/theme-toggle.js
// Handles light/dark mode switching using :root[data-theme]

(function () {
  const STORAGE_KEY = "codecrowds-theme";
  const root = document.documentElement;

  // Look for any checkbox with data-theme-toggle (you can have more than one)
  const toggles = () => Array.from(document.querySelectorAll("[data-theme-toggle]"));

  function applyTheme(theme) {
    if (theme !== "light" && theme !== "dark") {
      theme = "dark"; // default
    }

    root.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Keep all toggles in sync: checked = LIGHT mode
    toggles().forEach((el) => {
      el.checked = theme === "light";
    });
  }

  // Initial theme: saved → html[data-theme] → dark
  const saved = localStorage.getItem(STORAGE_KEY);
  const fromAttr = root.getAttribute("data-theme");
  const initial = saved || fromAttr || "dark";
  applyTheme(initial);

  // Attach listeners
  window.addEventListener("DOMContentLoaded", () => {
    toggles().forEach((toggle) => {
      toggle.addEventListener("change", () => {
        applyTheme(toggle.checked ? "light" : "dark");
      });
    });
  });
})();
