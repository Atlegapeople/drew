'use client';

// ProductType import removed as it's not used in this component
import Image from 'next/image';
// Using global touch sounds instead of individual button sounds

interface ProductCardProps {
  imageUrl: string;
  name: string;
  stock: number;
  maxStock: number;
  onClick: () => void;
  disabled?: boolean;
}

export default function ProductCard({ 
  imageUrl, 
  name, 
  stock, 
  maxStock,
  onClick,
  disabled = false
}: ProductCardProps) {
  // Using global touch sounds instead of individual button sounds
  
  // Handle click (global touch sound will play automatically)
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };
  return (
    <div className="relative pb-[120%] w-full"> {/* Taller container to prevent overlap */}
      <button 
        className={`absolute inset-0 bg-white rounded-lg p-3 text-center border-2 border-gray-200 shadow-md transition-all ${!disabled ? 'hover:translate-y-[-2px] hover:shadow-lg hover:border-[#ff66c4] active:scale-95' : 'opacity-70 cursor-not-allowed'} select-none touch-manipulation flex flex-col items-center justify-between`}
        onClick={!disabled ? handleClick : undefined}
        disabled={disabled}
      >
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="relative w-[100px] h-[100px]">
            <Image 
              src={imageUrl} 
              alt={`${name} product image`}
              fill
              sizes="100px"
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div className="flex flex-col items-center w-full">
          <div className="text-lg font-bold text-gray-800 mb-1">{name}</div>
          <div className="text-sm text-gray-600 mb-2 tracking-wide">
            {stock} of {maxStock} units available
            {stock === 0 && <div className="text-red-500 font-bold mt-1">Out of Stock</div>}
          </div>
          <div className="bg-gray-100 rounded-md p-2 text-sm font-medium text-center tracking-wide w-full mt-auto">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${stock < maxStock * 0.2 ? 'bg-red-500' : 'bg-[#ff66c4]'}`} 
                style={{ width: `${Math.min(100, (stock / maxStock) * 100)}%` }}
              ></div>
            </div>
            <div className="mt-1 text-xs">
              {Math.round((stock / maxStock) * 100)}% remaining
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
