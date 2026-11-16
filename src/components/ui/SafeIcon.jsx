import React from 'react';

/**
 * Universal Safe Icon Renderer
 * Prevents Minified React error #130 ("args[]=object")
 * 
 * Supports:
 * - Pre-rendered React elements: React.isValidElement(icon)
 * - Functional components & ForwardRef icons: typeof icon === 'function' || icon.$$typeof
 * - Graceful fallback or null for plain objects / undefined
 */
export function SafeIcon({ icon, fallback: Fallback = null, className = '', ...rest }) {
  if (!icon && !Fallback) return null;

  if (React.isValidElement(icon)) {
    return React.cloneElement(icon, {
      className: `${icon.props.className || ''} ${className}`.trim(),
      ...rest,
    });
  }

  if (typeof icon === 'function' || (icon && typeof icon === 'object' && icon.$$typeof)) {
    const Component = icon;
    return <Component className={className} {...rest} />;
  }

  if (Fallback) {
    if (React.isValidElement(Fallback)) {
      return React.cloneElement(Fallback, {
        className: `${Fallback.props.className || ''} ${className}`.trim(),
        ...rest,
      });
    }
    if (typeof Fallback === 'function' || (Fallback && typeof Fallback === 'object' && Fallback.$$typeof)) {
      const FallbackComponent = Fallback;
      return <FallbackComponent className={className} {...rest} />;
    }
  }

  return null;
}

export default SafeIcon;
