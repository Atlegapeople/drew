import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Simplified button sound implementation

/**
 * Custom hook to provide button click sound functionality
 * @returns An object containing the playButtonSound function
 */
export function useButtonSound() {
  // Using a single sound file to reduce complexity
  const soundPath = '/sounds/button-being-pressed-103182.wav';
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Function to play the button sound - created directly within useCallback
  // This avoids complex loading logic that could spike the CPU
  const playButtonSound = useCallback(() => {
    if (!audioEnabled || typeof Audio === 'undefined') return;
    
    try {
      // Create a new audio instance each time - more reliable on limited hardware
      // This avoids issues with reusing audio elements
      const sound = new Audio(soundPath);
      sound.volume = 0.2; // Lower volume for less intrusiveness
      
      // Play and forget - no complex event listeners
      const playPromise = sound.play();
      
      // Handle promise without complex chains
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          // Fail silently - just log the error
          console.log('Button sound playback failed:', err);
        });
      }
    } catch (error) {
      // Just log errors, don't try complex recovery
      console.log('Button sound error:', error);
    }
  }, [audioEnabled]);

  // Function to toggle audio on/off
  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => {
      const newState = !prev;
      toast.info(newState ? '🔊 Button sounds enabled' : '🔇 Button sounds disabled', {
        duration: 2000
      });
      return newState;
    });
  }, []);

  return { 
    playButtonSound, 
    toggleAudio, 
    audioEnabled 
  };
}
