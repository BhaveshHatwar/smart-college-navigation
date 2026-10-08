// ============================================================
// floors.js - information about the four floors
// "level" is used later for multi-floor navigation:
// a bigger number means a higher floor.
// If your building is arranged differently, change the levels.
// ============================================================

export const floors = [
  {
    id: "C",
    name: "C Floor",
    level: 1,
    svgFile: "maps/c-floor.svg",
    description: "Classrooms C-01 to C-04, labs and the Boys Common Room."
  },
  {
    id: "D",
    name: "D Floor",
    level: 2,
    svgFile: "maps/d-floor.svg",
    description: "Classrooms, Maths Lab, Electronics and Microprocessor labs."
  },
  {
    id: "E",
    name: "E Floor",
    level: 3,
    svgFile: "maps/e-floor.svg",
    description: "CAD/CAE Lab, Seminar & Conference room, HOD Lab and more."
  },
  {
    id: "F",
    name: "F Floor",
    level: 4,
    svgFile: "maps/f-floor.svg",
    description: "Top floor: classrooms, labs, Drawing Hall and PG classrooms."
  }
];

/** Find a floor by its letter (returns undefined if not found). */
export function getFloor(id) {
  return floors.find((f) => f.id === String(id).toUpperCase());
}