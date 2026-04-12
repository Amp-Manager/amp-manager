import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Save, RotateCcw, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { loadSiteConfigsJSON, saveSiteConfigsJSON } from '@/lib/db';
import { useBatchError } from '@/context/BatchErrorContext';
import { ampBridge } from '@/services/AMPBridge';
import { toast } from '@/utils/toast';

interface DomainConfigEditorProps {
  domain: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'view' | 'edit';
}

export function DomainConfigEditor({ domain, open, onOpenChange, mode = 'edit' }: DomainConfigEditorProps) {
  useAuth(); // Required for auth context
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("editor");
  const [projectRoot, setProjectRoot] = useState("error");
  const { handleError } = useBatchError();
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.showModal();
      if (ampBridge.isAvailable()) {
        ampBridge.envCheck().then(env => {
          if (env.project_root) setProjectRoot(env.project_root);
        }).catch(() => {});
      }
    } else if (!open && modalRef.current) {
      modalRef.current.close();
    }
  }, [open]);

  useEffect(() => {
    if (domain && open) {
      loadConfig();
      loadHistory();
    }
  }, [domain, open]);

  const loadConfig = async () => {
    if (!domain) return;
    setIsLoading(true);
    try {
      const configs = await loadSiteConfigsJSON();
      const domainConfigs = configs.filter(c => c.site_id === domain.id);
      const latestConfig = domainConfigs.sort((a, b) => b.created_at - a.created_at)[0];
      
      if (latestConfig) {
        setContent(latestConfig.content);
      } else {
        await loadFromDisk();
      }
    } catch {
      setContent(`# Error loading configuration for ${domain.name}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromDisk = async () => {
    if (!domain) return;
    try {
      if (ampBridge.isAvailable()) {
        const env = await ampBridge.envCheck();
        const projectRoot = env.project_root || 'error';
        const fileContent = await ampBridge.fs.readTextFile(`${projectRoot}\\\\config\\\\angie-sites\\\\${domain.name}.conf`);
        setContent(fileContent);
      } else {
        throw new Error("Backend connection required to view configuration");
      }
    } catch (err) {
      setContent(`# Configuration for ${domain.name}\nserver {\n    listen 80;\n    server_name ${domain.name};\n    root ${domain.path};\n}`);
    }
  };

  const loadHistory = async () => {
    if (!domain) return;
    try {
      const configs = await loadSiteConfigsJSON();
      const domainConfigs = configs.filter(c => c.site_id === domain.id);
      setHistory(domainConfigs.sort((a: any, b: any) => b.created_at - a.created_at));
    } catch {
      // Silently fail - history is non-critical
    }
  };

  const handleSave = async (deploy: boolean = false) => {
    if (!domain) return;
    setIsSaving(true);
    try {
      const configs = await loadSiteConfigsJSON();
      const timestamp = Date.now();
      
      configs.push({
        id: timestamp,
        site_id: domain.id,
        content,
        version: history.length + 1,
        created_at: timestamp,
        is_active: deploy ? 1 : 0,
        hash: btoa(content).substring(0, 10)
      });
      await saveSiteConfigsJSON(configs);

      if (deploy && ampBridge.isAvailable()) {
        const env = await ampBridge.envCheck();
        const projectRoot = env.project_root || 'error';
        const configPath = `${projectRoot}\\\\config\\\\angie-sites\\\\${domain.name}.conf`;
        await ampBridge.fs.writeTextFile(configPath, content);
        
        const testResult = await ampBridge.angie.testConfig();
        if (!testResult.valid) {
          throw new Error(`Angie configuration test failed: ${testResult.output}`);
        }

        await ampBridge.angie.reload();
      }

      await loadHistory();
      if (deploy) {
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormat = () => {
    const lines = content.split('\n');
    let indentLevel = 0;
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.endsWith('}')) indentLevel = Math.max(0, indentLevel - 1);
      const indent = '    '.repeat(indentLevel);
      if (trimmed.endsWith('{')) indentLevel++;
      return indent + trimmed;
    }).join('\n');
    setContent(formatted);
  };

  return (
    <dialog ref={modalRef} className="modal">
      <div className="modal-box w-11/12 max-w-5xl h-[80vh] flex flex-col border border-base-100 p-0">
        <div className="p-6 pb-0">
          <h3 className="font-bold text-lg">{mode === 'view' ? 'View' : 'Edit'} Configuration: {domain?.name}</h3>
          <p className="py-2 text-sm opacity-70">
            {mode === 'view' ? 'Viewing' : 'Editing'} {projectRoot === 'error' ? 'error' : `${projectRoot}\\\\config\\\\angie-sites\\\\${domain?.name}.conf`}
          </p>
        </div>
        
        <div className="flex flex-col flex-1 min-h-0 px-6 pb-6">
          <div role="tablist" className="tabs tabs-sm tabs-box text-xs bg-base-300 rounded-md gap-1">
            <button 
              role="tab" 
              className={`tab ${activeTab === 'editor' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              Editor
            </button>
            <button 
              role="tab" 
              className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
          </div>

          <div className="bg-base-200 border-base-300 rounded-b-box border p-4 flex-1 flex flex-col min-h-0">
            {activeTab === 'editor' && (
              <div className="flex flex-col h-full">
                <div className="flex justify-between mb-4">
                  <div className="flex gap-2"></div>
                  {mode === 'edit' && (
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-soft gap-2" onClick={loadFromDisk} title="Reload from disk">
                        <RefreshCw className="h-4 w-4" />
                        Sync Disk
                      </button>
                      <button className="btn btn-sm btn-soft gap-2" onClick={handleFormat}>
                        Format
                      </button>
                      <button className="btn btn-sm btn-soft gap-2" onClick={() => handleSave(false)} disabled={isSaving}>
                        <Save className="h-4 w-4" />
                        Save Draft
                      </button>
                      <button className="btn btn-sm btn-soft gap-2" onClick={() => handleSave(true)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Deploy & Reload
                      </button>
                    </div>
                  )}
                </div>

                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin opacity-50" />
                  </div>
                ) : (
                  <textarea 
                    value={content} 
                    onChange={(e) => setContent(e.target.value)} 
                    className="textarea textarea-bordered bg-base-300 border-base-100 outline-none focus:rig-1 font-mono h-full w-full resize-none flex-1"
                    spellCheck={false}
                    readOnly={mode === 'view'}
                  />
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="overflow-y-auto h-full bg-base-200 p-4">
                <div className="space-y-4">
                  {history.map((ver) => (
                    <div key={ver.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="font-medium">Version {ver.version}</div>
                        <div className="text-sm opacity-70">
                          {new Date(ver.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ver.is_active === 1 && <div className="badge badge-soft badge-success">Active</div>}
                        <button className="btn btn-ghost btn-sm" onClick={() => setContent(ver.content)} disabled={mode === 'view'}>
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-center opacity-70 py-8">No history available</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-action px-6 pb-6 mt-0">
          <form method="dialog">
            <button className="btn btn-sm btn-neutral" onClick={() => onOpenChange(false)}>Close</button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
