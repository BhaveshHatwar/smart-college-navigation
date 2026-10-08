// ============================================================
// locations.js - merges the four floor files and offers lookups
//
// Usage in other files:
//   import { allLocations, getLocationById } from "../data/locations.js";
// ============================================================

import { cFloorLocations } from "./c-floor-locations.js";
import { dFloorLocations } from "./d-floor-locations.js";
import { eFloorLocations } from "./e-floor-locations.js";
import { fFloorLocations } from "./f-floor-locations.js";

import { db } from "../js/firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/** Every location on every floor in one array. */
export const allLocations = [
  ...cFloorLocations,
  ...dFloorLocations,
  ...eFloorLocations,
  ...fFloorLocations
];

/** Set to false once you have replaced the demo data with real data. */
export const isDemoData = true;

/** Find one location by its id, e.g. "E-10". Returns undefined if missing. */
export function getLocationById(id) {
  const wanted = String(id).trim().toUpperCase();
  return allLocations.find((loc) => loc.id.toUpperCase() === wanted);
}

/** All locations on one floor, e.g. getLocationsByFloor("E"). */
export function getLocationsByFloor(floorId) {
  const wanted = String(floorId).trim().toUpperCase();
  return allLocations.filter((loc) => loc.floor === wanted);
}

/** Find a location by its navigation node, e.g. "E-node-10". */
export function getLocationByNode(nodeId) {
  return allLocations.find((loc) => loc.nodeId === nodeId);
}

/** Only rooms people want to go to (hides lifts and stairs). */
export function getDestinations() {
  return allLocations.filter((loc) => loc.type !== "Lift" && loc.type !== "Stairs");
}

/**
 * Check the data for mistakes. Returns a list of problem messages
 * (an empty list means everything is fine).
 */
export function validateLocations() {
  const problems = [];
  const seenIds = new Set();
  const required = ["id", "name", "floor", "type", "description", "nodeId"];

  allLocations.forEach((loc, index) => {
    required.forEach((field) => {
      if (!loc[field]) problems.push(`Entry #${index + 1} (${loc.id || "?"}): missing "${field}"`);
    });
    if (seenIds.has(loc.id)) problems.push(`Duplicate id: ${loc.id}`);
    seenIds.add(loc.id);
    if (loc.id && loc.floor && !loc.id.startsWith(loc.floor + "-")) {
      problems.push(`${loc.id}: id does not start with its floor letter "${loc.floor}"`);
    }
  });
  return problems;
}

// ------------------------------------------------------------
// FIRESTORE: use the database as the source of truth when it has data
// ------------------------------------------------------------
let locationsSource = "demo files";     // "demo files" or "Firestore"

/** Where the current data came from (shown in the admin panel). */
export function getLocationsSource() {
  return locationsSource;
}

/**
 * Load locations/{roomId} documents from Firestore.
 * - If the collection has documents, they REPLACE the demo data.
 * - If it is empty or Firestore fails, the demo data stays (the app still works).
 * allLocations is changed IN PLACE so every file that imported it sees the change.
 * Returns true if Firestore data is now in use.
 */
export async function syncLocationsFromFirestore() {
  try {
    const snapshot = await getDocs(collection(db, "locations"));
    if (snapshot.empty) return false;

    const fromDatabase = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
    allLocations.length = 0;                 // empty the shared array...
    allLocations.push(...fromDatabase);      // ...and refill it
    locationsSource = "Firestore";
    return true;
  } catch (error) {
    console.warn("Could not load locations from Firestore, using demo data:", error);
    return false;
  }
}