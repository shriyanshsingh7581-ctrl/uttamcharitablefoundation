import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import SafeIcon from './SafeIcon';

export const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon: Icon,
      iconRight: IconRight,
      fullWidth = false,
      className = '',
      type = 'button',
      onClick,
      ...rest
    },
    ref
  ) => {
    // Size variants
    const sizeClasses = {
      sm: 'px-3.5 py-1.5 text-xs rounded-lg gap-1.5',
      md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
      lg: 'px-6 py-3.5 text-base rounded-xl gap-2.5 font-bold',
    };

    // Color & Style variants
    const variantClasses = {
      primary:
        'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-700/20 focus:ring-emerald-500',
      secondary:
        'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-700/20 focus:ring-blue-500',
      outline:
        'border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 bg-transparent focus:ring-emerald-500',
      ghost:
        'text-emerald-700 hover:bg-emerald-50/80 active:bg-emerald-100 bg-transparent focus:ring-emerald-500',
      danger:
        'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-md shadow-red-600/20 focus:ring-red-500',
      gold:
        'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-slate-950 font-bold shadow-md shadow-amber-500/25 focus:ring-amber-500',
    };

    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={isDisabled}
        onClick={onClick}
        whileTap={!isDisabled ? { scale: 0.97 } : undefined}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className={`inline-flex items-center justify-center font-semibold transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 select-none ${
          sizeClasses[size] || sizeClasses.md
        } ${variantClasses[variant] || variantClasses.primary} ${
          fullWidth ? 'w-full' : ''
        } ${
          isDisabled
            ? 'opacity-60 cursor-not-allowed filter grayscale-[20%]'
            : 'cursor-pointer hover:shadow-lg'
        } ${className}`}
        {...rest}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{typeof children === 'string' ? 'Processing...' : children}</span>
          </>
        ) : (
          <>
            {Icon && <SafeIcon icon={Icon} className="w-4 h-4 shrink-0" />}
            {children}
            {IconRight && <SafeIcon icon={IconRight} className="w-4 h-4 shrink-0" />}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
