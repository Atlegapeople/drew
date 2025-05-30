// RFID Card Reader Service
// This script runs independently of Next.js to read from the serial port

// Import dependencies
const SerialPort = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { DelimiterParser } = require('@serialport/parser-delimiter');
const http = require('http');
const fs = require('fs');

// Configuration
const PORT_NAME = process.env.RFID_PORT || 'COM7';  // Default to COM7, can be overridden with env variable
const BAUD_RATE = process.env.RFID_BAUD_RATE ? parseInt(process.env.RFID_BAUD_RATE) : 9600;
const API_PORT = 3333;  // Internal API port for communication with Next.js

// Debug output - helps identify issues
console.log(`RFID Reader Script - Starting with COM port: ${PORT_NAME} at baud rate: ${BAUD_RATE}`);
console.log('Using SerialPort library version:', SerialPort.version || 'unknown');

// List available serial ports to help debugging
async function listAvailablePorts() {
  try {
    let ports;
    if (typeof SerialPort.list === 'function') {
      // SerialPort v9+
      ports = await SerialPort.list();
    } else if (SerialPort.SerialPort && typeof SerialPort.SerialPort.list === 'function') {
      // SerialPort v10+
      ports = await SerialPort.SerialPort.list();
    } else {
      console.log('SerialPort.list method not found - cannot list available ports');
      return;
    }
    
    console.log('\nAvailable serial ports:');
    if (ports.length === 0) {
      console.log('No ports found. Make sure your device is connected.');
    } else {
      ports.forEach((port, i) => {
        console.log(`${i + 1}. ${port.path} - ${port.manufacturer || 'Unknown manufacturer'}`);
      });
    }
    console.log(); // Empty line for better readability
  } catch (err) {
    console.error('Error listing serial ports:', err.message);
  }
}

// List ports at startup
listAvailablePorts();

// Defining the serial port
let port;
let isConnected = false;

try {
  // Handle different SerialPort versions
  if (typeof SerialPort === 'function') {
    // Older version (SerialPort as constructor)
    port = new SerialPort(PORT_NAME, { 
      baudRate: BAUD_RATE,
      autoOpen: true,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    });
  } else if (SerialPort.SerialPort) {
    // Newer version (SerialPort.SerialPort as constructor)
    const { SerialPort: SerialPortConstructor } = SerialPort;
    port = new SerialPortConstructor({ 
      path: PORT_NAME,
      baudRate: BAUD_RATE,
      autoOpen: true,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    });
  } else {
    throw new Error('Could not determine SerialPort API format');
  }
  console.log(`Attempting to connect to RFID reader on ${PORT_NAME} at ${BAUD_RATE} baud...`);
} catch (err) {
  console.error('Failed to open serial port:', err.message);
  console.log('Running in fallback mode - will accept HTTP POST requests to simulate card scans');
}

// Set up multiple parsers to handle different formats
let readlineParser;
let delimiterParser;

if (port) {
  // Setup event handlers for the port
  port.on('open', () => {
    console.log(`Serial port ${PORT_NAME} opened successfully!`);
    isConnected = true;
  });
  
  port.on('close', () => {
    console.log(`Serial port ${PORT_NAME} closed`);
    isConnected = false;
  });
  
  // Try two different parsers to handle different RFID reader formats
  // 1. Standard readline parser (for text output with newlines)
  readlineParser = new ReadlineParser({ delimiter: '\r\n' });
  port.pipe(readlineParser);
  
  // 2. Special delimiter parser to catch other formats (for binary data)
  delimiterParser = new DelimiterParser({ delimiter: Buffer.from([0x03]) }); // ETX character
  port.pipe(delimiterParser);
  
  // Handle data from readline parser (text format)
  readlineParser.on('data', (line) => {
    handleRawData(line, 'text');
  });
  
  // Handle data from delimiter parser (potentially binary format)
  delimiterParser.on('data', (data) => {
    // Convert buffer to hex string
    const hexString = data.toString('hex').toUpperCase();
    handleRawData(hexString, 'binary');
  });
  
  // Also listen for raw data on the port
  port.on('data', (data) => {
    // This is a fallback in case the parsers don't catch something
    const rawHex = data.toString('hex').toUpperCase();
    handleRawData(rawHex, 'raw');
  });
  
  // Handle errors
  port.on('error', (err) => {
    console.error('Serial port error:', err.message);
  });
}

// Unified handler for data from any source
function handleRawData(data, source) {
  // Log raw data for debugging
  console.log(`[${source}] Raw data from RFID reader:`, data);
  
  const cardUID = parseCardUID(data);
  if (cardUID) {
    // Create a prominent display in the console
    console.log('\n==================================');
    console.log(`CARD SCANNED: ${cardUID}`);
    console.log(`SOURCE: ${source}`);
    console.log(`TIME: ${new Date().toLocaleTimeString()}`);
    console.log('==================================\n');
    
    // Store the last card scan for retrieval by Next.js
    lastCardScan = {
      cardUID,
      timestamp: new Date().toISOString(),
      source
    };
  }
}

// Keep track of the most recent card scan
let lastCardScan = null;

// Helper function to parse the card UID from the raw serial data
function parseCardUID(rawData) {
  try {
    // Clean the input data
    const cleanData = rawData.trim();
    
    // Common format patterns for RFID card data
    // 1. Just the UID (e.g., "23DF3F2A" or "23 DF 3F 2A")
    // 2. With prefix: "Card UID: 23DF3F2A"
    // 3. JSON format: {"uid":"23DF3F2A"}
    // 4. HEX format: "0x23 0xDF 0x3F 0x2A"
    
    // Try to extract the UID based on common patterns
    let uid = null;
    
    // Check if it's JSON format
    if (cleanData.startsWith('{') && cleanData.endsWith('}')) {
      try {
        const jsonData = JSON.parse(cleanData);
        if (jsonData.uid || jsonData.cardUID || jsonData.id) {
          uid = jsonData.uid || jsonData.cardUID || jsonData.id;
        }
      } catch (e) {
        // Not valid JSON, continue with other methods
      }
    }
    
    // Check if it contains "UID:" or "Card:" or similar prefixes
    if (!uid && /uid|card|tag/i.test(cleanData)) {
      // Extract anything that looks like a hex string after common prefixes
      const match = cleanData.match(/(?:uid|card|tag|id)[^A-Fa-f0-9]*((?:[A-Fa-f0-9]{2}[\s:-]?){4,})/i);
      if (match && match[1]) {
        uid = match[1];
      }
    }
    
    // If still no UID found, and the string contains mostly hex characters, use that
    if (!uid) {
      // Remove any 0x prefixes
      const noHexPrefix = cleanData.replace(/0x/gi, '');
      
      // If it's mostly hex characters (allowing for spaces, colons, etc.)
      if (/^[A-Fa-f0-9\s:-]+$/.test(noHexPrefix) && 
          noHexPrefix.replace(/[\s:-]/g, '').length >= 4) {
        uid = noHexPrefix;
      } else {
        // Last resort, just use the raw data
        uid = cleanData;
      }
    }
    
    // Clean up the UID - remove spaces, colons, etc. and convert to uppercase
    const formattedUID = uid
      .replace(/[^A-Fa-f0-9]/g, ' ')  // Replace non-hex chars with spaces
      .replace(/\s+/g, ' ')           // Consolidate spaces
      .trim()
      .toUpperCase();
    
    return formattedUID;
  } catch (err) {
    console.error('Error parsing card UID:', err.message);
    return null;
  }
}

// Try a range of ports if the default is busy
let currentPort = API_PORT;
const MAX_PORT_ATTEMPTS = 10;

// Create a simple HTTP server to communicate with the Next.js app
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS requests (for CORS)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  
  // Route to get the last card scan
  if (req.method === 'GET' && req.url === '/api/last-card') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ 
      success: true, 
      data: lastCardScan || { message: 'No card scanned yet' } 
    }));
    return;
  }
  
  // Route to simulate a card scan (useful for testing without hardware)
  if (req.method === 'POST' && req.url === '/api/simulate-scan') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { cardUID } = JSON.parse(body);
        if (!cardUID) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: 'cardUID is required' }));
          return;
        }
        
        // Update the last card scan
        lastCardScan = {
          cardUID,
          timestamp: new Date().toISOString(),
          simulated: true
        };
        
        console.log(`Simulated card scan: ${cardUID}`);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: 'Card scan simulated' }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }
  
  // Route to listen for card scans using Server-Sent Events
  if (req.method === 'GET' && req.url === '/api/listen') {
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send a connection established event
    res.write('event: connected\ndata: {"status":"waiting_for_card"}\n\n');
    
    // Keep track of the last card scan we sent to this client
    let lastSentScan = null;
    
    // Function to check for new card scans
    const checkForCardScan = () => {
      if (lastCardScan && (!lastSentScan || lastCardScan.timestamp !== lastSentScan.timestamp)) {
        // New card scan detected, send it to the client
        res.write(`event: card\ndata: ${JSON.stringify(lastCardScan)}\n\n`);
        lastSentScan = { ...lastCardScan };
      }
    };
    
    // Check for card scans every 100ms
    const intervalId = setInterval(checkForCardScan, 100);
    
    // Handle client disconnect
    req.on('close', () => {
      clearInterval(intervalId);
      console.log('Client disconnected from SSE');
    });
    
    return;
  }
  
  // Default route
  res.statusCode = 404;
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
});

// Function to start the server with port fallback
function startServer(port, attempt = 1) {
  if (attempt > MAX_PORT_ATTEMPTS) {
    console.error('Failed to find an available port after multiple attempts');
    process.exit(1);
  }
  
  // Try to start the server
  server.listen(port)
    .on('listening', () => {
      console.log(`RFID Bridge Server running at http://localhost:${port}`);
      console.log('Available endpoints:');
      console.log(`- GET http://localhost:${port}/api/last-card - Get the most recent card scan`);
      console.log(`- GET http://localhost:${port}/api/listen - Listen for card scans using SSE`);
      console.log(`- POST http://localhost:${port}/api/simulate-scan - Simulate a card scan`);
      
      // Save the actual port used to a file for the Next.js app to read
      const configData = { port: port };
      // Save to root directory
      fs.writeFileSync('./rfid-bridge-config.json', JSON.stringify(configData), 'utf8');
      // Also save to public directory for the Next.js app to access
      try {
        if (!fs.existsSync('./public')) {
          fs.mkdirSync('./public', { recursive: true });
        }
        fs.writeFileSync('./public/rfid-bridge-config.json', JSON.stringify(configData), 'utf8');
        console.log(`Port configuration saved to public/rfid-bridge-config.json`);
      } catch (err) {
        console.warn(`Could not save config to public directory: ${err.message}`);
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

// Start the server with the initial port
startServer(currentPort);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down RFID reader service...');
  if (port) {
    port.close();
  }
  server.close();
  process.exit(0);
});
