import { firebaseServiceMethods } from "./src/services/firebase.js";
import { messagingMethods } from "./src/features/messaging/messaging-controller.js";

class RestaurantApp {
  constructor() {
    this.currentUser = null;
    this.cart = [];
    this.editingMenuItem = null;
    this.unsubscribeOrders = null;
    this.unsubscribeCustomerOrders = null;
    this.allOrders = [];
    this.auth = null;
    this.db = null;
    // Messaging state
    this.unsubscribeConversations = null;
    this.unsubscribeChat = null;
    this.activeConversation = null; // { id, userId, name }
  this.navAuthLogoutHandler = null;

    this.timeSlots = [
      { id: "lunch", name: "Lunch", time: "13:00 - 14:00" },
      { id: "dinner", name: "Dinner", time: "19:00 - 20:00" },
    ];

    return new Promise((resolve) => {
      const start = Date.now();

      const check = () => {
        if (window.firebase) {
          resolve(true);
          return;
        }

        if (Date.now() - start >= timeout) {
          resolve(false);
          return;
        }

        window.setTimeout(check, 50);
      };

      check();
    });
  }

  async ensureFirebaseInitialized() {
    if (this.firebaseInitialized && this.auth && this.db) {
      return true;
    }

    if (this.firebaseInitPromise) {
      return this.firebaseInitPromise;
    }

    this.firebaseInitPromise = (async () => {
      try {
        const ready = await this.waitForFirebase(10000); // Increased timeout
        if (!ready) {
          console.error("Firebase SDK did not load in time.");
          this.showNotification("Could not connect to services. Please refresh.", "error");
          return false;
        }

        if (!window.firebase.apps || window.firebase.apps.length === 0) {
          console.log("Initializing new Firebase app...");
          this.firebaseApp = window.firebase.initializeApp(window.firebaseConfig);
        } else {
          console.log("Re-using existing Firebase app...");
          this.firebaseApp = window.firebase.app();
        }

        this.auth = window.firebase.auth();
        this.db = window.firebase.firestore();
        
        this.firebaseInitialized = true;
        console.log("Firebase services are ready.");
        return true;
      } catch (error) {
        console.error("Failed to initialize Firebase services:", error);
        this.firebaseInitialized = false;
        this.showNotification("Failed to initialize services. Check console.", "error");
        return false;
      } finally {
        this.firebaseInitPromise = null; // Clear promise after completion
      }
    })();

    return this.firebaseInitPromise;
  }

  detectHostingEnvironment() {
    if (window.location.protocol === "file:") {
      console.warn(
        "Running from file:// - Firebase Auth may not work properly"
      );
    }
  }

  setupThemeToggle() {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;

    const THEME_KEY = "cloudKitchen-theme";
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const storedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const iconEl = toggle.querySelector(".theme-toggle__icon");
    const labelEl = toggle.querySelector(".theme-toggle__label");

    const applyTheme = (mode, persist = true) => {
      const scheme = mode === "dark" ? "dark" : "light";
      document.documentElement.setAttribute("data-color-scheme", scheme);
      
      // Add/remove dark class for Tailwind CSS compatibility
      if (scheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      toggle.setAttribute("aria-pressed", scheme === "dark" ? "true" : "false");

      const labelText = scheme === "dark" ? "Light" : "Dark";
      const iconText = scheme === "dark" ? "🌞" : "🌙";
      const controlLabel =
        scheme === "dark" ? "Switch to light mode" : "Switch to dark mode";

      if (iconEl) iconEl.textContent = iconText;
      if (labelEl) labelEl.textContent = labelText;
      toggle.setAttribute("aria-label", controlLabel);
      toggle.setAttribute("title", controlLabel);

      if (themeMeta) {
        themeMeta.setAttribute(
          "content",
          scheme === "dark" ? "#0f220f" : "#357a38"
        );
      }

      if (persist) {
        localStorage.setItem(THEME_KEY, scheme);
      }
    };

    const initialTheme = storedTheme || (prefersDark ? "dark" : "light");
    applyTheme(initialTheme, Boolean(storedTheme));

    toggle.addEventListener("click", () => {
      const current =
        document.documentElement.getAttribute("data-color-scheme") === "dark"
          ? "dark"
          : "light";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next, true);

      if (this.themeMediaListener) {
        const { media, listener } = this.themeMediaListener;
        if (media) {
          if (typeof media.removeEventListener === "function") {
            media.removeEventListener("change", listener);
          } else if (typeof media.removeListener === "function") {
            media.removeListener(listener);
          }
        }
        this.themeMediaListener = null;
      }
    });

    if (!storedTheme && window.matchMedia) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (event) => {
        if (!localStorage.getItem(THEME_KEY)) {
          applyTheme(event.matches ? "dark" : "light", false);
        }
      };

      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", listener);
      } else if (typeof media.addListener === "function") {
        media.addListener(listener);
      }

      this.themeMediaListener = { media, listener };
    }
  }

  // Authentication methods
  async listenToAuthState() {
    console.log("Preparing to listen for auth state...");
    
    const initialized = await this.ensureFirebaseInitialized();
    if (!initialized) {
        console.error("Cannot listen to auth state, Firebase not initialized.");
        this.hideLoader();
        // If on a protected page, redirect, otherwise show public view.
        const path = window.location.pathname;
        const isProtectedPage = path.includes('/admin/') || path.includes('/customer/');
        if (isProtectedPage) {
            window.location.href = 'login.html';
        } else {
            this.updatePublicUIForGuest();
        }
        return;
    }

    console.log(
      "Auth listener is active. Waiting for response from Firebase..."
    );
    this.showLoader();

    const authTimeout = setTimeout(() => {
      console.error("Auth state check timed out after 10 seconds.");
      this.hideLoader();
      this.showNotification(
        "Connection timed out. Please check your network and firewall settings.",
        "error"
      );
    }, 10000);

    if (!this.auth || typeof this.auth.onAuthStateChanged !== "function") {
      console.error("Firebase auth not initialized correctly.");
      this.hideLoader();
      return;
    }

    this.auth.onAuthStateChanged(async (user) => {
      clearTimeout(authTimeout);
      console.log("Auth state changed. User object:", user);

      if (user) {
        let userProfile;
        try {
          userProfile = await this.getUserProfile(user.uid);
        } catch (e) {
          console.error("Error fetching user profile:", e);
          userProfile = await this.recoverProfileAfterReadFailure(user, e);
          if (!userProfile) {
            await this.logout();
            this.hideLoader();
            return;
          }
        }

        console.log("User profile resolved:", userProfile);

        if (!userProfile) {
          try {
            const defaultProfile = this.getDefaultProfileForUser(user);
            await this.createUserProfile(user.uid, defaultProfile);
            userProfile = defaultProfile;
            this.showNotification(
              "Welcome! Your profile was created.",
              "success"
            );
          } catch (e) {
            console.error("Failed to auto-create user profile:", e);
            this.showNotification(
              "Could not create your profile. Please try again later.",
              "error"
            );
            await this.logout();
            this.hideLoader();
            return;
          }
        }

        this.currentUser = { uid: user.uid, email: user.email, ...userProfile };
        const onLoginPage = document.body.dataset.page === 'login';

        if (this.currentUser.role === "admin") {
          // If on login page, redirect to admin dashboard
          if (onLoginPage) {
            window.location.href = 'admin/dashboard.html';
            return; // Stop further execution on this page
          }
          // Otherwise, just setup the admin screen (if it exists on the page)
          console.log("User is admin. Loading admin screen.");
          this.configureNavAuthForUser();
          this.showScreen("adminScreen");
          await this.loadAdminData();
          this.startConversationsListener?.();
        } else {
          // If on login page, redirect to home page for customers
          if (onLoginPage) {
            window.location.href = 'index.html';
            return; // Stop further execution on this page
          }
          // Otherwise, just update the public UI for the logged-in user
          console.log("User is a customer. Updating UI.");
          this.updatePublicUIForUser();
        }
      } else {
        this.currentUser = null;
        this.detachListeners();
        
        const path = window.location.pathname;
        const onLoginPage = document.body.dataset.page === 'login';
        
        // Check if on a page that requires login
        const isProtectedPage = path.includes('/admin/') || path.includes('/customer/');

        if (isProtectedPage) {
          console.log("User is not logged in. Redirecting from protected page.");
          // Adjust path for redirection from nested directories
          const relativePathToRoot = path.split('/').length > 2 ? '../' : './';
          window.location.href = `${relativePathToRoot}login.html`;
          return; // Stop further execution
        }
        
        if (onLoginPage) {
          // If we are on the login page and the user is null, this is the correct state.
          // The page is already visible, so we just hide the loader and stop.
          this.configureNavAuthForGuest();
          this.hideLoader();
          console.log("On login page and user is not logged in. UI is correct.");
          return;
        }
        
        console.log("No user is logged in. Showing public landing.");
        this.updatePublicUIForGuest();
      }

      this.hideLoader();
      console.log("Auth state callback finished.");
    });
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const initialized = await this.ensureFirebaseInitialized();
    if (!initialized) {
        this.showNotification("Services are not ready. Please try again in a moment.", "error");
        return;
    }

    this.showLoader();

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const email = usernameInput ? usernameInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    console.info("Attempting login for", email || "<empty email>");
    try {
      const ready = await this.ensureFirebaseInitialized();
      if (!ready ||
          typeof this.auth?.signInWithEmailAndPassword !== "function") {
        const unavailableError = new Error(
          "Authentication service is not ready."
        );
        unavailableError.code = "auth/service-unavailable";
        throw unavailableError;
      }

      if (!email) {
        const invalidEmailError = new Error("Email is required.");
        invalidEmailError.code = "auth/invalid-email";
        throw invalidEmailError;
      }

      if (!password) {
        const missingPasswordError = new Error("Password is required.");
        missingPasswordError.code = "auth/missing-password";
        throw missingPasswordError;
      }

      if (typeof this.auth.fetchSignInMethodsForEmail === "function") {
        const signInMethods = await this.auth.fetchSignInMethodsForEmail(email);
        if (!Array.isArray(signInMethods) || signInMethods.length === 0) {
          const userNotFoundError = new Error("User not found.");
          userNotFoundError.code = "auth/user-not-found";
          throw userNotFoundError;
        }
      }

      await this.auth.signInWithEmailAndPassword(email, password);
      console.info("Login request accepted by Firebase for", email);
    } catch (error) {
      let normalizedError = error;

      if (error?.code === "auth/wrong-password") {
        normalizedError = new Error("Password mismatch");
        normalizedError.code = "auth/password-mismatch";
      } else if (error?.code === "auth/user-not-found") {
        normalizedError = new Error("User not found");
        normalizedError.code = "auth/user-not-found";
      }

      console.error("Login failed:", normalizedError);
      this.showNotification(
        this.getFriendlyAuthError(
          normalizedError.code,
          normalizedError.message
        ),
        "error"
      );
      throw normalizedError;
    } finally {
      this.hideLoader();
    }
  }

  async handleRegister(e) {
    e.preventDefault();

    const initialized = await this.ensureFirebaseInitialized();
    if (!initialized) {
        this.showNotification("Services are not ready. Please try again in a moment.", "error");
        return;
    }

    const password = document.getElementById("regPassword").value.trim();
    const passwordError = document.getElementById("passwordError");

    if (password.length < 6) {
      passwordError.classList.remove("hidden");
      return;
    }
    passwordError.classList.add("hidden");

    this.showLoader();

    const userData = {
      name: document.getElementById("regName").value.trim(),
      email: document.getElementById("regEmail").value.trim(),
      phone: document.getElementById("regPhone").value.trim(),
      address: document.getElementById("regAddress").value.trim(),
      role: "customer",
    };

    let userCredential = null;
    try {
      const ready = await this.ensureFirebaseInitialized();
      if (!ready ||
          typeof this.auth?.createUserWithEmailAndPassword !== "function") {
        this.showNotification(
          "Service not ready yet. Please wait a moment and try again.",
          "error"
        );
        return;
      }

      userCredential =
        await this.auth.createUserWithEmailAndPassword(
          userData.email,
          password
        );
      
      console.log("Firebase Auth user created:", userCredential.user.uid);

      try {
        await this.createUserProfile(userCredential.user.uid, userData);
        console.log("Firestore user profile created successfully.");
      } catch (profileError) {
        console.error("Firestore profile creation failed, but auth user was created.", profileError);
        this.showNotification("Account created, but profile setup failed. Please contact support.", "warning");
        // The user is technically logged in, so we don't throw here.
        // The listenToAuthState will handle the missing profile.
      }

      this.showNotification(
        "Registration successful! You are now logged in.",
        "success"
      );
    } catch (error) {
      console.error("Registration failed:", error);
      if (userCredential?.user?.uid) {
        try {
          await this.auth.signOut();
        } catch (signOutError) {
          console.warn("Failed to sign out after registration error:", signOutError);
        }
      }
      this.showNotification(this.getFriendlyAuthError(error.code), "error");
    } finally {
      this.hideLoader();
    }
  }

  async logout() {
    this.showLoader();

    let didSignOut = false;

    try {
      if (this.auth?.signOut) {
        await this.auth.signOut();
        didSignOut = true;
      } else {
        console.warn("Firebase auth not ready; falling back to guest state logout");
        didSignOut = true;
      }
    } catch (error) {
      console.error("Logout failed", error);
      this.showNotification(
        "We couldn't sign you out. Please try again.",
        "error"
      );
    } finally {
      if (didSignOut) {
        this.currentUser = null;
        this.cart = [];
        this.updatePublicUIForGuest();
      }
      this.hideLoader();
    }
  }

  getFriendlyAuthError(errorCode, fallbackMessage) {
    switch (errorCode) {
      case "auth/password-mismatch":
      case "auth/wrong-password":
        return "Password doesn't match our records.";
      case "auth/user-not-found":
        return "No account was found for that email address.";
      case "auth/email-already-in-use":
        return "Email address is already registered";
      case "auth/weak-password":
        return "Password should be at least 6 characters";
      case "auth/invalid-email":
        return "Please enter a valid email address";
      case "auth/missing-password":
        return "Please enter your password.";
      case "auth/operation-not-allowed":
        return "Email/password auth is disabled or this domain isn't authorized in Firebase.";
      case "auth/unauthorized-domain":
        return "Add your development domain to Firebase Authentication > Settings > Authorized domains.";
      case "auth/admin-restricted-operation":
        return "This action is restricted. Check Firebase Authentication settings.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection";
      case "auth/service-unavailable":
        return "Authentication service is not ready yet. Please try again.";
      default:
        return (
          fallbackMessage || "Authentication failed. Please try again"
        );
    }
  }

  navigateTo(path, { replace = false } = {}) {
    if (!path) return;

    try {
      const targetUrl = new URL(path, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (
        currentUrl.pathname === targetUrl.pathname &&
        currentUrl.search === targetUrl.search
      ) {
        return;
      }

      if (replace && typeof window.location.replace === "function") {
        window.location.replace(targetUrl.href);
      } else {
        window.location.href = targetUrl.href;
      }
    } catch (error) {
      console.error("Failed to navigate to", path, error);
    }
  }

  async getUserProfile(uid) {
    if (!uid || !this.db) return null;

    try {
      if (
        typeof window.firebase?.doc === "function" &&
        typeof window.firebase?.getDoc === "function"
      ) {
        const docRef = window.firebase.doc(this.db, "users", uid);
        const snapshot = await window.firebase.getDoc(docRef);
        const exists =
          typeof snapshot.exists === "function"
            ? snapshot.exists()
            : snapshot.exists;
        return exists ? snapshot.data() : null;
      }

      const snapshot = await this.db.collection("users").doc(uid).get();
      return snapshot.exists ? snapshot.data() : null;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      throw error;
    }
  }

  async createUserProfile(uid, data = {}) {
    if (!uid || !this.db) return null;

    const timestamp = new Date().toISOString();
    const payload = {
      name: data.name?.trim() || "",
      email: data.email?.trim() || "",
      phone: data.phone?.trim() || "",
      address: data.address?.trim() || "",
      role: data.role || "customer",
      updatedAt: timestamp,
    };

    if (data.createdAt) {
      payload.createdAt = data.createdAt;
    } else {
      payload.createdAt = timestamp;
    }

    try {
      if (
        typeof window.firebase?.doc === "function" &&
        typeof window.firebase?.setDoc === "function"
      ) {
        const docRef = window.firebase.doc(this.db, "users", uid);
        await window.firebase.setDoc(docRef, payload, { merge: true });
      } else {
        await this.db
          .collection("users")
          .doc(uid)
          .set(payload, { merge: true });
      }
    } catch (error) {
      console.error("Failed to persist user profile:", error);
      throw error;
    }

    return payload;
  }

  isFirestorePermissionError(error) {
    if (!error) return false;
    const code = error.code || error?.status || "";
    const message = typeof error.message === "string" ? error.message : "";
    return (
      code === "permission-denied" ||
      /Missing or insufficient permissions/i.test(message)
    );
  }

  getDefaultProfileForUser(user) {
    if (!user) {
      return {
        name: "Customer",
        email: "",
        phone: "",
        address: "",
        role: "customer",
      };
    }

    return {
      name:
        user.displayName ||
        (user.email ? user.email.split("@")[0] : "Customer"),
      email: user.email || "",
      phone: "",
      address: "",
      role: "customer",
    };
  }

  async recoverProfileAfterReadFailure(user, error) {
    if (!user) return null;

    if (this.isFirestorePermissionError(error)) {
      console.warn(
        "Firestore denied profile read. Attempting to seed a default profile.",
        error
      );
      const fallbackProfile = this.getDefaultProfileForUser(user);
      try {
        await this.createUserProfile(user.uid, fallbackProfile);
        this.showNotification(
          "Created a basic profile, but Firestore is blocking profile reads. Update your security rules (see FIREBASE_SETUP.md).",
          "warning"
        );
        return fallbackProfile;
      } catch (writeError) {
        console.error(
          "Failed to create fallback profile after permission error:",
          writeError
        );
        this.showNotification(
          "Your account exists, but Firestore denied profile access. Update database rules and try again.",
          "error"
        );
        return null;
      }
    }

    this.showNotification(
      "Cannot access your profile right now. Please try again later.",
      "error"
    );
    return null;
  }

  // UI Management methods
  updatePublicUIForUser() {
    if (!this.currentUser) return;

    const publicLogoutBtn = document.getElementById("publicLogoutBtn");
    if (publicLogoutBtn) publicLogoutBtn.classList.remove("hidden");

    const navMessagesBtn = document.getElementById("navMessagesBtn");
    if (navMessagesBtn) navMessagesBtn.classList.remove("hidden");

    this.configureNavAuthForUser();

    if (typeof this.refreshNotificationToggle === "function") {
      this.refreshNotificationToggle();
    }

    const userInfo = document.getElementById("userInfo");
    if (userInfo) {
      userInfo.classList.remove("hidden");
    }

    const publicUserName = document.getElementById("publicUserName");
    if (publicUserName) {
      publicUserName.textContent = this.currentUser.name;
    }

    const scheduledName = document.getElementById("scheduled-name");
    if (scheduledName) scheduledName.value = this.currentUser.name;

    const scheduledPhone = document.getElementById("scheduled-phone");
    if (scheduledPhone) scheduledPhone.value = this.currentUser.phone;

    const scheduledAddress = document.getElementById("scheduled-address");
    if (scheduledAddress) scheduledAddress.value = this.currentUser.address;
  }

  updatePublicUIForGuest() {
    const publicLogoutBtn = document.getElementById("publicLogoutBtn");
    if (publicLogoutBtn) publicLogoutBtn.classList.add("hidden");

    const userInfo = document.getElementById("userInfo");
    if (userInfo) userInfo.classList.add("hidden");

    const navMessagesBtn = document.getElementById("navMessagesBtn");
    if (navMessagesBtn) navMessagesBtn.classList.add("hidden");

    this.configureNavAuthForGuest();

    if (typeof this.refreshNotificationToggle === "function") {
      this.refreshNotificationToggle();
    }

    const orderForm = document.getElementById("scheduled-order-form");
    if (orderForm) orderForm.reset();

    const scheduledName = document.getElementById("scheduled-name");
    if (scheduledName) scheduledName.value = "";

    const scheduledPhone = document.getElementById("scheduled-phone");
    if (scheduledPhone) scheduledPhone.value = "";

    const scheduledAddress = document.getElementById("scheduled-address");
    if (scheduledAddress) scheduledAddress.value = "";
  }

  configureNavAuthForUser() {
    const navAuthBtn = document.getElementById("navAuthBtn");
    if (!navAuthBtn) {
      return;
    }

    const loginHref =
      navAuthBtn.dataset.loginHref ||
      navAuthBtn.getAttribute("data-login-href") ||
      navAuthBtn.getAttribute("href") ||
      "login.html";

    navAuthBtn.dataset.loginHref = loginHref;

    if (this.navAuthLogoutHandler) {
      navAuthBtn.removeEventListener("click", this.navAuthLogoutHandler);
    }

    navAuthBtn.textContent = "Logout";
    navAuthBtn.classList.remove("hidden");
    navAuthBtn.setAttribute("href", "#logout");
    navAuthBtn.setAttribute("role", "button");
    navAuthBtn.setAttribute("aria-label", "Log out");
    navAuthBtn.removeAttribute("aria-current");

    this.navAuthLogoutHandler = (event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      this.logout();
    };

    navAuthBtn.addEventListener("click", this.navAuthLogoutHandler);
  }

  configureNavAuthForGuest() {
    const navAuthBtn = document.getElementById("navAuthBtn");
    if (!navAuthBtn) {
      return;
    }

    if (this.navAuthLogoutHandler) {
      navAuthBtn.removeEventListener("click", this.navAuthLogoutHandler);
      this.navAuthLogoutHandler = null;
    }

    const loginHref =
      navAuthBtn.dataset.loginHref ||
      navAuthBtn.getAttribute("data-login-href") ||
      navAuthBtn.getAttribute("href") ||
      "login.html";

    navAuthBtn.dataset.loginHref = loginHref;
    navAuthBtn.setAttribute("href", loginHref);
    navAuthBtn.textContent = "Login";
    navAuthBtn.classList.remove("hidden");
    navAuthBtn.removeAttribute("role");
    navAuthBtn.setAttribute("aria-label", "Log in");

    if (document.body?.dataset?.page === "login") {
      navAuthBtn.setAttribute("aria-current", "page");
    } else {
      navAuthBtn.removeAttribute("aria-current");
    }
  }

  showScreen(screenId) {
    const targetScreen = document.getElementById(screenId);
    if (!targetScreen) {
      return;
    }

    const scope =
      targetScreen.closest("[data-screen-group]") || document;

    scope
      .querySelectorAll(".screen")
      .forEach((screen) => {
        screen.classList.toggle("hidden", screen !== targetScreen);
      });

    targetScreen.classList.remove("hidden");

    if (screenId === "adminScreen") {
      const activeTab = document.querySelector(
        ".admin-tabs .tab-btn.active"
      );
      if (activeTab && activeTab.dataset.tab === "messages") {
        this.startConversationsListener?.();
      }
    }

    if (screenId === "customerScreen") {
      this.startCustomerChat?.();
    }
  }

  // Event Listeners
  setupEventListeners() {
    const navMessagesBtn = document.getElementById("navMessagesBtn");
    if (navMessagesBtn)
      navMessagesBtn.addEventListener("click", (event) => {
        if (document.getElementById("customerScreen")) {
          if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
          }
          this.showScreen("customerScreen");
        } else {
          const target = new URL("customer/account.html", window.location.href);
          window.location.href = target.toString();
        }
      });
    const enableNotificationsBtn = document.getElementById(
      "enableNotificationsBtn"
    );
    if (enableNotificationsBtn)
      enableNotificationsBtn.addEventListener("click", () =>
        this.handleNotificationOptIn()
      );

    const installAppBtn = document.getElementById("installAppBtn");
    if (installAppBtn) {
      installAppBtn.addEventListener("click", () =>
        this.triggerInstallPrompt()
      );
    }

    const dismissInstallBanner = document.getElementById(
      "dismissInstallBanner"
    );
    if (dismissInstallBanner) {
      dismissInstallBanner.addEventListener("click", () =>
        this.dismissInstallPrompt(true)
      );
    }
    this.setupLogoutButtons();
    this.setupAdminListeners();
    this.setupModalListeners();
    this.setupPublicLanding();
    this.setupChatListeners();
  }

  setupLogoutButtons() {
    const logoutButtonIds = [
      "logoutBtn",
      "publicLogoutBtn",
      "headerLogoutBtn",
      "adminLogoutBtn",
      "adminMenuLogoutBtn",
      "adminReportsLogoutBtn",
      "adminMessagingLogoutBtn",
    ];

    logoutButtonIds.forEach((id) => {
      const button = document.getElementById(id);
      if (!button || button.dataset.boundLogout === "true") {
        return;
      }

      button.addEventListener("click", () => this.logout());
      button.dataset.boundLogout = "true";
    });
  }

  setupAdminListeners() {
    const isAdminContext = Boolean(
      document.body?.dataset?.adminPage ||
        document.getElementById("adminScreen")
    );

    if (!isAdminContext) {
      return;
    }

    document
      .querySelectorAll(".admin-tabs .tab-btn")
      .forEach((btn) => {
        const targetTab = btn.dataset.tab;
        if (!targetTab) return;
        btn.addEventListener("click", () => this.switchTab(targetTab));
      });

    const orderDateFilter = document.getElementById("orderDateFilter");
    if (orderDateFilter) {
      orderDateFilter.addEventListener("change", () =>
        this.filterAndDisplayOrders(this.allOrders)
      );
    }

    const orderStatusFilter = document.getElementById("orderStatusFilter");
    if (orderStatusFilter) {
      orderStatusFilter.addEventListener("change", () =>
        this.filterAndDisplayOrders(this.allOrders)
      );
    }

    const addMenuItemBtn = document.getElementById("addMenuItemBtn");
    if (addMenuItemBtn) {
      addMenuItemBtn.addEventListener("click", () =>
        this.showMenuItemModal()
      );
    }

    const menuDate = document.getElementById("menuDate");
    if (menuDate) {
      menuDate.addEventListener("change", () => this.loadMenuItems());
    }

    const menuTimeSlot = document.getElementById("menuTimeSlot");
    if (menuTimeSlot) {
      menuTimeSlot.addEventListener("change", () => this.loadMenuItems());
      menuTimeSlot.innerHTML =
        '<option value="">Select time slot</option>' +
        this.timeSlots
          .map((slot) => `<option value="${slot.id}">${slot.name}</option>`)
          .join("");
    }

    const menuItemForm = document.getElementById("menuItemForm");
    if (menuItemForm) {
      menuItemForm.addEventListener("submit", (e) => this.saveMenuItem(e));
    }

    const setCapacityBtn = document.getElementById("setCapacityBtn");
    if (setCapacityBtn) {
      setCapacityBtn.addEventListener("click", () =>
        this.showCapacityModal()
      );
    }

    const capacityDate = document.getElementById("capacityDate");
    if (capacityDate) {
      capacityDate.addEventListener("change", () =>
        this.loadCapacitySettings()
      );
    }

    const capacityForm = document.getElementById("capacityForm");
    if (capacityForm) {
      capacityForm.addEventListener("submit", (e) => this.saveCapacity(e));
    }
  }

  setupModalListeners() {
    document
      .querySelectorAll(".modal-close, .modal-cancel")
      .forEach((btn) =>
        btn.addEventListener("click", () => this.closeModals())
      );

    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) this.closeModals();
    });
  }

  // Messaging listeners for admin and customer chat inputs
  setupChatListeners() {
    const adminChatForm = document.getElementById("chatForm");
    if (adminChatForm) {
      adminChatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("chatInput");
        const text = (input.value || "").trim();
        if (!text || !this.activeConversation) return;
        this.sendMessage(this.activeConversation.userId, text, "admin");
        input.value = "";
      });
    }

    const customerForm = document.getElementById("customerChatForm");
    if (customerForm) {
      customerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("customerChatInput");
        const text = (input.value || "").trim();
        if (!text || !this.currentUser) return;
        this.sendMessage(this.currentUser.uid, text, "customer");
        input.value = "";
      });
    }
  }

  // Public landing page functionality
  setupPublicLanding() {
    if (document.getElementById("scheduled-order-form")) {
      this.setupOrderingSystem();
    }
  }

  setMinDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const minDate = tomorrow.toISOString().split("T")[0];

    const deliveryDate = document.getElementById("delivery-date");
    if (deliveryDate) {
      deliveryDate.min = minDate;
    }
  }

  setupOrderingSystem() {
    this.populateDeliveryDates();
    this.initializeOrderForm();
  }

  getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  async loadMenuForDateTime(date, timeSlot) {
    if (!date || !timeSlot || !this.db) return [];
    try {
      const q = window.firebase.query(
        window.firebase.collection(this.db, "menuItems"),
        window.firebase.where("date", "==", date),
        window.firebase.where("timeSlot", "==", timeSlot)
      );
      const snap = await window.firebase.getDocs(q);
      let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // If no admin-set items, add default menu
      if (items.length === 0) {
        const defaultMenu = {
          lunch: [
            {
              name: "Veg Thali",
              price: 100,
              description: "Complete meal with rice, dal, sabzi, roti",
            },
            {
              name: "Rajma Rice Bowl",
              price: 60,
              description: "Spicy rajma with steamed rice",
            },
            {
              name: "Aloo Paratha with Dahi",
              price: 50,
              description: "Fresh aloo paratha served with yogurt",
            },
          ],
          dinner: [
            {
              name: "Paneer Sabzi with Roti",
              price: 85,
              description: "Paneer curry with 2 rotis",
            },
            {
              name: "Chole Rice",
              price: 60,
              description: "Spicy chickpea curry with rice",
            },
            {
              name: "Mix Veg with Paratha",
              price: 75,
              description: "Mixed vegetables with butter paratha",
            },
          ],
        };
        items = defaultMenu[timeSlot] || [];
      }

      return items;
    } catch (e) {
      console.error("Error loading menu:", e);
      // Return default menu on error
      const defaultMenu = {
        lunch: [
          {
            name: "Veg Thali",
            price: 100,
            description: "Complete meal with rice, dal, sabzi, roti",
          },
          {
            name: "Rajma Rice Bowl",
            price: 60,
            description: "Spicy rajma with steamed rice",
          },
          {
            name: "Aloo Paratha with Dahi",
            price: 50,
            description: "Fresh aloo paratha served with yogurt",
          },
        ],
        dinner: [
          {
            name: "Paneer Sabzi with Roti",
            price: 85,
            description: "Paneer curry with 2 rotis",
          },
          {
            name: "Chole Rice",
            price: 60,
            description: "Spicy chickpea curry with rice",
          },
          {
            name: "Mix Veg with Paratha",
            price: 75,
            description: "Mixed vegetables with butter paratha",
          },
        ],
      };
      return defaultMenu[timeSlot] || [];
    }
  }

  populateDeliveryDates() {
    const deliveryDateSelect = document.getElementById("delivery-date");
    if (!deliveryDateSelect) return;

    // Clear existing options
    deliveryDateSelect.innerHTML =
      '<option value="">-- Select delivery date --</option>';

    // Add next 7 days
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dateDisplay = date.toLocaleDateString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const option = document.createElement("option");
      option.value = dateStr;
      option.textContent = dateDisplay;
      deliveryDateSelect.appendChild(option);
    }
  }

  initializeOrderForm() {
    const deliveryDateSelect = document.getElementById("delivery-date");
    const deliveryTimeSelect = document.getElementById("delivery-time");
    const menuOfTheDaySection = document.getElementById("menu-of-the-day");
    const dailyMenuItemsContainer = document.getElementById("daily-menu-items");
    const deliveryDetailsSection = document.getElementById("delivery-details");
    const form = document.getElementById("scheduled-order-form");
    const subtotalElement = document.getElementById("subtotal");
    const deliveryFeeElement = document.getElementById("delivery-fee");
    const totalElement = document.getElementById("total");
    const summaryItemsElement = document.getElementById("summary-items");
    const summaryLocationElement = document.getElementById("summary-location");

    const deliveryFee = 30;
  const app = this;

    // Populate time slots
    deliveryTimeSelect.innerHTML = '<option value="">-- Select delivery time slot --</option>';
    this.timeSlots.forEach(slot => {
      const option = document.createElement("option");
      option.value = slot.id;
      option.textContent = slot.name;
      deliveryTimeSelect.appendChild(option);
    });

    const hasSelectedItems = () => {
      return (
        dailyMenuItemsContainer.querySelectorAll(
          'input[type="checkbox"]:checked'
        ).length > 0
      );
    };

    const updateOrderSummary = () => {
      const selectedItems = dailyMenuItemsContainer.querySelectorAll(
        'input[type="checkbox"]:checked'
      );
      let subtotal = 0;
      let summaryHTML = "";

      selectedItems.forEach((item) => {
        const name = item.dataset.name;
        const price = parseInt(item.dataset.price);
        const qty =
          parseInt(
            item.closest(".menu-item").querySelector(".item-quantity").value
          ) || 1;
        const itemTotal = price * qty;
        subtotal += itemTotal;

        summaryHTML += `<div class="summary-item">${name} (x${qty}): Rs. ${itemTotal}</div>`;
      });

      summaryItemsElement.innerHTML =
        summaryHTML || '<div class="no-items">No items selected yet.</div>';
      subtotalElement.textContent = `Rs. ${subtotal}`;

      if (subtotal > 0) {
        totalElement.textContent = `Rs. ${subtotal + deliveryFee}`;
        deliveryFeeElement.textContent = `Rs. ${deliveryFee}`;
      } else {
        totalElement.textContent = "Rs. 0";
        deliveryFeeElement.textContent = "Rs. 0";
      }

      // Update location summary
      const address = document.getElementById("scheduled-address")?.value || "";
      if (address.trim()) {
        summaryLocationElement.innerHTML = `<strong>Delivery to:</strong> ${address.trim()}`;
      } else {
        summaryLocationElement.innerHTML = "";
      }
    };

    const renderMenu = async (date, time) => {
      dailyMenuItemsContainer.innerHTML = "";
      menuOfTheDaySection.classList.add("hidden");

      if (!date || !time) {
        updateOrderSummary();
        return;
      }

      const menuItems = await this.loadMenuForDateTime(date, time);
      if (!menuItems.length) {
        dailyMenuItemsContainer.innerHTML =
          '<p class="no-menu">No special daily menu available for this slot.</p>';
        menuOfTheDaySection.classList.remove("hidden");
        updateOrderSummary();
        return;
      }

      menuItems.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "menu-item";
        div.innerHTML = `
                    <input type="checkbox" id="item-${time}-${index}" data-name="${
          item.name
        }" data-price="${item.price}">
                    <label for="item-${time}-${index}">${item.name} - Rs. ${
          item.price
        }</label>
                    ${
                      item.description
                        ? `<p class="item-description">${item.description}</p>`
                        : ""
                    }
                    <div class="quantity-selector hidden">
                        <label for="qty-${time}-${index}">Quantity:</label>
                        <input type="number" id="qty-${time}-${index}" class="item-quantity" min="1" max="10" value="1">
                    </div>
                `;
        dailyMenuItemsContainer.appendChild(div);

        const checkbox = div.querySelector(`#item-${time}-${index}`);
        const qtySel = div.querySelector(".quantity-selector");
        const qtyInput = div.querySelector(".item-quantity");

        checkbox.addEventListener("change", function () {
          if (this.checked) {
            qtySel.classList.remove("hidden");
          } else {
            qtySel.classList.add("hidden");
            qtyInput.value = 1;
          }
          updateOrderSummary();
          deliveryDetailsSection.classList.toggle(
            "hidden",
            !hasSelectedItems()
          );
          app.triggerHaptic();
        });

        qtyInput.addEventListener("change", updateOrderSummary);
        qtyInput.addEventListener("input", updateOrderSummary);
      });

      menuOfTheDaySection.classList.remove("hidden");
      deliveryDetailsSection.classList.toggle("hidden", !hasSelectedItems());
      updateOrderSummary();
    };

    // Event listeners for form
    deliveryDateSelect.addEventListener("change", async function () {
      const selectedDate = this.value;
      const selectedTime = deliveryTimeSelect.value;

      if (selectedDate && selectedTime) {
        await renderMenu(selectedDate, selectedTime);
      } else if (selectedDate && !selectedTime) {
        menuOfTheDaySection.classList.add("hidden");
        dailyMenuItemsContainer.innerHTML = "";
        deliveryDetailsSection.classList.remove("hidden");
      } else {
        menuOfTheDaySection.classList.add("hidden");
        deliveryDetailsSection.classList.add("hidden");
        dailyMenuItemsContainer.innerHTML = "";
      }
      updateOrderSummary();
    });

    deliveryTimeSelect.addEventListener("change", async function () {
      const selectedTime = this.value;
      const selectedDate = deliveryDateSelect.value;

      if (selectedDate && selectedTime) {
        await renderMenu(selectedDate, selectedTime);
        deliveryDetailsSection.classList.remove("hidden");
      } else if (selectedDate && !selectedTime) {
        menuOfTheDaySection.classList.add("hidden");
        dailyMenuItemsContainer.innerHTML = "";
        deliveryDetailsSection.classList.remove("hidden");
      } else {
        menuOfTheDaySection.classList.add("hidden");
        dailyMenuItemsContainer.innerHTML = "";
      }
      updateOrderSummary();
    });

    // Live update address in summary
    const addrInput = document.getElementById("scheduled-address");
    if (addrInput) {
      addrInput.addEventListener("input", updateOrderSummary);
    }

    // Form submission
    form.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        const selectedDateValue = deliveryDateSelect.value;
        if (!selectedDateValue) {
          alert("Please select a delivery date.");
          return;
        }

        const selectedDailyMenuItems = dailyMenuItemsContainer.querySelectorAll(
          'input[type="checkbox"]:checked'
        );
        if (deliveryTimeSelect.value && selectedDailyMenuItems.length === 0) {
          alert(
            "Please select at least one menu item from the daily menu, or clear the time slot if ordering differently."
          );
          return;
        }

        if (selectedDailyMenuItems.length === 0) {
          alert("Please select at least one menu item to order.");
          return;
        }

        const orderItems = [];
        selectedDailyMenuItems.forEach((item) => {
          const name = item.dataset.name;
          const price = parseInt(item.dataset.price);
          const qty =
            parseInt(
              item.closest(".menu-item").querySelector(".item-quantity").value
            ) || 1;
          orderItems.push({ name, quantity: qty, price });
        });

        const orderDetails = {
          date: deliveryDateSelect.value,
          timeSlot: deliveryTimeSelect.value || "ASAP/General",
          customer: {
            name: document.getElementById("scheduled-name").value,
            phone: document.getElementById("scheduled-phone").value,
            address: document.getElementById("scheduled-address").value,
          },
          items: orderItems,
          instructions: document.getElementById("special-instructions").value,
          subtotal: subtotalElement.textContent,
          deliveryFee: deliveryFeeElement.textContent,
          total: totalElement.textContent,
          status: "Pending",
          timestamp: new Date().toISOString(),
          customerName: document.getElementById("scheduled-name").value,
          customerPhone: document.getElementById("scheduled-phone").value,
          customerAddress: document.getElementById("scheduled-address").value,
        };

        try {
          await window.firebase.addDoc(window.firebase.collection(this.db, "orders"), orderDetails);
          this.showNotification("Order placed successfully!", "success");
          this.triggerHaptic([40, 20, 40]);
        } catch (error) {
          console.error("Error placing order:", error);
          this.showNotification("Failed to place order. Please try again.", "error");
          return;
        }

        console.log("Order Details (public):", orderDetails);
        alert(
          `Your order for ${orderDetails.date} (${orderDetails.timeSlot}) has been placed! Total: ${orderDetails.total}.`
        );

        // Reset form
        form.reset();
        menuOfTheDaySection.classList.add("hidden");
        deliveryDetailsSection.classList.add("hidden");
        dailyMenuItemsContainer.innerHTML = "";
        deliveryTimeSelect.value = "";
        this.populateDeliveryDates();
        deliveryDateSelect.value = "";
        updateOrderSummary();
      }.bind(this)
    );

    // Initialize
    this.populateDeliveryDates();
    updateOrderSummary();
    menuOfTheDaySection.classList.add("hidden");
    deliveryDetailsSection.classList.add("hidden");
    this.setupOrderingGestures(menuOfTheDaySection, deliveryTimeSelect);
  }

  // Admin functionality
  async switchTab(tabId) {
    document
      .querySelectorAll(".tab-btn")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.remove("active"));

    document.querySelector(`[data-tab="${tabId}"]`).classList.add("active");
    document.getElementById(`${tabId}Tab`).classList.add("active");

    this.showLoader();

    switch (tabId) {
      case "orders":
        this.listenForOrders();
        break;
      case "menu":
        await this.loadMenuItems();
        break;
      case "capacity":
        await this.loadCapacitySettings();
        break;
      case "reports":
        await this.loadReports();
        break;
      case "messages":
        this.startConversationsListener?.();
        break;
    }

    this.hideLoader();
  }

  async loadAdminData() {
    this.listenForOrders();
    await this.populateOrderDateFilter();
  }

  listenForOrders() {
    if (this.unsubscribeOrders) this.unsubscribeOrders();

    const q = window.firebase.query(
      window.firebase.collection(this.db, "orders")
    );
    this.unsubscribeOrders = window.firebase.onSnapshot(
      q,
      (snapshot) => {
        this.allOrders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        this.filterAndDisplayOrders(this.allOrders);
      },
      (err) => {
        console.error(err);
        this.showNotification("Error fetching real-time orders.", "error");
      }
    );
  }

  filterAndDisplayOrders(orders) {
    const dateFilter = document.getElementById("orderDateFilter").value;
    const statusFilter = document.getElementById("orderStatusFilter").value;

    let filtered = [...orders];
    if (dateFilter) filtered = filtered.filter((o) => o.date === dateFilter);
    if (statusFilter)
      filtered = filtered.filter((o) => o.status === statusFilter);

    this.displayOrders(
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    );
  }

  displayOrders(orders) {
    const container = document.getElementById("ordersList");
    if (orders.length === 0) {
      container.innerHTML =
        '<div class="no-orders">No orders found matching the filters.</div>';
      return;
    }
    container.innerHTML = orders
      .map((order) => this.createOrderCardHTML(order))
      .join("");
  }

  createOrderCardHTML(order) {
    const timeSlotName = this.getTimeSlotName(order.timeSlot);
    const orderDate = new Date(order.date).toLocaleDateString();

    return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-id">Order #${order.id.slice(-6)}</div>
                    <div class="order-time">${new Date(
                      order.timestamp
                    ).toLocaleString()}</div>
                </div>

                <div class="order-customer">
                    <h4>${order.customerName}</h4>
                    <p>📞 ${order.customerPhone}</p>
                    <p>📍 ${order.customerAddress}</p>
                    <p>📅 ${orderDate} - ${timeSlotName}</p>
                </div>

                <div class="order-items">
                    <h5>Items:</h5>
                    <ul class="item-list">
                        ${order.items
                          .map(
                            (item) =>
                              `<li><span>${item.name} (x${
                                item.quantity
                              })</span> <span>Rs. ${
                                item.price * item.quantity
                              }</span></li>`
                          )
                          .join("")}
                    </ul>
                    ${
                      order.specialInstructions
                        ? `<p><strong>Notes:</strong> ${order.specialInstructions}</p>`
                        : ""
                    }
                </div>

                <div class="order-footer">
                    <div class="order-total">Total: ${order.total}</div>
                    <select class="status-selector" onchange="app.updateOrderStatus('${
                      order.id
                    }', this.value)">
                        ${this.orderStatuses
                          .map(
                            (status) =>
                              `<option value="${status}" ${
                                order.status === status ? "selected" : ""
                              }>${status}</option>`
                          )
                          .join("")}
                    </select>
                </div>
            </div>
        `;
  }

  getTimeSlotName(timeSlotId) {
    const slot = this.timeSlots.find((s) => s.id === timeSlotId);
    return slot ? `${slot.name} (${slot.time})` : timeSlotId;
  }

  async updateOrderStatus(orderId, newStatus) {
    try {
      const orderRef = window.firebase.doc(this.db, "orders", orderId);
      await window.firebase.updateDoc(orderRef, { status: newStatus });
      this.showNotification(`Order status updated to ${newStatus}`, "success");
    } catch (error) {
      console.error("Error updating order status:", error);
      this.showNotification("Failed to update order status", "error");
    }
  }

  async populateOrderDateFilter() {
    // Implementation for populating date filter
  }

  async loadMenuItems() {
    const date = document.getElementById("menuDate").value;
    const timeSlot = document.getElementById("menuTimeSlot").value;
    const container = document.getElementById("menuItemsList");

    if (!date || !timeSlot) {
      container.innerHTML = "<p>Select date and time slot to view menu items.</p>";
      return;
    }

    const items = await this.loadMenuForDateTime(date, timeSlot);
    if (!items.length) {
      container.innerHTML = "<p>No menu items for this date and time slot.</p>";
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="menu-item-card">
        <div class="menu-item-info">
          <h4>${item.name}</h4>
          <p>${item.description || ''}</p>
        </div>
        <div class="menu-item-price">Rs. ${item.price}</div>
        <div class="menu-item-actions">
          <button onclick="app.deleteMenuItem('${item.id}')">Delete</button>
        </div>
      </div>
    `).join("");
  }

  async loadCapacitySettings() {
    // Implementation for loading capacity settings
  }
  async loadReports() {
    // Implementation for loading reports
  }

  showMenuItemModal() {
    document.getElementById("menuItemModal").classList.remove("hidden");
  }

  showCapacityModal() {
    document.getElementById("capacityModal").classList.remove("hidden");
  }

  async saveMenuItem(e) {
    e.preventDefault();
    const date = document.getElementById("menuDate").value;
    const timeSlot = document.getElementById("menuTimeSlot").value;
    const name = document.getElementById("itemName").value.trim();
    const price = parseInt(document.getElementById("itemPrice").value);
    const description = document.getElementById("itemDescription").value.trim();

    if (!date || !timeSlot || !name || isNaN(price)) {
      this.showNotification("Please fill all required fields.", "error");
      return;
    }

    try {
      await window.firebase.addDoc(window.firebase.collection(this.db, "menuItems"), {
        date, timeSlot, name, price, description
      });
      this.showNotification("Menu item added successfully.", "success");
      document.getElementById("menuItemForm").reset();
      this.loadMenuItems();
    } catch (error) {
      console.error("Error saving menu item:", error);
      this.showNotification("Failed to save menu item.", "error");
    }
    this.closeModals();
  }

  async deleteMenuItem(id) {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    try {
      await window.firebase.deleteDoc(window.firebase.doc(this.db, "menuItems", id));
      this.showNotification("Menu item deleted.", "success");
      this.loadMenuItems();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      this.showNotification("Failed to delete menu item.", "error");
    }
  }

  async saveCapacity(e) {
    e.preventDefault();
    // Implementation for saving capacity
    this.closeModals();
  }

  closeModals() {
    document
      .querySelectorAll(".modal")
      .forEach((modal) => modal.classList.add("hidden"));
  }

  detachListeners() {
    if (this.unsubscribeOrders) {
      this.unsubscribeOrders();
      this.unsubscribeOrders = null;
    }
    if (this.unsubscribeCustomerOrders) {
      this.unsubscribeCustomerOrders();
      this.unsubscribeCustomerOrders = null;
    }
    if (this.unsubscribeConversations) {
      try {
        this.unsubscribeConversations();
      } catch (_) {}
      this.unsubscribeConversations = null;
    }
    if (this.unsubscribeChat) {
      try {
        this.unsubscribeChat();
      } catch (_) {}
      this.unsubscribeChat = null;
    }
  }

  async registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers are not supported in this browser.");
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register("sw.js", {
        scope: "./",
      });
      this.serviceWorkerRegistration = registration;

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;
        installingWorker.addEventListener("statechange", () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            this.showNotification(
              "Home-Coming was updated. Refresh for the latest treats!",
              "info"
            );
          }
        });
      });

      return registration;
    } catch (error) {
      console.error("Service worker registration failed:", error);
      return null;
    }
  }

  setupPWAEventListeners() {
    if (this.pwaListenersAttached) return;

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      this.installPromptEvent = event;
      if (this.shouldShowInstallPrompt()) {
        this.showInstallPrompt();
      }
    });

    window.addEventListener("appinstalled", () => {
      this.installPromptEvent = null;
      this.dismissInstallPrompt();
      localStorage.removeItem("hc-install-dismissed-until");
      this.showNotification(
        "App installed! Launch it anytime from your home screen.",
        "success"
      );
    });

    window.addEventListener("online", () => this.updateOnlineStatus(true));
    window.addEventListener("offline", () => this.updateOnlineStatus(false));

    this.pwaListenersAttached = true;
  }

  shouldShowInstallPrompt() {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return false;
    }
    const snoozeUntil = Number(
      localStorage.getItem("hc-install-dismissed-until") || 0
    );
    return Date.now() > snoozeUntil;
  }

  showInstallPrompt() {
    const banner = document.getElementById("installPromptBanner");
    if (!banner || !this.installPromptEvent) return;
    banner.classList.remove("hidden");
  }

  triggerInstallPrompt() {
    if (!this.installPromptEvent) {
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        this.showNotification("Install prompt is not ready yet.", "info");
      }
      return;
    }

    this.installPromptEvent.prompt();
    this.installPromptEvent.userChoice.finally(() => {
      this.installPromptEvent = null;
      this.dismissInstallPrompt();
    });
  }

  dismissInstallPrompt(snooze = false) {
    const banner = document.getElementById("installPromptBanner");
    banner?.classList.add("hidden");
    if (snooze) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(
        "hc-install-dismissed-until",
        String(Date.now() + sevenDays)
      );
    }
  }

  updateOnlineStatus(status = navigator.onLine) {
    this.isOnline = !!status;
    const indicator = document.getElementById("offlineIndicator");
    if (indicator) {
      indicator.classList.toggle("hidden", this.isOnline);
    }

    if (!this.isOnline && !this.offlineToastVisible) {
      this.showNotification(
        "You're offline. We'll queue orders until you're connected.",
        "warning"
      );
      this.offlineToastVisible = true;
    }

    if (this.isOnline) {
      this.offlineToastVisible = false;
    }
  }

  async handleNotificationOptIn() {
    if (!this.currentUser) {
      this.showNotification("Login to enable order updates.", "info");
      return;
    }

    if (!this.isMessagingSupported) {
      this.showNotification(
        "Push notifications are not supported on this device.",
        "error"
      );
      return;
    }

    if (!window.Notification) {
      this.showNotification("This browser does not support notifications.", "error");
      return;
    }

    const permission = await window.Notification.requestPermission();
    if (permission !== "granted") {
      this.showNotification("Notifications stay off for now.", "info");
      this.refreshNotificationToggle();
      return;
    }

    const button = document.getElementById("enableNotificationsBtn");
    button?.setAttribute("disabled", "true");
    try {
      const token = await this.requestMessagingToken();
      if (token) {
        await this.saveMessagingToken(token);
        this.showNotification("Notifications enabled!", "success");
      }
    } catch (error) {
      console.error("Unable to enable notifications:", error);
      this.showNotification(
        "Could not enable notifications. Try again later.",
        "error"
      );
    } finally {
      button?.removeAttribute("disabled");
      this.refreshNotificationToggle();
    }
  }

  async requestMessagingToken() {
    if (!("serviceWorker" in navigator)) {
      return null;
    }

    if (!this.messaging || !this.serviceWorkerRegistration) {
      await this.registerServiceWorker();
    }

    if (!this.messaging) return null;

    const vapidKey = window.firebaseConfig?.vapidKey;
    if (!vapidKey) {
      console.warn("Missing vapidKey in firebaseConfig; push tokens cannot be issued.");
      this.showNotification(
        "Notifications require configuration. Contact support.",
        "error"
      );
      return null;
    }

    let registration = this.serviceWorkerRegistration;
    if (!registration) {
      try {
        registration = await navigator.serviceWorker.ready;
      } catch (error) {
        console.error("Service worker not ready for messaging:", error);
        return null;
      }
    }

    return window.firebase.getToken(this.messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
  }

  async saveMessagingToken(token) {
    if (!this.currentUser || !token) return;
    const userDocRef = window.firebase.doc(
      this.db,
      "users",
      this.currentUser.uid
    );
    try {
      await window.firebase.setDoc(
        userDocRef,
        {
          notificationTokens: window.firebase.arrayUnion(token),
          notificationsEnabledAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to store notification token:", error);
    }
  }

  setupForegroundMessaging() {
    if (this.foregroundMessagingBound) return;
    if (!this.messaging || !this.isMessagingSupported) return;

    try {
      window.firebase.onMessage(this.messaging, (payload) => {
        const title = payload?.notification?.title || "Order update";
        const body = payload?.notification?.body || "We'll keep you posted.";
        this.triggerHaptic([15]);
        this.showNotification(`${title}: ${body}`, "info");
      });
      this.foregroundMessagingBound = true;
    } catch (error) {
      console.warn("Unable to attach foreground messaging listener:", error);
    }
  }

  refreshNotificationToggle() {
    const button = document.getElementById("enableNotificationsBtn");
    if (!button) return;
    const permission = window.Notification?.permission ?? "default";
    const shouldHide =
      permission === "granted" || !this.currentUser || !this.isMessagingSupported;
    button.classList.toggle("hidden", shouldHide);
    if (!shouldHide) {
      button.removeAttribute("disabled");
    }
  }

  triggerHaptic(pattern = [20]) {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (_) {
        /* noop */
      }
    }
  }

  setupOrderingGestures(menuSection, timeSlotSelect) {
    if (!menuSection || !timeSlotSelect) return;
    if (menuSection.dataset.swipeBound === "true") return;

    let startX = 0;
    let deltaX = 0;
    const threshold = 50;

    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      deltaX = 0;
    };

    const onTouchMove = (event) => {
      if (!startX) return;
      deltaX = event.touches[0].clientX - startX;
    };

    const onTouchEnd = () => {
      if (!startX) return;
      if (Math.abs(deltaX) > threshold) {
        const direction = deltaX > 0 ? -1 : 1;
        this.rotateTimeSlot(timeSlotSelect, direction);
      }
      startX = 0;
      deltaX = 0;
    };

    menuSection.addEventListener("touchstart", onTouchStart, { passive: true });
    menuSection.addEventListener("touchmove", onTouchMove, { passive: true });
    menuSection.addEventListener("touchend", onTouchEnd);
    menuSection.addEventListener("touchcancel", onTouchEnd);

    const existingHint = menuSection.nextElementSibling;
    if (!existingHint || !existingHint.classList.contains("swipe-hint")) {
      const hint = document.createElement("p");
      hint.className = "swipe-hint";
      hint.textContent = "Swipe left or right to switch lunch and dinner slots.";
      menuSection.insertAdjacentElement("afterend", hint);
    }

    menuSection.dataset.swipeBound = "true";
  }

  rotateTimeSlot(select, direction = 1) {
    if (!select) return;
    const options = Array.from(select.options).filter((opt) => opt.value);
    if (!options.length) return;

    const currentValue = select.value;
    let index = options.findIndex((opt) => opt.value === currentValue);
    if (index === -1) index = 0;
    index = (index + direction + options.length) % options.length;
    select.value = options[index].value;
    this.triggerHaptic([10]);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Utility methods
  showLoader() {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay) return;
    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
  }

  hideLoader() {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay) return;
    overlay.classList.add("hidden");
    overlay.style.display = "none";
  }

  showNotification(message, type = "info") {
    const notification = document.getElementById("notification");
    if (!notification) {
      const logger = type === "error" ? console.error : console.log;
      logger?.(`[${type.toUpperCase()}] ${message}`);
      return;
    }

    let messageElement = document.getElementById("notificationMessage");
    if (!messageElement) {
      messageElement = document.createElement("span");
      messageElement.id = "notificationMessage";
      messageElement.setAttribute("aria-live", "polite");
      notification.innerHTML = "";
      notification.appendChild(messageElement);
    }

    messageElement.textContent = message;
    notification.className = `notification notification--${type}`;
    notification.classList.add("show");

    if (this.notificationTimeout) {
      window.clearTimeout(this.notificationTimeout);
    }

    this.notificationTimeout = window.setTimeout(() => {
      notification.classList.remove("show");
    }, 5000);
  }

}

// Initialize the app
const app = new RestaurantApp();
window.app = app;

function setActiveNavLink(selector = "[data-nav]") {
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

function setActiveAdminNavLink(page) {
  if (!page) return;
  const target = page.replace(/\.html$/i, "");
  const navLinks = document.querySelectorAll("[data-admin-nav], .admin-nav a");
  navLinks.forEach((link) => {
    const section = link.getAttribute("data-admin-nav") || link.getAttribute("href");
    const normalized = section ? section.replace(/\.html$/i, "") : "";
    const isMatch = normalized?.includes(target);
    link.classList.toggle("active", Boolean(isMatch));
    if (isMatch) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function initLandingPage() {
  const orders = new Map();

  const orderStatuses = [
    { text: "Order Placed", step: 1 },
    { text: "Preparing Your Meal", step: 2 },
    { text: "Out for Delivery", step: 3 },
    { text: "Delivered", step: 4 },
  ];

  let trackingIntervalId = null;
  let trackingOrderId = null;

  const placeOrderForm = document.getElementById("place-order-form");
  const trackOrderForm = document.getElementById("track-order-form");
  const contactForm = document.getElementById("contact-form");
  const orderModal = document.getElementById("order-modal");
  const modalCloseButton = orderModal?.querySelector(".home-modal__close");
  const newOrderIdSpan = document.getElementById("new-order-id");
  const orderStatusContainer = document.getElementById("home-order-status");
  const currentStatusText = document.getElementById("home-current-status");
  const progressSteps = Array.from(
    document.querySelectorAll(".home-progress__step")
  );
  const trackErrorMessage = document.getElementById("home-track-error");
  const orderIdInput = document.getElementById("order-id-input");
  const dishSelect = document.getElementById("dish");
  const qtyInput = document.getElementById("qty");
  const addressInput = document.getElementById("address");
  const phoneInput = document.getElementById("phone");

  function populateDishOptions() {
    const menuTable = document.querySelector("#menu .home-menu-table");
    if (!menuTable || !dishSelect) return;

    const options = [];
    menuTable.querySelectorAll("tbody tr").forEach((row) => {
      if (row.classList.contains("home-menu-category")) return;
      const cell = row.querySelector("td");
      if (cell) {
        const label = cell.textContent?.trim();
        if (label) {
          options.push(label);
        }
      }
    });

    if (!options.length) return;

    dishSelect.innerHTML = options
      .map((item) => `<option value="${item}">${item}</option>`)
      .join("");
  }

  function generateOrderId() {
    return `HCCK${Math.floor(10000 + Math.random() * 90000)}`;
  }

  function openModal(orderId) {
    if (!orderModal || !newOrderIdSpan) return;
    newOrderIdSpan.textContent = orderId;
    orderModal.style.display = "block";
    orderModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!orderModal) return;
    orderModal.style.display = "none";
    orderModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function simulateOrderStatusUpdates(orderId) {
    const order = orders.get(orderId);
    if (!order) return;

    const scheduleUpdate = (statusIndex, delayMs) => {
      const timeoutId = window.setTimeout(() => {
        const current = orders.get(orderId);
        if (!current) return;
        current.statusIndex = Math.max(current.statusIndex, statusIndex);
        if (trackingOrderId === orderId) {
          updateTrackingUI(orderId);
        }
      }, delayMs);

      order.timeouts.push(timeoutId);
    };

    scheduleUpdate(1, 60 * 1000);
    scheduleUpdate(2, 5 * 60 * 1000);
    scheduleUpdate(3, 10 * 60 * 1000);
  }

  function resetProgressSteps() {
    progressSteps.forEach((step) => step.classList.remove("active"));
  }

  function updateTrackingUI(orderId) {
    const order = orders.get(orderId);
    if (!order || !currentStatusText) return;

    const currentStatus = orderStatuses[order.statusIndex];
    currentStatusText.textContent = currentStatus.text;

    progressSteps.forEach((stepEl, index) => {
      if (index < currentStatus.step) {
        stepEl.classList.add("active");
      } else {
        stepEl.classList.remove("active");
      }
    });

    if (order.statusIndex >= orderStatuses.length - 1 && trackingIntervalId) {
      window.clearInterval(trackingIntervalId);
      trackingIntervalId = null;
      trackingOrderId = null;
    }
  }

  function handlePlaceOrder(event) {
    event.preventDefault();
    if (!dishSelect || !qtyInput || !addressInput || !phoneInput) return;

    const dish = dishSelect.value;
    const qty = Number.parseInt(qtyInput.value, 10) || 1;
    const address = addressInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!dish || qty <= 0 || !address || !phone) {
      return;
    }

    const orderId = generateOrderId();

    orders.set(orderId, {
      statusIndex: 0,
      createdAt: Date.now(),
      timeouts: [],
    });

    simulateOrderStatusUpdates(orderId);
    openModal(orderId);

    placeOrderForm?.reset();
    if (qtyInput) qtyInput.value = "1";
    if (dishSelect?.options?.length) {
      dishSelect.selectedIndex = 0;
    }
  }

  function handleTrackOrder(event) {
    event.preventDefault();
    if (!orderIdInput) return;

    const orderId = orderIdInput.value.trim().toUpperCase();
    if (!orderId || !orders.has(orderId)) {
      if (orderStatusContainer) {
        orderStatusContainer.style.display = "none";
      }
      if (trackErrorMessage) {
        trackErrorMessage.style.display = "block";
      }
      return;
    }

    if (trackErrorMessage) {
      trackErrorMessage.style.display = "none";
    }

    if (orderStatusContainer) {
      orderStatusContainer.style.display = "block";
    }

    resetProgressSteps();
    trackingOrderId = orderId;
    updateTrackingUI(orderId);

    if (trackingIntervalId) {
      window.clearInterval(trackingIntervalId);
    }

    trackingIntervalId = window.setInterval(() => {
      updateTrackingUI(orderId);
    }, 5000);

    document.getElementById("track")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleContactForm(event) {
    event.preventDefault();
    if (!contactForm) return;

    let feedback = contactForm.nextElementSibling;
    if (!feedback || !feedback.classList.contains("home-form-note")) {
      feedback = document.createElement("p");
      feedback.className = "home-form-note";
      feedback.setAttribute("aria-live", "polite");
      contactForm.insertAdjacentElement("afterend", feedback);
    }

    feedback.textContent = "Thanks for reaching out! We'll get back to you shortly.";
    feedback.classList.remove("error");
    contactForm.reset();
  }

  function initModalListeners() {
    if (!orderModal) return;

    modalCloseButton?.addEventListener("click", closeModal);

    window.addEventListener("click", (event) => {
      if (event.target === orderModal) {
        closeModal();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && orderModal.style.display === "block") {
        closeModal();
      }
    });
  }

  function cleanupOnUnload() {
    window.addEventListener("beforeunload", () => {
      orders.forEach((order) => {
        order.timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      });
      if (trackingIntervalId) {
        window.clearInterval(trackingIntervalId);
      }
    });
  }

  populateDishOptions();

  if (placeOrderForm) {
    placeOrderForm.addEventListener("submit", handlePlaceOrder);
  }

  if (trackOrderForm) {
    trackOrderForm.addEventListener("submit", handleTrackOrder);
  }

  if (contactForm) {
    contactForm.addEventListener("submit", handleContactForm);
  }

  initModalListeners();
  cleanupOnUnload();
}

function attachBusyOnChange(element, duration = 400) {
  if (!element) return;
  element.addEventListener("change", () => {
    element.setAttribute("aria-busy", "true");
    window.setTimeout(() => {
      element.removeAttribute("aria-busy");
    }, duration);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const navSelector = document.body?.dataset?.navSelector;
  setActiveNavLink(navSelector || "[data-nav]");

  const adminPage = document.body?.dataset?.adminPage;
  if (adminPage) {
    setActiveAdminNavLink(adminPage);
  }

  const page = document.body?.dataset?.page;
  if (page === "landing") {
    initLandingPage();
  }

  if (page === "customer-account") {
    const accountMessage = document.getElementById("customerMessage");
    accountMessage?.addEventListener("focus", () => {
      accountMessage.setAttribute("data-touched", "true");
    });
  }

  if (page === "admin-dashboard") {
    setActiveAdminNavLink("dashboard");
    attachBusyOnChange(document.getElementById("snapshotRange"));
  }

  if (page === "admin-menu") {
    setActiveAdminNavLink("menu-management");
    attachBusyOnChange(document.getElementById("menuFilter"));
  }

  if (page === "admin-reports") {
    setActiveAdminNavLink("reports");
    attachBusyOnChange(document.getElementById("reportRange"));
  }

  if (page === "admin-messaging") {
    setActiveAdminNavLink("messaging");
    const chatForm = document.querySelector(".chat-input-row");
    if (chatForm) {
      chatForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const messageField = chatForm.querySelector("textarea");
        const value = messageField?.value?.trim();
        if (!value) return;

        const history = document.querySelector(".chat-messages");
        if (history) {
          const bubble = document.createElement("div");
          bubble.className = "msg me";
          bubble.innerHTML = `<p>${value}</p><span class="meta">Just now</span>`;
          history.appendChild(bubble);
          history.scrollTop = history.scrollHeight;
        }

        if (messageField) {
          messageField.value = "";
        }
      });
    }
  }
});
