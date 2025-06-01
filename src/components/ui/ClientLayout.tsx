'use client';

import { ReactNode } from 'react';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { AuthProvider } from '@/lib/contexts/auth-context';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { useGlobalTouchSound } from '@/hooks/useGlobalTouchSound';

export default function ClientLayout({ children }: { children: ReactNode }) {
  // Initialize global touch sound - will automatically attach touch handlers
  useGlobalTouchSound();
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600">
          <div className="flex flex-col w-full h-full bg-white/95 backdrop-blur-md">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
