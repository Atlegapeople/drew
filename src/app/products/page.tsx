'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ProductSelection from '@/components/products/ProductSelection';

export default function ProductsPage() {
  const router = useRouter();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number>(10);
  
  const handleGoBack = () => {
    router.push('/welcome');
  };
  
  const resetInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Reset countdown to 10 seconds
    setCountdown(10);
    
    // Set new timer for 10 seconds
    inactivityTimerRef.current = setTimeout(() => {
      console.log('Automatic logout due to inactivity');
      router.push('/welcome');
    }, 10000); // 10 seconds
  };
  
  // Set up countdown timer
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
    
    return () => clearInterval(countdownInterval);
  }, []);
  
  // Set up inactivity timer and event listeners
  useEffect(() => {
    // Initial timer setup
    resetInactivityTimer();
    
    // Event listeners for user activity
    const handleUserActivity = () => resetInactivityTimer();
    
    // Add event listeners
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('touchstart', handleUserActivity);
    document.addEventListener('mousemove', handleUserActivity);
    
    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('touchstart', handleUserActivity);
      document.removeEventListener('mousemove', handleUserActivity);
    };
  }, [router, resetInactivityTimer]);
  
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md py-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          Select Your Product
        </h1>
        <p className="text-sm text-gray-600 tracking-wide">
          Choose the product you need
        </p>
      </div>
      
      <div className="w-full mb-12">
        <ProductSelection />
      </div>
      
      <button 
        className="mt-4 mb-8 bg-[#ff66c4] text-white border-none rounded-lg w-full max-w-xs py-3 flex items-center justify-center text-base font-semibold tracking-wide transition-all hover:bg-[#e55ab0] active:scale-95 shadow-md"
        onClick={handleGoBack}
        aria-label="Go back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </button>
      
      <div className="text-center text-sm text-gray-500 mt-4 tracking-wide">
        <div className="flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Auto-logout in {countdown} seconds
        </div>
      </div>
    </div>
  );
}
