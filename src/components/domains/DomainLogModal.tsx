import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { RefreshCw, FileText, AlertCircle, Loader2, Terminal, Download } from "lucide-react";
import { toast } from "@/utils/toast";
import { ampBridge } from "@/services/AMPBridge";

interface DomainLogModalProps {
  domain: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DomainLogModal({ domain, open, onOpenChange }: DomainLogModalProps) {
  const [activeTab, setActiveTab] = useState("angie-access");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [projectRoot, setProjectRoot] = useState("");
  const modalRef = useRef<HTMLDialogElement>(null);

  const tabs = [
    { id: "angie-access", label: "Angie Access", path: (root: string, name: string) => `${root}\\logs\\angie\\${name}.access.log` },
    { id: "angie-error", label: "Angie Error", path: (root: string, name: string) => `${root}\\logs\\angie\\${name}.error.log` },
    { id: "php", label: "PHP Error", path: (root: string, name: string) => `${root}\\logs\\php\\${name}.error.log` },
  ];

  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.showModal();
    } else if (!open && modalRef.current) {
      modalRef.current.close();
    }
  }, [open]);

  // Load project root when modal opens
  useEffect(() => {
    if (open) {
      loadProjectRoot();
      // Reset content when modal opens
      setContent("");
    }
  }, [open]);

  // Load logs only when activeTab changes (lazy loading)
  useEffect(() => {
    if (domain && projectRoot && activeTab) {
      loadLog();
    }
  }, [activeTab, domain, projectRoot]);

  const loadProjectRoot = async () => {
    if (ampBridge.isAvailable()) {
      try {
        const env = await ampBridge.envCheck();
        setProjectRoot(env.project_root || "");
      } catch {
        // Silent fail - will retry when modal reopens
      }
    }
  };

  const loadLog = async () => {
    if (!domain || !projectRoot) return;
    setIsLoading(true);
    setContent("");
    
    try {
      if (ampBridge.isAvailable()) {
        const currentTab = tabs.find(t => t.id === activeTab);
        if (!currentTab) return;
        
        const logPath = currentTab.path(projectRoot, domain.name);
        try {
          const fileContent = await ampBridge.fs.readTextFile(logPath);
          // Show last 1000 lines or so if it's huge
          setContent(fileContent || "Log file is empty.");
        } catch (err) {
          setContent(`Log file not found at:\n${logPath}\n\nMake sure the service is running and generating logs.`);
        }
      } else {
        setContent("Backend connection required to view logs.");
      }
    } catch {
      setContent("Error loading log file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${domain?.name}-${activeTab}.log`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <dialog ref={modalRef} className="modal">
      <div className="modal-box w-11/12 max-w-5xl h-[80vh] flex flex-col border border-base-100 p-0">
        <div className="p-6 pb-2 flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Domain Logs: {domain?.name}
            </h3>
            <p className="text-sm opacity-70 mt-1">
              Domain real-time logs from the local stack.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              className="btn btn-sm btn-soft" 
              onClick={loadLog}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              className="btn btn-sm btn-soft" 
              onClick={handleDownload}
              disabled={!content || isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
          </div>
        </div>

        <div className="px-6 flex-1 flex flex-col min-h-0 mb-6">
          <div role="tablist" className="tabs tabs-sm tabs-box text-xs bg-base-300 rounded-md gap-1">
            {tabs.map((tab) => (
              <a
                key={tab.id}
                role="tab"
                className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </a>
            ))}
          </div>

          <div className="bg-base-100 border-base-300 rounded-b-box border p-0 flex-1 flex flex-col min-h-0 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-base-100/50 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            <textarea
              value={content}
              readOnly
              className="textarea textarea-ghost font-mono text-xs h-full w-full resize-none p-4 focus:outline-none bg-base-300/30"
              placeholder="Waiting for logs..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className="modal-action px-6 pb-6 mt-0">
          <form method="dialog">
            <button className="btn btn-sm" onClick={() => onOpenChange(false)}>Close</button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
