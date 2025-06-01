import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Custom hook to provide touch/click sound for the entire application
 * Designed for touchscreen interfaces where any screen interaction should trigger a sound
 */
export function useGlobalTouchSound() {
  // Use refs to prevent re-initialization on renders
  const initialized = useRef(false);
  const soundEnabled = useRef(true);
  const audioContext = useRef<AudioContext | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);
  const eventAttached = useRef(false);
  const lastTouchTimeRef = useRef(0);

  // Setup function that only runs once 
  const setupTouchSound = useCallback(() => {
    // Skip if already initialized or not in browser
    if (initialized.current || typeof window === 'undefined') return;
    console.log('Setting up global touch sound system');
    initialized.current = true;
    
    // Prepare the AudioContext and load the sound
    const initAudio = async () => {
      try {
        // Use the appropriate AudioContext
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          console.log('AudioContext not supported');
          return;
        }
        
        // Create context
        audioContext.current = new AudioContextClass();
        console.log('Audio context created:', audioContext.current.state);
        
        // Load sound quietly
        try {
          const response = await fetch('/sounds/button-being-pressed-103182.wav');
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer.current = await audioContext.current.decodeAudioData(arrayBuffer);
            console.log('Touch sound loaded successfully');
          }
        } catch (e) {
          console.log('Could not load sound file:', e);
        }
      } catch (error) {
        console.log('Audio initialization error:', error);
      }
    };

    // Initialize audio
    initAudio();
    
    // Function to play sound
    const playSound = (e: Event) => {
      // Only play for trusted events (actual user interaction)
      if (!e.isTrusted) return;
      
      // Debounce rapidly repeated events
      const now = Date.now();
      if (now - lastTouchTimeRef.current < 150) return;
      lastTouchTimeRef.current = now;
      
      // Skip if sound is disabled or not ready
      if (!soundEnabled.current || !audioContext.current || !audioBuffer.current) {
        console.log('Sound not ready:', {
          soundEnabled: soundEnabled.current,
          contextExists: !!audioContext.current,
          bufferExists: !!audioBuffer.current
        });
        return;
      }
      
      // Ensure audio context is running
      if (audioContext.current.state === 'suspended') {
        console.log('Resuming suspended audio context');
        audioContext.current.resume().catch(console.error);
      }
      
      try {
        // Create new source for each play
        const source = audioContext.current.createBufferSource();
        source.buffer = audioBuffer.current;
        
        // Control volume
        const gainNode = audioContext.current.createGain();
        gainNode.gain.value = 0.15; // Lower volume
        
        // Connect and play
        source.connect(gainNode);
        gainNode.connect(audioContext.current.destination);
        source.start(0);
      } catch (error) {
        // Silently fail - don't disrupt the app if sound fails
        console.log('Sound playback error:', error);
      }
    };

    // Only attach events once to prevent duplicates
    if (!eventAttached.current) {
      // Use capture phase to get events before they reach components
      window.addEventListener('mousedown', playSound, { capture: true });
      window.addEventListener('touchstart', playSound, { capture: true });
      
      // Log that events are attached
      console.log('Touch sound event listeners attached');
      eventAttached.current = true;
      
      // Add cleanup to window for persistence across renders
      (window as any).__touchSoundCleanup = () => {
        window.removeEventListener('mousedown', playSound, { capture: true });
        window.removeEventListener('touchstart', playSound, { capture: true });
        if (audioContext.current && audioContext.current.state !== 'closed') {
          audioContext.current.close().catch(console.error);
        }
      };
    }
  }, []);

  // Toggle sound function that works with refs
  const toggleSound = useCallback(() => {
    soundEnabled.current = !soundEnabled.current;
    toast.info(
      soundEnabled.current ? '🔊 Touch sounds enabled' : '🔇 Touch sounds disabled', 
      { duration: 2000 }
    );
  }, []);

  // Run setup once
  useEffect(() => {
    // Wait a short time to ensure the DOM is ready
    const timer = setTimeout(() => {
      setupTouchSound();
      console.log('Touch sound setup initiated');
      
      // Unlock audio on first user interaction
      const unlockAudio = () => {
        if (audioContext.current && audioContext.current.state === 'suspended') {
          audioContext.current.resume().then(() => {
            console.log('AudioContext resumed on user interaction');
          }).catch(console.error);
        }
        // Remove unlock listeners after first interaction
        document.removeEventListener('touchstart', unlockAudio, true);
        document.removeEventListener('mousedown', unlockAudio, true);
      };
      
      // Add unlock listeners
      document.addEventListener('touchstart', unlockAudio, true);
      document.addEventListener('mousedown', unlockAudio, true);
    }, 500);  // Short delay to ensure DOM ready
    
    // Use existing cleanup function if available
    return () => {
      clearTimeout(timer);
      if ((window as any).__touchSoundCleanup) {
        (window as any).__touchSoundCleanup();
      }
    };
  }, [setupTouchSound]);

  return {
    toggleSound,
    isSoundEnabled: () => soundEnabled.current
  };
}
