
# Home-Coming Cloud Kitchen

Modern static PWA that powers a Firebase-backed ordering, messaging, and admin management experience for a home-cloud kitchen brand.

> **🔥 Recently Migrated to Firebase!** This project now uses Firebase Authentication and Firestore (migrated from Supabase). See `QUICKSTART.md` for a 5-minute setup guide or `FIREBASE_MIGRATION.md` for complete documentation.

---

## 🚀 Tech stack at a glance
- **HTML5** templates served statically (no bundler)
- **CSS3** via handcrafted `css/common.css` plus Tailwind utility classes loaded from CDN
- **Vanilla JavaScript** orchestrated through a monolithic `RestaurantApp` class in `js/app.js`
- **Firebase**
	- Compat v8 SDK on customer/admin pages (`firebase-app`, `firebase-auth`, `firebase-firestore` from CDN)
	- Modular v10 SDK for standalone auth pages under `/auth`
- **Progressive Web App** with `manifest.json` and root `sw.js`

---

## 📂 Project structure highlights
- `index.html`, `menu.html`, `order.html` – public entry points marked with `data-page` attributes consumed by `js/app.js`
- `login.html`, `signup.html` – standalone auth screens loading `auth/login.js` & `auth/signup.js`
- `admin/` – console split into `dashboard`, `menu-management`, `reports`, `messaging` pages, each toggled by inline `app.*` handlers
- `js/app.js` – ~2.5k LOC `RestaurantApp` class managing auth state, Firestore reads/writes, UI updates, and service worker lifecycle
- `js/messaging.js` – messaging mixin merged into the main app for admin and customer chat UIs
- `src/services/firebase.js` – legacy mixin helpers (`waitForFirebase`, `ensureFirebaseInitialized`, `detectHostingEnvironment`) retained for reference
- `css/` – design tokens (`common.css`) plus page-level overrides (`index.css`, `menu.css`, `order.css`, `login.css`, `signup.css`, `admin.css`)
- `js/firebase-config.js` & `auth/firebase-config.js` – separate configs for compat vs modular SDK usage
- `sw.js` – cache-first service worker with manual asset manifest

> All templates include `<script src="js/app.js"></script>` and expect `window.app = new RestaurantApp()` to exist so inline HTML event attributes remain functional.

---

## 🧠 Application architecture
- **Global singleton:** `const app = new RestaurantApp();` exposes the class instance for inline listeners (`onchange="app.updateOrderStatus(...)"`).
- **Lifecycle:** `DOMContentLoaded` logic in `js/app.js` inspects `body.dataset.page` / `body.dataset.adminPage` to conditionally bootstrap forms, listeners, and navigation state.
- **Firebase integration:** `ensureFirebaseInitialized()` waits up to 10s for compat SDK globals, lazily initializes auth/firestore, and stores handles on the instance.
- **Messaging mixin:** `RestaurantApp` imports `messagingMethods` from `js/messaging.js`; the helpers rely on compat-style `window.firebase.*` APIs, so any modular migration must maintain wrappers.
- **State management:** app stores `currentUser`, menus, cart, and Firestore unsubscribe callbacks on the instance to handle auth transitions and page routing.
- **Error surface:** user feedback is funneled through `showNotification(message, type)` which renders toast-style alerts and auto-dismisses after 5 seconds.

---

## 🔐 Authentication flow
- Users sign in/up on standalone pages using modular v10 SDK (`signInWithEmailAndPassword`, etc.).
- Post-login, `auth/login.js` fetches the Firestore `users/{uid}` document to decide redirect (`admin/dashboard.html` for admins, `index.html` for customers).
- Every other page relies on compat `onAuthStateChanged` invoked from `RestaurantApp.listenToAuthState()` to guard protected routes and hydrate UI.
- Admin promotion happens manually in Firestore by setting `role: "admin"` (see `AUTH_FLOW.md`).

---

## 🍽 Ordering & menu management
- **Order placement:** `initializeOrderForm()` binds to `#scheduled-order-form`, `#delivery-date`, `#daily-menu-items` to prepare scheduling UI and summary cards.
- **Menu sourcing:** `loadMenuForDateTime()` hits Firestore `menuItems`; falls back to in-code defaults when the collection is empty.
- **Persistence:** Orders stored in `orders` collection with `"Rs."`-prefixed price strings. Admin reports parse these strings (see `formatOrderPrice`, `createOrderCardHTML`).
- **Customer tracking:** Listeners attach per-user to display active orders and statuses (tracked via `unsubscribeCustomerOrders`).

---

## 🛠 Admin console features
- **Dashboard (`admin/dashboard.html`):** Real-time order stream (`listenForOrders`), status filters, and inline `<select>` elements calling `app.updateOrderStatus`.
- **Menu management:** CRUD for daily menu items; uses the same Firestore collection as public menus and respects fallback structure.
- **Reports:** Summaries over order history with date-range selectors using aria-busy spinners (`attachBusyOnChange`).
- **Messaging:** Consumes the chat subsystem (below) with conversation list, message history, and quick message composer.

---

## 💬 Messaging & notifications
- Conversations stored under `conversations/{userId}` with metadata (`lastMessage`, `updatedAt`) and messages in `messages` subcollections.
- `startConversationsListener()` and `loadChat()` create Firestore listeners; UI updated via `renderConversations` and `renderChat` using sanitized HTML builders.
- `ensureConversationDoc()` upserts the summary doc whenever messages are sent or customer chat starts.
- Push notifications hinge on Firebase Cloud Messaging; add `vapidKey` to `window.firebaseConfig` so `handleNotificationOptIn()` can register tokens under `users/{uid}.messagingTokens`.

---

## 🎨 Styling & theming
- `css/common.css` defines CSS custom properties for colors/spacing and component classes used across templates.
- Dark mode toggled via `#themeToggle` button; script updates `<meta name="theme-color">`, `data-color-scheme`, and toggles `document.documentElement.classList` for Tailwind compatibility.
- Tailwind CDN enables lightweight utility usage without a build step—avoid introducing conflicting class names.

---

## 📱 PWA setup
- `manifest.json` declares icons and display mode; ensure new assets are reflected there.
- `sw.js` caches a hard-coded list of critical routes/assets under `CACHE_NAME = "cloud-kitchen-v3"`; update the `ASSETS` array when adding pages to keep offline support coherent.
- Service worker registration handled inside `js/app.js` (`registerServiceWorker()`), prompting users to refresh when updates are available.

---

## 🔧 Local development workflow
1. Install tooling dependencies (optional – Vite is listed but unused at runtime).
2. Serve the root directory over HTTP (examples below). Avoid `file://` to keep Firebase auth working.

```bash
# Option A
npx http-server .

# Option B
python -m http.server 8080
```

3. Configure Firebase by updating `js/firebase-config.js` (compat) and `auth/firebase-config.js` (modular) with your project keys and optional `vapidKey`.
4. Walk through the end-to-end flow: signup/login → place order → view admin dashboard → test messaging → confirm service worker registration.

No automated tests exist; capture manual QA steps in PR notes and use the Firebase console to inspect `orders`, `menuItems`, and `conversations` when debugging.

---

## ✅ Developer checklists
- Maintain inline handler compatibility whenever renaming `RestaurantApp` methods.
- Keep `body` data attributes aligned with `js/app.js` branches when creating new templates.
- Mirror any new static assets/routes in both `manifest.json` and `sw.js`.
- Preserve price string formatting (`"Rs."`) unless you update every parser.
- When touching Firebase logic, keep the class and legacy helper modules (`src/services/firebase.js`, `js/messaging.js`) aligned.

---

## 📚 Reference docs
- `QUICKSTART.md` – **5-minute Firebase setup guide** (start here!)
- `FIREBASE_MIGRATION.md` – complete Firebase configuration, security rules, and troubleshooting
- `MIGRATION_COMPLETE.md` – summary of the Supabase → Firebase migration
- `AUTH_FLOW.md` – detailed sign-up/login guidance and admin promotion steps
- `FIREBASE_SETUP.md` – instructions for configuring Firebase project settings and service credentials
- `IMPLEMENTATION_SUMMARY.md` – overview of completed features and file structure

