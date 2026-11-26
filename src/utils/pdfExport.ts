import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export interface ExportPdfOptions {
  pageElements: HTMLElement[];
  filename: string;
  orientation: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'F4';
  marginMm?: number;
  onProgress?: (current: number, total: number) => void;
}

export async function exportElementsToPdf({
  pageElements,
  filename,
  orientation,
  paperSize = 'A4',
  marginMm = 6,
  onProgress,
}: ExportPdfOptions): Promise<void> {
  if (pageElements.length === 0) return;

  const format: 'a4' | [number, number] = paperSize === 'F4' ? [215, 330] : 'a4';
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
    compress: true,
  });

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const printableW = pageWidthMm - marginMm * 2;
  const printableH = pageHeightMm - marginMm * 2;

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    onProgress?.(i + 1, pageElements.length);

    // Yield briefly to UI thread so progress indicator updates smoothly
    await new Promise((r) => setTimeout(r, 10));

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: Math.max(el.scrollWidth, orientation === 'landscape' ? 1120 : 820),
      onclone: (clonedDoc, clonedEl) => {
        clonedEl.querySelectorAll('.no-print').forEach((node) => node.remove());
        clonedEl.classList.remove('hidden', 'shadow-sm', 'rounded-xl', 'rounded-2xl');
        clonedEl.style.boxShadow = 'none';
        clonedEl.style.borderRadius = '0';
        clonedEl.style.border = 'none';
        clonedEl.style.backgroundColor = '#ffffff';
        clonedEl.style.margin = '0 auto';

        // Ensure hidden print-only sub-blocks inside cloned view become visible
        clonedEl.querySelectorAll('.hidden.print\\:block').forEach((node) => {
          node.classList.remove('hidden');
          (node as HTMLElement).style.display = 'block';
        });

        // Clean outer container padding slightly so content maximizes paper area cleanly
        void clonedDoc;
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.94);
    const imgRatio = canvas.width / Math.max(1, canvas.height);
    const targetRatio = printableW / printableH;

    let renderW = printableW;
    let renderH = printableW / imgRatio;
    if (imgRatio < targetRatio) {
      renderH = printableH;
      renderW = printableH * imgRatio;
    }

    const offsetX = marginMm + (printableW - renderW) / 2;
    const offsetY = marginMm;

    if (i > 0) {
      pdf.addPage(format, orientation);
    }

    pdf.addImage(imgData, 'JPEG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');
  }

  const safeName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(safeName);
}
