'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/contexts/auth-context';

// Dynamically import components to fix module resolution issues
const RFIDScreen = dynamic(() => import('@/components/auth/RFIDScreen'), { ssr: false });
const PinEntry = dynamic(() => import('@/components/auth/PinEntry'), { ssr: false });

export default function AuthTabs() {
  const [activeTab, setActiveTab] = useState<'rfid' | 'pin'>('rfid');
  const { authError } = useAuth();

  return (
    <div className="bg-white rounded-xl p-5 shadow-xl border border-gray-100 w-full max-w-md flex flex-col">
      <div className="flex mb-4 bg-gray-50 rounded-xl p-1">
        <button
          className={`flex-1 py-4 px-4 text-center rounded-lg font-semibold text-base transition-all ${
            activeTab === 'rfid'
              ? 'bg-[#ff66c4] text-white shadow-md'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('rfid')}
        >
          RFID Card
        </button>
        <button
          className={`flex-1 py-4 px-4 text-center rounded-lg font-semibold text-base transition-all ${
            activeTab === 'pin'
              ? 'bg-[#ff66c4] text-white shadow-md'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('pin')}
        >
          PIN Entry
        </button>
      </div>

      {authError && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
          {authError}
        </div>
      )}

      {activeTab === 'rfid' ? <RFIDScreen /> : <PinEntry />}
    </div>
  );
}
