import React from 'react';
import { Node } from '@xyflow/react';
import { Settings, X } from 'lucide-react';
import { CustomNodeData } from '../types';
import type { Domain, Credential } from '@/types/entities';

interface WorkflowInspectorProps {
  selectedNode: Node | null;
  setIsInspectorOpen: (open: boolean) => void;
  updateNodeData: (nodeId: string, newData: CustomNodeData) => void;
  sites: Domain[];
  credentials: Credential[];
}

export const WorkflowInspector: React.FC<WorkflowInspectorProps> = ({
  selectedNode,
  setIsInspectorOpen,
  updateNodeData,
  sites,
  credentials,
}) => {
  if (!selectedNode) return null;
  const data = selectedNode.data as CustomNodeData;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 border-b border-base-300 pb-2">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Settings className="w-4 h-4" /> Configuration
        </h3>
        <button onClick={() => setIsInspectorOpen(false)} className="btn btn-ghost btn-xs">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {selectedNode.type === 'source' && (
          <>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">Source Type</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={data.sourceType || "local"}
                onChange={(e) => updateNodeData(selectedNode.id, { sourceType: e.target.value as 'local' | 'remote' })}
              >
                <option value="local">Local Domain</option>
                <option value="remote">Remote Repository</option>
              </select>
            </div>

            {data.sourceType === 'remote' ? (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Remote URL</span>
                </label>
                <input 
                  type="text" 
                  placeholder="git@github.com:user/repo.git" 
                  className="input input-bordered w-full text-sm"
                  value={data.remoteUrl || ""}
                  onChange={(e) => updateNodeData(selectedNode.id, { remoteUrl: e.target.value })}
                />
              </div>
            ) : (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Select Domain</span>
                </label>
                <select 
                  className="select select-bordered w-full" 
                  value={data.domain || ""} 
                  onChange={(e) => updateNodeData(selectedNode.id, { domain: e.target.value })}
                >
                  <option value="" disabled>Select Domain</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {selectedNode.type === 'action' && (
          <>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">Task Type</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={data.actionType || "command"}
                onChange={(e) => updateNodeData(selectedNode.id, { actionType: e.target.value as 'command' | 'git_clone' | 'git_pull' | 'git_push' | 'sftp_sync' })}
              >
                <option value="command">Custom Command</option>
                <option value="git_clone">Git Clone</option>
                <option value="git_pull">Git Pull</option>
                <option value="git_push">Git Push</option>
                <option value="sftp_sync">SFTP Sync</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Working Domain (Optional)</span>
              </label>
              <select 
                className="select select-bordered w-full text-sm" 
                value={data.domain || ""} 
                onChange={(e) => updateNodeData(selectedNode.id, { domain: e.target.value })}
              >
                <option value="">Auto-detect from Source/Target</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            {data.actionType === 'command' ? (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Command</span>
                </label>
                <input 
                  type="text" 
                  placeholder="npm run build" 
                  className="input input-bordered w-full font-mono text-sm"
                  value={data.command || ""}
                  onChange={(e) => updateNodeData(selectedNode.id, { command: e.target.value })}
                />
              </div>
            ) : (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Target (Branch/Path)</span>
                </label>
                <input 
                  type="text" 
                  placeholder={data.actionType?.includes('git') ? 'main' : '/var/www/html'} 
                  className="input input-bordered w-full text-sm"
                  value={data.target || ""}
                  onChange={(e) => updateNodeData(selectedNode.id, { target: e.target.value })}
                />
              </div>
            )}
          </>
        )}

        {selectedNode.type === 'bridge' && (
          <>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">Target Type</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={data.targetType || "remote"}
                onChange={(e) => updateNodeData(selectedNode.id, { targetType: e.target.value as 'local' | 'remote' })}
              >
                <option value="remote">Remote Bridge</option>
                <option value="local">Local Domain</option>
              </select>
            </div>

            {data.targetType === 'local' ? (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Select Domain</span>
                </label>
                <select 
                  className="select select-bordered w-full" 
                  value={data.domain || ""} 
                  onChange={(e) => updateNodeData(selectedNode.id, { domain: e.target.value })}
                >
                  <option value="" disabled>Select Domain</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Bridge Type</span>
                  </label>
                  <select 
                    className="select select-bordered w-full"
                    value={data.bridgeType || "git"}
                    onChange={(e) => updateNodeData(selectedNode.id, { bridgeType: e.target.value })}
                  >
                    <option value="git">Git Push</option>
                    <option value="sftp">SFTP Upload</option>
                    <option value="webhook">Webhook</option>
                  </select>
                </div>

                {data.bridgeType === 'sftp' && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Host / IP</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="sftp.example.com" 
                      className="input input-bordered w-full text-sm"
                      value={data.host || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { host: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Target (Path/URL/Branch)</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. /var/www/html or main" 
                    className="input input-bordered w-full text-sm"
                    value={data.target || ""}
                    onChange={(e) => updateNodeData(selectedNode.id, { target: e.target.value })}
                  />
                </div>
              </>
            )}

            {data.targetType !== 'local' && (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Credential</span>
                  </label>
                  <select 
                    className="select select-bordered w-full"
                    value={data.credentialId || ""}
                    onChange={(e) => updateNodeData(selectedNode.id, { credentialId: e.target.value })}
                  >
                    <option value="">Select Credential...</option>
                    {credentials.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>
                
                {/* SFTP SSH Key Help */}
                {data.bridgeType === 'sftp' && (
                  <div className="alert alert-info text-xs mt-2">
                    <div>
                      <p className="font-bold mb-1">SSH Key Required</p>
                      <p>SFTP uses SSH key authentication. To connect:</p>
                      <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                        <li>Use "AMP Manager SSH Key" or create SSH credential</li>
                        <li>Add your public key to server: <code className="bg-base-200 px-1 rounded">~/.ssh/authorized_keys</code></li>
                        <li>Get public key: Settings → SSH Key</li>
                      </ol>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
