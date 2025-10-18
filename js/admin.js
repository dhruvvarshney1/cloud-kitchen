// Admin dashboard data loading
// Fetches live metrics and order data from Firestore and binds to dashboard UI slots

(() => {
  const state = {
    unsubscribers: [],
  };

  const cleanUp = () => {
    state.unsubscribers.forEach((fn) => {
      if (typeof fn === "function") fn();
    });
    state.unsubscribers = [];
  };

  const handleOrderStatusChange = async (db, orderId, newStatus) => {
    if (!orderId || !newStatus) return;

    try {
      const timestamp = window.firebase.firestore.FieldValue.serverTimestamp();
      
      await db.collection("orders").doc(orderId).update({
        status: newStatus,
        updatedAt: timestamp
      });

      console.log(`Order ${orderId} status updated to: ${newStatus}`);
    } catch (error) {
      console.error("Failed to update order status:", error);
      alert("Failed to update order status. Please try again.");
    }
  };

  const formatOrdersSummary = (orders) => {
    if (!orders.length) return "";
    const counts = orders.reduce(
      (acc, order) => {
        const status = (order.status || "").toLowerCase();
        if (status.includes("pending")) acc.pending += 1;
        else if (status.includes("prepar")) acc.preparing += 1;
        else if (status.includes("ready")) acc.ready += 1;
        else acc.other += 1;
        return acc;
      },
      { pending: 0, preparing: 0, ready: 0, other: 0 }
    );

    const parts = [
      counts.pending ? `${counts.pending} pending` : null,
      counts.preparing ? `${counts.preparing} preparing` : null,
      counts.ready ? `${counts.ready} ready` : null,
      counts.other ? `${counts.other} other` : null,
    ].filter(Boolean);

    return parts.join(" · ");
  };

  const attachDashboardMetrics = (db) => {
    const ordersValueEl = document.getElementById("ordersInProgress");
    const ordersDetailsEl = document.getElementById("ordersInProgressDetails");
    const ordersListEl = document.getElementById("ordersList");
    const averageFulfillmentEl = document.getElementById("averageFulfillment");
    const averageTrendEl = document.getElementById("averageFulfillmentTrend");
    const capacityLunchEl = document.getElementById("capacityLunch");
    const capacityDinnerEl = document.getElementById("capacityDinner");
    const capacityLunchFill = document.getElementById("capacityLunchFill");
    const capacityDinnerFill = document.getElementById("capacityDinnerFill");

    const updateCapacity = (snapshot) => {
      if (!snapshot.exists) return;
      const data = snapshot.data();
      const lunchPercent = Number(data.lunch || 0);
      const dinnerPercent = Number(data.dinner || 0);

      if (capacityLunchEl) capacityLunchEl.textContent = `${lunchPercent}% booked`;
      if (capacityDinnerEl) capacityDinnerEl.textContent = `${dinnerPercent}% booked`;
      if (capacityLunchFill) capacityLunchFill.style.width = `${Math.min(lunchPercent, 100)}%`;
      if (capacityDinnerFill) capacityDinnerFill.style.width = `${Math.min(dinnerPercent, 100)}%`;
    };

    const updateOrders = (snapshot) => {
      const orders = [];
      snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });

      if (ordersValueEl) ordersValueEl.textContent = orders.length ? `${orders.length}` : "--";
      if (ordersDetailsEl) ordersDetailsEl.textContent = formatOrdersSummary(orders);

      if (ordersListEl) {
        ordersListEl.innerHTML = "";
        orders.forEach((order) => {
          const card = document.createElement("article");
          card.className = "order-card";
          card.setAttribute("role", "listitem");

          const header = document.createElement("header");
          header.className = "order-header";
          header.innerHTML = `
            <span class="order-id">Order #${order.orderNumber || order.id}</span>
            <span class="order-time">${order.scheduledTime || ""}</span>
          `;

          const customer = document.createElement("div");
          customer.className = "order-customer";
          customer.innerHTML = `
            <h4>${order.customerName || "Customer"}</h4>
            <p>${order.summary || ""}</p>
          `;

          const footer = document.createElement("footer");
          footer.className = "order-footer";
          
          // Create status dropdown
          const statusSelect = document.createElement("select");
          statusSelect.className = "order-status-select";
          statusSelect.dataset.orderId = order.id;
          
          const statusOptions = [
            { value: "Pending", label: "Pending", class: "status--info" },
            { value: "Confirmed", label: "Confirmed", class: "status--info" },
            { value: "Preparing", label: "Preparing", class: "status--warning" },
            { value: "Prepared", label: "Prepared", class: "status--success" },
            { value: "Out for Delivery", label: "Out for Delivery", class: "status--warning" },
            { value: "Delivered", label: "Delivered", class: "status--success" },
            { value: "Cancelled", label: "Cancelled", class: "status--error" }
          ];
          
          const currentStatus = order.status || "Pending";
          statusOptions.forEach((option) => {
            const optionEl = document.createElement("option");
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            if (option.value === currentStatus) {
              optionEl.selected = true;
            }
            statusSelect.appendChild(optionEl);
          });
          
          // Add change event listener
          statusSelect.addEventListener("change", (e) => {
            handleOrderStatusChange(db, order.id, e.target.value);
          });
          
          // Add status indicator class
          const status = (currentStatus || "").toLowerCase();
          if (status.includes("delivered") || status.includes("prepared")) {
            statusSelect.classList.add("status--success");
          } else if (status.includes("prepar") || status.includes("delivery")) {
            statusSelect.classList.add("status--warning");
          } else if (status.includes("cancelled")) {
            statusSelect.classList.add("status--error");
          } else {
            statusSelect.classList.add("status--info");
          }

          footer.appendChild(statusSelect);

          card.append(header, customer, footer);
          ordersListEl.appendChild(card);
        });
      }
    };

    const updateFulfillment = (snapshot) => {
      const data = snapshot.data();
      if (!data) {
        if (averageFulfillmentEl) averageFulfillmentEl.textContent = "--";
        if (averageTrendEl) {
          averageTrendEl.textContent = "";
          averageTrendEl.hidden = true;
        }
        return;
      }

      if (averageFulfillmentEl) {
        const value = Number(data.averageMinutes || 0);
        averageFulfillmentEl.textContent = value ? `${value} min` : "--";
      }

      if (averageTrendEl) {
        if (data.trendLabel) {
          averageTrendEl.textContent = data.trendLabel;
          averageTrendEl.hidden = false;
        } else {
          averageTrendEl.textContent = "";
          averageTrendEl.hidden = true;
        }
      }
    };

    state.unsubscribers.push(
      db.collection("orders").orderBy("createdAt", "desc").limit(10).onSnapshot(updateOrders),
      db.collection("metrics").doc("fulfillment").onSnapshot(updateFulfillment),
      db.collection("metrics").doc("capacity").onSnapshot(updateCapacity)
    );
  };

  const attachMenuManagement = (db) => {
    const listEl = document.getElementById("menuItems");
    const formEl = document.getElementById("menuItemForm");
    const submitBtn = document.getElementById("menuItemSubmit");
    const feedbackEl = document.getElementById("menuItemFeedback");
    const focusBtn = document.getElementById("menuItemFormFocus");
    const dateInput = document.getElementById("menuItemDate");

    if (!listEl && !formEl) return;

    const setFeedback = (message = "", state = "info") => {
      if (!feedbackEl) return;
      feedbackEl.textContent = message;
      if (message) {
        feedbackEl.dataset.state = state;
      } else {
        delete feedbackEl.dataset.state;
      }
    };

    const setDefaultDate = (force = false) => {
      if (!dateInput) return;
      if (!force && dateInput.value) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const iso = today.toISOString().slice(0, 10);
      dateInput.value = iso;
    };

    const asDate = (value) => {
      if (!value) return null;
      if (typeof value.toDate === "function") return value.toDate();
      const parsed = value instanceof Date ? value : new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatDate = (value) => {
      const date = asDate(value);
      if (!date) return "";
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(date);
    };

    const renderMenuItems = (snapshot) => {
      if (!listEl) return;
      listEl.innerHTML = "";

      if (snapshot.empty) {
        listEl.innerHTML = '<p class="text-subtle">No dishes added yet. Use the form above to publish today\'s menu.</p>';
        return;
      }

      // Filter items: keep only yesterday onwards (yesterday + today + future)
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const yesterdayKey = yesterday.toISOString().slice(0, 10);
      const cutoffTime = yesterday.getTime();

      const filteredItems = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        let itemDate = null;

        // Get the date from availableDate or availableDateString
        if (data.availableDate) {
          itemDate = typeof data.availableDate.toDate === 'function' 
            ? data.availableDate.toDate() 
            : new Date(data.availableDate);
        } else if (data.availableDateString) {
          itemDate = new Date(`${data.availableDateString}T00:00:00`);
        }

        // Only include items from yesterday onwards
        if (itemDate && itemDate.getTime() >= cutoffTime) {
          filteredItems.push({ id: doc.id, ...data });
        }
      });

      if (filteredItems.length === 0) {
        listEl.innerHTML = '<p class="text-subtle">No upcoming dishes. Add items for tomorrow or later.</p>';
        return;
      }

      // Sort by date, then by name
      filteredItems.sort((a, b) => {
        const getTime = (item) => {
          if (item.availableDate) {
            return typeof item.availableDate.toDate === 'function'
              ? item.availableDate.toDate().getTime()
              : new Date(item.availableDate).getTime();
          }
          return new Date(`${item.availableDateString || '9999-12-31'}T00:00:00`).getTime();
        };
        const timeA = getTime(a);
        const timeB = getTime(b);
        if (timeA !== timeB) return timeA - timeB;
        return (a.name || '').localeCompare(b.name || '');
      });

      filteredItems.forEach((data) => {
        const item = document.createElement("article");
        item.className = "menu-item-card";
        item.setAttribute("role", "listitem");

        const availableLabel = data.availableDate
          ? formatDate(data.availableDate)
          : formatDate(data.availableDateString);

        const metaParts = [];
        if (Array.isArray(data.mealPeriods) && data.mealPeriods.length) {
          metaParts.push(`${data.mealPeriods.join(" & ")} service`);
        }
        if (availableLabel) metaParts.push(availableLabel);

        const capacityTotal = Number.isFinite(data.capacity) ? data.capacity : null;
        const capacityRemaining = Number.isFinite(data.remainingCapacity)
          ? data.remainingCapacity
          : capacityTotal;
        const capacityLabel = capacityRemaining !== null
          ? `${capacityRemaining} of ${capacityTotal ?? capacityRemaining} servings available`
          : "";

        item.innerHTML = `
          <div class="menu-item-info">
            ${metaParts.length ? `<div class="menu-item-meta">${metaParts.map((part) => `<span>${part}</span>`).join("")}</div>` : ""}
            <h4>${data.name || "Menu Item"}</h4>
            <p>${data.description || ""}</p>
            <span class="status ${data.statusClass || "status--info"}">${data.status || ""}</span>
          </div>
          <div class="menu-item-actions">
            <span class="menu-item-price">${data.price || ""}</span>
            ${capacityLabel ? `<span class="menu-item-capacity">${capacityLabel}</span>` : ""}
          </div>
        `;

        listEl.appendChild(item);
      });
    };

    const renderCapacity = (snapshot) => {
      if (!capacityEl) return;
      capacityEl.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const card = document.createElement("article");
        card.className = "capacity-card";
        const percent = Number(data.loadPercent || 0);
        card.innerHTML = `
          <h4>${data.label || ""}</h4>
          <p>${data.batchSize || ""}</p>
          <div class="capacity-bar">
            <div class="capacity-fill" style="width: ${Math.min(percent, 100)}%"></div>
          </div>
        `;
        capacityEl.appendChild(card);
      });
    };

    let suppressResetFeedback = false;

    const handleSubmit = async (event) => {
      event.preventDefault();
      if (!formEl) return;

      const formData = new FormData(formEl);
      const name = String(formData.get("name") || "").trim();
      const priceValue = String(formData.get("price") || "").trim();
      const description = String(formData.get("description") || "").trim();
      const availableDate = String(formData.get("availableDate") || "").trim();
      const isDaily = formData.get("isDaily") !== null;
      const capacityRaw = String(formData.get("capacity") || "").trim();
      const mealPeriods = (formData.getAll("mealPeriods") || [])
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      if (!name || !priceValue) {
        setFeedback("Name and price are required.", "error");
        return;
      }

      const numericPrice = Number.parseFloat(priceValue);
      if (Number.isNaN(numericPrice) || numericPrice <= 0) {
        setFeedback("Enter a valid price greater than zero.", "error");
        return;
      }

      const capacityValue = Number.parseInt(capacityRaw, 10);
      if (Number.isNaN(capacityValue) || capacityValue <= 0) {
        setFeedback("Set a serving capacity greater than zero.", "error");
        return;
      }

      if (!mealPeriods.length) {
        setFeedback("Select at least one meal session (Lunch or Dinner).", "error");
        return;
      }

      submitBtn?.setAttribute("disabled", "true");
      setFeedback("Saving item...", "info");

      try {
        const timestamp = window.firebase.firestore.FieldValue.serverTimestamp();
        const formattedPrice = new Intl.NumberFormat("en-IN", {
          minimumFractionDigits: Number.isInteger(numericPrice) ? 0 : 2,
          maximumFractionDigits: 2,
        }).format(numericPrice);

        const payload = {
          name,
          description,
          price: `Rs. ${formattedPrice}`,
          priceValue: numericPrice,
          status: "Available today",
          statusClass: "status--success",
          isDailySpecial: Boolean(isDaily),
          capacity: capacityValue,
          remainingCapacity: capacityValue,
          mealPeriods,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        const dateSource = availableDate || dateInput?.value;
        if (dateSource) {
          const date = new Date(`${dateSource}T00:00:00`);
          const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
          safeDate.setHours(0, 0, 0, 0);
          const timestampCtor = window.firebase?.firestore?.Timestamp;
          if (timestampCtor && typeof timestampCtor.fromDate === "function") {
            payload.availableDate = timestampCtor.fromDate(safeDate);
          }
          payload.availableDateString = safeDate.toISOString().slice(0, 10);
        }

        await db.collection("menuItems").add(payload);

        suppressResetFeedback = true;
        formEl.reset();
        window.requestAnimationFrame(() => {
          suppressResetFeedback = false;
        });
        setFeedback("Menu item added to today\'s lineup.", "success");
      } catch (error) {
        console.error("Failed to create menu item:", error);
        setFeedback("Unable to add the menu item right now. Please try again.", "error");
      } finally {
        submitBtn?.removeAttribute("disabled");
      }
    };

    const handleReset = () => {
      window.requestAnimationFrame(() => {
        setDefaultDate(true);
        if (!suppressResetFeedback) {
          setFeedback("", "info");
        }
      });
    };

    const handleFocusClick = () => {
      if (!formEl) return;
      formEl.scrollIntoView({ behavior: "smooth", block: "center" });
      const nameInput = formEl.querySelector("input[name='name']");
      if (nameInput) {
        nameInput.focus({ preventScroll: true });
      }
    };

    if (formEl) {
      formEl.addEventListener("submit", handleSubmit);
      formEl.addEventListener("reset", handleReset);
      state.unsubscribers.push(() => {
        formEl.removeEventListener("submit", handleSubmit);
        formEl.removeEventListener("reset", handleReset);
      });
      setDefaultDate(true);
      setFeedback("", "info");
    }

    if (focusBtn && formEl) {
      focusBtn.addEventListener("click", handleFocusClick);
      state.unsubscribers.push(() => focusBtn.removeEventListener("click", handleFocusClick));
    }

    state.unsubscribers.push(
      db.collection("menuItems").orderBy("name").onSnapshot(renderMenuItems)
    );
  };

  const attachMessaging = (db) => {
    const listEl = document.getElementById("conversationList");
    const headerEl = document.getElementById("chatHeader");
    const messagesEl = document.getElementById("chatMessages");
    const filterEl = document.getElementById("conversationFilter");
    const formEl = document.getElementById("adminChatForm");
    const messageInput = document.getElementById("adminChatMessage");
    const sendBtn = document.getElementById("adminChatSend");
    const draftBtn = document.getElementById("adminChatDraft");

    if (!listEl || !headerEl || !messagesEl || !formEl || !messageInput || !sendBtn) return;

    const draftPrefix = "hk-admin-chat-draft:";
    let activeConversationId = null;
    let activeConversationData = null;
    let conversationDocs = [];
    let messageUnsub = null;
    let conversationUnsub = null;

    const getStatusClass = (status) => {
      if (!status) return "status status--info";
      const normalized = String(status).toLowerCase();
      if (normalized.includes("archived")) return "status status--warning";
      if (normalized.includes("reply")) return "status status--success";
      if (normalized.includes("open")) return "status status--info";
      return "status status--info";
    };

    const asDate = (value) => {
      if (!value) return null;
      if (typeof value.toDate === "function") {
        return value.toDate();
      }
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const formatDateTime = (value) => {
      if (window.app && typeof window.app.formatDateTime === "function") {
        return window.app.formatDateTime(value) || "";
      }
      const date = asDate(value);
      if (!date) return "";
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    };

    const formatRelative = (value) => {
      const date = asDate(value);
      if (!date) return "";
      const diffMs = Date.now() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    };

    const saveDraft = () => {
      if (!activeConversationId) return;
      const value = messageInput.value;
      if (!value) {
        localStorage.removeItem(`${draftPrefix}${activeConversationId}`);
      } else {
        localStorage.setItem(`${draftPrefix}${activeConversationId}`, value);
      }
    };

    const loadDraft = (conversationId) => {
      const stored = localStorage.getItem(`${draftPrefix}${conversationId}`);
      if (stored !== null) {
        messageInput.value = stored;
      } else {
        messageInput.value = "";
      }
    };

    const clearActiveSubscriptions = () => {
      if (typeof messageUnsub === "function") {
        messageUnsub();
      }
      if (typeof conversationUnsub === "function") {
        conversationUnsub();
      }
      messageUnsub = null;
      conversationUnsub = null;
    };

    const renderMessages = (conversationId) => {
      if (!conversationId) {
        messagesEl.innerHTML = '<p class="text-subtle">Select a conversation to view the thread.</p>';
        return;
      }

      const conversationRef = db.collection("conversations").doc(conversationId);
      clearActiveSubscriptions();

      conversationUnsub = conversationRef.onSnapshot(
        (doc) => {
          if (doc.exists) {
            activeConversationData = doc.data();
            updateChatHeader(activeConversationData);
          }
        },
        (error) => {
          console.error("Conversation listener error:", error);
        }
      );

      messageUnsub = conversationRef
        .collection("messages")
        .orderBy("sentAt")
        .onSnapshot(
          async (snapshot) => {
            messagesEl.innerHTML = "";

            if (snapshot.empty) {
              messagesEl.innerHTML = '<p class="text-subtle">No messages yet. Send a reply to get started.</p>';
            } else {
              snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const wrapper = document.createElement("div");
                wrapper.className = `msg ${data.from === "admin" ? "me" : "them"}`;

                const body = document.createElement("p");
                body.textContent = data.body || "";

                const meta = document.createElement("span");
                meta.className = "meta";
                meta.textContent = formatDateTime(data.sentAt);

                wrapper.append(body, meta);
                messagesEl.appendChild(wrapper);
              });
              messagesEl.scrollTop = messagesEl.scrollHeight;
            }

            const changes = typeof snapshot.docChanges === "function" ? snapshot.docChanges() : [];
            const hasNewCustomerMsg = changes.some(
              (change) => change.type === "added" && change.doc.data()?.from !== "admin"
            );

            if (hasNewCustomerMsg) {
              await markConversationRead(conversationId);
            }
          },
          (error) => {
            console.error("Messages listener error:", error);
            messagesEl.innerHTML = '<p class="text-subtle">Unable to load messages right now.</p>';
          }
        );
    };

    const selectConversation = (conversationId, data) => {
      if (!conversationId) {
        activeConversationId = null;
        activeConversationData = null;
        clearActiveSubscriptions();
        updateChatHeader(null);
        renderMessages(null);
        return;
      }

      activeConversationId = conversationId;
      activeConversationData = data || null;
      updateChatHeader(activeConversationData);
      renderMessages(conversationId);
      markConversationRead(conversationId);
      loadDraft(conversationId);

      listEl.querySelectorAll("li").forEach((item) => {
        const isActive = item.dataset.conversationId === conversationId;
        item.classList.toggle("active", isActive);
        if (isActive) {
          item.classList.remove("unread");
        }
      });
    };

    const renderConversationList = () => {
      const filter = filterEl ? filterEl.value : "open";
      listEl.innerHTML = "";

      const filtered = conversationDocs.filter((doc) => {
        const data = doc.data() || {};
        if (filter === "unread") {
          return Boolean(data.unreadByAdmin);
        }
        if (filter === "archived") {
          return String(data.status || "").toLowerCase().includes("archived");
        }
        return !String(data.status || "").toLowerCase().includes("archived");
      });

      if (!filtered.length) {
        listEl.innerHTML = '<li class="text-subtle">No conversations to show.</li>';
        clearActiveSubscriptions();
        updateChatHeader(null);
        messagesEl.innerHTML = '<p class="text-subtle">Select a conversation to view the thread.</p>';
        activeConversationId = null;
        activeConversationData = null;
        return;
      }

      filtered.forEach((doc) => {
        const data = doc.data() || {};
        const item = document.createElement("li");
        item.dataset.conversationId = doc.id;
        if (data.unreadByAdmin) item.classList.add("unread");

        item.innerHTML = `
          <div class="flex justify-between items-start gap-8">
            <div>
              <h3>${data.customerName || "Customer"}</h3>
              <p class="text-subtle">${data.customerEmail || ""}</p>
            </div>
            <span class="text-subtle">${formatRelative(data.lastMessageAt || data.updatedAt)}</span>
          </div>
          <p class="conversation-preview">${data.lastMessage || "No messages yet"}</p>
          <span class="${getStatusClass(data.status)}">${data.status || "open"}</span>
        `;

        item.addEventListener("click", () => {
          selectConversation(doc.id, data);
        });

        listEl.appendChild(item);
      });

      const stillVisible = filtered.some((doc) => doc.id === activeConversationId);
      if (!activeConversationId || !stillVisible) {
        const firstDoc = filtered[0];
        selectConversation(firstDoc.id, firstDoc.data() || {});
      } else {
        const currentDoc = filtered.find((doc) => doc.id === activeConversationId);
        if (currentDoc) {
          activeConversationData = currentDoc.data() || {};
          updateChatHeader(activeConversationData);
          listEl.querySelectorAll("li").forEach((item) => {
            const isActive = item.dataset.conversationId === activeConversationId;
            item.classList.toggle("active", isActive);
            if (isActive && !activeConversationData.unreadByAdmin) {
              item.classList.remove("unread");
            }
          });
        }
      }
    };

    const handleSend = async (event) => {
      event.preventDefault();
      if (!activeConversationId) return;

      const body = messageInput.value.trim();
      if (!body) return;

      sendBtn.disabled = true;

      try {
        const conversationRef = db.collection("conversations").doc(activeConversationId);
        const timestamp = window.firebase.firestore.FieldValue.serverTimestamp();

        await conversationRef.collection("messages").add({
          body,
          from: "admin",
          sentAt: timestamp,
        });

        await conversationRef.set(
          {
            lastMessage: body,
            lastSender: "admin",
            status: "replied",
            meta: "Kitchen replied just now",
            lastMessageAt: timestamp,
            updatedAt: timestamp,
            unreadByCustomer: true,
            unreadByAdmin: false,
          },
          { merge: true }
        );

        messageInput.value = "";
        localStorage.removeItem(`${draftPrefix}${activeConversationId}`);
      } catch (error) {
        console.error("Failed to send admin reply:", error);
      } finally {
        sendBtn.disabled = false;
      }
    };

    const handleDraftClick = (event) => {
      event.preventDefault();
      if (!activeConversationId) return;
      saveDraft();
      draftBtn.textContent = "Draft saved";
      draftBtn.disabled = true;
      setTimeout(() => {
        draftBtn.textContent = "Save draft";
        draftBtn.disabled = false;
      }, 1500);
    };

    if (filterEl) {
      filterEl.addEventListener("change", renderConversationList);
    }

    formEl.addEventListener("submit", handleSend);
    messageInput.addEventListener("input", saveDraft);
    if (draftBtn) {
      draftBtn.addEventListener("click", handleDraftClick);
    }

    state.unsubscribers.push(() => {
      clearActiveSubscriptions();
      if (filterEl) filterEl.removeEventListener("change", renderConversationList);
      formEl.removeEventListener("submit", handleSend);
      messageInput.removeEventListener("input", saveDraft);
      if (draftBtn) draftBtn.removeEventListener("click", handleDraftClick);
    });

    state.unsubscribers.push(
      db
        .collection("conversations")
        .orderBy("updatedAt", "desc")
        .limit(50)
        .onSnapshot(
          (snapshot) => {
            conversationDocs = snapshot.docs;
            renderConversationList();
          },
          (error) => {
            console.error("Conversation list listener error:", error);
            listEl.innerHTML = '<li class="text-subtle">Unable to load conversations.</li>';
          }
        )
    );
  };

  const attachReports = (db) => {
    const metricsEl = document.getElementById("reportMetrics");
    const highlightsEl = document.getElementById("reportHighlightsList");
    if (!metricsEl && !highlightsEl) return;

    const renderMetrics = (snapshot) => {
      if (!metricsEl) return;
      metricsEl.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const card = document.createElement("article");
        card.className = "card";
        card.setAttribute("role", "listitem");
        card.innerHTML = `
          <header class="card__header">
            <h3>${data.title || ""}</h3>
            ${data.badge ? `<span class="status">${data.badge}</span>` : ""}
          </header>
          <div class="card__body">
            <p class="stat-value">${data.value || "--"}</p>
            <p class="text-subtle">${data.subtitle || ""}</p>
          </div>
        `;
        metricsEl.appendChild(card);
      });
    };

    const renderHighlights = (snapshot) => {
      if (!highlightsEl) return;
      highlightsEl.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const card = document.createElement("article");
        card.className = "order-card";
        card.innerHTML = `
          <h4>${data.title || ""}</h4>
          <p>${data.description || ""}</p>
          <p class="text-subtle">${data.note || ""}</p>
        `;
        highlightsEl.appendChild(card);
      });
    };

    state.unsubscribers.push(
      db.collection("reportMetrics").orderBy("order", "asc").onSnapshot(renderMetrics),
      db.collection("reportHighlights").orderBy("order", "asc").onSnapshot(renderHighlights)
    );
  };

  const bootstrap = async () => {
    if (!window.firebase || !window.initializeFirebase) return;
    const initialized = window.initializeFirebase();
    if (!initialized) return;

    const db = window.firebase.firestore();
    const page = document.body.dataset.adminPage;

    cleanUp();

    if (page === "dashboard") {
      attachDashboardMetrics(db);
    } else if (page === "menu-management") {
      attachMenuManagement(db);
    } else if (page === "messaging") {
      attachMessaging(db);
    }
  };

  document.addEventListener("DOMContentLoaded", bootstrap);
  window.addEventListener("beforeunload", cleanUp);
})();