'use server';

import { getDbInstance } from '../db/server-db';

// Types
export type CardUID = string;

export interface RFIDEvent {
  cardUID: CardUID;
  timestamp: Date;
}

// Constants
const DEFAULT_BAUD_RATE = 115200;

// State for the RFID service
let port: any = null;
let parser: any = null;
let isSimulated = false;
let isConnected = false;
let devicePath: string | null = null;
let baudRate = DEFAULT_BAUD_RATE;
let listeners: ((event: RFIDEvent) => void)[] = [];

// Get Windows device path
export async function getWindowsDevicePath(): Promise<string | null> {
  try {
    // Dynamically import SerialPort to avoid client-side loading
    const { SerialPort } = await import('serialport');
    
    // List all available serial ports
    const ports = await SerialPort.list();
    
    // Look for Arduino/ESP32 device 
    const espPort = ports.find(port => 
      (port.manufacturer?.includes('Arduino') || 
       port.manufacturer?.includes('Espressif') ||
       port.pnpId?.includes('USB') ||
       port.path.includes('COM'))
    );
    
    return espPort?.path || null;
  } catch (error) {
    console.error('Error listing serial ports:', error);
    return null;
  }
}

// Get Linux device path
export async function getLinuxDevicePath(): Promise<string | null> {
  try {
    // Dynamically import fs
    const fs = await import('fs');
    
    // Common paths for serial devices on Linux/Raspberry Pi
    const possiblePaths = ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyACM0', '/dev/ttyACM1'];
    
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking Linux device paths:', error);
    return null;
  }
}

// Auto-detect device path based on platform
export async function getDefaultDevicePath(): Promise<string | null> {
  try {
    // Dynamically import os
    const os = await import('os');
    const platform = os.platform();
    
    // Force COM7 for Windows as requested
    if (platform === 'win32') {
      console.log('Using COM7 for RFID reader');
      return 'COM7';
    } else if (platform === 'linux') {
      return getLinuxDevicePath();
    } else {
      console.warn(`Platform ${platform} not explicitly supported. Using COM7.`);
      return 'COM7';
    }
  } catch (error) {
    console.error('Error detecting platform:', error);
    // Default to COM7 as fallback
    return 'COM7';
  }
}

// Process serial data received from RFID reader
function handleSerialData(data: string) {
  console.log('RFID Raw data received:', data);
  
  // Match the card UID format from your ESP32 code
  // Using a more flexible regex to match the output from your ESP32
  // It looks for "Card UID:" followed by any combination of hex digits and spaces
  const uidMatch = data.match(/Card UID: ([0-9A-Fa-f\s]+)/i);
  
  if (uidMatch && uidMatch[1]) {
    // Format and normalize the card UID
    const cardUID = uidMatch[1].trim().toUpperCase();
    
    console.log('Parsed Card UID:', cardUID);
    processCardRead(cardUID);
  } else {
    // Log when we receive data that doesn't match the expected format
    console.log('Received data did not match UID format:', data);
  }
}

// Process a card reading
async function processCardRead(cardUID: string) {
  const event: RFIDEvent = {
    cardUID,
    timestamp: new Date()
  };
  
  // Log the card read to the database
  try {
    const db = await getDbInstance();
    
    // Check if this card is registered
    const profile = db.prepare('SELECT * FROM access_profiles WHERE card_uid = ?').get(cardUID);
    
    // Log the access attempt
    db.prepare(`
      INSERT INTO access_logs (profile_id, card_uid, method, result)
      VALUES (?, ?, ?, ?)
    `).run(
      profile?.id || null,
      cardUID,
      'rfid',
      profile ? 'success' : 'unknown_card'
    );
    
    // Update last_access time if known card
    if (profile) {
      db.prepare('UPDATE access_profiles SET last_access = CURRENT_TIMESTAMP WHERE id = ?')
        .run(profile.id);
    }
  } catch (error) {
    console.error('Error logging card read:', error);
  }
  
  // Notify all listeners
  listeners.forEach(listener => listener(event));
}

// Initialize the RFID service
export async function initialize(customBaudRate?: number, customDevicePath?: string): Promise<boolean> {
  // Set configuration
  baudRate = customBaudRate || DEFAULT_BAUD_RATE;
  
  // Always use COM7 as specifically requested
  devicePath = 'COM7';
  console.log(`Using specific port ${devicePath} for RFID reader`);
  
  try {
    // If we already have a port connected, close it first
    if (port && typeof port.close === 'function') {
      try {
        port.close();
        console.log('Closed existing serial port connection');
      } catch (err) {
        console.warn('Error closing existing port:', err);
      }
    }
    
    // Dynamically import required modules
    const { SerialPort } = await import('serialport');
    const { ReadlineParser } = await import('@serialport/parser-readline');
    
    // Create SerialPort instance with explicit settings
    console.log(`Opening serial port ${devicePath} at ${baudRate} baud`);
    port = new SerialPort({
      path: devicePath,
      baudRate: baudRate,
      autoOpen: true
    });
    
    // Create and pipe the parser
    parser = new ReadlineParser({ delimiter: '\r\n' });
    port.pipe(parser);
    
    // Set up event handlers
    port.on('open', () => {
      console.log(`SUCCESS: Connected to RFID reader at ${devicePath}`);
      isConnected = true;
    });
    
    port.on('error', (err: Error) => {
      console.error('Serial port error:', err);
      isConnected = false;
      isSimulated = true; // Fall back to simulation mode on error
    });
    
    port.on('close', () => {
      console.log('Serial port connection closed');
      isConnected = false;
    });
    
    // Set up the data handler with explicit logging
    parser.on('data', (data: string) => {
      console.log('Raw serial data received:', data);
      handleSerialData(data);
    });
    
    console.log('RFID service initialization complete, waiting for card scans...');
    return true;
  } catch (error) {
    console.error('Failed to initialize RFID service:', error);
    // Fall back to simulation if we can't connect
    isSimulated = true;
    return false;
  }
}

// Add an event listener for card readings
export async function addEventListener(callback: (event: RFIDEvent) => void) {
  listeners.push(callback);
}

// Remove an event listener
export async function removeEventListener(callback: (event: RFIDEvent) => void) {
  listeners = listeners.filter(listener => listener !== callback);
}

// Check if a card UID is registered
export async function isCardRegistered(cardUID: string): Promise<boolean> {
  try {
    const db = await getDbInstance();
    const profile = db.prepare('SELECT id FROM access_profiles WHERE card_uid = ?').get(cardUID);
    return !!profile;
  } catch (error) {
    console.error('Error checking card registration:', error);
    return false;
  }
}

// Register a new card
export async function registerCard(
  cardUID: string, 
  accessLevel: 'user' | 'admin' = 'user', 
  pin?: string
): Promise<boolean> {
  try {
    const db = await getDbInstance();
    
    // Check if card is already registered
    const existing = db.prepare('SELECT id FROM access_profiles WHERE card_uid = ?').get(cardUID);
    if (existing) {
      console.warn(`Card ${cardUID} is already registered`);
      return false;
    }
    
    // If PIN is provided, hash it
    let pinHash = null;
    let pinSalt = null;
    
    if (pin) {
      // Import these within the function to avoid circular dependencies
      const { hashPin } = await import('../db/server-db');
      const crypto = await import('crypto');
      pinSalt = crypto.randomBytes(16).toString('hex');
      pinHash = await hashPin(pin, pinSalt);
    }
    
    // Add new card to database
    db.prepare(`
      INSERT INTO access_profiles (card_uid, pin_hash, pin_salt, access_level)
      VALUES (?, ?, ?, ?)
    `).run(cardUID, pinHash, pinSalt, accessLevel);
    
    return true;
  } catch (error) {
    console.error('Error registering card:', error);
    return false;
  }
}

// Simulate a card scan (for development/testing)
export async function simulateCardScan(cardUID: string) {
  if (!isSimulated && isConnected) {
    console.warn('Cannot simulate card scan when connected to a real device');
    return;
  }
  
  console.log(`[SIMULATION] Card scanned: ${cardUID}`);
  await processCardRead(cardUID);
}

// Clean up resources when done
export async function close() {
  if (port && port.isOpen) {
    port.close();
  }
  listeners = [];
  isConnected = false;
}

// Initialize the service when this module is first imported
let isInitialized = false;

// Get or initialize the RFID service
export async function getRFIDService() {
  if (!isInitialized) {
    await initialize();
    isInitialized = true;
  }
  
  // Return a set of functions that can be used to interact with the service
  return {
    addEventListener,
    removeEventListener,
    isCardRegistered,
    registerCard,
    simulateCardScan,
    close
  };
}
