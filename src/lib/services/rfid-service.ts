'use server';

import { getDbInstance } from '../db/server-db';

// Types
export type CardUID = string;

export interface RFIDEvent {
  cardUID: CardUID;
  timestamp: Date;
}

export interface SerialConfig {
  baudRate: number;
  devicePath: string;
}

// Constants
const DEFAULT_BAUD_RATE = 115200;

// Platform-specific device path helpers
const getWindowsDevicePath = async (): Promise<string | null> => {
  try {
    // Dynamically import SerialPort to avoid client-side loading
    const { SerialPort } = await import('serialport');
    // Using the static list method of SerialPort
    const ports = await SerialPort.list();
    // Look for Arduino/ESP32 device - typically has "USB" and "CH340" or "CP210x" in the description
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
};

const getLinuxDevicePath = async (): Promise<string | null> => {
  try {
    // Dynamically import fs to avoid client-side loading
    const fs = await import('fs');
    // On Raspberry Pi, ESP32 typically appears as /dev/ttyUSB0 or /dev/ttyACM0
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
};

// Auto-detect device path based on platform
export const getDefaultDevicePath = async (): Promise<string | null> => {
  try {
    // Dynamically import os module
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
};

// Main RFID service class
export class RFIDService {
  private port: any = null; // SerialPort | null
  private parser: any = null; // ReadlineParser | null
  private isSimulated: boolean = false;
  private listeners: ((event: RFIDEvent) => void)[] = [];
  private devicePath: string | null = null;
  private baudRate: number;
  private isConnected: boolean = false;
  
  constructor(config?: Partial<SerialConfig>) {
    this.baudRate = config?.baudRate || DEFAULT_BAUD_RATE;
    this.devicePath = config?.devicePath || null;
  }
  
  // Initialize the RFID service
  async initialize(): Promise<boolean> {
    // If we're in a development environment and can't find a real device,
    // default to simulation mode
    if (!this.devicePath) {
      this.devicePath = await getDefaultDevicePath();
      
      if (!this.devicePath) {
        console.warn('No RFID reader detected. Falling back to simulation mode.');
        this.isSimulated = true;
        return true;
      }
    }
    
    if (this.isSimulated) {
      console.log('RFID service running in simulation mode');
      return true;
    }
    
    try {
      // Dynamically import required modules
      const { SerialPort } = await import('serialport');
      const { ReadlineParser } = await import('@serialport/parser-readline');
      
      // Create SerialPort instance with the correct API for v10+
      this.port = new SerialPort({
        path: this.devicePath as string,
        baudRate: this.baudRate
      });
      
      // Create and pipe the parser
      this.parser = new ReadlineParser({ delimiter: '\r\n' });
      this.port.pipe(this.parser as any);
      
      this.port.on('open', () => {
        console.log(`Connected to RFID reader at ${this.devicePath}`);
        this.isConnected = true;
      });
      
      this.port.on('error', (err: Error) => {
        console.error('Serial port error:', err);
        this.isConnected = false;
      });
      
      this.parser.on('data', (data: string) => this.handleSerialData(data));
      
      return true;
    } catch (error) {
      console.error('Failed to initialize RFID service:', error);
      // Fall back to simulation if we can't connect
      this.isSimulated = true;
      return false;
    }
  }
  
  // Process incoming serial data
  private handleSerialData(data: string) {
    console.log('RFID Raw data received:', data);
    
    // ESP32 RC522 typically sends "Card UID: XX XX XX XX" in hex format
    const uidMatch = data.match(/Card UID:\s+([0-9A-Fa-f\s]+)/i);
    
    if (uidMatch && uidMatch[1]) {
      // Format the hex values properly and convert to uppercase
      const cardUID = uidMatch[1].trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();
      
      console.log('Parsed Card UID:', cardUID);
      this.processCardRead(cardUID);
    }
  }
  
  // Process a card reading
  private async processCardRead(cardUID: string) {
    const event: RFIDEvent = {
      cardUID,
      timestamp: new Date()
    };
    
    // Log the card read to the database
    try {
      const db = await getDbInstance();
      // Check if this card is registered
      const profile = db.prepare('SELECT * FROM access_profiles WHERE card_uid = ?').get(cardUID);
      
      // Log the access attempt regardless of success
      db.prepare(`
        INSERT INTO access_logs (profile_id, card_uid, method, result)
        VALUES (?, ?, ?, ?)
      `).run(
        profile?.id || null,
        cardUID,
        'rfid',
        profile ? 'success' : 'unknown_card'
      );
      
      // If this is a known card, update last_access time
      if (profile) {
        db.prepare('UPDATE access_profiles SET last_access = CURRENT_TIMESTAMP WHERE id = ?')
          .run(profile.id);
      }
    } catch (error) {
      console.error('Error logging card read:', error);
    }
    
    // Notify all listeners
    this.listeners.forEach(listener => listener(event));
  }
  
  // Add an event listener for card readings
  addEventListener(callback: (event: RFIDEvent) => void) {
    this.listeners.push(callback);
  }
  
  // Remove an event listener
  removeEventListener(callback: (event: RFIDEvent) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }
  
  // Check if a card UID is registered
  async isCardRegistered(cardUID: string): Promise<boolean> {
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
  async registerCard(cardUID: string, accessLevel: 'user' | 'admin' = 'user', pin?: string): Promise<boolean> {
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
  simulateCardScan(cardUID: string) {
    if (!this.isSimulated && this.isConnected) {
      console.warn('Cannot simulate card scan when connected to a real device');
      return;
    }
    
    console.log(`[SIMULATION] Card scanned: ${cardUID}`);
    this.processCardRead(cardUID);
  }
  
  // Clean up resources when done
  close() {
    if (this.port && this.port.isOpen) {
      this.port.close();
    }
    this.listeners = [];
    this.isConnected = false;
  }
}

// Singleton instance for the application
let rfidServiceInstance: RFIDService | null = null;

// Get or create the RFID service instance
export async function getRFIDService(): Promise<RFIDService> {
  if (!rfidServiceInstance) {
    rfidServiceInstance = new RFIDService();
    await rfidServiceInstance.initialize();
  }
  return rfidServiceInstance;
}
