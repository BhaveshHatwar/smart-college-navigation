# Smart Indoor College Navigation System

Interactive digital floor maps and indoor navigation for
G.H. Raisoni College of Engineering (floors C, D, E, F).

Student: [your name]   Roll no.: [roll number]

## Features
- Firebase login / registration / logout, student and admin roles
- Interactive SVG maps for 4 floors, with zoom, pan, pinch
- Global search by room number or name
- Shortest indoor route (Dijkstra) on the same floor and across floors
- Lift-only, stairs-only and fastest routes
- Admin panel for locations (Firestore), with security rules
- Responsive: laptop, tablet and phone

## Run locally
1. Put your Firebase keys in js/firebase-config.js
2. node tools/generate-maps.js
3. Open the folder in VS Code and start "Live Server"
4. Open tests/tests.html to run the automated tests

## Deploy
firebase deploy --only hosting

## Notes
- Maps and corridors are approximate until traced over the real plans.
- Descriptions are demo data until replaced.