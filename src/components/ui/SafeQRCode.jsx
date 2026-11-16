import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Local Zero-Network Vector QR Code Component
 * Renders crisp, offline-safe, CORS-free SVG QR codes via qrcode.react
 * so html2canvas (allowTaint: false) & A4 prints stay sharp at 300+ DPI.
 */
export default function SafeQRCode({
  value,
  size = 120,
  className = '',
  fgColor = '#000000',
  bgColor = '#ffffff',
  level = 'M',
}) {
  const qrValue = String(value || 'https://www.ucwf.online').trim() || 'https://www.ucwf.online';
  const numericSize = Math.max(32, Number(size) || 120);

  return (
    <div
      className={`inline-flex items-center justify-center overflow-hidden ${className}`}
      style={{
        width: numericSize,
        height: numericSize,
        backgroundColor: bgColor || '#ffffff',
      }}
    >
      <QRCodeSVG
        value={qrValue}
        size={numericSize}
        fgColor={fgColor || '#000000'}
        bgColor={bgColor || '#ffffff'}
        level={level}
        includeMargin={false}
      />
    </div>
  );
}

export { SafeQRCode };
