'use client';

import { useState, useEffect } from 'react';

export default function Clock() {
  const [time, setTime] = useState('');
  
  useEffect(() => {
    // Update time immediately
    updateTime();
    
    // Update time every second
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  
  function updateTime() {
    const now = new Date();
    setTime(now.toLocaleTimeString('en-ZA', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }));
  }
  
  return <div className="text-sm font-medium">{time}</div>;
}
