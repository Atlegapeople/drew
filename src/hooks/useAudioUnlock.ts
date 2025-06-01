import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Custom hook to unlock audio playback across the entire application
 * 
 * This helps solve browser autoplay restrictions by unlocking audio
 * on first user interaction and making that state available to all components
 */
export function useAudioUnlock() {
  // Track if audio has been unlocked globally
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  // Use refs to avoid re-creating functions on re-renders
  const unlockAttemptedRef = useRef(false);
  
  // Global audio context reference
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Function to unlock audio playback across the application
   * Call this on first user interaction (touch, click, keypress)
   */
  const unlockAudio = () => {
    // Skip if already unlocked or attempted
    if (isUnlocked || unlockAttemptedRef.current) return;
    unlockAttemptedRef.current = true;
    
    console.log('🔊 Attempting to unlock audio system...');
    
    // Show brief toast to indicate audio is being prepared
    toast.loading('🔊 Enabling Audio', {
      description: 'Preparing sound system...',
      duration: 2000
    });

    // Try multiple strategies to unlock audio
    let unlocked = false;
    
    // 1. Create and resume an AudioContext
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
        
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume()
            .then(() => {
              console.log('✅ AudioContext unlocked successfully');
              unlocked = true;
              setIsUnlocked(true);
            })
            .catch(err => {
              console.error('Failed to resume AudioContext:', err);
            });
        } else {
          console.log('✅ AudioContext already running');
          unlocked = true;
          setIsUnlocked(true);
        }
      }
    } catch (err) {
      console.error('AudioContext creation error:', err);
    }
    
    // 2. Create and play/pause silent audio elements
    const silentAudio = new Audio('/sounds/silent-1ms.mp3');
    silentAudio.volume = 0.01; // Nearly silent
    
    silentAudio.play()
      .then(() => {
        silentAudio.pause();
        silentAudio.currentTime = 0;
        console.log('✅ Audio unlocked via silent sound');
        unlocked = true;
        setIsUnlocked(true);
      })
      .catch(err => {
        console.warn('Silent audio unlock failed:', err);
      });
    
    // If any method succeeded, mark as unlocked
    if (unlocked) {
      setIsUnlocked(true);
      toast.success('🔊 Audio Enabled', { 
        description: 'Sound system ready',
        duration: 2000
      });
    } else {
      toast.error('❌ Audio Setup Failed', { 
        description: 'Try tapping the screen again',
        duration: 3000
      });
    }
  };

  // Attach unlock events to document when mounted
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const unlockOnInteraction = () => {
      if (!isUnlocked) {
        unlockAudio();
        // Remove listeners once unlocked
        if (isUnlocked) {
          document.removeEventListener('click', unlockOnInteraction);
          document.removeEventListener('touchstart', unlockOnInteraction);
          document.removeEventListener('keydown', unlockOnInteraction);
        }
      }
    };
    
    // Add listeners for various user interactions
    document.addEventListener('click', unlockOnInteraction);
    document.addEventListener('touchstart', unlockOnInteraction);
    document.addEventListener('keydown', unlockOnInteraction);
    
    // Cleanup
    return () => {
      document.removeEventListener('click', unlockOnInteraction);
      document.removeEventListener('touchstart', unlockOnInteraction);
      document.removeEventListener('keydown', unlockOnInteraction);
    };
  }, [isUnlocked]);

  return {
    isAudioUnlocked: isUnlocked,
    unlockAudio,
    audioContext: audioContextRef.current
  };
}

// Create a helper to get silent audio for primer playback
export function createSilentAudio() {
  const audio = new Audio('/sounds/silent-1ms.mp3');
  audio.volume = 0.01;
  return audio;
}

// Singleton to track global unlock state
let globalAudioUnlocked = false;

// Function to set global unlock state
export function setGlobalAudioUnlocked(value: boolean) {
  globalAudioUnlocked = value;
}

// Function to get global unlock state
export function isGlobalAudioUnlocked() {
  return globalAudioUnlocked;
}
