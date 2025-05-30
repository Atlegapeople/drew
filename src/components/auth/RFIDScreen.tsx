'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function RFIDScreen() {
  const { authenticateWithRFID } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<string>('Waiting for card...');
  const [error, setError] = useState<string | null>(null);
  const [accessGranted, setAccessGranted] = useState<boolean>(false);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  const pollingRef = useRef<boolean>(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Continuously poll for card scans without requiring user interaction
  useEffect(() => {
    // Start polling when component mounts
    startPolling();
    
    // Clean up when component unmounts
    return () => {
      stopPolling();
    };
  }, []);
  
  // Start polling for card scans
  const startPolling = () => {
    console.log('Starting continuous polling for RFID cards');
    pollingRef.current = true;
    
    // Poll every 1 second
    pollingIntervalRef.current = setInterval(checkForCardScan, 1000);
  };
  
  // Stop polling for card scans
  const stopPolling = () => {
    console.log('Stopping card polling');
    pollingRef.current = false;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };
  
  // Reset after access denied
  useEffect(() => {
    if (accessDenied) {
      // Automatically reset after 3 seconds
      const timer = setTimeout(() => {
        setAccessDenied(false);
        setError(null);
        setStatus('Waiting for card...');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [accessDenied]);
  
  // Check for card scans using the new simplified endpoint
  const checkForCardScan = async () => {
    if (!pollingRef.current || accessGranted || accessDenied) return;
    
    try {
      // Add a cache-busting parameter to prevent getting cached responses
      const cacheBuster = Date.now();
      const response = await fetch(`/api/auth/rfid-check?t=${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.status === 'waiting') {
          // No card detected yet, continue polling
          return;
        }
        
        if (result.status === 'denied') {
          // Card not registered
          console.log('Access denied:', result.message);
          setError(result.message);
          setAccessDenied(true);
          setStatus('Access denied');
          // Continue polling after reset
        }
        else if (result.status === 'granted') {
          // Valid card - access granted
          console.log('Access granted for card:', result.cardUid);
          setStatus('Access granted');
          setAccessGranted(true);
          
          // Stop polling once access is granted
          stopPolling();
          
          // Show a success toast notification
          toast.success('✅ Access granted', {
            description: 'Your card has been authenticated successfully',
            duration: 5000
          });
          
          // Authenticate through the auth context
          const authResult = await authenticateWithRFID(result.cardUid);
          
          if (authResult.success) {
            // The auth context will handle redirecting to the appropriate page
            // based on the access level stored in the database
            console.log('Authentication successful, context updated');
          } else {
            // Something went wrong with the auth context
            console.error('Error in auth context:', authResult.message);
            setError('Authentication error. Please try again.');
            setAccessGranted(false);
            setAccessDenied(true);
          }
        }
        else if (result.status === 'error') {
          console.error('Error with card scan:', result.message);
          setError(result.message);
        }
      }
    } catch (error) {
      console.error('Error checking for card scan:', error);
      setError('Error communicating with card reader');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[280px] py-4 text-center">
      <div className="relative w-32 h-32 mx-auto mb-4">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* RFID Waves Animation - Always show to indicate continuous polling */}
          <div className="absolute w-16 h-16 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_infinite]"></div>
          <div className="absolute w-16 h-16 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_0.5s_infinite]"></div>
          <div className="absolute w-16 h-16 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_1s_infinite]"></div>
          
          {/* RFID Card Icon */}
          <div className="relative z-10 w-14 h-14 bg-[#ff66c4] rounded-lg flex items-center justify-center text-white text-lg shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Status information */}
      {!accessGranted && !accessDenied && (
        <>
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Tap your RFID card</h3>
          <p className="text-sm text-gray-600 max-w-xs mx-auto">Place your card on the reader to authenticate</p>
        </>
      )}
      
      {/* Access granted message */}
      {accessGranted && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md animate-pulse">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Access granted!</p>
              <p className="text-sm">Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Access denied message */}
      {accessDenied && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md animate-pulse">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Access denied</p>
              <p className="text-sm">{error || 'Card not recognized'}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Status message */}
      {!accessGranted && !accessDenied && (
        <div className="mt-3 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
          <p>{status}</p>
        </div>
      )}
    </div>
  );
}
