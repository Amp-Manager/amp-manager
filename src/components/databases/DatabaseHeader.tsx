import React from "react";
import { Database, ExternalLink, RefreshCw } from "lucide-react";

function getRelativeTime(timestamp: number | null): string {
  if (!timestamp) return 'Click Refresh to load databases';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Last updated: just now';
  if (seconds < 3600) return `Last updated: ${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `Last updated: ${Math.floor(seconds / 3600)} hours ago`;
  return `Last updated: ${Math.floor(seconds / 86400)} days ago`;
}

interface DatabaseHeaderProps {
  isDbRunning: boolean | null;
  isRefreshing: boolean;
  lastUpdated: number | null;
  onRefresh: () => void;
  onOpenTool: () => void;
}

export function DatabaseHeader({ isDbRunning, isRefreshing, lastUpdated, onRefresh, onOpenTool }: DatabaseHeaderProps) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
      <div className="bg-indigo-500/10 rounded-lg p-2">
        <Database className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h1 className="text-xl tracking-tight flex items-center gap-4">
          Database Management
          <div className={`badge badge-xs badge-soft ${isDbRunning === null ? 'text-orange-400' : (isDbRunning ? 'text-green-500' : 'text-red-400')}`}>
          {isDbRunning === null ? 'Checking...' : (isDbRunning ? 'Running' : 'Offline')}
          </div>
        </h1>
        <p className="text-xs opacity-50">{getRelativeTime(lastUpdated)}</p>
      </div>
      <div className="flex gap-4">
        <button 
        className="btn btn-sm btn-primary gap-2"
        onClick={onRefresh}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <button 
          className="btn btn-sm btn-soft gap-2"
          onClick={onOpenTool}
        >
          <ExternalLink className="h-4 w-4" />
          Open DB Tool
        </button>
      </div>
    </div>
  );
}
