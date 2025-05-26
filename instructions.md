# D.R.E.W. Vending Machine - Implementation Guide

---

## ✅ Project Overview

The D.R.E.W. (Dignity • Respect • Empowerment for Women) Vending Machine provides dignified access to essential feminine hygiene products. This project converts the static HTML UI into a modern, touch-optimized Next.js application.

---

## ✅ Project Setup

* **Project directory**: `c:/dev/drew`
* **Framework**: Next.js 15.3+ with App Router
* **Styling**: Tailwind CSS 4.0+ (no inline styles)
* **Component Library**: Custom UI components
* **Project Structure**:
  * `/src/app` - Next.js app directory with routes
  * `/src/components` - UI components organized by feature
  * `/src/hooks` - Custom React hooks
  * `/src/lib` - Utility functions and helpers

---

## ✅ Component Structure

Break down the monolithic UI into reusable, responsive components organized by feature:

### Core UI Components (`/src/components/ui`)
* `Header.tsx` – Logo + tagline + system status
* `Footer.tsx` – Footer and emergency contact info
* `Clock.tsx` – Real-time clock display

### Authentication Components (`/src/components/auth`)
* `AuthTabs.tsx` – RFID and PIN tab switcher
* `RFIDScreen.tsx` – RFID animation and prompt
* `PinEntry.tsx` – PIN display and keypad

### Product Components (`/src/components/products`)
* `ProductCard.tsx` – Individual product card
* `ProductSelection.tsx` – Product selection grid
* `DispensingScreen.tsx` – Spinner animation
* `SuccessScreen.tsx` – Dispense success screen

All components should be styled using Tailwind CSS classes only (no inline styles).

## ✅ App Router Structure

Implement the following routes using Next.js App Router:

```
/src/app
  layout.tsx (Root layout with container styles)
  page.tsx (Redirect to /welcome)
  /welcome
    page.tsx (Authentication screen with <AuthTabs />)
  /products
    page.tsx (Product selection with <ProductSelection />)
  /dispensing
    page.tsx (Loading screen with <DispensingScreen />)
  /success
    page.tsx (Confirmation screen with <SuccessScreen />)
```

Each page should be a client component (`'use client'`) to enable client-side interactions.

## ✅ Navigation & State Management

Implement client-side navigation using the Next.js App Router:

```tsx
// Import the router
import { useRouter } from 'next/navigation';

// Use the router to navigate between screens
const router = useRouter();
router.push('/products');
```

Create a custom hook for application state management:

```tsx
// src/hooks/useVendingMachine.ts
export function useVendingMachine() {
  const [pin, setPin] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const router = useRouter();
  
  // Authentication methods
  const authenticateWithRFID = () => {
    // Simulate RFID authentication
    router.push('/products');
  };
  
  const authenticateWithPIN = (pin) => {
    // Validate PIN (4+ digits)
    if (pin.length >= 4) {
      router.push('/products');
    }
  };
  
  // Product selection and dispensing
  const selectProduct = (product) => {
    setSelectedProduct(product);
    router.push('/dispensing');
    
    // Simulate dispensing process
    setTimeout(() => {
      router.push('/success');
      
      // Auto-return to welcome screen
      setTimeout(() => {
        resetState();
        router.push('/welcome');
      }, 5000);
    }, 3000);
  };
  
  const resetState = () => {
    setPin('');
    setSelectedProduct(null);
  };
  
  return {
    pin,
    setPin,
    selectedProduct,
    authenticateWithRFID,
    authenticateWithPIN,
    selectProduct,
    resetState
  };
}
```

## ✅ Touchscreen Optimizations

### Viewport Configuration

In the root layout, add the following meta tag:

```tsx
// src/app/layout.tsx
export const metadata = {
  title: 'D.R.E.W. Vending Machine',
  description: 'Dignity • Respect • Empowerment for Women',
  viewport: 'width=device-width, initial-scale=1.0, user-scalable=no'
};
```

### Touch-Friendly UI Guidelines

1. **Button Sizing**
   - Minimum tap target: `min-w-[44px] min-h-[44px]`
   - Adequate spacing between interactive elements: `gap-4`

2. **Touch Feedback**
   - Add visual feedback: `active:scale-[0.95] transition-transform`
   - Use color changes: `active:bg-primary-700`

3. **Text Selection Prevention**
   - Add to interactive elements: `select-none`
   - For touch manipulation: `touch-manipulation`

4. **Avoid Hover-Only States**
   - Design for touch-first interactions
   - Ensure all hover states have touch equivalents

## ✅ Feature Implementation

### RFID Simulation

Implement in the welcome screen:

```tsx
// src/app/welcome/page.tsx
'use client';

import { useEffect } from 'react';
import { useVendingMachine } from '@/hooks/useVendingMachine';

export default function WelcomePage() {
  const { authenticateWithRFID } = useVendingMachine();
  
  // Simulate RFID scan after 8 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      authenticateWithRFID();
    }, 8000);
    
    return () => clearTimeout(timeout);
  }, []);
  
  // Component JSX...
}
```

### PIN Entry

Implement in the PIN entry component:

```tsx
// src/components/auth/PinEntry.tsx
'use client';

import { useState } from 'react';
import { useVendingMachine } from '@/hooks/useVendingMachine';

export default function PinEntry() {
  const { pin, setPin, authenticateWithPIN } = useVendingMachine();
  
  const addDigit = (digit) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      
      // Auto-submit when PIN is 4+ digits
      if (newPin.length >= 4) {
        authenticateWithPIN(newPin);
      }
    }
  };
  
  const clearPin = () => setPin('');
  
  // Component JSX...
}
```

### Clock Component

Implement a real-time clock:

```tsx
// src/components/ui/Clock.tsx
'use client';

import { useState, useEffect } from 'react';

export default function Clock() {
  const [time, setTime] = useState('');
  
  useEffect(() => {
    // Update time immediately
    updateTime();
    
    // Update time every second
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  
  function updateTime() {
    const now = new Date();
    setTime(now.toLocaleTimeString('en-ZA', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }));
  }
  
  return <div>{time}</div>;
}
```

---

## ✅ Implementation Checklist

### 1. Core Structure
- [ ] Set up root layout with proper viewport meta tags
- [ ] Create redirect from root to welcome page
- [ ] Implement all required routes (welcome, products, dispensing, success)

### 2. Components
- [ ] Create UI components (Header, Footer, Clock)
- [ ] Implement authentication components (AuthTabs, RFIDScreen, PinEntry)
- [ ] Build product selection and dispensing components

### 3. State Management
- [ ] Create useVendingMachine hook for application state
- [ ] Implement navigation flow between screens
- [ ] Add simulated delays for RFID and dispensing

### 4. Styling
- [ ] Apply Tailwind CSS classes for all components
- [ ] Ensure touch-optimized UI with proper tap targets
- [ ] Implement touch feedback and animations

## ✅ Final Deliverables

* A fully functional, modular D.R.E.W. interface built with Next.js 15.3+
* Touch-optimized UI suitable for kiosk deployment
* Complete user flow from authentication to product dispensing
* Clean, maintainable code structure with separation of concerns
* Responsive layout that works on various screen sizes

---

## Getting Started

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Begin implementing components and pages following the structure outlined above
