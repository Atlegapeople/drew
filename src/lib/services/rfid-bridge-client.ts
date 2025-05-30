'use client';

import { toast } from 'sonner';

// Dynamic configuration with fallback
let BRIDGE_URL = process.env.NEXT_PUBLIC_RFID_BRIDGE_URL || 'http://localhost:3333';

// Try to load port from configuration file (this runs only on the client)
if (typeof window !== 'undefined') {
  try {
    // Use a dynamic import for the config file
    fetch('/rfid-bridge-config.json')
      .then(response => {
        if (response.ok) return response.json();
        throw new Error('Failed to load RFID bridge config');
      })
      .then(config => {
        if (config && config.port) {
          BRIDGE_URL = `http://localhost:${config.port}`;
          console.log(`RFID bridge URL set to ${BRIDGE_URL} from config`);
        }
      })
      .catch(err => {
        console.warn('Could not load RFID bridge config, using default:', err);
      });
  } catch (err) {
    console.warn('Error loading RFID bridge config:', err);
  }
}

// Types
export type CardUID = string;

export interface RFIDEvent {
  cardUID: CardUID;
  timestamp: string;
  simulated?: boolean;
}

export type CardEventListener = (event: RFIDEvent) => void;

// RFID Bridge Client
class RFIDBridgeClient {
  private listeners: CardEventListener[] = [];
  private eventSource: EventSource | null = null;
  private isListening = false;

  // Start listening for card scans
  async startListening(): Promise<boolean> {
    if (this.isListening) {
      console.log('Already listening for card scans');
      return true;
    }

    try {
      console.log(`Connecting to RFID bridge at ${BRIDGE_URL}/api/listen`);
      
      this.eventSource = new EventSource(`${BRIDGE_URL}/api/listen`);
      this.isListening = true;
      
      // Connection established
      this.eventSource.addEventListener('connected', (event) => {
        console.log('Connected to RFID bridge server');
      });
      
      // Card scan event
      this.eventSource.addEventListener('card', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Card scan received from bridge:', data);
          
          // Notify all listeners
          this.notifyListeners({
            cardUID: data.cardUID,
            timestamp: data.timestamp,
            simulated: data.simulated
          });
        } catch (err) {
          console.error('Error processing card event:', err);
        }
      });
      
      // Handle errors
      this.eventSource.onerror = (error) => {
        console.error('Error with RFID bridge EventSource:', error);
        this.stopListening();
        
        // Try to reconnect after a delay
        setTimeout(() => {
          this.startListening();
        }, 5000);
      };
      
      return true;
    } catch (error) {
      console.error('Failed to connect to RFID bridge:', error);
      this.isListening = false;
      this.eventSource = null;
      return false;
    }
  }
  
  // Stop listening for card scans
  stopListening(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isListening = false;
    console.log('Stopped listening for card scans');
  }
  
  // Add a listener for card events
  addEventListener(callback: CardEventListener): void {
    this.listeners.push(callback);
    console.log(`Added card event listener, total: ${this.listeners.length}`);
    
    // Start listening if this is the first listener
    if (this.listeners.length === 1 && !this.isListening) {
      this.startListening();
    }
  }
  
  // Remove a listener
  removeEventListener(callback: CardEventListener): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
    console.log(`Removed card event listener, remaining: ${this.listeners.length}`);
    
    // Stop listening if there are no more listeners
    if (this.listeners.length === 0 && this.isListening) {
      this.stopListening();
    }
  }
  
  // Notify all listeners of a card event
  private notifyListeners(event: RFIDEvent): void {
    console.log(`Notifying ${this.listeners.length} listeners of card event:`, event);
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in card event listener:', err);
      }
    });
  }
  
  // Simulate a card scan (for testing)
  async simulateCardScan(cardUID: string): Promise<boolean> {
    try {
      const response = await fetch(`${BRIDGE_URL}/api/simulate-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cardUID }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to simulate card scan');
      }
      
      console.log('Card scan simulated:', data);
      return true;
    } catch (error) {
      console.error('Error simulating card scan:', error);
      return false;
    }
  }
  
  // Get the last card scan
  async getLastCardScan(): Promise<RFIDEvent | null> {
    try {
      const response = await fetch(`${BRIDGE_URL}/api/last-card`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get last card scan');
      }
      
      return data.data.cardUID ? data.data : null;
    } catch (error) {
      console.error('Error getting last card scan:', error);
      return null;
    }
  }
}

// Singleton instance
const rfidBridge = new RFIDBridgeClient();

export default rfidBridge;
