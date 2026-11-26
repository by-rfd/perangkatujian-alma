import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { exportElementsToPdf } from '../utils/pdfExport';

interface PdfDownloadButtonProps {
  filename: string;
  orientation: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'F4';
  marginMm?: number;
  getPageElements: () => HTMLElement[];
  prepareBeforeExport?: () => Promise<void> | void;
  disabled?: boolean;
  label?: string;
  variant?: 'secondary' | 'primary';
}

export const PdfDownloadButton: React.FC<PdfDownloadButtonProps> = ({
  filename,
  orientation,
  paperSize = 'A4',
  marginMm = 6,
  getPageElements,
  prepareBeforeExport,
  disabled = false,
  label = 'Unduh PDF',
  variant = 'secondary',
}) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const handleDownload = async () => {
    if (busy || disabled) return;
    setBusy(true);
    setProgress(null);
    try {
      if (prepareBeforeExport) {
        await prepareBeforeExport();
      }
      const elements = getPageElements();
      if (elements.length === 0) return;

      await exportElementsToPdf({
        pageElements: elements,
        filename,
        orientation,
        paperSize,
        marginMm,
        onProgress: (cur, total) => {
          setProgress(total > 1 ? `${cur}/${total}` : null);
        },
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const cls =
    variant === 'primary'
      ? 'inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl whitespace-nowrap transition-colors'
      : 'inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 rounded-xl whitespace-nowrap transition-colors';

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={busy || disabled}
      className={cls}
    >
      {busy ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{progress ? `PDF ${progress}...` : 'Membuat PDF...'}</span>
        </>
      ) : (
        <>
          <FileDown className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
