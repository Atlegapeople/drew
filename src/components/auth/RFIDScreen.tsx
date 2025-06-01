'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
// Using standard HTML5 Audio instead of Howler.js for better compatibility

// Define sound paths outside the component to avoid reference issues
const SUCCESS_SOUND_PATHS = [
  '/success-new.wav',         // Primary success sound
  '/success.wav',             // Fallback #1
  '/sounds/mixkit-fantasy-game-success-notification-270.wav'  // Fallback #2
];

const ERROR_SOUND_PATHS = [
  '/sounds/error-sound-39539.wav'  // Primary error sound
];

export default function RFIDScreen() {
  const { authenticateWithRFID } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<string>('Waiting for card...');
  const [error, setError] = useState<string | null>(null);
  const [accessGranted, setAccessGranted] = useState<boolean>(false);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  const pollingRef = useRef<boolean>(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);

  // Flag to track if audio has been unlocked by user interaction
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  
  // Function to reset the system for a new card scan attempt
  const resetCardScan = () => {
    console.log('Resetting card scan system...');
    setAccessDenied(false);
    setAccessGranted(false);
    setError(null);
    setStatus('Waiting for card...');
    startPolling();
  };
  
  // Function to unlock audio context on user interaction
  const unlockAudio = () => {
    console.log('Attempting to unlock audio on user interaction');
    
    // Show loading toast
    toast.loading('🔊 Enabling Audio', {
      description: 'Preparing sound system for the vending machine...',
      duration: 2000
    });
    
    // Use the same sound paths as defined in the constants
    const tempSuccessAudio = new Audio(SUCCESS_SOUND_PATHS[0]);
    const tempErrorAudio = new Audio(ERROR_SOUND_PATHS[0]);
    
    // Set volume to minimum to avoid unexpected sounds
    tempSuccessAudio.volume = 0.01;
    tempErrorAudio.volume = 0.01;
    
    // Try multiple methods to unlock audio
    // Method 1: Play and immediately pause both sounds
    const unlockSuccess = tempSuccessAudio.play()
      .then(() => {
        tempSuccessAudio.pause();
        tempSuccessAudio.currentTime = 0;
        console.log('Success sound unlocked');
        return true;
      })
      .catch(e => {
        console.warn('Could not unlock success sound:', e);
        return false;
      });
      
    const unlockError = tempErrorAudio.play()
      .then(() => {
        tempErrorAudio.pause();
        tempErrorAudio.currentTime = 0;
        console.log('Error sound unlocked');
        return true;
      })
      .catch(e => {
        console.warn('Could not unlock error sound:', e);
        return false;
      });
    
    // Method 2: Create an AudioContext (if available) as a backup method
    let audioContextUnlocked = false;
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        // @ts-ignore - AudioContext might not be recognized in TypeScript
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log('AudioContext unlocked');
            audioContextUnlocked = true;
          });
        } else {
          audioContextUnlocked = true;
        }
      }
    } catch (e) {
      console.warn('AudioContext not supported:', e);
    }
    
    // Mark audio as unlocked if any method was successful
    Promise.all([unlockSuccess, unlockError])
      .then(results => {
        const anySuccess = results.some(result => result) || audioContextUnlocked;
        if (anySuccess) {
          console.log('Audio context successfully unlocked');
          setAudioUnlocked(true);
          toast.success('🔊 Audio Enabled', {
            description: 'Sound effects are now ready for the vending machine',
            duration: 2000
          });
        } else {
          console.warn('Could not unlock audio context');
          toast.error('🔊 Audio Issue', {
            description: 'Could not enable audio. Please tap the screen again or try a different browser.',
            duration: 4000
          });
        }
      });
  };
  
  // Helper function to check if files exist in the public directory
  const checkAudioPath = (path: string): void => {
    fetch(path)
      .then(response => {
        if (!response.ok) {
          console.error(`File not found: ${path}`);
        } else {
          console.log(`File exists: ${path}`);
        }
      })
      .catch(err => {
        console.error(`Error checking file ${path}:`, err);
      });
  };
  
  // Helper function to load audio with fallbacks
  const loadAudioWithFallback = (paths: string[], label: string): HTMLAudioElement => {
    // Create a new audio element
    const audio = new Audio();
    
    // Configure audio settings
    audio.volume = 1.0;
    audio.preload = 'auto';
    
    console.log(`Attempting to load ${label} sound from paths:`, paths);
    
    // Track which path we're trying
    let currentPathIndex = 0;
    
    // Define event handlers
    const handleCanPlayThrough = () => {
      console.log(`✅ ${label} sound loaded successfully from: ${audio.src}`);
      // Output toast only for initial loading
      if (currentPathIndex === 0) {
        toast.success('🔊 Sound Ready', { 
          description: `${label.charAt(0).toUpperCase() + label.slice(1)} sound loaded successfully.`, 
          duration: 2000 
        });
      }
    };
    
    const handleError = (e: Event) => {
      const errorPath = paths[currentPathIndex];
      console.error(`❌ Error loading ${label} sound from ${errorPath}:`, e);
      
      // Try the next path if available
      currentPathIndex++;
      if (currentPathIndex < paths.length) {
        console.log(`${label} sound load failed, trying fallback #${currentPathIndex}: ${paths[currentPathIndex]}`);
        audio.src = paths[currentPathIndex];
        audio.load();
      } else {
        console.error(`All ${label} sound loading attempts failed after trying ${paths.length} paths`);
        toast.error('🔊 Sound Error', { 
          description: `Could not load ${label} sound after trying all options. Audio feedback may be limited.`, 
          duration: 5000 
        });
      }
    };
    
    // Add event listeners
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);
    
    // Start with the first path
    try {
      audio.src = paths[0];
      audio.load();
      console.log(`Started loading ${label} sound from: ${paths[0]}`);
    } catch (err) {
      console.error(`Exception loading ${label} sound:`, err);
      toast.error('🔊 Sound Error', { 
        description: `Error initializing ${label} sound. Audio feedback may be limited.`, 
        duration: 3000 
      });
    }

    return audio;
  };

  useEffect(() => {
    // Function to initialize audio elements
    const initializeAudio = () => {
      if (typeof window === 'undefined') return;

      // Debug: Check if the audio files exist in the public directory
      console.log('Checking audio file paths...');
      SUCCESS_SOUND_PATHS.forEach(checkAudioPath);
      ERROR_SOUND_PATHS.forEach(checkAudioPath);

      // Create the audio elements with fallback support
      try {
        // Load success sound
        console.log('Loading success sound...');
        const successAudioElement = loadAudioWithFallback(SUCCESS_SOUND_PATHS, 'success');
        successSoundRef.current = successAudioElement;

        // Load error sound
        console.log('Loading error sound...');
        const errorAudioElement = loadAudioWithFallback(ERROR_SOUND_PATHS, 'error');
        errorSoundRef.current = errorAudioElement;

        console.log('Audio elements created successfully');
      } catch (err) {
        console.error('Exception during audio initialization:', err);
        toast.error('🔊 Sound Initialization Error', {
          description: 'Could not initialize sound system. Some features may be limited.',
          duration: 5000
        });
      }
    };

    // Initialize audio
    initializeAudio();

    console.log('Audio elements initialized');

    // Add event listeners to unlock audio on first user interaction
    if (!audioUnlocked) {
      document.addEventListener('click', unlockAudio, { once: true });
      document.addEventListener('touchstart', unlockAudio, { once: true });
      document.addEventListener('keydown', unlockAudio, { once: true });
    }

    // Add test button for sound testing
    const testButton = document.createElement('button');
    testButton.id = 'test-sound-button';
    testButton.innerHTML = 'Test Sound';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '10px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '9999';
    testButton.style.padding = '8px 12px';
    testButton.style.backgroundColor = '#ff66c4'; // D.R.E.W. pink color
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '4px';
    testButton.style.cursor = 'pointer';
    testButton.onclick = () => {
      console.log('Test button clicked');
      // Unlock audio if not already unlocked
      if (!audioUnlocked) {
        unlockAudio();
      }
      playSuccessSound();
    };
    document.body.appendChild(testButton);

    try {
      successSoundRef.current?.load();
      errorSoundRef.current?.load();
    } catch (e) {
      console.error('Error pre-loading sounds:', e);
    }
  }, []);

  // Clean up event listeners
  useEffect(() => {
    return () => {
      console.log('Cleaning up audio resources...');

      // Clean up event listeners
      if (typeof window !== 'undefined') {
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      }

      // Remove test button
      const testButton = document.getElementById('test-sound-button');
      if (testButton) {
        testButton.remove();
      }

      // Clean up audio elements
      if (successSoundRef.current) {
        try {
          successSoundRef.current.pause();
          successSoundRef.current.src = '';
          // Remove any event listeners
          successSoundRef.current.removeAttribute('src');
          successSoundRef.current = null;
        } catch (e) {
          console.error('Error cleaning up success sound:', e);
        }
      }

      if (errorSoundRef.current) {
        try {
          errorSoundRef.current.pause();
          errorSoundRef.current.src = '';
          // Remove any event listeners
          errorSoundRef.current.removeAttribute('src');
          errorSoundRef.current = null;
        } catch (e) {
          console.error('Error cleaning up error sound:', e);
        }
      }
    };
  }, []);

  // Function to play success sound using HTML5 Audio
  // Returns a promise that resolves when the sound finishes playing
  const playSuccessSound = (): Promise<void> => {
    console.log('Attempting to play success sound...');
    return new Promise<void>((resolve, reject) => {
      // First, check if we have a success sound
      if (!successSoundRef.current) {
        console.warn('Success sound not initialized');
        toast.error('🔊 Sound Error', {
          description: 'Success sound not initialized. Please try refreshing the page.',
          duration: 5000
        });
        // Resolve anyway to not block the UI
        setTimeout(resolve, 1000);
        return;
      }

      try {
        // Set the volume back to full (in case it was lowered for the unlock)
        successSoundRef.current!.volume = 1.0;

        // Reset the sound position
        successSoundRef.current!.currentTime = 0;

        // Log what we're trying to play
        console.log('Playing success sound from:', successSoundRef.current!.src);

        // Set up a one-time event handler for sound completion
        const onEnded = () => {
          console.log('Success sound finished playing');
          successSoundRef.current?.removeEventListener('ended', onEnded);
          resolve();
        };

        successSoundRef.current!.addEventListener('ended', onEnded);

        // Start playing the sound
        const playPromise = successSoundRef.current!.play();

        // Also resolve after 3.5 seconds as a fallback
        setTimeout(() => {
          console.log('Sound play timeout reached');
          successSoundRef.current?.removeEventListener('ended', onEnded);
          resolve();
        }, 3500);

        playPromise.catch(e => {
          console.error('Error playing success sound:', e);
          // Show a toast notification for debugging
          toast.error('🔊 Sound Error', {
            description: 'Could not play success sound. Touch the screen to enable audio.',
            duration: 3000
          });
          resolve(); // Resolve anyway to continue the flow
        });
      } catch (error) {
        console.error('Exception playing success sound:', error);
        reject(error); // Reject with the error
      }
    });
  };

  // Function to play error sound for access denied
  // Returns a promise that resolves when the sound finishes playing
  const playErrorSound = (): Promise<void> => {
    console.log('Attempting to play error sound...');
    return new Promise<void>((resolve, reject) => {
      // First, check if we have an error sound
      if (!errorSoundRef.current) {
        console.warn('Error sound not initialized');
        toast.error('🔊 Sound Error', {
          description: 'Error sound not initialized. Please try refreshing the page.',
          duration: 5000
        });
        // Resolve anyway to not block the UI
        setTimeout(resolve, 1000);
        return;
      }
      
      try {
        // Set the volume back to full (in case it was lowered for the unlock)
        errorSoundRef.current!.volume = 1.0;
        
        // Reset the sound position
        errorSoundRef.current!.currentTime = 0;

        // Log what we're trying to play
        console.log('Playing error sound from:', errorSoundRef.current!.src);

        // Set up a one-time event handler for sound completion
        const onEnded = () => {
          console.log('Error sound finished playing');
          errorSoundRef.current?.removeEventListener('ended', onEnded);
          resolve();
        };

        errorSoundRef.current!.addEventListener('ended', onEnded);

        // Start playing the sound
        const playPromise = errorSoundRef.current!.play();

        // Also resolve after 3.5 seconds as a fallback
        setTimeout(() => {
          console.log('Error sound timeout reached');
          errorSoundRef.current?.removeEventListener('ended', onEnded);
          resolve();
        }, 3500);

        playPromise.catch(e => {
          console.error('Error playing error sound:', e);
          // Show a toast notification for debugging
          toast.error('🔊 Sound Error', {
            description: 'Could not play error sound. Touch the screen to enable audio.',
            duration: 3000
          });
          resolve(); // Resolve anyway to continue the flow
        });
      } catch (error) {
        console.error('Exception playing error sound:', error);
        reject(error); // Reject with the error
      }
    });
  };

  // Continuously poll for card scans without requiring user interaction
  useEffect(() => {
    // Start polling when component mounts
    startPolling();

    // Clean up when component unmounts
    return () => {
      stopPolling();
    };
  }, []);

  // Start polling for card scans
  const startPolling = () => {
    console.log('Starting continuous polling for RFID cards');
    pollingRef.current = true;

    // Poll every 1 second
    pollingIntervalRef.current = setInterval(checkForCardScan, 1000);
  };

  // Stop polling for card scans
  const stopPolling = () => {
    console.log('Stopping card polling');
    pollingRef.current = false;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Reset after access denied
  useEffect(() => {
    if (accessDenied) {
      // Automatically reset after 3 seconds
      const timer = setTimeout(() => {
        setAccessDenied(false);
        setError(null);
        setStatus('Waiting for card...');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [accessDenied]);

  // Check for card scans using the new simplified endpoint
  const checkForCardScan = async () => {
    // Only check if we're actively polling and not already in an approved/denied state
    if (!pollingRef.current) return;

    try {
      // Add a cache-busting parameter to prevent getting cached responses
      const cacheBuster = Date.now();
      console.log('Checking for card scan...');
      const response = await fetch(`/api/auth/rfid-check?t=${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        // Add credentials to ensure cookies are sent
        credentials: 'include'
      });
      
      console.log('RFID check response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.status === 'waiting') {
          // No card detected yet, continue polling
          return;
        }
        
        if (result.status === 'denied') {
          // Card not registered - access denied
          console.log('Access denied:', result.message);
          setError(result.message);
          setAccessDenied(true);
          setStatus('Access denied');
          // Stop polling once access is denied
          stopPolling();
          
          // Show access denied toast with helpful message
          toast.error('❌ Access denied', { 
            description: 'This card is not registered in the system', 
            duration: 1500 
          });
          
          // Play error sound but don't wait for it to finish
          console.log('Playing error sound for access denied...');
          playErrorSound(); // Don't await to speed up the flow
          
          // Clear the latest.json file so it doesn't affect future scans
          try {
            console.log('Clearing latest card scan file after access denied...');
            const clearResponse = await fetch('/api/admin/clear-card-scan', {
              method: 'DELETE',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              },
              credentials: 'include'
            });
            
            if (clearResponse.ok) {
              console.log('Successfully cleared latest card scan file');
            } else {
              console.error('Failed to clear latest card scan file:', clearResponse.status);
            }
          } catch (clearError) {
            console.error('Error clearing latest card scan file:', clearError);
          }
          
          // Refresh the browser after a very short delay
          toast.info('🔄 Refreshing...', {
            description: 'Preparing system for next scan',
            duration: 1000
          });
          
          // Set a timeout to refresh the page after 1.5 seconds
          setTimeout(() => {
            console.log('Refreshing browser after access denied...');
            window.location.reload();
          }, 1500);
        }
        else if (result.status === 'granted') {
          // Valid card - access granted
          console.log('Access granted for card:', result.cardUid);
          setStatus('Access granted');
          setAccessGranted(true);
          
          // Stop polling once access is granted
          stopPolling();
          
          // Show a success toast notification for card scan
          toast.success('✅ Card detected', {
            description: 'Processing your authentication...',
            duration: 3000
          });
          
          // Play success sound and wait for it to finish (3 seconds)
          console.log('Playing success sound and waiting for completion...');
          await playSuccessSound();
          console.log('Success sound finished, proceeding with authentication');
          
          // Show access granted toast
          toast.success('✅ Access granted', {
            description: 'Your card has been authenticated successfully',
            duration: 5000
          });
          
          // Simpler authentication approach with fewer potential failure points
          console.log('Authenticating with card UID:', result.cardUid);
          
          // Direct authentication call after sound completes
          const authResult = await authenticateWithRFID(result.cardUid);
          
          if (authResult.success) {
            console.log('Authentication successful!');
            toast.success('✅ Access granted', {
              description: 'Welcome to D.R.E.W. vending system',
              duration: 5000
            });
            // Auth context will handle the redirect
          } else {
            console.error('Authentication failed:', authResult.message);
            toast.error('❌ Authentication failed', {
              description: 'Please try again with a registered card',
              duration: 5000
            });
            
            setError('Authentication failed. Please try again.');
            setAccessGranted(false);
            setAccessDenied(true);
          }
        }
        else if (result.status === 'error') {
          console.error('Error with card scan:', result.message);
          setError(result.message);
        }
      }
    } catch (error) {
      console.error('Error checking for card scan:', error);
      setError('Error communicating with card reader');
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center h-[280px] py-4 text-center"
      onClick={() => { if (!audioUnlocked) unlockAudio(); }}
    >
      <div className="relative w-32 h-32 mx-auto mb-4">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* RFID Waves Animation - Always show to indicate continuous polling */}
          <div className="absolute w-16 h-16 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_infinite]"></div>
          <div className="absolute w-16 h-16 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_0.5s_infinite]"></div>
          <div className="absolute w-16 h-16 border-2 border-[#ff66c4] rounded-full animate-[ping_2s_1s_infinite]"></div>
          
          {/* RFID Card Icon */}
          <div className="relative z-10 w-14 h-14 bg-[#ff66c4] rounded-lg flex items-center justify-center text-white text-lg shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Status information */}
      {!accessGranted && !accessDenied && (
        <>
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Tap your RFID card</h3>
          <p className="text-sm text-gray-600 max-w-xs mx-auto">Place your card on the reader to authenticate</p>
        </>
      )}
      
      {/* Access granted message */}
      {accessGranted && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md animate-pulse">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Access granted!</p>
              <p className="text-sm">Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Access denied message */}
      {accessDenied && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Access denied</p>
              <p className="text-sm">{error || 'Card not recognized'}</p>
            </div>
          </div>
          <div className="mt-3 text-center text-sm text-gray-600">
            System will reset automatically...
            <div className="mt-2 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#ff66c4] animate-[progress_1.5s_linear_1]" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Status message */}
      {!accessGranted && !accessDenied && (
        <div className="mt-3 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
          <p>{status}</p>
        </div>
      )}
    </div>
  );
}
