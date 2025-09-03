class RestaurantApp {
  constructor() {
    this.currentUser = null;
    this.cart = [];
    this.editingMenuItem = null;
    this.unsubscribeOrders = null;
    this.unsubscribeCustomerOrders = null;
    this.allOrders = []; // A local cache for filtering

    this.auth = null;
    this.db = null;

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
    this.defaultCapacity = { lunch: 50, dinner: 40 };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    console.log("App Initializing...");
    this.setupEventListeners();
    this.setMinDate();
    this.showScreen("publicScreen");

    // Warn if running directly from file:// which breaks Firebase Auth
    this.detectHostingEnvironment();

    try {
      console.log("Checking for Firebase config...");
      if (
        !window.firebaseConfig ||
        !window.firebaseConfig.apiKey.startsWith("AIzaSy")
      ) {
        this.showNotification(
          "Firebase config is missing or invalid in index.html.",
          "error"
        );
        console.error("Firebase config is missing or invalid.");
        return;
      }
      console.log("Firebase config found. Waiting for Firebase SDK...");
      // Wait for the module script to populate window.firebase before using it
      // This avoids a race where script.js runs before the module has loaded.
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
          // Create a default customer profile if missing so valid logins don't fail silently
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
        } else {
          // MODIFICATION: Show public screen for customers
          console.log("User is a customer. Showing public screen.");
          this.showScreen("publicScreen");
          this.updatePublicUIForUser(); // New function to update header and pre-fill form
        }
      } else {
        this.currentUser = null;
        this.detachListeners();
        console.log("No user is logged in. Showing public landing.");
        this.showScreen("publicScreen");
        this.updatePublicUIForGuest(); // New function to reset UI
      }

      this.hideLoader();
      console.log("Auth state callback finished.");
    });
  }
  
  // NEW FUNCTION: Updates the public UI for a logged-in customer
  updatePublicUIForUser() {
      if (!this.currentUser) return;

      // Update header buttons and display user name
      document.getElementById('navLoginBtn').classList.add('hidden');
      document.getElementById('publicLogoutBtn').classList.remove('hidden');
      const userInfo = document.getElementById('userInfo');
      userInfo.classList.remove('hidden');
      document.getElementById('publicUserName').textContent = this.currentUser.name;

      // Pre-fill the order form with user's details
      document.getElementById('scheduled-name').value = this.currentUser.name;
      document.getElementById('scheduled-phone').value = this.currentUser.phone;
      document.getElementById('scheduled-address').value = this.currentUser.address;
  }

  // NEW FUNCTION: Resets the public UI for a guest or after logout
  updatePublicUIForGuest() {
      // Revert header buttons to default state
      document.getElementById('navLoginBtn').classList.remove('hidden');
      document.getElementById('publicLogoutBtn').classList.add('hidden');
      document.getElementById('userInfo').classList.add('hidden');

      // Clear any pre-filled data from the order form
      const orderForm = document.getElementById('scheduled-order-form');
      if (orderForm) {
          orderForm.reset();
      }
      // Manually clear fields that reset() might not catch
      document.getElementById('scheduled-name').value = '';
      document.getElementById('scheduled-phone').value = '';
      document.getElementById('scheduled-address').value = '';
  }


  setupEventListeners() {
    const navLoginBtn = document.getElementById("navLoginBtn");
    if (navLoginBtn)
      navLoginBtn.addEventListener("click", () =>
        this.showScreen("loginScreen")
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
    // this.setupCustomerListeners(); // This is no longer needed as customerScreen is not used
    this.setupModalListeners();
    this.setupPublicLanding();
  }

  setupLogoutButtons() {
    document
      .getElementById("logoutBtn")
      .addEventListener("click", () => this.logout());
    // MODIFICATION: Add event listener for the new public logout button
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
  
  // This function is no longer needed as the customerScreen is not in use
  /*
  setupCustomerListeners() {
    document
      .getElementById("orderDate")
      .addEventListener("change", () => this.loadCustomerMenu());
    document
      .getElementById("orderTimeSlot")
      .addEventListener("change", () => this.loadCustomerMenu());
    document
      .getElementById("placeOrderBtn")
      .addEventListener("click", () => this.placeOrder());
  }
  */

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
    // The onAuthStateChanged listener will handle UI updates
    this.hideLoader();
  }
  
  // The rest of the script.js file remains the same.
  // ... (all other functions from the original script.js file) ...
  // Make sure to include all the remaining functions from the original file here,
  // as they are still needed for the Admin panel and other functionalities.
  
  // ... (getUserProfile, createUserProfile, showScreen, switchTab, loadAdminData, etc.) ...
  
  // PASTE THE REST OF YOUR ORIGINAL script.js FILE CONTENT HERE
  // STARTING FROM THE `getUserProfile` FUNCTION
  async getUserProfile(uid) {
    const userDocRef = window.firebase.doc(this.db, "users", uid);
    const docSnap = await window.firebase.getDoc(userDocRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  async createUserProfile(uid, data) {
    const userDocRef = window.firebase.doc(this.db, "users", uid);
    await window.firebase.setDoc(userDocRef, data);
  }

  showScreen(screenId) {
    document
      .querySelectorAll(".screen")
      .forEach((screen) => screen.classList.add("hidden"));
    document.getElementById(screenId).classList.remove("hidden");
  }

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
        '<p class="menu-message">No orders match the current filters.</p>';
      return;
    }
    container.innerHTML = orders
      .map((order) => this.createOrderCardHTML(order))
      .join("");
  }

  createOrderCardHTML(order) {
    return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">${order.id}</div>
                        <div class="order-time">${new Date(
                          order.timestamp
                        ).toLocaleString()}</div>
                    </div>
                    <div class="status status--${order.status.toLowerCase()}">${
      order.status
    }</div>
                </div>
                <div class="order-customer">
                    <h4>${order.customerName}</h4>
                    <p>📞 ${order.customerPhone}</p>
                    <p>📍 ${order.customerAddress}</p>
                    <p>📅 ${new Date(
                      order.date
                    ).toLocaleDateString()} - ${this.getTimeSlotName(
      order.timeSlot
    )}</p>
                </div>
                <div class="order-items">
                    <h5>Items:</h5>
                    <ul class="item-list">
                        ${order.items
                          .map(
                            (item) =>
                              `<li><span>${item.name} x ${
                                item.quantity
                              }</span><span>₹${
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
                    <div class="order-total">Total: ₹${order.totalAmount}</div>
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
            </div>`;
  }

  async updateOrderStatus(orderId, newStatus) {
    this.showLoader();
    try {
      const orderRef = window.firebase.doc(this.db, "orders", orderId);
      await window.firebase.updateDoc(orderRef, { status: newStatus });
      this.showNotification(
        `Order ${orderId} status updated to ${newStatus}`,
        "success"
      );
    } catch (error) {
      this.showNotification("Failed to update order status.", "error");
    }
    this.hideLoader();
  }

  async loadMenuItems() {
    const date = document.getElementById("menuDate").value;
    const timeSlot = document.getElementById("menuTimeSlot").value;
    const menuDocRef = window.firebase.doc(this.db, "menus", date);
    const menuDoc = await window.firebase.getDoc(menuDocRef);
    const menuItems = menuDoc.exists() ? menuDoc.data()[timeSlot] || [] : [];
    this.displayMenuItems(menuItems);
  }

  displayMenuItems(items) {
    const container = document.getElementById("menuItemsList");
    if (items.length === 0) {
      container.innerHTML =
        '<p class="menu-message">No menu items found. Click "Add Item".</p>';
      return;
    }
    container.innerHTML = items
      .map(
        (item, index) => `
            <div class="menu-item-card">
                <div class="menu-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.description}</p>
                    <div class="menu-item-price">₹${item.price}</div>
                </div>
                <div class="menu-item-actions">
                    <button class="btn btn--sm btn--outline" onclick="app.editMenuItem(${index})">Edit</button>
                    <button class="btn btn--sm btn--outline" onclick="app.deleteMenuItem(${index})" style="color: var(--color-error);">Delete</button>
                </div>
            </div>`
      )
      .join("");
  }

  async saveMenuItem(e) {
    e.preventDefault();
    this.showLoader();
    const date = document.getElementById("menuDate").value;
    const timeSlot = document.getElementById("menuTimeSlot").value;
    const itemData = {
      name: document.getElementById("itemName").value.trim(),
      price: parseFloat(document.getElementById("itemPrice").value),
      description: document.getElementById("itemDescription").value.trim(),
    };

    try {
      const menuRef = window.firebase.doc(this.db, "menus", date);
      const menuDoc = await window.firebase.getDoc(menuRef);
      let menu = menuDoc.exists() ? menuDoc.data() : { lunch: [], dinner: [] };

      if (this.editingMenuItem != null) {
        menu[timeSlot][this.editingMenuItem] = itemData;
      } else {
        if (!menu[timeSlot]) menu[timeSlot] = [];
        menu[timeSlot].push(itemData);
      }
      await window.firebase.setDoc(menuRef, menu);
      this.showNotification("Menu item saved.", "success");
      this.closeModals();
      this.loadMenuItems();
    } catch (err) {
      this.showNotification("Error saving menu item.", "error");
      console.error(err);
    } finally {
      this.hideLoader();
    }
  }

  editMenuItem(index) {
    this.editingMenuItem = index;
    const date = document.getElementById("menuDate").value;
    const timeSlot = document.getElementById("menuTimeSlot").value;
    const menuRef = window.firebase.doc(this.db, "menus", date);
    window.firebase.getDoc(menuRef).then((doc) => {
      const item = doc.data()[timeSlot][index];
      this.showMenuItemModal(item);
    });
  }

  async deleteMenuItem(index) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    this.showLoader();
    const date = document.getElementById("menuDate").value;
    const timeSlot = document.getElementById("menuTimeSlot").value;

    try {
      const menuRef = window.firebase.doc(this.db, "menus", date);
      const menuDoc = await window.firebase.getDoc(menuRef);
      let menu = menuDoc.data();
      menu[timeSlot].splice(index, 1);
      await window.firebase.setDoc(menuRef, menu);
      this.showNotification("Item deleted.", "success");
      this.loadMenuItems();
    } catch (err) {
      this.showNotification("Error deleting item.", "error");
    } finally {
      this.hideLoader();
    }
  }

  showMenuItemModal(item = null) {
    this.editingMenuItem = item ? this.editingMenuItem : null;
    const modal = document.getElementById("menuItemModal");
    const title = document.getElementById("menuItemModalTitle");
    document.getElementById("menuItemForm").reset();

    if (item) {
      title.textContent = "Edit Menu Item";
      document.getElementById("itemName").value = item.name;
      document.getElementById("itemPrice").value = item.price;
      document.getElementById("itemDescription").value = item.description;
    } else {
      title.textContent = "Add Menu Item";
    }
    modal.classList.remove("hidden");
  }

  async loadCapacitySettings() {
    const date = document.getElementById("capacityDate").value;
    const capacityRef = window.firebase.doc(this.db, "capacity", date);
    const capacityDoc = await window.firebase.getDoc(capacityRef);
    let capacityData = capacityDoc.exists()
      ? capacityDoc.data()
      : {
          lunch: {
            total: this.defaultCapacity.lunch,
            remaining: this.defaultCapacity.lunch,
          },
          dinner: {
            total: this.defaultCapacity.dinner,
            remaining: this.defaultCapacity.dinner,
          },
        };
    this.displayCapacitySettings(capacityData);
  }

  displayCapacitySettings(capacity) {
    const container = document.getElementById("capacitySettings");
    container.innerHTML = Object.entries(capacity)
      .map(
        ([slot, data]) => `
            <div class="capacity-card">
                <h4>${this.getTimeSlotName(slot)}</h4>
                <div class="capacity-info">
                    <span>Total: ${data.total}</span>
                    <span>Available: ${data.remaining}</span>
                </div>
                <div class="capacity-bar">
                    <div class="capacity-fill" style="width: ${
                      ((data.total - data.remaining) / data.total) * 100
                    }%"></div>
                </div>
            </div>`
      )
      .join("");
  }

  showCapacityModal() {
    const date = document.getElementById("capacityDate").value;
    const capacityRef = window.firebase.doc(this.db, "capacity", date);
    window.firebase.getDoc(capacityRef).then((doc) => {
      if (doc.exists()) {
        document.getElementById("lunchCapacity").value = doc.data().lunch.total;
        document.getElementById("dinnerCapacity").value =
          doc.data().dinner.total;
      } else {
        document.getElementById("lunchCapacity").value =
          this.defaultCapacity.lunch;
        document.getElementById("dinnerCapacity").value =
          this.defaultCapacity.dinner;
      }
      document.getElementById("capacityModal").classList.remove("hidden");
    });
  }

  async saveCapacity(e) {
    e.preventDefault();
    this.showLoader();
    const date = document.getElementById("capacityDate").value;
    const lunchTotal = parseInt(document.getElementById("lunchCapacity").value);
    const dinnerTotal = parseInt(
      document.getElementById("dinnerCapacity").value
    );

    try {
      const capacityRef = window.firebase.doc(this.db, "capacity", date);
      await window.firebase.runTransaction(this.db, async (transaction) => {
        const capacityDoc = await transaction.get(capacityRef);
        if (!capacityDoc.exists()) {
          transaction.set(capacityRef, {
            lunch: { total: lunchTotal, remaining: lunchTotal },
            dinner: { total: dinnerTotal, remaining: dinnerTotal },
          });
        } else {
          const oldData = capacityDoc.data();
          const lunchDiff = lunchTotal - oldData.lunch.total;
          const dinnerDiff = dinnerTotal - oldData.dinner.total;
          transaction.update(capacityRef, {
            "lunch.total": lunchTotal,
            "lunch.remaining": Math.max(0, oldData.lunch.remaining + lunchDiff),
            "dinner.total": dinnerTotal,
            "dinner.remaining": Math.max(
              0,
              oldData.dinner.remaining + dinnerDiff
            ),
          });
        }
      });
      this.showNotification("Capacity updated.", "success");
      this.closeModals();
      this.loadCapacitySettings();
    } catch (err) {
      this.showNotification("Error updating capacity.", "error");
      console.error(err);
    } finally {
      this.hideLoader();
    }
  }

  async loadReports() {
    const ordersSnapshot = await window.firebase.getDocs(
      window.firebase.collection(this.db, "orders")
    );
    const allOrders = ordersSnapshot.docs.map((doc) => doc.data());

    const today = new Date().toISOString().split("T")[0];
    const todayOrders = allOrders.filter((o) => o.date === today);
    const totalRevenue = todayOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    document.getElementById("dailySummary").innerHTML = `
            <div class="stat-item"><span class="stat-label">Orders Today</span><span class="stat-value">${
              todayOrders.length
            }</span></div>
            <div class="stat-item"><span class="stat-label">Revenue Today</span><span class="stat-value">₹${totalRevenue.toFixed(
              2
            )}</span></div>
            <div class="stat-item"><span class="stat-label">Pending Orders</span><span class="stat-value">${
              todayOrders.filter((o) => o.status === "Pending").length
            }</span></div>`;

    const itemCounts = allOrders
      .flatMap((o) => o.items)
      .reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
        return acc;
      }, {});
    const sortedItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    document.getElementById("popularItems").innerHTML =
      sortedItems.length > 0
        ? sortedItems
            .map(
              ([name, count]) =>
                `<div class="stat-item"><span class="stat-label">${name}</span><span class="stat-value">${count} sold</span></div>`
            )
            .join("")
        : '<p class="menu-message">No orders yet.</p>';
  }

  // The functions below this comment relate to the old customerScreen and are no longer used.
  // You can safely remove them if you wish to clean up the code.
  /*
  async loadCustomerData() {
    document.getElementById("customerName").textContent = this.currentUser.name;
    this.listenForCustomerOrders();
  }

  async loadCustomerMenu() {
    const date = document.getElementById("orderDate").value;
    const timeSlot = document.getElementById("orderTimeSlot").value;
    const menuDisplay = document.getElementById("menuDisplay");

    if (!date || !timeSlot) {
      menuDisplay.innerHTML =
        '<p class="menu-message">Please select date and time slot to view menu</p>';
      return;
    }

    this.showLoader();
    try {
      const menuRef = window.firebase.doc(this.db, "menus", date);
      const capacityRef = window.firebase.doc(this.db, "capacity", date);
      const [menuDoc, capacityDoc] = await Promise.all([
        window.firebase.getDoc(menuRef),
        window.firebase.getDoc(capacityRef),
      ]);

      if (
        !capacityDoc.exists() ||
        capacityDoc.data()[timeSlot].remaining <= 0
      ) {
        menuDisplay.innerHTML =
          '<p class="menu-message">Sorry, this time slot is fully booked.</p>';
        return;
      }
      if (
        !menuDoc.exists() ||
        !menuDoc.data()[timeSlot] ||
        menuDoc.data()[timeSlot].length === 0
      ) {
        menuDisplay.innerHTML =
          '<p class="menu-message">Menu is not available for the selected slot.</p>';
        return;
      }
      this.displayCustomerMenu(menuDoc.data()[timeSlot]);
    } catch (err) {
      this.showNotification("Could not load menu.", "error");
    } finally {
      this.hideLoader();
    }
  }

  displayCustomerMenu(items) {
    const menuDisplay = document.getElementById("menuDisplay");
    menuDisplay.innerHTML = `<div class="menu-grid">${items
      .map(
        (item, index) => `
            <div class="menu-item">
                <div class="menu-item-details">
                    <h4>${item.name}</h4>
                    <p>${item.description}</p>
                    <div class="menu-item-price">₹${item.price}</div>
                </div>
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="app.updateCartQuantity('${
                      item.name
                    }', -1, ${item.price})">-</button>
                    <span class="qty-display" id="qty-${item.name.replace(
                      /\s+/g,
                      ""
                    )}">0</span>
                    <button class="qty-btn" onclick="app.updateCartQuantity('${
                      item.name
                    }', 1, ${item.price})">+</button>
                </div>
            </div>`
      )
      .join("")}</div>`;
    this.updateCartDisplay();
  }

  updateCartQuantity(itemName, change, price) {
    let item = this.cart.find((i) => i.name === itemName);
    if (item) {
      item.quantity += change;
      if (item.quantity <= 0)
        this.cart = this.cart.filter((i) => i.name !== itemName);
    } else if (change > 0) {
      this.cart.push({ name: itemName, price, quantity: 1 });
    }
    this.updateCartDisplay();
  }

  updateCartDisplay() {
    document
      .querySelectorAll(".qty-display")
      .forEach((el) => (el.textContent = "0"));
    this.cart.forEach((item) => {
      const el = document.getElementById(
        `qty-${item.name.replace(/\s+/g, "")}`
      );
      if (el) el.textContent = item.quantity;
    });

    const cartSection = document.getElementById("cartSection");
    if (this.cart.length > 0) {
      cartSection.classList.remove("hidden");
      document.getElementById("cartItems").innerHTML = this.cart
        .map(
          (item) => `
                <div class="cart-item">
                    <div><div class="cart-item-name">${
                      item.name
                    }</div><div class="cart-item-qty">Qty: ${
            item.quantity
          }</div></div>
                    <div class="cart-item-price">₹${
                      item.price * item.quantity
                    }</div>
                </div>`
        )
        .join("");
      const total = this.cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      document.getElementById("cartTotal").textContent = total.toFixed(2);
    } else {
      cartSection.classList.add("hidden");
    }
  }

  async placeOrder() {
    if (this.cart.length === 0) {
      this.showNotification("Your cart is empty.", "error");
      return;
    }
    this.showLoader();
    const date = document.getElementById("orderDate").value;
    const timeSlot = document.getElementById("orderTimeSlot").value;

    try {
      const capacityRef = window.firebase.doc(this.db, "capacity", date);
      await window.firebase.runTransaction(this.db, async (transaction) => {
        const capacityDoc = await transaction.get(capacityRef);
        if (
          !capacityDoc.exists() ||
          capacityDoc.data()[timeSlot].remaining <= 0
        ) {
          throw new Error("Sorry, this time slot is now fully booked.");
        }
        transaction.update(capacityRef, {
          [`${timeSlot}.remaining`]: capacityDoc.data()[timeSlot].remaining - 1,
        });

        const newOrderRef = window.firebase.doc(
          window.firebase.collection(this.db, "orders")
        );
        transaction.set(newOrderRef, {
          customerId: this.currentUser.uid,
          customerName: this.currentUser.name,
          customerPhone: this.currentUser.phone,
          customerAddress: this.currentUser.address,
          items: this.cart,
          date: date,
          timeSlot: timeSlot,
          totalAmount: this.cart.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          ),
          status: "Pending",
          timestamp: new Date().toISOString(),
          specialInstructions: document.getElementById("specialInstructions")
            .value,
        });
      });

      this.showNotification("Order placed successfully!", "success");
      this.cart = [];
      document.getElementById("specialInstructions").value = "";
      this.updateCartDisplay();
    } catch (error) {
      this.showNotification(error.message, "error");
    } finally {
      this.hideLoader();
    }
  }

  listenForCustomerOrders() {
    if (this.unsubscribeCustomerOrders) this.unsubscribeCustomerOrders();
    const q = window.firebase.query(
      window.firebase.collection(this.db, "orders"),
      window.firebase.where("customerId", "==", this.currentUser.uid)
    );
    this.unsubscribeCustomerOrders = window.firebase.onSnapshot(
      q,
      (snapshot) => {
        const orders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        this.displayCustomerOrders(
          orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        );
      }
    );
  }

  displayCustomerOrders(orders) {
    const container = document.getElementById("customerOrdersList");
    if (orders.length === 0) {
      container.innerHTML =
        '<p class="menu-message">Your placed orders will appear here.</p>';
      return;
    }
    container.innerHTML = orders
      .map(
        (order) => `
            <div class="customer-order-card">
                <div class="customer-order-header">
                    <div class="customer-order-id">${order.id.substring(
                      0,
                      8
                    )}...</div>
                    <div class="customer-order-date">${new Date(
                      order.timestamp
                    ).toLocaleDateString()}</div>
                </div>
                <div class="customer-order-items">${order.items
                  .map((i) => `${i.name} x ${i.quantity}`)
                  .join(", ")}</div>
                <div class.customer-order-footer">
                    <div class="customer-order-total">₹${order.totalAmount.toFixed(
                      2
                    )}</div>
                    <div class="status status--${order.status.toLowerCase()}">${
          order.status
        }</div>
                </div>
            </div>`
      )
      .join("");
  }
  */
  
  async populateOrderDateFilter() {
    const ordersSnapshot = await window.firebase.getDocs(
      window.firebase.collection(this.db, "orders")
    );
    const dates = [
      ...new Set(ordersSnapshot.docs.map((doc) => doc.data().date)),
    ]
      .sort()
      .reverse();
    const dateFilter = document.getElementById("orderDateFilter");
    dateFilter.innerHTML = '<option value="">All Dates</option>';
    dates.forEach((date) => {
      dateFilter.innerHTML += `<option value="${date}">${new Date(
        date
      ).toLocaleDateString()}</option>`;
    });
  }

  detachListeners() {
    if (this.unsubscribeOrders) this.unsubscribeOrders();
    if (this.unsubscribeCustomerOrders) this.unsubscribeCustomerOrders();
  }

  setMinDate() {
    const today = new Date().toISOString().split("T")[0];
    document.querySelectorAll('input[type="date"]').forEach((input) => {
      input.min = today;
      if (!input.value) input.value = today;
    });
  }

  getTimeSlotName(slotId) {
    return this.timeSlots.find((s) => s.id === slotId)?.name || slotId;
  }

  closeModals() {
    document
      .querySelectorAll(".modal")
      .forEach((m) => m.classList.add("hidden"));
    document.getElementById("menuItemForm").reset();
    document.getElementById("capacityForm").reset();
    this.editingMenuItem = null;
  }

  showLoader() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
      console.log("showLoader called. Current classes:", overlay.className);
      overlay.classList.remove("hidden");
      console.log("showLoader finished. New classes:", overlay.className);
    } else {
      console.error("loadingOverlay element not found!");
    }
  }

  hideLoader() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
      console.log("hideLoader called. Current classes:", overlay.className);
      overlay.classList.add("hidden");
      console.log("hideLoader finished. New classes:", overlay.className);
    } else {
      console.error("loadingOverlay element not found!");
    }
  }

  showNotification(message, type = "info") {
    const notification = document.getElementById("notification");
    notification.className = `card notification--${type}`;
    document.getElementById("notificationMessage").textContent = message;
    notification.classList.add("show");
    setTimeout(() => notification.classList.remove("show"), 3000);
  }

  getFriendlyAuthError(code) {
    switch (code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Invalid email or password.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/email-already-in-use":
        return "This email is already registered.";
      case "auth/weak-password":
        return "Password should be at least 6 characters long.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      case "auth/network-request-failed":
        return "Network error. Check your internet connection.";
      case "auth/invalid-api-key":
        return "Invalid API key. Verify your Firebase config.";
      case "auth/configuration-not-found":
        return "Project configuration not found. Verify your Firebase config.";
      case "auth/unauthorized-domain":
        return "Unauthorized domain. Add your local domain (e.g., localhost) in Firebase Auth settings.";
      default:
        return "An authentication error occurred.";
    }
  }

  // --- Helpers ---
  detectHostingEnvironment() {
    try {
      if (location.protocol === "file:") {
        console.warn("Running from file:// — Firebase Auth will fail.");
        this.showNotification(
          "Open this app via a local server, not file://",
          "error"
        );
      }
    } catch (_) {
      /* no-op */
    }
  }

  waitForFirebase(timeoutMs = 5000) {
    const start = Date.now();
    const hasFirebase = () =>
      typeof window !== "undefined" &&
      window.firebase &&
      typeof window.firebase.initializeApp === "function" &&
      typeof window.firebase.getAuth === "function" &&
      typeof window.firebase.getFirestore === "function";
    if (hasFirebase()) return true;
    const deadhang = Date.now() + timeoutMs;
    const spin = () => {
      if (hasFirebase()) return true;
      if (Date.now() > deadhang) return false;
      // Busy-wait with short sleeps to avoid race with module script
      // eslint-disable-next-line no-constant-condition
      const end = Date.now() + 25;
      while (Date.now() < end) {
        /* spin 25ms */
      }
      return spin();
    };
    return spin();
  }

  // Public landing page ordering (non-auth)
  setupPublicLanding() {
    const form = document.getElementById("scheduled-order-form");
    if (!form) return;

    const deliveryDateSelect = document.getElementById("delivery-date");
    const deliveryTimeSelect = document.getElementById("delivery-time");
    const menuOfTheDaySection = document.getElementById("menu-of-the-day");
    const dailyMenuItemsContainer = document.getElementById("daily-menu-items");
    const deliveryDetailsSection = document.getElementById("delivery-details");
    const summaryItems = document.getElementById("summary-items");
    const summaryLocation = document.getElementById("summary-location");
    const subtotalElement = document.getElementById("subtotal");
    const totalElement = document.getElementById("total");
    const deliveryFeeElement = document.getElementById("delivery-fee");
    const deliveryFee = 30;
    const useLocationBtn = document.getElementById("useCurrentLocationBtn");
    const locationStatus = document.getElementById("locationStatus");
    const locationMapWrap = document.getElementById("locationMapWrap");
    const locationMap = document.getElementById("locationMap");
    const geoHidden = document.getElementById("scheduled-geo");

    const dailyMenu = {};
    const ensureFallbackMenuFor = (dateStr) => {
      if (!dailyMenu[dateStr]) dailyMenu[dateStr] = { lunch: [], dinner: [] };
      const mk = (n, p, d) => ({ name: n, price: p, description: d });
      if (!dailyMenu[dateStr].lunch.length) {
        dailyMenu[dateStr].lunch = [
          mk(
            "Special Veg Thali (Lunch)",
            100,
            "Rice, 2 Rotis, Dal, Mix Veg, Pickle, Salad"
          ),
          mk(
            "Paneer Butter Masala Combo (Lunch)",
            120,
            "Served with 2 Rotis or Rice"
          ),
        ];
      }
      if (!dailyMenu[dateStr].dinner.length) {
        dailyMenu[dateStr].dinner = [
          mk(
            "Homestyle Dal Makhani Combo (Dinner)",
            110,
            "Served with 2 Rotis or Rice"
          ),
          mk(
            "Vegetable Pulao Delight (Dinner)",
            90,
            "Served with Raita & Papad"
          ),
        ];
      }
    };

    const populateDeliveryDates = () => {
      const today = new Date();
      deliveryDateSelect.innerHTML =
        '<option value="">-- Select a Date --</option>';
      for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        ensureFallbackMenuFor(dateStr);
        const label =
          i === 0
            ? "Today"
            : i === 1
            ? "Tomorrow"
            : d.toLocaleDateString("en-US", { weekday: "long" });
        const text = `${label} (${d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })})`;
        deliveryDateSelect.innerHTML += `<option value="${dateStr}">${text}</option>`;
      }
      deliveryTimeSelect.innerHTML =
        '<option value="">-- Select Time Slot --</option><option value="lunch">Lunch (13:00 - 14:00)</option><option value="dinner">Dinner (19:00 - 20:00)</option>';
    };

    const hasSelectedItems = () =>
      !!dailyMenuItemsContainer.querySelector(
        '.menu-item input[type="checkbox"]:checked'
      );
    const updateOrderSummary = () => {
      let subtotal = 0;
      let summaryHTML = "";
      const selected = dailyMenuItemsContainer.querySelectorAll(
        '.menu-item input[type="checkbox"]:checked'
      );
      selected.forEach((item) => {
        const name = item.dataset.name;
        const price = parseInt(item.dataset.price);
        const qty =
          parseInt(
            item.closest(".menu-item").querySelector(".item-quantity").value
          ) || 1;
        subtotal += price * qty;
        summaryHTML += `<p>${name} (x${qty}) <span>Rs. ${
          price * qty
        }</span></p>`;
      });
      // Location line
      const address = (
        document.getElementById("scheduled-address")?.value || ""
      ).trim();
      const geo = (geoHidden?.value || "").trim();
      if (address || geo) {
        const locText = address ? address : `Lat/Lng: ${geo}`;
        summaryLocation.innerHTML = `<div style="margin: 6px 0 12px; color: var(--color-text-secondary);"><strong>Deliver to:</strong> ${locText}</div>`;
      } else if (summaryLocation) {
        summaryLocation.innerHTML = "";
      }

      summaryItems.innerHTML = summaryHTML || "<p>No items selected yet.</p>";
      subtotalElement.textContent = `Rs. ${subtotal}`;
      if (subtotal > 0) {
        totalElement.textContent = `Rs. ${subtotal + deliveryFee}`;
        deliveryFeeElement.textContent = `Rs. ${deliveryFee}`;
      } else {
        totalElement.textContent = "Rs. 0";
        deliveryFeeElement.textContent = "Rs. 0";
      }
    };

    const renderMenu = (date, time) => {
      dailyMenuItemsContainer.innerHTML = "";
      menuOfTheDaySection.classList.add("hidden");
      if (!date || !time) {
        updateOrderSummary();
        return;
      }
      const menuForDay = dailyMenu[date];
      if (!menuForDay || !menuForDay[time]) {
        dailyMenuItemsContainer.innerHTML =
          "<p>No special daily menu available for this slot.</p>";
        menuOfTheDaySection.classList.remove("hidden");
        updateOrderSummary();
        return;
      }
      const menuItems = menuForDay[time] || [];
      if (!menuItems.length) {
        dailyMenuItemsContainer.innerHTML =
          "<p>No items on the special daily menu for this slot.</p>";
        menuOfTheDaySection.classList.remove("hidden");
        updateOrderSummary();
        return;
      }
      menuItems.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "menu-item";
        div.innerHTML = `
          <input type="checkbox" id="item-${time}-${index}" data-price="${
          item.price
        }" data-name="${item.name}">
          <label for="item-${time}-${index}">${item.name} - Rs. ${
          item.price
        }</label>
          ${
            item.description
              ? `<p class="item-description">${item.description}</p>`
              : ""
          }
          <div class="quantity-selector hidden">
            <label>Quantity:</label>
            <input type="number" min="1" value="1" class="item-quantity" />
          </div>`;
        dailyMenuItemsContainer.appendChild(div);
        const checkbox = div.querySelector(`#item-${time}-${index}`);
        const qtySel = div.querySelector(".quantity-selector");
        const qtyInput = div.querySelector(".item-quantity");
        checkbox.addEventListener("change", function () {
          if (this.checked) qtySel.classList.remove("hidden");
          else {
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

    deliveryDateSelect.addEventListener("change", function () {
      const selectedDate = this.value;
      const selectedTime = deliveryTimeSelect.value;
      if (selectedDate && selectedTime) {
        renderMenu(selectedDate, selectedTime);
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

    deliveryTimeSelect.addEventListener("change", function () {
      const selectedTime = this.value;
      const selectedDate = deliveryDateSelect.value;
      if (selectedDate && selectedTime) {
        renderMenu(selectedDate, selectedTime);
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

    // Keep summary location live-updating as user types address
    const addrInput = document.getElementById("scheduled-address");
    if (addrInput) {
      addrInput.addEventListener("input", () => {
        // Clear geo if user edits address manually
        if (geoHidden) geoHidden.value = "";
        if (locationStatus) locationStatus.textContent = "";
        if (locationMapWrap) locationMapWrap.classList.add("hidden");
        updateOrderSummary();
      });
    }

    // Use Current Location with browser geolocation
    if (useLocationBtn) {
      useLocationBtn.addEventListener("click", () => {
        if (!navigator.geolocation) {
          if (locationStatus)
            locationStatus.textContent =
              "Geolocation is not supported on this device.";
          return;
        }
        locationStatus.textContent = "Locating…";
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            if (geoHidden)
              geoHidden.value = `${latitude.toFixed(6)},${longitude.toFixed(
                6
              )}`;
            locationStatus.textContent = "Location captured.";
            // Show map using Google Maps embed without API key via query
            if (locationMap) {
              const q = encodeURIComponent(`${latitude},${longitude}`);
              locationMap.src = `https://www.google.com/maps?q=${q}&output=embed`;
              if (locationMapWrap) locationMapWrap.classList.remove("hidden");
            }
            updateOrderSummary();
          },
          (err) => {
            console.warn("Geolocation error:", err);
            locationStatus.textContent =
              "Unable to fetch location. Please enter your address.";
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const selectedDateValue = deliveryDateSelect.value;
      if (!selectedDateValue) {
        alert("Please select a delivery date.");
        return;
      }
      const selectedDailyMenuItems = dailyMenuItemsContainer.querySelectorAll(
        '.menu-item input[type="checkbox"]:checked'
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
        location: geoHidden && geoHidden.value ? geoHidden.value : null,
        items: orderItems,
        instructions: document.getElementById("special-instructions").value,
        subtotal: subtotalElement.textContent,
        deliveryFee: deliveryFeeElement.textContent,
        total: totalElement.textContent,
      };
      console.log("Order Details (public):", orderDetails);
      alert(
        `Your order for ${orderDetails.date} (${orderDetails.timeSlot}) has been placed! Total: ${orderDetails.total}.`
      );
      form.reset();
      if (geoHidden) geoHidden.value = "";
      if (locationStatus) locationStatus.textContent = "";
      if (locationMapWrap) locationMapWrap.classList.add("hidden");
      menuOfTheDaySection.classList.add("hidden");
      deliveryDetailsSection.classList.add("hidden");
      dailyMenuItemsContainer.innerHTML = "";
      deliveryTimeSelect.value = "";
      populateDeliveryDates();
      deliveryDateSelect.value = "";
      updateOrderSummary();
    });

    populateDeliveryDates();
    updateOrderSummary();
    menuOfTheDaySection.classList.add("hidden");
    deliveryDetailsSection.classList.add("hidden");
  }
}

const app = new RestaurantApp();