'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type ProductType = 'tampons' | 'pads' | null;

export function useVendingMachine() {
  const [pin, setPin] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductType>(null);
  const router = useRouter();
  
  // Authentication methods
  const authenticateWithRFID = () => {
    // Simulate RFID authentication
    router.push('/products');
  };
  
  const authenticateWithPIN = (enteredPin: string) => {
    // Validate PIN (4+ digits)
    if (enteredPin.length >= 4) {
      router.push('/products');
    }
  };
  
  // Product selection and dispensing
  const selectProduct = (product: ProductType) => {
    setSelectedProduct(product);
    router.push('/dispensing');
    
    // Simulate dispensing process
    setTimeout(() => {
      router.push('/success');
      
      // Auto-return to welcome screen handled in success page
    }, 3000);
  };
  
  const resetState = () => {
    setPin('');
    setSelectedProduct(null);
  };
  
  return {
    pin,
    setPin,
    selectedProduct,
    authenticateWithRFID,
    authenticateWithPIN,
    selectProduct,
    resetState
  };
}
