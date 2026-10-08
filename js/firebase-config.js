// ============================================================
// firebase-config.js
// Connects the website to YOUR Firebase project.
// Every other JS file imports "auth" and "db" from here.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// -----------------------------------------------------------
// STEP 1: REPLACE THESE PLACEHOLDER VALUES WITH YOUR OWN.
// Firebase Console -> Project settings -> General -> Your apps
// -----------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyCB6rlfoYGGRVOY-u636uf0nTTeagmH3Yg",
    authDomain: "smart-college-navigation-a2c38.firebaseapp.com",
    projectId: "smart-college-navigation-a2c38",
    storageBucket: "smart-college-navigation-a2c38.firebasestorage.app",
    messagingSenderId: "259605866075",
    appId: "1:259605866075:web:91d5bc80632ad2f92dc17e"
  };

// Start Firebase
const app = initializeApp(firebaseConfig);

// Export the two services the project needs
export const auth = getAuth(app);        // login / register / logout
export const db = getFirestore(app);     // Firestore database

// True once the placeholders have been replaced
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";