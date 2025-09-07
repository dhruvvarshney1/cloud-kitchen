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

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    console.log("Home-Coming App Initializing...");
    this.setupEventListeners();
    this.setMinDate();
    this.showScreen("publicScreen");
    this.detectHostingEnvironment();

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

  async getUserProfile(uid) {
    const userDocRef = window.firebase.doc(this.db, "users", uid);
    const docSnap = await window.firebase.getDoc(userDocRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  async createUserProfile(uid, data) {
    const userDocRef = window.firebase.doc(this.db, "users", uid);
    await window.firebase.setDoc(userDocRef, data);
  }

  async handleLogin(e) {
    e.preventDefault();
    this.showLoader();

    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

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

    document.getElementById("navLoginBtn").classList.add("hidden");
    document.getElementById("publicLogoutBtn").classList.remove("hidden");
    const navMessagesBtn = document.getElementById("navMessagesBtn");
    if (navMessagesBtn) navMessagesBtn.classList.remove("hidden");

    const userInfo = document.getElementById("userInfo");
    userInfo.classList.remove("hidden");
    document.getElementById("publicUserName").textContent =
      this.currentUser.name;

    // Pre-fill the order form
    document.getElementById("scheduled-name").value = this.currentUser.name;
    document.getElementById("scheduled-phone").value = this.currentUser.phone;
    document.getElementById("scheduled-address").value =
      this.currentUser.address;
  }

  updatePublicUIForGuest() {
    document.getElementById("navLoginBtn").classList.remove("hidden");
    document.getElementById("publicLogoutBtn").classList.add("hidden");
    document.getElementById("userInfo").classList.add("hidden");
    const navMessagesBtn = document.getElementById("navMessagesBtn");
    if (navMessagesBtn) navMessagesBtn.classList.add("hidden");

    // Clear form fields
    const orderForm = document.getElementById("scheduled-order-form");
    if (orderForm) orderForm.reset();

    document.getElementById("scheduled-name").value = "";
    document.getElementById("scheduled-phone").value = "";
    document.getElementById("scheduled-address").value = "";
  }

  showScreen(screenId) {
    document
      .querySelectorAll(".screen")
      .forEach((screen) => screen.classList.add("hidden"));
    document.getElementById(screenId).classList.remove("hidden");
    if (screenId === "adminScreen") {
      const activeTab = document.querySelector(".admin-tabs .tab-btn.active");
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
    const navLoginBtn = document.getElementById("navLoginBtn");
    if (navLoginBtn)
      navLoginBtn.addEventListener("click", () =>
        this.showScreen("loginScreen")
      );
    const navMessagesBtn = document.getElementById("navMessagesBtn");
    if (navMessagesBtn)
      navMessagesBtn.addEventListener("click", () =>
        this.showScreen("customerScreen")
      );

    document
      .getElementById("loginForm")
      .addEventListener("submit", (e) => this.handleLogin(e));
    document
      .getElementById("registerForm")
      .addEventListener("submit", (e) => this.handleRegister(e));
    document
      .getElementById("showRegisterBtn")
      .addEventListener("click", () => this.showScreen("registerScreen"));
    document
      .getElementById("showLoginBtn")
      .addEventListener("click", () => this.showScreen("loginScreen"));

    this.setupLogoutButtons();
    this.setupAdminListeners();
    this.setupModalListeners();
    this.setupPublicLanding();
    this.setupChatListeners();
  }

  setupLogoutButtons() {
    document
      .getElementById("logoutBtn")
      .addEventListener("click", () => this.logout());
    document
      .getElementById("publicLogoutBtn")
      .addEventListener("click", () => this.logout());
  }

  setupAdminListeners() {
    document
      .querySelectorAll(".tab-btn")
      .forEach((btn) =>
        btn.addEventListener("click", (e) =>
          this.switchTab(e.target.dataset.tab)
        )
      );

    document
      .getElementById("orderDateFilter")
      .addEventListener("change", () =>
        this.filterAndDisplayOrders(this.allOrders)
      );
    document
      .getElementById("orderStatusFilter")
      .addEventListener("change", () =>
        this.filterAndDisplayOrders(this.allOrders)
      );

    document
      .getElementById("addMenuItemBtn")
      .addEventListener("click", () => this.showMenuItemModal());
    document
      .getElementById("menuDate")
      .addEventListener("change", () => this.loadMenuItems());
    document
      .getElementById("menuTimeSlot")
      .addEventListener("change", () => this.loadMenuItems());
    document
      .getElementById("menuItemForm")
      .addEventListener("submit", (e) => this.saveMenuItem(e));

    // Populate menuTimeSlot options
    const menuTimeSlot = document.getElementById("menuTimeSlot");
    menuTimeSlot.innerHTML = '<option value="">Select time slot</option>' +
      this.timeSlots.map(slot => `<option value="${slot.id}">${slot.name}</option>`).join("");

    document
      .getElementById("setCapacityBtn")
      .addEventListener("click", () => this.showCapacityModal());
    document
      .getElementById("capacityDate")
      .addEventListener("change", () => this.loadCapacitySettings());
    document
      .getElementById("capacityForm")
      .addEventListener("submit", (e) => this.saveCapacity(e));
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
    this.setupOrderingSystem();
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
