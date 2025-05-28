# ✅ D.R.E.W. Access System – Implementation Summary

**Project:** D.R.E.W. (Dignity • Respect • Empowerment for Women)  
**Client:** ABSA  
**Deployment Target:** Raspberry Pi 4 with 10” Touchscreen (Offline)

This document outlines the current status of the D.R.E.W. access control system for smart feminine hygiene vending machines. The system is designed for secure, offline use and supports user authentication via RFID card or PIN entry.

---

## ✅ Authentication Requirements

### 🔒 Lock Screen Entry Point
- Implemented a secure lock screen as the default entry point.
- Dual authentication modes provided:
  - **RFID Card** (tap to authenticate)
  - **PIN Entry** (via virtual keypad)
- Access to the main dispensing interface is fully restricted until authentication is successful.

### 🪪 RFID Access
- Simulated RFID scan logic implemented (real hardware integration pending).
- UID values verified against a local access list stored in SQLite.
- Successful and failed scan events logged with timestamps.
- Visual feedback provided for both success and failure scenarios.

### 🔢 PIN Access
- Virtual PIN entry keypad implemented and touch-optimized.
- PINs are securely validated against a local SQLite database using **SHA-256 + salt** hashing.
- Added brute-force prevention: lockout after 3 failed attempts (60-second timeout).
- User feedback clearly indicates lockouts, success, and failure conditions.

---

## ✅ Data Storage (Offline-First)

- Implemented SQLite as the local database engine.
- Configured database tables:
  - `access_profiles`: stores RFID UIDs, hashed PINs, and access levels.
  - `access_logs`: captures all authentication attempts.
  - `inventory_logs`: tracks product dispensing and remaining stock.
- Database paths configured for both development and production environments.
- No cloud or external database dependencies.

---

## ✅ Access Logic & Session Management

- Built a React-based session handler using context.
- Valid login sets an in-memory session token (`localStorage`).
- Unauthorized users are redirected back to the lock screen (`/`).
- Auto-logout occurs after **1 minute** of inactivity.
- Manual logout option available from all protected screens.

---

## ✅ Inventory Tracking (Bonus Feature)

- Initial stock levels:
  - Tampons: 50 units
  - Pads: 50 units
- Dispensing logic decrements stock on use.
- Usage events logged for analytics/reporting.
- Admin-side API endpoints available for:
  - Viewing current inventory
  - Resetting or replenishing inventory

---

## ✅ Technical Requirements & Status

- System operates fully **offline** with all logic self-contained on the Pi.
- UI is optimized for touchscreen use (large buttons, accessible layout).
- All logic for RFID, GPIO, inventory, and session handling is modular and isolated for future updates.
- Real RFID + GPIO hardware integration is **prepared and simulated**, pending final wiring and device testing.
- Logs are stored locally and can be exported manually (future enhancement).

---

## ✅ Deployment Readiness

- Current system is **deployment-ready** for a Raspberry Pi 4 with 10” touchscreen.
- All authentication logic, session flow, and inventory features are working as expected.
- Final step: integrate and test **real RFID and GPIO hardware** (drivers and logic already simulated).
