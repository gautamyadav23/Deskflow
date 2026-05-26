# DeskFlow — Support Ticket Triage Board & SLA Monitor

DeskFlow is a premium, real-time support ticket triage board built on the MERN stack (MongoDB, Express, React, Node.js). It provides support agents with a high-fidelity visual interface to track, triage, and manage incoming customer tickets.

Featuring dynamic SLA monitoring, allowed status transitions enforcement, and a clean glassmorphic dark-theme UI with fluid drag-and-drop operations, DeskFlow streamlines the customer support workflow.

---

## Key Features

- 📋 **Triage Board**: Visual columns representing the ticket lifecycle: `Open` ➔ `In Progress` ➔ `Resolved` ➔ `Closed`.
- 🔄 **Strict Transitions**: Server-side enforcement of ticket status flows:
  - **Forward**: `open` ➔ `in_progress` ➔ `resolved` ➔ `closed` (no skipping steps).
  - **Backward**: Only single-step regression allowed (e.g., `resolved` ➔ `in_progress`).
- ⏱️ **SLA Breach Monitoring**: Real-time SLA indicators based on ticket priority:
  - 🚨 **Urgent**: 1 hour (60 mins)
  - ⚡ **High**: 4 hours (240 mins)
  - 🟦 **Medium**: 24 hours (1440 mins)
  - 🟢 **Low**: 72 hours (4320 mins)
- 📊 **Real-time Stats Strip**: High-level telemetry showing ticket counts by status and the current number of active tickets breaching SLA.
- 🎨 **Premium Glassmorphic UI**: High-fidelity dark mode styling with vibrant, glow-enhanced priorities, smooth animations, and responsive columns.
- 🎛️ **Combinable Filtering**: Filter by priority level and SLA breach status simultaneously.
- 🎯 **HTML5 Drag-and-Drop**: Smooth drag operations that validate transitions before letting the card drop (invalid drops snap back with warning toasts).
- 📥 **Slide-out Drawer Form**: Elegant creation drawer with inline validation errors and loading indicator.

---

## Technology Stack

- **Frontend**: React (Vite), Vanilla CSS (Custom Variables, Flexbox/Grid, Animations)
- **Backend**: Node.js, Express, MongoDB (Mongoose), CORS, Dotenv
- **Testing**: Native Node `fetch` integration test script

---

## Directory Structure

```text
deskflow/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   └── Ticket.js       # Mongoose Ticket schema
│   │   ├── routes/
│   │   │   └── tickets.js      # API Router (Validation, SLA, Transitions)
│   │   ├── db.js               # MongoDB Connection helper
│   │   └── server.js           # Server startup and middleware config
│   ├── .env                    # Environment config
│   ├── package.json
│   └── test-api.js             # Automated API integration tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Filters.jsx     # Priority filters & SLA toggles
│   │   │   ├── StatsStrip.jsx  # Telemetry indicator cards
│   │   │   ├── TicketBoard.jsx # Central board coordinator
│   │   │   ├── TicketCard.jsx  # Individual ticket with timers
│   │   │   ├── TicketColumn.jsx# Status column drop-zone
│   │   │   └── TicketFormPanel.jsx # Slide-out creation form
│   │   ├── App.jsx             # State manager and main layout
│   │   ├── App.css
│   │   ├── index.css           # Global layout & styles variables
│   │   └── main.jsx
│   ├── index.html              # Core webpage & SEO headers
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Setup & Local Installation

### Prerequisites
- Node.js (v18+ recommended, tested on v22)
- MongoDB running locally on `mongodb://127.0.0.1:27017`

### 1. Clone & Set Up Backend
Navigate to the `backend/` directory:
```bash
cd backend
npm install
```
Configure your environment in `backend/.env`:
```env
PORT=5050
MONGO_URI=mongodb://127.0.0.1:27017/deskflow
```
Start the backend server:
```bash
npm start   # or node src/server.js
```

### 2. Set Up Frontend
Navigate to the `frontend/` directory:
```bash
cd ../frontend
npm install
```
Start the frontend development server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Verification & Testing

To run the automated integration tests which validate validation rules, transition constraints, SLA breach logic, and stats counts:
1. Ensure the backend server is running (`node src/server.js` on port `5050`).
2. Run the test script in the `backend/` folder:
```bash
cd backend
node test-api.js
```
All tests should pass successfully.
