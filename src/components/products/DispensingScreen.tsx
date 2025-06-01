'use client';
import { useEffect, useState } from 'react';

export default function DispensingScreen() {
  // Add a progress indication that counts seconds
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progressText, setProgressText] = useState('Starting motor...');

  // Update the elapsed time and progress message
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;
        // Update the progress message based on elapsed time
        if (newTime === 2) {
          setProgressText('Motor running...');
        } else if (newTime === 4) {
          setProgressText('Dispensing your product...');
        } else if (newTime > 6) {
          setProgressText('Almost done...');
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl text-center w-full max-w-md">
        {/* Animated dispensing icon */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          <div className="w-full h-full border-8 border-gray-200 border-t-[#ff66c4] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <span className="text-3xl">📦</span>
            </div>
          </div>
        </div>
        
        {/* Status information */}
        <h2 className="text-2xl font-bold mb-3 text-gray-800">Dispensing Product</h2>
        <div className="mb-4 text-[#ff66c4] font-semibold">{progressText}</div>
        
        {/* Progress indication */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div 
            className="bg-[#ff66c4] h-2.5 rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(elapsedTime * 12.5, 100)}%` }}
          ></div>
        </div>
        
        <p className="text-sm text-gray-600">
          Please wait while your product is being prepared.
          <br />
          <span className="text-xs text-gray-500">({elapsedTime} seconds elapsed)</span>
        </p>
      </div>
    </div>
  );
}
