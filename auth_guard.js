import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Importa firebaseConfig desde config.js
import { firebaseConfig } from "./config.js";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export function initAuthGuard() {
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = "3_Tu.html";
    }
  });
}
