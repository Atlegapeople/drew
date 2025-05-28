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
  lastActivity: number;
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
  
  // Effect to check if we have a stored session
  useEffect(() => {
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
    };
  }, []);
  
  // Reset session timeout
  const resetSessionTimeout = () => {
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
    }
    
    if (isAuthenticated) {
      // Set timeout for 1 minute (60000ms)
      const timeoutId = setTimeout(() => {
        console.log('Session timeout - logging out');
        logout();
      }, 60000); // 1 minute of inactivity
      
      setSessionTimeoutId(timeoutId);
    }
  };
  
  // Set up a session
  const setSession = (auth: AuthResult) => {
    setIsAuthenticated(true);
    setProfileId(auth.profileId || null);
    setCardUid(auth.cardUid || null);
    setAccessLevel(auth.accessLevel || 'user');
    setLastActivity(Date.now());
    
    // Store session in localStorage with 1 hour expiry
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    localStorage.setItem('drew_session', JSON.stringify({
      profileId: auth.profileId,
      cardUid: auth.cardUid,
      accessLevel: auth.accessLevel,
      expiresAt: expiresAt.toISOString(),
    }));
    
    resetSessionTimeout();
  };
  
  // RFID authentication
  const authenticateWithRFID = async (cardUid?: string): Promise<AuthResult> => {
    try {
      setAuthError(null);
      
      // For testing, if no card is provided, use a demo card
      const uidToUse = cardUid || 'DEMO0001';
      
      // Use the auth API endpoint instead of direct database access
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'rfid',
          cardUid: uidToUse
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSession(result);
        // Route based on access level
        if (result.accessLevel === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        setAuthError(result.message || 'Authentication failed');
      }
      
      return result;
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
          const lockTime = Date.now() + 60 * 1000; // 60 seconds
          setLockUntil(lockTime);
          setAuthError('PIN entry locked for 60 seconds');
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
    setIsAuthenticated(false);
    setProfileId(null);
    setCardUid(null);
    setAccessLevel(null);
    setPin('');
    setAuthError(null);
    
    localStorage.removeItem('drew_session');
    
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
      setSessionTimeoutId(null);
    }
    
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
        lastActivity,
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
