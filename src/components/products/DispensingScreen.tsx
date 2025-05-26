'use client';

export default function DispensingScreen() {
  return (
    <div className="text-center">
      <div className="relative w-24 h-24 mx-auto mb-4">
        <div className="w-full h-full border-6 border-gray-200 border-t-[#ff66c4] rounded-full animate-spin"></div>
      </div>
      <h2 className="text-xl font-bold mb-2 text-gray-800">Dispensing Product...</h2>
      <p className="text-sm text-gray-600">Please wait while your product is being prepared</p>
    </div>
  );
}
