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

  const fragments = document.createDocumentFragment();
  conversations.forEach((conversation) => {
    const li = document.createElement("li");
    li.dataset.conversationId = conversation.id;
    li.className = "conversation-item";
    li.innerHTML = `
      <div>
        <p>${conversation.displayName || conversation.email || "Unnamed User"}</p>
        <span>${conversation.lastMessage || "No messages yet"}</span>
      </div>
      <time>
        ${conversation.updatedAt ? new Date(conversation.updatedAt).toLocaleString() : ""}
      </time>
    `;
    li.addEventListener("click", () => this.loadChat(conversation.id));
    fragments.appendChild(li);
  });

  ul.innerHTML = "";
  ul.appendChild(fragments);
}

async function loadChat(conversationId) {
  if (!conversationId || !this.db) return;
  this.activeConversation = { id: conversationId };
  const chatHeader = document.getElementById("chatHeader");
  if (chatHeader)
    chatHeader.textContent = "Loading conversation...";

  const messagesUl = document.getElementById("chatMessages");
  if (messagesUl) {
    messagesUl.innerHTML = `
      <div class="skeleton-wrapper">
        <div class="skeleton skeleton--title"></div>
        <div class="skeleton skeleton--text"></div>
        <div class="skeleton skeleton--text"></div>
      </div>
    `;
  }

  const convRef = window.firebase.doc(this.db, "conversations", conversationId);
  const conv = await window.firebase.getDoc(convRef);
  if (!conv.exists()) {
    this.showNotification("Conversation not found", "error");
    return;
  }
  const convData = conv.data();
  this.activeConversation = {
    id: conversationId,
    ...convData,
  };
  if (chatHeader)
    chatHeader.textContent = convData.displayName || convData.email || "Customer";

  if (this.unsubscribeChat) this.unsubscribeChat();
  const messagesRef = window.firebase.collection(convRef, "messages");
  const q = window.firebase.query(messagesRef, window.firebase.orderBy("timestamp"));
  this.unsubscribeChat = window.firebase.onSnapshot(
    q,
    (snap) => {
      const messages = [];
      snap.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));
      this.renderChat(messages);
    },
    (err) => {
      console.error("Messages listener error", err);
      this.showNotification("Error loading messages", "error");
    }
  );
}

function renderChat(messages) {
  const messagesUl = document.getElementById("chatMessages");
  if (!messagesUl) return;
  if (!messages.length) {
    messagesUl.innerHTML = "<li>No messages yet</li>";
    return;
  }

  const fragments = document.createDocumentFragment();
  messages.forEach((message) => {
    const li = document.createElement("li");
    li.dataset.messageId = message.id;
    li.className = `chat-bubble ${message.sender === "admin" ? "sent" : "received"}`;
    li.innerHTML = `
      <p>${message.body || ""}</p>
      <time>${message.timestamp ? new Date(message.timestamp).toLocaleString() : ""}</time>
    `;
    fragments.appendChild(li);
  });

  messagesUl.innerHTML = "";
  messagesUl.appendChild(fragments);
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

async function startCustomerChat() {
  if (!this.currentUser || !this.db) return;

  const conversationId = this.currentUser.uid;
  this.activeConversation = {
    id: conversationId,
    userId: this.currentUser.uid,
    displayName: this.currentUser.displayName || this.currentUser.email,
  };

  await this.ensureConversationDoc();

  const messagesRef = window.firebase.collection(
    window.firebase.doc(this.db, "conversations", conversationId),
    "messages"
  );
  const q = window.firebase.query(messagesRef, window.firebase.orderBy("timestamp"));
  if (this.unsubscribeChat) this.unsubscribeChat();
  this.unsubscribeChat = window.firebase.onSnapshot(
    q,
    (snap) => {
      const messages = [];
      snap.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));
      this.renderChat(messages);
    },
    (err) => {
      console.error("Customer chat listener error", err);
      this.showNotification("Error loading chat", "error");
    }
  );
}

async function sendMessage(messageBody) {
  if (!this.db) return;
  if (!messageBody || !messageBody.trim()) {
    this.showNotification("Cannot send an empty message", "warning");
    return;
  }

  const conversationId = this.activeConversation?.id;
  if (!conversationId) {
    this.showNotification("Select a conversation first", "warning");
    return;
  }

  const conversationRef = window.firebase.doc(this.db, "conversations", conversationId);
  const messagesRef = window.firebase.collection(conversationRef, "messages");

  const newMessage = {
    body: messageBody,
    sender: this.currentUser?.role === "admin" ? "admin" : "customer",
    timestamp: Date.now(),
  };

  try {
    await window.firebase.addDoc(messagesRef, newMessage);
    await this.ensureConversationDoc(newMessage.body);
    const input = document.getElementById("chatMessage");
    if (input) input.value = "";
  } catch (error) {
    console.error("Error sending message", error);
    this.showNotification("Failed to send message", "error");
  }
}

async function ensureConversationDoc(lastMessageOverride) {
  if (!this.db || !this.currentUser) return;

  const conversationId = this.activeConversation?.id || this.currentUser.uid;
  const conversationRef = window.firebase.doc(this.db, "conversations", conversationId);

  const summaryData = {
    userId: this.currentUser.uid,
    displayName: this.currentUser.displayName || this.currentUser.email,
    email: this.currentUser.email,
    updatedAt: Date.now(),
    lastMessage: lastMessageOverride || this.activeConversation?.lastMessage || "",
  };

  try {
    await window.firebase.setDoc(
      conversationRef,
      {
        ...summaryData,
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error ensuring conversation doc", error);
  }
}
