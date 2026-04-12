import { useState, useEffect } from "react";
import { 
  Activity, 
  Globe, 
  Loader2,
  HardDrive, 
  Server, 
  Cpu, 
  Database,
  Layers,
  RefreshCw,
  Info,
  FolderOpen
} from 'lucide-react';

import { useDockerMetricsStore } from '@/stores/dockerMetricsStore';
import { format } from 'date-fns';
import { ampBridge } from "@/services/AMPBridge";

export default function DockerStats() {
  const { 
    stats, 
    disk, 
    info, 
    loading, 
    isEngineRunning,
    isLaunching,
    launchEngine,
    folderSizes, 
    isCalculatingFolders, 
    refreshFolderSizes,
    activeSites,
    isLoadingSites
  } = useDockerMetricsStore();

  if (loading && stats.length === 0) return <div className="skeleton w-full h-64"></div>;

  if (!isEngineRunning) {
    return (
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body items-center text-center py-12">
          <div className="bg-base-200 p-6 rounded-full mb-6">
            <Server className="w-12 h-12 text-base-content/20" />
          </div>
          <h2 className="card-title text-2xl mb-2">Docker Engine is Offline</h2>
          <p className="max-w-md opacity-70 mb-8">
            AMP Manager needs Docker to manage your containers, databases, and local sites. 
            Please launch Docker Desktop to continue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              className="btn btn-primary px-8"
              onClick={launchEngine}
              disabled={isLaunching}
            >
              {isLaunching ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Launching Desktop...
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5 mr-2" />
                  Launch Docker Desktop
                </>
              )}
            </button>
            <button 
              className="btn btn-neutral"
              onClick={() => ampBridge.os.open('https://www.docker.com/products/docker-desktop')}
            >
              Get Docker Desktop
            </button>
          </div>
          {isLaunching && (
            <p className="mt-4 text-xs opacity-50 animate-pulse">
              Waiting for Docker Desktop to respond...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">


      {/* Top Row: System Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-secondary">
              <Globe className="w-8 h-8" />
            </div>
            <div className="stat-title">Active Sites</div>
            <div className="stat-value text-secondary">{isLoadingSites ? <Loader2 className="h-5 w-5 animate-spin" /> : activeSites}</div>
            <div className="stat-desc">Configured in Domains</div>
          </div>
        </div>
        
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-accent">
              <Layers className="w-8 h-8" />
            </div>
            <div className="stat-title">Docker Containers</div>
            <div className="stat-value text-accent">{info?.Images || 0}</div>
            <div className="stat-desc">
              {info?.ContainersRunning || 0} Running / {info?.ContainersStopped || 0} Stopped 
              <div className="badge badge-xs badge-soft badge-info">{info?.OSType || 'linux'}</div>
            </div>
          </div>
        </div>

        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-primary">
              <Cpu className="w-8 h-8" />
            </div>
            <div className="stat-title">System Cores</div>
            <div className="stat-value text-primary">{info?.NCPU || '-'}</div>
            <div className="stat-desc">{info?.MemTotal ? `${(info.MemTotal / (1024 * 1024 * 1024)).toFixed(1)} GB` : '--'} Memory Limit</div>
          </div>
        </div>

        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-info">
              <Info className="w-8 h-8" />
            </div>
            <div className="stat-title">Docker Engine</div>
            <div className="stat-value text-info text-2xl">{info?.ServerVersion ? info.ServerVersion.split('-')[0] : '-'}</div>
            <div className="stat-desc">{info?.Driver || 'overlay2 driver'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Container List */}
        <div className="lg:col-span-2 card bg-base-100 shadow border border-base-200">
          <div className="card-body p-4">
            <h3 className="card-title text-sm flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" /> Container Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr className="text-xs">
                    <th>Name</th>
                    <th>CPU %</th>
                    <th>Mem Usage</th>
                    <th>Net I/O</th>
                    <th>Block I/O</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((container) => (
                    <tr key={container.Name}>
                      <td className="font-bold text-blue-500">{container.Name}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <progress 
                            className="progress progress-primary w-16" 
                            value={parseFloat(container.CPUPerc) || 0} 
                            max="100"
                          ></progress>
                          {container.CPUPerc}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span>{container.MemUsage}</span>
                          <span className="text-[10px] opacity-50">({container.MemPerc})</span>
                        </div>
                      </td>
                      <td className="font-mono opacity-70">{container.NetIO}</td>
                      <td className="font-mono opacity-70">{container.BlockIO}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Storage Breakdown */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow border border-base-200 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
            <div className="card-body p-4">
              <h3 className="card-title text-sm flex items-center gap-2 mb-4">
                <HardDrive className="w-4 h-4 text-blue-500" /> Disk Storage
              </h3>

              <div className="mb-4">
                {/* Bind Mounts */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3 h-3 opacity-50" />
                      <span className="font-medium">Web Files</span>
                    </div>
                    <span className="font-bold">{folderSizes.www}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <Database className="w-3 h-3 opacity-50" />
                      <span className="font-medium">Databases</span>
                    </div>
                    <span className="font-bold">{folderSizes.data}</span>
                  </div>
                </div>

                <div className="divider my-2"></div>

                {/* Docker Internal Storage */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-80">Docker Images</span>
                    <span className="font-bold">{disk?.Images?.[0]?.Size || '0 B'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-80">Build Cache</span>
                    <span className="font-bold">{disk?.BuildCache?.[0]?.Size || '0 B'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-warning">
                    <span className="opacity-80">Reclaimable Space</span>
                    <span className="font-bold">{disk?.Images?.[0]?.Reclaimable || '0 B'}</span>
                  </div>
                </div>

                {folderSizes.lastUpdated && !isNaN(new Date(folderSizes.lastUpdated).getTime()) && (
                  <p className="text-[10px] opacity-70 text-center mt-2">
                    Last storage scan: {format(new Date(folderSizes.lastUpdated), 'HH:mm:ss')}
                  </p>
                )}

              </div>

              {/* Tip */}
              <div role="alert" className="alert alert-info alert-soft shadow-sm py-2 text-[10px] leading-tight">
                <Info className="w-4 h-4 shrink-0" />
                <span>Storage scan is performed on-demand.</span>
              </div>

              {/* Action storage scan */}
              <button 
                className="btn btn-sm badge-neutral btn-wide gap-2 mx-auto"
                onClick={refreshFolderSizes}
                disabled={isCalculatingFolders}
              >
                {isCalculatingFolders ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {isCalculatingFolders ? 'Scanning...' : 'Refresh'}
              </button>

            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
