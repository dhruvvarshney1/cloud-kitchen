# 🔥 Firebase Migration Guide

This document provides complete instructions for migrating from Supabase to Firebase Authentication and Firestore.

## 📋 Table of Contents

1. [Firebase Console Setup](#firebase-console-setup)
2. [Configuration](#configuration)
3. [Firestore Security Rules](#firestore-security-rules)
4. [Testing](#testing)
5. [Admin User Setup](#admin-user-setup)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Firebase Console Setup

### Step 1: Create Firebase Project

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Click "Add project" or select existing project**
3. **Enter project name** (e.g., "home-coming-cloud-kitchen")
4. **Disable Google Analytics** (optional, can enable later)
5. **Click "Create project"**

### Step 2: Enable Authentication

1. In Firebase Console, click **Authentication** in left sidebar
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Click **Email/Password**
5. **Enable** the toggle
6. Click **Save**

### Step 3: Create Firestore Database

1. In Firebase Console, click **Firestore Database** in left sidebar
2. Click **Create database**
3. Choose **Start in production mode** (we'll add rules next)
4. Select your **Cloud Firestore location** (choose closest to your users)
5. Click **Enable**

### Step 4: Get Configuration

1. In Firebase Console, click the **⚙️ gear icon** → **Project settings**
2. Scroll down to **Your apps** section
3. Click the **Web icon (</>)** to add a web app
4. Enter app nickname: "Cloud Kitchen Web"
5. **Do NOT check** "Also set up Firebase Hosting" (we're using static hosting)
6. Click **Register app**
7. **Copy the config object** (looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

---

## ⚙️ Configuration

### Update Firebase Config File

**Edit: `src/config/firebase-config.js`**

Replace the placeholder values with your actual Firebase configuration:

```javascript
// Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### Optional: Environment Variables

If using a build tool like Vite, you can use environment variables:

1. **Copy `.env.local.template` to `.env.local`**
2. **Fill in your Firebase values**
3. **Update `src/config/firebase-config.js`** to read from env vars:

```javascript
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

---

## 🔒 Firestore Security Rules

### Set Security Rules

1. In Firebase Console, go to **Firestore Database**
2. Click the **Rules** tab
3. **Replace the default rules** with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection - users can read/write their own profile
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Orders collection - users can access their own orders, admins can access all
    match /orders/{orderId} {
      allow read: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated();
      allow update: if isAdmin() || 
        (isOwner(resource.data.userId) && request.resource.data.userId == resource.data.userId);
      allow delete: if isAdmin();
    }
    
    // Menu items - all authenticated users can read, only admins can write
    match /menuItems/{itemId} {
      allow read: if true; // Public reading
      allow write: if isAdmin();
    }
    
    // Conversations - users can access their own conversations, admins can access all
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() && 
        (conversationId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && conversationId == request.auth.uid;
      allow update: if isAuthenticated() && 
        (conversationId == request.auth.uid || isAdmin());
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read: if isAuthenticated() && 
          (conversationId == request.auth.uid || isAdmin());
        allow create: if isAuthenticated() && 
          (conversationId == request.auth.uid || isAdmin());
        allow update: if isAdmin();
      }
    }
  }
}
```

4. **Click "Publish"**

### Understanding the Rules

- **Users**: Can read/update their own profile; admins can do everything
- **Orders**: Users can create and read their own orders; admins can manage all orders
- **Menu Items**: Public read access; only admins can add/edit/delete items
- **Conversations**: Users can only access their own chats; admins can access all

---

## 🧪 Testing

### Local Testing

1. **Start local server** (must use HTTP, not `file://`):
   ```bash
   npx http-server . -p 8080
   ```

2. **Open in browser**: `http://localhost:8080`

### Test Flow

#### 1. **Test Signup**
   - Navigate to `http://localhost:8080/signup.html`
   - Fill in all fields:
     - Name: Test User
     - Phone: 1234567890
     - Address: 123 Test Street
     - Email: test@example.com
     - Password: password123
   - Click "Create Account"
   - **Expected**: Success message, redirect to login

#### 2. **Verify User in Firebase**
   - Go to Firebase Console → Authentication → Users
   - **Expected**: See test@example.com in the list

#### 3. **Test Login**
   - Navigate to `http://localhost:8080/login.html`
   - Enter:
     - Email: test@example.com
     - Password: password123
   - Click "Log in"
   - **Expected**: Success message, redirect to index.html

#### 4. **Verify User Profile in Firestore**
   - Go to Firebase Console → Firestore Database
   - **Expected**: See `users` collection with a document containing:
     ```json
     {
       "name": "Test User",
       "phone": "1234567890",
       "address": "123 Test Street",
       "email": "test@example.com",
       "role": "customer",
       "createdAt": "2025-01-01T00:00:00.000Z"
     }
     ```

### Common Issues

#### "Loading via file://" Warning
- **Problem**: Firebase auth doesn't work with `file://` protocol
- **Solution**: Use HTTP server (`npx http-server .` or `python -m http.server`)

#### "API key not valid" Error
- **Problem**: Wrong API key or not enabled for web
- **Solution**: Double-check config in `src/config/firebase-config.js`

#### "CORS" or "Network" Errors
- **Problem**: Firestore rules blocking access
- **Solution**: Verify security rules are published correctly

---

## 👨‍💼 Admin User Setup

Firebase doesn't have built-in roles. To create an admin user:

### Option 1: Manual via Firestore Console

1. Create a regular user account via signup page
2. Go to Firebase Console → Firestore Database
3. Find the user's document in `users` collection
4. Click the document
5. **Edit the `role` field** from `"customer"` to `"admin"`
6. Save

### Option 2: Using Firebase CLI

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize Firestore
firebase init firestore

# Run a script to update user role
node scripts/make-admin.js
```

**Create: `scripts/make-admin.js`**
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function makeAdmin(email) {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', email).get();
  
  if (snapshot.empty) {
    console.log('No user found with that email');
    return;
  }
  
  snapshot.forEach(async (doc) => {
    await doc.ref.update({ role: 'admin' });
    console.log(`Updated ${email} to admin`);
  });
}

// Usage
makeAdmin('admin@example.com');
```

### Verify Admin Access

1. Login as admin user
2. Navigate to `http://localhost:8080/admin/dashboard.html`
3. **Expected**: Should see admin dashboard with orders, menu management, etc.

---

## 🔧 Troubleshooting

### Authentication Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `auth/email-already-in-use` | Email already registered | Use different email or login |
| `auth/invalid-email` | Email format is wrong | Check email format |
| `auth/weak-password` | Password < 6 characters | Use stronger password |
| `auth/user-not-found` | No account with that email | Check email or signup |
| `auth/wrong-password` | Incorrect password | Check password |
| `auth/invalid-credential` | Invalid email/password combo | Verify credentials |
| `auth/too-many-requests` | Too many failed attempts | Wait or reset password |

### Firestore Permission Errors

**Error**: `Missing or insufficient permissions`

**Causes**:
1. Security rules not published
2. User not authenticated
3. Trying to access another user's data

**Solutions**:
1. Verify rules in Firebase Console → Firestore → Rules
2. Check that user is logged in (`auth.currentUser` not null)
3. Ensure data access matches security rules

### Console Errors

**"detectHostingEnvironment: Unable to determine hosting environment"**
- This is a warning, not an error
- Safe to ignore when using HTTP server locally

---

## 📚 Additional Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth/web/start)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Web SDK v10 Guide](https://firebase.google.com/docs/web/modular-upgrade)
- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)

---

## ✅ Migration Checklist

- [ ] Created Firebase project
- [ ] Enabled Email/Password authentication
- [ ] Created Firestore database
- [ ] Updated `src/config/firebase-config.js` with real values
- [ ] Published Firestore security rules
- [ ] Tested signup flow
- [ ] Tested login flow
- [ ] Verified user data in Firestore
- [ ] Created at least one admin user
- [ ] Tested admin dashboard access

---

**Migration complete!** 🎉 Your app now uses Firebase for authentication and Firestore for data storage.
