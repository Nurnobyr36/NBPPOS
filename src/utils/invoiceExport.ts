import { toJpeg, toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';

// Options to ignore cross-origin Google Fonts stylesheets that trigger CORS "Cannot access rules" security errors
const htmlToImageOptions = {
  skipFonts: true,
  filter: (domNode: HTMLElement) => {
    // Exclude anything explicitly marked with no-print or script tags
    if (domNode.classList && domNode.classList.contains('no-print')) {
      return false;
    }
    return true;
  },
};

export async function generateInvoiceImage(
  elementId: string,
  quality = 0.95,
  pixelRatio = 2
): Promise<string> {
  const node = document.getElementById(elementId);
  if (!node) throw new Error('Invoice element not found');

  return await toJpeg(node, {
    ...htmlToImageOptions,
    quality,
    pixelRatio,
    backgroundColor: '#ffffff',
    style: {
      transform: 'none',
      margin: '0 auto',
    },
  });
}

export async function generateInvoiceBlob(
  elementId: string,
  quality = 0.95,
  pixelRatio = 2
): Promise<Blob> {
  const node = document.getElementById(elementId);
  if (!node) throw new Error('Invoice element not found');

  const blob = await toBlob(node, {
    ...htmlToImageOptions,
    quality,
    pixelRatio,
    backgroundColor: '#ffffff',
    style: {
      transform: 'none',
      margin: '0 auto',
    },
  });

  if (!blob) throw new Error('Failed to create image blob');
  return blob;
}

export async function downloadInvoiceJpg(
  elementId: string,
  fileName: string
): Promise<void> {
  const dataUrl = await generateInvoiceImage(elementId);
  const link = document.createElement('a');
  link.download = fileName.endsWith('.jpg') ? fileName : `${fileName}.jpg`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadInvoicePdf(
  elementId: string,
  fileName: string,
  format: 'digital' | 'thermal-80' | 'thermal-58' | 'corporate-a4'
): Promise<Blob> {
  const node = document.getElementById(elementId);
  if (!node) throw new Error('Invoice element not found');

  const dataUrl = await generateInvoiceImage(elementId, 0.95, 2);
  const rect = node.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  let pdf: jsPDF;

  if (format === 'corporate-a4') {
    // Standard A4 portrait in mm: 210 x 297
    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (height * pdfWidth) / width;
    pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  } else {
    // Fit to exact dimensions in px/pt
    pdf = new jsPDF({
      orientation: height > width ? 'portrait' : 'landscape',
      unit: 'px',
      format: [width, height],
      hotfixes: ['px_scaling'],
    });
    pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
  }

  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  pdf.save(cleanFileName);

  return pdf.output('blob');
}

export async function shareInvoiceFile(
  elementId: string,
  fileType: 'jpg' | 'pdf',
  invoiceNo: string,
  shopName: string,
  format: 'digital' | 'thermal-80' | 'thermal-58' | 'corporate-a4'
): Promise<'shared' | 'downloaded' | 'unsupported'> {
  const fileName = `Invoice_${invoiceNo}.${fileType}`;

  if (fileType === 'jpg') {
    const blob = await generateInvoiceBlob(elementId);
    const file = new File([blob], fileName, { type: 'image/jpeg' });

    if (
      navigator.canShare &&
      navigator.canShare({ files: [file] }) &&
      navigator.share
    ) {
      try {
        await navigator.share({
          files: [file],
          title: `ইনভয়েস #${invoiceNo}`,
          text: `${shopName} - ইনভয়েস #${invoiceNo}`,
        });
        return 'shared';
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return 'shared'; // User cancelled share dialog, no need to force download
        }
      }
    }

    // Fallback: direct download
    await downloadInvoiceJpg(elementId, fileName);
    return 'downloaded';
  } else {
    // PDF sharing
    const pdfBlob = await downloadInvoicePdf(elementId, fileName, format);
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (
      navigator.canShare &&
      navigator.canShare({ files: [file] }) &&
      navigator.share
    ) {
      try {
        await navigator.share({
          files: [file],
          title: `ইনভয়েস #${invoiceNo}`,
          text: `${shopName} - ইনভয়েস #${invoiceNo}`,
        });
        return 'shared';
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return 'shared';
        }
      }
    }

    return 'downloaded';
  }
}
