import React, { Suspense, lazy } from 'react';
import { ChartNoAxesGantt, RefreshCw } from 'lucide-react';
import { TimelineRow } from './Timeline';

const Timeline = lazy(() => import("./Timeline"));

interface TimelineSectionProps {
  timelineEvents: TimelineRow[];
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({ timelineEvents }) => {
  return (
    <div className="space-y-4 gap-4">
      <div className="grid grid-cols-[auto_1fr_auto]  items-start gap-4 w-full">
        <div className="bg-indigo-500/10 rounded-lg p-2">
          <ChartNoAxesGantt className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl tracking-tight">Activity Timeline</h1>
          <p className="text-xs opacity-50">Track recent events, domain and databases creations, notes and workflow changes.</p>
        </div>
      </div>
      <div className="card bg-base-100 shadow border border-base-200 mb-8">
        <div className="card-body p-2">
          <Suspense fallback={<div className="h-48 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin opacity-50" /></div>}>
            <Timeline data={timelineEvents} days={30} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};
