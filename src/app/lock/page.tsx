'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthTabs from '@/components/auth/AuthTabs';
import { useAuth } from '@/lib/contexts/auth-context';

export default function LockPage() {
  console.log('Lock page rendered');
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-pink-50 to-white p-4">
      <AuthTabs />
      
      <div className="mt-8 text-center text-gray-500 text-xs">
        <p>Please authenticate to access the vending machine</p>
      </div>
    </main>
  );
}
