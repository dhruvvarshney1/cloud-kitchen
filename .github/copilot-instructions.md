# Home-Coming Cloud Kitchen – AI Guide

## Orientation
- Static PWA served from vanilla HTML/CSS/JS; run via `npx http-server .` or `python -m http.server 8080`. Loading with `file://` breaks Firebase auth (see `detectHostingEnvironment` in `src/services/firebase.js`).
- `js/app.js` (~2.5k LOC) bootstraps `window.app = new RestaurantApp()` on every page so inline handlers defined in HTML keep working.
- Tooling packages in `package.json` (e.g. Vite) are unused at runtime—commit plain JS/CSS outputs.

## Page bootstrapping patterns
- All templates set `body.dataset.page` or `body.dataset.adminPage`; `RestaurantApp.initializePage()` branches on those values. Preserve existing data attributes when adding pages.
- Admin pages (`admin/*.html`) rely on inline listeners such as `<select onchange="app.updateOrderStatus(...)">`; method names/argument order are contractually stable.
- Standalone auth screens live under `/auth` (`login.html`, `signup.html`) and load modular scripts (`auth/login.js`, `auth/signup.js`). Keep redirects aligned with `AUTH_FLOW.md` when touching them.

## Firebase integration
- Customer/admin pages load compat v8 SDK from CDN plus `js/firebase-config.js`; `RestaurantApp.ensureFirebaseInitialized()` caches `auth`/`db` and retries for ~10s if globals lag.
- Auth pages use modular v10 SDK; after `signInWithEmailAndPassword`, `auth/login.js` fetches `users/{uid}` to decide between `admin/dashboard.html` and `index.html`.
- Push messaging hinges on `window.firebaseConfig.vapidKey`. Without it `handleNotificationOptIn()` logs errors and skips saving tokens to `users/{uid}.messagingTokens`.

## Core data flows
- Orders land in Firestore `orders` with `"Rs."`-prefixed price strings; parsing helpers such as `formatOrderPrice` and `createOrderCardHTML` expect that format.
- `loadMenuForDateTime()` queries `menuItems`; when empty it falls back to in-file defaults. Update both Firestore data and defaults when adding dishes.
- Chat data sits under `conversations/{userId}` with messages in `messages` subcollections. `ensureConversationDoc()` maintains summary fields (`lastMessage`, `updatedAt`) required by admin messaging UI.

## Code organization
- `js/messaging.js` exports a mixin merged into `RestaurantApp`; keep DOM class names and template builders in sync across both files.
- Legacy helpers live in `src/services/firebase.js`; new work should respect compat-style APIs (`window.firebase.firestore()`). Wrap modular imports if you introduce them so existing code keeps running.
- Service worker logic in `js/app.js` (see `registerServiceWorker`) expects root `sw.js`. Update `sw.js` `ASSETS` and `manifest.json` whenever adding/removing routes.

## UI & theming
- `css/common.css` defines design tokens and dark-mode rules. Theme toggle updates `<meta name="theme-color">` and `document.documentElement.dataset.colorScheme`; new UI should read CSS variables instead of hard-coding colors.
- Forms and summaries rely on specific element IDs (e.g. `scheduled-order-form`, `delivery-date`, `daily-menu-items`). Adjust corresponding setup methods like `initializeOrderForm` when changing markup.

## Developer workflow
- Configure Firebase creds in `js/firebase-config.js` (compat pages) and `auth/firebase-config.js` (modular auth). `QUICKSTART.md` walks through setup; `FIREBASE_MIGRATION.md` documents the full context.
- Manual QA path: signup/login → place order on `order.html` → confirm admin dashboard updates → send chat message → verify service worker registration prompts refresh.
- No automated tests; document manual scenarios and inspect `orders`, `menuItems`, `conversations` via Firebase console while debugging.
