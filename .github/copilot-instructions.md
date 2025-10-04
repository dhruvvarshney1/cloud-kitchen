# Home-Coming Cloud Kitchen – AI Guide

## Getting oriented
- Static PWA for a Firebase-backed ordering flow; no bundler or framework build step.
- All runtime behaviour lives in `app.js` (~2.5k LOC). A single `RestaurantApp` class orchestrates auth, ordering, admin, chat, notifications, and PWA concerns.
- HTML pages signal context through `body` data attributes (e.g. `data-page="landing"`, `data-admin-page="dashboard"`). The constructor routes behaviour based on those markers.

## Running & debugging
- Serve the repo with any static server (e.g. `npx http-server .`, `python -m http.server`). Loading via `file://` breaks Firebase auth; the app warns via `detectHostingEnvironment()`.
- Populate `firebase-config.js` with real credentials before testing; `FIREBASE_SETUP.md` walks through project bootstrap and Firestore rules.
- Push messaging needs a `vapidKey` added to `window.firebaseConfig` to avoid silent notification failures.

## Core architecture
- `RestaurantApp.initialize()` waits for global compat SDKs (`firebase-app`, `firebase-auth`, `firebase-firestore`) that are loaded from CDN in every page.
- Firestore access prefers modular helpers (`window.firebase.doc`, `getDoc`, `addDoc`, etc.) when present and falls back to compat (`this.db.collection(...)`). Keep both paths intact when extending data calls.
- Global instance `const app = new RestaurantApp();` is required because HTML templates call methods inline (e.g. `<select onchange="app.updateOrderStatus(...)">`). Do not rename or scope it away.
- Time-slot logic, default capacity, and fallback menu templates reside on the class (`this.timeSlots`, `this.defaultCapacity`). Update these centrally when changing scheduling assumptions.

## Public ordering experience
- `initializeOrderForm()` binds to IDs on `order.html`/`index.html` (`#scheduled-order-form`, `#delivery-date`, `#daily-menu-items`). When adding fields, update the summary builders inside this method.
- `loadMenuForDateTime()` reads Firestore collection `menuItems`; if none exist it injects hard-coded defaults. Preserve that fallback for zero-data launches.
- Orders write to the `orders` collection with customer metadata and price strings (`Rs.` prefix). Any schema change must stay compatible with `createOrderCardHTML()` and admin filters.

## Admin & customer consoles
- Admin tabs (`admin/dashboard.html`, `menu-management.html`, `reports.html`, `messaging.html`) rely on `switchTab()` and Firestore listeners (`listenForOrders`, `loadMenuItems`, `startConversationsListener`). New tabs should follow the same `<div id="{tab}Tab">` convention.
- Status updates happen via inline `onchange` bindings that call `app.updateOrderStatus(orderId, status)`. Keep this signature stable when reworking order cards.
- Customer messaging uses the `conversations/{userId}/messages` subcollection. `ensureConversationDoc()` maintains the parent document; extend it rather than bypassing for new metadata.

## PWA & notifications
- `registerServiceWorker()` expects `sw.js` at the project root and will nudge users to refresh after updates. If you add assets, mirror them in the `ASSETS` list for precaching.
- `handleNotificationOptIn()` gates push setup on auth + messaging support and stores FCM tokens on `users/{uid}`. Reuse `requestMessagingToken()` helpers rather than talking to Firebase Messaging directly.

## UI & styling conventions
- `styles.css` houses design tokens, component styles, and dark-mode rules; Tailwind is only used via CDN for utility classes. Align new CSS with the existing BEM-inspired naming.
- Theme toggling updates `<meta name="theme-color">` and toggles `data-color-scheme`. New components should read mode from CSS variables instead of hard-coding colors.
- Legacy `script.js` is intentionally empty—keep future logic inside `app.js` to avoid diverging entry points.
