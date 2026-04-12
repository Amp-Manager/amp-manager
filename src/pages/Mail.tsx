import { Mail as MailIcon, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function Mail() {
  const [key, setKey] = useState(0);
  const mailpitUrl = "http://localhost:8025";

  const refreshIframe = () => {
    setKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-90px)] space-y-8">

      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
        <div className="bg-indigo-500/10 rounded-lg p-2">
          <MailIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl tracking-tight">Mail Catcher</h1>
          <p className="text-xs opacity-50">Host: <span className="font-mono text-primary-content">mailpit</span> | Port: <span className="font-mono text-primary-content">1025</span> | No authentication required.</p>
        </div>
        <div className="flex gap-4">
          <button 
            className="btn btn-sm btn-primary gap-2"
            onClick={refreshIframe}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <a 
            href={mailpitUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-sm btn-soft gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </a>
        </div>
      </div>

      <div className="flex-1 bg-base-300 h-[calc(100%-16px)] rounded-lg border border-base-300 overflow-hidden shadow-inner relative">
        <iframe 
          key={key}
          src={mailpitUrl} 
          className="w-full h-full border-none"
          title="Mailpit UI"
        />
        {/* Overlay if it fails to load or if blocked by CSP */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity bg-base-100/10">
           <p className="text-xs bg-base-100 p-2 rounded shadow border border-base-200">
             If the UI doesn't load, ensure Mailpit is running in Docker.
           </p>
        </div>
      </div>
    </div>
  );
}
