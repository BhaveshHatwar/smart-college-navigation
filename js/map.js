// ============================================================
// map.js - logic for map.html
// STEP 9: login, header, floor loading, zoom + pan,
//         clickable rooms, details panel, ?room=E-10 in the URL
// Later steps add: search (10), routes (11+)
// ============================================================

import { initNavigation } from "./navigation.js";
import { initMapSearch } from "./search.js";
import { requireLogin } from "./auth.js";
import { setupHeader } from "./header.js";
import { getFloor } from "../data/floors.js";
import { getLocationById, isDemoData, syncLocationsFromFirestore } from "../data/locations.js";
import {
  initFloorManager,
  loadFloor,
  onFloorChange,
  getCurrentFloor,
  getCurrentSvg
} from "./floor-manager.js";

// 1. Only logged-in users may see this page
const { profile } = await requireLogin();
setupHeader(profile);

await syncLocationsFromFirestore();   // STEP 15: use Firestore locations if they exist

// 2. Prepare the floor selector
initFloorManager({
  selector: document.getElementById("floorSelector"),
  canvas: document.getElementById("mapCanvas")
});


// ------------------------------------------------------------
// ZOOM AND PAN  (unchanged from Step 7)
// The visible part of the map is the SVG "viewBox": x, y, width, height.
// Smaller width = more zoomed in.
// ------------------------------------------------------------
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const DRAG_LIMIT = 5;

let svgEl = null;
let baseBox = null;
let view = null;
const pointers = new Map();
let lastPinchDistance = 0;
let dragStart = null;
let isDragging = false;
let justDragged = false;

function wasDragged() {
  return justDragged;
}

function setupZoomPan(svg) {
  svgEl = svg;
  const vb = svg.viewBox.baseVal;
  baseBox = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
  view = { ...baseBox };
  pointers.clear();
  isDragging = false;

  svg.addEventListener("wheel", onWheel, { passive: false });
  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", onPointerEnd);
  svg.addEventListener("pointercancel", onPointerEnd);
}

function applyView() {
  const cx = Math.min(Math.max(view.x + view.w / 2, baseBox.x), baseBox.x + baseBox.w);
  const cy = Math.min(Math.max(view.y + view.h / 2, baseBox.y), baseBox.y + baseBox.h);
  view.x = cx - view.w / 2;
  view.y = cy - view.h / 2;
  svgEl.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
}

function screenToMap(clientX, clientY) {
  const matrix = svgEl.getScreenCTM().inverse();
  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix);
  return { x: point.x, y: point.y };
}

function zoomBy(factor, cx, cy) {
  if (!svgEl) return;
  if (cx === undefined) {
    cx = view.x + view.w / 2;
    cy = view.y + view.h / 2;
  }
  const currentZoom = baseBox.w / view.w;
  const newZoom = Math.min(Math.max(currentZoom * factor, MIN_ZOOM), MAX_ZOOM);
  const ratio = currentZoom / newZoom;

  view.x = cx - (cx - view.x) * ratio;
  view.y = cy - (cy - view.y) * ratio;
  view.w *= ratio;
  view.h *= ratio;
  applyView();
}

function resetZoom() {
  if (!svgEl) return;
  view = { ...baseBox };
  applyView();
}

/** Zoom so that a box {x, y, w, h} (map coordinates) fills the view. */
function fitToBox(box, padding = 70) {
  if (!svgEl) return;
  const aspect = baseBox.w / baseBox.h;
  let w = box.w + padding * 2;
  let h = box.h + padding * 2;

  // Keep the same shape as the full map
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;

  // Never zoom out past the whole map, nor in past MAX_ZOOM
  w = Math.min(Math.max(w, baseBox.w / MAX_ZOOM), baseBox.w);
  h = w / aspect;

  view.w = w;
  view.h = h;
  view.x = box.x + box.w / 2 - w / 2;
  view.y = box.y + box.h / 2 - h / 2;
  applyView();
}

// navigation.js sends this event after drawing a route
document.addEventListener("map:fit", (event) => fitToBox(event.detail));

// "Clear Route" asks for the whole map to be shown again
document.addEventListener("map:reset", resetZoom);

function onWheel(event) {
  event.preventDefault();
  const point = screenToMap(event.clientX, event.clientY);
  zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15, point.x, point.y);
}

function onPointerDown(event) {
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  dragStart = { x: event.clientX, y: event.clientY };
  isDragging = false;
  lastPinchDistance = 0;
}

function onPointerMove(event) {
  const previous = pointers.get(event.pointerId);
  if (!previous) return;
  const current = { x: event.clientX, y: event.clientY };

  if (pointers.size === 2) {
    pointers.set(event.pointerId, current);
    const [a, b] = [...pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (lastPinchDistance > 0) {
      const middle = screenToMap((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomBy(distance / lastPinchDistance, middle.x, middle.y);
    }
    lastPinchDistance = distance;
    justDragged = true;
    return;
  }

  const moved = Math.hypot(current.x - dragStart.x, current.y - dragStart.y);
  if (!isDragging && moved > DRAG_LIMIT) {
    isDragging = true;
    svgEl.classList.add("dragging");
    svgEl.setPointerCapture(event.pointerId);
  }
  if (isDragging) {
    const scale = svgEl.getScreenCTM().a;
    view.x -= (current.x - previous.x) / scale;
    view.y -= (current.y - previous.y) / scale;
    applyView();
    justDragged = true;
  }
  pointers.set(event.pointerId, current);
}

function onPointerEnd(event) {
  pointers.delete(event.pointerId);
  lastPinchDistance = 0;
  isDragging = false;
  svgEl.classList.remove("dragging");
  setTimeout(() => { justDragged = false; }, 60);
}

document.getElementById("zoomIn").addEventListener("click", () => zoomBy(1.4));
document.getElementById("zoomOut").addEventListener("click", () => zoomBy(1 / 1.4));
document.getElementById("zoomReset").addEventListener("click", resetZoom);


// ============================================================
// STEP 9: ROOM SELECTION AND DETAILS PANEL
// ============================================================

// Step 11 will change this to true when navigation exists.
const NAVIGATION_ENABLED = true;

const infoPanel = document.getElementById("infoPanel");
const EMPTY_PANEL_HTML =
  '<p class="panel-empty">Click a room on the map to see its details.</p>';

let selectedId = null;     // the room currently selected, e.g. "E-10"

/** Make text safe before putting it into innerHTML. */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

// ----- URL: keep ?room=E-10 in the address bar (no page reload) -----
function setUrlRoom(roomId) {
  const url = new URL(window.location.href);
  if (roomId) url.searchParams.set("room", roomId);
  else url.searchParams.delete("room");
  url.searchParams.delete("navigate");   // used in Step 11
  window.history.replaceState({}, "", url);
}

// ----- Details panel -----
function showInfo(loc) {
  const floor = getFloor(loc.floor);
  const floorName = floor ? floor.name : loc.floor + " Floor";
  const description = String(loc.description || "").replace(/^DEMO:\s*/, "");

  infoPanel.innerHTML = `
    <div class="info-head">
      <h3>${escapeHtml(loc.name)}</h3>
      <button type="button" class="close-btn" id="closeInfo" title="Close" aria-label="Close">&times;</button>
    </div>
    ${isDemoData ? '<span class="demo-tag">DEMO DATA</span>' : ""}
    <table class="info-table">
      <tr><td>Room</td><td>${escapeHtml(loc.id)}</td></tr>
      <tr><td>Floor</td><td>${escapeHtml(floorName)}</td></tr>
      <tr><td>Type</td><td>${escapeHtml(loc.type)}</td></tr>
    </table>
    <div class="info-desc"><strong>Description</strong>${escapeHtml(description)}</div>
    <button type="button" class="btn btn-accent btn-block" id="navigateBtn">Navigate Here</button>
    <div id="navNotice" class="alert alert-info nav-notice hidden"></div>
  `;

  document.getElementById("closeInfo").addEventListener("click", clearSelection);
  document.getElementById("navigateBtn").addEventListener("click", () => onNavigateClick(loc));

  // On phones this panel is a bottom sheet (see map.css)
  infoPanel.classList.add("sheet");
  document.body.classList.add("sheet-open");
}

function showInfoError(text) {
  closeSheet();
  infoPanel.innerHTML = `<div class="alert alert-error" style="margin:0">${escapeHtml(text)}</div>`;
}

/** Close the phone bottom sheet. (On desktop these classes do nothing.) */
function closeSheet() {
  infoPanel.classList.remove("sheet");
  document.body.classList.remove("sheet-open");
}

/** The "Navigate Here" button. Steps 11-13 will plug in here. */
function onNavigateClick(loc) {
  if (NAVIGATION_ENABLED) {
    // Step 11 sends this event to navigation.js
    document.dispatchEvent(new CustomEvent("navigate:to", { detail: { id: loc.id } }));
  } else {
    const notice = document.getElementById("navNotice");
    notice.textContent = "Navigation will be activated in Step 11.";
    notice.classList.remove("hidden");
  }
}

// ----- Highlight on the map -----
function removeHighlight() {
  const svg = getCurrentSvg();
  if (!svg) return;
  svg.querySelectorAll(".room.selected").forEach((g) => g.classList.remove("selected"));
}

/** Highlight selectedId on the current floor. Returns the SVG element or null. */
function applyHighlight() {
  removeHighlight();
  const svg = getCurrentSvg();
  if (!svg || !selectedId) return null;
  const group = svg.querySelector(`[data-room="${CSS.escape(selectedId)}"]`);
  if (group) group.classList.add("selected");
  return group;
}

/** Zoom so that a room fills part of the screen. */
function zoomToRoom(group) {
  if (!svgEl || !group) return;
  const box = group.getBBox();
  const targetZoom = 2.5;
  view.w = baseBox.w / targetZoom;
  view.h = baseBox.h / targetZoom;
  view.x = box.x + box.width / 2 - view.w / 2;
  view.y = box.y + box.height / 2 - view.h / 2;
  applyView();
}

// ----- Select / clear -----

/**
 * Select a room by id (e.g. "E-10").
 * If it is on another floor, that floor is loaded first.
 * options.zoom = true also zooms the map to the room.
 */
async function selectRoom(id, options = {}) {
  const loc = getLocationById(id);

  // Error handling: unknown room
  if (!loc) {
    selectedId = null;
    removeHighlight();
    showInfoError(`Location "${id}" was not found.`);
    return false;
  }

  selectedId = loc.id;

  // Switch floor if needed
  if (getCurrentFloor() !== loc.floor) {
    const loaded = await loadFloor(loc.floor);
    if (!loaded) return false;
  }

  const group = applyHighlight();
  showInfo(loc);
  setUrlRoom(loc.id);

  // Error handling: the room is in the data but missing from the SVG
  if (!group) {
    const notice = document.getElementById("navNotice");
    notice.textContent = `Room ${loc.id} has no shape on the ${loc.floor} floor map yet.`;
    notice.classList.remove("hidden");
    return true;
  }

  if (options.zoom) zoomToRoom(group);
  return true;
}

function clearSelection() {
  closeSheet();
  selectedId = null;
  removeHighlight();
  infoPanel.innerHTML = EMPTY_PANEL_HTML;
  setUrlRoom(null);
}

// ----- Click on the map -----
// One listener on the whole SVG is enough (event delegation):
// we look for the closest element that has a data-room attribute.
function setupRoomClicks(svg) {
  svg.addEventListener("click", (event) => {
    if (wasDragged()) return;                       // the user was panning
    const group = event.target.closest("[data-room]");
    if (group) selectRoom(group.dataset.room);
  });

  // Keyboard: Tab to a room, press Enter or Space
  svg.querySelectorAll("[data-room]").forEach((group) => {
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", group.dataset.name + " " + group.dataset.room);
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectRoom(group.dataset.room);
      }
    });
  });
}

// Other files (search in Step 10) can ask the map to select a room:
//   document.dispatchEvent(new CustomEvent("room:select",
//        { detail: { id: "E-10", zoom: true } }));
document.addEventListener("room:select", (event) => {
  selectRoom(event.detail.id, { zoom: !!event.detail.zoom });
});

// When navigation starts, move the details out of the way.
// (The card then sits in the normal page flow, above the route card.)
document.addEventListener("navigate:to", closeSheet);


// ------------------------------------------------------------
// WHEN A FLOOR FINISHES LOADING
// ------------------------------------------------------------
initMapSearch();     // STEP 10: connect the search box
onFloorChange((floor, svg) => {
  document.getElementById("mapTitle").textContent = floor.name + " Map";
  document.title = floor.name + " - Smart College Navigation";
  setupZoomPan(svg);
  setupRoomClicks(svg);

  // Keep the selection only if that room belongs to this floor
  if (selectedId) {
    const loc = getLocationById(selectedId);
    if (loc && loc.floor === floor.id) applyHighlight();
    else clearSelection();
  }
});

initNavigation();     // STEP 11: route panel + Dijkstra + route drawing

// ------------------------------------------------------------
// OPEN THE PAGE: map.html?floor=E&room=E-10&navigate=1
// ------------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const requestedRoom = params.get("room");
let requestedFloor = (params.get("floor") || "C").toUpperCase();

// If a room is given, its own floor wins over the "floor" value
if (requestedRoom) {
  const loc = getLocationById(requestedRoom);
  if (loc) requestedFloor = loc.floor;
}

if (!getFloor(requestedFloor)) {
  await loadFloor("C");
  alert(`"${requestedFloor}" is not a valid floor. Showing C Floor instead.`);
} else {
  await loadFloor(requestedFloor);
}

if (requestedRoom) {
  await selectRoom(requestedRoom, { zoom: true });

  // Coming from the dashboard "Navigate" button: map.html?room=E-10&navigate=1
  if (params.get("navigate")) {
    document.dispatchEvent(
      new CustomEvent("navigate:to", { detail: { id: requestedRoom } })
    );
  }
}