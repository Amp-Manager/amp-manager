import { useState, useEffect, lazy, Suspense } from "react";
import { Container, Info, RefreshCw } from "lucide-react";
import PageLoader from "@/components/layout/PageLoader";
import { DockerSettingsPanel } from "@/components/docker/DockerSettingsPanel";
import { toast } from "@/utils/toast";
import { useDockerMetricsStore } from "@/stores/dockerMetricsStore";
import { ampBridge } from "@/services/AMPBridge";

const DockerStats = lazy(() => import("@/components/docker/DockerStats"));
const DockerComposeViewer = lazy(() => import("@/components/docker/DockerComposeViewer").then(m => ({ default: m.DockerComposeViewer })));
const ConfigRecovery = lazy(() => import("@/components/docker/ConfigRecovery").then(m => ({ default: m.ConfigRecovery })));

export default function Docker() {
  const { 
    info, 
    isEngineRunning, 
    startPolling,
    nextRefresh
  } = useDockerMetricsStore();
  
  const [status, setStatus] = useState<'running' | 'stopped'>('stopped');
  const [isActionPending, setIsActionPending] = useState(false);

  useEffect(() => {
    const stopPolling = startPolling();
    return () => stopPolling();
  }, [startPolling]);

  useEffect(() => {
    if (info && typeof info.ContainersRunning === 'number') {
      setStatus(info.ContainersRunning > 0 ? 'running' : 'stopped');
    } else if (!isEngineRunning) {
      setStatus('stopped');
    }
  }, [info, isEngineRunning]);

  const handleDockerAction = async (action: string) => {
    if (isActionPending) return;
    
    setIsActionPending(true);
    try {
      if (ampBridge.isAvailable()) {
        const dockerMethods = ampBridge.docker as Record<string, () => Promise<any>>;
        if (typeof dockerMethods[action] !== 'function') {
          throw new Error(`Docker action ${action} not found`);
        }
        
        const res = await dockerMethods[action]();
        if (res.status === 'ok') {
          const actionLabel = action === 'startContainers' ? 'Containers started' : 
                             action === 'stopContainers' ? 'Containers stopped' : 
                             action === 'restartRuntime' ? 'Runtime restarted' :
                             action === 'restartFullStack' ? 'Full stack restarted' :
                             action === 'restartAngie' ? 'Angie restarted' :
                             `Docker ${action}`;
          toast.success(`${actionLabel} successfully`);
        } else {
          toast.error(`Action failed: ${res.message || 'Unknown error'}`);
        }
      } else {
        // Mock behavior
        toast.success(`Mock: ${action} executed`);
      }
    } catch (err: any) {
      toast.error(`Action failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
        <div className="bg-indigo-500/10 rounded-lg p-2">
          <Container className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="flex gap-4 text-xl tracking-tight">
            Docker 
            <div className={`badge badge-sm badge-soft ${isEngineRunning ? (status === 'running' ? 'text-green-500' : 'text-orange-400') : 'text-red-400'}`}>
              {!isEngineRunning ? 'Offline' : status}
            </div>
          </h1>
          <p className="text-xs opacity-50">Manage your containers.</p>
        </div>
        <div className="justify-self-end gap-2">
          <div className="flex items-center gap-4">
            {/* Docker Live Metrics */}  
            <DockerSettingsPanel nextRefresh={nextRefresh} />
            
            {/* Docker Controls */}
            <div className="flex flex-row items-center gap-4 bg-base-100 p-2 px-4 rounded-lg border shadow-sm transition-colors border-indigo-500/20">
              <div className="flex flex-col items-center align-center gap-1">
                <span className="text-[8px] font-bold uppercase tracking-wider opacity-60">Container</span>
                <div className="flex flex-row gap-1">
                  <button 
                    className={`btn btn-xs btn-soft ${isActionPending ? 'loading' : ''}`} 
                    onClick={() => handleDockerAction('startContainers')}
                    disabled={isActionPending}
                  >
                    Start
                  </button>
                  <button 
                    className={`btn btn-xs btn-soft btn-warning ${isActionPending ? 'loading' : ''}`} 
                    onClick={() => handleDockerAction('stopContainers')}
                    disabled={isActionPending}
                  >
                    Stop
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-center align-center gap-1">
                <span className="text-[8px] font-bold uppercase tracking-wider opacity-60">Restart</span>
                <div className="flex flex-row gap-1">
                  <div className="tooltip" data-tip="Restart Angie">
                    <button 
                      className={`btn btn-xs btn-soft ${isActionPending ? 'loading' : ''}`} 
                      onClick={() => handleDockerAction('restartAngie')}
                      disabled={isActionPending}
                    >
                      Angie
                    </button>
                  </div>
                  <div className="tooltip" data-tip="Restart DB+PHP">
                    <button 
                      className={`btn btn-xs btn-soft ${isActionPending ? 'loading' : ''}`} 
                      onClick={() => handleDockerAction('restartRuntime')}
                      disabled={isActionPending}
                    >
                      Runtime
                    </button>
                  </div>
                  <div className="tooltip" data-tip="Restart All">
                    <button 
                      className={`btn btn-xs btn-soft ${isActionPending ? 'loading' : ''}`} 
                      onClick={() => handleDockerAction('restartFullStack')}
                      disabled={isActionPending}
                    >
                      Full
                    </button>
                  </div>
                </div>
              </div>            
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="h-64 flex items-center justify-center bg-base-200 rounded-lg border border-dashed border-base-300"><RefreshCw className="w-8 h-8 animate-spin opacity-20" /></div>}>
        <DockerStats />
      </Suspense>

      <div className="alert alert-info alert-soft rounded-lg mt-8">
        <div className="flex gap-4">
          <div className="bg-info/10 p-2 rounded-lg h-fit">
            <Info className="w-5 h-5 text-info" />
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Docker Environment Scope</h3>
            <p className="text-sm leading-relaxed max-w-3xl">
              The metrics and controls above apply specifically to your Docker containers (Angie, MariaDB, PHP). 
              Local application data like <span className="text-info font-medium">Domains</span>, <span className="text-info font-medium">Notes</span>, 
              and <span className="text-info font-medium">Workflows</span> are 
              stored in your local IndexedDB and are not affected by Docker restarts.
            </p>
          </div>
        </div>
      </div>

      <div className="divider my-8 uppercase tracking-widest text-xs opacity-50">Configuration</div>
      
      <Suspense fallback={<PageLoader />}>
        <div className="grid gap-6 lg:grid-cols-2">
          <DockerComposeViewer />
          <ConfigRecovery />
        </div>
      </Suspense>

      <div className="alert alert-info alert-soft p-4 rounded-lg">
        <div className="flex gap-4">
          <div className="bg-info/10 p-2 rounded-lg h-fit">
            <Info className="w-5 h-5 text-info" />
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Troubleshooting Tip</h3>
            <p className="text-sm leading-relaxed max-w-3xl">
              If something does not behave as expected, try a <span className="text-info font-medium">Full Restart</span>. 
                It may take longer, but ensures all services reload their configuration from the host.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
