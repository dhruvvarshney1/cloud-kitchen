const THEME_KEY = "cloudKitchen-theme";

export function initThemeToggle(toggleSelector = "#themeToggle") {
  const toggle = document.querySelector(toggleSelector);
  if (!toggle) {
    return;
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const storedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const iconEl = toggle.querySelector(".theme-toggle__icon");
  const labelEl = toggle.querySelector(".theme-toggle__label");

  const applyTheme = (mode, persist = true) => {
    const scheme = mode === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-color-scheme", scheme);
    
    // Add/remove dark class for Tailwind CSS compatibility
    if (scheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    toggle.setAttribute("aria-pressed", scheme === "dark" ? "true" : "false");

    const iconText = scheme === "dark" ? "🌞" : "🌙";
    const controlLabel =
      scheme === "dark" ? "Switch to light mode" : "Switch to dark mode";

    if (iconEl) iconEl.textContent = iconText;
    toggle.setAttribute("aria-label", controlLabel);
    toggle.setAttribute("title", controlLabel);

    if (themeMeta) {
      themeMeta.setAttribute(
        "content",
        scheme === "dark" ? "#0f220f" : "#357a38"
      );
    }

    if (persist) {
      localStorage.setItem(THEME_KEY, scheme);
    }
  };

  const initialTheme = storedTheme || (prefersDark ? "dark" : "light");
  applyTheme(initialTheme, Boolean(storedTheme));

  toggle.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-color-scheme") === "dark"
        ? "dark"
        : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next, true);
  });

  if (!storedTheme && window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(event.matches ? "dark" : "light", false);
      }
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
    } else if (typeof media.addListener === "function") {
      media.addListener(listener);
    }
  }
}

export function setActiveNavLink(selector = "[data-nav]") {
  const links = document.querySelectorAll(selector);
  if (!links.length) return;

  const { pathname } = window.location;
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    if (pathname.endsWith(href)) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}
