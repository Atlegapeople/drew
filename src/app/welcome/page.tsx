'use client';

import { useRFIDListener } from '@/hooks/useRFIDListener';
import AuthTabs from '@/components/auth/AuthTabs';

export default function WelcomePage() {
  // Use the RFID listener hook which automatically starts on mount
  useRFIDListener();
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md max-h-screen p-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Welcome to D.R.E.W.
        </h1>
        <p className="text-sm text-gray-600">
          Providing dignified access to essential feminine hygiene products
          <br />
          Please authenticate to continue
        </p>
      </div>
      
      <AuthTabs />
      
      <div className="text-red-600 mt-4 text-xs hidden" id="emergencyInfo">
        Emergency Access: Contact Facilities Management
      </div>
    </div>
  );
}
