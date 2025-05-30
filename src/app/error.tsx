'use client';

// Error Component - Default Error Page for App Router
'use client';

import React from 'react';
import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Page error:', error);
  }, [error]);

  // Extract useful information from the error
  const isSerializationError = error.message?.includes('Error serializing');
  const isClientComponentError = error.message?.includes('Client Component');
  const isCircularStructureError = error.message?.includes('circular structure');

  return (
    <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Something went wrong!</h1>
      
      <p className="text-lg mb-2">
        {error.message || 'An unexpected error occurred'}
      </p>
      
      {isSerializationError && (
        <div className="text-amber-700 mb-4 p-2 bg-amber-50 rounded max-w-2xl">
          <p className="font-semibold">Serialization Error Detected</p>
          <p className="text-sm">
            This is likely caused by attempting to pass data that cannot be serialized between the server and client.
            Common causes include circular references or attempting to pass Node.js specific objects to the client.
          </p>
        </div>
      )}
      
      {isClientComponentError && (
        <div className="text-amber-700 mb-4 p-2 bg-amber-50 rounded max-w-2xl">
          <p className="font-semibold">Client Component Error</p>
          <p className="text-sm">
            A server-only module or component is being imported in a client component.
            Check any imports of server-side libraries like serialport, fs, or os.
          </p>
        </div>
      )}
      
      {isCircularStructureError && (
        <div className="text-amber-700 mb-4 p-2 bg-amber-50 rounded max-w-2xl">
          <p className="font-semibold">Circular Reference Detected</p>
          <p className="text-sm">
            There's a circular reference in the data structure that Next.js is trying to serialize.
            Check your state objects and ensure they don't reference each other circularly.
          </p>
        </div>
      )}
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Try again
        </button>
        <Link href="/lock" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition">
          Return to Lock Screen
        </Link>
      </div>
      
      <div className="w-full max-w-2xl p-4 bg-gray-100 rounded overflow-auto text-left">
        <details>
          <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
          <div className="mt-2 text-xs">
            <p><strong>Error Digest:</strong> {error.digest || 'No digest available'}</p>
            <pre className="whitespace-pre-wrap break-all text-sm mt-2 p-2 bg-gray-200 rounded">{error.stack}</pre>
          </div>
        </details>
      </div>
    </div>
  );
}
