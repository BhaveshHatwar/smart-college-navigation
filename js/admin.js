// ============================================================
// admin.js - Admin panel: manage locations in Firestore
//
// Firestore layout:   locations/{roomId}   e.g. locations/E-10
//   { id, name, floor, type, description, nodeId, updatedAt }
//
// NOTE: this page does NOT call syncLocationsFromFirestore().
// The admin table reads Firestore directly, and the imported
// allLocations array still holds the demo data, which is what
// "Copy demo data to Firestore" uploads.
// ============================================================

import { requireLogin } from "./auth.js";
import { setupHeader } from "./header.js";
import { db } from "./firebase-config.js";
import {
  collection, getDocs, doc, setDoc, deleteDoc, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { floors } from "../data/floors.js";
import { allLocations as demoLocations } from "../data/locations.js";
import { getGraph } from "../data/nav-graph.js";

const TYPES = ["Classroom", "Laboratory", "Office", "Hall", "Facility", "Lift", "Stairs"];

// ------------------------------------------------------------
// 1. Login + admin check
// (This only hides the page. The REAL protection is the Firestore
//  security rules written in Step 17.)
// ------------------------------------------------------------
const { profile } = await requireLogin();
setupHeader(profile);

if (profile.role !== "admin") {
  document.getElementById("denied").classList.remove("hidden");
  throw new Error("Not an admin");          // stops the rest of this file
}
document.getElementById("adminContent").classList.remove("hidden");


// ------------------------------------------------------------
// 2. Helpers
// ------------------------------------------------------------
let rows = [];                 // locations currently in Firestore
let editingId = null;          // null = adding, otherwise the id being edited
let nodeTouched = false;       // did the admin type in the node box himself?

const $ = (id) => document.getElementById(id);
const graph = getGraph();

function showMessage(text, type = "success") {
  const box = $("adminMessage");
  box.textContent = text;
  box.className = "alert alert-" + type;
}

function errorText(error) {
  if (error.code === "permission-denied") {
    return "Permission denied. Check your Firestore security rules and that your role is admin.";
  }
  if (error.code === "unavailable") return "Cannot reach Firebase. Check your internet connection.";
  return "Something went wrong: " + (error.code || error.message);
}

function cell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;                       // textContent = safe
  if (className) td.className = className;
  return td;
}

function floorName(id) {
  const f = floors.find((x) => x.id === id);
  return f ? f.name : id;
}


// ------------------------------------------------------------
// 3. Load and show the locations table
// ------------------------------------------------------------
async function loadLocations() {
  try {
    const snapshot = await getDocs(collection(db, "locations"));
    rows = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
    rows.sort((a, b) => a.floor.localeCompare(b.floor) || a.id.localeCompare(b.id));
  } catch (error) {
    console.error(error);
    showMessage(errorText(error), "error");
    rows = [];
  }
  $("sourceTag").textContent = rows.length
    ? `Firestore (${rows.length} rooms)`
    : "Not set up yet - the app uses the demo data files";
  $("seedBtn").classList.toggle("hidden", rows.length > 0);
  renderTable();
}

function renderTable() {
  const floorFilter = $("floorFilter").value;
  const text = $("textFilter").value.trim().toLowerCase();

  const shown = rows.filter((loc) =>
    (!floorFilter || loc.floor === floorFilter) &&
    (!text || loc.id.toLowerCase().includes(text) || loc.name.toLowerCase().includes(text))
  );

  const body = $("rows");
  body.innerHTML = "";

  shown.forEach((loc) => {
    const tr = document.createElement("tr");
    tr.append(cell(loc.id), cell(loc.name), cell(floorName(loc.floor)), cell(loc.type));

    // Is this node part of the navigation graph?
    const inGraph = Boolean(graph.nodes[loc.nodeId]);
    tr.append(cell(inGraph ? "\u2713 " + loc.nodeId : "\u2717 " + loc.nodeId,
                   inGraph ? "node-ok" : "node-bad"));

    const actions = document.createElement("td");
    actions.className = "row-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openForm(loc));
    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteLocation(loc));
    actions.append(edit, del);
    tr.append(actions);

    body.appendChild(tr);
  });

  $("countLabel").textContent = rows.length
    ? `Showing ${shown.length} of ${rows.length} locations. ` +
      `A red node means it is not in the navigation graph yet (see the note below the table).`
    : "No locations in Firestore yet. Use \"Copy demo data to Firestore\" to start.";
}

// Filters
const floorFilter = $("floorFilter");
floors.forEach((f) => floorFilter.add(new Option(f.name, f.id)));
floorFilter.addEventListener("change", renderTable);
$("textFilter").addEventListener("input", renderTable);


// ------------------------------------------------------------
// 4. Copy the demo data into Firestore (one time)
// ------------------------------------------------------------
$("seedBtn").addEventListener("click", async () => {
  if (!confirm(`Copy ${demoLocations.length} demo locations and ${floors.length} floors to Firestore?`)) return;

  const button = $("seedBtn");
  button.disabled = true;
  button.textContent = "Copying...";
  try {
    // One batch writes everything together (a batch can hold up to 500 writes)
    const batch = writeBatch(db);
    demoLocations.forEach((loc) => {
      batch.set(doc(db, "locations", loc.id), { ...loc, updatedAt: serverTimestamp() });
    });
    floors.forEach((floor) => {
      batch.set(doc(db, "floors", floor.id), {
        id: floor.id, name: floor.name, level: floor.level, description: floor.description
      });
    });
    await batch.commit();
    showMessage("Done. The map and search now read locations from Firestore.");
    await loadLocations();
  } catch (error) {
    console.error(error);
    showMessage(errorText(error), "error");
  } finally {
    button.disabled = false;
    button.textContent = "Copy demo data to Firestore";
  }
});


// ------------------------------------------------------------
// 5. Add / edit form
// ------------------------------------------------------------
const fFloor = $("fFloor");
const fType = $("fType");
floors.forEach((f) => fFloor.add(new Option(f.name, f.id)));
TYPES.forEach((t) => fType.add(new Option(t, t)));

/** Suggest a node id: "E-10" -> "E-node-10", lift/stairs -> their own id. */
function suggestNode() {
  const id = $("fId").value.trim().toUpperCase();
  const floor = fFloor.value;
  if (!id) return "";
  if (fType.value === "Lift" || fType.value === "Stairs") return id;
  const suffix = id.startsWith(floor + "-") ? id.slice(floor.length + 1) : id;
  return `${floor}-node-${suffix}`;
}

function autoFillNode() {
  if (editingId || nodeTouched) return;       // never overwrite what the admin typed
  $("fNode").value = suggestNode();
}
$("fId").addEventListener("input", autoFillNode);
fFloor.addEventListener("change", autoFillNode);
fType.addEventListener("change", autoFillNode);
$("fNode").addEventListener("input", () => { nodeTouched = true; });

function openForm(loc) {
  editingId = loc ? loc.id : null;
  nodeTouched = false;
  $("formError").classList.add("hidden");
  $("modalTitle").textContent = loc ? `Edit ${loc.id}` : "Add Location";

  $("fId").value = loc ? loc.id : "";
  $("fId").readOnly = Boolean(loc);           // the id is the document name: not editable
  $("fName").value = loc ? loc.name : "";
  fFloor.value = loc ? loc.floor : (floorFilter.value || floors[0].id);
  fType.value = loc ? loc.type : "Classroom";
  $("fDesc").value = loc ? loc.description || "" : "";
  $("fNode").value = loc ? loc.nodeId : "";

  $("modal").classList.remove("hidden");
  (loc ? $("fName") : $("fId")).focus();
}

function closeForm() {
  $("modal").classList.add("hidden");
}

function showFormError(text) {
  const box = $("formError");
  box.textContent = text;
  box.classList.remove("hidden");
}

$("addBtn").addEventListener("click", () => openForm(null));
$("cancelBtn").addEventListener("click", closeForm);
$("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeForm(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeForm(); });

$("locForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = $("fId").value.trim().toUpperCase();
  const name = $("fName").value.trim();
  const floor = fFloor.value;
  const type = fType.value;
  const description = $("fDesc").value.trim();
  const nodeId = $("fNode").value.trim();

  // ----- Validation -----
  if (!id || !name || !nodeId) {
    showFormError("Room number, room name and navigation node are required.");
    return;
  }
  if (!/^[A-Z]-[A-Z0-9-]+$/.test(id)) {
    showFormError("Room number must look like E-10 (floor letter, a dash, then letters/digits).");
    return;
  }
  if (!id.startsWith(floor + "-")) {
    showFormError(`Room number must start with the floor letter: "${floor}-".`);
    return;
  }
  if (!editingId && rows.some((r) => r.id === id)) {
    showFormError(`A location with the number ${id} already exists.`);
    return;
  }

  // ----- Save -----
  const saveBtn = $("saveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";
  try {
    const data = { id, name, floor, type, description, nodeId };
    await setDoc(doc(db, "locations", id), { ...data, updatedAt: serverTimestamp() });

    const index = rows.findIndex((r) => r.id === id);
    if (index >= 0) rows[index] = data;
    else rows.push(data);
    rows.sort((a, b) => a.floor.localeCompare(b.floor) || a.id.localeCompare(b.id));

    closeForm();
    $("sourceTag").textContent = `Firestore (${rows.length} rooms)`;
    $("seedBtn").classList.add("hidden");
    renderTable();

    let note = editingId ? `${id} updated.` : `${id} added.`;
    if (!graph.nodes[nodeId]) {
      note += " Warning: this node is not in the navigation graph yet, so routes to it will not work " +
              "until you add it to tools/generate-maps.js.";
    }
    showMessage(note, graph.nodes[nodeId] ? "success" : "info");
  } catch (error) {
    console.error(error);
    showFormError(errorText(error));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
});


// ------------------------------------------------------------
// 6. Delete
// ------------------------------------------------------------
async function deleteLocation(loc) {
  if (!confirm(`Delete ${loc.id} - ${loc.name}?\nThis cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, "locations", loc.id));
    rows = rows.filter((r) => r.id !== loc.id);
    $("sourceTag").textContent = rows.length
      ? `Firestore (${rows.length} rooms)`
      : "Not set up yet - the app uses the demo data files";
    $("seedBtn").classList.toggle("hidden", rows.length > 0);
    renderTable();
    showMessage(`${loc.id} deleted.`);
  } catch (error) {
    console.error(error);
    showMessage(errorText(error), "error");
  }
}


// ------------------------------------------------------------
// 7. Users (view only)
// ------------------------------------------------------------
$("loadUsersBtn").addEventListener("click", async () => {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const body = $("userRows");
    body.innerHTML = "";
    snapshot.docs
      .map((d) => d.data())
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .forEach((user) => {
        const tr = document.createElement("tr");
        tr.append(cell(user.name || "-"), cell(user.email || "-"), cell(user.role || "student"));
        body.appendChild(tr);
      });
    $("usersWrap").classList.remove("hidden");
    $("loadUsersBtn").textContent = `Reload users (${snapshot.size})`;
  } catch (error) {
    console.error(error);
    showMessage(errorText(error), "error");
  }
});


// ------------------------------------------------------------
// START
// ------------------------------------------------------------
await loadLocations();