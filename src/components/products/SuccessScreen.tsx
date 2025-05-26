'use client';

export default function SuccessScreen() {
  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-[#ff66c4] rounded-full mx-auto mb-4 flex items-center justify-center text-4xl text-white animate-[checkmark_0.6s_ease-in-out]">
        ✓
      </div>
      <h2 className="text-xl font-bold mb-2 text-gray-800">Product Dispensed Successfully</h2>
      <p className="text-sm text-gray-600 mb-3">Please collect your product from the dispenser below</p>
      
      <p className="text-xs text-gray-500 mt-2">Thank you for using D.R.E.W.</p>
      
      {/* Animated down arrow pointing to product drawer */}
      <div className="mt-6 mb-0 relative">
        <div className="w-24 h-24 mx-auto">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#ff66c4" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="w-full h-full animate-bounce"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes checkmark {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
