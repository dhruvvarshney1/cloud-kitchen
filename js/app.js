// Main Application Logic
// Handles core app functionality, navigation, and user interface

class CloudKitchenApp {
  constructor() {
    this.currentUser = null;
    this.cart = [];
    this.orders = [];
    this.menuItems = [];
  this.orderMenuData = { items: [], map: new Map() };
    this.accountProfileLoaded = false;
    this.accountProfileData = null;
    this.accountRedirectTimer = null;
    this.authStateReady = false;
    this.accountConversationRef = null;
    this.accountConversationUnsub = null;
    this.accountMessagesUnsub = null;
    
    this.init();
  }

  async init() {
    // Initialize Firebase
    if (typeof initializeFirebase === 'function') {
      initializeFirebase();
    }
    
    // Setup auth state listener
    if (typeof onAuthStateChange === 'function') {
      onAuthStateChange((user) => {
        this.currentUser = user;
        this.authStateReady = true;
        this.updateAuthUI();
      });
    }
    
    // Initialize page-specific functionality
    this.initializePage();
    
    // Setup global event listeners
    this.setupEventListeners();
  }

  initializePage() {
    const currentPage = document.body.dataset.page;
    
    switch (currentPage) {
      case 'landing':
        this.initLandingPage();
        break;
      case 'login':
        this.initLoginPage();
        break;
      case 'signup':
        this.initSignupPage();
        break;
      case 'menu':
        this.initMenuPage();
        break;
      case 'order':
        this.initOrderPage();
        break;
      case 'account':
        this.initAccountPage();
        break;
      default:
        if (document.body.dataset.adminPage) {
          this.initAdminPage();
        }
    }
  }

  setupEventListeners() {

    // Navigation auth button
    const navAuthBtn = document.getElementById('navAuthBtn');
    if (navAuthBtn) {
      navAuthBtn.addEventListener('click', (e) => {
        if (this.currentUser && navAuthBtn.textContent.trim() === 'Logout') {
          e.preventDefault();
          this.handleLogout();
        }
      });
    }
  }

  updateAuthUI() {
    const navAuthBtn = document.getElementById('navAuthBtn');
    const profileAvatars = document.querySelectorAll('.profile-avatar');

    if (!navAuthBtn) {
      profileAvatars.forEach((link) => {
        link.classList.add('hidden');
        link.setAttribute('aria-hidden', 'true');

        const img = link.querySelector('.profile-avatar__img');
        if (!img) {
          return;
        }

        const defaultSrc = img.dataset.defaultSrc || img.getAttribute('src');
        if (defaultSrc) {
          img.src = defaultSrc;
          img.dataset.placeholderActive = 'true';
        }
      });
      this.syncAccountAuthState();
      return;
    }

    if (this.currentUser) {
      navAuthBtn.textContent = 'Logout';
      navAuthBtn.href = '#';

      profileAvatars.forEach((link) => {
        link.classList.remove('hidden');
        link.removeAttribute('aria-hidden');

        const img = link.querySelector('.profile-avatar__img');
        if (!img) {
          return;
        }

        const defaultSrc = img.dataset.defaultSrc || img.getAttribute('src');

        if (this.currentUser.photoURL) {
          img.src = this.currentUser.photoURL;
          delete img.dataset.placeholderActive;
        } else {
          img.src = defaultSrc;
          img.dataset.placeholderActive = 'true';
        }
      });
    } else {
      navAuthBtn.textContent = 'Login';
      navAuthBtn.href = './login.html';

      profileAvatars.forEach((link) => {
        link.classList.add('hidden');
        link.setAttribute('aria-hidden', 'true');

        const img = link.querySelector('.profile-avatar__img');
        if (!img) {
          return;
        }

        const defaultSrc = img.dataset.defaultSrc || img.getAttribute('src');
        if (defaultSrc) {
          img.src = defaultSrc;
          img.dataset.placeholderActive = 'true';
        }
      });
    }

    this.syncAccountAuthState();
  }

  async handleLogout() {
    try {
      if (typeof signOut === 'function') {
        await signOut();
        this.teardownAccountMessaging();
        this.showMessage('Logged out successfully', 'success');
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          const isAdminRoute = window.location.pathname.includes('/admin/');
          const redirectTarget = isAdminRoute ? '../index.html' : './index.html';
          window.location.href = redirectTarget;
        }, 1000);
      }
    } catch (error) {
      console.error('Logout error:', error);
      this.showMessage('Error logging out', 'error');
    }
  }

  initLandingPage() {
    // Landing page specific initialization
    console.log('Landing page initialized');
  }

  initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin(e.target);
      });
    }

    // Setup password toggle
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePasswordBtn && passwordInput) {
      togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
        togglePasswordBtn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      });
    }
  }

  initSignupPage() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSignup(e.target);
      });
    }

    // Setup password toggle for signup password
    const toggleSignupPasswordBtn = document.getElementById('toggleSignupPassword');
    const signupPasswordInput = document.getElementById('signupPassword');
    
    if (toggleSignupPasswordBtn && signupPasswordInput) {
      toggleSignupPasswordBtn.addEventListener('click', () => {
        const isPassword = signupPasswordInput.type === 'password';
        signupPasswordInput.type = isPassword ? 'text' : 'password';
        toggleSignupPasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
        toggleSignupPasswordBtn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      });
    }

    // Setup password toggle for confirm password
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (toggleConfirmPasswordBtn && confirmPasswordInput) {
      toggleConfirmPasswordBtn.addEventListener('click', () => {
        const isPassword = confirmPasswordInput.type === 'password';
        confirmPasswordInput.type = isPassword ? 'text' : 'password';
        toggleConfirmPasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
        toggleConfirmPasswordBtn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      });
    }
  }

  initMenuPage() {
    this.loadMenu();
  }

  initOrderPage() {
    this.loadOrderForm();
    
    const orderForm = document.getElementById('scheduled-order-form');
    if (orderForm) {
      orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleOrderSubmit(orderForm);
      });
    }

    // Auto-fill customer details from profile after auth is ready
    this.waitForAuthThenAutoFill();
  }

  async waitForAuthThenAutoFill() {
    // If auth is already ready, auto-fill immediately
    if (this.authStateReady) {
      if (this.currentUser) {
        await this.autoFillOrderDetails();
      }
      return;
    }

    // Otherwise, wait up to 3 seconds for auth state
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (this.authStateReady || Date.now() - startTime > 3000) {
        clearInterval(checkInterval);
        if (this.currentUser) {
          this.autoFillOrderDetails();
        }
      }
    }, 100);
  }

  async autoFillOrderDetails() {
    if (!this.currentUser) {
      return;
    }

    try {
      const profile = typeof getUserProfile === 'function'
        ? await getUserProfile(this.currentUser.uid)
        : null;

      if (profile) {
        const nameInput = document.getElementById('scheduled-name');
        const phoneInput = document.getElementById('scheduled-phone');
        const addressInput = document.getElementById('scheduled-address');

        if (nameInput && profile.name) {
          nameInput.value = profile.name;
        }
        if (phoneInput && profile.phone) {
          phoneInput.value = profile.phone;
        }
        if (addressInput && profile.address) {
          addressInput.value = profile.address;
        }
      } else {
        // Profile not found - user needs to complete their profile
        console.warn('User profile not found. User may need to complete their profile.');
      }
    } catch (error) {
      console.error('Error auto-filling order details:', error);
      // Show subtle notification that auto-fill failed
      this.showMessage('Could not load your saved details. Please enter manually.', 'info');
    }
  }

  initAdminPage() {
    // Admin page initialization
    if (this.currentUser) {
      this.checkAdminAccess();
    }
  }

  initAccountPage() {
    const profileForm = document.getElementById('accountProfileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.handleAccountProfileSubmit(profileForm);
      });
    }

    const chatForm = document.getElementById('accountChatForm');
    if (chatForm) {
      chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.handleAccountChatSubmit(chatForm);
      });
    }

    this.setAccountChatDisabled(true);

    this.syncAccountAuthState();
  }

  async handleAccountProfileSubmit(form) {
    if (!this.currentUser) {
      this.showInlineMessage('accountProfileFeedback', 'Please log in first.', 'warning');
      return;
    }

    const name = form.name?.value.trim();
    const phone = form.phone?.value.trim();
    const address = form.address?.value.trim();

    if (!name || !phone || !address) {
      this.showInlineMessage('accountProfileFeedback', 'All fields are required.', 'error');
      return;
    }

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    this.setAccountFormDisabled('accountProfileFieldset', true);

    try {
      await this.updateUserProfile({ name, phone, address });
      this.accountProfileData = {
        ...(this.accountProfileData || {}),
        name,
        phone,
        address
      };
      await this.ensureConversationDoc(this.accountProfileData);
      await this.updateConversationContactDetails({ name, phone, address });
      await this.attachAccountMessaging(true);
      this.showInlineMessage('accountProfileFeedback', 'Profile updated successfully.', 'success');
    } catch (error) {
      console.error('Profile update error:', error);
      this.showInlineMessage('accountProfileFeedback', 'Unable to save changes right now. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
      this.setAccountFormDisabled('accountProfileFieldset', false);
    }
  }

  async handleAccountChatSubmit(form) {
    if (!this.currentUser) {
      this.showInlineMessage('accountChatFeedback', 'Please log in first.', 'warning');
      return;
    }

    const input = form.querySelector('#accountChatInput');
    const sendBtn = form.querySelector('#accountChatSend');
    const message = input?.value.trim();

    if (!message) {
      this.showInlineMessage('accountChatFeedback', 'Message cannot be empty.', 'error');
      return;
    }

    if (sendBtn) {
      sendBtn.disabled = true;
    }

    this.showInlineMessage('accountChatFeedback', 'Sending message…');

    try {
      await this.sendConversationMessage(message, 'customer');
      if (input) {
        input.value = '';
        input.focus();
      }
      this.showInlineMessage('accountChatFeedback', 'Message sent!', 'success');
      setTimeout(() => {
        this.showInlineMessage('accountChatFeedback', '');
      }, 2500);
    } catch (error) {
      console.error('Send chat message error:', error);
      this.showInlineMessage('accountChatFeedback', 'Unable to send message right now. Please try again.', 'error');
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
      }
    }
  }

  async loadAccountProfile() {
    if (!this.currentUser) {
      return;
    }

    this.setAccountFormDisabled('accountProfileFieldset', true);
    this.setAccountChatDisabled(true);
    this.showInlineMessage('accountChatFeedback', 'Loading your conversation…');

    try {
      const profile = typeof getUserProfile === 'function'
        ? await getUserProfile(this.currentUser.uid)
        : null;

      this.accountProfileData = profile || {};
      this.fillAccountProfileForm(this.accountProfileData);
      this.accountProfileLoaded = true;
      await this.ensureConversationDoc(this.accountProfileData);
      await this.attachAccountMessaging(true);
      this.setAccountFormDisabled('accountProfileFieldset', false);
      this.setAccountChatDisabled(false);
      this.showInlineMessage('accountProfileFeedback', '');
      this.showInlineMessage('accountChatFeedback', '');
    } catch (error) {
      console.error('Load profile error:', error);
      this.showInlineMessage('accountProfileFeedback', 'We could not load your details. Please refresh the page.', 'error');
      this.showInlineMessage('accountChatFeedback', 'Unable to load chat right now.', 'error');
      this.setAccountFormDisabled('accountProfileFieldset', false);
      this.setAccountChatDisabled(false);
    }
  }

  fillAccountProfileForm(profile = {}) {
    const nameInput = document.getElementById('accountName');
    const phoneInput = document.getElementById('accountPhone');
    const addressInput = document.getElementById('accountAddress');
    const emailValue = document.getElementById('accountEmailValue');
    const memberSinceValue = document.getElementById('accountMemberSince');
    const greeting = document.getElementById('accountGreeting');

    if (nameInput) {
      nameInput.value = profile.name || this.currentUser?.displayName || '';
    }
    if (phoneInput) {
      phoneInput.value = profile.phone || '';
    }
    if (addressInput) {
      addressInput.value = profile.address || '';
    }
    if (emailValue) {
      emailValue.textContent = this.currentUser?.email || '—';
    }
    if (memberSinceValue) {
      const joinDate = profile.createdAt || this.currentUser?.metadata?.creationTime;
      memberSinceValue.textContent = this.formatDate(joinDate) || '—';
    }
    if (greeting) {
      const name = profile.name || this.currentUser?.displayName || 'there';
      greeting.textContent = `Hello ${name}!`;
    }
  }

  syncAccountAuthState() {
    if (document.body.dataset.page !== 'account') {
      return;
    }

    if (!this.authStateReady) {
      return;
    }

    if (this.accountRedirectTimer) {
      clearTimeout(this.accountRedirectTimer);
      this.accountRedirectTimer = null;
    }

    if (!this.currentUser) {
      this.accountProfileLoaded = false;
      this.accountProfileData = null;
      this.setAccountFormDisabled('accountProfileFieldset', true);
      this.setAccountChatDisabled(true);
      this.teardownAccountMessaging();
      this.showInlineMessage('accountAuthFeedback', 'Please log in to manage your account. Redirecting to login…', 'warning');
      this.showInlineMessage('accountChatFeedback', 'Login required to chat with the kitchen team.', 'warning');

      this.accountRedirectTimer = setTimeout(() => {
        window.location.href = './login.html';
      }, 1800);
      return;
    }

    this.showInlineMessage('accountAuthFeedback', '');

    if (!this.accountProfileLoaded) {
      this.setAccountFormDisabled('accountProfileFieldset', true);
      this.setAccountChatDisabled(true);
      this.showInlineMessage('accountChatFeedback', 'Loading your conversation…');
      this.loadAccountProfile();
    } else {
      this.setAccountFormDisabled('accountProfileFieldset', false);
      this.setAccountChatDisabled(false);
      this.attachAccountMessaging();
    }
  }

  async updateUserProfile(updates) {
    const firestore = this.getFirestore();
    if (!firestore || !this.currentUser) {
      throw new Error('Firestore unavailable');
    }

    const payload = {
      ...updates,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    };

    await firestore.collection('users').doc(this.currentUser.uid).set(payload, { merge: true });
  }

  getFirestore() {
    if (!window.firebase) {
      return null;
    }

    if (!window.firebase.apps || window.firebase.apps.length === 0) {
      if (typeof initializeFirebase === 'function') {
        initializeFirebase();
      }
    }

    return window.firebase.firestore ? window.firebase.firestore() : null;
  }

  async fetchMenuItemsFromFirestore() {
    const firestore = this.getFirestore();
    if (!firestore) {
      return [];
    }

    try {
      const snapshot = await firestore.collection('menuItems').get();
      const results = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
      return results;
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      return [];
    }
  }

  formatFullDate(value) {
    if (!value) {
      return '';
    }

    if (value && typeof value.toDate === 'function') {
      value = value.toDate();
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  formatCurrency(value) {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return String(value);
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(numericValue);
  }

  setAccountFormDisabled(fieldsetId, disabled) {
    const fieldset = document.getElementById(fieldsetId);
    if (!fieldset) {
      return;
    }

    fieldset.disabled = Boolean(disabled);
  }

  setAccountChatDisabled(disabled) {
    const input = document.getElementById('accountChatInput');
    const sendBtn = document.getElementById('accountChatSend');

    if (input) {
      input.disabled = Boolean(disabled);
    }
    if (sendBtn) {
      sendBtn.disabled = Boolean(disabled);
    }
  }

  teardownAccountMessaging() {
    if (this.accountConversationUnsub) {
      this.accountConversationUnsub();
      this.accountConversationUnsub = null;
    }

    if (this.accountMessagesUnsub) {
      this.accountMessagesUnsub();
      this.accountMessagesUnsub = null;
    }

    this.accountConversationRef = null;

    const messagesEl = document.getElementById('accountChatMessages');
    if (messagesEl) {
      messagesEl.innerHTML = '';
    }
  }

  async attachAccountMessaging(force = false) {
    if (document.body.dataset.page !== 'account') {
      return;
    }

    if (!this.currentUser) {
      return;
    }

    const firestore = this.getFirestore();
    if (!firestore) {
      this.showInlineMessage('accountChatFeedback', 'Chat is unavailable right now.', 'error');
      return;
    }

    if (this.accountMessagesUnsub && !force) {
      return;
    }

    this.teardownAccountMessaging();

    const conversationRef = firestore.collection('conversations').doc(this.currentUser.uid);
    await this.ensureConversationDoc(this.accountProfileData);
    this.accountConversationRef = conversationRef;

    this.accountConversationUnsub = conversationRef.onSnapshot(
      (doc) => {
        if (!doc.exists) {
          return;
        }

        const data = doc.data() || {};
        if (!data.customerName && (this.accountProfileData?.name || this.currentUser?.displayName)) {
          this.updateConversationContactDetails();
        }
      },
      (error) => {
        console.error('Account conversation listener error:', error);
      }
    );

    this.accountMessagesUnsub = conversationRef
      .collection('messages')
      .orderBy('sentAt')
      .onSnapshot(
        (snapshot) => {
          this.renderAccountMessages(snapshot);
        },
        (error) => {
          console.error('Account chat listener error:', error);
          this.showInlineMessage('accountChatFeedback', 'Unable to load messages right now.', 'error');
        }
      );

    this.setAccountChatDisabled(false);
    this.showInlineMessage('accountChatFeedback', '');
  }

  async ensureConversationDoc(profile = {}) {
    const firestore = this.getFirestore();
    if (!firestore || !this.currentUser) {
      return null;
    }

    const conversationRef = firestore.collection('conversations').doc(this.currentUser.uid);
    const snapshot = await conversationRef.get();

    const baseDetails = {
      userId: this.currentUser.uid,
      customerEmail: this.currentUser.email || '',
      customerName: profile.name || this.currentUser.displayName || '',
      customerPhone: profile.phone || '',
      customerAddress: profile.address || ''
    };

    if (!snapshot.exists) {
      const timestamp = window.firebase.firestore.FieldValue.serverTimestamp();
      await conversationRef.set({
        ...baseDetails,
        status: 'open',
        lastMessage: '',
        lastSender: '',
        createdAt: timestamp,
        updatedAt: timestamp
      });
    } else {
      const existing = snapshot.data() || {};
      const updates = {};
      ['customerName', 'customerEmail', 'customerPhone', 'customerAddress'].forEach((key) => {
        if (baseDetails[key] && baseDetails[key] !== existing[key]) {
          updates[key] = baseDetails[key];
        }
      });

      if (Object.keys(updates).length) {
        await conversationRef.set(updates, { merge: true });
      }
    }

    return conversationRef;
  }

  async updateConversationContactDetails(details = {}) {
    const firestore = this.getFirestore();
    if (!firestore || !this.currentUser) {
      return;
    }

    const conversationRef = firestore.collection('conversations').doc(this.currentUser.uid);
    const payload = {
      customerName: details.name ?? this.accountProfileData?.name ?? this.currentUser?.displayName ?? '',
      customerPhone: details.phone ?? this.accountProfileData?.phone ?? '',
      customerAddress: details.address ?? this.accountProfileData?.address ?? '',
      customerEmail: this.currentUser.email || ''
    };

    await conversationRef.set(payload, { merge: true });
  }

  async sendConversationMessage(body, sender = 'customer') {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const firestore = this.getFirestore();
    if (!firestore) {
      throw new Error('Firestore unavailable');
    }

    const conversationRef = firestore.collection('conversations').doc(this.currentUser.uid);
    await this.ensureConversationDoc(this.accountProfileData);
    this.accountConversationRef = conversationRef;

    const messageTimestamp = window.firebase.firestore.FieldValue.serverTimestamp();

    await conversationRef.collection('messages').add({
      body,
      from: sender,
      sentAt: messageTimestamp
    });

    const status = sender === 'customer' ? 'open' : 'replied';
    const meta = sender === 'customer' ? 'Customer messaged just now' : 'Kitchen responded just now';
    const updateTimestamp = window.firebase.firestore.FieldValue.serverTimestamp();

    await conversationRef.set({
      userId: this.currentUser.uid,
      customerName: this.accountProfileData?.name || this.currentUser?.displayName || '',
      customerEmail: this.currentUser.email || '',
      customerPhone: this.accountProfileData?.phone || '',
      customerAddress: this.accountProfileData?.address || '',
      lastMessage: body,
      lastSender: sender,
      status,
      meta,
      lastMessageAt: updateTimestamp,
      updatedAt: updateTimestamp,
      unreadByAdmin: sender === 'customer',
      unreadByCustomer: sender === 'admin'
    }, { merge: true });
  }

  renderAccountMessages(snapshot) {
    const container = document.getElementById('accountChatMessages');
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (snapshot.empty) {
      const placeholder = document.createElement('p');
      placeholder.className = 'text-subtle account-chat-placeholder';
      placeholder.textContent = 'No messages yet. Start the conversation!';
      container.appendChild(placeholder);
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const wrapper = document.createElement('div');
      wrapper.className = `msg ${data.from === 'customer' ? 'me' : 'them'}`;

      const messageText = document.createElement('p');
      messageText.textContent = data.body || '';

      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = this.formatDateTime(data.sentAt);

      wrapper.append(messageText, meta);
      container.appendChild(wrapper);
    });

    container.scrollTop = container.scrollHeight;

    const hasNewMessages = typeof snapshot.docChanges === 'function'
      ? snapshot.docChanges().some((change) => change.type !== 'removed')
      : true;

    if (hasNewMessages && this.accountConversationRef) {
      this.accountConversationRef.set({ unreadByCustomer: false }, { merge: true }).catch((error) => {
        console.error('Failed to mark messages as read:', error);
      });
    }
  }

  showInlineMessage(targetId, text, type = 'info') {
    const el = document.getElementById(targetId);
    if (!el) {
      return;
    }

    el.classList.remove('account-message--error', 'account-message--success', 'account-message--warning');

    if (!text) {
      el.textContent = '';
      return;
    }

    el.textContent = text;

    switch (type) {
      case 'success':
        el.classList.add('account-message--success');
        break;
      case 'error':
        el.classList.add('account-message--error');
        break;
      case 'warning':
        el.classList.add('account-message--warning');
        break;
      default:
        break;
    }
  }

  formatDate(value) {
    if (!value) {
      return '';
    }

    if (value && typeof value.toDate === 'function') {
      value = value.toDate();
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short'
    }).format(date);
  }

  formatDateTime(value) {
    if (!value) {
      return '';
    }

    if (value && typeof value.toDate === 'function') {
      value = value.toDate();
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  async handleLogin(form) {
    const email = form.email.value.trim();
    const password = form.password.value;

    try {
      this.showMessage('Logging in...', 'info');
      
      if (typeof signIn === 'function') {
        await signIn(email, password);
        this.showMessage('Login successful!', 'success');
        
        // Redirect based on user role
        setTimeout(() => {
          this.redirectAfterLogin();
        }, 1000);
      }
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  async handleSignup(form) {
    const email = form.email.value.trim();
    const password = form.password.value;
    const name = form.name?.value || '';
    const phone = form.phone?.value || '';

    try {
      this.showMessage('Creating account...', 'info');
      
      if (typeof signUp === 'function') {
        await signUp(email, password, { name, phone });
        this.showMessage('Account created successfully!', 'success');
        
        setTimeout(() => {
          window.location.href = './index.html';
        }, 1000);
      }
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  async redirectAfterLogin() {
    if (this.currentUser && typeof getUserProfile === 'function') {
      const profile = await getUserProfile(this.currentUser.uid);
      
      if (profile?.role === 'admin') {
        window.location.href = './admin/dashboard.html';
      } else {
        window.location.href = './index.html';
      }
    }
  }

  async checkAdminAccess() {
    if (this.currentUser && typeof getUserProfile === 'function') {
      const profile = await getUserProfile(this.currentUser.uid);
      
      if (profile?.role !== 'admin') {
        this.showMessage('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
          window.location.href = './index.html';
        }, 2000);
      }
    }
  }

  loadMenu() {
    // Placeholder for future menu-page data binding
    console.log('Loading menu...');
  }

  async loadOrderForm() {
    const dateSelect = document.getElementById('delivery-date');
    const timeSelect = document.getElementById('delivery-time');
    const menuCard = document.getElementById('menu-of-the-day');
    const menuContainer = document.getElementById('daily-menu-items');
    const deliveryCard = document.getElementById('delivery-details');
    const summaryItems = document.getElementById('summary-items');
    const subtotalEl = document.getElementById('subtotal');
    const deliveryFeeEl = document.getElementById('delivery-fee');
    const totalEl = document.getElementById('total');

    if (!dateSelect || !timeSelect || !menuCard || !menuContainer || !deliveryCard || !summaryItems || !subtotalEl || !deliveryFeeEl || !totalEl) {
      return;
    }

    const DELIVERY_FEE = 30;
    this.orderMenuData.selection = {};

    const serviceOptions = [
      { value: 'Lunch', label: 'Lunch (13:00 - 14:00)' },
      { value: 'Dinner', label: 'Dinner (19:00 - 20:00)' }
    ];

    const formatMoney = (value) => this.formatCurrency(value ?? 0) || `₹${Math.max(Number(value || 0), 0).toFixed(2)}`;

    const resetSummary = () => {
      summaryItems.innerHTML = '<p class="text-subtle">Add dishes to see your bill.</p>';
      subtotalEl.textContent = formatMoney(0);
      deliveryFeeEl.textContent = formatMoney(0);
      totalEl.textContent = formatMoney(0);
    };

    const showDeliveryCard = () => {
      deliveryCard.classList.remove('hidden');
    };

    const hideDeliveryCard = () => {
      deliveryCard.classList.add('hidden');
    };

    resetSummary();
    hideDeliveryCard();

    const toDateKey = (value) => {
      if (!value) {
        return '';
      }

      let dateValue = value;

      if (typeof value === 'string') {
        if (value.length >= 10) {
          return value.slice(0, 10);
        }
        dateValue = new Date(value);
      } else if (value && typeof value.toDate === 'function') {
        dateValue = value.toDate();
      } else if (!(value instanceof Date)) {
        dateValue = new Date(value);
      }

      if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
        return '';
      }

      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayKey = toDateKey(new Date());

    const ensureCardVisible = () => {
      menuCard.classList.remove('hidden');
    };

    const renderMessage = (text, variant = 'info') => {
      menuContainer.innerHTML = '';
      const messageEl = document.createElement('p');
      messageEl.className = variant === 'error' ? 'text-error' : 'text-subtle';
      messageEl.textContent = text;
      menuContainer.appendChild(messageEl);
      ensureCardVisible();
      hideDeliveryCard();
      resetSummary();
    };

    const populateTimeSelect = () => {
      timeSelect.innerHTML = '';
      serviceOptions.forEach(({ value, label }) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        timeSelect.appendChild(option);
      });
    };

    populateTimeSelect();

    const getItemsForSelection = (dateKey, mealPeriod) => {
      const dayItems = this.orderMenuData.map.get(dateKey) || [];
      if (!mealPeriod) {
        return dayItems;
      }
      return dayItems.filter((item) => item.mealPeriods.includes(mealPeriod));
    };

    const updateSummary = () => {
      const inputs = menuContainer.querySelectorAll('input[type="number"][data-menu-id]');
      const selections = [];
      const selectionMap = {};

      inputs.forEach((input) => {
        const quantity = Number.parseInt(input.value, 10) || 0;
        if (quantity <= 0) {
          return;
        }

        const priceValue = Number.parseFloat(input.dataset.menuPrice || '0') || 0;
        const lineTotal = Math.max(priceValue * quantity, 0);
        const id = input.dataset.menuId;

        selections.push({
          id,
          name: input.dataset.menuName || 'Dish',
          quantity,
          priceValue,
          lineTotal,
          dateKey: input.dataset.menuDate,
          mealPeriod: input.dataset.mealPeriod
        });

        selectionMap[id] = {
          quantity,
          priceValue,
          dateKey: input.dataset.menuDate,
          mealPeriod: input.dataset.mealPeriod
        };
      });

      selections.sort((a, b) => a.name.localeCompare(b.name));

      if (!selections.length) {
        resetSummary();
        hideDeliveryCard();
        this.orderMenuData.selection = {};
        return;
      }

      const subtotalValue = selections.reduce((total, item) => total + item.lineTotal, 0);
      const deliveryFeeValue = subtotalValue > 0 ? DELIVERY_FEE : 0;
      const totalValue = subtotalValue + deliveryFeeValue;

      summaryItems.innerHTML = '';
      selections.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'summary-item';

        const name = document.createElement('span');
        name.className = 'summary-item__name';
        name.textContent = item.name;

        const meta = document.createElement('span');
        meta.className = 'summary-item__meta';
        meta.textContent = `${item.quantity} × ${formatMoney(item.priceValue)}`;

        const total = document.createElement('span');
        total.className = 'summary-item__total';
        total.textContent = formatMoney(item.lineTotal);

        row.append(name, meta, total);
        summaryItems.appendChild(row);
      });

      subtotalEl.textContent = formatMoney(subtotalValue);
      deliveryFeeEl.textContent = formatMoney(deliveryFeeValue);
      totalEl.textContent = formatMoney(totalValue);

      this.orderMenuData.selection = selectionMap;
      showDeliveryCard();
    };

    const registerQuantityControl = (input, decrementBtn, incrementBtn) => {
      const sanitize = () => {
        const min = Number.parseInt(input.min || '0', 10) || 0;
        const max = input.max ? Number.parseInt(input.max, 10) : Number.POSITIVE_INFINITY;
        let value = Number.isFinite(Number.parseInt(input.value, 10)) ? Number.parseInt(input.value, 10) : 0;
        value = Number.isNaN(value) ? 0 : value;
        value = Math.max(min, Math.min(max, value));
        input.value = String(value);
        return value;
      };

      const syncButtons = () => {
        const current = sanitize();
        if (decrementBtn) {
          decrementBtn.disabled = current <= 0;
          decrementBtn.setAttribute('aria-disabled', current <= 0 ? 'true' : 'false');
        }
        if (incrementBtn) {
          const max = input.max ? Number.parseInt(input.max, 10) : Number.POSITIVE_INFINITY;
          const isMaxed = Number.isFinite(max) && current >= max;
          incrementBtn.disabled = isMaxed;
          incrementBtn.setAttribute('aria-disabled', isMaxed ? 'true' : 'false');
        }
      };

      const applyDelta = (delta) => {
        const min = Number.parseInt(input.min || '0', 10) || 0;
        const max = input.max ? Number.parseInt(input.max, 10) : Number.POSITIVE_INFINITY;
        const current = Number.parseInt(input.value || '0', 10) || 0;
        const next = Math.max(min, Math.min(max, current + delta));
        if (next === current) {
          return;
        }
        input.value = String(next);
        input.dispatchEvent(new Event('change', { bubbles: false }));
      };

      decrementBtn?.addEventListener('click', () => {
        applyDelta(-1);
      });

      incrementBtn?.addEventListener('click', () => {
        applyDelta(1);
      });

      input.addEventListener('input', () => {
        sanitize();
        syncButtons();
        updateSummary();
      });

      input.addEventListener('change', () => {
        sanitize();
        syncButtons();
        updateSummary();
      });

      syncButtons();
    };

    const updateTimeAvailability = () => {
      const dateKey = dateSelect.value;
      let firstAvailable = null;

      Array.from(timeSelect.options).forEach((option) => {
        const isAvailable = getItemsForSelection(dateKey, option.value).length > 0;
        option.disabled = !isAvailable;
        if (isAvailable && !firstAvailable) {
          firstAvailable = option.value;
        }
      });

      if (!firstAvailable) {
        timeSelect.value = '';
        timeSelect.disabled = true;
        timeSelect.setAttribute('aria-disabled', 'true');
      } else {
        timeSelect.disabled = false;
        timeSelect.removeAttribute('aria-disabled');
        if (!timeSelect.value || timeSelect.selectedOptions.length === 0 || timeSelect.selectedOptions[0].disabled) {
          timeSelect.value = firstAvailable;
        }
      }
    };

    const renderMenu = () => {
      const dateKey = dateSelect.value;
      const mealPeriod = timeSelect.value;

      if (!dateKey) {
        renderMessage('Select a delivery date to view the menu for the day.');
        return;
      }

      const items = getItemsForSelection(dateKey, mealPeriod);
      if (!items.length) {
        const dateLabel = this.formatFullDate(dateKey) || dateKey;
        const message = mealPeriod
          ? `No dishes configured for ${mealPeriod.toLowerCase()} on ${dateLabel}.`
          : `No dishes configured for ${dateLabel}.`;
        renderMessage(message);
        return;
      }

      menuContainer.innerHTML = '';
      ensureCardVisible();

      const grouped = items.reduce((accumulator, item) => {
        const bucket = item.groupLabel || "Today's Menu";
        if (!accumulator[bucket]) {
          accumulator[bucket] = [];
        }
        accumulator[bucket].push(item);
        return accumulator;
      }, {});

      Object.keys(grouped)
        .sort((a, b) => a.localeCompare(b))
        .forEach((category) => {
          const section = document.createElement('section');
          section.className = 'daily-menu-section';
          section.setAttribute('role', 'group');
          section.setAttribute('aria-label', `${category} dishes`);

          const heading = document.createElement('h5');
          heading.className = 'daily-menu-section__title';
          heading.textContent = category;
          section.appendChild(heading);

          const list = document.createElement('div');
          list.className = 'daily-menu-section__list';

          grouped[category]
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .forEach((item) => {
              const row = document.createElement('div');
              row.className = 'daily-menu-item';
              row.dataset.menuId = item.id;

              const info = document.createElement('div');
              info.className = 'daily-menu-item__info';

              const title = document.createElement('h6');
              title.className = 'daily-menu-item__name';
              title.textContent = item.name || 'Menu item';
              info.appendChild(title);

              if (item.description) {
                const description = document.createElement('p');
                description.className = 'daily-menu-item__description';
                description.textContent = item.description;
                info.appendChild(description);
              }

              const tags = document.createElement('div');
              tags.className = 'daily-menu-item__tags';

              const priceTag = document.createElement('span');
              priceTag.className = 'daily-menu-item__tag';
              priceTag.textContent = item.price || this.formatCurrency(item.priceValue);
              tags.appendChild(priceTag);

              const capacityValue = Number.isFinite(item.remainingCapacity)
                ? item.remainingCapacity
                : Number.isFinite(item.capacity)
                  ? item.capacity
                  : null;

              if (capacityValue !== null) {
                const capacityTag = document.createElement('span');
                capacityTag.className = 'daily-menu-item__tag';
                capacityTag.textContent = `${capacityValue} servings available`;
                tags.appendChild(capacityTag);
              }

              if (item.mealPeriods && item.mealPeriods.length > 1) {
                const serviceTag = document.createElement('span');
                serviceTag.className = 'daily-menu-item__tag';
                serviceTag.textContent = `Also serves ${item.mealPeriods.join(' & ')}`;
                tags.appendChild(serviceTag);
              }

              info.appendChild(tags);

              const controls = document.createElement('div');
              controls.className = 'daily-menu-item__controls';

              const input = document.createElement('input');
              input.type = 'number';
              input.name = `menuSelection[${item.id}]`;
              input.min = '0';
              input.step = '1';
              input.value = '0';
              if (capacityValue !== null) {
                input.max = Math.max(capacityValue, 0).toString();
              }
              input.dataset.menuId = item.id;
              input.dataset.menuName = item.name || '';
              input.dataset.menuDate = dateKey;
              input.dataset.mealPeriod = mealPeriod;
              input.setAttribute('aria-label', `${item.name || 'Dish'} quantity`);
              if (Number.isFinite(item.priceValue)) {
                input.dataset.menuPrice = String(item.priceValue);
              }

              const stepper = document.createElement('div');
              stepper.className = 'quantity-stepper';

              const decrementBtn = document.createElement('button');
              decrementBtn.type = 'button';
              decrementBtn.className = 'quantity-stepper__btn';
              decrementBtn.textContent = '−';
              decrementBtn.setAttribute('aria-label', `Remove one ${item.name || 'dish'}`);

              const incrementBtn = document.createElement('button');
              incrementBtn.type = 'button';
              incrementBtn.className = 'quantity-stepper__btn';
              incrementBtn.textContent = '+';
              incrementBtn.setAttribute('aria-label', `Add one ${item.name || 'dish'}`);

              input.classList.add('quantity-stepper__input');

              stepper.append(decrementBtn, input, incrementBtn);
              controls.appendChild(stepper);
              registerQuantityControl(input, decrementBtn, incrementBtn);

              row.append(info, controls);
              list.appendChild(row);
            });

          section.appendChild(list);
          menuContainer.appendChild(section);
        });

      updateSummary();
    };

    const handleSelectionChange = () => {
      updateTimeAvailability();
      renderMenu();
      updateSummary();
    };

    dateSelect.addEventListener('change', handleSelectionChange);
    timeSelect.addEventListener('change', handleSelectionChange);

    renderMessage('Loading today\'s menu...');

    let rawItems = [];
    try {
      rawItems = await this.fetchMenuItemsFromFirestore();
    } catch (error) {
      console.error('Failed to load menu for order form:', error);
      renderMessage('Unable to load the menu right now. Please try again in a moment.', 'error');
      return;
    }

    this.orderMenuData.items = rawItems;

    const menuMap = new Map();
    rawItems.forEach((item) => {
      const dateKey = toDateKey(item.availableDateString || item.availableDate);
      if (!dateKey || dateKey < todayKey) {
        return;
      }

      const normalizedItem = {
        ...item,
        dateKey,
        mealPeriods: Array.isArray(item.mealPeriods) && item.mealPeriods.length ? item.mealPeriods : ['Lunch', 'Dinner'],
        capacity: Number.isFinite(item.capacity) ? item.capacity : null,
        remainingCapacity: Number.isFinite(item.remainingCapacity) ? item.remainingCapacity : null,
        groupLabel: item.groupLabel || "Today's Menu"
      };

      if (!menuMap.has(dateKey)) {
        menuMap.set(dateKey, []);
      }
      menuMap.get(dateKey).push(normalizedItem);
    });

    this.orderMenuData.map = menuMap;

    const sortedDates = Array.from(menuMap.keys()).sort();

    dateSelect.innerHTML = '';
    sortedDates.forEach((dateKey) => {
      const option = document.createElement('option');
      option.value = dateKey;
      option.textContent = this.formatFullDate(dateKey) || dateKey;
      dateSelect.appendChild(option);
    });

    if (!sortedDates.length) {
      dateSelect.disabled = true;
      timeSelect.disabled = true;
      renderMessage('The kitchen team has not published a menu yet. Please check back soon.');
      return;
    }

    dateSelect.disabled = false;
    dateSelect.value = sortedDates[0];

    updateTimeAvailability();
    renderMenu();
  }

  async handleOrderSubmit(form) {
    if (!this.currentUser) {
      this.showMessage('Please log in to place an order.', 'warning');
      return;
    }

    const firestore = this.getFirestore();
    if (!firestore) {
      this.showMessage('Unable to process your order. Please try again.', 'error');
      return;
    }

    // Collect form data
    const deliveryDate = document.getElementById('delivery-date')?.value;
    const deliveryTime = document.getElementById('delivery-time')?.value;
    const customerName = document.getElementById('scheduled-name')?.value.trim();
    const customerPhone = document.getElementById('scheduled-phone')?.value.trim();
    const customerAddress = document.getElementById('scheduled-address')?.value.trim();
    const customerPreferences = document.getElementById('scheduled-preferences')?.value.trim();
    const orderNotes = document.getElementById('order-notes')?.value.trim();

    // Validate required fields
    if (!deliveryDate || !deliveryTime || !customerName || !customerPhone || !customerAddress) {
      this.showMessage('Please fill in all required fields.', 'error');
      return;
    }

    // Get selected items and calculate total
    const selections = this.orderMenuData.selection || {};
    const selectedItems = [];
    let subtotal = 0;

    Object.entries(selections).forEach(([itemId, selectionData]) => {
      if (selectionData.quantity && selectionData.quantity > 0) {
        const lineTotal = selectionData.priceValue * selectionData.quantity;
        selectedItems.push({
          itemId,
          quantity: selectionData.quantity,
          priceValue: selectionData.priceValue,
          lineTotal
        });
        subtotal += lineTotal;
      }
    });

    if (selectedItems.length === 0) {
      this.showMessage('Please select at least one dish.', 'error');
      return;
    }

    const DELIVERY_FEE = 30;
    const total = subtotal + DELIVERY_FEE;

    // Disable submit button
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    this.showMessage('Processing your order...');

    try {
      const timestamp = window.firebase.firestore.FieldValue.serverTimestamp();
      const orderNumber = Math.floor(100000 + Math.random() * 900000);

      const orderPayload = {
        userId: this.currentUser.uid,
        customerName,
        customerPhone,
        customerAddress,
        customerPreferences,
        orderNotes,
        deliveryDate,
        deliveryTime,
        selectedItems,
        subtotal,
        deliveryFee: DELIVERY_FEE,
        total,
        status: 'Pending',
        orderNumber,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Save order to Firestore
      await firestore.collection('orders').add(orderPayload);

      // Decrement remaining capacity for each selected item using batch write
      // This ensures atomic updates - all succeed or all fail together
      const batch = firestore.batch();
      for (const item of selectedItems) {
        const itemRef = firestore.collection('menuItems').doc(item.itemId);
        batch.update(itemRef, {
          remainingCapacity: window.firebase.firestore.FieldValue.increment(-item.quantity)
        });
      }
      
      // Commit all capacity updates atomically
      await batch.commit();

      this.showMessage('Order placed successfully! Your order number is #' + orderNumber, 'success');
      
      // Show confirmation modal
      this.showOrderConfirmationModal(orderNumber, total, deliveryDate, deliveryTime);
      
      // Reset form after a short delay
      setTimeout(() => {
        form.reset();
        window.location.href = './index.html';
      }, 3000);
    } catch (error) {
      console.error('Order submission error:', error);
      this.showMessage('Unable to place order. Please try again.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  showOrderConfirmationModal(orderNumber, total, deliveryDate, deliveryTime) {
    const modal = document.getElementById('orderConfirmationModal');
    if (!modal) return;

    // Format delivery date
    const dateLabel = this.formatFullDate(deliveryDate) || deliveryDate;

    // Populate modal fields
    const orderNumberEl = document.getElementById('confirmationOrderNumber');
    if (orderNumberEl) orderNumberEl.textContent = '#' + orderNumber;

    const totalEl = document.getElementById('confirmationTotal');
    if (totalEl) totalEl.textContent = this.formatCurrency(total) || `₹${total.toFixed(2)}`;

    const dateEl = document.getElementById('confirmationDeliveryDate');
    if (dateEl) dateEl.textContent = dateLabel;

    const timeEl = document.getElementById('confirmationDeliveryTime');
    if (timeEl) {
      const timeLabel = deliveryTime === 'Lunch' ? 'Lunch (13:00 - 14:00)' : 'Dinner (19:00 - 20:00)';
      timeEl.textContent = timeLabel;
    }

    // Show modal
    modal.classList.remove('hidden');

    // Setup close button
    const closeBtn = document.getElementById('closeConfirmationBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        window.location.href = './index.html';
      });
    }

    // Close modal on backdrop click
    const backdrop = modal.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        modal.classList.add('hidden');
        window.location.href = './index.html';
      });
    }
  }

  handleAuthError(error) {
    const { code, message } = error;
    
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        this.showMessage('Invalid email or password', 'error');
        break;
      case 'auth/email-already-in-use':
        this.showMessage('Email already registered', 'error');
        break;
      case 'auth/weak-password':
        this.showMessage('Password is too weak', 'error');
        break;
      case 'auth/too-many-requests':
        this.showMessage('Too many failed attempts. Try again later.', 'error');
        break;
      default:
        this.showMessage(`Error: ${message}`, 'error');
    }
  }

  showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
      messageDiv.textContent = text;
      messageDiv.className = `message ${type}`;
      
      // Auto-hide success messages
      if (type === 'success') {
        setTimeout(() => {
          messageDiv.textContent = '';
          messageDiv.className = 'message';
        }, 3000);
      }
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CloudKitchenApp();
});

// Export for global access
window.CloudKitchenApp = CloudKitchenApp;