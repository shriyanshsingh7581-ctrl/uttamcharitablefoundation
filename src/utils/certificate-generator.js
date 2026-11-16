import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Helper to trigger file download in browser
 * @param {Blob} blob 
 * @param {string} filename 
 */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Generate ultra-high resolution (Scale: 3, 300 DPI) PNG blob of the Puraskar Certificate
 * @param {React.RefObject | HTMLElement} elementRef 
 * @returns {Promise<Blob>}
 */
export async function generateCertificatePNG(elementRef) {
  const element = elementRef?.current || elementRef;
  if (!element) {
    throw new Error('Certificate element not found');
  }

  // Ensure all fonts and images are fully settled
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 3, // Ultra-High Resolution 3x for Retina & Crisp Print
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#fdf8f0', // Cream parchment
    logging: false,
    imageTimeout: 20000,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create PNG blob from Certificate canvas'));
      }
    }, 'image/png', 1.0);
  });
}

/**
 * Generate and trigger download of Certificate as landscape A4 print-ready PDF (Scale: 3)
 * @param {React.RefObject | HTMLElement} elementRef 
 * @param {string} certificateTitle 
 * @returns {Promise<jsPDF>}
 */
export async function generateCertificatePDF(elementRef, certificateTitle = 'Certificate') {
  const element = elementRef?.current || elementRef;
  if (!element) {
    throw new Error('Certificate element not found');
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 3, // Ultra-High Resolution 3x
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#fdf8f0',
    logging: false,
    imageTimeout: 20000,
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  // Landscape A4 orientation
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm

  // Margin of 8mm
  const margin = 8;
  const availableWidth = pageWidth - (margin * 2);
  const availableHeight = pageHeight - (margin * 2);

  const imgRatio = canvas.width / canvas.height;
  let finalWidth = availableWidth;
  let finalHeight = finalWidth / imgRatio;

  if (finalHeight > availableHeight) {
    finalHeight = availableHeight;
    finalWidth = finalHeight * imgRatio;
  }

  const x = (pageWidth - finalWidth) / 2;
  const y = (pageHeight - finalHeight) / 2;

  // Background fill matching parchment
  pdf.setFillColor(253, 248, 240);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');

  const safeTitle = (certificateTitle || 'Certificate')
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const filename = `${safeTitle}.pdf`;
  pdf.save(filename);

  return pdf;
}
