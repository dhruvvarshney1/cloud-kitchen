import { supabase } from './supabase.js';
import { signOut, getUserProfile } from './auth.js';

let currentUser = null;

async function initializeAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    await handleAuthUser(session.user);
  } else {
    handleAuthGuest();
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await handleAuthUser(session.user);
    } else if (event === 'SIGNED_OUT') {
      handleAuthGuest();
      const currentPath = window.location.pathname;
      if (currentPath.includes('/admin/') || currentPath.includes('/customer/')) {
        window.location.href = '/login.html';
      }
    }
  });
}

async function handleAuthUser(user) {
  try {
    const profile = await getUserProfile(user.id);
    currentUser = { ...user, profile };

    updateUIForAuthenticatedUser();
  } catch (error) {
    console.error('Error loading user profile:', error);
    handleAuthGuest();
  }
}

function handleAuthGuest() {
  currentUser = null;
  updateUIForGuest();
}

function updateUIForAuthenticatedUser() {
  const navAuthBtn = document.getElementById('navAuthBtn');
  const headerLogoutBtn = document.getElementById('headerLogoutBtn');

  if (navAuthBtn) {
    navAuthBtn.textContent = 'Logout';
    navAuthBtn.href = '#';
    navAuthBtn.addEventListener('click', handleLogout);
  }

  if (headerLogoutBtn) {
    headerLogoutBtn.classList.remove('hidden');
    headerLogoutBtn.addEventListener('click', handleLogout);
  }
}

function updateUIForGuest() {
  const navAuthBtn = document.getElementById('navAuthBtn');
  const headerLogoutBtn = document.getElementById('headerLogoutBtn');

  if (navAuthBtn) {
    navAuthBtn.textContent = 'Login';
    navAuthBtn.href = 'login.html';
  }

  if (headerLogoutBtn) {
    headerLogoutBtn.classList.add('hidden');
  }
}

async function handleLogout(event) {
  event.preventDefault();

  try {
    await signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout. Please try again.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeAuth();
});

export { currentUser };
