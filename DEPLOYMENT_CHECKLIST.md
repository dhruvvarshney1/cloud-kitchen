# 🎯 GitHub Pages Deployment - Complete Checklist

## Pre-Deployment Phase

### ✅ Code Preparation
- [x] All HTML files use relative paths (`./`)
- [x] JavaScript imports use relative paths
- [x] CSS links use relative paths  
- [x] Image sources use relative paths
- [x] Navigation links use relative paths
- [x] `config.js` created for environment detection
- [x] GitHub Actions workflow created
- [x] Service worker uses relative paths

### ✅ Configuration Files
- [x] `config.js` - Environment detection
- [x] `.github/workflows/deploy.yml` - Automated deployment
- [x] `sw.js` - Service worker (already correct)
- [x] `manifest.json` - PWA manifest
- [x] `js/firebase-config.js` - Firebase credentials

---

## Firebase Setup

### 📋 Firebase Console Tasks

- [ ] **1. Open Firebase Console**
  - Go to https://console.firebase.google.com/
  - Select your project

- [ ] **2. Get Your Firebase Config**
  - Project Settings > General
  - Scroll to "Your apps"
  - Copy the config object
  - Paste into `js/firebase-config.js`

- [ ] **3. Add Authorized Domains**
  - Authentication > Settings > Authorized domains
  - Click "Add domain"
  - Add: `YOUR-USERNAME.github.io`
  - Add: `YOUR-USERNAME.github.io/REPO-NAME` (if applicable)
  - Click "Add" for each
  - ✅ Wait for confirmation

- [ ] **4. Verify Firebase Security Rules**
  - Firestore Database > Rules
  - Ensure rules require authentication for sensitive operations
  
Example rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## GitHub Repository Setup

### 📋 GitHub Tasks

- [ ] **1. Ensure Code is Pushed**
  ```bash
  git add .
  git commit -m "Setup GitHub Pages deployment"
  git push origin main
  ```

- [ ] **2. Repository Settings**
  - Go to your repository on GitHub
  - Click "Settings" tab
  
- [ ] **3. Enable GitHub Pages**
  - Scroll to "Pages" in left sidebar
  - Under "Source":
    - Select "Deploy from a branch"
    - Branch: `main` (or `master`)
    - Folder: `/ (root)`
  - Click "Save"
  - ✅ Note the URL shown

- [ ] **4. Optional: Enable GitHub Actions**
  - Go to "Actions" tab
  - Enable Actions if prompted
  - Workflow will run automatically on push

---

## Deployment Phase

### 📋 Deploy & Monitor

- [ ] **1. Trigger Deployment**
  - Push to main branch triggers automatic deployment
  - OR wait for GitHub to build from Pages settings

- [ ] **2. Monitor Deployment**
  - Go to "Actions" tab (if using GitHub Actions)
  - Watch the workflow progress
  - Check for green checkmark ✅
  - OR go to Settings > Pages to see status

- [ ] **3. Wait for Completion**
  - Initial deployment: 2-5 minutes
  - Subsequent deployments: 1-3 minutes
  - GitHub will show "Your site is published at..."

- [ ] **4. Note Your URLs**
  ```
  Main Site: https://YOUR-USERNAME.github.io/REPO-NAME/
  Login: https://YOUR-USERNAME.github.io/REPO-NAME/login.html
  Signup: https://YOUR-USERNAME.github.io/REPO-NAME/signup.html
  Menu: https://YOUR-USERNAME.github.io/REPO-NAME/menu.html
  Orders: https://YOUR-USERNAME.github.io/REPO-NAME/order.html
  Admin: https://YOUR-USERNAME.github.io/REPO-NAME/admin/dashboard.html
  ```

---

## Testing Phase

### 📋 Functional Testing

#### Homepage Tests
- [ ] Open `https://YOUR-USERNAME.github.io/REPO-NAME/`
- [ ] Verify logo loads
- [ ] Verify navigation bar appears
- [ ] Click "Menu" - should navigate correctly
- [ ] Click "Orders" - should navigate correctly
- [ ] Click "Login" - should navigate to login page
- [ ] Check browser console (F12) for errors
- [ ] Verify no 404 errors in Network tab

#### Authentication Tests  
- [ ] Go to signup page
- [ ] Fill out signup form
- [ ] Submit form
- [ ] Verify Firebase creates account
- [ ] Check that redirect works after signup
- [ ] Logout
- [ ] Go to login page
- [ ] Enter credentials
- [ ] Verify login works
- [ ] Check that "Login" button changes to "Logout"
- [ ] Check that header logout button appears
- [ ] Click logout - verify it works

#### Order Form Tests
- [ ] Navigate to Orders page
- [ ] Select delivery date
- [ ] Select time slot
- [ ] Choose menu items
- [ ] Fill delivery details
- [ ] Submit order
- [ ] Verify order is saved to Firestore
- [ ] Check confirmation message

#### Admin Tests (if you have admin account)
- [ ] Login with admin credentials
- [ ] Verify redirect to admin dashboard
- [ ] Check orders list loads
- [ ] Try updating order status
- [ ] Navigate to Menu Management
- [ ] Navigate to Reports
- [ ] Navigate to Messaging
- [ ] All admin tabs work correctly

#### PWA Tests
- [ ] Check for "Install app" prompt/button
- [ ] Install the PWA
- [ ] Launch installed app
- [ ] Verify it works offline (after first load)
- [ ] Check service worker in DevTools > Application

#### Theme Tests
- [ ] Click theme toggle button
- [ ] Verify dark mode activates
- [ ] Check all pages in dark mode
- [ ] Toggle back to light mode
- [ ] Refresh page - theme should persist

#### Mobile Tests
- [ ] Open on mobile device (or use DevTools device mode)
- [ ] Test navigation
- [ ] Test forms
- [ ] Test authentication
- [ ] Verify responsive design works

---

## Browser Console Checks

### 📋 DevTools Inspection

- [ ] **Open DevTools** (F12)

- [ ] **Console Tab**
  - [ ] No error messages (red)
  - [ ] Look for Firebase initialization confirmation
  - [ ] Check for app configuration log:
    ```
    📦 App Configuration: { basePath, baseUrl, environment }
    ```

- [ ] **Network Tab**
  - [ ] Refresh page
  - [ ] All requests show 200 or 304 status
  - [ ] No 404 errors for CSS/JS/images
  - [ ] Firebase CDN loads successfully

- [ ] **Application Tab**
  - [ ] Service Worker shows as "activated and running"
  - [ ] Cache Storage shows cached files
  - [ ] Manifest shows PWA information
  - [ ] Local Storage has theme preference

---

## Common Issues Checklist

### 🐛 Troubleshooting

- [ ] **Issue: Firebase Auth Fails**
  - Solution: Add GitHub Pages URL to Firebase authorized domains
  - Wait 5-10 minutes after adding domain

- [ ] **Issue: 404 for CSS/JS Files**
  - Solution: Verify all paths start with `./`
  - Check file names are correct (case-sensitive)
  - Ensure files are committed to git

- [ ] **Issue: Page Not Found (404)**
  - Solution: Wait 5 minutes for deployment
  - Check GitHub Pages settings are correct
  - Verify `index.html` exists in root

- [ ] **Issue: Images Don't Load**
  - Solution: Check image paths use `./`
  - Verify images exist in `assets/images/`
  - Check file names match exactly

- [ ] **Issue: Service Worker Errors**
  - Solution: Check HTTPS (automatic on GitHub Pages)
  - Clear Application > Service Workers in DevTools
  - Verify `sw.js` is in root directory

- [ ] **Issue: Theme Not Persisting**
  - Solution: Check localStorage is enabled
  - Verify theme-toggle.js is loaded
  - Check browser console for errors

---

## Performance Checks

### 📊 Lighthouse Audit

- [ ] **Run Lighthouse**
  - DevTools > Lighthouse tab
  - Select "Mobile" and all categories
  - Click "Analyze page load"

- [ ] **Target Scores**
  - Performance: 90+
  - Accessibility: 90+
  - Best Practices: 90+
  - SEO: 90+
  - PWA: Installable ✓

- [ ] **Review Opportunities**
  - Address any red or orange items
  - Check suggestions for improvements

---

## Security Verification

### 🔒 Security Checklist

- [ ] HTTPS enabled (automatic on GitHub Pages)
- [ ] Firebase security rules configured
- [ ] No sensitive credentials in code
- [ ] API keys are client-safe (Firebase)
- [ ] Authentication required for protected routes
- [ ] XSS protection in place
- [ ] CORS properly configured

---

## Post-Deployment

### 📋 Final Steps

- [ ] **Update README.md**
  - Add live site URL
  - Update installation instructions
  - Add screenshots

- [ ] **Create GitHub Release** (optional)
  - Tag version (e.g., v1.0.0)
  - Write release notes
  - Publish release

- [ ] **Monitor Firebase Usage**
  - Check Firebase Console > Usage
  - Set up billing alerts
  - Review quotas

- [ ] **Setup Analytics** (optional)
  - Google Analytics
  - Firebase Analytics
  - Monitor user behavior

- [ ] **Share Your Site!**
  - Send URL to users
  - Post on social media
  - Add to portfolio

---

## Ongoing Maintenance

### 📋 Regular Tasks

- [ ] **Weekly**
  - Check Firebase logs for errors
  - Monitor authentication issues
  - Review user feedback

- [ ] **Monthly**
  - Update dependencies
  - Review Firebase usage/costs
  - Check Lighthouse scores
  - Test all features

- [ ] **As Needed**
  - Update menu items
  - Add new features
  - Fix reported bugs
  - Deploy updates

---

## Update Workflow

### 📋 When Making Changes

1. **Test Locally**
   ```bash
   npx http-server . -p 8080
   # Test at http://localhost:8080
   ```

2. **Commit Changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. **Push to GitHub**
   ```bash
   git push origin main
   ```

4. **Monitor Deployment**
   - Check Actions tab
   - Wait 2-5 minutes
   - Test live site

5. **Verify Changes**
   - Hard refresh (Ctrl+Shift+R)
   - Test affected features
   - Check console for errors

---

## Emergency Rollback

### 📋 If Something Breaks

1. **Identify Last Working Commit**
   ```bash
   git log --oneline
   ```

2. **Revert to Previous Version**
   ```bash
   git revert HEAD
   # Or
   git reset --hard <commit-hash>
   git push --force origin main
   ```

3. **Wait for Redeployment**
   - Monitor Actions tab
   - Test site after deployment

---

## Success Criteria

### ✅ Deployment is Successful When:

- [x] Site loads without errors
- [x] All navigation works
- [x] Firebase authentication functional
- [x] Orders can be placed
- [x] Admin dashboard accessible
- [x] Service worker registered
- [x] PWA installable
- [x] Theme toggle works
- [x] Mobile responsive
- [x] All images load
- [x] No console errors

---

## Documentation Reference

Quick links to docs:
- **Quick Start:** `DEPLOY_QUICK_START.md`
- **Full Guide:** `GITHUB_PAGES_DEPLOYMENT.md`
- **Summary:** `DEPLOYMENT_SUMMARY.md`
- **Auth Docs:** `LOGOUT_BUTTON_IMPLEMENTATION.md`

---

## 🎉 Congratulations!

If all items above are checked, your Home-Coming Cloud Kitchen is successfully deployed to GitHub Pages!

**Your Live Site:** `https://YOUR-USERNAME.github.io/REPO-NAME/`

**Next:** Share it with the world! 🚀
