import { setActiveAdminNavLink } from "../utils.js";
import { initSiteHeader } from "../components/header.js";
import { initAdminNav } from "../components/admin-nav.js";

document.addEventListener("DOMContentLoaded", () => {
  setActiveAdminNavLink("reports");
});

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
