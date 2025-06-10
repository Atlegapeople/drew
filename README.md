# ✅ D.R.E.W. Access System – Implementation Summary

**Project:** D.R.E.W. (Dignity • Respect • Empowerment for Women)  
**Client:** ABSA  
**Deployment Target:** Raspberry Pi 4 with 10" Touchscreen (Offline)

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

## ✅ Dispensing System

- ESP32 firmware handles product dispensing with motor control and buzzer feedback.
- Implemented a unified RFID and dispense service to handle both card reading and product dispensing.
- Added robust dispense management with concurrency prevention on the ESP32 to avoid multiple motor activations.
- Created an enhanced DispensingScreen component with visual loading indicators, progress tracking, and completion feedback.
- Serial port communication between the Node.js service and ESP32 uses a centralized parser to prevent duplicate event handling.
- Toast notifications provide clear user feedback throughout the dispensing process.

---

## ✅ Deployment Readiness

- Current system is **deployment-ready** for a Raspberry Pi 4 with 10" touchscreen.
- All authentication logic, session flow, and inventory features are working as expected.
- Final step: integrate and test **real RFID and GPIO hardware** (drivers and logic already simulated).

---

## 🚀 Installation & Running Instructions

### Prerequisites
- Node.js 18.x or higher
- npm 8.x or higher
- For production: Raspberry Pi 4 with 10" touchscreen
- Git (for cloning the repository)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Atlegapeople/drew.git
   cd drew
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize the database**
   ```bash
   npm run db:init
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will be available at http://localhost:3000

### Production Deployment (Raspberry Pi)

1. **Clone and set up on the Raspberry Pi**
   ```bash
   git clone https://github.com/Atlegapeople/drew.git
   cd drew
   npm install
   ```

2. **Build for production**
   ```bash
   npm run build
   ```

3. **Start the production server**
   ```bash
   npm start
   ```
   The application will be available at http://localhost:3000

4. **Start the unified RFID and dispense service in a separate terminal**
   ```bash
   node src/scripts/drew-rfid-service.js
   ```
   This service:
   - Monitors the serial port for RFID card scans
   - Writes scan data to JSON files that the main application reads
   - Handles dispense requests by sending commands to the ESP32 
   - Moves processed requests to a `done` subfolder after they're handled

5. **Auto-start on boot (optional)**
   Add the following to `/etc/rc.local` before the `exit 0` line:
   ```bash
   cd /path/to/drew && npm start &
   cd /path/to/drew && node src/scripts/drew-rfid-service.js &
   ```
   This will start both the main application and the RFID service on boot.

### Default Authentication

- **Admin PIN**: `9999`
- **User PIN**: `1234`
- **RFID Cards**: Use the admin interface to register new cards

### Sound System

The application includes a global touch sound system with specific sounds for:
- Screen touches and button presses
- Success and error feedback during authentication
- RFID card scanning events
- Dispense completion feedback through ESP32 buzzer

Sound can be enabled/disabled via the settings interface.

### RFID and Dispense Integration

The system uses a unified service approach for RFID card authentication and product dispensing:

1. **Unified Service** (`drew-rfid-service.js`):
   - Runs as a separate Node.js process
   - Monitors the serial port for incoming RFID card scans
   - Writes scan data to JSON files in `public/card-scans/`
   - Processes dispense requests from the `public/dispense-requests/` directory
   - Sends dispense commands to the ESP32 firmware via serial port
   - Monitors dispense completion messages from the ESP32
   - Uses a single global parser instance to handle all serial communication

2. **Frontend Integration**:
   - The application periodically checks for new card scans
   - When a scan is detected, it verifies the card against the database
   - Creates dispense request files when users select products
   - Displays an enhanced loading screen with progress indication during dispensing
   - Provides visual feedback and toast notifications throughout the process

3. **ESP32 Firmware**:
   - Controls motor direction and speed for dispensing products
   - Provides buzzer feedback at the start of dispensing
   - Implements concurrency controls to prevent multiple dispense operations
   - Sends status messages to the Node.js service via serial communication

For development without physical RFID hardware, you can simulate card scans by manually creating JSON files in the `public/card-scans/` directory with the following format:

```json
{
  "cardUid": "A955AF02",
  "timestamp": "2025-06-01T15:28:09"
}
```

Similarly, to test the dispense functionality, you can manually create JSON files in the `public/dispense-requests/` directory with the format:

```json
{
  "productType": "tampon",
  "timestamp": "2025-06-01T15:28:09"
}
