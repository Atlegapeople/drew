/**
 * D.R.E.W. Vending Machine RFID Service
 * 
 * This service provides RFID card reading capabilities for the
 * D.R.E.W. (Dignity, Respect, Empowerment for Women) vending machine project.
 * 
 * It reads card IDs from the RFID reader and provides a simple HTTP API
 * for the Next.js application to consume.
 */

// Import dependencies
const SerialPort = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const http = require('http');
const fs = require('fs');

// Configuration
const PORT_NAME = process.env.RFID_PORT || 'COM7';
const BAUD_RATE = process.env.RFID_BAUD_RATE ? parseInt(process.env.RFID_BAUD_RATE) : 9600;
const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3333;

console.log('D.R.E.W. RFID Service');
console.log(`COM Port: ${PORT_NAME} at ${BAUD_RATE} baud`);
console.log(`API Port: ${API_PORT}`);

// Keep track of the most recent card scan
let lastCardScan = null;
let isPortOpen = false;

// Create serial port connection
let port;
let portOpenAttempts = 0;
const MAX_PORT_ATTEMPTS = 3;

// Debounce variables to prevent duplicate card scanning
let lastCardUIDProcessed = null;
let lastCardProcessTime = 0;
const CARD_PROCESS_DEBOUNCE = 500; // 500ms debounce time

// Function to try opening the port with retries
function tryOpenPort() {
  try {
    if (portOpenAttempts >= MAX_PORT_ATTEMPTS) {
      console.log(`Failed to open port after ${MAX_PORT_ATTEMPTS} attempts.`);
      console.log('Running in fallback mode - use /api/simulate-scan to simulate card scans');
      return;
    }
    
    portOpenAttempts++;
    console.log(`Attempting to open serial port (attempt ${portOpenAttempts}/${MAX_PORT_ATTEMPTS})...`);
    
    // Handle different SerialPort versions
    if (typeof SerialPort === 'function') {
      port = new SerialPort(PORT_NAME, { baudRate: BAUD_RATE });
    } else if (SerialPort.SerialPort) {
      const { SerialPort: SP } = SerialPort;
      port = new SP({ path: PORT_NAME, baudRate: BAUD_RATE });
    } else {
      throw new Error('Unknown SerialPort API format');
    }
    
    console.log('Serial port initialized');
    
    // Handle port events
    port.on('open', () => {
      console.log(`Successfully connected to unified service on ${PORT_NAME}`);
      console.log('This service now handles both RFID card reading and product dispensing');
      isPortOpen = true;
      portOpenAttempts = 0; // Reset counter on success
    });
    
    port.on('close', () => {
      console.log('Connection to serial port closed');
      isPortOpen = false;
    });
    
    // Create a SINGLE readline parser that will be used for all communication
    // This prevents multiple parser instances from causing duplicate actions
    if (!global.serialParser) {
      console.log('Creating global serial parser');
      global.serialParser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
    } else {
      console.log('Reusing existing global serial parser');
    }
    
    // Process line-by-line data from the ESP32
    global.serialParser.on('data', (line) => {
      console.log(`DEBUG: Received line: ${line}`);
      
      // Check for our new card UID format: "CARDUID:XXXXXXXX"
      const cardRegex = /CARDUID:([0-9A-Fa-f]+)/;
      const match = cardRegex.exec(line);
      
      if (match) {
        // Extract the card UID (match[1] contains the hex string)
        const cardID = match[1].toUpperCase();
        
        // Apply debouncing - check if this is the same card recently processed
        const currentTime = Date.now();
        const isDuplicate = (cardID === lastCardUIDProcessed) && 
                           (currentTime - lastCardProcessTime < CARD_PROCESS_DEBOUNCE);
        
        if (!isDuplicate) {
          // Update debounce tracking variables
          lastCardUIDProcessed = cardID;
          lastCardProcessTime = currentTime;
          
                  // Format with colons between each pair of characters
          const formattedCardID = cardID.match(/.{1,2}/g)?.join(':') || cardID;
          
          // Store and log the card scan
          lastCardScan = {
            cardUID: cardID,                // Full UID (e.g., "A955AF02")
            formattedUID: formattedCardID, // Formatted (e.g., "A9:55:AF:02")
            timestamp: new Date().toISOString()
          };
          
          // Log card scan in a prominent way
          console.log('\n==================================');
          console.log(`CARD SCANNED: ${formattedCardID}`);
          console.log(`CARD UID: ${cardID}`);
          console.log(`TIME: ${new Date().toLocaleTimeString()}`);
          console.log('==================================\n');
          
          // Write scan data to file first
          writeScanToFile(lastCardScan);
          
          // Then notify any active SSE clients (without writing file again)
          clients.forEach(client => {
            try {
              client.write(`event: card\ndata: ${JSON.stringify(lastCardScan)}\n\n`);
            } catch (err) {
              console.error('Error notifying client:', err.message);
            }
          });
        } else {
          console.log(`Ignoring duplicate card read: ${cardID} (debounced)`);
        }
      }
      // Check for dispense confirmations (DISPENSING: and COMPLETE:)
      else if (line.includes('DISPENSING:')) {
        const productType = line.split(':')[1];
        console.log(`\n==================================`);
        console.log(` DISPENSING: ${productType}`);
        console.log(`TIME: ${new Date().toLocaleTimeString()}`);
        console.log('==================================\n');
      } 
      else if (line.includes('COMPLETE:')) {
        const productType = line.split(':')[1];
        console.log(`\n==================================`);
        console.log(` DISPENSE COMPLETE: ${productType}`);
        console.log(`TIME: ${new Date().toLocaleTimeString()}`);
        console.log('==================================\n');
        
        // This event is also handled in the dispense request processing code
      }
      // Check for system ready and other informational messages
      else if (line.includes('SYSTEM:READY')) {
        console.log(`\n==================================`);
        console.log(` ESP32 SYSTEM READY`);        
        console.log('==================================\n');
      }
      // Check for other informational messages
      else if (line.includes('DREW RFID Reader') || 
               line.includes('Ready to scan') || 
               line.includes('========================')) {
        console.log(`RFID Reader Info: ${line}`);
      }
    });
    
    // Also log raw data for debugging
    port.on('data', (data) => {
      // Convert bytes to hex for debugging
      const rawHex = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      const rawASCII = Array.from(data).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
      console.log(`DEBUG RAW: [${data.length} bytes] HEX: ${rawHex} ASCII: ${rawASCII}`);
    });
    
    // Set a retry mechanism in case the first attempt fails
    port.on('error', (err) => {
      console.error(`Serial port error: ${err.message}`);
      isPortOpen = false;
      
      // Try to reconnect after a delay
      setTimeout(() => {
        console.log('Attempting to reconnect to serial port...');
        tryOpenPort();
      }, 5000); // 5 second retry delay
    });
    
  } catch (err) {
    console.error('Failed to open serial port:', err.message);
    console.log('Retrying in 3 seconds...');
    setTimeout(tryOpenPort, 3000);
  }
}

// Start by trying to open the port
tryOpenPort();

// Fallback mode is always available regardless of port connection
console.log('Fallback mode is available - use /api/simulate-scan to simulate card scans');

// Keep track of connected SSE clients
const clients = [];

// Function to notify all connected clients of a card scan
function notifyClients(scanData) {
  // Only notify connected SSE clients
  clients.forEach(client => {
    try {
      client.write(`event: card\ndata: ${JSON.stringify(scanData)}\n\n`);
    } catch (err) {
      console.error('Error notifying client:', err.message);
    }
  });
}

// Function to write card scan data to a file
function writeScanToFile(scanData) {
  try {
    // Add a timestamp to the data
    const dataWithTimestamp = {
      ...scanData,
      timestamp: new Date().toISOString(),
      fileTimestamp: Date.now(), // Add a numeric timestamp for filename uniqueness
      processed: false // Track if this file has been processed
    };
    
    // Create the card scans directory if it doesn't exist
    const scanDir = './public/card-scans';
    if (!fs.existsSync(scanDir)) {
      fs.mkdirSync(scanDir, { recursive: true });
    }
    
    // Create the 'done' directory if it doesn't exist
    const doneDir = `${scanDir}/done`;
    if (!fs.existsSync(doneDir)) {
      fs.mkdirSync(doneDir, { recursive: true });
    }
    
    // Write the current scan to a timestamped file
    const scanFilename = `scan-${dataWithTimestamp.fileTimestamp}.json`;
    const scanFilePath = `${scanDir}/${scanFilename}`;
    fs.writeFileSync(scanFilePath, JSON.stringify(dataWithTimestamp, null, 2), 'utf8');
    
    // Also write to a 'latest.json' file that will always have the most recent scan
    const latestFilePath = `${scanDir}/latest.json`;
    fs.writeFileSync(latestFilePath, JSON.stringify(dataWithTimestamp, null, 2), 'utf8');
    
    console.log(`Card scan data written to ${scanFilePath} and ${latestFilePath}`);
    
    // After 5 seconds, move the scan file to the 'done' folder
    setTimeout(() => {
      try {
        // Check if the file still exists (it might have been moved already)
        if (fs.existsSync(scanFilePath)) {
          // Read the file to check if it's been processed
          const fileContent = JSON.parse(fs.readFileSync(scanFilePath, 'utf8'));
          
          // Mark as processed and move to done directory
          fileContent.processed = true;
          
          // Write to done directory
          const doneFilePath = `${doneDir}/${scanFilename}`;
          fs.writeFileSync(doneFilePath, JSON.stringify(fileContent, null, 2), 'utf8');
          
          // Remove the original file
          fs.unlinkSync(scanFilePath);
          
          console.log(`Moved processed card scan file to ${doneFilePath}`);
        }
      } catch (moveErr) {
        console.error('Error moving scan file to done folder:', moveErr.message);
      }
    }, 5000); // 5 second delay before moving the file
  } catch (err) {
    console.error('Error writing scan data to file:', err.message);
  }
}

// Create HTTP server for API
const server = http.createServer((req, res) => {
  // Set CORS headers to allow requests from the Next.js app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Route: Get status of the RFID service
  if (req.method === 'GET' && req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      status: isPortOpen ? 'connected' : 'disconnected',
      port: PORT_NAME,
      lastScan: lastCardScan
    }));
    return;
  }
  
  // Route: Get the last card scan
  if (req.method === 'GET' && req.url === '/api/last-card') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: lastCardScan || { message: 'No card scanned yet' }
    }));
    return;
  }
  
  // Route: Server-Sent Events endpoint for real-time card scans
  if (req.method === 'GET' && req.url === '/api/listen') {
    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Send connected event
    res.write('event: connected\ndata: {"status":"waiting_for_card"}\n\n');
    
    // Add this client to the list
    clients.push(res);
    
    // Send the last scan if available
    if (lastCardScan) {
      res.write(`event: last-scan\ndata: ${JSON.stringify(lastCardScan)}\n\n`);
    }
    
    // Handle client disconnect
    req.on('close', () => {
      const index = clients.indexOf(res);
      if (index !== -1) {
        clients.splice(index, 1);
        console.log(`Client disconnected, ${clients.length} remaining`);
      }
    });
    
    return;
  }
  
  // Route: Simulate a card scan (for testing)
  if (req.method === 'POST' && req.url === '/api/simulate-scan') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { cardUID } = JSON.parse(body);
        if (!cardUID) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'cardUID is required' }));
          return;
        }
        
        // Create a simulated card scan
        // Format as if it were from a real reader
        const formattedUID = cardUID.replace(/(.{2})(?!$)/g, '$1:');
        const simulatedScan = {
          cardUID: cardUID.replace(/:/g, ''),
          formattedUID: formattedUID,
          timestamp: new Date().toISOString(),
          simulated: true
        };
        
        // Store the simulated scan
        lastCardScan = simulatedScan;
        
        // Notify clients
        notifyClients(simulatedScan);
        
        // Log the simulated scan
        console.log('\n==================================');
        console.log(`SIMULATED CARD: ${cardUID}`);
        console.log(`TIME: ${new Date().toLocaleTimeString()}`);
        console.log('==================================\n');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Card scan simulated' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    
    return;
  }
  
  // Default route: 404 Not Found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
});

// Function to start the server with port fallback
function startServer(port, attempt = 1) {
  const MAX_ATTEMPTS = 10;
  
  if (attempt > MAX_ATTEMPTS) {
    console.error('Failed to find an available port after multiple attempts');
    process.exit(1);
  }
  
  // Try to start the server
  server.listen(port)
    .on('listening', () => {
      console.log(`API Server running at http://localhost:${port}`);
      console.log('Available endpoints:');
      console.log(`- GET http://localhost:${port}/api/status - Get RFID service status`);
      console.log(`- GET http://localhost:${port}/api/last-card - Get most recent card scan`);
      console.log(`- GET http://localhost:${port}/api/listen - Listen for card scans using SSE`);
      console.log(`- POST http://localhost:${port}/api/simulate-scan - Simulate a card scan`);
      
      // Save port configuration for the Next.js app
      const configData = { port: port };
      try {
        // Save to public directory
        if (!fs.existsSync('./public')) {
          fs.mkdirSync('./public', { recursive: true });
        }
        fs.writeFileSync('./public/rfid-config.json', JSON.stringify(configData), 'utf8');
        console.log('Port configuration saved for Next.js app');
      } catch (err) {
        console.warn(`Could not save config: ${err.message}`);
      }
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying port ${port + 1}...`);
        // Try the next port
        startServer(port + 1, attempt + 1);
      } else {
        console.error('Server error:', err.message);
        process.exit(1);
      }
    });
}

// Start the server
startServer(API_PORT);

// Configuration for dispense request monitoring
const DISPENSE_REQUEST_DIR = './public/dispense-requests';
const DISPENSE_DONE_DIR = './public/dispense-requests/done';
const DISPENSE_ERROR_DIR = './public/dispense-requests/errors';
const POLLING_INTERVAL = 500; // Check every 500ms
let processingDispense = false; // Flag to prevent concurrent processing
let dispenseQueue = []; // Queue for dispense requests
let currentDispenseTimeout = null; // Timeout for current dispense operation

// Create necessary directories
function ensureDispenseDirectories() {
  // Ensure main directory exists
  if (!fs.existsSync(DISPENSE_REQUEST_DIR)) {
    fs.mkdirSync(DISPENSE_REQUEST_DIR, { recursive: true });
    console.log(`Created directory: ${DISPENSE_REQUEST_DIR}`);
  }
  
  // Ensure 'done' directory exists
  if (!fs.existsSync(DISPENSE_DONE_DIR)) {
    fs.mkdirSync(DISPENSE_DONE_DIR, { recursive: true });
    console.log(`Created directory: ${DISPENSE_DONE_DIR}`);
  }
  
  // Ensure 'errors' directory exists
  if (!fs.existsSync(DISPENSE_ERROR_DIR)) {
    fs.mkdirSync(DISPENSE_ERROR_DIR, { recursive: true });
    console.log(`Created directory: ${DISPENSE_ERROR_DIR}`);
  }
}

// Track which files we're processing to prevent race conditions
const processingFiles = new Set();

// Process a dispense request file
async function processDispenseRequest(filename) {
  // Check if file is already being processed
  if (processingFiles.has(filename)) {
    console.log(`File ${filename} is already being processed, skipping`);
    return;
  }
  
  // Prevent concurrent processing
  if (processingDispense) {
    console.log(`Already processing a dispense request, queuing ${filename}`);
    if (!dispenseQueue.includes(filename)) {
      dispenseQueue.push(filename);
    }
    return;
  }
  
  // Mark file as being processed
  processingFiles.add(filename);
  processingDispense = true;
  
  const filePath = `${DISPENSE_REQUEST_DIR}/${filename}`;
  console.log(`Processing dispense request: ${filename}`);
  
  // Define data variable at this scope to be accessible in catch block
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Dispense request ${filename} no longer exists, skipping`);
      processingDispense = false;
      processingFiles.delete(filename);
      processNextDispense();
      return;
    }
    
    // Read and parse the request file
    data = fs.readFileSync(filePath, 'utf8');
    try {
      request = JSON.parse(data);
    } catch (parseErr) {
      throw new Error(`Invalid JSON in dispense request ${filename}: ${parseErr.message}`);
    }

    if (!request.productType) {
      throw new Error(`Missing productType in dispense request ${filename}`);
    }
    
    // Format product type to match firmware expectations (lowercase)
    const productType = request.productType.toLowerCase();
    
    // Send dispense command
    console.log(`Sending dispense command for ${productType}`);
    port.write(`DISPENSE:${productType}\n`);
    
    // Set up timeout to detect failure
    const DISPENSE_TIMEOUT = 60000; // 60 seconds - significantly increased to ensure we catch completion message
    
    // Return a promise that resolves on success or rejects on timeout
    await new Promise((resolve, reject) => {
      // Set up a flag to track if this particular dispense operation is complete
      let isDispenseComplete = false;
      
      // Set up success detection based on serial port response
      const dispenseListener = line => {
        // Prevent handling after completion
        if (isDispenseComplete) return;
        
        // Add detailed logging to debug timeout issues
        console.log(`DISPENSE MONITOR: Received line "${line}", waiting for "COMPLETE:${productType}"`);
        
        // Listen for success confirmation specific to this product type
        // Be more flexible with the matching to account for any extra characters
        if (line.toLowerCase().includes(`complete:${productType.toLowerCase()}`)) {
          console.log(`✅ DISPENSE SUCCESS: Found completion message for ${productType}`);
          isDispenseComplete = true;
          cleanup();
          resolve();
        }
      };
      
      // Add the listener to the existing global parser
      if (!global.serialParser) {
        reject(new Error('Serial parser not initialized'));
        return;
      }
      
      // Use the global parser
      global.serialParser.on('data', dispenseListener);
      
      // Set timeout
      currentDispenseTimeout = setTimeout(() => {
        cleanup();
        reject(new Error('Dispense operation timed out'));
      }, DISPENSE_TIMEOUT);
      
      // Cleanup function to remove listeners
      function cleanup() {
        if (global.serialParser) {
          global.serialParser.removeListener('data', dispenseListener);
        }
        if (currentDispenseTimeout) {
          clearTimeout(currentDispenseTimeout);
          currentDispenseTimeout = null;
        }
      }
    });
    
    // Check again if file exists before moving (file could have been moved by another process)
    if (fs.existsSync(filePath)) {
      // Success! Move the file to the 'done' directory
      const timestamp = Date.now();
      const doneFilePath = `${DISPENSE_DONE_DIR}/${timestamp}_${filename}`;
      fs.renameSync(filePath, doneFilePath);
      console.log(`✅ Dispensed ${productType} successfully, moved ${filename} to done directory`);
      
      // Do NOT recreate the latest.json file after moving it
      // This ensures it is properly moved out of the main directory
      // A new latest.json will be created next time a card is scanned
      console.log(`Successfully moved ${filename} out of the active directory`);
      
    } else {
      console.log(`File ${filename} no longer exists, skipping move operation`);
    }
  } catch (err) {
    console.error(`❌ Error processing dispense request ${filename}:`, err.message);
    
    // Only try to move the file if it still exists
    if (fs.existsSync(filePath)) {
      try {
        // Move to error directory with timestamp
        const timestamp = new Date().getTime();
        const errorFilePath = `${DISPENSE_ERROR_DIR}/${timestamp}_${filename}`;
        fs.renameSync(filePath, errorFilePath);
        console.log(`Moved ${filename} to error directory`);
        
        // We deliberately don't recreate latest.json - a new one will be created on next card scan
        
        // Add error information
        let originalRequest = {};
        
        // Only try to parse data if it was successfully read
        try {
          // data might be null if error occurred before reading the file
          if (data !== null) {
            originalRequest = JSON.parse(data);
          }
        } catch (parseErr) {
          console.warn(`Could not parse original request data: ${parseErr.message}`);
        }
        
        const errorData = {
          originalRequest,
          error: err.message,
          timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(
          `${DISPENSE_ERROR_DIR}/${timestamp}_error_${filename}`, 
          JSON.stringify(errorData, null, 2)
        );
      } catch (moveErr) {
        console.error(`Failed to move error file: ${moveErr.message}`);
      }
    } else {
      console.log(`File ${filename} no longer exists, cannot move to error directory`);
    }
  } finally {
    // Clean up state
    processingFiles.delete(filename);
    processingDispense = false;
    
    // Process next request in queue if any
    if (dispenseQueue.length > 0) {
      const nextRequest = dispenseQueue.shift();
      processDispenseRequest(nextRequest);
    }
  }
}

// Check for new dispense request files
function checkDispenseRequests() {
  try {
    // Ensure directories exist
    ensureDispenseDirectories();
    
    // Check if main directory exists (it should, but double-check)
    if (!fs.existsSync(DISPENSE_REQUEST_DIR)) {
      console.log(`Creating main dispense request directory: ${DISPENSE_REQUEST_DIR}`);
      fs.mkdirSync(DISPENSE_REQUEST_DIR, { recursive: true });
      return; // Return early since we just created it
    }
    
    // List files in the directory
    const files = fs.readdirSync(DISPENSE_REQUEST_DIR);
    
    // Only check for latest.json file - ignore all other files
    const latestFilePath = `${DISPENSE_REQUEST_DIR}/latest.json`;
    
    // Check if latest.json exists and is not already being processed
    if (fs.existsSync(latestFilePath) && !processingFiles.has('latest.json')) {
      console.log('Found latest dispense request');
      
      // Process latest.json if not already processing
      if (!processingDispense) {
        processDispenseRequest('latest.json');
      } else if (!dispenseQueue.includes('latest.json')) {
        // Queue the latest.json if already processing another request
        dispenseQueue.push('latest.json');
        console.log('Queued latest.json for processing');
      }
    }
    
    // Clean up any other json files that aren't latest.json
    cleanupOldDispenseRequests();
  
  } catch (err) {
    console.error('Error checking dispense requests:', err.message);
  }
}

// Cleanup function to move old dispense requests to archive folder
function cleanupOldDispenseRequests() {
  try {
    console.log('Cleaning up old dispense request files...');
    // Ensure directories exist
    ensureDispenseDirectories();
    
    // Create archive dir if it doesn't exist
    const archiveDir = `${DISPENSE_REQUEST_DIR}/archive`;
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    
    // Get all files except directories and latest.json
    const files = fs.readdirSync(DISPENSE_REQUEST_DIR);
    const filesToArchive = files.filter(file => {
      const fullPath = `${DISPENSE_REQUEST_DIR}/${file}`;
      return (
        file !== 'latest.json' && 
        !fs.statSync(fullPath).isDirectory() && 
        file.endsWith('.json')
      );
    });
    
    // Move files to archive
    if (filesToArchive.length > 0) {
      console.log(`Found ${filesToArchive.length} old dispense request files to archive`);
      filesToArchive.forEach(file => {
        const oldPath = `${DISPENSE_REQUEST_DIR}/${file}`;
        const newPath = `${archiveDir}/${file}`;
        fs.renameSync(oldPath, newPath);
      });
      console.log('Old dispense request files have been archived');
    } else {
      console.log('No old dispense request files to archive');
    }
  } catch (err) {
    console.error('Error during cleanup:', err.message);
  }
}

// Start monitoring for dispense requests
console.log(`Monitoring for dispense requests in ${DISPENSE_REQUEST_DIR}`);
ensureDispenseDirectories();

// Run initial cleanup
cleanupOldDispenseRequests();

// Set up polling interval for dispense requests
const dispenseInterval = setInterval(checkDispenseRequests, POLLING_INTERVAL);

// Set up an interval to clean up old files every hour
const cleanupInterval = setInterval(cleanupOldDispenseRequests, 3600000); // 1 hour

// The dispense confirmations are now handled directly in the tryOpenPort function
// No need for a separate enhancePortParser function

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down D.R.E.W. Unified Service...');
  
  // Close all client connections
  clients.forEach(client => {
    try {
      client.end();
    } catch (err) {
      // Ignore errors during shutdown
    }
  });
  
  // Clear polling intervals
  if (dispenseInterval) {
    clearInterval(dispenseInterval);
    console.log('Stopped dispense request monitoring');
  }
  
  // Clear cleanup interval
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    console.log('Stopped automatic cleanup');
  }
  
  // Clear any pending dispense timeouts
  if (currentDispenseTimeout) {
    clearTimeout(currentDispenseTimeout);
    console.log('Cleared pending dispense timeouts');
  }
  
  // Close the serial port
  if (port) {
    port.close();
    console.log('Closed serial connection');
  }
  
  // Close the server
  server.close();
  console.log('Closed HTTP server');
  
  process.exit(0);
});
