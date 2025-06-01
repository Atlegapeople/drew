'use client';

import { useEffect, useState } from 'react';
// Global touch sounds now handle all interactions

export default function ErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasError, setHasError] = useState(false);
  // Using global touch sounds instead of individual button sounds

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Application error:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-red-50">
        <div className="p-6 bg-white rounded-lg shadow-lg border border-red-100 max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-700 mb-6">
            We're sorry, but there was an error loading this page. Please try refreshing or returning to the home screen.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => {
                setHasError(false);
                window.location.href = '/';
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Return to Lock Screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
