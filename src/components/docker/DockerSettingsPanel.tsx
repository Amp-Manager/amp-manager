import React, { useEffect, useState } from 'react';
import { useDockerSettings } from '@/stores/dockerSettings';
import { useDockerMetricsStore } from '@/stores/dockerMetricsStore';
import { Activity } from 'lucide-react';

interface Props {
  nextRefresh?: number;
}

export function DockerSettingsPanel({ nextRefresh }: Props) {
  const { live, interval, setLive, setInterval: setRefreshInterval } = useDockerSettings();
  const { isEngineRunning } = useDockerMetricsStore();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!live || !nextRefresh || !isEngineRunning) {
      setProgress(100);
      return;
    }

    const updateProgress = () => {
      const now = Date.now();
      const remaining = nextRefresh - now;
      const percent = Math.max(0, Math.min(100, (remaining / interval) * 100));
      setProgress(percent);
    };

    const id = setInterval(updateProgress, 100);
    return () => clearInterval(id);
  }, [live, nextRefresh, interval, isEngineRunning]);

  const isActuallyLive = live && isEngineRunning;

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-4 bg-base-100 p-2 px-3 rounded-lg border shadow-sm transition-colors ${isEngineRunning ? 'border-blue-500/20' : 'border-error/20 opacity-70'}`}>
      <div className="flex items-center gap-2">
        <Activity className={`w-4 h-4 ${isActuallyLive ? "text-green-500 animate-pulse" : "text-base-content/30"}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Live Metrics</span>
      </div>

      <div className="flex items-center gap-4">
        {isActuallyLive && (
          <div className="flex flex-col gap-1 w-28">
            <div className="flex justify-between text-[8px] font-mono opacity-70">
              <span>{interval / 1000}s</span>
              <span className="font-bold text-blue-400">{Math.ceil((progress / 100) * (interval / 1000))}s</span>
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
          <label className={`label flex flex-col items-center gap-2 p-0 min-w-[50px] ${!isEngineRunning ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <span className={`text-[10px] font-black transition-colors ${!isEngineRunning ? "text-error" : (live ? "text-green-500" : "text-base-content/30")}`}>
              {!isEngineRunning ? 'OFFLINE' : (live ? 'LIVE' : 'PAUSED')}
            </span>
            <input 
              type="checkbox" 
              className="toggle toggle toggle-xs toggle-primary w-8" 
              checked={isActuallyLive} 
              disabled={!isEngineRunning}
              onChange={(e) => {
                if (isEngineRunning) {
                  setLive(e.target.checked);
                }
              }} 
            />
          </label>
        </div>
      </div>
    </div>
  );
}
