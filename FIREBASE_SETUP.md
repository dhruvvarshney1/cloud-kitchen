# Firebase Setup Guide for Cloud Kitchen

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or select an existing project
3. Enter project name (e.g., "cloud-kitchen")
4. Disable Google Analytics (optional)
5. Click "Create Project"

## Step 2: Register Web App

1. In Firebase Console, click the **Web icon** (`</>`) to add a web app
2. Enter app nickname (e.g., "Cloud Kitchen Web")
3. **Check** "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. **Copy the Firebase configuration object** - it looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

## Step 3: Update Firebase Configuration

1. Open `js/firebase-config.js` in your project
2. Replace the placeholder values with your actual Firebase config
3. Save the file

## Step 4: Enable Authentication

1. In Firebase Console, go to **Build** > **Authentication**
2. Click "Get started"
3. Click on **Email/Password** provider
4. **Enable** Email/Password authentication
5. Click "Save"

## Step 5: Create Firestore Database

1. In Firebase Console, go to **Build** > **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (for development)
   - For production, use production mode and set up security rules
4. Select a location closest to your users
5. Click "Enable"

## Step 6: Set Up Security Rules (Important!)

### Firestore Security Rules

Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // Orders collection
    match /orders/{orderId} {
      // Customers can read their own orders
      allow read: if request.auth != null;
      // Customers can create orders
      allow create: if request.auth != null;
      // Only admins can update/delete
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
    
    // Menu items - read by anyone, write by admin only
    match /menuItems/{itemId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
    
    // Conversations - for messaging
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null;
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

## Step 7: Create Admin User (Optional)

After setting up, you'll need to create an admin user:

1. Register a normal user through the app
2. Go to Firebase Console > **Firestore Database**
3. Find the user in the `users` collection
4. Edit the document and add/change the field:
   - Field: `role`
   - Value: `admin`
5. Save

## Step 8: Test Your Setup

1. Open your app in a browser
2. Try registering a new user
3. Check Firebase Console > Authentication to see the user
4. Check Firestore > users collection to see user data
5. Try logging in with the credentials

## Firestore Collections Structure

Your database will have these collections:

### `users` Collection
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  phone: "1234567890",
  address: "123 Main St, City",
  role: "customer", // or "admin"
  createdAt: Timestamp
}
```

### `orders` Collection
```javascript
{
  customerName: "John Doe",
  customerEmail: "john@example.com",
  customerPhone: "1234567890",
  customerAddress: "123 Main St",
  date: "2025-10-05",
  timeSlot: "lunch",
  items: [
    {
      name: "Veg Thali",
      quantity: 2,
      price: 100
    }
  ],
  total: "Rs. 200",
  status: "Pending",
  timestamp: Timestamp
}
```

### `menuItems` Collection
```javascript
{
  name: "Veg Thali",
  description: "Complete meal with rice, dal, sabzi",
  price: 100,
  date: "2025-10-05",
  timeSlot: "lunch"
}
```

## Troubleshooting

### "Firebase failed to load"
- Check your internet connection
- Verify the Firebase SDK scripts are loading (check browser console)
- Make sure `js/firebase-config.js` is loaded before `login.js`

### "Invalid API key"
- Double-check your Firebase config in `js/firebase-config.js`
- Ensure you copied the entire config object from Firebase Console

### "Permission denied" errors
- Check your Firestore security rules
- Ensure the user is authenticated
- Verify the user has the correct role for admin operations

### Users can't log in
- Verify Email/Password authentication is enabled in Firebase Console
- Check browser console for specific error messages
- Ensure the email and password meet requirements (password min 6 characters)

## Next Steps

1. Set up password reset functionality
2. Add email verification
3. Configure production security rules
4. Set up Firebase Hosting for deployment
5. Enable Cloud Functions for advanced features (optional)

## Support

For more information, visit:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
