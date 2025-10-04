import { setActiveAdminNavLink } from "../utils.js";
import { initSiteHeader } from "../components/header.js";
import { initAdminNav } from "../components/admin-nav.js";

document.addEventListener("DOMContentLoaded", () => {
  setActiveAdminNavLink("messaging");
});

initSiteHeader();
initAdminNav("messaging");

const chatForm = document.querySelector(".chat-input-row");
if (chatForm) {
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const messageField = chatForm.querySelector("textarea");
    if (!messageField) return;

    const value = messageField.value.trim();
    if (!value) return;

    const history = document.querySelector(".chat-messages");
    if (history) {
      const bubble = document.createElement("div");
      bubble.className = "msg me";
      bubble.innerHTML = `<p>${value}</p><span class="meta">Just now</span>`;
      history.appendChild(bubble);
      history.scrollTop = history.scrollHeight;
    }

    messageField.value = "";
  });
}
