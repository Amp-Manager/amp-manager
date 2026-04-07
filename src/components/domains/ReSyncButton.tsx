import React, { useState } from 'react';
import { FolderSync, Loader2 } from 'lucide-react';
import { toast } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { useProjectSync } from '@/hooks/useProjectSync';

interface ReSyncButtonProps {
  onSyncComplete?: () => void;
}

export function ReSyncButton({ onSyncComplete }: ReSyncButtonProps) {
  const { user } = useAuth();
  const { setIsSynced } = useSync();
  const { performSync, isRunning } = useProjectSync();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleReSync = async () => {
    if (!user || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const success = await performSync(user);
      
      if (success) {
        setIsSynced(true);
        toast.success('System synchronized successfully');
        onSyncComplete?.();
      } else {
        toast.error('Synchronization failed');
      }
    } catch (err) {
      toast.error('Synchronization error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      className="btn btn-soft btn-sm gap-2"
      onClick={handleReSync}
      disabled={isSyncing || isRunning}
    >
      {isSyncing || isRunning ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FolderSync className="w-4 h-4" />
      )}
      Re-synchronize
    </button>
  );
}
