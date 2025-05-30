'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

/**
 * RfidCardManager component for managing RFID cards (register, list, delete)
 */
export default function RfidCardManager() {
  // State for the list of registered cards
  const [registeredCards, setRegisteredCards] = useState<any[]>([]);
  // State for the new card being registered
  const [newCardUID, setNewCardUID] = useState<string>('');
  // State for the access level of the new card
  const [accessLevel, setAccessLevel] = useState<string>('user');
  // State for the PIN of the new card (optional)
  const [pin, setPin] = useState<string>('');
  // State for tracking if we're waiting for a card scan
  const [waitingForScan, setWaitingForScan] = useState<boolean>(false);
  // State to store the last scanned card
  const [lastScannedCard, setLastScannedCard] = useState<string | null>(null);
  // State to keep track of the last timestamp we've seen
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
  // State to track if RFID service is online
  const [isRfidServiceOnline, setIsRfidServiceOnline] = useState<boolean>(true);
  // State to track successful card registration for UI feedback
  const [lastRegisteredCard, setLastRegisteredCard] = useState<string | null>(null);
  // State to track when a card is successfully deleted
  const [lastDeletedCard, setLastDeletedCard] = useState<string | null>(null);
  // State to track when a card is already registered in the system
  const [alreadyRegisteredCard, setAlreadyRegisteredCard] = useState<string | null>(null);

  // Function to fetch registered cards from the server
  const fetchCards = async () => {
    try {
      const response = await fetch('/api/admin/registered-cards');
      if (response.ok) {
        const data = await response.json();
        setRegisteredCards(data.cards || []);
      }
    } catch (error) {
      console.error('Error fetching registered cards:', error);
      toast.error('Failed to load registered cards');
    }
  };

  // Function to register a new card
  const registerCard = async () => {
    if (!newCardUID) {
      toast.error('🔍 Please scan a card first before registering', {
        description: 'Click the "Scan Card" button and present your RFID card to the reader.'
      });
      return;
    }

    try {
      // Prepare the card data with the correct field names
      // The API expects cardUid not cardUID based on the 400 error
      const response = await fetch('/api/admin/register-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardUid: newCardUID, // Changed from cardUID to cardUid to match API
          accessLevel,
          pin: pin || undefined, // Only send if not empty
        }),
      });

      if (response.ok) {
        // Show a prominent toast notification
        toast.success('✅ Card registered successfully!', {
          description: `Card ${newCardUID} has been added with ${accessLevel} access.`,
          duration: 8000 // Show for longer (8 seconds)
        });
        
        // Set the last registered card for UI feedback
        setLastRegisteredCard(newCardUID);
        setTimeout(() => setLastRegisteredCard(null), 5000); // Clear after 5 seconds
        
        setNewCardUID(''); // Clear the card UID
        setPin(''); // Clear the PIN
        fetchCards(); // Refresh the list of cards
        
        // Clear the latest card scan to prevent it from being shown again
        try {
          const clearResponse = await fetch('/api/admin/clear-card-scan', {
            method: 'DELETE',
          });
          console.log('Cleared latest card scan:', await clearResponse.json());
        } catch (clearError) {
          console.error('Error clearing latest card scan:', clearError);
        }
      } else {
        const errorText = await response.text();
        let errorMessage = 'Unknown error';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.message || 'Unknown error';
        } catch (e) {
          errorMessage = errorText || 'Unknown error';
        }
        if (errorMessage.includes('already registered')) {
          // Handle the already registered case more gracefully
          console.warn('Card is already registered, showing info toast instead of error');
          toast.info('📝 Card already in the system', {
            description: 'This RFID card has already been registered. You can view it in the list below.',
            duration: 8000 // Show for 8 seconds
          });
          
          // Set the already registered card state for UI feedback
          setAlreadyRegisteredCard(newCardUID);
          setTimeout(() => setAlreadyRegisteredCard(null), 5000); // Clear after 5 seconds
          
          // Clear the inputs as if it was successful
          setNewCardUID('');
          setPin('');
          
          // Refresh the cards list to show the registered card
          fetchCards();
        } else {
          console.error('Card registration failed:', {
            status: response.status,
            statusText: response.statusText,
            errorMessage,
            errorText
          });
          toast.error('❌ Registration failed', {
            description: errorMessage || 'There was a problem registering this card. Please try again.'
          });
        }
      }
    } catch (error) {
      console.error('Error registering card:', error);
      toast.error('❌ System error during registration', {
        description: 'There was a technical problem with the registration process. Please try again later.'
      });
    }
  };

  // Function to delete a card
  const deleteCard = async (cardUid: string) => {
    if (!confirm(`Are you sure you want to delete card ${cardUid}?`)) {
      return;
    }
    
    // Show a loading toast
    const toastId = toast.loading('⏳ Deleting card...', {
      description: `Removing card ${cardUid} from the system`
    });

    try {
      // For DELETE requests with body content in fetch API, we need to explicitly set the headers
      // and ensure the body is properly stringified
      console.log('Sending delete request for card:', cardUid);
      
      const response = await fetch(`/api/admin/delete-card?cardUid=${encodeURIComponent(cardUid)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        // In some environments DELETE requests with bodies can be problematic
        // So we're also including the cardUid in the URL query parameter above
        body: JSON.stringify({ cardUid }),
      });

      if (response.ok) {
        // Dismiss loading toast and show success
        toast.dismiss(toastId);
        toast.success('✅ Card removed successfully', {
          description: `Card ${cardUid} has been deleted from the system.`,
          duration: 8000 // Show for 8 seconds
        });
        
        // Set the last deleted card for UI feedback
        setLastDeletedCard(cardUid);
        setTimeout(() => setLastDeletedCard(null), 5000); // Clear after 5 seconds
        
        // Play a success sound if browser supports it
        try {
          const audio = new Audio('/sounds/success.mp3');
          audio.play().catch(e => console.log('Sound could not be played'));
        } catch (e) { 
          // Ignore errors if audio not supported
        }
        
        fetchCards(); // Refresh the list
      } else {
        // Dismiss loading toast and show error
        toast.dismiss(toastId);
        const errorText = await response.text();
        let errorMessage = 'Failed to delete card';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.message || errorMessage;
        } catch (e) {}
        toast.error('❌ Card deletion failed', {
          description: errorMessage || 'The card could not be deleted. Please try again.'
        });
      }  
    } catch (error) {
      // Dismiss loading toast and show error
      toast.dismiss(toastId);
      console.error('Error deleting card:', error);
      toast.error('❌ System error', {
        description: 'A technical error occurred while deleting the card. Please try again later.'
      });
    }
  };

  // Function to start scanning for a card
  const startCardScan = async () => {
    // Check if the RFID service is online
    if (!isRfidServiceOnline) {
      toast.error('RFID service is offline. Please check the connection.');
      return;
    }
    
    try {
      // First, clear any previous card scan file
      await fetch('/api/admin/clear-card-scan', {
        method: 'DELETE'
      });
      console.log('Cleared previous card scan before starting new scan');
    } catch (error) {
      console.error('Error clearing previous card scan:', error);
      // Continue with scan even if clearing fails
    }

    // If we've already scanned a card, use it
    if (lastScannedCard) {
      setNewCardUID(lastScannedCard);
      setLastScannedCard(null);
      return;
    }
    
    // Otherwise, start waiting for a new scan
    if (waitingForScan) {
      return; // Already waiting for a scan
    }
    
    // Display a toast notification to indicate scanning has started
    setWaitingForScan(true);
    toast.info('📷 Ready to scan', {
      description: 'Please place your RFID card on the reader now',
      duration: 10000 // Show for 10 seconds
    });
    
    // Set up a timeout to automatically cancel the scan if it takes too long
    const scanTimeout = setTimeout(() => {
      if (waitingForScan) {
        setWaitingForScan(false);
        toast.warning('⏰ Scan timed out', {
          description: 'No card was detected. Please check the reader and try scanning again.'
        });
      }
    }, 30000); // 30 second timeout
  };

  // Start polling for card scans as soon as component mounts
  useEffect(() => {
    // Initial fetch of registered cards
    fetchCards();
    
    // Flag to track if polling should continue
    let pollingActive = true;
    let consecutiveErrorCount = 0;
    
    // Function to check RFID service status
    const checkRfidServiceStatus = async () => {
      try {
        const response = await fetch('/api/admin/rfid-proxy/last-card?t=' + Date.now(), {
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        // If we get any response, the service is probably online
        const wasOffline = !isRfidServiceOnline;
        setIsRfidServiceOnline(true);
        
        // If it was offline before and is now online, show a message
        if (wasOffline) {
          toast.success('📶 RFID service connected', {
            description: 'The card reader service is now available and ready to use.',
            duration: 5000
          });
        }
        
        return response.ok;
      } catch (error) {
        // If we get an error, the service might be offline
        setIsRfidServiceOnline(false);
        return false;
      }
    };
    
    // Function to poll for card scans
    const pollForCardScans = async () => {
      if (!pollingActive) return;
      
      try {
        // Add a cache-busting parameter to prevent getting cached responses
        const cacheBuster = Date.now();
        const response = await fetch(`/api/admin/rfid-proxy/last-card?t=${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Set the service as online if we got a successful response
          setIsRfidServiceOnline(true);
          
          // Extract card data from the response
          const data = result.data || result;
          let cardUID = data.cardUID || null;
          
          // Process card ONLY if actively waiting for a scan
          if (cardUID && waitingForScan) {
            console.log('Card scan requested - detected card:', cardUID);
            setNewCardUID(cardUID);
            setWaitingForScan(false);
            toast.success('👍 Card detected successfully', {
              description: `Card ID: ${cardUID} is ready to be registered`,
              duration: 5000
            });
          }
        }
      } catch (error) {
        console.error('Error in card polling:', error);
        setIsRfidServiceOnline(false);
      } finally {
        // Schedule the next poll if the component is still mounted
        if (pollingActive) {
          setTimeout(pollForCardScans, 3000); // Normal polling interval
        }
      }
    };
    
    // Start polling
    pollForCardScans();
    
    // Clean up on component unmount
    return () => {
      pollingActive = false;
    };
  }, [waitingForScan]);

  return (
    <div className="space-y-8">
      {/* Card Registration Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4">Register New RFID Card</h2>
        <p className="text-sm text-gray-500 mb-4">Add a new RFID card to the system</p>
        
        {/* Visual confirmation when a card is registered */}
        {lastRegisteredCard && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 mb-4 rounded-md animate-pulse">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-medium">Card registered successfully!</p>
            </div>
          </div>
        )}
        
        {/* Visual notification when a card is already registered */}
        {alreadyRegisteredCard && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 mb-4 rounded-md animate-pulse">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Card already registered</p>
                <p className="text-sm">This card is already in the system. Check the list below.</p>
              </div>
            </div>
          </div>
        )}
        
        {!isRfidServiceOnline && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
            <p className="font-medium">RFID service is offline</p>
            <p className="text-sm">Please ensure the RFID service is running to scan cards.</p>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Card UID Input */}
          <div>
            <label className="block text-sm font-medium mb-1">Card UID</label>
            <div className="flex gap-2">
              <Input
                value={newCardUID}
                onChange={(e) => setNewCardUID(e.target.value)}
                placeholder="Scan card to populate"
                className="flex-1"
              />
              <Button 
                onClick={startCardScan} 
                variant="outline"
                disabled={waitingForScan || !isRfidServiceOnline}
              >
                {waitingForScan ? 'Scanning...' : 'Scan Card'}
              </Button>
            </div>
            {waitingForScan && (
              <p className="text-sm text-blue-500 mt-1">Waiting for card scan...</p>
            )}
          </div>

          {/* Access Level Select */}
          <div>
            <label className="block text-sm font-medium mb-1">Access Level</label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">user</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PIN Input (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-1">PIN (Optional)</label>
            <Input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Optional PIN for dual authentication"
            />
          </div>

          {/* Register Button */}
          <Button 
            onClick={registerCard} 
            disabled={!newCardUID || waitingForScan}
            className="w-full sm:w-auto"
          >
            Register Card
          </Button>
        </div>
      </div>

      {/* Registered Cards Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4">Registered Cards</h2>
        
        {/* Visual confirmation when a card is deleted */}
        {lastDeletedCard && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 mb-4 rounded-md animate-pulse">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="font-medium">Card {lastDeletedCard} has been deleted successfully!</p>
            </div>
          </div>
        )}
        
        <p className="text-sm text-gray-500 mb-4">Managing {registeredCards.length} card(s)</p>
        
        <div className="flex justify-between mb-4">
          <p className="text-sm text-gray-500">Managing {registeredCards.length} card(s)</p>
          <Button variant="outline" size="sm" onClick={fetchCards}>
            Refresh List
          </Button>
        </div>
        
        <div className="space-y-2">
          {registeredCards.map((card) => (
            <div key={card.card_uid} className="border rounded-md p-4 flex justify-between items-center">
              <div>
                <p className="font-mono font-bold">{card.card_uid}</p>
                <p className="text-sm">Access: {card.access_level}</p>
                <p className="text-xs text-gray-500">{new Date(card.created_at).toLocaleString()}</p>
              </div>
              <Button 
                onClick={() => deleteCard(card.card_uid)} 
                variant="destructive"
                size="sm"
              >
                Delete
              </Button>
            </div>
          ))}

          {registeredCards.length === 0 && (
            <p className="text-center text-gray-500 py-4">No cards registered yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
