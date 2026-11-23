import React from 'react';

export type PrintOrientation = 'landscape' | 'portrait';
export type PrintPaperSize = 'A4' | 'F4';

interface PrintPageConfigProps {
  orientation: PrintOrientation;
  paperSize?: PrintPaperSize;
  marginMm?: number;
}

/**
 * Injects an explicit @page size rule for the active printable view so browsers
 * default the Print dialog to the requested paper size (A4 / F4) and orientation.
 */
export const PrintPageConfig: React.FC<PrintPageConfigProps> = ({
  orientation,
  paperSize = 'A4',
  marginMm = 8,
}) => {
  const sizeRule =
    paperSize === 'F4'
      ? orientation === 'landscape'
        ? '330mm 215mm'
        : '215mm 330mm'
      : `A4 ${orientation}`;

  return (
    <style>{`
      @media print {
        @page {
          size: ${sizeRule};
          margin: ${marginMm}mm;
        }
      }
    `}</style>
  );
};

interface PrintOrientationToggleProps {
  value: PrintOrientation;
  onChange: (orientation: PrintOrientation) => void;
  paperLabel?: PrintPaperSize;
}

export const PrintOrientationToggle: React.FC<PrintOrientationToggleProps> = ({
  value,
  onChange,
  paperLabel = 'A4',
}) => (
  <div
    className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200/80 rounded-xl"
    role="group"
    aria-label={`Orientasi cetak kertas ${paperLabel}`}
  >
    <button
      type="button"
      onClick={() => onChange('landscape')}
      className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-[10px] transition-all whitespace-nowrap ${
        value === 'landscape'
          ? 'bg-white text-emerald-800 shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {paperLabel} Landscape
    </button>
    <button
      type="button"
      onClick={() => onChange('portrait')}
      className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-[10px] transition-all whitespace-nowrap ${
        value === 'portrait'
          ? 'bg-white text-emerald-800 shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {paperLabel} Portrait
    </button>
  </div>
);
