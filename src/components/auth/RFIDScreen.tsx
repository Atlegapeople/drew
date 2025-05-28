'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useSimulateRFID } from '@/lib/utils/simulate';

export default function RFIDScreen() {
  const { authenticateWithRFID } = useAuth();
  const { start: startRFIDSimulation } = useSimulateRFID();
  const [scanning, setScanning] = useState(false);
  
  // Handle RFID icon click to simulate card scan
  const handleRFIDScan = () => {
    if (!scanning) {
      console.log('[SIM] Starting RFID simulation on click');
      setScanning(true);
      
      // Simulate processing time
      setTimeout(() => {
        // Simulate with demo card ID
        authenticateWithRFID('DEMO0001');
        startRFIDSimulation();
        setScanning(false);
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[280px] py-4 text-center">
      <div className="relative w-32 h-32 mx-auto mb-4">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* RFID Waves Animation */}
          <div className="absolute w-16 h-16 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_infinite]"></div>
          <div className="absolute w-16 h-16 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_0.5s_infinite]"></div>
          <div className="absolute w-16 h-16 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_1s_infinite]"></div>
          
          {/* RFID Icon - Clickable to simulate card scan */}
          <div 
            className="relative z-10 w-14 h-14 bg-[#ff66c4] rounded-lg flex items-center justify-center text-white text-lg shadow-lg cursor-pointer transition-transform hover:scale-110 active:scale-95"
            onClick={handleRFIDScan}
            title="Click to simulate RFID card scan"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">Tap your RFID card or badge</h3>
      <p className="text-sm text-gray-600 max-w-xs mx-auto">{scanning ? "Processing..." : "Click the RFID icon above to simulate a card scan"}</p>
      
      {scanning && (
        <div className="mt-3 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg animate-pulse">
          <p>Reading card...</p>
        </div>
      )}
    </div>
  );
}
