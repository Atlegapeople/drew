'use client';

// ProductType import removed as it's not used in this component
import Image from 'next/image';

interface ProductCardProps {
  imageUrl: string;
  name: string;
  stock: number;
  used: number;
  quota: number;
  onClick: () => void;
}

export default function ProductCard({ 
  imageUrl, 
  name, 
  stock, 
  used, 
  quota,
  onClick
}: ProductCardProps) {
  return (
    <div className="relative pb-[100%] w-full"> {/* This creates a perfect square container */}
      <button 
        className="absolute inset-0 bg-white rounded-lg p-5 text-center border-2 border-gray-200 shadow-md transition-all hover:translate-y-[-2px] hover:shadow-lg hover:border-[#ff66c4] active:scale-95 select-none touch-manipulation flex flex-col items-center justify-between"
        onClick={onClick}
      >
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="relative w-[120px] h-[120px]">
            <Image 
              src={imageUrl} 
              alt={`${name} product image`}
              fill
              sizes="120px"
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div className="flex flex-col items-center w-full">
          <div className="text-xl font-bold text-gray-800 mb-2">{name}</div>
          <div className="text-sm text-gray-600 mb-3 tracking-wide">{stock} units available</div>
          <div className="bg-gray-100 rounded-md p-3 text-sm text-gray-700 w-full font-medium text-center tracking-wide">
            {used}/{quota} used this month
          </div>
        </div>
      </button>
    </div>
  );
}
