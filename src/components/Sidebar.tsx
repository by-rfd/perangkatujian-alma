import React from 'react';
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Database,
  DoorClosed,
  FileSpreadsheet,
  FileText,
  Grid2X2,
  Home,
  IdCard,
  LayoutGrid,
  ScrollText,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { TabId } from '../types/exam';
import { LogoSekolah } from './SchoolLogos';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  schoolShortName: string;
  examAbbr: string;
  logoDataUrl?: string;
  studentCount: number;
  supervisorCount: number;
  roomCount: number;
  readinessPct: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  meta?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  schoolShortName,
  examAbbr,
  logoDataUrl,
  studentCount,
  supervisorCount,
  roomCount,
  readinessPct,
  mobileOpen,
  onCloseMobile,
}) => {
  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Ringkasan',
      items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }],
    },
    {
      title: 'Input Data Inti',
      items: [
        { id: 'data-sekolah', label: 'Data Sekolah', icon: Building2 },
        { id: 'panitia', label: 'Panitia & Pengawas', icon: Users, meta: String(supervisorCount) },
        { id: 'database', label: 'Database Peserta', icon: Database, meta: String(studentCount) },
        { id: 'jadwal-ujian', label: 'Jadwal Ujian', icon: CalendarDays },
      ],
    },
    {
      title: 'Otomatis · Ruang & Jadwal',
      items: [
        { id: 'jadwal-pengawas', label: 'Jadwal Pengawas', icon: UserCheck },
        { id: 'denah', label: 'Denah Duduk', icon: LayoutGrid, meta: `${roomCount} R` },
        { id: 'no-pintu', label: 'No Pintu & Poster', icon: DoorClosed },
      ],
    },
    {
      title: 'Otomatis · Dokumen Cetak',
      items: [
        { id: 'kartu-ujian', label: 'Kartu Ujian', icon: CreditCard },
        { id: 'kartu-panitia', label: 'Kartu Panitia', icon: IdCard },
        { id: 'daftar-hadir-peserta', label: 'Hadir Peserta', icon: ClipboardCheck },
        { id: 'daftar-hadir-pengawas', label: 'Hadir Pengawas', icon: Grid2X2 },
        { id: 'tata-tertib', label: 'Tata Tertib', icon: ScrollText },
        { id: 'proposal', label: 'Proposal Ujian', icon: FileSpreadsheet },
        { id: 'administrasi', label: 'Administrasi & Sampul', icon: FileText },
      ],
    },
  ];

  const handleSelect = (id: TabId) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white/85 backdrop-blur-xl text-slate-800 select-none">
      {/* Brand Lockup */}
      <div className="px-4 h-16 border-b border-slate-200/70 flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 overflow-hidden p-1">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <LogoSekolah className="w-full h-full" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-emerald-700 truncate">
              Perangkat {examAbbr || 'Ujian'}
            </div>
            <div className="text-sm font-bold tracking-tight text-slate-900 truncate">
              {schoolShortName || 'Sekolah Anda'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Tutup menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-50/90 text-emerald-950 font-semibold shadow-[inset_0_0_0_1px_rgba(16,185,129,0.22)]'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.meta !== undefined && (
                      <span
                        className={`text-[11px] tabular-nums shrink-0 ${
                          isActive ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {item.meta}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Readiness Footer */}
      <div className="p-4 border-t border-slate-200/70">
        <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/70">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-600">Kesiapan Data</span>
            <span className="font-bold tabular-nums text-emerald-700">{readinessPct}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
              style={{ width: `${readinessPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="no-print hidden lg:block w-64 shrink-0 border-r border-slate-200/70 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
