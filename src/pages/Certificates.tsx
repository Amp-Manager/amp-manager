import { useState, useRef, useEffect, useCallback } from "react";
import { ShieldCheck, RefreshCw, Trash2, AlertTriangle, XCircle, RefreshCcw, Info, CheckCircle } from "lucide-react";
import { toast } from "@/utils/toast";
import { ampBridge } from "@/services/AMPBridge";
import { useAuth } from "@/context/AuthContext";
import type { Domain } from "@/types/entities";

interface Certificate {
  domain: string;
  ssl: boolean;
  needsRegeneration: boolean;
}

export default function Certificates() {
  const { user } = useAuth();
  const resetModalRef = useRef<HTMLDialogElement>(null);
  const uninstallModalRef = useRef<HTMLDialogElement>(null);
  const regenAllModalRef = useRef<HTMLDialogElement>(null);
  
  const [isResetting, setIsResetting] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingDomain, setRegeneratingDomain] = useState<string | null>(null);
  
  const [caStatus, setCaStatus] = useState<{ caroot_ok: boolean; location: string; valid_until: string } | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCAStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!ampBridge.isAvailable()) throw new Error("Backend not connected");
      const [res, domainsRes] = await Promise.all([
        ampBridge.caStatus(),
        ampBridge.listDomains()
      ]);
      
      if (res.status === 'ok') {
        setCaStatus({
          caroot_ok: res.caroot_ok === true || res.caroot_ok === 'ok',
          location: res.location || "Unknown",
          valid_until: res.valid_until || "Unknown"
        });
      } else {
        throw new Error(res.message || "Failed to fetch CA status");
      }

      if (domainsRes.status === 'ok' && Array.isArray(domainsRes.domains)) {
        const sslDomains = (domainsRes.domains as { domain?: string; name?: string; ssl: boolean; ssl_valid?: boolean }[])
          .filter(d => d.ssl)
          .map(d => ({ 
            domain: d.domain || d.name || "unknown.local", 
            ssl: d.ssl,
            needsRegeneration: d.ssl_valid === false
          }));
        setCertificates(sslDomains);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCAStatus();
  }, []);

  // check if certificates need regeneration (now comes from backend via ssl_valid)
  const needs_regeneration = useCallback((cert: Certificate) => {
    return cert.needsRegeneration;
  }, []);

  const handleResetCA = async () => {
    setIsResetting(true);
    try {
      if (!ampBridge.isAvailable()) throw new Error("Backend not connected");
      const res = await ampBridge.caReset();
      if (res.status === 'ok') {
        resetModalRef.current?.close();
        
        // Refresh the list to get updated ssl_valid from backend
        await fetchCAStatus();
        
        toast.success("Certificate Authority reset successfully");
        // Show the regenerate all modal
        setTimeout(() => {
          regenAllModalRef.current?.showModal();
        }, 300);
      } else {
        toast.error(res.message || "Failed to reset CA");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsResetting(false);
    }
  };

  const handleUninstallCA = async () => {
    setIsUninstalling(true);
    try {
      if (!ampBridge.isAvailable()) throw new Error("Backend not connected");
      const res = await ampBridge.caUninstall();
      if (res.status === 'ok') {
        toast.success("Certificate Authority uninstalled");
        await fetchCAStatus();
        uninstallModalRef.current?.close();
      } else {
        toast.error(res.message || "Failed to uninstall CA");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsUninstalling(false);
    }
  };

  const handleInstallCA = async () => {
    setIsUninstalling(true);
    try {
      if (!ampBridge.isAvailable()) throw new Error("Backend not connected");
      const res = await ampBridge.caReset();
      if (res.status === 'ok') {
        toast.success("Certificate Authority installed successfully");
        await fetchCAStatus();
      } else {
        toast.error(res.message || "Failed to install CA");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsUninstalling(false);
    }
  };

  const handleRegenerateSsl = async (domain: string) => {
    setRegeneratingDomain(domain);
    try {
      if (!ampBridge.isAvailable()) throw new Error("Backend not connected");
      const res = await ampBridge.regenerateSsl(domain);
      if (res.status === 'ok') {
        toast.success(`SSL regenerated for ${domain}`);
        // Mark this certificate as no longer needing regeneration
        setCertificates(prev => prev.map(c => 
          c.domain === domain ? { ...c, needsRegeneration: false } : c
        ));
      } else {
        toast.error(res.message || "Failed to regenerate SSL");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setRegeneratingDomain(null);
    }
  };

  const handleRegenerateAllSsl = async () => {
    setIsRegenerating(true);
    try {
      if (!ampBridge.isAvailable()) throw new Error("Backend not connected");
      const res = await ampBridge.regenerateAllSsl();
      if (res.status === 'ok') {
        toast.success(`Regenerated ${res.regenerated || certificates.length} SSL certificates`);
        // Refresh to get updated ssl_valid from backend
        await fetchCAStatus();
        regenAllModalRef.current?.close();
      } else {
        toast.error(res.message || "Failed to regenerate certificates");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsRegenerating(false);
    }
  };

  const domainsNeedingRegen = certificates.filter(c => needs_regeneration(c));

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
        <div className="bg-indigo-500/10 rounded-lg p-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl tracking-tight">Certificates</h1>
          <p className="text-xs opacity-50">Manage trusted root Certificate Authority and local SSL certificates via mkcert.</p>
        </div>
        {domainsNeedingRegen.length > 0 && (
          <div className="justify-end">
            <button 
              className="btn btn-sm btn-warning"
              onClick={() => regenAllModalRef.current?.showModal()}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Regenerate All ({domainsNeedingRegen.length})
            </button>
          </div>
        )}      
      </div>

      <div className="grid grid-cols-3 gap-x-6 mb-0">
        <div>
          <div className="card bg-base-100 shadow border border-base-200">
            <div className="card-body p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin opacity-50" />
                </div>
              ) : error ? (
                <div className="alert alert-error">
                  <XCircle className="h-5 w-5" />
                  <span>{error}</span>
                  <button className="btn btn-sm btn-ghost" onClick={fetchCAStatus}>Retry</button>
                </div>
              ) : (
                <>
                <div className="flex-col space-y-2">
                  
                    <h2 className="card-title flex flex-1 items-center justify-between">
                      <span>Root CA Status</span>

                      <div className={`badge badge-sm badge-soft justify-end ${caStatus?.caroot_ok ? 'badge-success' : 'badge-error'} gap-2 p-3`}>
                        {caStatus?.caroot_ok ? <ShieldCheck className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {caStatus?.caroot_ok ? 'Installed' : 'Missing'}
                      </div>
                    </h2>
                    <p className="text-sm opacity-70">
                      The local Certificate Authority.
                    </p>
                  
                </div>

                <div className="rounded-md bg-base-200 p-3 mt-4">
                  <p><strong className="text-warning">Warning:</strong> Resetting or uninstalling the CA will invalidate all existing 
                  local SSL certificates. Your projects will show security errors until certificates 
                  are regenerated.</p>

                  <div className="flex justify-between gap-2 mt-4">
                    {caStatus?.caroot_ok ? (
                      <>
                        <button className="btn btn-sm btn-soft btn-error" onClick={() => resetModalRef.current?.showModal()}>
                          <RefreshCw className="h-4 w-4" />
                          Reset CA
                        </button>
                        <button className="btn btn-sm btn-error btn-outline" onClick={() => uninstallModalRef.current?.showModal()}>
                          <Trash2 className="h-4 w-4" />
                          Uninstall CA
                        </button>
                      </>
                    ) : (
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={handleInstallCA}
                        disabled={isUninstalling}
                      >
                        {isUninstalling ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        Install CA
                      </button>
                    )}
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-2 card bg-base-100 shadow border border-base-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <h2 className="card-title">Issued Certificates</h2>
              
            </div>
            <p className="text-sm opacity-70">
              Local domain SSL certificates using your custom Certificate Authority (CA).
            </p>
            <div className="bg-base-200 rounded-md p-2 mt-4">
              <div className="flex items-center justify-start text-sm">
                <span className="opacity-70 w-24 p-2">Location:</span>
                <span className="flex-1 bg-base-300 text-xs font-mono rounded p-2">{caStatus?.location}</span>
              </div>
              <div className="bg-base-200 flex justify-start text-sm mt-2">
                <span className="opacity-70 w-24 p-2">Valid Until:</span>
                <span className="flex-1 bg-base-300 font-mono rounded p-2">{caStatus?.valid_until}</span>
              </div>
            </div>
            
            <div className="alert alert-soft alert-info text-xs mt-4">
              <Info className="h-4 w-4" />
              <span>Certificates are automatically managed when you create or update domains.</span>
            </div>

            {certificates.length > 0 ? (
              <div className="mt-6 overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((cert) => (
                      <tr key={cert.domain}>
                        <td className="font-mono text-sm">{cert.domain}</td>
                        <td>
                          {needs_regeneration(cert) ? (
                            <div className="badge badge-sm badge-warning badge-soft gap-1">
                              <AlertTriangle className="h-3 w-3" /> Needs Regeneration
                            </div>
                          ) : (
                            <div className="badge badge-sm badge-success badge-soft gap-1">
                              <CheckCircle className="h-3 w-3" /> Valid
                            </div>
                          )}
                        </td>
                        <td className="text-right">
                          {needs_regeneration(cert) && (
                            <button 
                              className="btn btn-xs btn-warning"
                              onClick={() => handleRegenerateSsl(cert.domain)}
                              disabled={regeneratingDomain === cert.domain}
                            >
                              {regeneratingDomain === cert.domain ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                <RefreshCcw className="h-3 w-3 mr-1" />
                              )}
                              Regenerate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-base-300 text-center rounded-lg py-8 opacity-50">
                <p>No certificates found.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Reset CA Warning Modal */}
      <dialog ref={resetModalRef} className="modal">
        <div className="modal-box border-1 border-error">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <AlertTriangle className="h-7 w-7" />
            <h3 className="font-bold text-lg">Warning: Resetting Certificate Authority</h3>
          </div>
          
          <div className="py-4 space-y-4">
            <p className="font-medium text-base-content">
              Are you sure you want to reset the local Certificate Authority?
            </p>
            
            <div className="alert alert-error bg-error/10 text-error-content text-sm">
              <ul className="list-disc list-inside text-xs space-y-2">
                <li>This will run <code>mkcert -uninstall</code> and <code>mkcert -install</code> locally.</li>
                <li>All existing SSL certificates generated with the old CA will become invalid.</li>
                <li>You will need to regenerate SSL certificates for <strong>every local domain</strong>.</li>
                <li>Browsers may need to be restarted to recognize the new CA.</li>
              </ul>
            </div>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-sm btn-neutral mr-2" disabled={isResetting}>Cancel</button>
            </form>
            <button
              className="btn btn-sm btn-error btn-soft"
              onClick={handleResetCA}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Yes, Reset CA
                </>
              )}
            </button>
          </div>
        </div>
      </dialog>

      {/* Uninstall CA Warning Modal */}
      <dialog ref={uninstallModalRef} className="modal">
        <div className="modal-box border-1 border-error">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <Trash2 className="h-7 w-7" />
            <h3 className="font-bold text-lg">Warning: Uninstalling Certificate Authority</h3>
          </div>
          
          <div className="py-4 space-y-4">
            <p className="font-medium text-base-content">
                Are you sure you want to uninstall the local Certificate Authority?
            </p>
            <div className="alert alert-error bg-error/10 text-error-content text-sm">
              <p className="text-sm opacity-70">
                This will remove the CA from your system trust store.<br />
                All local .local sites will show SSL warnings.
              </p>
            </div>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-sm btn-neutral mr-2" disabled={isUninstalling}>Cancel</button>
            </form>
            <button
              className="btn btn-sm btn-error btn-outline"
              onClick={handleUninstallCA}
              disabled={isUninstalling}
            >
              {isUninstalling ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Uninstalling...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Yes, Uninstall CA
                </>
              )}
            </button>
          </div>
        </div>
      </dialog>

      {/* Regenerate All SSL Modal */}
      <dialog ref={regenAllModalRef} className="modal">
        <div className="modal-box border border-base-100">
          <div className="flex items-center gap-3 text-warning mb-4">
            <RefreshCcw className="h-8 w-8" />
            <h3 className="font-bold text-lg">Regenerate SSL Certificates</h3>
          </div>
          
          <div className="py-4 space-y-4">
            <p className="text-sm opacity-70">
              The following domains need new SSL certificates signed by the current CA:
            </p>
            
            {domainsNeedingRegen.length > 0 ? (
              <ul className="list-disc list-inside text-sm space-y-1 bg-base-200 rounded-lg p-3">
                {domainsNeedingRegen.map(c => (
                  <li key={c.domain} className="font-mono">{c.domain}</li>
                ))}
              </ul>
            ) : (
              <div className="alert alert-success">
                <CheckCircle className="h-4 w-4" />
                <span>All certificates are valid. No action needed.</span>
              </div>
            )}
            
            {domainsNeedingRegen.length > 0 && (
              <div className="alert alert-info text-xs">
                <Info className="h-4 w-4" />
                <span>This will regenerate SSL certificates for all listed domains using your current CA.</span>
              </div>
            )}
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-sm btn-ghost mr-2" disabled={isRegenerating}>Cancel</button>
            </form>
            {domainsNeedingRegen.length > 0 && (
              <button
                className="btn btn-sm btn-warning"
                onClick={handleRegenerateAllSsl}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Regenerate All ({domainsNeedingRegen.length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
