import { initThemeToggle } from "../utils.js";
import { initSiteHeader } from "../components/header.js";
import { initAdminNav } from "../components/admin-nav.js";

initThemeToggle();
initSiteHeader();
initAdminNav("reports");

const reportRange = document.getElementById("reportRange");
if (reportRange) {
  reportRange.addEventListener("change", () => {
    reportRange.setAttribute("aria-busy", "true");
    window.setTimeout(() => {
      reportRange.removeAttribute("aria-busy");
    }, 400);
  });
}
