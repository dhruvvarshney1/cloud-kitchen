import { setActiveNavLink } from "../utils.js";

export function initSiteHeader(options = {}) {
  const {
    toggleSelector = "[data-nav-toggle]",
    navSelector = "[data-site-nav]",
    navLinkSelector = "[data-nav]",
  } = options;

  const nav = document.querySelector(navSelector);
  const toggle = document.querySelector(toggleSelector);

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", String(!isOpen));
      toggle.setAttribute("aria-expanded", String(!isOpen));
    });
  }

  setActiveNavLink(navLinkSelector);
}
