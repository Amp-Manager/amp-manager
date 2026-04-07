import React from "react";
import { ArrowDown, ArrowUp, Zap } from "lucide-react";

interface SiteStatusCardProps {
  name: string;
  stats: {
    processing: number;
    requests: {
      total: number;
    };
    responses: {
      [key: string]: number;
    };
    data: {
      received: number;
      sent: number;
    };
  };
  isHot?: boolean;
}

export const SiteStatusCard: React.FC<SiteStatusCardProps> = ({ name, stats, isHot }) => {
  const receivedMB = (stats.data.received / 1024 / 1024).toFixed(2);
  const sentMB = (stats.data.sent / 1024 / 1024).toFixed(2);
  const totalRequests = stats.requests.total;
  const ok200 = stats.responses["200"] || 0;
  const err404 = stats.responses["404"] || 0;
  const err5xx = Object.entries(stats.responses)
    .filter(([code]) => code.startsWith("5"))
    .reduce((acc, [_, count]) => acc + (count as number), 0);

  return (
    <div className={`card bg-base-100 shadow border-l-1 transition-all duration-300 ${
      isHot ? "border-error ring-2 ring-error animate-pulse" : "border-primary"
    }`}>
      <div className="card-body p-4">
        <div className="flex justify-between items-start mb-1">
          <h3 className="card-title text-sm font-bold uppercase tracking-wider text-base-content/70">
            {name}
          </h3>
          {isHot && (
            <div className="badge badge-error gap-1 text-[10px] font-bold">
              <Zap className="h-3 w-3" /> HOT
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-[10px] uppercase opacity-50 font-bold">Requests</div>
            <div className="text-xl font-mono font-bold">{totalRequests}</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase opacity-50 font-bold">Processing</div>
            <div className="text-xl font-mono font-bold text-info">{stats.processing}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-base-200 rounded p-1">
            <div className="text-[9px] uppercase opacity-50">200 OK</div>
            <div className="text-xs font-bold text-success">{ok200}</div>
          </div>
          <div className="bg-base-200 rounded p-1">
            <div className="text-[9px] uppercase opacity-50">404</div>
            <div className="text-xs font-bold text-warning">{err404}</div>
          </div>
          <div className="bg-base-200 rounded p-1">
            <div className="text-[9px] uppercase opacity-50">5xx</div>
            <div className="text-xs font-bold text-error">{err5xx}</div>
          </div>
        </div>

        <div className="mt-1 flex justify-between items-center text-[11px]">
          <div className="flex items-center gap-1 text-info">
            <ArrowDown className="h-3 w-3" />
            <span>{receivedMB} MB</span>
          </div>
          <div className="flex items-center gap-1 text-secondary">
            <ArrowUp className="h-3 w-3" />
            <span>{sentMB} MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
