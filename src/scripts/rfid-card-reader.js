// RFID Card Reader for the DREW vending machine project
// This script is designed to extract card IDs from raw RFID reader data

const SerialPort = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// Configuration
const PORT = 'COM7';
const BAUD_RATE = 9600;

console.log(`Starting RFID card reader on ${PORT} at ${BAUD_RATE} baud...`);

// Data buffer to collect bytes
let dataBuffer = [];
let lastDataTime = 0;
const BUFFER_TIMEOUT = 500; // ms to consider a complete card read

// Create serial port connection
let port;
try {
  // Determine which SerialPort API to use
  if (typeof SerialPort === 'function') {
    port = new SerialPort(PORT, { baudRate: BAUD_RATE });
  } else if (SerialPort.SerialPort) {
    const { SerialPort: SP } = SerialPort;
    port = new SP({ path: PORT, baudRate: BAUD_RATE });
  } else {
    throw new Error('Unknown SerialPort API format');
  }
  
  console.log('Serial port opened successfully');
  
  // Process raw data
  port.on('data', (data) => {
    const now = Date.now();
    
    // If there's been a long gap, start a new buffer
    if (now - lastDataTime > BUFFER_TIMEOUT && dataBuffer.length > 0) {
      processCompleteBuffer();
      dataBuffer = [];
    }
    
    // Add new data to buffer
    for (const byte of data) {
      dataBuffer.push(byte);
    }
    
    lastDataTime = now;
    
    // If we have enough data, process it
    if (dataBuffer.length > 10) {
      processCompleteBuffer();
      dataBuffer = [];
    }
  });
  
  // Function to process a complete data buffer
  function processCompleteBuffer() {
    if (dataBuffer.length === 0) return;
    
    // Convert buffer to hex string
    const hexData = Array.from(dataBuffer)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    
    console.log('\n--- CARD DATA ---');
    console.log('Raw hex:', hexData);
    
    // Different RFID reader formats
    
    // 1. Look for Wiegand 26-bit format (common in many readers)
    const wiegandPattern = /FF FF FF FF FF FF FF FF FF FF/i;
    if (wiegandPattern.test(hexData)) {
      // This looks like a card read with leading FFs (common pattern)
      // The actual ID is often after the FF sequence
      const nonFFIndex = dataBuffer.findIndex(b => b !== 0xFF);
      if (nonFFIndex !== -1) {
        const potentialID = dataBuffer.slice(nonFFIndex);
        const idHex = Array.from(potentialID)
          .map(b => b.toString(16).padStart(2, '0').toUpperCase())
          .join(' ');
          
        console.log('Potential Card ID (hex):', idHex);
        console.log('Potential Card ID (decimal):', parseInt(idHex.replace(/\\s/g, ''), 16));
      }
    }
    
    // 2. Try to extract common formats
    // Remove all FF bytes (often used as fillers or headers)
    const nonFFBytes = dataBuffer.filter(b => b !== 0xFF);
    if (nonFFBytes.length > 0) {
      const cleanHex = Array.from(nonFFBytes)
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      
      console.log('Filtered Card ID (hex):', cleanHex);
      
      // If it's just a few bytes, it might be the actual ID
      if (nonFFBytes.length <= 5) {
        const simpleID = Array.from(nonFFBytes)
          .map(b => b.toString(16).padStart(2, '0').toUpperCase())
          .join('');
        console.log('Simple Card ID:', simpleID);
      }
    }
    
    // 3. Try interpreting as ASCII
    try {
      const asciiData = Buffer.from(dataBuffer).toString().replace(/[^\\x20-\\x7E]/g, '');
      if (asciiData.length > 0) {
        console.log('ASCII interpretation:', asciiData);
      }
    } catch (e) {}
    
    // 4. For your specific reader pattern (based on your data)
    // The pattern seems to be FF FF FF... followed by a value (A6 in your case)
    if (dataBuffer.length > 0 && dataBuffer[dataBuffer.length - 1] !== 0xFF) {
      const lastByte = dataBuffer[dataBuffer.length - 1];
      console.log(`Last byte (potential card identifier): ${lastByte.toString(16).toUpperCase()}`);
    }
    
    console.log('---------------');
  }
  
  // Handle errors and connection events
  port.on('error', (err) => {
    console.error('Serial port error:', err.message);
  });
  
  port.on('open', () => {
    console.log('Port opened and ready to receive card scans');
  });
  
  port.on('close', () => {
    console.log('Port closed');
  });
  
} catch (err) {
  console.error('Failed to open serial port:', err.message);
  process.exit(1);
}

// Periodically process any remaining data in buffer
setInterval(() => {
  const now = Date.now();
  if (dataBuffer.length > 0 && now - lastDataTime > BUFFER_TIMEOUT) {
    processCompleteBuffer();
    dataBuffer = [];
  }
}, BUFFER_TIMEOUT);

// Handle script exit
process.on('SIGINT', () => {
  console.log('Closing serial port...');
  if (port) {
    port.close();
  }
  process.exit(0);
});

console.log('RFID Card Reader is running. Scan a card to see the extracted ID.');
console.log('Press Ctrl+C to exit');
