import React from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { signOut } from 'firebase/auth';
import {
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  FirestoreErrorInfo,
  auth,
} from '../firebase';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function tryParseFirestoreError(message: string): FirestoreErrorInfo | null {
  try {
    const parsed = JSON.parse(message) as FirestoreErrorInfo;
    if (parsed && typeof parsed.error === 'string' && parsed.operationType) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info.componentStack);
  }

  handleReload = (): void => {
    this.setState({ error: null });
    window.location.reload();
  };

  handleSignOutAndRecover = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch {
      // Ignore signout failures during recovery
    }
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const fsInfo = tryParseFirestoreError(error.message);
    const rawMsg = fsInfo ? fsInfo.error : error.message;
    const isQuotaExceeded = rawMsg.includes('Quota exceeded');
    const isDailyReadQuota = rawMsg.includes(
      "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
    );

    const upgradeUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;

    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center p-6 text-slate-900">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
              {fsInfo ? (
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900">
                {isQuotaExceeded
                  ? 'Batas Kuota Firestore Tercapai'
                  : fsInfo
                  ? 'Terjadi Gangguan Sinkronisasi Firestore'
                  : 'Terjadi Kesalahan Aplikasi'}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {isQuotaExceeded
                  ? 'Kuota harian gratis Firestore telah tercapai dan akan direset keesokan harinya.'
                  : 'Data lokal Anda tetap aman tersimpan di browser. Anda dapat memuat ulang halaman atau melanjutkan dalam mode lokal.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-700 space-y-1.5 break-words">
            {fsInfo && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                <span>
                  Operasi: <strong className="text-slate-800">{fsInfo.operationType}</strong>
                </span>
                {fsInfo.path && (
                  <span>
                    Path: <strong className="text-slate-800">{fsInfo.path}</strong>
                  </span>
                )}
              </div>
            )}
            <p className="font-mono text-[11px] text-rose-700">{rawMsg}</p>
            {isDailyReadQuota && (
              <a
                href={upgradeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1 text-emerald-700 underline font-semibold"
              >
                Buka Firebase Console untuk informasi paket & upgrade
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Muat Ulang Aplikasi
            </button>
            {fsInfo && (
              <button
                type="button"
                onClick={() => void this.handleSignOutAndRecover()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Lanjutkan di Mode Lokal
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
