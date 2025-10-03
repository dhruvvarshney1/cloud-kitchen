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

    this.timeSlots = [
      { id: "lunch", name: "Lunch", time: "13:00 - 14:00" },
      { id: "dinner", name: "Dinner", time: "19:00 - 20:00" },
    ];

    this.orderStatuses = [
      "Pending",
      "Confirmed",
      "Preparing",
      "Ready",
      "Delivered",
    ];

    this.defaultCapacity = {
      lunch: 50,
      dinner: 40,
    };

    this.installPromptEvent = null;
    this.serviceWorkerRegistration = null;
    this.messaging = null;
    this.isMessagingSupported = false;
    this.isOnline = navigator.onLine;
    this.foregroundMessagingBound = false;
    this.pwaListenersAttached = false;
    this.offlineToastVisible = false;
    this.themeMediaListener = null;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initialize());
    } else {
      this.initialize();
    }
  }

  async initialize() {
    console.log("Home-Coming App Initializing...");
    this.setupThemeToggle();
    this.setupEventListeners();
    this.setMinDate();
    if (document.getElementById("publicScreen")) {
      this.showScreen("publicScreen");
    } else if (document.getElementById("loginScreen")) {
      this.showScreen("loginScreen");
    }
    this.detectHostingEnvironment();
    this.setupPWAEventListeners();
    this.updateOnlineStatus();

    try {
      console.log("Checking for Firebase config...");
      if (
        !window.firebaseConfig ||
        !window.firebaseConfig.apiKey.startsWith("AIzaSy")
      ) {
        this.showNotification(
          "Firebase config is missing or invalid.",
          "error"
        );
        console.error("Firebase config is missing or invalid.");
        return;
      }

      console.log("Firebase config found. Waiting for Firebase SDK...");
      const ready = this.waitForFirebase(5000);
      if (!ready) {
        this.showNotification(
          "Could not load SDK. Refresh the page or check your network.",
          "error"
        );
        return;
      }

      console.log("Firebase SDK ready. Initializing Firebase app...");
      const app = window.firebase.initializeApp(window.firebaseConfig);
      this.auth = window.firebase.getAuth(app);
      this.db = window.firebase.getFirestore(app);

      if (window.firebase.isMessagingSupported) {
        try {
          this.isMessagingSupported = await window.firebase
            .isMessagingSupported()
            .catch(() => false);
          if (this.isMessagingSupported) {
            this.messaging = window.firebase.getMessaging(app);
          }
        } catch (messagingError) {
          console.warn("Messaging not supported on this browser.", messagingError);
          this.isMessagingSupported = false;
        }
      }

  await this.registerServiceWorker();
  this.setupForegroundMessaging();
      this.refreshNotificationToggle();

      console.log(
        "Firebase app initialized successfully. Setting up auth listener..."
      );
      this.listenToAuthState();
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      this.showNotification("Could not connect to the service.", "error");
    }
  }

  // Firebase helper methods
  waitForFirebase(timeout = 5000) {
    const start = Date.now();
    while (!window.firebase && Date.now() - start < timeout) {
      // Busy wait for Firebase to load
    }
    return !!window.firebase;
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
  listenToAuthState() {
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

    window.firebase.onAuthStateChanged(this.auth, async (user) => {
      clearTimeout(authTimeout);
      console.log("Auth state changed. User object:", user);

      if (user) {
        let userProfile;
        try {
          userProfile = await this.getUserProfile(user.uid);
        } catch (e) {
          console.error("Error fetching user profile (permissions?):", e);
          this.showNotification(
            "Cannot access your profile. Check database permissions.",
            "error"
          );
          await this.logout();
          this.hideLoader();
          return;
        }

        console.log("User profile fetched:", userProfile);

        if (!userProfile) {
          try {
            const defaultProfile = {
              name:
                user.displayName ||
                (user.email ? user.email.split("@")[0] : "Customer"),
              email: user.email || "",
              phone: "",
              address: "",
              role: "customer",
            };
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

        if (this.currentUser.role === "admin") {
          console.log("User is admin. Loading admin screen.");
          this.showScreen("adminScreen");
          await this.loadAdminData();
          this.startConversationsListener?.();
        } else {
          console.log("User is a customer. Showing public screen.");
          this.showScreen("publicScreen");
          this.updatePublicUIForUser();
        }
      } else {
        this.currentUser = null;
        this.detachListeners();
        console.log("No user is logged in. Showing public landing.");
        this.showScreen("publicScreen");
        this.updatePublicUIForGuest();
      }

      this.hideLoader();
      console.log("Auth state callback finished.");
    });
  }

  async handleLogin(e) {
    e.preventDefault();
    this.showLoader();

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const email = usernameInput ? usernameInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value.trim() : "";

    try {
      if (!this.auth) {
        this.showNotification(
          "Service not ready yet. Please wait a moment and try again.",
          "error"
        );
        this.hideLoader();
        return;
      }
      await window.firebase.signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
    } catch (error) {
      this.showNotification(this.getFriendlyAuthError(error.code), "error");
      this.hideLoader();
    }
  }

  async handleRegister(e) {
    e.preventDefault();

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

    try {
      const userCredential =
        await window.firebase.createUserWithEmailAndPassword(
          this.auth,
          userData.email,
          password
        );
      await this.createUserProfile(userCredential.user.uid, userData);
      this.showNotification(
        "Registration successful! You are now logged in.",
        "success"
      );
    } catch (error) {
      this.showNotification(this.getFriendlyAuthError(error.code), "error");
      this.hideLoader();
    }
  }

  async logout() {
    this.showLoader();
    await window.firebase.signOut(this.auth);
    this.cart = [];
    this.hideLoader();
  }

  getFriendlyAuthError(errorCode) {
    switch (errorCode) {
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Invalid email or password";
      case "auth/email-already-in-use":
        return "Email address is already registered";
      case "auth/weak-password":
        return "Password should be at least 6 characters";
      case "auth/invalid-email":
        return "Please enter a valid email address";
      case "auth/network-request-failed":
        return "Network error. Please check your connection";
      default:
        return "Authentication failed. Please try again";
    }
  }

  // UI Management methods
  updatePublicUIForUser() {
    if (!this.currentUser) return;

    const navLoginBtn = document.getElementById("navLoginBtn");
    if (navLoginBtn) navLoginBtn.classList.add("hidden");

    const publicLogoutBtn = document.getElementById("publicLogoutBtn");
    if (publicLogoutBtn) publicLogoutBtn.classList.remove("hidden");

    const navMessagesBtn = document.getElementById("navMessagesBtn");
    if (navMessagesBtn) navMessagesBtn.classList.remove("hidden");

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
    const navLoginBtn = document.getElementById("navLoginBtn");
    if (navLoginBtn) navLoginBtn.classList.remove("hidden");

    const publicLogoutBtn = document.getElementById("publicLogoutBtn");
    if (publicLogoutBtn) publicLogoutBtn.classList.add("hidden");

    const userInfo = document.getElementById("userInfo");
    if (userInfo) userInfo.classList.add("hidden");

    const navMessagesBtn = document.getElementById("navMessagesBtn");
    if (navMessagesBtn) navMessagesBtn.classList.add("hidden");

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

  showScreen(screenId) {
    const screens = document.querySelectorAll(".screen");
    if (screens.length) {
      screens.forEach((screen) => screen.classList.add("hidden"));
    }

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
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
  }

  // Event Listeners
  setupEventListeners() {
    const navLoginBtn = document.getElementById("navLoginBtn");
    if (navLoginBtn)
      navLoginBtn.addEventListener("click", (event) => {
        if (document.getElementById("loginScreen")) {
          if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
          }
          this.showScreen("loginScreen");
        } else {
          const target = new URL("login.html", window.location.href);
          window.location.href = target.toString();
        }
      });
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

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }

    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      registerForm.addEventListener("submit", (e) =>
        this.handleRegister(e)
      );
    }

    const showRegisterBtn = document.getElementById("showRegisterBtn");
    if (showRegisterBtn) {
      showRegisterBtn.addEventListener("click", () =>
        this.showScreen("registerScreen")
      );
    }

    const showLoginBtn = document.getElementById("showLoginBtn");
    if (showLoginBtn) {
      showLoginBtn.addEventListener("click", () =>
        this.showScreen("loginScreen")
      );
    }

    this.setupLogoutButtons();
    this.setupAdminListeners();
    this.setupModalListeners();
    this.setupPublicLanding();
    this.setupChatListeners();
  }

  setupLogoutButtons() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.logout());
    }

    const publicLogoutBtn = document.getElementById("publicLogoutBtn");
    if (publicLogoutBtn) {
      publicLogoutBtn.addEventListener("click", () => this.logout());
    }
  }

  setupAdminListeners() {
    const adminScreen = document.getElementById("adminScreen");
    if (!adminScreen) {
      return;
    }

    adminScreen
      .querySelectorAll(".tab-btn")
      .forEach((btn) =>
        btn.addEventListener("click", (e) =>
          this.switchTab(e.target.dataset.tab)
        )
      );

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
    document.getElementById("loadingOverlay").classList.remove("hidden");
  }

  hideLoader() {
    document.getElementById("loadingOverlay").classList.add("hidden");
  }

  showNotification(message, type = "info") {
    const notification = document.getElementById("notification");
    const messageElement = document.getElementById("notificationMessage");

    messageElement.textContent = message;
    notification.className = `notification notification--${type}`;
    notification.classList.add("show");

    setTimeout(() => {
      notification.classList.remove("show");
    }, 5000);
  }

  // ========== Messaging (Admin) ==========
  startConversationsListener() {
    if (!this.db) return;
    if (this.unsubscribeConversations) this.unsubscribeConversations();
    const convRef = window.firebase.collection(this.db, "conversations");
    const q = window.firebase.query(convRef);
    this.unsubscribeConversations = window.firebase.onSnapshot(
      q,
      (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        this.renderConversations(list);
      },
      (err) => {
        console.error("Conversations listener error", err);
        this.showNotification("Error loading conversations", "error");
      }
    );
  }

  renderConversations(conversations) {
    const ul = document.getElementById("conversationsList");
    if (!ul) return;
    if (!conversations.length) {
      ul.innerHTML = "<li>No conversations yet</li>";
      const header = document.getElementById("chatHeader");
      const msgs = document.getElementById("chatMessages");
      if (header) header.textContent = "Select a conversation";
      if (msgs) msgs.innerHTML = "";
      return;
    }
    ul.innerHTML = conversations
      .map(
        (c) => `
                <li data-id="${c.id}" data-user="${c.userId || c.id}" class="${
          this.activeConversation && this.activeConversation.id === c.id
            ? "active"
            : ""
        }">
                    <strong>${cSan(
                      c.userName || c.userEmail || c.userId || c.id
                    )}</strong><br/>
                    <span style="font-size:12px; color:var(--color-text-secondary);">${cSan(
                      c.lastMessage || ""
                    )}</span>
                </li>`
      )
      .join("");
    [...ul.querySelectorAll("li")].forEach((li) => {
      li.addEventListener("click", () => {
        const id = li.getAttribute("data-id");
        const userId = li.getAttribute("data-user");
        this.activeConversation = { id, userId, name: li.textContent.trim() };
        ul.querySelectorAll("li").forEach((n) => n.classList.remove("active"));
        li.classList.add("active");
        document.getElementById("chatHeader").textContent = `Chat with ${cSan(
          li.querySelector("strong")?.textContent || userId
        )}`;
        this.loadChat(userId, "chatMessages");
      });
    });
  }

  loadChat(userId, containerId = "chatMessages") {
    if (!this.db || !userId) return;
    if (this.unsubscribeChat) this.unsubscribeChat();
    const msgsRef = window.firebase.collection(
      this.db,
      "conversations",
      userId,
      "messages"
    );
    const q = window.firebase.query(msgsRef);
    this.unsubscribeChat = window.firebase.onSnapshot(
      q,
      (snap) => {
        const messages = [];
        snap.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));
        messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        this.renderChat(messages, containerId);
      },
      (err) => {
        console.error("Chat listener error", err);
      }
    );
  }

  // ========== Messaging (Customer) ==========
  startCustomerChat() {
    const notice = document.getElementById("customerChatNotice");
    if (!this.currentUser) {
      if (notice) notice.textContent = "Please log in to send messages.";
      return;
    }
    if (notice) notice.textContent = "You are messaging the admin.";
    const userId = this.currentUser.uid;
    this.loadChat(userId, "customerChatMessages");
    // Ensure conversation doc exists and metadata is updated
    this.ensureConversationDoc(userId, {
      userId,
      userName: this.currentUser.name,
      userEmail: this.currentUser.email,
      updatedAt: Date.now(),
    });
  }

  renderChat(messages, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const meIsCustomer = containerId === "customerChatMessages";
    el.innerHTML = messages
      .map((m) => {
        const mine = meIsCustomer
          ? m.sender === "customer"
          : m.sender === "admin";
        const meta = new Date(m.timestamp || Date.now()).toLocaleString();
        return `<div class="msg ${mine ? "me" : "them"}">${cSan(
          m.text
        )}<span class="meta">${meta}</span></div>`;
      })
      .join("");
    el.scrollTop = el.scrollHeight;
  }

  async sendMessage(userId, text, sender) {
    try {
      if (!this.db || !userId || !text) return;
      const msgsRef = window.firebase.collection(
        this.db,
        "conversations",
        userId,
        "messages"
      );
      const payload = { text, sender, timestamp: Date.now() };
      await window.firebase.addDoc(msgsRef, payload);
      await this.ensureConversationDoc(userId, {
        userId,
        userName: this.currentUser?.name || undefined,
        userEmail: this.currentUser?.email || undefined,
        lastMessage: text,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.error("sendMessage error", e);
      this.showNotification("Failed to send message", "error");
    }
  }

  async ensureConversationDoc(userId, data) {
    const convRef = window.firebase.doc(this.db, "conversations", userId);
    const snap = await window.firebase.getDoc(convRef);
    if (snap.exists()) {
      await window.firebase.updateDoc(convRef, data);
    } else {
      await window.firebase.setDoc(convRef, data);
    }
  }
}

// Initialize the app
const app = new RestaurantApp();

// Minimal sanitizer for chat message rendering
function cSan(str) {
  return (str || "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}
