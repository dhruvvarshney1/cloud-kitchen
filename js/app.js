// Main Application Logic
// Handles core app functionality, navigation, and user interface

class CloudKitchenApp {
  constructor() {
    this.currentUser = null;
    this.cart = [];
    this.orders = [];
    this.menuItems = [];
    
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
      default:
        if (document.body.dataset.adminPage) {
          this.initAdminPage();
        }
    }
  }

  setupEventListeners() {
    // Header logout button
    const headerLogoutBtn = document.getElementById('headerLogoutBtn');
    if (headerLogoutBtn) {
      headerLogoutBtn.addEventListener('click', () => this.handleLogout());
    }

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
    const headerLogoutBtn = document.getElementById('headerLogoutBtn');

    if (this.currentUser) {
      // User is logged in
      if (navAuthBtn) {
        navAuthBtn.textContent = 'Logout';
        navAuthBtn.href = '#';
      }
      if (headerLogoutBtn) {
        headerLogoutBtn.classList.remove('hidden');
      }
    } else {
      // User is logged out
      if (navAuthBtn) {
        navAuthBtn.textContent = 'Login';
        navAuthBtn.href = './login.html';
      }
      if (headerLogoutBtn) {
        headerLogoutBtn.classList.add('hidden');
      }
    }
  }

  async handleLogout() {
    try {
      if (typeof signOut === 'function') {
        await signOut();
        this.showMessage('Logged out successfully', 'success');
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          window.location.href = './index.html';
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
  }

  initSignupPage() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSignup(e.target);
      });
    }
  }

  initMenuPage() {
    this.loadMenu();
  }

  initOrderPage() {
    this.loadOrderForm();
  }

  initAdminPage() {
    // Admin page initialization
    if (this.currentUser) {
      this.checkAdminAccess();
    }
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
    // Load menu items
    console.log('Loading menu...');
  }

  loadOrderForm() {
    // Load order form
    console.log('Loading order form...');
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