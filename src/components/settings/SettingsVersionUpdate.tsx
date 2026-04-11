import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import { ampBridge } from '@/services/AMPBridge';
import { toast } from '@/utils/toast';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export default function SettingsVersionUpdate() {
  const [appVersion, setAppVersion] = useState<string>('Loading...');
  const [appBuild, setAppBuild] = useState<string>('Loading...');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'uptodate' | 'available' | 'error'>('idle');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const fetchVersionWithRetry = async (retries = MAX_RETRIES) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (ampBridge.isAvailable()) {
          const vRes = await ampBridge.version();
          if (vRes && vRes.status === 'ok') {
            setAppVersion(vRes.version || 'Unknown');
            setAppBuild(vRes.build || 'Unknown');
            return;
          }
        } else {
          setAppVersion('Browser Mode');
          setAppBuild('Browser Mode');
          return;
        }
      } catch (err) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    setAppVersion('Unavailable');
    setAppBuild('Unavailable');
  };

  useEffect(() => {
    fetchVersionWithRetry();
  }, []);

  const checkForUpdates = async () => {
    setUpdateStatus('checking');
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("https://api.github.com/repos/amp-manager/amp-manager/releases/latest");
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (data.tag_name) {
          const latest = data.tag_name.replace('v', '');
          setLatestVersion(latest);
          setUpdateStatus(latest !== appVersion ? 'available' : 'uptodate');
          return;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    
    setUpdateStatus('error');
    setLatestVersion(null);
    toast.error(lastError?.message || "Failed to check for updates");
  };

  const openGitHub = () => {
    const url = "https://github.com/amp-manager/amp-manager/releases";
    if (ampBridge.isAvailable()) {
      ampBridge.os.open(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="card bg-base-100 shadow border border-base-200">
      <div className="card-body">
        <div className="grid grid-cols-2 gap-4">
          
          <div className="space-y-1">
            <img src="icons/appIcon.png" className="w-32 rounded-lg"/>
            <h2 className="text-xl">Amp Manager</h2>

            {/* Info Line */}
            <p className="text-sm opacity-70 mb-2">
              Built with open-source technologies.<br />
               Learn more in {" "}
              <Link to="/about" className="underline hover:text-primary">
                About
              </Link>
            </p>
  
           {/* Copyright Line */}
            <p className="text-sm opacity-70">© 2026 Nuno Luciano.<br /> Amp Manager is licensed under the MIT License.</p>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="card-title">Application Information</h2>
              <p className="text-sm opacity-70">Version update and repository.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="w-15 font-medium">Version</span>
              <div className="badge badge-soft badge-sm">{appVersion}</div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="w-15 font-medium">Build</span>
              <div className="badge badge-soft badge-sm">{appBuild}</div>
            </div>
            
            {/* Buttons */}
            <div className="card-actions gap-4">
              <button 
                className="btn btn-neutral btn-sm"
                onClick={checkForUpdates}
                disabled={updateStatus === 'checking'}
              >
                {updateStatus === 'checking' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Check for Updates
                  </>
                )}
              </button>
              <button 
                className="btn btn-soft btn-sm"
                onClick={openGitHub}
              >
                <ExternalLink className="w-4 h-4" />
                Open GitHub
              </button>
            </div>

            {/* Update Status Messages */}
            {updateStatus === 'available' && latestVersion && (
              <div className="alert alert-success alert-soft text-xs mt-3 py-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>
                  New version <strong>{latestVersion}</strong> available!
                  <a 
                    href="https://github.com/amp-manager/amp-manager/releases" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="link link-primary ml-1"
                  >
                    Download
                  </a>
                </span>
              </div>
            )}

            {updateStatus === 'uptodate' && (
              <div className="alert alert-info text-xs mt-3 py-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>You are up to date.</span>
              </div>
            )}

            {updateStatus === 'error' && (
              <div className="alert alert-warning alert-soft text-xs mt-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Could not check for updates. Try again later.</span>
              </div>
            )}

            {/* SmartScreen Note */}
            <p className="alert alert-warning alert-soft text-xs mt-4">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Windows may show a security warning for unsigned apps.<br /> 
              Click "More info" → "Run anyway" to proceed.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
