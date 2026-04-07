import React from 'react';
import { Globe, Plus, Square } from 'lucide-react';
import { ReSyncButton } from '@/components/domains/ReSyncButton';

interface DomainHeaderProps {
  onCreateClick: () => void;
  onSyncComplete?: () => void;
  activeTunnelCount?: number;
  onStopAllTunnels?: () => void;
  caReady?: boolean;
}

export function DomainHeader({ onCreateClick, onSyncComplete, activeTunnelCount = 0, onStopAllTunnels, caReady = true }: DomainHeaderProps) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
      <div className="bg-indigo-500/10 rounded-lg p-2">
        <Globe className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h1 className="text-xl tracking-tight">Domains</h1>
        <p className="text-xs opacity-50">Manage your local development domains.</p>
      </div>
      <div className="flex gap-4">
        {activeTunnelCount > 0 && onStopAllTunnels && (
          <button 
            className="btn btn-sm btn-error" 
            onClick={onStopAllTunnels}
            title="Stop all active tunnels"
          >
            <Square className="mr-2 h-4 w-4" />
            Stop Tunnels ({activeTunnelCount})
          </button>
        )}
        <div className="tooltip tooltip-bottom" data-tip={!caReady ? "Certificate Authority not installed. Go to Certificates page to install." : ""}>
          <button 
            className="btn btn-sm btn-primary" 
            onClick={onCreateClick}
            disabled={!caReady}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Domain
          </button>
        </div>
        <ReSyncButton onSyncComplete={onSyncComplete} />
      </div>
    </div>
  );
}
