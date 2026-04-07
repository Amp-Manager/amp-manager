import { useState } from "react";
import { RefreshCw, AlertTriangle, Trash } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageLoader from "@/components/layout/PageLoader";
import WorkflowStats from "@/components/dashboard/WorkflowStats";
import { toast } from "@/utils/toast";
import { ampBridge } from "@/services/AMPBridge";

// Refactored Components
import { useDashboard } from "@/components/dashboard/hooks/useDashboard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { MaintenanceActions } from "@/components/dashboard/MaintenanceActions";
import { StatusChecks } from "@/components/dashboard/StatusChecks";
import { TimelineSection } from "@/components/dashboard/TimelineSection";

import TagsStats from "@/components/dashboard/TagsStats";

export default function Dashboard() {
  const { user } = useAuth();
  const {
    env,
    dashboardCounts,
    workflowStats,
    last7Days,
    timelineEvents,
    tagStats,
    loading,
    error,
    progress,
    live,
    interval,
    setLive,
    setRefreshInterval,
    fetchEnv
  } = useDashboard(user);

  const [confirmDelete, setConfirmDelete] = useState<'cache' | 'logs' | null>(null);

  const handleClearCache = async () => {
    if (!ampBridge.isAvailable()) return;
    try {
      const res = await ampBridge.clearCache();
      if (res.status !== 'ok') throw new Error(res.message || "Failed to clear cache");
      toast.success("Cache cleared successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to clear cache");
    }
  };

  const handleClearLogs = async () => {
    if (!ampBridge.isAvailable()) return;
    try {
      const res = await ampBridge.clearLogs();
      if (res.status !== 'ok') throw new Error(res.message || "Failed to clear logs");
      toast.success("Logs cleared successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to clear logs");
    }
  };

  if (!env && loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-error mb-4" />
        <h2 className="text-xl font-bold mb-2">Backend Connection Error</h2>
        <p className="opacity-70 max-w-md mb-6">{error}</p>
        <button className="btn btn-primary" onClick={fetchEnv}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  if (!env) return null;

  return (
    <div className="space-y-8">
      <section className="w-full space-y-8 mb-8">
        <DashboardHeader 
          live={live}
          setLive={setLive}
          interval={interval}
          setRefreshInterval={setRefreshInterval}
          progress={progress}
          fetchEnv={fetchEnv}
          error={error}
        />

        <div className="grid gap-4 grid-cols-2">
          <StatsGrid counts={dashboardCounts} />
          
          <div className="gap-4 space-y-6">
            <WorkflowStats last7Days={last7Days} />
            <MaintenanceActions 
              onClearCache={() => setConfirmDelete('cache')}
              onClearLogs={() => setConfirmDelete('logs')}
            />
          </div>
        </div>
      </section>

      <section className="w-full mb-8">
        <div className="py-4">
          <TagsStats tags={tagStats} onRefresh={fetchEnv} />
        </div>
      </section>

      <section className="w-full mb-8">
        <TimelineSection timelineEvents={timelineEvents} />
      </section>

      <section className="w-full">
        <StatusChecks env={env} onRefresh={fetchEnv} />
      </section>

      {confirmDelete && (
        <div className="modal modal-open">
          <div className="modal-box border border-base-100">
            <h3 className="font-bold text-lg text-red-500 flex items-center gap-2">
              <Trash className="w-5 h-5" /> Confirm Deletion
            </h3>
            <p className="py-4">
              Are you sure you want to delete all {confirmDelete === 'cache' ? 'cache' : 'logs'}?
               <br/>
                This action cannot be undone.
            </p>
            <div className="modal-action">
              <button className="btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button 
                className="btn btn-error" 
                onClick={() => {
                  if (confirmDelete === 'cache') handleClearCache();
                  if (confirmDelete === 'logs') handleClearLogs();
                  setConfirmDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>      
  );
}
