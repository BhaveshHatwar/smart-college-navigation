// ============================================================
// e-floor-locations.js
// *** DEMO DATA ***  Descriptions are placeholders.
// Same fields as c-floor-locations.js - see the comments there.
//
// NOTE: on the E-floor drawing the PG rooms are labelled W-25 / W-23
// and the Seminar room "E-24 / E-34". We use the clean IDs E-25,
// E-W23 and E-24. Change them if you prefer the drawing's labels.
// ============================================================

export const eFloorLocations = [
  // ----- Left wing -----
  { id: "E-21", name: "Class Room", floor: "E", type: "Classroom", description: "DEMO: Classroom in the left wing.", nodeId: "E-node-21" },
  { id: "E-20", name: "Boys Common Room", floor: "E", type: "Facility", description: "DEMO: Common room for boys.", nodeId: "E-node-20" },
  { id: "E-12", name: "Electronics Devices & Circuits Lab", floor: "E", type: "Laboratory", description: "DEMO: Electronics devices and circuits laboratory.", nodeId: "E-node-12" },
  { id: "E-13", name: "LEC Lab", floor: "E", type: "Laboratory", description: "DEMO: LEC laboratory.", nodeId: "E-node-13" },
  { id: "E-14", name: "CESD&P Lab", floor: "E", type: "Laboratory", description: "DEMO: CESD&P laboratory.", nodeId: "E-node-14" },
  { id: "E-15", name: "UHF & TV Lab", floor: "E", type: "Laboratory", description: "DEMO: UHF and TV laboratory.", nodeId: "E-node-15" },
  { id: "E-23", name: "Microprocessor Lab", floor: "E", type: "Laboratory", description: "DEMO: Microprocessor laboratory.", nodeId: "E-node-23" },
  { id: "E-22", name: "Project Lab", floor: "E", type: "Laboratory", description: "DEMO: Laboratory for student projects.", nodeId: "E-node-22" },
  { id: "E-27", name: "PG Electronics", floor: "E", type: "Laboratory", description: "DEMO: Postgraduate electronics laboratory.", nodeId: "E-node-27" },
  { id: "E-29", name: "HOD Lab / TEQP Office", floor: "E", type: "Office", description: "DEMO: HOD laboratory and TEQP office.", nodeId: "E-node-29" },
  { id: "E-28", name: "W. S/W ACC Lab", floor: "E", type: "Laboratory", description: "DEMO: Software and ACC laboratory.", nodeId: "E-node-28" },
  { id: "E-16", name: "OC & Telephony Lab", floor: "E", type: "Laboratory", description: "DEMO: Optical communication and telephony laboratory.", nodeId: "E-node-16" },
  { id: "E-19", name: "Class Room", floor: "E", type: "Classroom", description: "DEMO: Classroom in the left wing.", nodeId: "E-node-19" },
  { id: "E-17", name: "Embedded System Lab", floor: "E", type: "Laboratory", description: "DEMO: Embedded systems laboratory.", nodeId: "E-node-17" },
  { id: "E-18", name: "Class Room", floor: "E", type: "Classroom", description: "DEMO: Classroom in the left wing.", nodeId: "E-node-18" },

  // ----- Centre / right-centre -----
  { id: "E-26", name: "Class Room (TU)", floor: "E", type: "Classroom", description: "DEMO: Theory unit classroom.", nodeId: "E-node-26" },
  { id: "E-24", name: "Seminar & Conference", floor: "E", type: "Hall", description: "DEMO: Seminar and conference room.", nodeId: "E-node-24" },
  { id: "E-11", name: "Electronics Workshop", floor: "E", type: "Laboratory", description: "DEMO: Electronics workshop.", nodeId: "E-node-11" },
  { id: "E-10", name: "CAD/CAE Lab", floor: "E", type: "Laboratory", description: "CAD/CAE laboratory for engineering students.", nodeId: "E-node-10" },
  { id: "E-09", name: "Metallurgy & MM Lab", floor: "E", type: "Laboratory", description: "DEMO: Metallurgy and material management laboratory.", nodeId: "E-node-09" },
  { id: "E-04M", name: "Maths Lab (TU)", floor: "E", type: "Laboratory", description: "DEMO: Mathematics laboratory.", nodeId: "E-node-04M" },
  { id: "E-STAFF", name: "Staff Room", floor: "E", type: "Office", description: "DEMO: Faculty staff room.", nodeId: "E-node-STAFF" },
  { id: "E-05", name: "Class Room (TU)", floor: "E", type: "Classroom", description: "DEMO: Theory unit classroom.", nodeId: "E-node-05" },
  { id: "E-TU1", name: "Class Room (TU)", floor: "E", type: "Classroom", description: "DEMO: Theory unit classroom (no number in the drawing).", nodeId: "E-node-TU1" },

  // ----- Right wing -----
  { id: "E-22D", name: "Drawing Hall", floor: "E", type: "Hall", description: "DEMO: Engineering drawing hall.", nodeId: "E-node-22D" },
  { id: "E-21B", name: "Class Room", floor: "E", type: "Classroom", description: "DEMO: Classroom next to the Drawing Hall.", nodeId: "E-node-21B" },
  { id: "E-W24", name: "P&T / PG Mech Lab", floor: "E", type: "Laboratory", description: "DEMO: P&T / PG mechanical laboratory.", nodeId: "E-node-W24" },
  { id: "E-25", name: "Class Room", floor: "E", type: "Classroom", description: "DEMO: Classroom in the right wing (labelled W-25 in the drawing).", nodeId: "E-node-25" },
  { id: "E-W23", name: "T&M / PG Class Room", floor: "E", type: "Classroom", description: "DEMO: T&M / PG classroom.", nodeId: "E-node-W23" },
  { id: "E-02", name: "Class Room", floor: "E", type: "Classroom", description: "DEMO: Classroom E-02.", nodeId: "E-node-02" },
  { id: "E-07", name: "Class Room", floor: "E", type: "Classroom", description: "DEMO: Classroom E-07.", nodeId: "E-node-07" },
  { id: "E-01", name: "Class Room", floor: "E", type: "Classroom", description: "DEMO: Classroom E-01.", nodeId: "E-node-01" },
  { id: "E-03", name: "Class Room", floor: "E", type: "Classroom", description: "DEMO: Classroom E-03.", nodeId: "E-node-03" },
  { id: "E-04", name: "Class Room", floor: "E", type: "Classroom", description: "DEMO: Classroom E-04.", nodeId: "E-node-04" },

  // ----- Lift and stairs -----
  { id: "E-LIFT", name: "Lift", floor: "E", type: "Lift", description: "Central lift connecting all floors.", nodeId: "E-LIFT" },
  { id: "E-STAIR-1", name: "Staircase 1 (left)", floor: "E", type: "Stairs", description: "Left staircase.", nodeId: "E-STAIR-1" },
  { id: "E-STAIR-2", name: "Staircase 2 (centre-left)", floor: "E", type: "Stairs", description: "Centre-left staircase.", nodeId: "E-STAIR-2" },
  { id: "E-STAIR-3", name: "Staircase 3 (centre-right)", floor: "E", type: "Stairs", description: "Centre-right staircase.", nodeId: "E-STAIR-3" },
  { id: "E-STAIR-4", name: "Staircase 4 (right)", floor: "E", type: "Stairs", description: "Right staircase.", nodeId: "E-STAIR-4" }
];