'use client';

import { useEffect } from 'react';
import { useVendingMachine } from '@/hooks/useVendingMachine';
import { useSimulateRFID } from '@/lib/utils/simulate';

export default function RFIDScreen() {
  const { authenticateWithRFID } = useVendingMachine();
  const { start: startRFIDSimulation } = useSimulateRFID();
  
  // Simulate RFID scan
  useEffect(() => {
    console.log('[SIM] Starting RFID simulation');
    const timeout = setTimeout(() => {
      authenticateWithRFID();
      startRFIDSimulation();
    }, 4000);
    
    return () => clearTimeout(timeout);
  }, [authenticateWithRFID, startRFIDSimulation]);

  return (
    <div className="text-center">
      <div className="relative w-24 h-24 mx-auto mb-4">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* RFID Waves Animation */}
          <div className="absolute w-12 h-12 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_infinite]"></div>
          <div className="absolute w-12 h-12 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_0.5s_infinite]"></div>
          <div className="absolute w-12 h-12 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_1s_infinite]"></div>
          
          {/* RFID Icon */}
          <div className="relative z-10 w-10 h-10 bg-[#ff66c4] rounded-lg flex items-center justify-center text-white text-lg shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-1 text-gray-800">Tap your RFID card or badge</h3>
      <p className="text-sm text-gray-600">Hold your card near the reader below the screen</p>
    </div>
  );
}
