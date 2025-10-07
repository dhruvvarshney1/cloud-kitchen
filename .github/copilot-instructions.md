# Home-Coming Cloud Kitchen – AI Guide

## Quick orientation
- Static PWA served by vanilla HTML/JS; run with any static server (`npx http-server .` or `python -m http.server`). Loading via `file://` breaks Firebase auth despite the warning surfaced by `detectHostingEnvironment()`.
- `app.js` (~2.5k LOC) is loaded on every page and instantiates `window.app = new RestaurantApp()` so inline handlers in HTML can call methods directly.
- `package.json` lists Vite but there's no bundler flow; treat dependencies as tooling-only and commit plain JS/CSS.

## Bootstrapping & routing cues
- Pages declare context through `body` attributes (`data-page="landing"`, `data-admin-page="dashboard"`, etc.). `DOMContentLoaded` hooks in `app.js` branch on these flags, so preserve them when creating new templates.
- Admin HTML uses inline listeners (e.g. `<select onchange="app.updateOrderStatus(...)">`); keep method names and argument order stable when refactoring the class.

## Firebase & auth
- Main app pages load Firebase compat SDK v8 from CDN plus `firebase-config.js`, which defines `window.firebaseConfig` used by `RestaurantApp.ensureFirebaseInitialized()` to cache `auth`/`db` on the instance.
- Standalone login/signup pages rely on modular SDK v10 (`auth/*.js`); successful login reads `users/{uid}` to decide redirects. Elevate admins by setting `role: "admin"` manually per `AUTH_FLOW.md`.
- Push messaging requires adding `vapidKey` to `window.firebaseConfig`; without it, `handleNotificationOptIn()` logs an error and FCM token storage never runs.

## Data flows
- Orders persist to Firestore `orders` documents with price strings prefixed by `"Rs."`; admin summaries parse those strings, so keep the format or update parsing helpers (`formatOrderPrice`, `createOrderCardHTML`).
- `loadMenuForDateTime()` queries the `menuItems` collection and falls back to hard-coded defaults when empty; extend both Firestore data and fallback lists when adding menu items.
- Chat data lives under `conversations/{userId}/messages`; `ensureConversationDoc()` updates the parent document's summary fields and must stay in sync with any schema changes.

## Module split
- `src/services/firebase.js` and `src/features/messaging/messaging-controller.js` export method bundles intended to mix into `RestaurantApp`. The class still carries duplicated logic, so update both the class and the extracted modules (or finish the extraction) when touching Firebase/messaging flows.
- Helpers expect compat-style globals (`window.firebase.collection`, `addDoc`, etc.). If you introduce modular imports, wrap them so both compat callers and the extracted modules continue to work.

## UI & styling
- `styles.css` centralizes tokens, components, and dark-mode rules; Tailwind utilities from CDN are additive. Theme toggling updates `<meta name="theme-color">` and `data-color-scheme`, so new UI should read CSS variables instead of hard-coding colors.
- Form hooks target specific IDs (`#scheduled-order-form`, `#delivery-date`, `#daily-menu-items`); update the corresponding setup methods (`initializeOrderForm`, `updateOrderSummary`) if you change markup.

## PWA considerations
- `registerServiceWorker()` expects `sw.js` at project root; keep the `ASSETS` array aligned with real pages when adding/removing routes to avoid stale caches.
- Push opt-in stores tokens on `users/{uid}.messagingTokens`; call `requestMessagingToken()` instead of hitting Firebase Messaging manually.

## Developer workflows
- Serve locally over HTTP to exercise auth, orders, and messaging end-to-end. Walk through login → order placement → admin dashboard → messaging to verify `listenToAuthState()` reattaches listeners and cleans up correctly.
- No automated tests yet; document manual test cases in PRs and lean on Firebase console to inspect `orders`, `menuItems`, and `conversations` when debugging.
