// Simple RFID Reader Script for the DREW vending machine project
// This script focuses solely on reading RFID cards from COM7

const SerialPort = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// Configuration - using COM7 for your RFID reader
const PORT = 'COM7';
const BAUD_RATE = 9600;

console.log(`Starting simple RFID reader on ${PORT} at ${BAUD_RATE} baud...`);

// Create serial port connection
let port;
try {
  // Determine which SerialPort API to use
  if (typeof SerialPort === 'function') {
    // For SerialPort v9 and earlier
    port = new SerialPort(PORT, { baudRate: BAUD_RATE });
  } else if (SerialPort.SerialPort) {
    // For SerialPort v10+
    const { SerialPort: SP } = SerialPort;
    port = new SP({ path: PORT, baudRate: BAUD_RATE });
  } else {
    throw new Error('Unknown SerialPort API format');
  }
  
  console.log('Serial port opened successfully');
  
  // Listen for raw data directly
  port.on('data', (data) => {
    // Convert to various formats to help debug
    const rawHex = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    const rawText = data.toString().trim();
    
    console.log('\n--- RAW DATA RECEIVED ---');
    console.log('Text:', rawText);
    console.log('Hex :', rawHex);
    console.log('-------------------------\n');
  });
  
  // Also try a parser for more formatted data
  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
  parser.on('data', (line) => {
    console.log('\n=== PARSED DATA ===');
    console.log(line);
    console.log('===================\n');
    
    // Try to extract card ID
    try {
      // Clean the input data
      const formattedData = line.trim().replace(/\s+/g, ' ').toUpperCase();
      console.log('POSSIBLE CARD ID:', formattedData);
    } catch (e) {
      // Just log errors but don't crash
      console.error('Error processing data:', e.message);
    }
  });
  
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

// Handle script exit
process.on('SIGINT', () => {
  console.log('Closing serial port...');
  if (port) {
    port.close();
  }
  process.exit(0);
});

console.log('RFID Reader is running. Scan a card to see the output.');
console.log('Press Ctrl+C to exit');
