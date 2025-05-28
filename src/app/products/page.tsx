'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ProductSelection from '@/components/products/ProductSelection';

export default function ProductsPage() {
  const router = useRouter();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number>(10);
  
  const handleGoBack = () => {
    router.push('/welcome');
  };
  
  const resetInactivityTimer = () => {
    // Clear existing inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Clear existing countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    // Reset countdown to 10 seconds
    setCountdown(10);
    
    // Start a new countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
    
    // Set new inactivity timer for 10 seconds
    inactivityTimerRef.current = setTimeout(() => {
      console.log('Automatic logout due to inactivity');
      router.push('/welcome');
    }, 10000); // 10 seconds
  };
  
  // Initial setup on component mount
  useEffect(() => {
    // Start the inactivity timer immediately
    resetInactivityTimer();
    
    // Cleanup on unmount
    return () => {
      // Clear inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      // Clear countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []); // Empty dependency array ensures this only runs once on mount
  
  // Set up event listeners for user activity
  useEffect(() => {
    // Event listeners for user activity
    const handleUserActivity = () => resetInactivityTimer();
    
    // Add event listeners
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('touchstart', handleUserActivity);
    document.addEventListener('mousemove', handleUserActivity);
    
    // Cleanup
    return () => {
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('touchstart', handleUserActivity);
      document.removeEventListener('mousemove', handleUserActivity);
    };
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md py-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          Select Your Product
        </h1>
        <p className="text-base text-gray-600 tracking-wide">
          Choose the product you need
        </p>
      </div>
      
      <div className="w-full mb-12">
        <ProductSelection />
      </div>
      
      <button 
        className="mt-4 mb-8 bg-[#ff66c4] text-white border-none rounded-lg w-full max-w-xs py-3 flex items-center justify-center text-lg font-semibold tracking-wide transition-all hover:bg-[#e55ab0] active:scale-95 shadow-md"
        onClick={handleGoBack}
        aria-label="Go back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </button>
      
      <div className="text-center mt-6 mb-4 bg-gray-100 rounded-lg p-3 shadow-sm max-w-xs mx-auto">
        <div className="flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#ff66c4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-base font-medium tracking-wide text-gray-700">
            Auto-logout in <span className="text-[#ff66c4] font-bold text-lg">{countdown}</span> seconds
          </span>
        </div>
      </div>
    </div>
  );
}
