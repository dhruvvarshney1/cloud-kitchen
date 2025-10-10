# 🚀 Quick Start Guide - Firebase Setup

This is a **5-minute setup guide** to get your Cloud Kitchen app running with Firebase.

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Firebase Console (2 min)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** → Enter name → Click **"Continue"** → **"Create project"**
3. Click **"Authentication"** → **"Get started"** → **"Email/Password"** → **Enable** → **"Save"**
4. Click **"Firestore Database"** → **"Create database"** → **"Start in production mode"** → **"Next"** → **"Enable"**

### Step 2: Get Your Config (1 min)

1. Click **⚙️ gear icon** → **"Project settings"**
2. Scroll to **"Your apps"** → Click **Web icon (</>)**
3. Enter nickname: **"Cloud Kitchen"** → **"Register app"**
4. **Copy the config** (the `firebaseConfig` object)

### Step 3: Update Your Code (1 min)

**Open:** `src/config/firebase-config.js`

**Replace with your config:**
```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 4: Set Security Rules (1 min)

1. In Firebase Console, go to **Firestore Database**
2. Click **"Rules"** tab
3. **Copy/paste** this (replaces all existing rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }
    
    match /orders/{orderId} {
      allow read: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    match /menuItems/{itemId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() && 
        (conversationId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && conversationId == request.auth.uid;
      allow update: if isAuthenticated() && 
        (conversationId == request.auth.uid || isAdmin());
      
      match /messages/{messageId} {
        allow read: if isAuthenticated() && 
          (conversationId == request.auth.uid || isAdmin());
        allow create: if isAuthenticated();
      }
    }
  }
}
```

4. Click **"Publish"**

---

## 🧪 Test It!

### Start Server
```bash
npx http-server . -p 8080
```

### Test Signup
1. Open: `http://localhost:8080/signup.html`
2. Fill form → Click **"Create Account"**
3. ✅ Should redirect to login page

### Test Login
1. Open: `http://localhost:8080/login.html`
2. Enter email/password → Click **"Log in"**
3. ✅ Should redirect to home page

### Verify in Firebase
1. Go to Firebase Console → **Authentication**
2. ✅ Should see your test user
3. Go to **Firestore Database**
4. ✅ Should see `users` collection with your profile

---

## 🎉 Done!

Your app is now running with Firebase! 

### Next Steps:
- Create an admin user (see FIREBASE_MIGRATION.md)
- Test order placement
- Customize menu items
- Deploy to production

### Need More Help?
📖 Read `FIREBASE_MIGRATION.md` for detailed instructions  
🐛 Check browser console for errors  
🔍 Verify Firebase Console for authentication/database issues

---

**Total Time:** ~5 minutes  
**Status:** ✅ Ready to use!
