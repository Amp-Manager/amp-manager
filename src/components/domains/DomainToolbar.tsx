import React from 'react';
import { Search, List, Calendar as CalendarIcon } from 'lucide-react';

interface DomainToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  view: string;
  onViewChange: (view: string) => void;
}

export function DomainToolbar({ search, onSearchChange, view, onViewChange }: DomainToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
        <input 
          type="text" 
          className="input bg-base-300/70 input-bordered input-sm w-full pl-10" 
          placeholder="Search domains..." 
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>
      
      <div role="tablist" className="tabs tabs-sm tabs-box text-xs bg-base-300 rounded-md gap-1">
        <button 
          role="tab" 
          className={`tab gap-2 ${view === 'table' ? 'tab-active' : ''}`} 
          onClick={() => onViewChange('table')}
        >
          <List className="h-4 w-4" /> Domains
        </button>
        <button 
          role="tab" 
          className={`tab gap-2 ${view === 'calendar' ? 'tab-active' : ''}`} 
          onClick={() => onViewChange('calendar')}
        >
          <CalendarIcon className="h-4 w-4" /> Activity
        </button>
      </div>
    </div>
  );
}
