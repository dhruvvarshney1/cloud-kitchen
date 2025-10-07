export const messagingMethods = {
  startConversationsListener,
  renderConversations,
  loadChat,
  startCustomerChat,
  renderChat,
  sendMessage,
  ensureConversationDoc,
};

function startConversationsListener() {
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

function renderConversations(conversations) {
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

function loadChat(userId, containerId = "chatMessages") {
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

function startCustomerChat() {
  const notice = document.getElementById("customerChatNotice");
  if (!this.currentUser) {
    if (notice) notice.textContent = "Please log in to send messages.";
    return;
  }
  if (notice) notice.textContent = "You are messaging the admin.";
  const userId = this.currentUser.uid;
  this.loadChat(userId, "customerChatMessages");
  this.ensureConversationDoc(userId, {
    userId,
    userName: this.currentUser.name,
    userEmail: this.currentUser.email,
    updatedAt: Date.now(),
  });
}

function renderChat(messages, containerId) {
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

async function sendMessage(userId, text, sender) {
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

async function ensureConversationDoc(userId, data) {
  const convRef = window.firebase.doc(this.db, "conversations", userId);
  const snap = await window.firebase.getDoc(convRef);
  if (snap.exists()) {
    await window.firebase.updateDoc(convRef, data);
  } else {
    await window.firebase.setDoc(convRef, data);
  }
}

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
