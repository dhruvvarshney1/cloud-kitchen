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
          const statusSpan = document.createElement("span");
          statusSpan.className = "status";
          const status = (order.status || "").toLowerCase();
          if (status.includes("ready")) statusSpan.classList.add("status--success");
          else if (status.includes("prepar")) statusSpan.classList.add("status--warning");
          else if (status.includes("pending")) statusSpan.classList.add("status--info");
          statusSpan.textContent = order.status || "";

          footer.appendChild(statusSpan);

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
    const capacityEl = document.getElementById("prepCapacity");
    if (!listEl && !capacityEl) return;

    const renderMenuItems = (snapshot) => {
      if (!listEl) return;
      listEl.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("article");
        item.className = "menu-item-card";
        item.setAttribute("role", "listitem");
        item.innerHTML = `
          <div class="menu-item-info">
            <h4>${data.name || "Menu Item"}</h4>
            <p>${data.description || ""}</p>
            <span class="status ${data.statusClass || "status--info"}">${data.status || ""}</span>
          </div>
          <div class="menu-item-actions">
            <span class="menu-item-price">${data.price || ""}</span>
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

    state.unsubscribers.push(
      db.collection("menuItems").orderBy("name").onSnapshot(renderMenuItems),
      db.collection("prepCapacity").orderBy("label").onSnapshot(renderCapacity)
    );
  };

  const attachMessaging = (db) => {
    const listEl = document.getElementById("conversationList");
    const headerEl = document.getElementById("chatHeader");
    const messagesEl = document.getElementById("chatMessages");
    if (!listEl || !headerEl || !messagesEl) return;

    let activeConversationId = null;

    const renderMessages = (conversationId) => {
      if (!conversationId) {
        messagesEl.innerHTML = "";
        headerEl.innerHTML = "";
        return;
      }

      const unsub = db
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .orderBy("sentAt")
        .onSnapshot((snapshot) => {
          messagesEl.innerHTML = "";
          snapshot.forEach((doc) => {
            const data = doc.data();
            const msg = document.createElement("div");
            msg.className = `msg ${data.from === "admin" ? "me" : "them"}`;
            msg.innerHTML = `
              <p>${data.body || ""}</p>
              <span class="meta">${data.sentAt?.toDate?.().toLocaleString?.() || ""}</span>
            `;
            messagesEl.appendChild(msg);
          });
          messagesEl.scrollTop = messagesEl.scrollHeight;
        });

      state.unsubscribers.push(unsub);
    };

    const renderConversationList = (snapshot) => {
      listEl.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("li");
        item.innerHTML = `
          <h3>${data.customerName || "Customer"}</h3>
          <p>${data.lastMessage || ""}</p>
          <span class="status">${data.status || ""}</span>
        `;
        item.addEventListener("click", () => {
          activeConversationId = doc.id;
          listEl.querySelectorAll("li").forEach((li) => li.classList.remove("active"));
          item.classList.add("active");
          headerEl.innerHTML = `
            <div>
              <h2>${data.customerName || "Conversation"}</h2>
              <p class="text-subtle">${data.meta || ""}</p>
            </div>
          `;
          renderMessages(activeConversationId);
        });
        listEl.appendChild(item);
      });

      if (!activeConversationId && snapshot.docs.length) {
        const first = snapshot.docs[0];
        activeConversationId = first.id;
        const firstData = first.data();
        headerEl.innerHTML = `
          <div>
            <h2>${firstData.customerName || "Conversation"}</h2>
            <p class="text-subtle">${firstData.meta || ""}</p>
          </div>
        `;
        renderMessages(first.id);
        listEl.firstElementChild?.classList.add("active");
      }
    };

    state.unsubscribers.push(
      db
        .collection("conversations")
        .orderBy("updatedAt", "desc")
        .limit(25)
        .onSnapshot(renderConversationList)
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
    } else if (page === "reports") {
      attachReports(db);
    }
  };

  document.addEventListener("DOMContentLoaded", bootstrap);
  window.addEventListener("beforeunload", cleanUp);
})();