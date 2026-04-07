import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface DomainTimelineViewProps {
  timelineEvents: any[];
}

export function DomainTimelineView({ timelineEvents }: DomainTimelineViewProps) {
  return (
    <div className="flex justify-center">
      <div className="card bg-base-100 shadow border border-base-200 w-full max-w-4xl">
        <div className="card-body">
          <h2 className="card-title">Activity Timeline</h2>
          <p className="text-sm opacity-70 mb-6">Recent executions, workflow and deployments across your domains.</p>
          
          {timelineEvents.length === 0 ? (
            <div className="text-xl text-center py-12 opacity-70">
              <h3>No recent activity.</h3>
            </div>
          ) : (
            <ul className="timeline timeline-vertical timeline-compact">
              {timelineEvents.map((event, index) => (
                <li key={event.id}>
                  {index > 0 && <hr className={event.isSuccess ? 'bg-success' : 'bg-error'} />}
                  <div className="timeline-start timeline-box bg-base-200 border-none text-xs">
                    {event.date.toLocaleDateString()} {event.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div className="timeline-middle">
                    {event.isSuccess ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-error" />
                    )}
                  </div>
                  <div className="timeline-end mb-4">
                    <div className={`card bg-base-100 border ${event.isSuccess ? 'border-success/30' : 'border-error/30'} shadow-sm`}>
                      <div className="card-body p-4">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          {event.title}
                          {event.domain && <span className="badge badge-sm badge-outline">{event.domain}</span>}
                        </h3>
                        {event.content && (
                          <div className="mt-2 text-xs font-mono bg-base-200 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {event.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < timelineEvents.length - 1 && <hr className={timelineEvents[index+1].isSuccess ? 'bg-success' : 'bg-error'} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
