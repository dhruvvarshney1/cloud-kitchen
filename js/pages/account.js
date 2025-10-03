import { initThemeToggle, setActiveNavLink } from "../utils.js";
import { initSiteHeader } from "../components/header.js";

initThemeToggle();
initSiteHeader();
setActiveNavLink("[data-nav]");

const accountForm = document.querySelector("#customerMessage");
if (accountForm) {
  accountForm.addEventListener("focus", () => {
    accountForm.setAttribute("data-touched", "true");
  });
}
