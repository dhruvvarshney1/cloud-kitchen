# 🚀 GitHub Pages Deployment Guide

## Complete Guide for Deploying Home-Coming Cloud Kitchen to GitHub Pages

This guide will walk you through deploying your cloud kitchen website to GitHub Pages with Firebase authentication.

---

## 📋 Pre-Deployment Checklist

### ✅ Files Updated for GitHub Pages
All the necessary changes have been made to make your website GitHub Pages compatible:

1. **✅ HTML Files Updated** - All paths now use relative notation (./)
   - index.html
   - login.html
   - signup.html
   - menu.html
   - order.html
   - admin/dashboard.html
   - admin/menu-management.html
   - admin/reports.html
   - admin/messaging.html

2. **✅ Configuration Files Created**
   - `config.js` - Auto-detects GitHub Pages environment
   - `.github/workflows/deploy.yml` - Automated deployment workflow
   - Service worker already uses relative paths

3. **✅ Firebase Integration**
   - Uses Firebase SDK v8 (compat) for better compatibility
   - Auth configuration ready for GitHub Pages URLs

---

## 🔧 Step 1: Firebase Console Setup

### Add GitHub Pages to Authorized Domains

1. **Open Firebase Console**
   - Go to https://console.firebase.google.com/
   - Select your project

2. **Navigate to Authentication Settings**
   - Click "Authentication" in the left sidebar
   - Click "Settings" tab
   - Scroll to "Authorized domains" section

3. **Add Your GitHub Pages URLs**
   
   Click "Add domain" and add these URLs:
   
   ```
   YOUR-USERNAME.github.io
   ```
   
   If your repository is named something other than `YOUR-USERNAME.github.io`, also add:
   ```
   YOUR-USERNAME.github.io/REPO-NAME
   ```
   
   **Example:**
   If your GitHub username is `johndoe` and repository is `cloud-kitchen`:
   ```
   johndoe.github.io
   johndoe.github.io/cloud-kitchen
   ```

4. **Save Changes**
   - Click "Add" for each domain
   - Wait for confirmation

### Update Firebase Config (if needed)

Make sure `js/firebase-config.js` has your correct Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR-API-KEY",
  authDomain: "YOUR-PROJECT.firebaseapp.com",
  projectId: "YOUR-PROJECT-ID",
  storageBucket: "YOUR-PROJECT.appspot.com",
  messagingSenderId: "YOUR-SENDER-ID",
  appId: "YOUR-APP-ID"
};

window.firebaseConfig = firebaseConfig;
```

---

## 🌐 Step 2: Enable GitHub Pages

### Method A: Using GitHub Web Interface

1. **Go to Your Repository Settings**
   - Navigate to your GitHub repository
   - Click "Settings" tab

2. **Scroll to Pages Section**
   - In the left sidebar, click "Pages"

3. **Configure Source**
   - **Source:** Select "Deploy from a branch"
   - **Branch:** Select `main` (or `master`)
   - **Folder:** Select `/ (root)`
   - Click "Save"

4. **Wait for Deployment**
   - GitHub will show "Your site is live at ..."
   - Initial deployment takes 2-5 minutes

### Method B: Using GitHub Actions (Automated)

The workflow file `.github/workflows/deploy.yml` is already created!

1. **Push Your Code**
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

2. **Enable GitHub Actions**
   - Go to repository Settings > Pages
   - Under "Build and deployment"
   - Select "Source: GitHub Actions"

3. **Monitor Deployment**
   - Go to "Actions" tab in your repository
   - Watch the deployment workflow

---

## 🧪 Step 3: Test Your Deployment

### Your Site URLs

After deployment, your site will be available at:

**If repository name is `YOUR-USERNAME.github.io`:**
```
https://YOUR-USERNAME.github.io/
https://YOUR-USERNAME.github.io/login.html
https://YOUR-USERNAME.github.io/signup.html
```

**If repository has a different name (e.g., `cloud-kitchen`):**
```
https://YOUR-USERNAME.github.io/cloud-kitchen/
https://YOUR-USERNAME.github.io/cloud-kitchen/login.html
https://YOUR-USERNAME.github.io/cloud-kitchen/signup.html
```

### Testing Checklist

Open your deployed site and test:

- [ ] **Home page loads** without 404 errors
- [ ] **CSS styles** are applied correctly
- [ ] **Logo and images** load
- [ ] **Navigation links** work between pages
- [ ] **Login page** loads
- [ ] **Firebase authentication** works
  - Try creating an account
  - Try logging in
  - Check browser console for errors
- [ ] **Order form** works
- [ ] **Admin dashboard** loads (if admin user)
- [ ] **Theme toggle** works
- [ ] **Service worker** registers (check DevTools > Application)

---

## 🐛 Troubleshooting Common Issues

### Issue 1: 404 Errors for CSS/JS Files

**Symptom:** Page loads but has no styling, console shows 404 errors

**Solution:**
1. Check that all paths start with `./` in HTML files
2. Verify files are committed to repository
3. Clear browser cache (Ctrl+Shift+R)

### Issue 2: Firebase Auth Fails

**Symptom:** "auth/unauthorized-domain" error

**Solution:**
1. Double-check Firebase Console > Authentication > Authorized domains
2. Make sure you added the exact GitHub Pages URL
3. Wait 5-10 minutes after adding domain for changes to propagate

### Issue 3: Page Not Found (404)

**Symptom:** GitHub Pages shows 404 page

**Solution:**
1. Verify `index.html` exists in root directory
2. Check GitHub Pages settings are correct
3. Wait 5-10 minutes for deployment to complete
4. Try accessing with trailing slash: `https://username.github.io/repo/`

### Issue 4: Service Worker Not Registering

**Symptom:** Offline functionality doesn't work

**Solution:**
1. GitHub Pages requires HTTPS (✅ automatic)
2. Check browser console for service worker errors
3. Verify `sw.js` is in root directory
4. Clear Application > Service Workers in DevTools

### Issue 5: Images Don't Load

**Symptom:** Broken image icons

**Solution:**
1. Verify images exist in `assets/images/` folder
2. Check image paths use `./` prefix
3. Ensure images are committed to git
4. Check file names match exactly (case-sensitive)

---

## 🔍 Debugging Tips

### Enable Debug Mode

The `config.js` file automatically enables debug mode for local development.

Check browser console for:
```
📦 App Configuration: {
  basePath: "/cloud-kitchen",
  baseUrl: "https://username.github.io/cloud-kitchen",
  environment: "production"
}
```

### Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Look for:
   - ✅ Green status codes (200, 304)
   - ❌ Red status codes (404, 500)

### Verify Firebase Connection

Add to any page temporarily:
```html
<script>
console.log('Firebase loaded:', typeof firebase !== 'undefined');
console.log('Auth ready:', typeof firebase?.auth === 'function');
</script>
```

---

## 🔄 Updating Your Site

### After Making Changes

1. **Test Locally First**
   ```bash
   npx http-server . -p 8080
   ```
   Open http://localhost:8080

2. **Commit and Push**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

3. **Wait for Deployment**
   - GitHub Actions: Check "Actions" tab (2-5 minutes)
   - Branch deployment: Automatic (2-5 minutes)

4. **Clear Cache and Test**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Test all functionality

---

## 🎨 Custom Domain (Optional)

### Using Your Own Domain

1. **Buy a Domain** (e.g., homecomingkitchen.com)

2. **Add DNS Records**
   - Type: A
   - Name: @
   - Value: 
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153

3. **Add CNAME Record** (for www)
   - Type: CNAME
   - Name: www
   - Value: YOUR-USERNAME.github.io

4. **Configure in GitHub**
   - Settings > Pages
   - Custom domain: homecomingkitchen.com
   - Save

5. **Update Firebase**
   - Add custom domain to authorized domains

6. **Enable HTTPS** (automatic after DNS propagation)

---

## 📊 Performance Optimization

### Already Implemented
- ✅ Service Worker for offline support
- ✅ Relative paths for faster loading
- ✅ CDN-hosted Firebase SDK
- ✅ Minimal CSS/JS bundling

### Additional Improvements

1. **Enable Caching**
   - GitHub Pages automatically caches static assets

2. **Compress Images**
   - Use tools like TinyPNG before committing

3. **Monitor Performance**
   - Use Lighthouse in Chrome DevTools
   - Aim for 90+ scores

---

## 🔒 Security Checklist

- [ ] Firebase API keys are public (this is normal for client-side apps)
- [ ] Firebase security rules are configured
- [ ] Sensitive operations require authentication
- [ ] HTTPS is enabled (automatic on GitHub Pages)
- [ ] Environment-specific configs use `config.js`

---

## 📱 PWA Installation

Your site is already a Progressive Web App!

Users can install it:
1. **Desktop:** Browser menu > Install
2. **Mobile:** "Add to Home Screen" prompt

---

## 📞 Support & Resources

### Helpful Links
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth/web/start)
- [PWA Deployment Guide](https://web.dev/pwa-checklist/)

### Quick Reference Commands

```bash
# Test locally
npx http-server . -p 8080

# Commit changes
git add .
git commit -m "Update content"
git push origin main

# Check deployment status
# Visit: https://github.com/USERNAME/REPO/actions
```

---

## ✅ Deployment Complete!

Your Home-Coming Cloud Kitchen website is now live on GitHub Pages! 🎉

**Next Steps:**
1. Share your URL with users
2. Test all features thoroughly
3. Monitor Firebase usage in console
4. Set up analytics (optional)
5. Add custom domain (optional)

**Your Site:** `https://YOUR-USERNAME.github.io/REPO-NAME/`

---

## 🎯 Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| CSS not loading | Check file paths start with `./` |
| Firebase auth fails | Add URL to Firebase authorized domains |
| 404 errors | Verify files are committed and pushed |
| Images broken | Check paths and file names (case-sensitive) |
| Service worker issues | Check HTTPS and clear cache |

---

**Need Help?** Check the browser console for error messages and refer to the troubleshooting section above.

**Success Indicator:** When you see the Home-Coming logo, styled navigation, and can login/signup successfully, your deployment is working perfectly!
