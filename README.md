
# Home-Coming Cloud Kitchen

## Structure

- `css/design-system.css` – Tokens, typography, and utility classes.
- `css/components.css` – Buttons, form controls, theme toggle, cards, and statuses.
- `css/layouts.css` – Page layouts for landing, menu, order, customer, and admin experiences.
- `css/themes.css` – Light/dark theme variables.
- `js/utils.js` – Shared helpers (theme toggle, navigation highlighting).
- `js/components/` – UI component initialisers (`header`, `admin-nav`).
- `js/pages/` – Page-level bootstrap scripts.
- `customer/account.html` – Customer portal entry point (legacy `customer/index.html` redirects here).
- `admin/` – Dedicated admin console pages (`dashboard`, `menu-management`, `reports`, `messaging`).
- `manifest.json` & `sw.js` – PWA manifest and service worker for offline caching.

Run the site with any static file server. Registering a Firebase config in `window.firebaseConfig` keeps the admin features working.

