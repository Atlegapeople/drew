'use client';

import { useVendingMachine } from '@/hooks/useVendingMachine';

export default function PinEntry() {
  const { pin, setPin, authenticateWithPIN } = useVendingMachine();
  
  const addDigit = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      
      // Auto-submit when PIN is 4+ digits
      if (newPin.length >= 4) {
        setTimeout(() => {
          authenticateWithPIN(newPin);
        }, 500); // Small delay for feedback
      }
    }
  };
  
  const clearPin = () => setPin('');
  
  const submitPin = () => {
    if (pin.length >= 4) {
      authenticateWithPIN(pin);
    }
  };

  return (
    <div>
      <div 
        className="bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-xl text-center mb-4 font-mono tracking-widest min-h-12 flex items-center justify-center"
        aria-live="polite"
      >
        {pin.length === 0 ? (
          <span className="text-gray-500">Enter your PIN</span>
        ) : (
          <span className="text-gray-800">{'•'.repeat(pin.length)}</span>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            className="bg-white border-2 border-gray-200 rounded-lg p-3 text-xl font-semibold min-h-[50px] min-w-[50px] select-none touch-manipulation transition-all active:scale-95 hover:bg-gray-50"
            onClick={() => addDigit(num.toString())}
          >
            {num}
          </button>
        ))}
        <button
          className="bg-red-50 border-2 border-red-200 text-red-600 rounded-lg p-2 text-sm font-semibold min-h-[50px] select-none touch-manipulation transition-all active:scale-95 hover:bg-red-100 active:bg-red-600 active:text-white"
          onClick={clearPin}
        >
          Clear
        </button>
        <button
          className="bg-white border-2 border-gray-200 rounded-lg p-3 text-xl font-semibold min-h-[50px] select-none touch-manipulation transition-all active:scale-95 hover:bg-gray-50"
          onClick={() => addDigit('0')}
        >
          0
        </button>
        <button
          className="bg-pink-50 border-2 border-pink-200 text-[#ff66c4] rounded-lg p-2 text-sm font-semibold min-h-[50px] select-none touch-manipulation transition-all active:scale-95 hover:bg-pink-100 active:bg-[#ff66c4] active:text-white"
          onClick={submitPin}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
