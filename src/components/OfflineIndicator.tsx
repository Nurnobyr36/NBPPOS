import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 dark:bg-amber-700 px-3.5 py-2 text-xs font-medium text-white shadow-lg border border-amber-400/40 animate-fade-in"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
      </span>
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>অফলাইন মোড — ক্যাশকৃত ডাটা ব্যবহৃত হচ্ছে</span>
    </div>
  );
};
