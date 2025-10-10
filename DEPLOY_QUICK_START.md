# 🚀 Quick Start: Deploy to GitHub Pages

## ⚡ Fast Deployment (3 Steps)

### 1️⃣ Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** > **Settings** > **Authorized domains**
3. Add your GitHub Pages URL:
   ```
   YOUR-USERNAME.github.io
   YOUR-USERNAME.github.io/cloud-kitchen
   ```
   Replace `YOUR-USERNAME` with your actual GitHub username and `cloud-kitchen` with your repo name

### 2️⃣ Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** > **Pages**
3. Under "Source":
   - Select **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
4. Click **Save**

### 3️⃣ Wait & Test

- **Deployment time:** 2-5 minutes
- **Your URL:** `https://YOUR-USERNAME.github.io/REPO-NAME/`
- **Test:** Open the URL and try logging in

---

## ✅ What's Already Done

All files are pre-configured for GitHub Pages:

- ✅ All HTML files use relative paths (`./`)
- ✅ `config.js` auto-detects GitHub Pages environment
- ✅ Service worker uses relative paths
- ✅ GitHub Actions workflow created
- ✅ Firebase compatible with GitHub Pages

---

## 🧪 Testing Checklist

After deployment, verify:

- [ ] Home page loads
- [ ] Navigation works
- [ ] Login/Signup works
- [ ] Images load
- [ ] CSS styles applied
- [ ] Theme toggle works

---

## 🐛 Common Issues

**Firebase Auth Error?**
→ Add your GitHub Pages URL to Firebase authorized domains

**404 Errors?**
→ Wait 5 minutes for deployment to complete

**No Styles?**
→ Hard refresh with Ctrl+Shift+R

---

## 📚 Full Documentation

For detailed instructions, troubleshooting, and advanced configurations:
→ See [GITHUB_PAGES_DEPLOYMENT.md](./GITHUB_PAGES_DEPLOYMENT.md)

---

## 🎯 Your URLs

**Main Site:**
```
https://YOUR-USERNAME.github.io/REPO-NAME/
```

**Login:**
```
https://YOUR-USERNAME.github.io/REPO-NAME/login.html
```

**Admin Dashboard:**
```
https://YOUR-USERNAME.github.io/REPO-NAME/admin/dashboard.html
```

---

**That's it!** Your cloud kitchen is now live on GitHub Pages! 🎉
