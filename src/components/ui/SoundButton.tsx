import React, { ButtonHTMLAttributes, ReactNode } from 'react';
// Using global touch sounds instead of individual button sounds
import clsx from 'clsx';

/**
 * Props for the SoundButton component
 */
interface SoundButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

/**
 * A button component that plays a click sound when pressed
 * Consistent with D.R.E.W. branding colors and design
 */
const SoundButton = React.forwardRef<HTMLButtonElement, SoundButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md',
    fullWidth = false, 
    className = '',
    disabled = false,
    type = 'button',
    onClick,
    ...props 
  }, ref) => {
    // Handle click with sound
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Global touch sounds will handle the click sound (only when button isn't disabled)
    if (onClick && !disabled) {
      onClick(e);
    }
  };
    
    // Button styling based on variant and size
    const buttonClasses = clsx(
      'rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
      {
        // Variants
        'bg-[#ff66c4] hover:bg-[#ff4db8] text-white focus:ring-pink-500': variant === 'primary',
        'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-400': variant === 'secondary',
        'bg-transparent border border-[#ff66c4] text-[#ff66c4] hover:bg-pink-50 focus:ring-pink-500': variant === 'outline',
        'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500': variant === 'danger',
        
        // Sizes
        'px-3 py-1 text-sm': size === 'sm',
        'px-4 py-2': size === 'md',
        'px-6 py-3 text-lg': size === 'lg',
        
        // Width
        'w-full': fullWidth,
        
        // Disabled state
        'opacity-50 cursor-not-allowed': disabled,
      },
      className
    );
    
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={disabled}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);

SoundButton.displayName = 'SoundButton';

export default SoundButton;
