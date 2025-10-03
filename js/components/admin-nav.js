export function initAdminNav(activeSection) {
  const links = document.querySelectorAll("[data-admin-nav]");
  if (!links.length) {
    return;
  }

  links.forEach((link) => {
    const section = link.getAttribute("data-admin-nav");
    const isActive = section === activeSection;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}
