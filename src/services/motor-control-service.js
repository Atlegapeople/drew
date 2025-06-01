/**
 * D.R.E.W. Vending Machine - Motor Control Service
 * 
 * This service monitors the dispense-requests directory for product dispensing
 * requests and communicates with the ESP32 firmware via serial port to control
 * the motor for dispensing products.
 */

const fs = require('fs');
const path = require('path');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const chokidar = require('chokidar');

// Configuration
const CONFIG = {
  serialPort: process.env.SERIAL_PORT || 'COM7', // Change to your port (e.g., /dev/ttyUSB0 for Linux)
  baudRate: 9600,
  dispensePath: path.join(process.cwd(), 'public', 'dispense-requests'),
  latestFile: 'latest.json',
  logFile: path.join(process.cwd(), 'logs', 'motor-service.log')
};

// Ensure directories exist
if (!fs.existsSync(CONFIG.dispensePath)) {
  fs.mkdirSync(CONFIG.dispensePath, { recursive: true });
}

const logDir = path.dirname(CONFIG.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(logMessage.trim());
  
  // Append to log file
  fs.appendFileSync(CONFIG.logFile, logMessage);
}

// Initialize serial port
let port;
try {
  port = new SerialPort({ 
    path: CONFIG.serialPort, 
    baudRate: CONFIG.baudRate 
  });
  
  log(`Serial port ${CONFIG.serialPort} opened at ${CONFIG.baudRate} baud`);
} catch (error) {
  log(`ERROR: Failed to open serial port: ${error.message}`);
  process.exit(1);
}

// Create parser for reading lines from serial port
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// Set up event handlers for serial port
port.on('open', () => {
  log('Serial port opened successfully');
});

port.on('error', (err) => {
  log(`Serial port error: ${err.message}`);
});

// Process serial messages from ESP32
parser.on('data', (data) => {
  log(`Received from ESP32: ${data}`);
  
  // Handle completion messages
  if (data.startsWith('COMPLETE:')) {
    const productType = data.substring(9).trim();
    log(`Product dispensed: ${productType}`);
    
    // Update the latest.json file with completed status
    try {
      const latestPath = path.join(CONFIG.dispensePath, CONFIG.latestFile);
      if (fs.existsSync(latestPath)) {
        const dispenseData = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
        dispenseData.status = 'complete';
        fs.writeFileSync(latestPath, JSON.stringify(dispenseData, null, 2));
        log('Updated dispense status to complete');
      }
    } catch (error) {
      log(`Error updating dispense status: ${error.message}`);
    }
  } else if (data.startsWith('SYSTEM:READY')) {
    log('ESP32 system is ready');
  } else if (data.startsWith('DISPENSING:')) {
    const productType = data.substring(11).trim();
    log(`ESP32 is dispensing: ${productType}`);
  }
});

// File watcher for dispense requests
const watcher = chokidar.watch(path.join(CONFIG.dispensePath, CONFIG.latestFile), {
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 500,
    pollInterval: 100
  }
});

// Handle new or changed latest.json file
watcher.on('add', handleDispenseRequest);
watcher.on('change', handleDispenseRequest);

// Function to process dispense requests
function handleDispenseRequest(filePath) {
  try {
    // Read the dispense request file
    const dispenseData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Only process pending requests
    if (dispenseData.status === 'pending') {
      log(`Processing dispense request for ${dispenseData.productType}`);
      
      // Send command to ESP32
      const command = `DISPENSE:${dispenseData.productType}\n`;
      port.write(command, (err) => {
        if (err) {
          log(`Error sending command to ESP32: ${err.message}`);
          
          // Update status to error
          dispenseData.status = 'error';
          dispenseData.error = err.message;
          fs.writeFileSync(filePath, JSON.stringify(dispenseData, null, 2));
        } else {
          log(`Command sent to ESP32: ${command.trim()}`);
          
          // Update status to processing
          dispenseData.status = 'processing';
          fs.writeFileSync(filePath, JSON.stringify(dispenseData, null, 2));
        }
      });
    }
  } catch (error) {
    log(`Error processing dispense request: ${error.message}`);
  }
}

// Set up cleanup on exit
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

function cleanup() {
  log('Shutting down motor control service');
  if (port && port.isOpen) {
    port.close();
  }
  process.exit(0);
}

// Display startup message
log('Motor Control Service Started');
log(`Monitoring ${CONFIG.dispensePath} for dispense requests`);

// Simple HTTP server to check service status
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'running',
    port: CONFIG.serialPort,
    monitoringPath: CONFIG.dispensePath
  }));
});

server.listen(3334, () => {
  log('Status server running on port 3334');
});
