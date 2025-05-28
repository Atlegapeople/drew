'use client';

import { useAuth } from '@/lib/contexts/auth-context';

export default function PinEntry() {
  const { pin, setPin, authenticateWithPIN, pinLocked, pinLockTimeRemaining } = useAuth();
  
  const addDigit = (digit: string) => {
    if (pin.length < 6 && !pinLocked) {
      const newPin = pin + digit;
      setPin(newPin);
    }
  };
  
  const clearPin = () => setPin('');
  
  const submitPin = () => {
    if (pin.length >= 4 && !pinLocked) {
      authenticateWithPIN(pin);
    }
  };

  return (
    <div className="flex flex-col h-[280px] py-4">
      <div 
        className="bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-xl text-center mb-4 font-mono tracking-widest h-14 flex items-center justify-center"
        aria-live="polite"
      >
        {pinLocked ? (
          <span className="text-red-500">Locked ({pinLockTimeRemaining}s)</span>
        ) : pin.length === 0 ? (
          <span className="text-gray-500">Enter your PIN</span>
        ) : (
          <span className="text-gray-800">{'•'.repeat(pin.length)}</span>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2 flex-grow">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            className={`bg-white border-2 border-gray-200 rounded-lg text-xl font-semibold select-none touch-manipulation transition-all active:scale-95 hover:bg-gray-50 flex items-center justify-center ${pinLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => addDigit(num.toString())}
            disabled={pinLocked}
          >
            {num}
          </button>
        ))}
        <button
          className={`bg-red-50 border-2 border-red-200 text-red-600 rounded-lg text-sm font-semibold select-none touch-manipulation transition-all active:scale-95 hover:bg-red-100 active:bg-red-600 active:text-white flex items-center justify-center ${pinLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={clearPin}
          disabled={pinLocked}
        >
          Clear
        </button>
        <button
          className={`bg-white border-2 border-gray-200 rounded-lg text-xl font-semibold select-none touch-manipulation transition-all active:scale-95 hover:bg-gray-50 flex items-center justify-center ${pinLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => addDigit('0')}
          disabled={pinLocked}
        >
          0
        </button>
        <button
          className={`bg-pink-50 border-2 border-pink-200 text-[#ff66c4] rounded-lg text-sm font-semibold select-none touch-manipulation transition-all active:scale-95 hover:bg-pink-100 active:bg-[#ff66c4] active:text-white flex items-center justify-center ${pinLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={submitPin}
          disabled={pinLocked}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
