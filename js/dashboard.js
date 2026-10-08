// ============================================================
// dashboard.js - logic for dashboard.html
// ============================================================

import { requireLogin, logout } from "./auth.js";
import { floors, getFloor } from "../data/floors.js";
import { syncLocationsFromFirestore } from "../data/locations.js";


// ------------------------------------------------------------
// Small helpers
// ------------------------------------------------------------

/** Make text safe before putting it into innerHTML (prevents HTML injection). */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

function showSearchMessage(text, type = "info") {
  const box = document.getElementById("searchMessage");
  box.textContent = text;
  box.className = "alert alert-" + type;
}

function hideSearchMessage() {
  document.getElementById("searchMessage").className = "alert hidden";
}


// ------------------------------------------------------------
// 1. START: make sure the user is logged in, then fill the page
// ------------------------------------------------------------
const { profile } = await requireLogin();   // redirects to login.html if not logged in

await syncLocationsFromFirestore();   // STEP 15

const firstName = (profile.name || "User").split(" ")[0];
document.getElementById("welcomeName").textContent = profile.name || "User";
document.getElementById("headerName").textContent = firstName;
document.getElementById("avatar").textContent = firstName.charAt(0).toUpperCase();
document.getElementById("menuName").textContent = profile.name || "User";
document.getElementById("menuEmail").textContent = profile.email || "";
document.getElementById("menuRole").textContent = profile.role || "student";

// Admin link is visible only for admins
if (profile.role === "admin") {
  document.getElementById("adminLink").classList.remove("hidden");
  document.getElementById("menuAdminLink").classList.remove("hidden");
}


// ------------------------------------------------------------
// 2. HEADER BUTTONS
// ------------------------------------------------------------
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
// Close the mobile menu after choosing a link
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


// ------------------------------------------------------------
// 3. FLOOR CARDS
// ------------------------------------------------------------
const floorGrid = document.getElementById("floorGrid");

floors.forEach((floor) => {
  const card = document.createElement("div");
  card.className = "floor-card";
  card.innerHTML = `
    <div class="floor-letter">${escapeHtml(floor.id)}</div>
    <h3>${escapeHtml(floor.name.toUpperCase())}</h3>
    <p>${escapeHtml(floor.description)}</p>
    <a class="btn btn-primary" href="map.html?floor=${floor.id}">View Map</a>
  `;
  floorGrid.appendChild(card);
});


// ------------------------------------------------------------
// 4. GLOBAL SEARCH
// ------------------------------------------------------------
// search.js is written in Step 10. It must export:
//     searchLocations(query)  ->  array of location objects
// We load it only when the user searches, so the dashboard still
// works before Step 10 exists.

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const resultsBox = document.getElementById("searchResults");

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideSearchMessage();
  resultsBox.innerHTML = "";

  const query = searchInput.value.trim();

  // Error handling: empty search
  if (!query) {
    showSearchMessage("Please type a room number or name to search.", "error");
    return;
  }

  // Load the search module
  let searchLocations;
  try {
    const module = await import("./search.js");
    searchLocations = module.searchLocations;
    if (typeof searchLocations !== "function") throw new Error("not ready");
  } catch (err) {
    console.warn("search.js is not ready yet:", err);
    showSearchMessage("Search is not ready yet. It will be activated in Step 10.", "info");
    return;
  }

  // Run the search
  let results = [];
  try {
    results = await searchLocations(query);
  } catch (err) {
    console.error(err);
    showSearchMessage("Search failed. Please try again.", "error");
    return;
  }

  // Error handling: nothing found
  if (results.length === 0) {
    showSearchMessage(`No location found for "${query}". Try a room number like E-10.`, "error");
    return;
  }

  showSearchMessage(`${results.length} result(s) found.`, "success");
  results.forEach(showResult);
});

/** Build one result card. */
function showResult(loc) {
  const floor = getFloor(loc.floor);
  const floorName = floor ? floor.name : loc.floor + " Floor";

  const card = document.createElement("div");
  card.className = "result-card";
  card.innerHTML = `
    <div>
      <div class="r-name">${escapeHtml(loc.name)}</div>
      <div class="r-meta">Room ${escapeHtml(loc.id)} &middot; ${escapeHtml(floorName)} &middot; ${escapeHtml(loc.type)}</div>
    </div>
    <div class="result-actions">
      <a class="btn btn-outline"
         href="map.html?floor=${encodeURIComponent(loc.floor)}&room=${encodeURIComponent(loc.id)}">View Location</a>
      <a class="btn btn-accent"
         href="map.html?floor=${encodeURIComponent(loc.floor)}&room=${encodeURIComponent(loc.id)}&navigate=1">Navigate</a>
    </div>
  `;
  resultsBox.appendChild(card);
}