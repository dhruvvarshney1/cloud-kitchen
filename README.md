
# Home-Coming Cloud Kitchen

## Structure

- `styles.css` – Consolidated tokens, components, layouts, and themes.
- `app.js` – Unified application controller plus page initialisers.
- `customer/account.html` – Customer portal entry point (legacy `customer/index.html` redirects here).
- `admin/` – Dedicated admin console pages (`dashboard`, `menu-management`, `reports`, `messaging`).
- `manifest.json` & `sw.js` – PWA manifest and service worker for offline caching.

Run the site with any static file server. Registering a Firebase config in `window.firebaseConfig` keeps the admin features working.

