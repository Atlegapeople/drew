'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useVendingMachine, ProductType } from '@/hooks/useVendingMachine';
import { useDispenseController } from '@/hooks/useDispenseController';
import ProductCard from './ProductCard';

export default function ProductSelection() {
  const router = useRouter();
  const { selectProduct } = useVendingMachine();
  
  // Set up the hardware-ready dispense controller with success callback
  const { start } = useDispenseController(() => {
    router.push('/success');
  });
  
  // Track if we're currently processing a selection to prevent multiple clicks
  const isProcessingRef = useRef(false);

  const handleProductSelect = (productType: ProductType) => {
    // Prevent multiple rapid selections
    if (isProcessingRef.current) {
      console.log('[HW] Already processing a selection, ignoring');
      return;
    }

    // Set processing flag
    isProcessingRef.current = true;
    
    // First select the product
    selectProduct(productType);
    console.log(`[HW] Selected product: ${productType}`);
    
    // Use a more reliable approach with Promise
    Promise.resolve().then(() => {
      // Navigate to dispensing screen
      console.log('[HW] Navigating to dispensing screen');
      router.push('/dispensing');
      
      // Add a longer delay before starting the dispense to ensure navigation completes
      setTimeout(() => {
        console.log('[HW] Starting dispense process');
        start();
        // Reset processing flag after a safe period
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 1000);
      }, 300);
    });
  };

  return (
    <div className="w-full max-w-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 auto-rows-[1fr]">
        <ProductCard
          imageUrl="/tampon.png"
          name="Tampons"
          stock={15}
          used={3}
          quota={5}
          onClick={() => handleProductSelect('tampons')}
        />
        <ProductCard
          imageUrl="/pad.png"
          name="Sanitary Pads"
          stock={22}
          used={2}
          quota={5}
          onClick={() => handleProductSelect('pads')}
        />
      </div>
    </div>
  );
}
