'use client';

// Using global touch sounds instead of individual button sounds

import { useAuth } from '@/lib/contexts/auth-context';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Define sound paths outside the component to avoid reference issues
const SUCCESS_SOUND_PATHS = [
  '/success-new.wav',         // Primary success sound
  '/success.wav',             // Fallback #1
  '/sounds/mixkit-fantasy-game-success-notification-270.wav'  // Fallback #2
];

const ERROR_SOUND_PATHS = [
  '/sounds/error-sound-39539.wav'  // Primary error sound
];

export default function PinEntry() {
  const { pin, setPin, authenticateWithPIN, pinLocked, pinLockTimeRemaining, authError } = useAuth();
  // Using global touch sounds instead of individual button sounds
  
  // Audio refs
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);
  const prevAuthErrorRef = useRef<string | null>(null);
  
  // Initialize audio elements
  useEffect(() => {
    // Create audio elements for success and error sounds
    if (!successSoundRef.current) {
      const audio = new Audio(SUCCESS_SOUND_PATHS[0]);
      audio.volume = 0.3;
      successSoundRef.current = audio;
    }
    
    if (!errorSoundRef.current) {
      const audio = new Audio(ERROR_SOUND_PATHS[0]);
      audio.volume = 0.3;
      errorSoundRef.current = audio;
    }
    
    return () => {
      // Clean up audio resources
      successSoundRef.current = null;
      errorSoundRef.current = null;
    };
  }, []);
  
  // Play error sound when auth error occurs
  useEffect(() => {
    if (authError && authError !== prevAuthErrorRef.current) {
      prevAuthErrorRef.current = authError;
      if (errorSoundRef.current) {
        errorSoundRef.current.currentTime = 0;
        errorSoundRef.current.play().catch(err => {
          console.warn('Could not play error sound:', err);
        });
      }
      // When a new auth error occurs, reset the PIN field for better UX
      if (!pinLocked) {
        setPin('');
      }
    } else if (!authError) {
      prevAuthErrorRef.current = null;
    }
  }, [authError, pinLocked]);
  
  const addDigit = (digit: string) => {
    // Global touch sounds will handle the clicks
    if (pin.length < 6 && !pinLocked) {
      const newPin = pin + digit;
      setPin(newPin);
    }
  };
  
  const clearPin = () => {
    // Global touch sounds will handle the clicks
    setPin('');
  };
  
  // Play success sound
  const playSuccessSound = () => {
    if (successSoundRef.current) {
      successSoundRef.current.currentTime = 0;
      successSoundRef.current.play().catch(err => {
        console.warn('Could not play success sound:', err);
      });
    }
  };
  
  // Play error sound
  const playErrorSound = () => {
    if (errorSoundRef.current) {
      errorSoundRef.current.currentTime = 0;
      errorSoundRef.current.play().catch(err => {
        console.warn('Could not play error sound:', err);
      });
    }
  };

  const handleSubmit = () => {
    // Global touch sounds will handle the clicks
    if (pin.length >= 4 && !pinLocked) {
      // Authentication result will be handled by the authError effect
      authenticateWithPIN(pin).then(result => {
        if (result && result.success) {
          playSuccessSound();
          toast.success('✅ Access Granted', {
            description: 'PIN authenticated successfully',
            duration: 2000
          });
        } else {
          // Error sound will be triggered by the authError effect
          // We don't need to play a duplicate error sound here
          // as the authError effect will handle that
          
          // Clear the PIN input after failed authentication
          setPin('');
        }
      }).catch(err => {
        console.error('PIN authentication error:', err);
        playErrorSound();
        // Clear PIN on error
        setPin('');
      });
    } else if (pin.length < 4 && !pinLocked) {
      playErrorSound();
      toast.error('❌ Invalid PIN', {
        description: 'PIN must be at least 4 digits',
        duration: 2000
      });
      // Clear PIN after showing error
      setPin('');
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
          onClick={handleSubmit}
          disabled={pinLocked}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
