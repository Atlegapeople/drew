'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { isAuthenticated, cardUid, logout, accessLevel } = useAuth();
  const router = useRouter();
  
  // Redirect based on authentication and access level
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/lock');
    } else if (accessLevel === 'admin') {
      // If admin user is on regular dashboard, redirect to admin dashboard
      console.log('Admin user detected on regular dashboard, redirecting to admin dashboard');
      router.push('/admin');
    }
  }, [isAuthenticated, accessLevel, router]);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-pink-50 to-white p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-[#ff66c4] mb-2">D.R.E.W.</h1>
        <p className="text-gray-600 text-sm">Dignity • Respect • Empowerment for Women</p>
      </div>
      
      <div className="bg-white rounded-xl p-6 shadow-xl border border-gray-100 w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome</h2>
          <p className="text-gray-600">
            {cardUid ? `Card ID: ${cardUid}` : 'Authenticated User'}
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/products"
            className="flex items-center justify-center w-full py-4 px-6 bg-[#ff66c4] text-white font-medium rounded-lg hover:bg-pink-600 transition-colors"
          >
            Select Product
          </Link>
          
          <button
            onClick={logout}
            className="flex items-center justify-center w-full py-3 px-6 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
      
      <div className="mt-8 text-center text-gray-500 text-xs">
        <p>Session will automatically expire after 1 minute of inactivity</p>
      </div>
    </main>
  );
}
