import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-300 flex items-center justify-center gap-2.5 backdrop-blur-md sticky top-0 z-50 animate-in fade-in duration-200">
      <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
      <span className="font-medium">
        <strong>Offline Mode:</strong> Viewing cached app shell. Data changes require a live internet connection.
      </span>
    </div>
  );
};
