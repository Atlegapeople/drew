'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function DispensingScreen() {
  // Add a progress indication that counts seconds
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progressText, setProgressText] = useState('Starting motor...');
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();
  
  // Direct play sound function - super simple approach
  const playSound = () => {
    // Try to play each sound file directly in order until one works
    try {
      console.log('🔊 ATTEMPTING TO PLAY SOUND...');
      
      // Create and play audio element
      const audio = new Audio('/sounds/dispense-success.wav');
      audio.volume = 1.0;
      
      // Play with logging
      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            console.log('✅ SOUND PLAYING SUCCESSFULLY');
            toast.success('🔊 Sound Playing', {
              description: 'Success sound is playing',
              duration: 2000
            });
          })
          .catch(error => {
            console.error('❌ SOUND PLAY ERROR:', error);
            // Try fallback sound
            console.log('Trying fallback sound...');
            
            try {
              const fallbackAudio = new Audio('/success-new.wav');
              fallbackAudio.play()
                .then(() => console.log('✅ Fallback sound playing'))
                .catch(err => console.error('❌ Fallback sound failed:', err));
            } catch (e) {
              console.error('❌ Fallback sound error:', e);
            }
          });
      }
    } catch (error) {
      console.error('❌ ERROR PLAYING SOUND:', error);
    }
  };
  
  // Test sound button handler
  const testSound = () => {
    console.log('📢 TEST BUTTON CLICKED');
    toast.info('🔊 Testing Sound', {
      description: 'Attempting to play dispense success sound...',
      duration: 2000
    });
    playSound();
  };

  // Update the elapsed time and progress message
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;
        
        // Update the progress message based on elapsed time
        if (newTime === 2) {
          setProgressText('Motor running...');
        } else if (newTime === 4) {
          setProgressText('Dispensing your product...');
        } else if (newTime === 6) {
          setProgressText('Almost done...');
        } else if (newTime === 8) {
          // Set complete and update text
          setIsComplete(true);
          setProgressText('Dispensing complete!');
          
          // Show toast notification
          toast.success('✅ Dispensing Complete', {
            description: 'Your product has been dispensed successfully!',
            duration: 3000
          });
          
          // IMMEDIATE SOUND PLAY - try multiple times with slight delays
          console.log('🔊 DISPENSING COMPLETE - PLAYING SOUND');
          playSound();
          
          // Try again after a short delay in case first attempt failed
          setTimeout(playSound, 500);
          
          // Navigate to success page after a longer delay
          setTimeout(() => {
            router.push('/success');
          }, 4000);
          
          // Clear the interval once complete
          clearInterval(timer);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl text-center w-full max-w-md">
        {/* Animated dispensing icon */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          <div className={`w-full h-full border-8 border-gray-200 border-t-[#ff66c4] rounded-full ${!isComplete ? 'animate-spin' : ''}`}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <span className="text-3xl">{isComplete ? '✅' : '📦'}</span>
            </div>
          </div>
        </div>
        
        {/* Status information */}
        <h2 className="text-2xl font-bold mb-3 text-gray-800">
          {isComplete ? 'Dispensing Complete' : 'Dispensing Product'}
        </h2>
        <div className={`mb-4 font-semibold ${isComplete ? 'text-green-500' : 'text-[#ff66c4]'}`}>
          {progressText}
        </div>
        
        {/* Progress indication */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div 
            className={`h-2.5 rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-[#ff66c4]'}`}
            style={{ width: `${Math.min(elapsedTime * 12.5, 100)}%` }}
          ></div>
        </div>
        
        <p className="text-sm text-gray-600">
          {isComplete 
            ? 'Your product has been dispensed successfully!' 
            : 'Please wait while your product is being prepared.'}
          <br />
          <span className="text-xs text-gray-500">
            ({elapsedTime} seconds elapsed)
          </span>
        </p>
        
        {/* Debug sound test button */}
        <button 
          onClick={testSound}
          className="mt-4 py-2 px-4 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
        >
          Test Sound 🔊
        </button>
      </div>
    </div>
  );
}
