import { initSiteHeader } from "../components/header.js";

initSiteHeader();

let auth = null;
let db = null;

// Set up basic screen switching immediately (doesn't require Firebase)
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, setting up screen switching...");
  setupScreenSwitching();
});

function setupScreenSwitching() {
  const showRegisterBtn = document.getElementById("showRegisterBtn");
  const showLoginBtn = document.getElementById("showLoginBtn");
  const loginScreen = document.getElementById("loginScreen");
  const registerScreen = document.getElementById("registerScreen");
  
  console.log("Setting up screen switching buttons...");
  console.log("showRegisterBtn:", showRegisterBtn);
  console.log("showLoginBtn:", showLoginBtn);
  
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Show register clicked");
      if (loginScreen) loginScreen.classList.add("hidden");
      if (registerScreen) registerScreen.classList.remove("hidden");
    });
  }
  
  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Show login clicked");
      if (registerScreen) registerScreen.classList.add("hidden");
      if (loginScreen) loginScreen.classList.remove("hidden");
    });
  }
}

// Wait for Firebase to be loaded
function waitForFirebase(callback, timeout = 5000) {
  const startTime = Date.now();
  const checkFirebase = () => {
    if (window.firebase && window.firebaseConfig) {
      callback();
    } else if (Date.now() - startTime < timeout) {
      setTimeout(checkFirebase, 100);
    } else {
      console.error("Firebase failed to load");
      showNotification("Firebase failed to load. Please refresh the page.", "error");
    }
  };
  checkFirebase();
}

// Initialize Firebase and auth handlers
waitForFirebase(() => {
  initializeFirebaseAuth();
});

function initializeFirebaseAuth() {
  try {
    console.log("Initializing Firebase...");
    console.log("Firebase config:", window.firebaseConfig);
    
    // Initialize Firebase
    const app = firebase.initializeApp(window.firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    
    console.log("Firebase initialized successfully");
    console.log("Auth object:", auth);
    console.log("Firestore object:", db);
    
    // Set up form handlers
    setupFormHandlers();
    
    // Check if user is already logged in
    firebase.auth().onAuthStateChanged((user) => {
      console.log("Auth state changed, user:", user);
      if (user) {
        console.log("User already logged in:", user.email);
        console.log("Current page:", window.location.href);
        
        // Only redirect if we're still on the login page
        if (window.location.pathname.includes('login.html')) {
          showNotification("You are already logged in. Redirecting...", "success");
          setTimeout(() => {
            console.log("Auto-redirecting logged-in user to home...");
            window.location.href = "index.html";
          }, 1000);
        }
      } else {
        console.log("No user logged in");
      }
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    console.error("Error details:", error.message, error.code);
    showNotification("Failed to initialize authentication: " + error.message, "error");
  }
}

function setupFormHandlers() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  
  console.log("Setting up form handlers...");
  console.log("loginForm:", loginForm);
  console.log("registerForm:", registerForm);
  
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
    console.log("Login form handler attached");
  }
  
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
    console.log("Register form handler attached");
  }
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  
  console.log("Login attempt for email:", email);
  
  if (!email || !password) {
    showNotification("Please enter both email and password", "error");
    return;
  }
  
  if (!auth) {
    console.error("Auth not initialized");
    showNotification("Authentication not ready. Please refresh the page.", "error");
    return;
  }
  
  showLoader();
  
  try {
    console.log("Attempting to sign in...");
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    console.log("Login successful:", userCredential.user.email);
    console.log("User UID:", userCredential.user.uid);
    console.log("User object:", userCredential.user);
    showNotification("Login successful! Redirecting to home...", "success");
    
    // Redirect to home page
    console.log("Redirecting to index.html in 1.5 seconds...");
    setTimeout(() => {
      console.log("Executing redirect now...");
      window.location.href = "index.html";
    }, 1500);
  } catch (error) {
    console.error("Login error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    showNotification(getFirebaseErrorMessage(error.code), "error");
  } finally {
    hideLoader();
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const address = document.getElementById("regAddress").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  
  // Validate password
  const passwordError = document.getElementById("passwordError");
  if (password.length < 6) {
    passwordError.classList.remove("hidden");
    return;
  }
  passwordError.classList.add("hidden");
  
  // Validate all fields
  if (!name || !email || !phone || !address) {
    showNotification("Please fill in all fields", "error");
    return;
  }
  
  showLoader();
  
  try {
    // Create user account
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Save user data to Firestore
    await db.collection("users").doc(user.uid).set({
      name: name,
      email: email,
      phone: phone,
      address: address,
      role: "customer",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log("Registration successful:", email);
    showNotification("Registration successful! Redirecting...", "success");
    
    // Redirect to home page
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  } catch (error) {
    console.error("Registration error:", error);
    showNotification(getFirebaseErrorMessage(error.code), "error");
  } finally {
    hideLoader();
  }
}

function getFirebaseErrorMessage(errorCode) {
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
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later";
    default:
      return "Authentication failed. Please try again";
  }
}

function showLoader() {
  let loader = document.getElementById("loadingOverlay");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "loadingOverlay";
    loader.innerHTML = '<div class="loader"></div>';
    document.body.appendChild(loader);
  }
  loader.classList.remove("hidden");
  loader.style.display = "flex";
}

function hideLoader() {
  const loader = document.getElementById("loadingOverlay");
  if (loader) {
    loader.classList.add("hidden");
    loader.style.display = "none";
  }
}

function showNotification(message, type = "info") {
  let notification = document.getElementById("notification");
  
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "notification";
    document.body.appendChild(notification);
  }
  
  notification.textContent = message;
  notification.className = `notification notification--${type} show`;
  
  setTimeout(() => {
    notification.classList.remove("show");
  }, 5000);
}
