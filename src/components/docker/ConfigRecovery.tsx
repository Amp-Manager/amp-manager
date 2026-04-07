import React, { useState, useEffect } from 'react';
import { Shield, RotateCcw, Camera, Trash2, Check, AlertTriangle, Clock, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { configGuardService, ESSENTIAL_FILES, ConfigBackup } from '@/services/ConfigGuardService';
import { toast } from '@/utils/toast';
import { format } from 'date-fns';

export function ConfigRecovery() {
  const { db } = useAuth();
  const [backups, setBackups] = useState<ConfigBackup[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const fetchBackups = async () => {
    if (!db) return;
    try {
      const data = await configGuardService.getBackups(db);
      setBackups(data);
    } catch (err) {
      // Silently fail - backups table will show empty
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [db]);

  const handleRestore = async (backup: ConfigBackup) => {
    if (!db) return;
    setLoading(true);
    try {
      await configGuardService.restoreFile(db, backup.id);
      toast.success(`Restored ${backup.filename} to ${backup.type} version`);
      setConfirmRestore(null);
    } catch (err: any) {
      toast.error(`Restore failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSnapshot = async (file: string) => {
    if (!db) return;
    setLoading(true);
    try {
      await configGuardService.createSnapshot(db, file);
      toast.success(`Snapshot created for ${file}`);
      await fetchBackups();
    } catch (err: any) {
      toast.error(`Snapshot failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await configGuardService.deleteBackup(db, id);
      toast.success("Snapshot deleted");
      await fetchBackups();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-200 rounded-lg shadow">
      <div className="card-body p-0">
        <div className="flex items-center justify-between p-4 border-b border-base-200">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <h2 className="card-title text-sm font-bold uppercase tracking-wider">Config Guard</h2>
          </div>
          <div className="badge badge-sm badge-soft badge-success gap-1">
            <Check className="w-3 h-3" /> Protected
          </div>
        </div>

        <div className="p-4 pt-2 space-y-6">
          <div className="alert alert-warning alert-soft p-4 rounded-lg">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Stability Protection</p>
                <p className="opacity-70 leading-relaxed">
                  These essential files are backed up automatically on first run. 
                  If you break your Docker stack, you can restore them to their "Factory" state here.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-visible">
            <table className="table table-xs [&_td]:py-2 w-full">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Backups</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ESSENTIAL_FILES.map(file => {
                  const fileBackups = backups.filter(b => b.filename === file);
                  const factory = fileBackups.find(b => b.type === 'factory');
                  const snapshots = fileBackups.filter(b => b.type === 'snapshot').sort((a, b) => b.timestamp - a.timestamp);

                  return (
                    <tr key={file} className="hover:bg-base-200/50">
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-blue-500">{file.split('/').pop()}</span>
                          <span className="text-[10px] opacity-50">{file}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {factory && (
                            <div className="badge badge-xs badge-ghost border-blue-500/20 text-blue-500">Factory</div>
                          )}
                          {snapshots.length > 0 && (
                            <div className="badge badge-xs badge-ghost">{snapshots.length} Snapshots</div>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="dropdown dropdown-end">
                          <label tabIndex={0} className="btn btn-xs btn-ghost">
                            Manage
                          </label>
                          <ul tabIndex={0} className="dropdown-content z-[50] menu bg-base-200 rounded-box w-64 border border-base-200 shadow-lg p-2 mt-1">
                            <li className="menu-title text-[10px] uppercase opacity-70">Factory Recovery</li>
                            {factory ? (
                              <li>
                                <button 
                                  className="text-xs flex items-center justify-between"
                                  onClick={() => setConfirmRestore(factory.id)}
                                >
                                  <span className="flex items-center gap-2">
                                    <RotateCcw className="w-3 h-3" /> Restore Factory
                                  </span>
                                </button>
                              </li>
                            ) : (
                              <li className="disabled"><span className="text-xs italic opacity-70">No factory backup</span></li>
                            )}
                            
                            <div className="divider my-1"></div>
                            
                            <li className="menu-title text-[10px] uppercase opacity-70">Snapshots</li>
                            <li>
                              <button 
                                className="text-xs flex items-center gap-2 text-blue-500"
                                onClick={() => handleSnapshot(file)}
                                disabled={loading}
                              >
                                <Camera className="w-3 h-3" /> Create Snapshot
                              </button>
                            </li>
                            {snapshots.map(s => (
                              <li key={s.id} className="group">
                                <div className="flex items-center justify-between py-1">
                                  <button 
                                    className="text-[10px] flex items-center gap-2 flex-1"
                                    onClick={() => setConfirmRestore(s.id)}
                                  >
                                    <Clock className="w-3 h-3" /> {format(s.timestamp, 'MMM d, HH:mm')}
                                  </button>
                                  <button 
                                    className="btn btn-xs btn-ghost text-error opacity-0 group-hover:opacity-100"
                                    onClick={() => handleDelete(s.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmRestore && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
              <RotateCcw className="w-5 h-5 text-warning" />
              Confirm Restore
            </h3>
            <p className="bg-base-300 text-sm rounded-lg p-4">
              Are you sure you want to restore <span className="font-bold text-blue-500">{backups.find(b => b.id === confirmRestore)?.filename}</span>?<br /> 
              This will overwrite the current file on your disk.
            </p>
            <div className="modal-action">
              <button className="btn btn-sm btn-ghost" onClick={() => setConfirmRestore(null)}>Cancel</button>
              <button 
                className="btn btn-sm btn-warning" 
                onClick={() => handleRestore(backups.find(b => b.id === confirmRestore)!)}
                disabled={loading}
              >
                {loading ? <span className="loading loading-spinner loading-xs"></span> : "Confirm Restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
