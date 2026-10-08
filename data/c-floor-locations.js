// ============================================================
// c-floor-locations.js
// *** DEMO DATA ***  Descriptions are placeholders.
// Replace names / descriptions with your real college data.
//
// Fields:
//   id          room number (must match data-room in maps/c-floor.svg)
//   name        display name
//   floor       "C"
//   type        Classroom | Laboratory | Office | Hall | Facility | Lift | Stairs
//   description short text shown in the details panel
//   nodeId      navigation node in the corridor (used from Step 11)
// ============================================================

export const cFloorLocations = [
  // ----- Left wing -----
  { id: "C-21", name: "Class Room", floor: "C", type: "Classroom", description: "DEMO: Classroom in the left wing.", nodeId: "C-node-21" },
  { id: "C-20", name: "Boys Common Room", floor: "C", type: "Facility", description: "DEMO: Common room for boys.", nodeId: "C-node-20" },
  { id: "C-12", name: "Electronics Devices & Circuits Lab", floor: "C", type: "Laboratory", description: "DEMO: Electronics devices and circuits laboratory.", nodeId: "C-node-12" },
  { id: "C-13", name: "LEC Lab", floor: "C", type: "Laboratory", description: "DEMO: LEC laboratory.", nodeId: "C-node-13" },
  { id: "C-14", name: "CESD&P Lab", floor: "C", type: "Laboratory", description: "DEMO: CESD&P laboratory.", nodeId: "C-node-14" },
  { id: "C-15", name: "UHF & TV Lab", floor: "C", type: "Laboratory", description: "DEMO: UHF and TV laboratory.", nodeId: "C-node-15" },
  { id: "C-23", name: "Microprocessor Lab", floor: "C", type: "Laboratory", description: "DEMO: Microprocessor laboratory.", nodeId: "C-node-23" },
  { id: "C-22", name: "Project Lab", floor: "C", type: "Laboratory", description: "DEMO: Laboratory for student projects.", nodeId: "C-node-22" },
  { id: "C-27", name: "PG Electronics", floor: "C", type: "Laboratory", description: "DEMO: Postgraduate electronics laboratory.", nodeId: "C-node-27" },
  { id: "C-29", name: "HOD Lab / TEQP Office", floor: "C", type: "Office", description: "DEMO: HOD laboratory and TEQP office.", nodeId: "C-node-29" },
  { id: "C-28", name: "W. S/W ACC Lab", floor: "C", type: "Laboratory", description: "DEMO: Software and ACC laboratory.", nodeId: "C-node-28" },
  { id: "C-16", name: "OC & Telephony Lab", floor: "C", type: "Laboratory", description: "DEMO: Optical communication and telephony laboratory.", nodeId: "C-node-16" },
  { id: "C-19", name: "Class Room", floor: "C", type: "Classroom", description: "DEMO: Classroom in the left wing.", nodeId: "C-node-19" },
  { id: "C-17", name: "Embedded System Lab", floor: "C", type: "Laboratory", description: "DEMO: Embedded systems laboratory.", nodeId: "C-node-17" },
  { id: "C-18", name: "Class Room", floor: "C", type: "Classroom", description: "DEMO: Classroom in the left wing.", nodeId: "C-node-18" },

  // ----- Centre / right-centre -----
  { id: "C-26", name: "Class Room (TU)", floor: "C", type: "Classroom", description: "DEMO: Theory unit classroom.", nodeId: "C-node-26" },
  { id: "C-24", name: "Seminar & Conference", floor: "C", type: "Hall", description: "DEMO: Seminar and conference room.", nodeId: "C-node-24" },
  { id: "C-11", name: "Electronics Workshop", floor: "C", type: "Laboratory", description: "DEMO: Electronics workshop.", nodeId: "C-node-11" },
  { id: "C-10", name: "CAD/CAE Lab", floor: "C", type: "Laboratory", description: "DEMO: CAD/CAE laboratory.", nodeId: "C-node-10" },
  { id: "C-09", name: "Metallurgy & MM Lab", floor: "C", type: "Laboratory", description: "DEMO: Metallurgy and material management laboratory.", nodeId: "C-node-09" },
  { id: "C-04M", name: "Maths Lab (TU)", floor: "C", type: "Laboratory", description: "DEMO: Mathematics laboratory.", nodeId: "C-node-04M" },
  { id: "C-STAFF", name: "Staff Room", floor: "C", type: "Office", description: "DEMO: Faculty staff room.", nodeId: "C-node-STAFF" },
  { id: "C-05", name: "Class Room (TU)", floor: "C", type: "Classroom", description: "DEMO: Theory unit classroom.", nodeId: "C-node-05" },
  { id: "C-TU1", name: "Class Room (TU)", floor: "C", type: "Classroom", description: "DEMO: Theory unit classroom (no number in the drawing).", nodeId: "C-node-TU1" },

  // ----- Right wing -----
  { id: "C-22D", name: "Drawing Hall", floor: "C", type: "Hall", description: "DEMO: Engineering drawing hall.", nodeId: "C-node-22D" },
  { id: "C-21B", name: "Class Room", floor: "C", type: "Classroom", description: "DEMO: Classroom next to the Drawing Hall.", nodeId: "C-node-21B" },
  { id: "C-W24", name: "P&T / PG Mech Lab", floor: "C", type: "Laboratory", description: "DEMO: P&T / PG mechanical laboratory.", nodeId: "C-node-W24" },
  { id: "C-25", name: "Class Room", floor: "C", type: "Classroom", description: "DEMO: Classroom in the right wing.", nodeId: "C-node-25" },
  { id: "C-W23", name: "T&M / PG Class Room", floor: "C", type: "Classroom", description: "DEMO: T&M / PG classroom.", nodeId: "C-node-W23" },
  { id: "C-02", name: "Class Room", floor: "C", type: "Classroom", description: "DEMO: Classroom C-02.", nodeId: "C-node-02" },
  { id: "C-07", name: "Class Room", floor: "C", type: "Classroom", description: "DEMO: Classroom C-07.", nodeId: "C-node-07" },
  { id: "C-01", name: "Class Room", floor: "C", type: "Classroom", description: "DEMO: Classroom C-01.", nodeId: "C-node-01" },
  { id: "C-03", name: "Class Room", floor: "C", type: "Classroom", description: "DEMO: Classroom C-03.", nodeId: "C-node-03" },
  { id: "C-04", name: "Class Room", floor: "C", type: "Classroom", description: "DEMO: Classroom C-04.", nodeId: "C-node-04" },

  // ----- Lift and stairs (the node IS the room) -----
  { id: "C-LIFT", name: "Lift", floor: "C", type: "Lift", description: "Central lift connecting all floors.", nodeId: "C-LIFT" },
  { id: "C-STAIR-1", name: "Staircase 1 (left)", floor: "C", type: "Stairs", description: "Left staircase.", nodeId: "C-STAIR-1" },
  { id: "C-STAIR-2", name: "Staircase 2 (centre-left)", floor: "C", type: "Stairs", description: "Centre-left staircase.", nodeId: "C-STAIR-2" },
  { id: "C-STAIR-3", name: "Staircase 3 (centre-right)", floor: "C", type: "Stairs", description: "Centre-right staircase.", nodeId: "C-STAIR-3" },
  { id: "C-STAIR-4", name: "Staircase 4 (right)", floor: "C", type: "Stairs", description: "Right staircase.", nodeId: "C-STAIR-4" }
];