'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-100 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          We're sorry, but the page you're looking for doesn't exist.
        </p>
        <div className="flex justify-center">
          <Link 
            href="/lock"
            className="px-4 py-2 bg-[#ff66c4] text-white rounded-md hover:bg-pink-600 transition-colors"
          >
            Return to Lock Screen
          </Link>
        </div>
      </div>
    </div>
  );
}
