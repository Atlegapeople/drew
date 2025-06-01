'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSimulateRFID } from '@/lib/utils/simulate';

// Define the authentication result type
interface AuthResult {
  success: boolean;
  profileId?: number;
  cardUid?: string;
  accessLevel?: string;
  message?: string;
  sessionId?: string; // Add sessionId for cookie management
}

// Define the auth context shape
interface AuthContextType {
  isAuthenticated: boolean;
  profileId: number | null;
  cardUid: string | null;
  accessLevel: string | null;
  pin: string;
  setPin: (pin: string) => void;
  pinLocked: boolean;
  pinLockTimeRemaining: number;
  failedAttempts: number;
  authError: string | null;
  setAuthError: (error: string | null) => void; // Add setAuthError function
  lastActivity: number;
  handleActivity?: () => void; // Add handleActivity function
  authenticateWithRFID: (cardUid?: string) => Promise<AuthResult>;
  authenticateWithPIN: (enteredPin: string) => Promise<AuthResult>;
  logout: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  profileId: null,
  cardUid: null,
  accessLevel: null,
  pin: '',
  setPin: () => {},
  pinLocked: false,
  pinLockTimeRemaining: 0,
  failedAttempts: 0,
  authError: null,
  setAuthError: () => {},
  lastActivity: Date.now(),
  authenticateWithRFID: async () => ({ success: false }),
  authenticateWithPIN: async () => ({ success: false }),
  logout: () => {},
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [cardUid, setCardUid] = useState<string | null>(null);
  const [accessLevel, setAccessLevel] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pinLocked, setPinLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState(0);
  const [pinLockTimeRemaining, setPinLockTimeRemaining] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionTimeoutId, setSessionTimeoutId] = useState<NodeJS.Timeout | null>(null);
  
  const router = useRouter();
  
  // Function to handle user activity and reset session timeout
  const handleActivity = () => {
    setLastActivity(Date.now());
    resetSessionTimeout();
  };
  
  // Effect to track user activity
  useEffect(() => {
    // Add event listeners for user activity
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);
  
  // Effect to check if we have a stored session
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const storedSession = localStorage.getItem('drew_session');
    
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          // Session is still valid
          setIsAuthenticated(true);
          setProfileId(session.profileId);
          setCardUid(session.cardUid);
          setAccessLevel(session.accessLevel);
          setLastActivity(Date.now());
          resetSessionTimeout();
        } else {
          // Session expired
          localStorage.removeItem('drew_session');
          router.push('/lock');
        }
      } catch (error) {
        console.error('Error parsing stored session:', error);
        localStorage.removeItem('drew_session');
      }
    } else if (window.location.pathname !== '/lock') {
      // No session and not on lock screen, redirect
      router.push('/lock');
    }
    
    // Cleanup function
    return () => {
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
      }
    };
  }, [router]);
  
  // Effect to manage PIN lockout timer
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (pinLocked && lockUntil > Date.now()) {
      intervalId = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
        setPinLockTimeRemaining(remaining);
        
        if (remaining === 0) {
          setPinLocked(false);
          setFailedAttempts(0);
          
          if (intervalId) {
            clearInterval(intervalId);
          }
        }
      }, 1000);
    } else {
      setPinLockTimeRemaining(0);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pinLocked, lockUntil]);
  
  // Effect to track user activity and manage session timeout
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      resetSessionTimeout();
    };
    
    // Track user activity
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);
    
    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity); // Remove scroll event listener
    };
  }, []);
  
  // Reset session timeout
  const resetSessionTimeout = () => {
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
    }
    
    if (isAuthenticated) {
      // Set timeout for 2 minutes (120000ms) to allow for dispensing operations
      const timeoutId = setTimeout(() => {
        console.log('Session timeout - logging out');
        logout();
      }, 120000); // 2 minutes of inactivity
      
      setSessionTimeoutId(timeoutId);
    }
  };
  
  // Set up a session
  const setSession = (auth: AuthResult) => {
    if (auth.success && auth.profileId) {
      setIsAuthenticated(true);
      setProfileId(auth.profileId);
      setCardUid(auth.cardUid || null);
      setAccessLevel(auth.accessLevel || null);
      setAuthError(null);
      setLastActivity(Date.now());
      
      // Reset session timeout
      resetSessionTimeout();
      
      // Store session in localStorage
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 2); // 2 minutes from now
      
      // Store session info in localStorage
      const sessionData = {
        profileId: auth.profileId,
        cardUid: auth.cardUid,
        accessLevel: auth.accessLevel,
        expiresAt: expiresAt.toISOString(),
        sessionId: auth.sessionId // Include sessionId from auth response
      };
      
      // Save to localStorage
      localStorage.setItem('drew_session', JSON.stringify(sessionData));
      
      // Make a call to refresh the session cookie using window.location.origin to ensure proper port
      fetch(`${window.location.origin}/api/auth/check-session`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${auth.sessionId}` // Add session ID in authorization header
        }
      }).catch(err => {
        console.error('Error refreshing session cookie:', err);
      });
    }
  };
  
  // RFID authentication
  const authenticateWithRFID = async (cardUid?: string): Promise<AuthResult> => {
    try {
      // Simple approach - directly set authentication state if we have a card UID
      if (cardUid) {
        console.log('Directly authenticating with card:', cardUid);
        
        // Get the access level directly from the database via the simplified API
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: 'rfid',
            cardUid
          })
        });
        
        if (!response.ok) {
          console.error('Auth API error:', response.status);
          return { success: false, message: 'Server error' };
        }
        
        const result = await response.json();
        console.log('Auth result:', result);
        
        if (result.success) {
          // Set authentication state
          setIsAuthenticated(true);
          setProfileId(result.profileId);
          setCardUid(result.cardUid);
          setAccessLevel(result.accessLevel);
          setLastActivity(Date.now());
          
          // Reset session timeout
          resetSessionTimeout();
          
          // Route based on access level
          if (result.accessLevel === 'admin') {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
          
          return { success: true };
        } else {
          setAuthError(result.message || 'Authentication failed');
          return { success: false, message: result.message || 'Authentication failed' };
        }
      }
      
      return { success: false, message: 'No card UID provided' };
    } catch (error) {
      console.error('RFID auth error:', error);
      setAuthError('Authentication error');
      return { success: false, message: 'Authentication error' };
    }
  };
  
  // PIN authentication
  const authenticateWithPIN = async (enteredPin: string): Promise<AuthResult> => {
    try {
      setAuthError(null);
      
      // Check if PIN entry is locked
      if (pinLocked) {
        setAuthError(`PIN entry locked for ${pinLockTimeRemaining} seconds`);
        return { success: false, message: 'PIN entry locked' };
      }
      
      // Use the auth API endpoint instead of direct database access
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'pin',
          pin: enteredPin
        }),
      });
      
      const result = await response.json();
      
      console.log('PIN Authentication response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        setFailedAttempts(0);
        setSession(result);
        
        // Route based on access level - with extra debugging
        console.log('Access level check - Current value:', result.accessLevel);
        console.log('Type of accessLevel:', typeof result.accessLevel);
        console.log('Is admin?', result.accessLevel === 'admin');
        
        // Force the admin navigation if the PIN is 9999
        if (enteredPin === '9999') {
          console.log('Force routing to admin due to PIN 9999');
          router.push('/admin');
        }
        else if (result.accessLevel === 'admin') {
          console.log('Routing to admin dashboard');
          router.push('/admin');
        } else {
          console.log('Routing to user dashboard');
          router.push('/dashboard');
        }
      } else {
        // Increment failed attempts
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        
        // Lock PIN entry after 3 failed attempts
        if (newFailedAttempts >= 3) {
          setPinLocked(true);
          const lockTime = Date.now() + 5 * 1000; // 5 seconds
          setLockUntil(lockTime);
          setAuthError('PIN entry locked for 5 seconds');
        } else {
          setAuthError(result.message || 'Invalid PIN');
        }
      }
      
      return result;
    } catch (error) {
      console.error('PIN auth error:', error);
      setAuthError('Authentication error');
      return { success: false, message: 'Authentication error' };
    }
  };
  
  // Logout
  const logout = () => {
    // Clear authentication state
    setIsAuthenticated(false);
    setProfileId(null);
    setCardUid(null);
    setAccessLevel(null);
    setPin('');
    setAuthError(null);
    
    // Remove the session from localStorage
    localStorage.removeItem('drew_session');
    
    // Clear any session timeout
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
      setSessionTimeoutId(null);
    }
    
    // Delete the latest.json file to prevent reuse of scanned cards
    fetch('/api/admin/clear-card-scan', {
      method: 'DELETE',
    }).then(() => {
      console.log('Latest card scan cleared during logout');
    }).catch(error => {
      console.error('Error clearing card scan during logout:', error);
    });
    
    // Navigate back to the lock screen
    router.push('/lock');
  };
  
  return (
    <AuthContext.Provider 
      value={{
        isAuthenticated,
        profileId,
        cardUid,
        accessLevel,
        pin,
        setPin,
        pinLocked,
        pinLockTimeRemaining,
        failedAttempts,
        authError,
        setAuthError,
        lastActivity,
        handleActivity,
        authenticateWithRFID,
        authenticateWithPIN,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for using the auth context
export const useAuth = () => useContext(AuthContext);

// Auth guard HOC for route protection
export function withAuth(Component: React.ComponentType) {
  return function AuthenticatedComponent(props: any) {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    
    useEffect(() => {
      if (!isAuthenticated) {
        router.push('/lock');
      }
    }, [isAuthenticated, router]);
    
    return isAuthenticated ? <Component {...props} /> : null;
  };
}
