// Create a buffer to store partial data
let dataBuffer = '';

// Process raw data from RFID reader
port.on('data', (data) => {
  // Add incoming data to buffer
  dataBuffer += data.toString();
  
  // Check if we have a complete card read (format: "Card UID: 23 DF 3F 2A")
  const cardRegex = /Card UID:\s+([0-9A-F\s]+)/i;
  const match = cardRegex.exec(dataBuffer);
  
  if (match) {
    // Extract the card ID (the space-separated hex values)
    const cardHexValues = match[1].trim();
    
    // Remove spaces to get a clean ID
    const cardID = cardHexValues.replace(/\s+/g, '');
    
    // Generate a formatted card ID that's readable
    const formattedCardID = cardHexValues.replace(/\s+/g, ':');
    
    // Store and log the card scan
    lastCardScan = {
      cardUID: cardID,          // Clean ID without spaces (e.g., "23DF3F2A")
      formattedUID: formattedCardID, // Formatted with colons (e.g., "23:DF:3F:2A")
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
    
    // Clear the buffer for the next read
    dataBuffer = '';
  }
  
  // Clear buffer if it gets too large (prevent memory leaks)
  if (dataBuffer.length > 1000) {
    dataBuffer = dataBuffer.substring(dataBuffer.length - 500);
  }
});// Script to reset the database and reinitialize it
import * as fs from 'fs';
import * as path from 'path';
import { initDb } from '../lib/db/server-db';

const DB_PATH = path.join(process.cwd(), 'local-data', 'access.db');

console.log('Checking for database at:', DB_PATH);

// Delete the existing database if it exists
if (fs.existsSync(DB_PATH)) {
  console.log('Database found, deleting...');
  fs.unlinkSync(DB_PATH);
  console.log('Database deleted successfully.');
} else {
  console.log('No existing database found.');
}

// Create directory if it doesn't exist
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  console.log(`Creating directory: ${dir}`);
  fs.mkdirSync(dir, { recursive: true });
}

// Initialize the database
console.log('Initializing new database...');
initDb().then(() => {
  console.log('Database initialized successfully with:');
  console.log('- Demo user (DEMO0001) with PIN 1234');
  console.log('- Admin user (ADMIN0001) with PIN 9999');
  console.log('Done!');
}).catch(err => {
  console.error('Error initializing database:', err);
});
