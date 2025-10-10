import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { firebaseConfig } from '../config/firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export async function signUp(email, password, userData) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Save user profile to Firestore
  await setDoc(doc(db, 'users', user.uid), {
    name: userData.name || '',
    phone: userData.phone || '',
    address: userData.address || '',
    role: 'customer',
    email: email,
    createdAt: new Date().toISOString()
  });
  
  return userCredential;
}

export async function signIn(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return await firebaseSignOut(auth);
}

export async function getCurrentUser() {
  return auth.currentUser;
}

export async function getUserProfile(userId) {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}

export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}
