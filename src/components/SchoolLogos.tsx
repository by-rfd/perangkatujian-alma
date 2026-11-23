import React from 'react';
import { SchoolIdentity } from '../types/exam';

export const LogoKemenag: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 100 100" className={className} aria-label="Logo Instansi">
    <polygon
      points="50,6 92,38 76,88 24,88 8,38"
      fill="#15803D"
      stroke="#14532D"
      strokeWidth="3"
    />
    <polygon
      points="50,14 84,41 71,82 29,82 16,41"
      fill="none"
      stroke="#FACC15"
      strokeWidth="2.5"
    />
    <polygon
      points="50,21 54,32 66,32 56,39 60,50 50,43 40,50 44,39 34,32 46,32"
      fill="#FACC15"
    />
    <path
      d="M28,58 Q40,52 50,58 Q60,52 72,58 L70,74 Q58,68 50,74 Q42,68 30,74 Z"
      fill="#FFFFFF"
      stroke="#14532D"
      strokeWidth="1.5"
    />
    <rect x="24" y="75" width="52" height="8" rx="2" fill="#14532D" />
    <text
      x="50"
      y="81"
      textAnchor="middle"
      fill="#FACC15"
      fontSize="5.2"
      fontWeight="700"
      fontFamily="sans-serif"
    >
      IKHLAS BERAMAL
    </text>
  </svg>
);

export const LogoSekolah: React.FC<{ className?: string; title?: string }> = ({
  className = 'w-14 h-14',
  title = 'MADRASAH ALIYAH',
}) => (
  <svg viewBox="0 0 100 100" className={className} aria-label={title}>
    <path
      d="M50,6 L63,16 L80,16 L84,32 L96,44 L88,58 L92,74 L76,82 L64,94 L50,88 L36,94 L24,82 L8,74 L12,58 L4,44 L16,32 L20,16 L37,16 Z"
      fill="#D9F99D"
      stroke="#15803D"
      strokeWidth="3"
    />
    <circle cx="50" cy="50" r="29" fill="#15803D" />
    <circle cx="50" cy="50" r="26" fill="#BEF264" />
    <circle cx="50" cy="40" r="7" fill="#14532D" />
    <path d="M35,54 Q50,47 65,54 L63,68 Q50,62 37,68 Z" fill="#14532D" />
    <path d="M39,57 Q50,52 61,57 L60,65 Q50,60 40,65 Z" fill="#ECFCCB" />
    <text
      x="50"
      y="83"
      textAnchor="middle"
      fill="#14532D"
      fontSize="6.5"
      fontWeight="800"
      fontFamily="sans-serif"
    >
      AL-MA&apos;SUM
    </text>
  </svg>
);

interface LogoSlotProps {
  school: SchoolIdentity;
  className?: string;
}

export const LeftLogo: React.FC<LogoSlotProps> = ({ school, className = 'w-14 h-14' }) =>
  school.leftLogoDataUrl ? (
    <img
      src={school.leftLogoDataUrl}
      alt="Logo Kemenag / Instansi"
      className={`${className} object-contain`}
    />
  ) : (
    <LogoKemenag className={className} />
  );

export const RightLogo: React.FC<LogoSlotProps> = ({ school, className = 'w-14 h-14' }) =>
  school.rightLogoDataUrl ? (
    <img
      src={school.rightLogoDataUrl}
      alt={school.namaSekolah || 'Logo Sekolah'}
      className={`${className} object-contain`}
    />
  ) : (
    <LogoSekolah className={className} title={school.namaSekolah} />
  );

interface OfficialLetterheadProps {
  school: SchoolIdentity;
  title?: string;
  subtitle?: string;
  showAddress?: boolean;
  compact?: boolean;
}

export const OfficialLetterhead: React.FC<OfficialLetterheadProps> = ({
  school,
  title,
  subtitle,
  showAddress = true,
  compact = false,
}) => {
  const logoSize = compact ? 'w-11 h-11' : 'w-16 h-16';
  return (
    <div
      className={`w-full ${compact ? 'pb-2 mb-3' : 'pb-3 mb-4'} border-b-[3px] border-double border-slate-900`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="shrink-0">
          <LeftLogo school={school} className={logoSize} />
        </div>

        <div className="flex-1 text-center leading-tight">
          {title ? (
            <>
              <div
                className={`${compact ? 'text-xs' : 'text-sm'} font-bold uppercase tracking-wide text-slate-900`}
              >
                {title}
              </div>
              {subtitle && (
                <div
                  className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold uppercase text-slate-800 mt-0.5`}
                >
                  {subtitle}
                </div>
              )}
              <div
                className={`${compact ? 'text-sm' : 'text-lg'} font-extrabold uppercase text-slate-950 mt-0.5`}
              >
                {school.namaSekolah}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                {school.namaInstansi}
              </div>
              <div
                className={`${compact ? 'text-sm' : 'text-lg'} font-extrabold uppercase text-slate-950`}
              >
                {school.namaSekolah}
              </div>
            </>
          )}
          <div
            className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold uppercase text-slate-800`}
          >
            TAHUN PELAJARAN {school.tahunPelajaran}
          </div>
          {showAddress && (
            <div className="text-[11px] text-slate-700 mt-0.5">{school.alamat}</div>
          )}
        </div>

        <div className="shrink-0">
          <RightLogo school={school} className={logoSize} />
        </div>
      </div>
    </div>
  );
};
