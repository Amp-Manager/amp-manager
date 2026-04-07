import React, { useMemo, useState, useRef, useLayoutEffect } from 'react';

export type TimelineEvent = {
  start: number; // Unix timestamp
  end: number;   // Unix timestamp
  outcome: 'success' | 'error' | 'pending' | 'info' | 'warning';
  label?: string;
};

export type TimelineRow = {
  name: string;
  events: TimelineEvent[];
};

type TimelineProps = {
  data: TimelineRow[];
  days?: number; // How many days to show (default 30)
};

const getOutcomeColor = (outcome: TimelineEvent['outcome']) => {
  switch (outcome) {
    case 'success': return 'bg-success';
    case 'error': return 'bg-error';
    case 'info': return 'bg-info';
    case 'warning': return 'bg-warning';
    default: return 'bg-neutral';
  }
};

export default function Timeline({ data, days = 30 }: TimelineProps) {
  const [hoveredEvent, setHoveredEvent] = useState<{ event: TimelineEvent, x: number, y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const timeWindow = useMemo(() => {
    const now = Date.now();
    const start = now - (days * 24 * 60 * 60 * 1000);
    return { start, end: now, duration: now - start };
  }, [days]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate lanes for overlapping events within each row
  const getEventLanes = useMemo(() => {
    return (events: TimelineEvent[]) => {
      const lanes: number[] = []; // lane end positions
      
      return events.map((event) => {
        const start = ((event.start - timeWindow.start) / timeWindow.duration) * 100;
        const end = ((event.end - timeWindow.start) / timeWindow.duration) * 100;
        
        // Find first lane where this event fits
        let laneIndex = 0;
        for (let i = 0; i < lanes.length; i++) {
          if (lanes[i] <= start) {
            laneIndex = i;
            break;
          }
          laneIndex = i + 1;
        }
        
        lanes[laneIndex] = end;
        return laneIndex;
      });
    };
  }, [timeWindow]);

  // Auto-scroll to the right (most recent) on mount
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data, days]);

  // Generate X-axis ticks
  const ticks = useMemo(() => {
    // If we have enough width (e.g., 60px per day), show a tick for every day
    // Otherwise, limit to a reasonable number to prevent overlapping text
    const numTicks = days; 
    const tickInterval = timeWindow.duration / numTicks;
    return Array.from({ length: numTicks + 1 }).map((_, i) => {
      const time = timeWindow.start + (i * tickInterval);
      return {
        time,
        label: new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        percent: (i / numTicks) * 100
      };
    });
  }, [timeWindow, days]);

  if (data.length === 0) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-base-200/50 rounded-xl border border-base-300 border-dashed">
        <p className="text-center opacity-50">No timeline data available</p>
      </div>
    );
  }

  const minWidth = Math.max(800, days * 60);

  return (
    <div className="w-full relative" ref={containerRef}>
      <div 
        ref={scrollRef}
        className="w-full overflow-auto pb-4" 
        onScroll={() => setHoveredEvent(null)}
      >
        <div style={{ minWidth: `${minWidth}px`, maxHeight: '500px' }} className="flex flex-col relative">
          
          {/* Header / X-Axis */}
          <div className="flex ml-[150px] relative h-8 border-b border-base-300 mb-2">
            {ticks.map((tick, i) => (
              <div 
                key={i} 
                className="absolute text-xs opacity-50 -translate-x-1/2 bottom-1 whitespace-nowrap"
                style={{ left: `${tick.percent}%` }}
              >
                {tick.label}
              </div>
            ))}
          </div>

          {/* Grid Lines */}
          <div className="absolute top-10 bottom-0 left-[150px] right-0 pointer-events-none">
            {ticks.map((tick, i) => (
              <div 
                key={i} 
                className="absolute top-0 bottom-0 border-l border-base-300 border-dashed opacity-20"
                style={{ left: `${tick.percent}%` }}
              />
            ))}
          </div>

          {/* Rows */}
          <div className="relative flex flex-col gap-2">
            {data.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center group">
                {/* Row Label - Sticky on left */}
                <div className="sticky left-0 z-20 w-[100px] shrink-0 text-sm font-medium truncate bg-base-200/70 border border-base-300 px-2 py-1" title={row.name}>
                  {row.name}
                </div>
                
                {/* Row Track */}
                <div className="flex-1 h-8 relative bg-base-300/30 rounded-md border border-base-300/50">
                  {(() => {
                    const lanes = getEventLanes(row.events);
                    const maxLanes = Math.max(1, ...lanes.map(l => l + 1));
                    const laneHeight = 100 / maxLanes;
                    
                    return row.events.map((event, eventIndex) => {
                      const rawStartPercent = ((event.start - timeWindow.start) / timeWindow.duration) * 100;
                      const rawEndPercent = ((event.end - timeWindow.start) / timeWindow.duration) * 100;
                      
                      if (rawEndPercent < 0 || rawStartPercent > 100) return null;

                      const startPercent = Math.max(0, rawStartPercent);
                      const endPercent = Math.min(100, rawEndPercent);
                      const widthPercent = Math.max(1.5, endPercent - startPercent);
                      const laneIndex = lanes[eventIndex];

                      return (
                        <div
                          key={eventIndex}
                          className={`absolute rounded-sm cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-offset-base-100 hover:ring-primary transition-all ${getOutcomeColor(event.outcome)}`}
                          style={{ 
                            left: `${startPercent}%`, 
                            width: `${widthPercent}%`,
                            top: `${laneIndex * laneHeight + 2}%`,
                            height: `${laneHeight - 4}%`,
                            minHeight: '4px',
                            minWidth: '8px'
                          }}
                          onMouseEnter={(e) => {
                            if (!containerRef.current) return;
                            const containerRect = containerRef.current.getBoundingClientRect();
                            const rect = e.currentTarget.getBoundingClientRect();
                            
                            setHoveredEvent({
                              event,
                              x: rect.left - containerRect.left + (rect.width / 2),
                              y: rect.top - containerRect.top
                            });
                          }}
                          onMouseLeave={() => setHoveredEvent(null)}
                        />
                      );
                    });
                  })()}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Tooltip */}
      {hoveredEvent && (
        <div 
          className="absolute z-50 bg-base-100 border border-base-300 p-3 rounded-lg shadow-xl text-sm pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-8px] w-40"
          style={{ left: hoveredEvent.x, top: hoveredEvent.y }}
        >
          <p className="text-sm font-bold mb-1 truncate">{hoveredEvent.event.label || 'Event'}</p>
          <p className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${getOutcomeColor(hoveredEvent.event.outcome)}`}></span>
            <span className="text-[10px] uppercase">{hoveredEvent.event.outcome}</span>
          </p>
          <p className="text-xs opacity-70 mt-2">
            {new Date(hoveredEvent.event.start).toLocaleString()}
            {hoveredEvent.event.end > hoveredEvent.event.start && ` (${Math.round((hoveredEvent.event.end - hoveredEvent.event.start) / 1000)}s)`}
          </p>
        </div>
      )}
    </div>
  );
}
