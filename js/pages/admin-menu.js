import { initThemeToggle } from "../utils.js";
import { initSiteHeader } from "../components/header.js";
import { initAdminNav } from "../components/admin-nav.js";

initThemeToggle();
initSiteHeader();
initAdminNav("menu");

const menuFilter = document.getElementById("menuFilter");
if (menuFilter) {
  menuFilter.addEventListener("change", () => {
    menuFilter.setAttribute("aria-busy", "true");
    window.setTimeout(() => {
      menuFilter.removeAttribute("aria-busy");
    }, 400);
  });
}
