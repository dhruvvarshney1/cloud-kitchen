const toggle = document.getElementById("themeToggle");

if (toggle) {
  const THEME_KEY = "cloudKitchen-theme";
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const iconEl = toggle.querySelector(".theme-toggle__icon");

  const applyTheme = (mode, persist = true) => {
    const scheme = mode === "dark" ? "dark" : "light";
    root.setAttribute("data-color-scheme", scheme);

    if (scheme === "dark") {
      root.classList.add("dark");
      toggle.setAttribute("aria-pressed", "true");
    } else {
      root.classList.remove("dark");
      toggle.setAttribute("aria-pressed", "false");
    }

    const label = scheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    const icon = scheme === "dark" ? "🌞" : "🌙";

    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
    if (iconEl) iconEl.textContent = icon;

    if (themeMeta) {
      themeMeta.setAttribute("content", scheme === "dark" ? "#1f2937" : "#4CAF50");
    }

    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, scheme);
      } catch (error) {
        console.warn("Unable to persist theme preference", error);
      }
    }
  };

  const storedTheme = (() => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (error) {
      console.warn("Unable to read stored theme", error);
      return null;
    }
  })();

  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(storedTheme || (prefersDark ? "dark" : "light"), Boolean(storedTheme));

  toggle.addEventListener("click", () => {
    const current = root.getAttribute("data-color-scheme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next, true);
  });

  if (!storedTheme && window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event) => applyTheme(event.matches ? "dark" : "light", false);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
    } else if (typeof media.addListener === "function") {
      media.addListener(listener);
    }
  }
}
