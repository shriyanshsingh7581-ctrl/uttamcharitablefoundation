import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showClose = true,
  footer,
  className = '',
}) => {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-x-hidden overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Modal Container / Bottom Sheet on mobile */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 140) {
                onClose();
              }
            }}
            className={`relative w-full ${sizeClasses[size] || sizeClasses.md} bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-gray-100 ${className}`}
          >
            {/* Mobile swipe handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-stone-50/70">
                <div>
                  {title && (
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h3>
                  )}
                  {subtitle && (
                    <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                  )}
                </div>
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-colors focus:outline-none"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1 overscroll-contain">
              {children}
            </div>

            {/* Optional Footer */}
            {footer && (
              <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
