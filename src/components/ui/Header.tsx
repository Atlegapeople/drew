'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Header() {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Update time immediately
    updateTime();
    
    // Update time every second
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  function updateTime() {
    const now = new Date();
    setCurrentTime(
      now.toLocaleTimeString('en-ZA', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    );
  }

  return (
    <header className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <div className="relative h-8 sm:h-10 w-auto flex items-center">
          <Image 
            src="/logo-drew-vending.png" 
            alt="D.R.E.W. Vending Machine Logo" 
            width={120} 
            height={40} 
            className="object-contain w-auto h-auto"
            priority
          />
        </div>
        <div className="text-xs sm:text-sm opacity-90 font-light hidden sm:block">
          Dignity • Respect • Empowerment for Women
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="hidden sm:inline">System Online</span>
        </div>
        <div>{currentTime}</div>
      </div>
    </header>
  );
}
