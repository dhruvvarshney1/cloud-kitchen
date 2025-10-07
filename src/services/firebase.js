export const firebaseServiceMethods = {
  waitForFirebase,
  ensureFirebaseInitialized,
  detectHostingEnvironment,
};

function waitForFirebase(timeout = 5000) {
  if (window.firebase) return Promise.resolve(true);

  return new Promise((resolve) => {
    const start = Date.now();

    const check = () => {
      if (window.firebase) {
        resolve(true);
        return;
      }

      if (Date.now() - start >= timeout) {
        resolve(false);
        return;
      }

      window.setTimeout(check, 50);
    };

    check();
  });
}

async function ensureFirebaseInitialized() {
  if (this.firebaseInitialized && this.auth && this.db) {
    return true;
  }

  if (this.firebaseInitPromise) {
    return this.firebaseInitPromise;
  }

  this.firebaseInitPromise = (async () => {
    try {
      const ready = await this.waitForFirebase(10000);
      if (!ready) {
        console.error("Firebase SDK did not load in time.");
        this.showNotification("Could not connect to services. Please refresh.", "error");
        return false;
      }

      if (!window.firebase.apps || window.firebase.apps.length === 0) {
        console.log("Initializing new Firebase app...");
        this.firebaseApp = window.firebase.initializeApp(window.firebaseConfig);
      } else {
        console.log("Re-using existing Firebase app...");
        this.firebaseApp = window.firebase.app();
      }

      this.auth = window.firebase.auth();
      this.db = window.firebase.firestore();
      
      this.firebaseInitialized = true;
      console.log("Firebase services are ready.");
      return true;
    } catch (error) {
      console.error("Failed to initialize Firebase services:", error);
      this.firebaseInitialized = false;
      this.showNotification("Failed to initialize services. Check console.", "error");
      return false;
    } finally {
      this.firebaseInitPromise = null;
    }
  })();

  return this.firebaseInitPromise;
}

function detectHostingEnvironment() {
  if (window.location.protocol === "file:") {
    console.warn(
      "Running from file:// - Firebase Auth may not work properly"
    );
  }
}
