'use client';

import { useState } from 'react';

interface InventoryItem {
  productType: string;
  currentStock: number;
  maxCapacity: number;
  percentRemaining: number;
  lastUpdated: string;
  lowStock: boolean;
}

interface InventoryPanelProps {
  inventory: InventoryItem[];
}

export default function InventoryPanel({ inventory }: InventoryPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const getStockLevel = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage <= 20) return 'low';
    if (percentage <= 50) return 'medium';
    return 'high';
  };
  
  const getStockColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const handleRestock = async () => {
    setIsUpdating(true);
    
    try {
      // Make API call to restock inventory
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'restock',
          items: [
            { product_type: 'tampons', quantity: 50 },
            { product_type: 'pads', quantity: 50 }
          ]
        }),
      });
      
      // Wait a moment to show the loading state
      setTimeout(() => {
        setIsUpdating(false);
        // In a real app, you'd handle the response and update the UI
      }, 800);
      
    } catch (error) {
      console.error('Error restocking inventory:', error);
      setIsUpdating(false);
    }
  };
  
  if (!inventory || inventory.length === 0) {
    return (
      <div className="text-gray-500 py-4 text-center">
        No inventory data available
      </div>
    );
  }
  
  return (
    <div>
      <div className="space-y-4">
        {inventory.map((item) => {
          const stockLevel = getStockLevel(item.currentStock, item.maxCapacity);
          const stockColor = getStockColor(stockLevel);
          const percentage = item.percentRemaining;
          
          return (
            <div key={item.productType} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize font-medium">{item.productType}</span>
                <span className="text-gray-500">
                  {item.currentStock} / {item.maxCapacity}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${stockColor}`} 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-right">
                {percentage}% full
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 text-center">
        <button
          onClick={handleRestock}
          disabled={isUpdating}
          className={`px-4 py-2 rounded-lg text-white ${
            isUpdating ? 'bg-gray-400' : 'bg-[#ff66c4] hover:bg-pink-600'
          } transition-colors`}
        >
          {isUpdating ? (
            <>
              <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Restocking...
            </>
          ) : (
            'Restock All Items'
          )}
        </button>
      </div>
    </div>
  );
}
