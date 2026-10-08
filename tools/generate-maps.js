// ============================================================
// generate-maps.js  -  creates maps/c-floor.svg ... f-floor.svg
// Run from the project folder:   node tools/generate-maps.js
// (Install Node.js from nodejs.org if you don't have it.)
// ============================================================

const fs = require("fs");
const path = require("path");

// The drawing images are 1775 x 887 pixels, so the SVG uses the SAME
// coordinates. This makes it easy to trace over your PNG files.
const MAP_WIDTH = 1775;
const MAP_HEIGHT = 887;

// Set to true AFTER you save your drawings as assets/plans/c-floor.png etc.
// The drawing is then shown underneath the clickable rooms.
const USE_PLAN_IMAGE = true;

const FLOORS = ["C", "D", "E", "F"];

// ------------------------------------------------------------
// ROOM TABLE  (APPROXIMATE positions - adjust these numbers!)
// [ suffix, name, type, centerX, centerY, width, height, rotation ]
// Room ID = floor letter + "-" + suffix   e.g. "E-10"
// Rotation is in degrees (0, 45 or -45 for most rooms).
// ------------------------------------------------------------
const ROOMS = [
  // ----- left wing -----
  ["21", "Class Room", "Classroom", 245, 170, 120, 100, 0],
  ["20", "Boys Common Room", "Facility", 385, 185, 150, 115, 0],
  ["12", "Electronics Devices & Circuits Lab", "Laboratory", 600, 178, 110, 80, -45],
  ["13", "LEC Lab", "Laboratory", 535, 245, 100, 75, -45],
  ["14", "CESD&P Lab", "Laboratory", 478, 305, 100, 75, -45],
  ["15", "UHF & TV Lab", "Laboratory", 415, 367, 100, 75, -45],
  ["23", "Microprocessor Lab", "Laboratory", 690, 305, 105, 85, -45],
  ["22", "Project Lab", "Laboratory", 605, 370, 90, 70, -45],
  ["27", "PG Electronics", "Laboratory", 690, 435, 100, 75, -45],
  ["29", "HOD Lab / TEQP Office", "Office", 750, 385, 90, 70, -45],
  ["28", "W. S/W ACC Lab", "Laboratory", 600, 495, 100, 75, -45],
  ["16", "OC & Telephony Lab", "Laboratory", 315, 430, 100, 75, -45],
  ["19", "Class Room", "Classroom", 243, 500, 95, 80, -45],
  ["17", "Embedded System Lab", "Laboratory", 440, 572, 100, 75, -45],
  ["18", "Class Room", "Classroom", 350, 635, 95, 75, -45],

  // ----- centre / right-centre -----
  ["26", "Class Room (TU)", "Classroom", 885, 385, 95, 75, 45],
  ["24", "Seminar & Conference", "Hall", 950, 310, 110, 85, 45],
  ["11", "Electronics Workshop", "Laboratory", 1035, 185, 110, 80, 45],
  ["10", "CAD/CAE Lab", "Laboratory", 1130, 250, 105, 80, 45],
  ["09", "Metallurgy & MM Lab", "Laboratory", 1190, 322, 105, 80, 45],
  ["04M", "Maths Lab (TU)", "Laboratory", 1050, 400, 85, 70, 45],
  ["STAFF", "Staff Room", "Office", 985, 433, 70, 55, 45],
  ["05", "Class Room (TU)", "Classroom", 1052, 497, 90, 70, 45],
  ["TU1", "Class Room (TU)", "Classroom", 975, 512, 90, 65, 45],

  // ----- right wing -----
  ["22D", "Drawing Hall", "Hall", 1330, 178, 100, 80, 0],
  ["21B", "Class Room", "Classroom", 1295, 245, 95, 50, 0],
  ["W24", "P&T / PG Mech Lab", "Laboratory", 1500, 185, 95, 95, 0],
  ["25", "Class Room", "Classroom", 1620, 170, 100, 80, 0],
  ["W23", "T&M / PG Class Room", "Classroom", 1615, 248, 100, 70, 0],
  ["02", "Class Room", "Classroom", 1265, 475, 90, 80, 45],
  ["07", "Class Room", "Classroom", 1415, 480, 90, 80, 45],
  ["01", "Class Room", "Classroom", 1210, 555, 80, 70, 45],
  ["03", "Class Room", "Classroom", 1335, 555, 80, 70, 45],
  ["04", "Class Room", "Classroom", 1275, 630, 80, 70, 45],

  // ----- vertical connections (same place on every floor) -----
  ["LIFT", "Lift", "Lift", 820, 440, 40, 40, 0],
  ["STAIR-1", "Staircase 1 (left)", "Stairs", 215, 365, 55, 70, 0],
  ["STAIR-2", "Staircase 2 (centre-left)", "Stairs", 510, 425, 50, 60, 0],
  ["STAIR-3", "Staircase 3 (centre-right)", "Stairs", 1115, 435, 55, 65, 0],
  ["STAIR-4", "Staircase 4 (right)", "Stairs", 1345, 395, 55, 70, 0]
];

// ------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------

/** Text written on the room shape */
function labelFor(suffix) {
  if (suffix === "LIFT") return "Lift";
  if (suffix.startsWith("STAIR-")) return "S" + suffix.slice(6);
  return suffix;
}

/** Escape characters that are not allowed inside SVG text. */
function esc(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Build the SVG text for one floor. */
function buildSvg(floor) {
  const lines = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" id="floor-${floor}" data-floor="${floor}" ` +
    `viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" preserveAspectRatio="xMidYMid meet">`
  );
  lines.push(`  <title>${floor} Floor map (approximate - replace with traced plan)</title>`);
  lines.push(`  <rect class="map-bg" x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}"/>`);

  if (USE_PLAN_IMAGE) {
    lines.push(
      `  <image id="plan-image" href="assets/plans/${floor.toLowerCase()}-floor.png" ` +
      `x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" opacity="0.6"/>`
    );
  }

  // Open-to-sky courtyard (decorative, not clickable)
  lines.push(`  <g class="open-area"><rect x="735" y="130" width="170" height="125"/>` +
             `<text x="820" y="195">Open to Sky</text></g>`);

  // Rooms
  lines.push(`  <g id="rooms">`);
  ROOMS.forEach(([suffix, name, type, cx, cy, w, h, angle]) => {
    const id = floor + "-" + suffix;
    const cssClass = "room room-" + type.toLowerCase().replace(/\s+/g, "-");
    lines.push(
      `    <g id="room-${id}" class="${cssClass}" data-room="${id}" data-floor="${floor}" ` +
      `data-type="${esc(type)}" data-name="${esc(name)}">` +
      `<title>${esc(name)} (${id})</title>` +
      `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="4" ` +
      `transform="rotate(${angle} ${cx} ${cy})"/>` +
      `<text x="${cx}" y="${cy}">${esc(labelFor(suffix))}</text></g>`
    );
  });
  lines.push(`  </g>`);

  // Empty layer where routes are drawn in Steps 11-14
  lines.push(`  <g id="route-layer"></g>`);
  lines.push(`</svg>`);
  return lines.join("\n");
}

// ------------------------------------------------------------
// Write the four files
// ------------------------------------------------------------
const mapsFolder = path.join(__dirname, "..", "maps");
fs.mkdirSync(mapsFolder, { recursive: true });

FLOORS.forEach((floor) => {
  const file = path.join(mapsFolder, floor.toLowerCase() + "-floor.svg");
  fs.writeFileSync(file, buildSvg(floor), "utf8");
  console.log("Created " + file);
});
console.log("Done. " + ROOMS.length + " shapes per floor.");

// ------------------------------------------------------------
// Also write data/room-positions.js (used by the navigation graph)
// ------------------------------------------------------------
const positions = {};
ROOMS.forEach(([suffix, name, type, cx, cy]) => {
  positions[suffix] = [cx, cy];
});

const dataFolder = path.join(__dirname, "..", "data");
fs.mkdirSync(dataFolder, { recursive: true });
fs.writeFileSync(
  path.join(dataFolder, "room-positions.js"),
  "// AUTO-GENERATED by tools/generate-maps.js - do not edit by hand.\n" +
  "// Change room positions in tools/generate-maps.js and run it again.\n" +
  "export const roomPositions = " + JSON.stringify(positions, null, 2) + ";\n",
  "utf8"
);
console.log("Created data/room-positions.js");