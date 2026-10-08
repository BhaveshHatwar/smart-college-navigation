// ============================================================
// search.js - search rooms on all floors
//
// Exports:
//   searchLocations(query)  -> array of location objects (best first)
//   initMapSearch()         -> connects the search box in map.html
// ============================================================

import { allLocations } from "../data/locations.js";
import { getFloor } from "../data/floors.js";

const MAX_RESULTS = 30;


// ------------------------------------------------------------
// 1. TEXT CLEAN-UP
// "E-10", "e10" and "E 10" must all look the same, so we
// lower-case the text and remove everything except letters/digits.
// ------------------------------------------------------------
function normalize(text) {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}


// ------------------------------------------------------------
// 2. SCORING
// A higher score means a better match.
// ------------------------------------------------------------

/** Score one search word (token) against one location. 0 = no match. */
function scoreToken(token, loc) {
  const id = normalize(loc.id);                    // "e10"
  const name = normalize(loc.name);                // "cadcaelab"
  const type = normalize(loc.type);                // "laboratory"
  const floorLabel = normalize(loc.floor + " floor"); // "efloor"

  let best = 0;
  if (id === token) best = Math.max(best, 100);
  else if (id.startsWith(token)) best = Math.max(best, 80);
  else if (id.includes(token)) best = Math.max(best, 60);

  if (name === token) best = Math.max(best, 90);
  else if (name.startsWith(token)) best = Math.max(best, 70);
  else if (name.includes(token)) best = Math.max(best, 50);

  if (type.includes(token)) best = Math.max(best, 30);
  if (floorLabel.includes(token)) best = Math.max(best, 20);
  return best;
}

/** Score a whole query. Every word must match, otherwise the score is 0. */
function scoreLocation(tokens, loc) {
  let total = 0;
  for (const token of tokens) {
    const s = scoreToken(token, loc);
    if (s === 0) return 0;
    total += s;
  }
  return total;
}


// ------------------------------------------------------------
// 3. PUBLIC SEARCH FUNCTION
// ------------------------------------------------------------

/**
 * Search every floor.
 *   "E-10"           -> CAD/CAE Lab on E floor (and similar ids)
 *   "cad"            -> CAD/CAE Lab on every floor
 *   "laboratory"     -> all labs
 *   "seminar e floor"-> the seminar room on E floor
 * Returns an empty array when nothing matches or the query is empty.
 */
export function searchLocations(query) {
  const tokens = String(query ?? "")
    .trim()
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);                 // drop empty words

  if (tokens.length === 0) return [];

  return allLocations
    .map((loc) => ({ loc, score: scoreLocation(tokens, loc) }))
    .filter((item) => item.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      a.loc.floor.localeCompare(b.loc.floor) ||
      a.loc.id.localeCompare(b.loc.id)
    )
    .slice(0, MAX_RESULTS)
    .map((item) => item.loc);
}


// ------------------------------------------------------------
// 4. SEARCH BOX ON THE MAP PAGE
// ------------------------------------------------------------
export function initMapSearch() {
  const input = document.getElementById("mapSearchInput");
  const box = document.getElementById("mapSearchResults");
  if (!input || !box) return;

  const SHOWN = 6;                    // keep the side panel short

  function note(text, isError) {
    box.innerHTML = "";
    const p = document.createElement("div");
    p.className = "search-note" + (isError ? " error" : "");
    p.textContent = text;
    box.appendChild(p);
  }

  /** Ask map.js to open the room (it listens for "room:select"). */
  function choose(loc) {
    document.dispatchEvent(
      new CustomEvent("room:select", { detail: { id: loc.id, zoom: true } })
    );
    input.value = "";
    box.innerHTML = "";
  }

  function render() {
    const query = input.value.trim();
    if (!query) {                     // empty search: show nothing
      box.innerHTML = "";
      return;
    }

    const results = searchLocations(query);
    if (results.length === 0) {       // error handling: location not found
      note(`No location found for "${query}".`, true);
      return;
    }

    box.innerHTML = "";
    results.slice(0, SHOWN).forEach((loc) => {
      const floor = getFloor(loc.floor);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-item";

      const name = document.createElement("span");
      name.className = "si-name";
      name.textContent = loc.name;               // textContent = safe, no HTML

      const meta = document.createElement("span");
      meta.className = "si-meta";
      meta.textContent =
        `${loc.id} · ${floor ? floor.name : loc.floor} · ${loc.type}`;

      button.append(name, meta);
      button.addEventListener("click", () => choose(loc));
      box.appendChild(button);
    });

    if (results.length > SHOWN) {
      note(`+ ${results.length - SHOWN} more. Type more letters to narrow down.`);
    }
  }

  input.addEventListener("input", render);

  // Enter opens the best (first) result
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      note("Please type a room number or name to search.", true);
      return;
    }
    const results = searchLocations(query);
    if (results.length > 0) choose(results[0]);
    else note(`No location found for "${query}".`, true);
  });
}