import { signIn } from '../services/auth.js';

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
      showMessage('Logging in...', 'info');
      await signIn(email, password);
      showMessage('Login successful! Redirecting...', 'success');

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } catch (error) {
      handleError(error);
    }
  });
}

function handleError(error) {
  const { message } = error;
  if (message.includes('Invalid login credentials')) {
    showMessage('Invalid email or password', 'error');
  } else if (message.includes('Email not confirmed')) {
    showMessage('Please check your email to confirm your account', 'error');
  } else {
    showMessage(`Login failed: ${message}`, 'error');
  }
}

function showMessage(message, type) {
  if (!messageDiv) return;
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
}
