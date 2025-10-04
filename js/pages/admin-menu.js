import { setActiveAdminNavLink } from "../utils.js";
import { initSiteHeader } from "../components/header.js";
import { initAdminNav } from "../components/admin-nav.js";

initSiteHeader();
initAdminNav("menu");

document.addEventListener("DOMContentLoaded", () => {
  setActiveAdminNavLink("menu-management");
});

const menuFilter = document.getElementById("menuFilter");
if (menuFilter) {
  menuFilter.addEventListener("change", () => {
    menuFilter.setAttribute("aria-busy", "true");
    window.setTimeout(() => {
      menuFilter.removeAttribute("aria-busy");
    }, 400);
  });
}
