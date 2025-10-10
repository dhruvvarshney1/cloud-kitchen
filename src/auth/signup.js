import { signUp } from '../services/auth.js';

const signupForm = document.getElementById('signupForm');
const emailInput = document.getElementById('signupEmail');
const passwordInput = document.getElementById('signupPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const nameInput = document.getElementById('signupName');
const phoneInput = document.getElementById('signupPhone');
const addressInput = document.getElementById('signupAddress');
const messageDiv = document.getElementById('signupMessage');
const toggleSignupPassword = document.getElementById('toggleSignupPassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

if (toggleSignupPassword) {
  toggleSignupPassword.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    toggleSignupPassword.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
    toggleSignupPassword.textContent = isPassword ? 'Hide' : 'Show';
  });
}

if (toggleConfirmPassword) {
  toggleConfirmPassword.addEventListener('click', () => {
    const isPassword = confirmPasswordInput.getAttribute('type') === 'password';
    confirmPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
    toggleConfirmPassword.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
    toggleConfirmPassword.textContent = isPassword ? 'Hide' : 'Show';
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fullName = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!fullName || !phone || !address || !email || !password || !confirmPassword) {
      showMessage('Please fill in all fields', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      showMessage('Creating your account...', 'info');
      await signUp(email, password, {
        name: fullName,
        phone,
        address,
      });

      showMessage('Account created successfully! Redirecting to login...', 'success');

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } catch (error) {
      handleError(error);
    }
  });
}

function handleError(error) {
  const { code, message } = error;
  
  switch (code) {
    case 'auth/email-already-in-use':
      showMessage('Email already registered', 'error');
      break;
    case 'auth/invalid-email':
      showMessage('Invalid email address', 'error');
      break;
    case 'auth/weak-password':
      showMessage('Password is too weak. Must be at least 6 characters.', 'error');
      break;
    case 'auth/operation-not-allowed':
      showMessage('Email/password accounts are not enabled', 'error');
      break;
    default:
      showMessage(`Sign up failed: ${message}`, 'error');
  }
}

function showMessage(message, type) {
  if (!messageDiv) return;
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
}
