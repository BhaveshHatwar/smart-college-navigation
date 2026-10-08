// ============================================================
// nav-graph.js - the walkable "road map" of the building
//
// GRAPH = nodes (points) + edges (walkable lines between them).
//  - corridor nodes  : points along the hallways (defined below)
//  - room nodes      : one per room, linked to the nearest corridor node
//  - lift / stairs   : nodes too (Steps 12-13 connect them between floors)
//
// All four floors share the same corridor layout because the
// building footprint is the same on every floor.
// Coordinates are in the SAME pixel units as the SVG maps (1775 x 887).
// Run any map page with ?debug=1 to SEE this graph drawn on the map.
// ============================================================

import { roomPositions } from "./room-positions.js";
import { floors } from "./floors.js";

// ---------- Scale (from the drawing: 128 m is about 1527 px) ----------
export const PIXELS_PER_METER = 12;
export const WALKING_METERS_PER_MINUTE = 72;   // about 1.2 m per second

// ---------- Vertical connections (lift and stairs) ----------
// "minutes" = time to change ONE floor (waiting + travelling).
// The graph "cost" is that time converted to walking-meters, so walking
// and floor changes are measured in the same unit.
// Lift: waiting makes it slower. Stairs: no waiting, but tiring.
export const VERTICAL_SETTINGS = {
  lift:   { minutes: 0.5 },
  stairs: { minutes: 0.4 }
};

const STAIR_IDS = ["STAIR-1", "STAIR-2", "STAIR-3", "STAIR-4"];

// ------------------------------------------------------------
// CORRIDOR NODES   number: [x, y]      *** APPROXIMATE ***
// ------------------------------------------------------------
export const CORRIDOR_NODES = {
  // left wing, diagonal corridor going down-right
  1: [250, 255],  2: [320, 325],  3: [385, 392],  4: [440, 465],
  // middle corridor going up-right from node 4
  5: [500, 405],  6: [545, 360],  7: [590, 315],  8: [650, 255],  9: [700, 212],
  // lower-left wing, going down-left from node 4
  10: [385, 520], 11: [310, 575],
  // bottom corridor, going right toward the lift
  12: [505, 525], 13: [585, 590], 14: [700, 540], 15: [770, 505],
  16: [830, 490],            // lift hall (below the lift)
  17: [760, 450],            // west of the lift
  24: [850, 400],            // north of the lift hall
  // lower-right corridor, going down-right then up-right
  18: [900, 480], 19: [965, 545], 20: [1020, 590],
  21: [1080, 548], 22: [1140, 505], 23: [1180, 625],
  // upper-right corridor, going down-right
  25: [935, 235], 26: [1010, 295], 27: [1075, 344], 28: [1180, 425],
  // right wing
  29: [1190, 470], 30: [1330, 440], 31: [1315, 360], 32: [1340, 290],
  33: [1420, 262], 34: [1500, 258], 35: [1580, 258]
};

// ------------------------------------------------------------
// CORRIDOR EDGES   [from, to]   (walkable both ways)
// ------------------------------------------------------------
export const CORRIDOR_EDGES = [
  [1, 2], [2, 3], [3, 4],
  [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
  [4, 10], [10, 11],
  [4, 12], [12, 13], [13, 14], [14, 15], [15, 16], [15, 17],
  [16, 18], [18, 19], [19, 20], [20, 21], [21, 22], [21, 23],
  [22, 29],
  [16, 24], [24, 25], [25, 26], [26, 27], [27, 28], [28, 29],
  [29, 30], [30, 31], [31, 32], [32, 33], [33, 34], [34, 35]
];

// ------------------------------------------------------------
// OPTIONAL: force a room to use a particular corridor node.
// Normally every room links to its NEAREST corridor node.
// Key = room suffix (as in generate-maps.js), value = corridor node number.
// Example:  "STAFF": 24
// ------------------------------------------------------------
export const ROOM_LINK_OVERRIDES = {
};


// ============================================================
// BUILDING THE GRAPH
// ============================================================

function pixelDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function addNode(graph, node) {
  graph.nodes[node.id] = node;
  graph.adjacency[node.id] = [];
}

/** Connect two nodes (both directions). Weight is in METERS. */
export function addEdge(graph, fromId, toId, meters, type = "walk") {
  graph.adjacency[fromId].push({ to: toId, weight: meters, type });
  graph.adjacency[toId].push({ to: fromId, weight: meters, type });
  graph.edges.push({ from: fromId, to: toId, weight: meters, type });
}

/** Add the corridor nodes and all room nodes of ONE floor. */
function addFloorToGraph(graph, floorId) {
  // 1. corridor nodes
  for (const [num, [x, y]] of Object.entries(CORRIDOR_NODES)) {
    addNode(graph, { id: `${floorId}-cor-${num}`, x, y, floor: floorId, kind: "corridor" });
  }

  // 2. corridor edges
  CORRIDOR_EDGES.forEach(([a, b]) => {
    const n1 = graph.nodes[`${floorId}-cor-${a}`];
    const n2 = graph.nodes[`${floorId}-cor-${b}`];
    addEdge(graph, n1.id, n2.id, pixelDistance(n1, n2) / PIXELS_PER_METER);
  });

  // 3. room, lift and stair nodes
  for (const [suffix, [x, y]] of Object.entries(roomPositions)) {
    const isVertical = suffix === "LIFT" || suffix.startsWith("STAIR-");
    // These ids must match "nodeId" in the data/*-floor-locations.js files
    const id = isVertical ? `${floorId}-${suffix}` : `${floorId}-node-${suffix}`;
    const node = { id, x, y, floor: floorId, kind: isVertical ? "vertical" : "room" };
    addNode(graph, node);

    // Find the corridor node to link to
    let corridorNode = null;
    if (ROOM_LINK_OVERRIDES[suffix]) {
      corridorNode = graph.nodes[`${floorId}-cor-${ROOM_LINK_OVERRIDES[suffix]}`];
    } else {
      let best = Infinity;
      for (const num of Object.keys(CORRIDOR_NODES)) {
        const candidate = graph.nodes[`${floorId}-cor-${num}`];
        const d = pixelDistance(node, candidate);
        if (d < best) { best = d; corridorNode = candidate; }
      }
    }
    addEdge(graph, node.id, corridorNode.id, pixelDistance(node, corridorNode) / PIXELS_PER_METER);
  }
}

/** Connect the same lift / staircase between two neighbouring floors. */
function addVerticalLink(graph, lowerFloor, upperFloor, suffix, type) {
  const a = `${lowerFloor}-${suffix}`;
  const b = `${upperFloor}-${suffix}`;
  if (!graph.nodes[a] || !graph.nodes[b]) return;       // skip if missing
  const cost = VERTICAL_SETTINGS[type].minutes * WALKING_METERS_PER_MINUTE;
  addEdge(graph, a, b, cost, type);
}

/** Build the graph for all floors. */
function buildGraph() {
  const graph = { nodes: {}, adjacency: {}, edges: [] };
  floors.forEach((floor) => addFloorToGraph(graph, floor.id));

  // Connect each floor to the one above it (C-D, D-E, E-F).
  // Only NEIGHBOURING floors are linked, so C to F must pass through D and E.
  const byLevel = [...floors].sort((a, b) => a.level - b.level);
  for (let i = 0; i < byLevel.length - 1; i++) {
    const lower = byLevel[i].id;
    const upper = byLevel[i + 1].id;
    addVerticalLink(graph, lower, upper, "LIFT", "lift");
    STAIR_IDS.forEach((stair) => addVerticalLink(graph, lower, upper, stair, "stairs"));
  }
  return graph;
}

// Build once, reuse everywhere
let cachedGraph = null;
export function getGraph() {
  if (!cachedGraph) cachedGraph = buildGraph();
  return cachedGraph;
}