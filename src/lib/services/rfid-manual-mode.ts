'use server';

import { getDbInstance } from '../db/server-db';

// Types
export type CardUID = string;

export interface RFIDEvent {
  cardUID: CardUID;
  timestamp: Date;
}

// State for the manual RFID service
let listeners: ((event: RFIDEvent) => void)[] = [];
let isInitialized = false;

// Add an event listener for card readings
export async function addEventListener(callback: (event: RFIDEvent) => void) {
  listeners.push(callback);
  console.log(`Added event listener, total listeners: ${listeners.length}`);
}

// Remove an event listener
export async function removeEventListener(callback: (event: RFIDEvent) => void) {
  listeners = listeners.filter(listener => listener !== callback);
  console.log(`Removed event listener, remaining listeners: ${listeners.length}`);
}

// Process a card reading
export async function processCardRead(cardUID: string) {
  console.log(`Manual mode: Processing card read for UID: ${cardUID}`);
  
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
  console.log(`Notifying ${listeners.length} listeners`);
  // Create a copy of the listeners array to allow for listeners to remove themselves during iteration
  const currentListeners = [...listeners];
  
  // For each listener, call it and if it throws an error about closed streams,
  // remove it from the listeners array
  for (const listener of currentListeners) {
    try {
      await listener(event);
    } catch (err) {
      console.error('Error in listener:', err);
      // If this is a closed stream error, automatically remove this listener
      if (err instanceof TypeError && 
          (err.message.includes('WritableStream is closed') || 
           err.message.includes('Invalid state'))) {
        console.log('Removing listener with closed stream');
        // Remove the problematic listener
        listeners = listeners.filter(l => l !== listener);
      }
    }
  }
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

// Simulate a card scan - this will be our main method since we can't use the actual serial port
export async function simulateCardScan(cardUID: string) {
  console.log(`Manual mode: Simulating card scan with UID: ${cardUID}`);
  await processCardRead(cardUID);
}

// Clean up resources when done
export async function close() {
  listeners = [];
}

// Initialize the service (simplified in manual mode)
export async function initialize(): Promise<boolean> {
  console.log('Initializing RFID service in manual mode (no direct serial port access)');
  isInitialized = true;
  return true;
}

// Get or initialize the RFID service
export async function getRFIDService() {
  if (!isInitialized) {
    await initialize();
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
