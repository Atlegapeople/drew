'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-pink-50">
          <div className="p-6 bg-white rounded-lg shadow-lg border border-pink-100 max-w-md w-full">
            <h2 className="text-2xl font-bold text-pink-600 mb-4">Server Error</h2>
            <p className="text-gray-700 mb-6">
              We're sorry, but something went wrong on our server. Please try again later.
            </p>
            <div className="flex justify-center">
              <button
                onClick={reset}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
