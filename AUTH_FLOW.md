# Authentication & Routing Flow

## Signup Process (signup.html → signup.js)

### Fields Collected:
- **Full Name** → stored as `name` in Firestore
- **Phone Number** → stored as `phone`
- **Delivery Address** → stored as `address`
- **Email** → stored as `email`
- **Password** → used for Firebase Auth only

### Firestore Document Structure:
```javascript
users/{uid}:
  - name: string
  - phone: string
  - address: string
  - email: string
  - role: "customer" (default)
  - createdAt: timestamp
  - updatedAt: timestamp
```

### After Successful Signup:
- User is redirected to `login.html` after 1.5 seconds

## Login Process (login.html → login.js)

### Authentication Steps:
1. Sign in with email/password via Firebase Auth
2. Fetch user profile from Firestore (`users/{uid}`)
3. Check `role` field in profile
4. Redirect based on role:
   - **Admin** → `admin/dashboard.html`
   - **Customer** → `index.html`

### Role Assignment:
- All signups default to `role: "customer"`
- To create an admin:
  1. Sign up normally through the form
  2. Manually update the Firestore document to set `role: "admin"`
  3. Use Firebase Console or a script:
     ```javascript
     // In Firebase Console > Firestore
     // Find user document and edit role field to "admin"
     ```

## App.js Auth State Listener

When `app.js` detects auth state changes:

### For Admin Users (`role === "admin"`):
- Shows admin screen with dashboard, menu management, reports, messaging
- Loads admin-specific data
- If on login page, redirects to `admin/dashboard.html`

### For Customer Users (`role === "customer"` or undefined):
- Shows customer-facing UI
- Populates order form with saved profile data (name, phone, address)
- If on login page, redirects to `index.html`

### For Logged-Out Users:
- Protected pages (`/admin/*`, `/customer/*`) redirect to `login.html`
- Public pages show guest UI with login button

## Creating Your First Admin

Since signup defaults to customer role:

1. Sign up with your admin credentials
2. Go to [Firebase Console](https://console.firebase.google.com)
3. Navigate to Firestore Database
4. Find `users` collection
5. Locate your user document (by email)
6. Edit the `role` field and change to `"admin"`
7. Log out and log back in
8. You'll be redirected to `admin/dashboard.html`

## Troubleshooting

### "Cannot GET /dashboard.html"
- **Cause**: Old login.js was redirecting to non-existent `dashboard.html`
- **Fix**: Updated to role-based routing (admin → `admin/dashboard.html`, customer → `index.html`)

### Signup Missing Fields
- **Status**: ✅ Fixed
- All fields (name, phone, address) are now collected and stored properly

### Profile Data Not Showing
- Check Firestore security rules allow read/write for authenticated users
- Verify field names match: `name`, `phone`, `address`, `email`, `role`
