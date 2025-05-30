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
      console.log(`Successfully connected to RFID reader on ${PORT_NAME}`);
      isPortOpen = true;
      portOpenAttempts = 0; // Reset counter on success
    });
    
    port.on('close', () => {
      console.log('Connection to RFID reader closed');
      isPortOpen = false;
    });
    
    // Create a readline parser to properly handle the new card format
    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
    
    // Process line-by-line data from the RFID reader
    parser.on('data', (line) => {
      console.log(`DEBUG: Received line: ${line}`);
      
      // Check for our new card UID format: "CARDUID:XXXXXXXX"
      const cardRegex = /CARDUID:([0-9A-Fa-f]+)/;
      const match = cardRegex.exec(line);
      
      if (match) {
        // Extract the card UID (match[1] contains the hex string)
        const cardID = match[1].toUpperCase();
        
        // Format with colons between each pair of characters
        const formattedCardID = cardID.match(/.{1,2}/g).join(':');
        
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
        
        // Notify any active SSE clients
        notifyClients(lastCardScan);
      }
      // Check for the DREW RFID Reader startup message or other information
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
    
    // Handle errors
    port.on('error', (err) => {
      console.error('Serial port error:', err.message);
      if (err.message.includes('Access denied') || err.message.includes('in use')) {
        console.log('Port may be in use by another process. Retrying in 3 seconds...');
        setTimeout(() => {
          if (port) {
            try { port.close(); } catch (e) { /* ignore */ }
          }
          tryOpenPort();
        }, 3000);
      }
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
  // First write to a file for the admin panel to read
  writeScanToFile(scanData);
  
  // Then notify connected SSE clients (keep this for backward compatibility)
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

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down D.R.E.W. RFID Service...');
  
  // Close all client connections
  clients.forEach(client => {
    try {
      client.end();
    } catch (err) {
      // Ignore errors during shutdown
    }
  });
  
  // Close the serial port
  if (port) {
    port.close();
  }
  
  // Close the server
  server.close();
  
  process.exit(0);
});
