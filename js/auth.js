// Firebase Configuration and Authentication
// Complete Firebase setup and auth functions

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCSUMVGI2FeX7bEszJnFKyLrAUogh6rp4Q",
  authDomain: "cloud-kitchen-55f46.firebaseapp.com",
  projectId: "cloud-kitchen-55f46",
  storageBucket: "cloud-kitchen-55f46.firebasestorage.app",
  messagingSenderId: "798275621079",
  appId: "1:798275621079:web:266a54d27a6fb735612092",
  measurementId: "G-JHC5YSXYFP"
};

// Global Firebase variables
window.firebaseConfig = firebaseConfig;
let auth = null;
let db = null;

// Initialize Firebase
function initializeFirebase() {
  if (window.firebase) {
    if (!window.firebase.apps || window.firebase.apps.length === 0) {
      window.firebase.initializeApp(firebaseConfig);
    }
    auth = window.firebase.auth();
    db = window.firebase.firestore();
    return true;
  }
  return false;
}

// Authentication Functions
async function signUp(email, password, userData = {}) {
  try {
    if (!auth) initializeFirebase();
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Save user profile to Firestore
    await db.collection('users').doc(user.uid).set({
      name: userData.name || '',
      phone: userData.phone || '',
      address: userData.address || '',
      role: 'customer',
      email: email,
      createdAt: new Date().toISOString()
    });
    
    return userCredential;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

async function signIn(email, password) {
  try {
    if (!auth) initializeFirebase();
    return await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    console.error('Signin error:', error);
    throw error;
  }
}

async function signOut() {
  try {
    if (!auth) initializeFirebase();
    return await auth.signOut();
  } catch (error) {
    console.error('Signout error:', error);
    throw error;
  }
}

async function getCurrentUser() {
  if (!auth) initializeFirebase();
  return auth ? auth.currentUser : null;
}

async function getUserProfile(userId) {
  try {
    if (!db) initializeFirebase();
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
}

function onAuthStateChange(callback) {
  if (!auth) initializeFirebase();
  return auth ? auth.onAuthStateChanged(callback) : null;
}

// Export functions for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeFirebase,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    getUserProfile,
    onAuthStateChange
  };
}

// Global functions for script tag usage
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.getUserProfile = getUserProfile;
window.onAuthStateChange = onAuthStateChange;
window.initializeFirebase = initializeFirebase;
