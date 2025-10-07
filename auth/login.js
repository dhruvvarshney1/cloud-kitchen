import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageDiv = document.getElementById('message');
const togglePassword = document.getElementById('togglePassword');

if (togglePassword) {
  togglePassword.addEventListener('click', () => {
    const showing = passwordInput.getAttribute('type') === 'text';
    passwordInput.setAttribute('type', showing ? 'password' : 'text');
    togglePassword.setAttribute('aria-pressed', showing ? 'false' : 'true');
    togglePassword.textContent = showing ? 'Show' : 'Hide';
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage('Please fill in all fields', 'error');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.info('User signed in', user);
      
      // Fetch user profile to determine role
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let redirectUrl = 'index.html'; // Default for customers
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'admin') {
          redirectUrl = 'admin/dashboard.html';
        }
      }
      
      showMessage('Login successful! Redirecting...', 'success');

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
    } catch (error) {
      handleError(error);
    }
  });
}

function handleError(error) {
  const { code, message } = error;
  switch (code) {
    case 'auth/user-not-found':
      showMessage('No account found with this email', 'error');
      break;
    case 'auth/wrong-password':
      showMessage('Incorrect password', 'error');
      break;
    case 'auth/invalid-email':
      showMessage('Invalid email address', 'error');
      break;
    default:
      showMessage(`Login failed: ${message}`, 'error');
      break;
  }
}

function showMessage(message, type) {
  if (!messageDiv) return;
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
}
