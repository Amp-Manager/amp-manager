import React, { useEffect, useState, useRef } from "react";
import { Activity, Server, Globe, Cpu, AlertTriangle, Info, RefreshCw } from "lucide-react";
import PageLoader from "@/components/layout/PageLoader";
import { angieStatusService, AngieStats } from "@/services/AngieStatusService";
import { SiteStatusCard } from "@/components/monitor/SiteStatusCard";
import { toast } from "@/utils/toast";

export default function Monitor() {
  const [stats, setStats] = useState<AngieStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(10); // seconds
  const [isPaused, setIsPaused] = useState(true);
  const prevStatsRef = useRef<AngieStats | null>(null);
  const [hotSites, setHotSites] = useState<Set<string>>(new Set());
  const [nextRefresh, setNextRefresh] = useState<number>(0);
  const [progress, setProgress] = useState(100);

  // Hot site detection thresholds
  const HOT_SITE_REQUEST_THRESHOLD = 5;
  const HOT_SITE_PROCESSING_THRESHOLD = 5;

  const fetchStats = async () => {
    try {
      const data = await angieStatusService.getStats();
      
      // Update next refresh time
      setNextRefresh(Date.now() + refreshInterval * 1000);
      // Detect Hot Sites
      if (prevStatsRef.current) {
        const newHotSites = new Set<string>();
        const currentZones = data.http.server_zones;
        const prevZones = prevStatsRef.current.http.server_zones;

        Object.entries(currentZones).forEach(([name, current]) => {
          const prev = prevZones[name];
          if (prev) {
            const diff = current.requests.total - prev.requests.total;
            // Mark as hot when request growth or processing exceeds threshold
            if (diff > HOT_SITE_REQUEST_THRESHOLD || current.processing > HOT_SITE_PROCESSING_THRESHOLD) {
              newHotSites.add(name);
            }
          }
        });
        setHotSites(newHotSites);
      }

      prevStatsRef.current = data;
      setStats(data);
      setError(null);
    } catch (err) {
      setError("Failed to connect to Angie API. Ensure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(() => {
      if (!isPaused) {
        fetchStats();
      }
    }, refreshInterval * 1000);

    return () => clearInterval(timer);
  }, [refreshInterval, isPaused]);

  // Progress bar logic
  useEffect(() => {
    if (isPaused || !nextRefresh) {
      setProgress(100);
      return;
    }

    const updateProgress = () => {
      const now = Date.now();
      const remaining = nextRefresh - now;
      const percent = Math.max(0, Math.min(100, (remaining / (refreshInterval * 1000)) * 100));
      setProgress(percent);
    };

    const id = setInterval(updateProgress, 100);
    return () => clearInterval(id);
  }, [isPaused, nextRefresh, refreshInterval]);

  if (loading && !stats) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
        <div className="bg-indigo-500/10 rounded-lg p-2">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl tracking-tight">Angie Live Status</h1>
          <p className="text-xs opacity-50">Real-time monitoring with per-location metrics.</p>
        </div>
        <div className="justify-end">
          <div className={`flex flex-col sm:flex-row items-center gap-4 bg-base-100 p-2 px-4 rounded-lg border shadow-sm transition-colors ${!error ? 'border-indigo-500/20' : 'border-error/20 opacity-70'}`}>
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${!isPaused ? "text-green-500 animate-pulse" : "text-base-content/30"}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Live Status</span>
            </div>

            <div className="flex items-center gap-4">
              {!isPaused && (
                <div className="flex flex-col gap-1 w-28">
                  <div className="flex justify-between text-[8px] font-mono opacity-60">
                    <span>{refreshInterval}s</span>
                    <span className="font-bold text-primary">{Math.ceil((progress / 100) * refreshInterval)}s</span>
                  </div>
                  <progress className="progress progress-primary h-1" value={progress} max="100"></progress>
                  <input 
                    type="range" 
                    min="2" 
                    max="60" 
                    step="1" 
                    value={refreshInterval} 
                    className="range range-xs range-primary" 
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                  />
                </div>
              )}
              
              <div className="form-control">
                <label className="label flex flex-col items-center gap-2 p-0 min-w-[60px] cursor-pointer">
                  <span className={`text-[10px] font-black transition-colors ${!isPaused ? "text-green-500" : "text-base-content/30"}`}>
                    {!isPaused ? 'LIVE' : 'PAUSED'}
                  </span>
                  <input 
                    type="checkbox" 
                    className="toggle toggle toggle-xs toggle-primary border-slate-500 w-8" 
                    checked={!isPaused} 
                    onChange={(e) => setIsPaused(!e.target.checked)} 
                  />
                </label>
              </div>

              <button 
                className="btn btn-xs btn-ghost"
                onClick={fetchStats}
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-soft alert-error">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
          <button className="btn btn-sm" onClick={fetchStats}>Retry</button>
        </div>
      )}

      {stats && (
        <>
          {/* Global Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="stats shadow bg-base-100 border border-base-300">
              <div className="stat">
                <div className="stat-figure text-success">
                  <Globe className="h-6 w-6" />
                </div>
                <div className="stat-title text-[10px] uppercase font-bold opacity-50">Zones</div>
                <div className="stat-value text-lg font-mono">
                  {Object.keys(stats.http.server_zones).filter(z => z !== "monitoring_internal").length}
                </div>
                <div className="stat-desc">Active domains</div>
              </div>
            </div>

            <div className="stats shadow bg-base-100 border border-base-300">
              <div className="stat">
                <div className="stat-figure text-info">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="stat-title text-[10px] uppercase font-bold opacity-50">Active Conns</div>
                <div className="stat-value text-lg font-mono">{stats.connections.active}</div>
                <div className="stat-desc">Current sessions</div>
              </div>
            </div>

            <div className="stats shadow bg-base-100 border border-base-300">
              <div className="stat">
                <div className="stat-figure text-secondary">
                  <Cpu className="h-6 w-6" />
                </div>
                <div className="stat-title text-[10px] uppercase font-bold opacity-50">Generation</div>
                <div className="stat-value text-lg font-mono">{stats.angie.generation}</div>
                <div className="stat-desc">Config reloads</div>
              </div>
            </div>

            <div className="stats shadow bg-base-100 border border-base-300">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <Server className="h-6 w-6" />
                </div>
                <div className="stat-title text-[10px] uppercase font-bold opacity-50">Angie Version</div>
                <div className="stat-value text-lg font-mono">{stats.angie.version}</div>
                <div className="stat-desc font-mono text-[10px]">{stats.angie.address}</div>
              </div>
            </div>

          </div>

          {/* Zones Grid */}
          <div>
            <div className="flex items-center gap-2 mb-8">
              <h2 className="text-xl">Domain Traffic</h2>
              <div className="badge badge-outline badge-xs opacity-50">Live</div>
            </div>
            
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.entries(stats.http.server_zones)
                .filter(([name]) => name !== "monitoring_internal")
                .map(([name, zoneStats]) => (
                  <SiteStatusCard 
                    key={name}
                    name={name}
                    stats={zoneStats}
                    isHot={hotSites.has(name)}
                  />
                ))}
            </div>
          </div>
        </>
      )}

      <div className="alert alert-info alert-soft p-4 rounded-lg">
        <div className="flex gap-4">
          <div className="bg-primary/10 p-2 rounded-lg h-fit">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Troubleshooting Tip</h3>
            <p className="text-sm leading-relaxed max-w-3xl">
              The <span className="text-info font-medium">status_zone</span> enables 
              per-location statistics that live in volatile RAM. Counters reset on Docker container restart.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
