import React from 'react';
import { LayoutDashboard, Activity, RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  live: boolean;
  setLive: (live: boolean) => void;
  interval: number;
  setRefreshInterval: (interval: number) => void;
  progress: number;
  fetchEnv: () => void;
  error: string | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  live,
  setLive,
  interval,
  setRefreshInterval,
  progress,
  fetchEnv,
  error
}) => {
  return (
    <div className="grid grid-cols-[auto_1fr_auto]  items-start gap-4 w-full">
      <div className="bg-indigo-500/10 rounded-lg p-2">
        <LayoutDashboard className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h1 className="text-xl tracking-tight">Dashboard</h1>
        <p className="text-xs opacity-50">System environment status and health checks.</p>
      </div>
      <div className="justify-self-end">
        <div className={`flex flex-col sm:flex-row items-center gap-4 bg-base-100 p-2 px-4 rounded-lg border shadow-sm transition-colors ${!error ? 'border-indigo-500/20' : 'border-error/20 opacity-70'}`}>
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${live ? "text-green-500 animate-pulse" : "text-base-content/30"}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Live Monitoring</span>
          </div>

          <div className="flex items-center gap-4">
            {live && (
              <div className="flex flex-col gap-1 w-28">
                <div className="flex justify-between text-[8px] font-mono opacity-60">
                  <span>{interval / 1000}s</span>
                  <span className="font-bold text-primary">{Math.ceil((progress / 100) * (interval / 1000))}s</span>
                </div>
                <progress className="progress progress-primary h-1" value={progress} max="100"></progress>
                <input 
                  type="range" 
                  min="10" 
                  max="120" 
                  step="10" 
                  value={interval / 1000} 
                  className="range range-xs range-primary" 
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value) * 1000)}
                />
              </div>
            )}
            
            <div className="form-control">
              <label className="label flex flex-col items-center gap-2 p-0 min-w-[60px] cursor-pointer">
                <span className={`text-[10px] font-black transition-colors ${live ? "text-green-500" : "text-base-content/30"}`}>
                  {live ? 'LIVE' : 'PAUSED'}
                </span>
                <input 
                  type="checkbox" 
                  className="toggle toggle-xs toggle-primary border-slate-500 w-8" 
                  checked={live} 
                  onChange={(e) => setLive(e.target.checked)} 
                />
              </label>
            </div>

            <button 
              className="btn btn-xs btn-ghost"
              onClick={fetchEnv}
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
