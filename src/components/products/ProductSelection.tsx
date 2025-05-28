'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { ProductType } from '@/lib/services/inventory-service';
import { useAuth } from '@/lib/contexts/auth-context';
import ProductService from '@/lib/services/product-service';
import { useDispenseController } from '@/hooks/useDispenseController';
import ProductCard from './ProductCard';

export default function ProductSelection() {
  const router = useRouter();
  const { profileId, cardUid } = useAuth();
  const [tamponStock, setTamponStock] = useState(50);
  const [padStock, setPadStock] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  
  // Set up the hardware-ready dispense controller with success callback
  const { start } = useDispenseController(() => {
    router.push('/success');
  });
  
  // Track if we're currently processing a selection to prevent multiple clicks
  const isProcessingRef = useRef(false);
  
  // Load inventory data on component mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setIsLoading(true);
        
        // Fetch inventory data from API
        const response = await fetch('/api/inventory');
        const result = await response.json();
        
        if (result.success) {
          // Update stock levels
          result.data.forEach((item: any) => {
            if (item.productType === 'tampons') {
              setTamponStock(item.currentStock);
            } else if (item.productType === 'pads') {
              setPadStock(item.currentStock);
            }
          });
        } else {
          console.error('Error fetching inventory:', result.message);
        }
      } catch (error) {
        console.error('Error loading inventory:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInventory();
  }, []);

  const handleProductSelect = async (productType: ProductType) => {
    // Prevent multiple rapid selections
    if (isProcessingRef.current) {
      console.log('[HW] Already processing a selection, ignoring');
      return;
    }

    // Set processing flag
    isProcessingRef.current = true;
    
    try {
      // First dispense the product through the API
      if (!profileId || !cardUid) {
        console.error('No authentication information available');
        router.push('/lock');
        return;
      }
      
      console.log(`[HW] Selected product: ${productType}`);
      
      // Dispense product, update inventory, and log usage using API
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productType,
          profileId,
          cardUid
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Navigate to dispensing screen
        console.log('[HW] Navigating to dispensing screen');
        router.push('/dispensing');
        
        // Update local stock display
        if (productType === 'tampons') {
          setTamponStock(prev => Math.max(0, prev - 1));
        } else if (productType === 'pads') {
          setPadStock(prev => Math.max(0, prev - 1));
        }
        
        // Add a longer delay before starting the dispense to ensure navigation completes
        setTimeout(() => {
          console.log('[HW] Starting dispense process');
          start();
        }, 300);
      } else {
        console.error('Failed to dispense product:', result.message);
        alert(`Failed to dispense: ${result.message}`);
      }
    } catch (error) {
      console.error('Error in product selection:', error);
    } finally {
      // Reset processing flag after a safe period
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);
    }
  };

  return (
    <div className="w-full max-w-md">
      {isLoading ? (
        <div className="text-center py-8">
          <p>Loading inventory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 auto-rows-[1fr]">
          <ProductCard
            imageUrl="/tampon.png"
            name="Tampons"
            stock={tamponStock}
            maxStock={50}
            onClick={() => handleProductSelect('tampons')}
            disabled={tamponStock <= 0}
          />
          <ProductCard
            imageUrl="/pad.png"
            name="Sanitary Pads"
            stock={padStock}
            maxStock={50}
            onClick={() => handleProductSelect('pads')}
            disabled={padStock <= 0}
          />
        </div>
      )}
    </div>
  );
}
