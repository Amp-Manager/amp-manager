import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { HardDrive, RefreshCw, AlertCircle, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/utils/toast";
import { ampBridge } from "@/services/AMPBridge";
import { initDB } from "@/lib/db";
import { useAuth } from "@/context/AuthContext";
import type { HostEntry } from "@/types/entities";

export default function Hosts() {
  const { user } = useAuth();
  const [hosts, setHosts] = useState<HostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHosts = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!ampBridge.isAvailable()) throw new Error("Backend not connected");
      
      // Get HOSTS entries
      const hostsRes = await ampBridge.scanDomains();
      if (hostsRes.status !== 'ok') throw new Error(hostsRes.message || "Failed to scan domains");
      
      // Get AMP domains from IndexedDB (reuses DomainStatus)
      const db = await initDB(user || 'default');
      const domainStatuses = await db.getAll('domain_status');
      const ampDomains = new Set(domainStatuses.map((d: any) => d.domain));
      
      // Map HOSTS entries with source status
      const mapped: HostEntry[] = (hostsRes.domains as any[]).map((d: any) => {
        const domainName = typeof d === 'string' ? d : d.name || d.domain;
        return {
          ip: "127.0.0.1",
          domain: domainName,
          source: ampDomains.has(domainName) ? 'AMP' as const : 'other' as const
        };
      });
      setHosts(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const confirmModalRef = React.useRef<HTMLDialogElement>(null);

  const handleRemoveClick = (domain: string) => {
    setConfirmDelete(domain);
    confirmModalRef.current?.showModal();
  };

  const handleConfirmRemove = async () => {
    if (!confirmDelete || !ampBridge.isAvailable()) return;
    
    confirmModalRef.current?.close();
    setRemoving(confirmDelete);
    try {
      const res = await ampBridge.removeDomain(confirmDelete);
      if (res.status === 'ok') {
        toast.success(`Domain ${confirmDelete} removed successfully`);
        fetchHosts();
      } else {
        toast.error(res.message || `Failed to remove ${confirmDelete}`);
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setRemoving(null);
      setConfirmDelete(null);
    }
  };

  useEffect(() => {
    fetchHosts();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
        <div className="bg-indigo-500/10 rounded-lg p-2">
          <HardDrive className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl tracking-tight">Hosts File</h1>
          <p className="text-xs opacity-50">Entries from your Windows hosts file managed by AMP.</p>
        </div>
        <div className="flex gap-4">
          <button 
            className="btn btn-sm btn-soft" 
            onClick={fetchHosts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="card bg-base-100 shadow border border-base-200 mb-0">
        <div className="card-body">
          <h2 className="card-title">System Hosts</h2>
          <p className="bg-base-200 font-mono text-sm rounded-md opacity-70 px-4 py-2 mb-4">
            C:\Windows\System32\drivers\etc\hosts
          </p>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin opacity-20" />
            </div>
          ) : error ? (
            <div className="alert alert-error">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : hosts.length === 0 ? (
            <div className="text-center py-12 opacity-50">
              No .local entries found in hosts file.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-[200px]">IP Address</th>
                    <th>Domain</th>
                    <th className="text-center">Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hosts.map((host, i) => (
                    <tr key={i} className="hover">
                      <td className="font-mono">{host.ip}</td>
                      <td className="font-medium">{host.domain}</td>
                      <td className="text-center">
                        {host.source === 'AMP' ? (
                          <span className="badge badge-primary badge-sm badge-soft">AMP Manager</span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">Unmanaged</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button 
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => handleRemoveClick(host.domain)}
                          disabled={removing === host.domain}
                        >
                          {removing === host.domain ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <dialog ref={confirmModalRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box border border-base-100 shadow-2xl">
          <h3 className="font-bold text-lg flex items-center gap-2 text-error">
            <AlertTriangle className="h-5 w-5" />
            Confirm Removal
          </h3>
          <p className="py-4">
            Are you sure you want to remove <strong>{confirmDelete}</strong> from the hosts file?
          </p>
          <div className="alert alert-sm alert-error alert-soft">
            This will also attempt to remove associated configuration and SSL files if they exist.
          </div>
          <div className="modal-action">
            <button className="btn btn-sm btn-soft" onClick={() => confirmModalRef.current?.close()}>Cancel</button>
            <button type="button" className="btn btn-sm btn-error px-8" onClick={handleConfirmRemove}>
              Remove Entry
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
