import React from 'react';

export const LoadingSpinner = ({
  size = 'md',
  text,
  fullScreen = false,
  className = '',
}) => {
  const sizeMap = {
    sm: {
      spinner: 'w-5 h-5 border-2',
      text: 'text-xs',
    },
    md: {
      spinner: 'w-10 h-10 border-3',
      text: 'text-sm',
    },
    lg: {
      spinner: 'w-16 h-16 border-4',
      text: 'text-base font-semibold',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* Animated gradient spinner */}
      <div className="relative">
        <div
          className={`${currentSize.spinner} rounded-full border-emerald-200 border-t-emerald-600 border-r-emerald-500 animate-spin`}
          style={{ borderTopColor: '#059669', borderRightColor: '#10b981' }}
        />
        <div
          className={`absolute inset-0 ${currentSize.spinner} rounded-full border-amber-400 border-b-transparent border-l-transparent animate-spin opacity-40`}
          style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
        />
      </div>

      {/* Optional loading text */}
      {text && (
        <p className={`text-emerald-900 font-medium animate-pulse ${currentSize.text}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-50/80 backdrop-blur-md">
        <div className="bg-white/90 p-8 rounded-3xl shadow-2xl border border-emerald-100 flex flex-col items-center max-w-xs text-center">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
