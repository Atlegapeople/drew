# D.R.E.W. Vending Machine Access System Requirements

**Project:** D.R.E.W. (Dignity, Respect, Empowerment for Women)  
**Client:** ABSA  
**Scope:** Smart vending machine for feminine hygiene products  
**Function:** Secure offline access via RFID card or PIN  
**Platform:** Raspberry Pi (Next.js UI + RFID + GPIO hardware)

---

## Objective

To design and implement a secure, offline-capable access control system that authenticates users via RFID cards or secure PIN entry before allowing them to access the vending interface.

---

## Authentication Requirements

### 1. Lock Screen Entry Point

- The application must launch to a full-screen lock screen interface.
- Two options must be presented:
  - **RFID Card**
  - **PIN Entry**
- Access to the dispensing screen must be restricted until successful authentication is achieved.

---

### 2. RFID Access

- The system must support RFID readers (e.g., MFRC522 via SPI).
- When a user taps a card, the UID must be read and checked against a local access list.
- On a valid UID:
  - Access is granted
  - Access event is logged with timestamp
- On an invalid UID:
  - Access is denied
  - A visual/audio feedback is provided

---

### 3. PIN Access

- A virtual PIN keypad must be rendered on screen.
- User-entered PINs must be validated against a local hashed PIN store.
- On valid PIN:
  - Access is granted
  - Session token is set
- On invalid PIN:
  - Deny access
  - After 3 failed attempts, lock PIN entry for 60 seconds

---

## Data Storage (Offline Mode)

- All credentials and logs must be stored locally using **SQLite**.
- Database tables:
  - `access_profiles (id, card_uid TEXT UNIQUE, pin_hash TEXT, access_level TEXT)`
  - `access_logs (id, card_uid TEXT, method TEXT, result TEXT, timestamp DATETIME)`
- PINs must be hashed with **SHA-256 + salt**.
- Database path: `/home/pi/drew-access/access.db`

---

## Access Logic

- Successful authentication sets a local session (`localStorage` or cookie) flag.
- User is redirected to `/dashboard` or equivalent dispense screen.
- Unauthenticated access to other routes must be blocked with redirect to `/lock`.

---

## Session Management

- After 1 minute of inactivity, user session must auto-expire.
- User is returned to lock screen and session is cleared.
- A logout button must be provided on all screens after login.

---

## Admin / Setup Mode (Future Scope)

- Support a hidden admin mode to:
  - Register new RFID cards
  - Assign or reset PINs
- Admin mode must be protected by a physical trigger (e.g., GPIO switch) or special passcode.
- Admin actions must be logged and stored in the database.

---

## Technical Notes

- Entire system must function **offline**, with no dependency on cloud services.
- RFID scanner and GPIO should be wired securely to the Raspberry Pi.
- Touchscreen interface must be reliable, with large buttons for ease of use.
- All access attempts must be logged with timestamps for audit purposes.
- Logs should be exportable manually (e.g., USB or local file download).

---

## Dependencies

- SQLite (via `better-sqlite3` or `sqlite3` for Node.js)
- SHA-256 hash (via Node.js `crypto`)
- Next.js + React frontend with `/lock` and `/dashboard` routes
- GPIO and RFID integration for Raspberry Pi (Python or C++ CLI tool preferred)

---
