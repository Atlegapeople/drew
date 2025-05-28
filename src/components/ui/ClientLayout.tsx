'use client';

import { ReactNode } from 'react';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { AuthProvider } from '@/lib/contexts/auth-context';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
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
  );
}
