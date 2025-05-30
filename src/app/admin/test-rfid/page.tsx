'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import rfidBridge, { RFIDEvent } from '@/lib/services/rfid-bridge-client';

export default function TestRFIDPage() {
  const [cardUID, setCardUID] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [waitingForScan, setWaitingForScan] = useState(false);
  const [lastScannedCard, setLastScannedCard] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Sample UIDs from the serial monitor
  const sampleUIDs = [
    '23 DF 3F 2A',
    '23 DE 3F 2A'
  ];

  // Toggle waiting for scan mode
  const toggleWaitForScan = () => {
    if (waitingForScan) {
      // Stop listening for card scans
      rfidBridge.removeEventListener(cardEventHandler);
      setWaitingForScan(false);
      return;
    }
    
    setWaitingForScan(true);
    setLastScannedCard(null);
    
    try {
      // Start listening for card scans using the RFID bridge
      rfidBridge.addEventListener(cardEventHandler);
      toast.info('Waiting for card scan...');
    } catch (error) {
      console.error('Error setting up card scan listener:', error);
      toast.error('Failed to connect to RFID reader');
      setStatus('error');
      setMessage('Failed to connect to RFID reader');
      setWaitingForScan(false);
    }
  };
  
  // Handle card events from the RFID bridge
  const cardEventHandler = (event: RFIDEvent) => {
    console.log('Card detected:', event);
    
    setLastScannedCard(event.cardUID);
    setCardUID(event.cardUID);
    setStatus('success');
    setMessage(`Card detected: ${event.cardUID}${event.simulated ? ' (Simulated)' : ''}`);
    toast.success(`Card detected: ${event.cardUID}`);
    
    // Stop listening after successful scan
    rfidBridge.removeEventListener(cardEventHandler);
    setWaitingForScan(false);
  };
  
  // Clean up listeners when component unmounts
  useEffect(() => {
    return () => {
      if (waitingForScan) {
        rfidBridge.removeEventListener(cardEventHandler);
      }
    };
  }, [waitingForScan]);

  const simulateCardScan = async (uid: string) => {
    // If we're not already listening for a card, start listening first
    if (!waitingForScan) {
      toggleWaitForScan();
      
      // Small delay to ensure connection is established
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setStatus('loading');
    setMessage(`Simulating scan with UID: ${uid}...`);

    try {
      // Use the bridge to simulate a card scan
      const success = await rfidBridge.simulateCardScan(uid);

      if (success) {
        // The card event handler will update the UI when the event is received
        console.log(`Card scan simulation initiated for: ${uid}`);
      } else {
        setStatus('error');
        setMessage(`Error: Failed to simulate card scan`);
        
        // Stop waiting for scan
        if (waitingForScan) {
          rfidBridge.removeEventListener(cardEventHandler);
          setWaitingForScan(false);
        }
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Stop waiting for scan
      if (waitingForScan) {
        rfidBridge.removeEventListener(cardEventHandler);
        setWaitingForScan(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardUID.trim()) {
      setStatus('error');
      setMessage('Please enter a card UID');
      return;
    }
    simulateCardScan(cardUID);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">RFID Card Testing Tool</h1>
      
      <div className="grid gap-8">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">RFID Card Detection</h2>
          <p className="text-gray-600 mb-4">
            Wait for a real card scan or simulate one using the form below.
          </p>
          
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold mb-2">Real Card Scanner</h3>
            <p className="text-sm text-gray-600 mb-3">
              Use this to wait for an actual RFID card to be scanned.
            </p>
            
            <div className="flex flex-col space-y-3">
              <Button 
                type="button" 
                variant={waitingForScan ? "destructive" : "default"}
                onClick={toggleWaitForScan}
                className="w-full"
              >
                {waitingForScan ? "Cancel Scan" : "Start Listening for Card"}
              </Button>
              
              {waitingForScan && (
                <div className="flex items-center justify-center p-3 bg-blue-50 rounded-md animate-pulse">
                  <p className="text-blue-700">Waiting for card scan... (Will timeout after 10 seconds)</p>
                </div>
              )}
              
              {lastScannedCard && (
                <div className="p-3 bg-green-50 rounded-md">
                  <p className="text-green-700 font-medium">Card detected: {lastScannedCard}</p>
                </div>
              )}
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Manual Card Simulation</h3>
          <p className="text-gray-600 mb-4">
            Enter a card UID manually or use one of the sample UIDs to simulate a card scan.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="card-uid" className="block text-sm font-medium mb-1">
                Card UID
              </label>
              <Input
                id="card-uid"
                value={cardUID}
                onChange={(e) => setCardUID(e.target.value)}
                placeholder="Enter card UID (e.g., 23 DF 3F 2A)"
                className="w-full"
                disabled={waitingForScan}
              />
            </div>
            
            <Button type="submit" disabled={status === 'loading' || waitingForScan}>
              Simulate Card Scan
            </Button>
          </form>

          {status !== 'idle' && (
            <div className={`mt-4 p-3 rounded ${
              status === 'loading' ? 'bg-gray-100' :
              status === 'success' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">Sample Card UIDs</h2>
          <p className="text-gray-600 mb-4">
            Click on any of these sample UIDs to quickly test the system.
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {sampleUIDs.map((uid) => (
              <Button
                key={uid}
                variant="outline"
                onClick={() => {
                  setCardUID(uid);
                  simulateCardScan(uid);
                }}
                className="text-left"
              >
                {uid}
              </Button>
            ))}
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            These UIDs are from your ESP32 serial monitor output.
          </p>
        </div>
      </div>
    </div>
  );
}
