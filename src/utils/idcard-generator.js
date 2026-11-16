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
 * Generate ultra-high resolution (Scale: 3, 300 DPI) PNG blob of the ID card
 * Configured with useCORS: true to support Google Sign-in profile avatars without cross-origin taint
 * @param {React.RefObject | HTMLElement} elementRef 
 * @returns {Promise<Blob>}
 */
export async function generateIDCardPNG(elementRef) {
  const element = elementRef?.current || elementRef;
  if (!element) {
    throw new Error('ID Card element not found');
  }

  // Ensure fonts and images are fully rendered
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 3, // Retina 3x Ultra-High Resolution
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 20000,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create PNG blob from ID card canvas'));
      }
    }, 'image/png', 1.0);
  });
}

/**
 * Generate and trigger download of ID card as crisp print-ready PDF (Scale: 3)
 * @param {React.RefObject | HTMLElement} elementRef 
 * @param {string} memberName 
 * @param {string} memberId 
 * @returns {Promise<jsPDF>}
 */
export async function generateIDCardPDF(elementRef, memberName = 'member', memberId = '') {
  const element = elementRef?.current || elementRef;
  if (!element) {
    throw new Error('ID Card element not found');
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 3, // Ultra-High Resolution 3x
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 20000,
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  // Vertical/portrait ID Card dimensions
  // Standard badge width in mm: 85.6mm (CR80 standard ID card width)
  const cardWidthMm = 85.6;
  const cardHeightMm = (canvas.height / canvas.width) * cardWidthMm;
  const marginMm = 6;
  const pdfWidth = cardWidthMm + (marginMm * 2);
  const pdfHeight = cardHeightMm + (marginMm * 2);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
    compress: true,
  });

  // Clean white background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

  // Center image on the page
  pdf.addImage(imgData, 'PNG', marginMm, marginMm, cardWidthMm, cardHeightMm, undefined, 'FAST');

  const safeIdentifier = (memberId || memberName || 'idcard')
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const filename = `${safeIdentifier}-idcard.pdf`;
  pdf.save(filename);

  return pdf;
}
