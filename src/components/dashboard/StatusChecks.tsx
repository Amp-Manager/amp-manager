import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, CheckCircle2, AlertTriangle, XCircle, Wrench, Shield, Loader2 } from 'lucide-react';
import { EnvStatus } from './types';
import { ampBridge } from '@/services/AMPBridge';
import { toast } from '@/utils/toast';

interface StatusChecksProps {
  env: EnvStatus | null;
  onRefresh?: () => void;
}

export const StatusChecks: React.FC<StatusChecksProps> = ({ env, onRefresh }) => {
  const navigate = useNavigate();
  const [isInstallingCA, setIsInstallingCA] = useState(false);

  const items = [
    { key: "docker_running", label: "Docker Running", description: "Checks if Docker daemon is active" },
    { key: "docker_compose", label: "Docker Compose", description: "Checks if docker-compose.yml exists" },
    { key: "angie_conf", label: "Angie Config", description: "Verifies Angie web server configuration" },
    { key: "db_init", label: "Database Init", description: "Checks for database initialization scripts" },
    { key: "php_ini", label: "PHP Config", description: "Verifies PHP configuration file" },
    { key: "data_folder", label: "Data Folder", description: "Ensures data persistence directory exists" },
    { key: "www_folder", label: "WWW Folder", description: "Checks web root directory" },
    { key: "mkcert", label: "mkcert", description: "Checks if mkcert tool is installed" },
    { key: "caroot_ok", label: "CA Root", description: "Verifies local CA root installation" },
    { key: "cert_file", label: "Certificate File", description: "Verifies SSL certificate existence" },    
  ];

  const overallStatus = items.every(item => {
    const status = env ? env[item.key as keyof typeof env] : "unknown";
    return status === "ok" || status === "1" || status === "true" || status === true;
  });

  const handleInstallCA = useCallback(async () => {
    if (isInstallingCA) return;
    setIsInstallingCA(true);
    try {
      const res = await ampBridge.caReset();
      if (res.status === 'ok') {
        toast.success('Certificate Authority installed successfully');
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.message || 'Failed to install CA');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while installing CA');
    } finally {
      setIsInstallingCA(false);
    }
  }, [isInstallingCA, onRefresh]);

  const renderList = (sliceStart: number, sliceEnd: number) => (
    <ul className="list bg-base-100 rounded-box shadow-sm border border-base-200">
      {items.slice(sliceStart, sliceEnd).map(({ key, label, description }) => {
        const status = env ? env[key] : "unknown";
        const isOk = status === "ok" || status === "1" || status === "true" || status === true;
        const isCARoot = key === "caroot_ok";
        
        return (
          <li key={key} className="list-row items-center px-4 py-2 border-b border-base-200 last:border-0">
            <div className="flex items-center justify-center w-8">
              {isOk ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">{label}</div>
              <div className="text-[10px] opacity-50 truncate max-w-[200px]">{description}</div>
            </div>
            {!isOk && (
              isCARoot ? (
                <button
                  className="btn btn-xs btn-primary gap-1"
                  onClick={handleInstallCA}
                  disabled={isInstallingCA}
                >
                  {isInstallingCA ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Shield className="h-3 w-3" />
                  )}
                  Install CA
                </button>
              ) : (
                <button
                  className="btn btn-xs btn-warning gap-1"
                  onClick={() => navigate('/docker')}
                >
                  <Wrench className="h-3 w-3" />
                  Restore
                </button>
              )
            )}
            <div className={`badge badge-sm ${isOk ? "badge-ghost text-green-500" : "badge-error"}`}>
              {isOk ? "OK" : "FAIL"}
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-4 gap-4">

      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
        <div className="bg-indigo-500/10 rounded-lg p-2">
          {overallStatus ? (
            <CheckCheck className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-400/80" />
          )}
        </div>
        <div>
          <h1 className={`text-xl tracking-tight ${overallStatus ? "text-green-500" : "text-red-400/80"}`}>System Checks: {overallStatus ? "Healthy" : "Issues Detected"}</h1>
          <p className="text-xs opacity-50">
            {overallStatus 
            ? "All systems are operational and ready for development." 
            : "Some components require attention. Check the details below."}
          </p>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="col-span-2 grid md:grid-cols-2 gap-4">
          {renderList(0, 5)}
          {renderList(5, 10)}
        </div>
      </div>
    </div>
  );
};
