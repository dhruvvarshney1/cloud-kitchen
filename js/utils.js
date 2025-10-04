export function setActiveNavLink(selector = "[data-nav]") {
  const links = document.querySelectorAll(selector);
  if (!links.length) return;

  const { pathname } = window.location;
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    if (pathname.endsWith(href)) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

export function setActiveAdminNavLink(page) {
  const navLinks = document.querySelectorAll(".admin-nav a");
  navLinks.forEach((link) => {
    if (link.getAttribute("href").includes(page)) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}
