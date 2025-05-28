'use client';

import { useEffect, useState } from 'react';

interface UsageData {
  day: string;
  tampons: number;
  pads: number;
}

export default function UsageChart() {
  // Mock data for the chart - in a real app, this would come from an API
  const [usageData, setUsageData] = useState<UsageData[]>([
    { day: 'Mon', tampons: 5, pads: 3 },
    { day: 'Tue', tampons: 7, pads: 4 },
    { day: 'Wed', tampons: 4, pads: 6 },
    { day: 'Thu', tampons: 8, pads: 5 },
    { day: 'Fri', tampons: 6, pads: 7 },
    { day: 'Sat', tampons: 3, pads: 2 },
    { day: 'Sun', tampons: 2, pads: 1 }
  ]);
  
  const [loading, setLoading] = useState(true);
  
  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);
  
  const maxValue = Math.max(
    ...usageData.map(d => Math.max(d.tampons, d.pads))
  );
  
  if (loading) {
    return (
      <div className="h-60 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-pink-500 border-r-2 border-b-2 border-gray-200"></div>
        <p className="ml-2 text-sm text-gray-500">Loading chart data...</p>
      </div>
    );
  }
  
  return (
    <div className="h-60">
      <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 mb-2">
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 bg-pink-400 mr-1 rounded"></span>
          <span>Tampons</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 bg-blue-400 mr-1 rounded"></span>
          <span>Pads</span>
        </div>
      </div>
      
      <div className="flex h-48 items-end space-x-2">
        {usageData.map((data, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="w-full flex justify-center space-x-1 h-full items-end">
              {/* Tampons bar */}
              <div 
                className="w-3 bg-pink-400 rounded-t transition-all duration-500 ease-in-out"
                style={{ 
                  height: `${(data.tampons / maxValue) * 100}%`,
                  minHeight: data.tampons > 0 ? '4px' : '0'
                }}
              ></div>
              
              {/* Pads bar */}
              <div 
                className="w-3 bg-blue-400 rounded-t transition-all duration-500 ease-in-out"
                style={{ 
                  height: `${(data.pads / maxValue) * 100}%`,
                  minHeight: data.pads > 0 ? '4px' : '0'
                }}
              ></div>
            </div>
            <div className="text-xs mt-1 text-gray-500">{data.day}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
