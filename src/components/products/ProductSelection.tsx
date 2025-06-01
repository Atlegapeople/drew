'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { ProductType } from '@/lib/services/inventory-service';
import { useAuth } from '@/lib/contexts/auth-context';
import ProductCard from './ProductCard';
import { toast } from 'sonner';

export default function ProductSelection() {
  const router = useRouter();
  const { profileId, handleActivity } = useAuth();
  const [tamponStock, setTamponStock] = useState(50);
  const [padStock, setPadStock] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [isDispensing, setIsDispensing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dispensedProduct, setDispensedProduct] = useState<string | null>(null);
  
  // Track if we're currently processing a selection to prevent multiple clicks
  const isProcessingRef = useRef(false);
  
  // Load inventory data on component mount and check authentication
  useEffect(() => {
    // Verify authentication on every mount
    if (!profileId) {
      console.info('User not authenticated in ProductSelection component');
      router.push('/lock');
      return;
    }
    loadInventory();
  }, [profileId, router]);

  // Function to load inventory data
  const loadInventory = async () => {
    try {
      // Skip if no profile ID (not authenticated)
      if (!profileId) return;
      
      setIsLoading(true);
      
      // Fetch inventory data from API with credentials using window.location.origin for port consistency
      const response = await fetch(`${window.location.origin}/api/inventory`, {
        credentials: 'include',
        cache: 'no-store',
      });
      
      // Handle authentication errors
      if (response.status === 401) {
        console.info('Session expired while loading inventory');
        toast.info('⏰ Session expired', {
          description: 'Your session has timed out. Please log in again.',
          duration: 5000
        });
        setTimeout(() => router.push('/lock'), 1000);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Update stock levels
        result.data.forEach((item: any) => {
          if (item.productType === 'tampon') {
            setTamponStock(item.currentStock);
          } else if (item.productType === 'pad') {
            setPadStock(item.currentStock);
          }
        });
      } else {
        console.error('Error fetching inventory:', result.message);
        toast.error('❌ Inventory error', {
          description: 'Unable to load product inventory',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast.error('❌ Connection error', {
        description: 'Unable to connect to the inventory service',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = async (productType: string) => {
    // Convert old product types to new ones
    const actualProductType = productType === 'tampons' ? 'tampon' : 'pad';
    
    // Prevent multiple rapid selections
    if (isProcessingRef.current) {
      toast.info('⏳ Please wait', {
        description: 'A product is already being dispensed',
        duration: 3000
      });
      return;
    }
    
    // Basic check if user is authenticated
    if (!profileId) {
      console.info('User not authenticated - redirecting to login');
      toast.info('⏰ Authentication needed', {
        description: 'Please log in to dispense products',
        duration: 5000
      });
      router.push('/lock');
      return;
    }
    
    // No session validation - simplified for vending machine use case
    console.log('Proceeding with product dispensing without session check');

    // Set processing flags
    isProcessingRef.current = true;
    setIsDispensing(true);
    
    // Show loading toast
    const toastId = toast.loading('⏳ Dispensing product', {
      description: `Preparing to dispense ${actualProductType}`,
      duration: 10000
    });
    
    try {
      
      // Check if product is in stock
      if ((actualProductType === 'tampon' && tamponStock <= 0) ||
          (actualProductType === 'pad' && padStock <= 0)) {
        toast.dismiss(toastId);
        toast.error('❌ Out of stock', {
          description: `Sorry, we're out of ${actualProductType}s right now`,
          duration: 5000
        });
        return;
      }
      
      console.log(`[Motor] Dispensing product: ${actualProductType}`);
      
      // Check if still authenticated right before making the API call
      if (!profileId) {
        console.info('Authentication lost before API call');
        toast.dismiss(toastId);
        toast.info('⏰ Session expired', {
          description: 'Your session has timed out. Please log in again.',
          duration: 5000
        });
        setTimeout(() => router.push('/lock'), 1000);
        return;
      }
      
      // Debug what's happening
      console.log(`Sending dispense request to ${window.location.origin}/api/dispense`);
      console.log('Request payload:', { productType: actualProductType, profileId });
      
      // Use a more robust fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Send dispense request to API with window.location.origin for port consistency
      const response = await fetch(`${window.location.origin}/api/dispense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productType: actualProductType,
          profileId: profileId
        }),
        credentials: 'include',
        signal: controller.signal
      }).catch(fetchError => {
        clearTimeout(timeoutId);
        console.error('Fetch error:', fetchError);
        if (fetchError.name === 'AbortError') {
          toast.dismiss(toastId);
          toast.error('❌ Connection timeout', {
            description: 'The server took too long to respond. Please try again.',
            duration: 5000
          });
          throw new Error('Connection timeout');
        }
        toast.dismiss(toastId);
        toast.error('❌ Connection error', {
          description: 'Unable to connect to the server. Please try again.',
          duration: 5000
        });
        throw fetchError;
      });
      
      // Clear timeout since fetch succeeded
      clearTimeout(timeoutId);
      
      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          console.info('Session timeout detected - redirecting to login');
          toast.dismiss(toastId);
          toast.info('⏰ Session expired', {
            description: 'Your session has timed out. Please log in again.',
            duration: 5000
          });
          
          // Redirect to lock screen
          setTimeout(() => {
            router.push('/lock');
          }, 1000);
          
          return;
        } else {
          // Handle other HTTP errors
          const errorText = await response.text();
          console.error(`HTTP error ${response.status}: ${errorText}`);
          toast.dismiss(toastId);
          toast.error('❌ Server error', {
            description: `Server error (${response.status}). Please try again.`,
            duration: 5000
          });
          throw new Error(`Server error: ${response.status}`);
        }
      }
      
      // Parse JSON from response
      const result = await response.json().catch(error => {
        console.error('Error parsing JSON response:', error);
        toast.dismiss(toastId);
        toast.error('❌ Data error', {
          description: 'Invalid response from server. Please try again.',
          duration: 5000
        });
        throw new Error('Invalid JSON response');
      });
      
      if (result.success) {
        // Update the toast with success message
        toast.dismiss(toastId);
        toast.success('✅ Product dispensed', {
          description: `Your ${actualProductType} has been dispensed successfully`,
          duration: 5000
        });
        
        // Update local stock display
        if (actualProductType === 'tampon') {
          setTamponStock(prev => Math.max(0, prev - 1));
        } else if (actualProductType === 'pad') {
          setPadStock(prev => Math.max(0, prev - 1));
        }
        
        // Show success screen
        setDispensedProduct(actualProductType);
        setShowSuccess(true);
        
        // Refresh inventory
        loadInventory();
        
        // Reset session timeout by triggering activity
        if (handleActivity) handleActivity();
      } else {
        console.error('Failed to dispense product:', result.error);
        toast.dismiss(toastId);
        toast.error('❌ Dispense failed', {
          description: result.error || 'Unable to dispense product',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error in product selection:', error);
      toast.dismiss(toastId);
      toast.error('❌ System error', {
        description: 'Unable to communicate with dispense service',
        duration: 5000
      });
    } finally {
      // Reset processing flags
      setIsDispensing(false);
      isProcessingRef.current = false;
    }
  };
  
  // Simple function to check if user is authenticated locally
  const isAuthenticated = () => {
    return !!profileId; // Just check if we have a profile ID locally
  };

  // Function to return to product selection
  const handleReturnToSelection = () => {
    setShowSuccess(false);
    setDispensedProduct(null);
    // Reset session timeout by triggering activity
    if (handleActivity) handleActivity();
  };
  
  return (
    <div className="w-full max-w-md">
      {showSuccess && dispensedProduct ? (
        // Success screen
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md text-center">
          <div className="mb-6 text-6xl">✅</div>
          <h2 className="text-2xl font-semibold mb-4">Success!</h2>
          <p className="text-gray-700 mb-6">
            Your {dispensedProduct} has been dispensed successfully.
          </p>
          <button
            onClick={handleReturnToSelection}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Return to Selection
          </button>
        </div>
      ) : isLoading ? (
        <div className="text-center py-8">
          <p>Loading inventory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 auto-rows-[1fr]">
          <ProductCard
            imageUrl="/tampon.png"
            name="Tampons"
            stock={tamponStock}
            maxStock={50}
            onClick={() => handleProductSelect('tampons')}
            disabled={tamponStock <= 0 || isDispensing}
          />
          <ProductCard
            imageUrl="/pad.png"
            name="Sanitary Pads"
            stock={padStock}
            maxStock={50}
            onClick={() => handleProductSelect('pads')}
            disabled={padStock <= 0 || isDispensing}
          />
        </div>
      )}
    </div>
  );
}
