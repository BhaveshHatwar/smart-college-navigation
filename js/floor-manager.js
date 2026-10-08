// ============================================================
// floor-manager.js
// Builds the C/D/E/F tab bar and switches floor maps dynamically.
//
// Other files use it like this:
//   initFloorManager({ selector, canvas });
//   onFloorChange((floor, svg) => { ... });
//   await loadFloor("E");
// ============================================================

import { floors, getFloor } from "../data/floors.js";

let selectorEl = null;     // the <div> that holds the tabs
let canvasEl = null;       // the <div> that holds the SVG
let currentFloorId = null; // "C", "D", "E" or "F"
let loadCounter = 0;       // used to ignore slow, outdated loads
const svgCache = {};       // floor id -> SVG text (so we fetch each file once)
const listeners = [];      // functions to call after a floor is loaded


// ------------------------------------------------------------
// Public functions
// ------------------------------------------------------------

/** Call once when the page starts. */
export function initFloorManager({ selector, canvas }) {
  selectorEl = selector;
  canvasEl = canvas;
  buildTabs();
}

/** Register a function that runs every time a floor map finishes loading. */
export function onFloorChange(callback) {
  listeners.push(callback);
}

/** Which floor is shown right now? ("C", "D", "E", "F" or null) */
export function getCurrentFloor() {
  return currentFloorId;
}

/** Return the <svg> element currently on the screen (or null). */
export function getCurrentSvg() {
  return canvasEl ? canvasEl.querySelector("svg") : null;
}

/**
 * Load a floor map into the page.
 * Returns true if the map loaded, false if there was a problem.
 */
export async function loadFloor(floorId) {
  // Error handling: invalid floor
  const floor = getFloor(floorId);
  if (!floor) {
    showMapMessage(
      `"${floorId}" is not a valid floor. Please choose C, D, E or F.`,
      "error"
    );
    return false;
  }

  // Each call gets a number. If the user clicks another floor while this
  // one is still loading, the older call notices and stops.
  const myNumber = ++loadCounter;

  // Show the new floor as selected immediately
  currentFloorId = floor.id;
  highlightTab(floor.id);
  updateUrl(floor.id);
  showMapMessage(`Loading ${floor.name}...`, "info");

  try {
    let svgText = svgCache[floor.id];

    if (!svgText) {
      const response = await fetch(floor.svgFile);
      if (!response.ok) {
        throw new Error("File not found (HTTP " + response.status + ")");
      }
      const text = await response.text();

      // Error handling: missing / empty map
      const start = text.indexOf("<svg");
      if (start === -1) {
        throw new Error("The file does not contain an <svg> map yet");
      }
      // Remove any <?xml ...?> line before the <svg> tag
      svgText = text.slice(start);
      svgCache[floor.id] = svgText;
    }

    // A newer floor was requested meanwhile, so drop this result
    if (myNumber !== loadCounter) return false;

    // Put the SVG on the page (this replaces the previous floor)
    canvasEl.innerHTML = svgText;
    const svg = canvasEl.querySelector("svg");

    // Tell other modules (map.js, navigation.js ...) that a floor is ready
    listeners.forEach((callback) => callback(floor, svg));
    return true;

  } catch (error) {
    if (myNumber !== loadCounter) return false;
    console.error("Could not load map for floor " + floor.id, error);
    showMapMessage(
      `The map for ${floor.name} could not be loaded. ` +
      `Check that "${floor.svgFile}" exists and contains an SVG map. (${error.message})`,
      "error"
    );
    return false;
  }
}


// ------------------------------------------------------------
// Private helpers
// ------------------------------------------------------------

/** Create one button per floor from data/floors.js */
function buildTabs() {
  selectorEl.innerHTML = "";
  floors.forEach((floor) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "floor-tab";
    button.dataset.floor = floor.id;
    button.textContent = floor.name.toUpperCase();
    button.addEventListener("click", () => {
      if (floor.id !== currentFloorId) loadFloor(floor.id);
    });
    selectorEl.appendChild(button);
  });
}

/** Highlight the selected tab, un-highlight the others. */
function highlightTab(floorId) {
  selectorEl.querySelectorAll(".floor-tab").forEach((button) => {
    const isActive = button.dataset.floor === floorId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

/** Keep the address bar in sync (?floor=E) without reloading the page. */
function updateUrl(floorId) {
  const url = new URL(window.location.href);
  url.searchParams.set("floor", floorId);
  window.history.replaceState({}, "", url);
}

/** Show a message in the map area (loading, error ...). */
function showMapMessage(text, type) {
  const box = document.createElement("div");
  box.className = "map-message map-message-" + type;
  box.textContent = text;
  canvasEl.innerHTML = "";
  canvasEl.appendChild(box);
}