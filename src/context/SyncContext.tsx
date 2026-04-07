import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SyncContextType {
  isSynced: boolean;
  lastSyncTimestamp: number | null;
  syncIntervalHours: number;
  forceSyncOnStartup: boolean;
  setIsSynced: (value: boolean) => void;
  setLastSyncTimestamp: (value: number | null) => void;
  setSyncIntervalHours: (value: number) => void;
  setForceSyncOnStartup: (value: boolean) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
  initialSyncIntervalHours?: number;
  initialForceSyncOnStartup?: boolean;
}

export function SyncProvider({ 
  children, 
  initialSyncIntervalHours = 6,
  initialForceSyncOnStartup = true 
}: SyncProviderProps) {
  const [isSynced, setIsSynced] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);
  const [syncIntervalHours, setSyncIntervalHours] = useState(initialSyncIntervalHours);
  const [forceSyncOnStartup, setForceSyncOnStartup] = useState(initialForceSyncOnStartup);

  const value: SyncContextType = {
    isSynced,
    lastSyncTimestamp,
    syncIntervalHours,
    forceSyncOnStartup,
    setIsSynced,
    setLastSyncTimestamp,
    setSyncIntervalHours,
    setForceSyncOnStartup,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextType {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
