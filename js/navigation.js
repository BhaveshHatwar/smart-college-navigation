// ============================================================
// navigation.js - shortest path (Dijkstra) + route panel + drawing
//
// Exports:
//   dijkstra(graph, startNodeId, endNodeId)
//   findRoute(startLocationId, endLocationId)
//   initNavigation()   <- called once from map.js
//
// STEP 11: same-floor routes. Steps 12-13 add lift/stairs.
// ============================================================

import {
  getGraph,
  WALKING_METERS_PER_MINUTE,
  VERTICAL_SETTINGS
} from "../data/nav-graph.js";
import { allLocations, getLocationById, getLocationByNode } from "../data/locations.js";
import { floors } from "../data/floors.js";
import {
  getCurrentFloor,
  getCurrentSvg,
  loadFloor,
  onFloorChange
} from "./floor-manager.js";


// ------------------------------------------------------------
// 1. DIJKSTRA'S ALGORITHM
//
// Idea: keep the best-known distance from the start to every node.
// Repeatedly take the closest unvisited node, then check whether
// going through it gives a shorter way to its neighbours.
// ------------------------------------------------------------
/**
 * options.avoid = list of edge types that must NOT be used,
 *   e.g. { avoid: ["stairs"] }  -> lift-only route (wheelchair friendly)
 *        { avoid: ["lift"] }    -> stairs-only route
 */
export function dijkstra(graph, startId, endId, options = {}) {
  const avoid = new Set(options.avoid || []);
  const distance = {};          // best cost found so far
  const previous = {};          // which node we came from
  const unvisited = new Set(Object.keys(graph.nodes));

  Object.keys(graph.nodes).forEach((id) => { distance[id] = Infinity; });
  distance[startId] = 0;

  while (unvisited.size > 0) {
    let current = null;
    let smallest = Infinity;
    for (const id of unvisited) {
      if (distance[id] < smallest) {
        smallest = distance[id];
        current = id;
      }
    }

    if (current === null) break;
    if (current === endId) break;
    unvisited.delete(current);

    for (const edge of graph.adjacency[current]) {
      if (avoid.has(edge.type)) continue;          // STEP 12: skip lift or stairs
      if (!unvisited.has(edge.to)) continue;
      const newDistance = distance[current] + edge.weight;
      if (newDistance < distance[edge.to]) {
        distance[edge.to] = newDistance;
        previous[edge.to] = current;
      }
    }
  }

  if (distance[endId] === Infinity) return null;

  const path = [];
  let step = endId;
  while (step !== undefined) {
    path.unshift(step);
    step = previous[step];
  }
  return { path, distance: distance[endId] };
}

/**
 * Turn a path (list of node ids) into numbers a person understands:
 *   walkMeters   - real walking distance (floor changes not counted)
 *   minutes      - walking time + time spent in lift / on stairs
 *   transitions  - one entry for every floor change, in order
 */
export function summarizePath(graph, pathIds) {
  let walkMeters = 0;
  let verticalMinutes = 0;
  const transitions = [];

  for (let i = 0; i < pathIds.length - 1; i++) {
    const from = pathIds[i];
    const to = pathIds[i + 1];
    const edge = graph.adjacency[from].find((e) => e.to === to);
    if (!edge) continue;

    if (edge.type === "walk") {
      walkMeters += edge.weight;
    } else {
      verticalMinutes += VERTICAL_SETTINGS[edge.type].minutes;
      transitions.push({
        type: edge.type,                       // "lift" or "stairs"
        fromNode: from,
        toNode: to,
        fromFloor: graph.nodes[from].floor,
        toFloor: graph.nodes[to].floor
      });
    }
  }

  return {
    walkMeters,
    minutes: walkMeters / WALKING_METERS_PER_MINUTE + verticalMinutes,
    transitions
  };
}

// ------------------------------------------------------------
// 2. FIND A ROUTE BETWEEN TWO LOCATIONS (same floor or different floors)
// mode: "fastest" | "lift" | "stairs"
// ------------------------------------------------------------
export function findRoute(startId, endId, mode = "fastest") {
  const start = getLocationById(startId);
  const end = getLocationById(endId);

  if (!start || !end) {
    return { ok: false, error: "The start or the destination was not found." };
  }
  if (start.id === end.id) {
    return { ok: false, error: "Start and destination are the same place." };
  }

  const graph = getGraph();
  if (!graph.nodes[start.nodeId] || !graph.nodes[end.nodeId]) {
    return {
      ok: false,
      error: `No navigation node exists for ${start.id} or ${end.id}. ` +
             `Check data/nav-graph.js.`
    };
  }

  // "Lift only" forbids stair edges, "Stairs only" forbids lift edges
  const avoid = mode === "lift" ? ["stairs"] : mode === "stairs" ? ["lift"] : [];
  const result = dijkstra(graph, start.nodeId, end.nodeId, { avoid });
  if (!result) {
    return {
      ok: false,
      error: "No walkable route was found between these places" +
             (avoid.length ? " with the selected route type." : ".") +
             " The corridor graph may be disconnected."
    };
  }

  const nodes = result.path.map((id) => graph.nodes[id]);
  const summary = summarizePath(graph, result.path);

  return {
    ok: true,
    start,
    end,
    mode,
    nodes,
    meters: summary.walkMeters,          // real walking distance
    minutes: summary.minutes,            // walking + lift/stairs time
    transitions: summary.transitions,    // every floor change
    legs: buildLegs(graph, nodes, summary.transitions)
  };
}

/**
 * Split a route into LEGS: one leg per floor, in order.
 * Example C -> F:  [C leg] [D leg] [E leg] [F leg]
 * Each leg knows its walking distance and the lift/stairs it leaves by.
 */
function buildLegs(graph, nodes, transitions) {
  const legs = [];
  nodes.forEach((node) => {
    const last = legs[legs.length - 1];
    if (last && last.floor === node.floor) last.nodes.push(node);
    else legs.push({ floor: node.floor, nodes: [node] });
  });

  legs.forEach((leg) => {
    const lastNode = leg.nodes[leg.nodes.length - 1];
    leg.walkMeters = summarizePath(graph, leg.nodes.map((n) => n.id)).walkMeters;
    // the floor change that leaves this leg (null on the final leg)
    leg.leaving = transitions.find(
      (t) => t.fromNode === lastNode.id && t.fromFloor === leg.floor
    ) || null;
  });
  return legs;
}


// ------------------------------------------------------------
// 3. SMALL HELPERS
// ------------------------------------------------------------
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

function minutesText(minutes) {
  if (minutes < 1) return "less than 1 minute";
  const n = Math.round(minutes);
  return "about " + n + (n === 1 ? " minute" : " minutes");
}

/** Create an SVG element with attributes. */
function svgEl(tag, attributes) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  return element;
}


// ------------------------------------------------------------
// 4. STATE
// ------------------------------------------------------------
let destination = null;     // location the user wants to reach
let activeRoute = null;     // result of findRoute() currently shown
let lastStartId = "";       // remembered so the user need not choose again
let lastMode = "fastest";   // remembered "Route type" choice
let currentLegIndex = 0;    // which floor of the route is being shown (0 = first)
let following = false;      // true while "Follow route automatically" is running
let followTimer = null;
let toastTimer = null;
const FOLLOW_DELAY_MS = 3500;   // pause on each floor while following

const routePanel = () => document.getElementById("routePanel");
const clearButton = () => document.getElementById("clearRouteBtn");


// ------------------------------------------------------------
// 5. ROUTE PANEL (the card in the side panel)
// ------------------------------------------------------------
function openRoutePanel(destinationId) {
  const dest = getLocationById(destinationId);
  if (!dest) return;

  destination = dest;
  clearRoute();

  const floor = floors.find((f) => f.id === dest.floor);
  const panel = routePanel();
  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="info-head">
      <h3>Navigate</h3>
      <button type="button" class="close-btn" id="closeRoute" title="Close" aria-label="Close">&times;</button>
    </div>
    <p class="route-dest">To: <strong>${escapeHtml(dest.name)}</strong><br>
      ${escapeHtml(dest.id)} &middot; ${escapeHtml(floor ? floor.name : dest.floor)}</p>
    <div class="form-group">
      <label for="routeFrom">Start from</label>
      <select id="routeFrom"></select>
    </div>
    <div class="form-group">
      <label for="routeMode">Route type</label>
      <select id="routeMode">
        <option value="fastest">Fastest (automatic)</option>
        <option value="lift">Lift only</option>
        <option value="stairs">Stairs only</option>
      </select>
    </div>
    <button type="button" class="btn btn-primary btn-block" id="routeGo">Find Route</button>
    <div id="routeResult" class="route-result"></div>
  `;

  fillStartOptions(document.getElementById("routeFrom"), dest.id);
  document.getElementById("routeMode").value = lastMode;

  document.getElementById("routeGo").addEventListener("click", onFindRoute);
  document.getElementById("closeRoute").addEventListener("click", () => {
    clearRoute();
    destination = null;
    panel.classList.add("hidden");
  });

  if (window.innerWidth <= 800) {
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

/** Fill the "Start from" drop-down: every location, grouped by floor. */
function fillStartOptions(select, destinationId) {
  select.innerHTML = "";
  select.add(new Option("Choose your starting point...", ""));

  floors.forEach((floor) => {
    const group = document.createElement("optgroup");
    group.label = floor.name;
    allLocations
      .filter((loc) => loc.floor === floor.id && loc.id !== destinationId)
      .forEach((loc) => {
        // "new Option(text, value)" treats the text as plain text (safe)
        group.appendChild(new Option(`${loc.id} - ${loc.name}`, loc.id));
      });
    select.appendChild(group);
  });

  if (lastStartId && lastStartId !== destinationId) select.value = lastStartId;
}

function showResultError(text) {
  const box = document.getElementById("routeResult");
  if (box) box.innerHTML = `<div class="alert alert-error" style="margin:0">${escapeHtml(text)}</div>`;
}

function floorNameOf(id) {
  const f = floors.find((x) => x.id === id);
  return f ? f.name : id + " Floor";
}

function floorLevelOf(id) {
  const f = floors.find((x) => x.id === id);
  return f ? f.level : 0;
}

/** Name to show for a graph node (lift / staircase have a location entry). */
function nodeName(node) {
  const loc = getLocationByNode(node.id);
  return loc ? loc.name : node.id;
}

/** The step-by-step text for ONE floor of the route. */
function legSteps(route, leg, index) {
  const steps = [];
  const isFirst = index === 0;
  const isLast = index === route.legs.length - 1;
  const first = leg.nodes[0];
  const last = leg.nodes[leg.nodes.length - 1];
  const meters = Math.max(1, Math.round(leg.walkMeters));

  // How this floor begins
  if (isFirst) {
    steps.push(`Start at <strong>${escapeHtml(route.start.name)}</strong> (${escapeHtml(route.start.id)})`);
  } else {
    steps.push(`Arrive at <strong>${escapeHtml(nodeName(first))}</strong>`);
  }

  // Walking on this floor (a middle floor may need none: you stay on the stairs/lift)
  if (leg.nodes.length > 1) {
    const target = isLast ? route.end.name : nodeName(last);
    steps.push(`Walk about ${meters} m to <strong>${escapeHtml(target)}</strong>`);
  }

  // How this floor ends
  if (leg.leaving) {
    const t = leg.leaving;
    const direction = floorLevelOf(t.toFloor) > floorLevelOf(t.fromFloor) ? "up" : "down";
    const how = t.type === "lift" ? "Take the lift" : "Take the stairs";
    steps.push(`${how} ${direction} to <strong>${escapeHtml(floorNameOf(t.toFloor))}</strong>`);
  }
  return steps;
}

function showResultSuccess(route) {
  const box = document.getElementById("routeResult");
  if (!box) return;

  const changes = route.transitions.length;
  const multi = route.legs.length > 1;
  const modeText = { fastest: "Fastest", lift: "Lift only", stairs: "Stairs only" }[route.mode];

  const legsHtml = route.legs.map((leg, i) => `
    <li class="leg">
      <div class="leg-head">
        <span class="leg-floor">${escapeHtml(floorNameOf(leg.floor))}</span>
        ${multi ? `<button type="button" class="leg-show" data-floor="${leg.floor}">Show on map</button>` : ""}
      </div>
      <ol class="route-steps">
        ${legSteps(route, leg, i).map((s) => `<li>${s}</li>`).join("")}
      </ol>
    </li>
  `).join("");

  box.innerHTML = `
    <div class="alert alert-success" style="margin-bottom:10px">Route found</div>
    <table class="info-table">
      <tr><td>Walking</td><td>about ${Math.max(1, Math.round(route.meters))} m</td></tr>
      <tr><td>Time</td><td>${minutesText(route.minutes)}</td></tr>
      ${changes ? `<tr><td>Floors</td><td>${changes} floor change${changes === 1 ? "" : "s"}</td></tr>` : ""}
      <tr><td>Type</td><td>${modeText}</td></tr>
    </table>
    ${multi ? STEPPER_HTML : ""}
    <ul class="leg-list">${legsHtml}</ul>
  `;

  // "Show on map" buttons switch to that floor (the route is redrawn there)
  box.querySelectorAll(".leg-show").forEach((button) => {
    button.addEventListener("click", () => loadFloor(button.dataset.floor));
  });
  setupStepper(route);       // STEP 14
}

/** The "Find Route" button. */
async function onFindRoute() {
  const startId = document.getElementById("routeFrom").value;

  // Error handling: nothing chosen
  if (!startId) {
    showResultError("Please choose where you are starting from.");
    return;
  }
  lastStartId = startId;
  lastMode = document.getElementById("routeMode").value;
  stopFollow();
  const route = findRoute(startId, destination.id, lastMode);
  if (!route.ok) {
    activeRoute = null;
    removeDrawnRoute();
    clearButton().classList.add("hidden");
    showResultError(route.error);
    return;
  }

  activeRoute = route;
  currentLegIndex = 0;
  showResultSuccess(route);
  clearButton().classList.remove("hidden");

  // Show the floor of the route, then draw it
  if (getCurrentFloor() !== route.start.floor) {
    await loadFloor(route.start.floor);      // our floor-change listener draws it
  } else {
    drawActiveRoute();
  }
}


// ------------------------------------------------------------
// 6. DRAWING THE ROUTE ON THE SVG
// The route is drawn inside <g id="route-layer">, so the original
// map is never changed. Reloading the floor removes it.
// ------------------------------------------------------------
function removeDrawnRoute() {
  const svg = getCurrentSvg();
  if (!svg) return;
  const layer = svg.querySelector("#route-layer");
  if (layer) layer.innerHTML = "";
  svg.querySelectorAll(".route-start-room, .route-dest-room")
    .forEach((g) => g.classList.remove("route-start-room", "route-dest-room"));
}

function drawActiveRoute() {
  if (!activeRoute) return;
  const svg = getCurrentSvg();
  const layer = svg && svg.querySelector("#route-layer");
  if (!layer) return;

  layer.innerHTML = "";
  const floorId = getCurrentFloor();
  
  markRooms(svg, floorId);      // STEP 14: glow the start and destination rooms
  // Only the part of the route that is on the floor being shown
  const points = activeRoute.nodes.filter((n) => n.floor === floorId);
  if (points.length === 0) return;

  // White outline + orange line on top
  if (points.length >= 2) {
    const pointText = points.map((p) => `${p.x},${p.y}`).join(" ");
    layer.appendChild(svgEl("polyline", { points: pointText, class: "route-casing" }));
    layer.appendChild(svgEl("polyline", { points: pointText, class: "route-line" }));
  }

  // Floor-change markers: an arrow at each lift / staircase used on this floor
  const marked = new Set();
  activeRoute.transitions.forEach((t) => {
    const arrow = floorLevelOf(t.toFloor) > floorLevelOf(t.fromFloor) ? "\u2191" : "\u2193";
    [[t.fromFloor, t.fromNode], [t.toFloor, t.toNode]].forEach(([floor, nodeId]) => {
      if (floor !== floorId || marked.has(nodeId)) return;
      marked.add(nodeId);
      const node = activeRoute.nodes.find((n) => n.id === nodeId);
      addMarker(layer, node, arrow, "route-transfer");
    });
  });

  // Start marker (A) and destination marker (B), drawn on top
  if (activeRoute.start.floor === floorId) addMarker(layer, points[0], "A", "route-start");
  if (activeRoute.end.floor === floorId) addMarker(layer, points[points.length - 1], "B", "route-end");

  // Ask map.js to zoom so this floor's part of the route is visible
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const box = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys)
  };
  document.dispatchEvent(new CustomEvent("map:fit", { detail: box }));
}

function addMarker(layer, point, letter, cssClass) {
  // Pulsing ring (only for the start A and the destination B)
  if (cssClass === "route-start" || cssClass === "route-end") {
    layer.appendChild(svgEl("circle", {
      cx: point.x, cy: point.y, r: 16, class: `route-pulse ${cssClass}-pulse`
    }));
  }
  layer.appendChild(svgEl("circle", { cx: point.x, cy: point.y, r: 16, class: cssClass }));
  const text = svgEl("text", { x: point.x, y: point.y, class: "route-marker-text" });
  text.textContent = letter;
  layer.appendChild(text);
}

// ------------------------------------------------------------
// STEP 14: FLOOR MESSAGE, STEPPER, FOLLOW MODE, ROOM MARKS
// ------------------------------------------------------------
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Small message over the map, e.g. "Changing from E Floor to F Floor". */
function showFloorToast(text, ms = 2400) {
  const toast = document.getElementById("floorToast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), ms);
}

function hideFloorToast() {
  clearTimeout(toastTimer);
  const toast = document.getElementById("floorToast");
  if (toast) toast.classList.add("hidden");
}

/** Text for the floor-change message. */
function changeMessage(fromFloor, toFloor) {
  let text = `Changing from ${floorNameOf(fromFloor)} to ${floorNameOf(toFloor)}`;
  const t = activeRoute.transitions.find((x) =>
    (x.fromFloor === fromFloor && x.toFloor === toFloor) ||
    (x.fromFloor === toFloor && x.toFloor === fromFloor)
  );
  if (t) text += t.type === "lift" ? " \u2013 take the lift" : " \u2013 take the stairs";
  return text;
}

/** The Previous / Next / Follow box (only for routes that change floor). */
const STEPPER_HTML = `
  <div class="route-stepper" id="routeStepper">
    <div class="stepper-label" id="stepperLabel"></div>
    <div class="stepper-buttons">
      <button type="button" class="btn btn-outline" id="stepPrev">&#9664; Previous</button>
      <button type="button" class="btn btn-primary" id="stepNext">Next floor &#9654;</button>
    </div>
    <button type="button" class="btn btn-accent btn-block" id="stepFollow">&#9654; Follow route automatically</button>
  </div>
`;

function setupStepper(route) {
  if (route.legs.length < 2) return;
  document.getElementById("stepPrev").addEventListener("click", () => {
    stopFollow();
    goToLeg(currentLegIndex - 1);
  });
  document.getElementById("stepNext").addEventListener("click", () => {
    stopFollow();
    goToLeg(currentLegIndex + 1);
  });
  document.getElementById("stepFollow").addEventListener("click", startFollow);
  updateStepper();
}

/** Refresh the label, the buttons and the highlighted floor card. */
function updateStepper() {
  const stepper = document.getElementById("routeStepper");
  if (!stepper || !activeRoute) return;

  const legs = activeRoute.legs;
  const i = currentLegIndex;
  const isLast = i === legs.length - 1;

  document.getElementById("stepperLabel").innerHTML =
    `Step ${i + 1} of ${legs.length}: <strong>${escapeHtml(floorNameOf(legs[i].floor))}</strong>`;
  document.getElementById("stepPrev").disabled = i === 0;

  const next = document.getElementById("stepNext");
  next.disabled = isLast;
  next.innerHTML = isLast
    ? "Destination reached"
    : `Next: ${escapeHtml(floorNameOf(legs[i + 1].floor))} &#9654;`;

  document.getElementById("stepFollow").innerHTML =
    following ? "&#9632; Stop" : "&#9654; Follow route automatically";

  document.querySelectorAll("#routeResult .leg").forEach((card, n) => {
    card.classList.toggle("active", n === i);
  });
}

/**
 * Show leg number "index" (0 = first floor of the route).
 * If it is on a different floor: show the message, wait a moment,
 * load the floor. The floor-change listener then draws the route.
 */
async function goToLeg(index) {
  if (!activeRoute) return;
  const legs = activeRoute.legs;
  index = Math.max(0, Math.min(index, legs.length - 1));

  const targetFloor = legs[index].floor;
  const fromFloor = getCurrentFloor();
  currentLegIndex = index;
  updateStepper();

  if (fromFloor !== targetFloor) {
    showFloorToast(changeMessage(fromFloor, targetFloor));
    await delay(700);                        // let the user read the message
    if (!activeRoute) return;                // route was cleared meanwhile
    const loaded = await loadFloor(targetFloor);
    if (!loaded || !activeRoute) return;
  } else {
    drawActiveRoute();
  }

  if (index === legs.length - 1) {
    showFloorToast(`You have arrived: ${activeRoute.end.name} (${activeRoute.end.id})`, 3500);
  }
}

// ----- Follow route automatically -----
function stopFollow() {
  following = false;
  clearTimeout(followTimer);
  updateStepper();
}

async function startFollow() {
  if (!activeRoute || activeRoute.legs.length < 2) return;
  if (following) {                 // the button works as Start / Stop
    stopFollow();
    return;
  }
  following = true;
  await goToLeg(0);                // always start from the first floor
  if (!following) return;
  scheduleFollowStep();
}

function scheduleFollowStep() {
  clearTimeout(followTimer);
  followTimer = setTimeout(async () => {
    if (!following || !activeRoute) return;
    await goToLeg(currentLegIndex + 1);
    if (!following || !activeRoute) return;
    if (currentLegIndex >= activeRoute.legs.length - 1) stopFollow();   // finished
    else scheduleFollowStep();
  }, FOLLOW_DELAY_MS);
}

/** Keep the stepper correct when the user picks a floor tab by hand. */
function syncLegToFloor() {
  if (!activeRoute) return;
  const index = activeRoute.legs.findIndex((leg) => leg.floor === getCurrentFloor());
  if (index >= 0) currentLegIndex = index;
  updateStepper();
}

/** Colour the start room (green) and the destination room (red, glowing). */
function markRooms(svg, floorId) {
  svg.querySelectorAll(".route-start-room, .route-dest-room")
    .forEach((g) => g.classList.remove("route-start-room", "route-dest-room"));

  const mark = (loc, cssClass) => {
    if (loc.floor !== floorId) return;
    const group = svg.querySelector(`[data-room="${CSS.escape(loc.id)}"]`);
    if (group) group.classList.add(cssClass);
  };
  mark(activeRoute.start, "route-start-room");
  mark(activeRoute.end, "route-dest-room");
}

/** Clear Route: remove everything the route added to the map. */
function clearRoute(options = {}) {
  stopFollow();
  activeRoute = null;
  currentLegIndex = 0;
  removeDrawnRoute();                 // line, markers and room glow
  hideFloorToast();
  clearButton().classList.add("hidden");
  const result = document.getElementById("routeResult");
  if (result) result.innerHTML = "";
  if (options.resetView) {
    document.dispatchEvent(new CustomEvent("map:reset"));   // map.js resets the zoom
  }
}


// ------------------------------------------------------------
// 7. DEBUG VIEW:  map.html?debug=1  draws the whole graph
// Use it to check and fix corridor coordinates in nav-graph.js
// ------------------------------------------------------------
function drawDebugGraph(svg) {
  if (!new URLSearchParams(window.location.search).has("debug")) return;
  const floorId = getCurrentFloor();
  const graph = getGraph();

  const group = svgEl("g", { id: "debug-layer" });
  graph.edges.forEach((edge) => {
    const a = graph.nodes[edge.from];
    const b = graph.nodes[edge.to];
    if (a.floor !== floorId || b.floor !== floorId) return;
    group.appendChild(svgEl("line", {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "debug-edge"
    }));
  });
  Object.values(graph.nodes).forEach((node) => {
    if (node.floor !== floorId) return;
    const dot = svgEl("circle", {
      cx: node.x, cy: node.y,
      r: node.kind === "corridor" ? 6 : 3,
      class: node.kind === "corridor" ? "debug-node" : "debug-node-room"
    });
    const title = svgEl("title", {});
    title.textContent = `${node.id} (${node.x}, ${node.y})`;   // hover to read it
    dot.appendChild(title);
    group.appendChild(dot);
  });

  // Insert below the route layer so the route stays on top
  svg.insertBefore(group, svg.querySelector("#route-layer"));
}


// ------------------------------------------------------------
// 8. START EVERYTHING (called once from map.js)
// ------------------------------------------------------------
export function initNavigation() {
  // "Navigate Here" in map.js sends this event
  document.addEventListener("navigate:to", (event) => {
    openRoutePanel(event.detail.id);
  });

  // Clear Route also resets the zoom
  clearButton().addEventListener("click", () => clearRoute({ resetView: true }));

  // Every time a floor map finishes loading
  onFloorChange((floor, svg) => {
    drawDebugGraph(svg);
    drawActiveRoute();        // redraw the route if it passes over this floor
    syncLegToFloor();         // STEP 14: keep Previous / Next in step
  });
}