import React from 'react';

export const Badge = ({
  variant = 'emerald',
  size = 'md',
  dot = false,
  children,
  className = '',
  ...rest
}) => {
  const variantStyles = {
    success: {
      wrapper: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    emerald: {
      wrapper: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
      dot: 'bg-emerald-600',
    },
    warning: {
      wrapper: 'bg-amber-50 text-amber-800 border border-amber-200/80',
      dot: 'bg-amber-500',
    },
    error: {
      wrapper: 'bg-rose-50 text-rose-800 border border-rose-200/80',
      dot: 'bg-rose-500',
    },
    info: {
      wrapper: 'bg-blue-50 text-blue-800 border border-blue-200/80',
      dot: 'bg-blue-500',
    },
    gold: {
      wrapper: 'bg-gradient-to-r from-amber-100 via-amber-200 to-yellow-100 text-amber-950 border border-amber-300 shadow-sm font-semibold',
      dot: 'bg-amber-600',
    },
    navy: {
      wrapper: 'bg-slate-900 text-slate-100 border border-slate-700',
      dot: 'bg-blue-400',
    },
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  const currentVariant = variantStyles[variant] || variantStyles.emerald;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      className={`inline-flex items-center rounded-full transition-colors select-none ${currentVariant.wrapper} ${currentSize} ${className}`}
      {...rest}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentVariant.dot}`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${currentVariant.dot}`}
          />
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
