// src/lib/utils/simulate.ts

import { useRouter } from 'next/navigation';

export function useSimulateRFID() {
  const router = useRouter();

  const start = () => {
    console.log('[SIM] Simulating RFID scan completed');
    // We no longer need to route here as the auth context will handle routing
    // This is just for visual feedback and logging now
  };

  return { start };
}

// Global state to track dispensing across component re-renders
let isGloballyDispensing = false;
let activeDispenseTimer: NodeJS.Timeout | null = null;

export function useSimulateDispense(onSuccess: () => void) {
  const start = () => {
    // Prevent multiple dispense simulations from running simultaneously
    if (isGloballyDispensing) {
      console.log('[SIM] Already dispensing, ignoring request');
      return;
    }
    
    // Clear any existing timers to be safe
    if (activeDispenseTimer) {
      clearTimeout(activeDispenseTimer);
    }
    
    // Set global dispensing flag
    isGloballyDispensing = true;
    console.log('[SIM] Simulating product dispense...');
    
    // Use a consistent timer reference
    activeDispenseTimer = setTimeout(() => {
      console.log('[SIM] Dispense simulation complete');
      isGloballyDispensing = false;
      activeDispenseTimer = null;
      
      // Wrap the callback in another setTimeout to ensure it runs after any pending state updates
      setTimeout(() => {
        onSuccess();
      }, 50);
    }, 3000); // simulate dispensing delay
  };

  return { start };
}
