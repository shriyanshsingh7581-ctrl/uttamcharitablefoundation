import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

export const GlassCard = forwardRef(
  (
    {
      children,
      className = '',
      hover = false,
      gradient = false,
      dark = false,
      onClick,
      ...rest
    },
    ref
  ) => {
    // Base styling with refined specular reflections and dual shadows
    const baseStyles = 'rounded-3xl backdrop-blur-2xl transition-all duration-300';

    // Variant styling
    let variantStyles = '';
    if (dark) {
      variantStyles = gradient
        ? 'bg-gradient-to-br from-slate-900/90 via-emerald-950/85 to-slate-950/90 text-white border border-emerald-500/30 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6),inset_0_1px_1px_0_rgba(255,255,255,0.2)]'
        : 'bg-slate-900/80 text-white border border-white/12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.18)]';
    } else {
      variantStyles = gradient
        ? 'bg-gradient-to-br from-white/90 via-emerald-50/70 to-teal-50/60 text-slate-900 border border-white/90 shadow-[0_20px_45px_-15px_rgba(16,185,129,0.12),inset_0_1px_2px_0_rgba(255,255,255,1)]'
        : 'bg-white/85 text-slate-900 border border-white/85 shadow-[0_20px_45px_-15px_rgba(15,23,42,0.07),inset_0_1px_1px_0_rgba(255,255,255,0.95)]';
    }

    const hoverClasses = hover
      ? dark
        ? 'cursor-pointer hover:bg-slate-900/95 hover:border-emerald-400/50 hover:shadow-[0_35px_65px_-15px_rgba(16,185,129,0.3)] hover:-translate-y-1'
        : 'cursor-pointer hover:bg-white/95 hover:border-emerald-500/40 hover:shadow-[0_30px_60px_-15px_rgba(16,185,129,0.16)] hover:-translate-y-1'
      : '';

    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { scale: 1.015, y: -2 } : undefined}
        whileTap={hover || onClick ? { scale: 0.99 } : undefined}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        onClick={onClick}
        className={`${baseStyles} ${variantStyles} ${hoverClasses} ${className}`}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
