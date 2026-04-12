import React, { useState, useRef, useEffect, Suspense, lazy } from "react";
import { Loader2, Check, AlertCircle, Globe, AlertTriangle } from "lucide-react";
import { toast } from "@/utils/toast";
import { AmpStep } from "@/types/amp";
import { loadSitesJSON, saveSitesJSON, logActivityJSON } from "@/lib/db";
import { useAuth } from "@/context/AuthContext";
import { ampBridge } from "@/services/AMPBridge";

const TagSelector = lazy(() => import("@/components/layout/TagSelector"));

interface CreateSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateSiteModal({ isOpen, onClose, onSuccess }: CreateSiteModalProps) {
  const { user } = useAuth();
  const [domainName, setDomainName] = useState("");
  const [shouldScaffold, setShouldScaffold] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [sitesCount, setSitesCount] = useState<Record<string, number>>({});
  const [steps, setSteps] = useState<AmpStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.showModal();
      // Only reset completion state, preserve user input
      setIsCreating(false);
      setSteps([]);
      setError(null);
      setWarning(null);
      setSuccess(false);
    } else {
      modalRef.current?.close();
    }
  }, [isOpen]);

  const loadUsage = async () => {
    if (!user) return;
    try {
      const sites = await loadSitesJSON();
      const counts: Record<string, number> = {};
      sites.forEach(s => {
        s.tags?.forEach(t => {
          counts[t] = (counts[t] || 0) + 1;
        });
      });
      setSitesCount(counts);
    } catch (e) {
      // Silently fail - tag counts will be empty
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      loadUsage();
    }
  }, [isOpen, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) return;

    const fullDomain = `${domainName.trim().toLowerCase()}.local`;
    setIsCreating(true);
    setError(null);
    setWarning(null);
    
    // Initial steps state (aligned with batch execution order)
    const initialSteps: AmpStep[] = [
      { name: "scaffold", label: "Project folder", success: false },
      { name: "ssl", label: "SSL certificate", success: false },
      { name: "config", label: "Angie configuration", success: false },
      { name: "hosts", label: "Hosts file entry", success: false }
    ];
    setSteps(initialSteps);

    try {
      // 1. Pre-flight CA check
      if (ampBridge.isAvailable()) {
        const envCheck = await ampBridge.envCheck();
        if (!envCheck?.caroot_ok || envCheck.caroot_ok === 'fail' || envCheck.caroot_ok === false) {
          setError('Certificate Authority not installed. Please install CA from the Certificates page before creating sites.');
          setIsCreating(false);
          return;
        }

        // 2. Check if domain exists in AMP managed sites
        const checkResult = await ampBridge.listDomains();
        if (checkResult.status === 'ok' && checkResult.domains) {
          const exists = checkResult.domains.some((d: any) => d.name === fullDomain);
          if (exists) {
            setError(`Domain ${fullDomain} already exists in managed sites.`);
            setIsCreating(false);
            return;
          }
        }

        // 3. Check if domain exists in HOSTS file (leftovers)
        const hostsResult = await ampBridge.scanDomains();
        if (hostsResult.status === 'ok' && hostsResult.domains) {
          const existsInHosts = (hostsResult.domains as any[]).some((d: any) => 
            typeof d === 'string' ? d === fullDomain : d.name === fullDomain
          );
          if (existsInHosts) {
            setWarning(`Domain ${fullDomain} already exists in your hosts file. You might want to remove it from the Hosts view first.`);
            toast.warning(`Domain ${fullDomain} already exists in hosts file.`);
          }
        }

        // 4. Trigger creation (backend expects lowercase)
        const result = await ampBridge.createDomain(domainName.trim().toLowerCase(), { scaffold: shouldScaffold });
        
        if (result.status === 'ok') {
          if (result.warning) {
            setWarning(result.warning);
            toast.warning("Site created with warnings");
          }
          const finalSteps = result.steps || initialSteps.map(s => ({ ...s, success: true }));
          
          // Play back steps sequentially for visual effect
          for (const step of finalSteps) {
            setSteps(prev => {
              const exists = prev.some(s => s.name === step.name);
              if (exists) {
                return prev.map(s => s.name === step.name ? step : s);
              }
              return [...prev, step];
            });
            await new Promise(r => setTimeout(r, 600)); // 600ms pause between steps
          }
          
          setSuccess(true);
          
          if (user) {
            try {
              const env = await ampBridge.envCheck();
              const projectRoot = env.project_root || '';
              const newSite = {
                id: fullDomain,
                domain: fullDomain,
                path: result.folder || `${projectRoot}\\www\\${fullDomain}`,
                tags: selectedTags,
                is_encrypted: false,
                created_at: Date.now(),
                updated_at: Date.now()
              };
              const sites = await loadSitesJSON();
              sites.push(newSite);
              await saveSitesJSON(sites);
              await logActivityJSON(user, 'create', 'domain', fullDomain, fullDomain);
            } catch (e) {
              // Silently fail - site was created successfully
            }
          }

          if (onSuccess) onSuccess();
        } else {
          if (result.steps) setSteps(result.steps);
          setError(result.message || "Failed to create site");
        }
      } else {
        // Mock for dev (already sequential)
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSteps(prev => prev.map(s => s.name === 'config' ? { ...s, success: true } : s));
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSteps(prev => prev.map(s => s.name === 'ssl' ? { ...s, success: true } : s));
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSteps(prev => prev.map(s => s.name === 'scaffold' ? { ...s, success: true } : s));
        setSuccess(true);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box border border-base-100">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Create New Local Site
        </h3>
        
        {!isCreating && !success && !error && (
          <form onSubmit={handleCreate} className="mt-6 space-y-4">
            <div className="form-control">
              <label className="label mb-2">
                <span className="label-text font-medium">Domain Name</span>
              </label>
              <div className="join items-center w-full mb-4">
                <input
                  type="text"
                  placeholder="project"
                  className="input input-bordered bg-base-300/80 border-base-200 join-item w-full"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  autoFocus
                  required
                />
                <div className="input input-bordered no-animation read-only:bg-base-300 border-base-200 join-item w-full max-w-16 px-4">.local</div>
              </div>
              <span className="label-text-alt opacity-70">
                New local development environment at <span className="badge badge-warning badge-soft">{domainName || 'project'}.local</span>
              </span>
            </div>

            <div className="form-control form-control bg-base-200/70 rounded-lg p-3">
              <label className="label cursor-pointer justify-start gap-3">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary checkbox-sm" 
                  checked={shouldScaffold}
                  onChange={(e) => setShouldScaffold(e.target.checked)}
                />
                <span className="label-text"><strong>Scaffold project files</strong>: index, error-pages 404, 50x.</span>
              </label>
              <p className="text-xs opacity-70 ml-8">
                Uncheck if you already have files in the <code>www/{domainName || 'project'}.local</code> folder.
              </p>
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-bold uppercase opacity-70">Tags</span>
              </label>
              <Suspense fallback={<div className="h-8 bg-base-300 animate-pulse rounded" />}>
                <TagSelector 
                  selectedTagIds={selectedTags}
                  onTagsChange={setSelectedTags}
                  getUsageCount={(id) => sitesCount[id] || 0}
                />
              </Suspense>
            </div>
            
            <div className="modal-action">
              <button type="button" className="btn btn-sm btn-soft" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-sm btn-primary px-8" disabled={!domainName.trim()}>
                Create Site
              </button>
            </div>
          </form>
        )}

        {(isCreating || success || error) && (
          <div className="mt-6 space-y-6">
            <ul className="steps steps-vertical w-full">
              {steps.map((step) => (
                <li 
                  key={step.name} 
                  className={`step ${step.success ? (warning ? "step-warning" : "step-success") : (error && !step.success ? "step-error" : "")}`}
                  data-content={step.success ? (warning ? "!" : "✓") : (error && !step.success ? "✕" : "●")}
                >
                  <div className="flex flex-col items-start text-left ml-4">
                    <span className="font-medium">{step.label}</span>
                    {step.path && <span className="text-xs opacity-50 font-mono">{step.path}</span>}
                    {step.error && <span className="text-xs text-error">{step.error}</span>}
                  </div>
                </li>
              ))}
            </ul>

            {isCreating && (
              <div className="flex items-center justify-center gap-3 p-4 bg-base-200 rounded-lg animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">Provisioning resources...</span>
              </div>
            )}

            {success && !warning && (
              <div className="alert alert-success shadow-lg">
                <Check className="h-5 w-5" />
                <div>
                  <h3 className="font-bold">Success!</h3>
                  <div className="text-xs">Site <strong>{domainName}.local</strong> is ready.</div>
                </div>
                <button className="btn btn-sm" onClick={() => {
                  setDomainName("");
                  setSelectedTags([]);
                  onClose();
                }}>Done</button>
              </div>
            )}

            {success && warning && (
              <div className="alert alert-warning shadow-lg">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <h3 className="font-bold">Created with Warnings</h3>
                  <div className="text-xs">{warning}</div>
                </div>
                <button className="btn btn-sm" onClick={() => {
                  setDomainName("");
                  setSelectedTags([]);
                  onClose();
                }}>Done</button>
              </div>
            )}

            {error && (
              <div className="alert alert-error shadow-lg">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <h3 className="font-bold">Error</h3>
                  <div className="text-xs">{error}</div>
                </div>
                <button className="btn btn-sm" onClick={() => { setError(null); setIsCreating(false); }}>Retry</button>
              </div>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
