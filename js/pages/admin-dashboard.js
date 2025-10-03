import { initThemeToggle } from "../utils.js";
import { initSiteHeader } from "../components/header.js";
import { initAdminNav } from "../components/admin-nav.js";

initThemeToggle();
initSiteHeader();
initAdminNav("dashboard");

const snapshotRange = document.getElementById("snapshotRange");
if (snapshotRange) {
  snapshotRange.addEventListener("change", () => {
    snapshotRange.setAttribute("aria-busy", "true");
    window.setTimeout(() => {
      snapshotRange.removeAttribute("aria-busy");
    }, 400);
  });
}
