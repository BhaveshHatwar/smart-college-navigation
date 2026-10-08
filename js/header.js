// ============================================================
// header.js - fills in and activates the shared header
// Used by map.js now, and by admin.js / about page later.
// ============================================================

import { logout } from "./auth.js";

/** Call this after requireLogin() with the user's profile. */
export function setupHeader(profile) {
  const name = profile.name || "User";
  const firstName = name.split(" ")[0];

  document.getElementById("headerName").textContent = firstName;
  document.getElementById("avatar").textContent = firstName.charAt(0).toUpperCase();
  document.getElementById("menuName").textContent = name;
  document.getElementById("menuEmail").textContent = profile.email || "";
  document.getElementById("menuRole").textContent = profile.role || "student";

  // Admin links only for admins
  if (profile.role === "admin") {
    document.getElementById("adminLink").classList.remove("hidden");
    document.getElementById("menuAdminLink").classList.remove("hidden");
  }

  // Logout buttons
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("navLogout").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

  // Hamburger menu (mobile)
  const mainNav = document.getElementById("mainNav");
  document.getElementById("hamburger").addEventListener("click", () => {
    mainNav.classList.toggle("open");
  });
  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => mainNav.classList.remove("open"));
  });

  // Profile dropdown
  const profileMenu = document.getElementById("profileMenu");
  document.getElementById("profileBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!profileMenu.contains(e.target)) profileMenu.classList.add("hidden");
  });
}