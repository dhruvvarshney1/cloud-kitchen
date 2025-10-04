import { setActiveNavLink } from "../utils.js";

document.addEventListener("DOMContentLoaded", () => {
  setActiveNavLink();
});

const accountForm = document.querySelector("#customerMessage");
if (accountForm) {
  accountForm.addEventListener("focus", () => {
    accountForm.setAttribute("data-touched", "true");
  });
}
