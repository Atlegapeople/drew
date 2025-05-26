'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SuccessScreen from '@/components/products/SuccessScreen';

export default function SuccessPage() {
  const router = useRouter();
  
  // Auto-return to welcome screen after 10 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push('/welcome');
    }, 10000); // Increased to 10 seconds
    
    return () => clearTimeout(timeout);
  }, [router]);
  
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl">
      <SuccessScreen />
    </div>
  );
}
