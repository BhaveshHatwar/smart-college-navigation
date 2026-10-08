// ============================================================
// auth.js  -  Login, Registration, Password reset, Logout
// Works with Firebase Authentication + Firestore
// ============================================================

import { auth, db ,isFirebaseConfigured} from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ------------------------------------------------------------
// 1. SMALL HELPER FUNCTIONS
// ------------------------------------------------------------

/** Convert Firebase error codes into friendly messages. */
function friendlyError(error) {
  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password. Please try again.";
    case "auth/email-already-in-use":
      return "This email is already registered. Try logging in instead.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Cannot connect to Firebase. Check your internet connection.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return "Firebase is not configured yet. Paste your keys into js/firebase-config.js.";
    case "permission-denied":
    case "firestore/permission-denied":
      return "Database permission denied. Check your Firestore security rules.";
    default:
      return "Something went wrong (" + (error.code || error.message) + "). Please try again.";
  }
}

/** Show a message box. type = "error" | "success" | "info" */
function showMessage(text, type = "error") {
  const box = document.getElementById("message");
  if (!box) return;
  box.textContent = text;
  box.className = "alert alert-" + type;   // also removes the "hidden" class
}

function hideMessage() {
  const box = document.getElementById("message");
  if (box) box.className = "alert hidden";
}

/** Turn a button into a "loading" button, or restore it. */
function setLoading(button, isLoading, loadingText) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText || "Please wait...";
    button.disabled = true;
    button.classList.add("loading");
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove("loading");
  }
}

/** Very simple email format check. */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// ------------------------------------------------------------
// 2. FIRESTORE USER PROFILE
// ------------------------------------------------------------

/** Create users/{uid} document. New users are always "student". */
async function createUserProfile(user, name) {
  await setDoc(doc(db, "users", user.uid), {
    name: name,
    email: user.email,
    role: "student",
    createdAt: serverTimestamp()
  });
}

/** Read users/{uid}. Returns null if it does not exist. */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}


// ------------------------------------------------------------
// 3. FUNCTIONS OTHER PAGES WILL IMPORT
// ------------------------------------------------------------

/**
 * Use at the top of dashboard.js / map.js:
 *   const { user, profile } = await requireLogin();
 * If nobody is logged in, the visitor is sent to login.html.
 */
export function requireLogin() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      let profile = null;
      try {
        profile = await getUserProfile(user.uid);
      } catch (err) {
        console.error("Could not read user profile:", err);
      }
      // Fallback if the profile document is missing
      if (!profile) {
        profile = {
          name: user.displayName || user.email.split("@")[0],
          email: user.email,
          role: "student"
        };
      }
      resolve({ user, profile });
    });
  });
}

/** Log out and go back to the login page. */
export async function logout() {
  try {
    await signOut(auth);
  } finally {
    window.location.href = "login.html";
  }
}


// ------------------------------------------------------------
// 4. SHOW / HIDE PASSWORD BUTTONS (both pages)
// ------------------------------------------------------------
document.querySelectorAll("[data-toggle]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.toggle);
    const hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    btn.textContent = hidden ? "Hide" : "Show";
  });
});


// ------------------------------------------------------------
// 5. LOGIN PAGE
// ------------------------------------------------------------
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// While login/register is running, we must NOT auto-redirect yet
let busy = false;

if (loginForm) {
  const loginBtn = document.getElementById("loginBtn");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();          // stop the page from reloading
    hideMessage();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Validation
    if (!email || !password) {
      showMessage("Please enter both email and password.");
      return;
    }
    if (!isValidEmail(email)) {
      showMessage("Please enter a valid email address.");
      return;
    }

    busy = true;
    setLoading(loginBtn, true, "Logging in...");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      // If this user has no Firestore profile yet (e.g. created from the
      // Firebase console), create one now.
      const profile = await getUserProfile(result.user.uid);
      if (!profile) {
        const fallbackName = result.user.displayName || email.split("@")[0];
        await createUserProfile(result.user, fallbackName);
      }

      window.location.href = "dashboard.html";
    } catch (error) {
      console.error(error);
      showMessage(friendlyError(error));
      setLoading(loginBtn, false);
      busy = false;
    }
  });

  // ----- Forgot password -----
  document.getElementById("forgotBtn").addEventListener("click", async () => {
    hideMessage();
    const email = document.getElementById("email").value.trim();

    if (!email) {
      showMessage("Type your email in the Email box first, then click 'Forgot password?'.", "info");
      return;
    }
    if (!isValidEmail(email)) {
      showMessage("Please enter a valid email address.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showMessage("Password reset email sent. Check your inbox (and spam folder).", "success");
    } catch (error) {
      console.error(error);
      showMessage(friendlyError(error));
    }
  });
}


// ------------------------------------------------------------
// 6. REGISTER PAGE
// ------------------------------------------------------------
if (registerForm) {
  const registerBtn = document.getElementById("registerBtn");

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      showMessage("Please fill in all fields.");
      return;
    }
    if (name.length < 2) {
      showMessage("Please enter your full name.");
      return;
    }
    if (!isValidEmail(email)) {
      showMessage("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      showMessage("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      showMessage("Passwords do not match.");
      return;
    }

    busy = true;
    setLoading(registerBtn, true, "Creating account...");

    try {
      // 1. Create the login account
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Save the name on the login account too
      await updateProfile(result.user, { displayName: name });

      // 3. Create the Firestore document: users/{userId}
      await createUserProfile(result.user, name);

      // 4. Go to the dashboard
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error(error);
      showMessage(friendlyError(error));
      setLoading(registerBtn, false);
      busy = false;
    }
  });
}


// ------------------------------------------------------------
// 7. ALREADY LOGGED IN? SKIP THE LOGIN / REGISTER PAGE
// ------------------------------------------------------------
if (loginForm || registerForm) {
  onAuthStateChanged(auth, (user) => {
    if (user && !busy) {
      window.location.href = "dashboard.html";
    }
  });
}