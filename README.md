# Cryptid Tracker

A full-stack application for tracking, logging, and analyzing sightings of various cryptids (Bigfoot, Mothman, etc.). This project was developed to demonstrate database management, many-to-many relationships, and explicit transaction handling using Flask-SQLAlchemy and SQLite.

## Tech Stack
- **Frontend:** React.js, CSS3
- **Backend:** Python, Flask, Flask-CORS
- **Database:** SQLite
- **ORM:** SQLAlchemy

## Getting Started

### Prerequisites
- Python 3.x
- Node.js & npm

### Frontend Setup
1. Install dependencies:
   ```bash
   npm install
3. Run the application
   ```bash
   npm run dev

### Backend Setup
1. Navigate to the `backend` directory.
2. Install dependencies:
   ```bash
   pip install flask flask-sqlalchemy flask-cors
3. Run the application
   ```bash
   python app.py

---

## Database Architecture & Transactions

### 1. Entity-Relationship Design
- **Cryptid Table:** Stores the master list of creatures.
- **Sighting Table:** Stores specific encounter data (date, location, credibility score).
- **EvidenceType Table:** A lookup table for types of proof (e.g., "Blurry Photo", "Footprint Cast").
- **SightingEvidence:** Facilitates a **Many-to-Many** relationship between Sightings and EvidenceTypes.

### 2. Transaction Management (ACID)
To ensure **Atomicity**, the application utilizes explicit SQLAlchemy session blocks (`with db.session.begin():`). This ensures that the all actions of one interaction are treated as a single operation. If any part of the process fails (e.g., a database constraint violation), the entire transaction is rolled back, preventing half-finished entries from entering the table.

### 3. Concurrency & Isolation Levels
The backend is engineered for multi-user safety:
- **Transaction Mode:** The app executes `BEGIN IMMEDIATE` at the start of write operations. This overrides SQLite’s default deferred locking, acquiring a write lock before writing to any table.
- **Busy Timeout:** A `PRAGMA busy_timeout = 5000` is implemented. This instructs SQLite to wait for up to 5 seconds for a lock to clear before returning an error, so that user B has can actually commence after user A without crashing.
- **Isolation Level:** The application operates under a **Serializable** isolation level via SQLite's locking mechanism, ensuring the highest degree of data consistency and preventing phantom reads or race conditions.

---

## Features
- **Dynamic Sighting Logs:** Users can select existing cryptids or add a new creature directly from the reporting form.
- **Data Integrity:** Backend validation prevents duplicate cryptid entries and ensures dates are not in the future.
- **Advanced Filtering:** The Intelligence Report allows users to filter the database by date range, specific cryptid, and minimum credibility score.
- **Intelligence Dashboard:** Automatically calculates total records, average credibility, the most spotted cryptid, and the most common type of evidence.
- **Full CRUD Support:** Users can create new records, read/filter existing ones, update sightings (including evidence types), and delete records.

---

## AI Use
I used Gemini for debugging purposes. After writing my own code, I would submit it to Gemini if I did not understand the errors. After submitting my code, I would ask questions until I understood its offered solution or find my own solution if its response was odd or incorrect.
