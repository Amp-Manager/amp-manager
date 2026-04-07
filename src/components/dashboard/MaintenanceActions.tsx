import React from 'react';
import { Trash } from 'lucide-react';

interface MaintenanceActionsProps {
  onClearCache: () => void;
  onClearLogs: () => void;
}

export const MaintenanceActions: React.FC<MaintenanceActionsProps> = ({
  onClearCache,
  onClearLogs
}) => {
  return (
    <div className="gap-4 space-y-6">
      <div className="divider my-8 uppercase tracking-widest text-xs opacity-50">Clear Cache & Logs</div>
      <div className="grid grid-cols-2 gap-4">
        <div 
          className="card shadow bg-base-100 border border-red-400/50 cursor-pointer hover:bg-base-200 hover:border-red-500 transition-colors"
          onClick={onClearCache}
        >
          <div className="card-body p-4 flex flex-row items-center justify-between">
            <div>
              <h3 className="font-bold text-red-400">Delete Cache</h3>
              <p className="text-xs opacity-70">Clear angie_cache folder</p>
            </div>
            <Trash className="w-5 h-5 text-red-500 opacity-80" />
          </div>
        </div>
        <div 
          className="card shadow bg-base-100 border border-red-400/50 cursor-pointer hover:bg-base-200 hover:border-red-500 transition-colors"
          onClick={onClearLogs}
        >
          <div className="card-body p-4 flex flex-row items-center justify-between">
            <div>
              <h3 className="font-bold text-red-400">Delete Logs</h3>
              <p className="text-xs opacity-70">Clear logs folder</p>
            </div>
            <Trash className="w-5 h-5 text-red-500 opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
};
