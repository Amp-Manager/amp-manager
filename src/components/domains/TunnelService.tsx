import React, { useState, useEffect } from "react";
import { Play, Square, Copy, Loader2, AlertTriangle, ExternalLink, Settings } from "lucide-react";
import { loadSettingsJSON, loadTunnelsJSON, saveTunnelsJSON, loadCredentialsJSON } from "@/lib/db";
import { useAuth } from "@/context/AuthContext";
import { decryptWithKey } from "@/lib/crypto";
import { toast } from "@/utils/toast";
import { Link } from "react-router-dom";
import { ampBridge } from "@/services/AMPBridge";

export const TUNNEL_PROFILES = [
  {
    id: 'localhostrun',
    name: 'localhost.run',
    defaultExe: 'ssh',
    getCommand: (exe: string, domain: string, port: number) => 
      `${exe} -R 80:${domain}:${port} nokey@localhost.run`,
    regex: /(https:\/\/[a-zA-Z0-9.-]+)/,
    needsToken: false,
  },
  {
    id: 'serveo',
    name: 'Serveo',
    defaultExe: 'ssh',
    getCommand: (exe: string, domain: string, port: number) => 
      `${exe} -R 80:${domain}:${port} serveo.net`,
    regex: /(https:\/\/[a-zA-Z0-9-]+\.serveousercontent\.com)/,
    needsToken: false,
  },
  {
    id: 'localtonet',
    name: 'Localtonet',
    defaultExe: 'ssh',
    getCommand: (exe: string, domain: string, port: number, token?: string) => 
      `${exe} -p 223 -R 80:${domain}:${port} ${token || 'YOUR_TOKEN'}@localto.net`,
    regex: /(https:\/\/[a-zA-Z0-9-]+\.localto\.net)/,
    needsToken: true,
  }
];

interface TunnelServiceProps {
  domain: string;
  onClose: () => void;
  onStatusChange?: () => void;
}

export default function TunnelService({ domain, onClose, onStatusChange }: TunnelServiceProps) {
  const { user, encryptionKey } = useAuth();
  const [activeProfile, setActiveProfile] = useState<string>('');
  const [activeTunnels, setActiveTunnels] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [processId, setProcessId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const handleOutputRef = React.useRef<((data: any) => void) | null>(null);

  useEffect(() => {
    return () => {
      if (handleOutputRef.current) {
        ampBridge.events.off('spawnedProcess', handleOutputRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    // Check if any active tunnel for this domain
    const checkActiveTunnel = async () => {
      if (!user) return;
      try {
        const settings = await loadSettingsJSON(user);
        
        // Fetch active tunnel providers from settings in parallel
        const settingsResults = await Promise.all(
          TUNNEL_PROFILES.map(async (p) => {
            return { id: p.id, active: settings[`tunnel_active_${p.id}`] === true };
          })
        );

        if (!mounted) return;

        const enabledTunnels = settingsResults
          .filter(r => r.active)
          .map(r => r.id);

        setActiveTunnels(enabledTunnels);
        if (enabledTunnels.length > 0) {
          setActiveProfile(enabledTunnels[0]);
        }

        const tunnels = await loadTunnelsJSON(user);
        const tunnel = tunnels.find(t => t.domain === domain);
        if (!mounted) return;

        if (tunnel && tunnel.status === 'active') {
          setActiveProfile(tunnel.profile);
          setPublicUrl(tunnel.publicUrl);
          setProcessId(tunnel.processId);
          setStatus('active');
        }
      } catch (err) {
        // Silently fail - tunnel status will default to inactive
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    checkActiveTunnel();

    return () => {
      mounted = false;
    };
  }, [domain, user]);

  const startTunnel = async () => {
    if (!user || !ampBridge.isAvailable()) return;
    
    setStatus('starting');
    setError(null);
    
    let timeoutId: any;
    
    try {
      // Get executable path from settings
      const settings = await loadSettingsJSON(user);
      const profile = TUNNEL_PROFILES.find(p => p.id === activeProfile);
      
      if (!profile) throw new Error("Profile not found");
      
      const exePath = settings[`tunnel_exe_${activeProfile}`] || profile.defaultExe;
      const template = settings[`tunnel_template_${activeProfile}`];
      const port = 8080;
      
      // Get token from credentials if available
      let token = undefined;
      const creds = await loadCredentialsJSON(user, encryptionKey || undefined);
      
      // Get token for tunnel service
      const tokenCred = creds.find(c => c.type === `tunnel_${activeProfile}`);
      if (tokenCred) {
        if (!encryptionKey) {
          throw new Error("Encryption key not available. Please log in again.");
        }
        token = await decryptWithKey(tokenCred.iv, tokenCred.secret, encryptionKey);
      } else if (profile.needsToken) {
        throw new Error(`Authentication token required for ${profile.name}. Please add it in Settings.`);
      }

      let command = "";
      if (template) {
        command = template
          .replace(/{domain}/g, domain)
          .replace(/{token}/g, token || '')
          .replace(/{port}/g, port.toString());
      } else {
        command = profile.getCommand(exePath, domain, port, token);
      }
      
      // Spawn process
      const spawnRes = await ampBridge.os.spawnProcess(command);
      const pid = spawnRes.id;
      
      // Immediately send an empty line to handle the password prompt
      setTimeout(async () => {
        try {
          await ampBridge.os.updateSpawnedProcess(pid, 'stdIn', '\n');
        } catch (e) {
          // Silently ignore - password prompt may not appear
        }
      }, 500);
      
      // Listen for output
      const handleOutput = async (evt: any) => {
        if (evt.detail.id === pid) {
          if (evt.detail.action === 'stdOut' || evt.detail.action === 'stdErr') {
            const output = evt.detail.data || '';
            
            // Automatically accept host key if prompted
            if (output.toLowerCase().includes('(y/n)')) {
              try {
                await ampBridge.os.updateSpawnedProcess(pid, 'stdIn', 'y\r\n');
              } catch (e) {
                // Silently ignore - host key acceptance may not be needed
              }
            }
            
            // Automatically handle empty password prompt (fallback)
            if (output.toLowerCase().includes('password:')) {
              try {
                await ampBridge.os.updateSpawnedProcess(pid, 'stdIn', '\n');
              } catch (e) {
                // Silently ignore - password prompt may not appear
              }
            }
          }

          if (evt.detail.action === 'stdOut') {
            const output = evt.detail.data;
            const match = output.match(profile.regex);
            
            if (match) {
              clearTimeout(timeoutId);
              const url = match[1];
              setPublicUrl(url);
              setProcessId(pid);
              setStatus('active');
              
              // Save to JSON storage
              const tunnels = await loadTunnelsJSON(user);
              const existingIndex = tunnels.findIndex(t => t.domain === domain);
              const newTunnel = {
                domain,
                profile: activeProfile,
                publicUrl: url,
                processId: pid,
                startedAt: Date.now(),
                status: 'active'
              };
              if (existingIndex >= 0) {
                tunnels[existingIndex] = newTunnel;
              } else {
                tunnels.push(newTunnel);
              }
              await saveTunnelsJSON(user, tunnels);
              
              // Remove listener once we have the URL
              ampBridge.events.off('spawnedProcess', handleOutput);
              handleOutputRef.current = null;
              onStatusChange?.();
            }
          } else if (evt.detail.action === 'stdErr') {
            const output = evt.detail.data;
            if (output.toLowerCase().includes('not recognized') || output.toLowerCase().includes('command not found')) {
              clearTimeout(timeoutId);
              ampBridge.events.off('spawnedProcess', handleOutput);
              handleOutputRef.current = null;
              ampBridge.os.updateSpawnedProcess(pid, 'exit');
              setStatus('error');
              setError(`Executable not found. Please verify your executable path in Settings.`);
            } else {
              // Capture the error for display if it's not a generic "not found" error
              setError(`Tunnel error: ${output}`);
            }
          } else if (evt.detail.action === 'exit') {
            clearTimeout(timeoutId);
            ampBridge.events.off('spawnedProcess', handleOutput);
            handleOutputRef.current = null;
            setStatus('error');
            // Only set generic error if we don't already have a more specific one from stdErr
            setError(prev => prev || `Tunnel process exited unexpectedly. If this persists, please check your token and settings.`);
          }
        }
      };
      
      handleOutputRef.current = handleOutput;
      ampBridge.events.on('spawnedProcess', handleOutput);
      
      // Timeout if URL not found within 60 seconds
      timeoutId = setTimeout(() => {
        setStatus(currentStatus => {
          if (currentStatus === 'starting') {
            ampBridge.events.off('spawnedProcess', handleOutput);
            handleOutputRef.current = null;
            ampBridge.os.updateSpawnedProcess(pid, 'exit');
            setError("Timeout waiting for tunnel URL. Check executable path and token.");
            return 'error';
          }
          return currentStatus;
        });
      }, 60000);

    } catch (err: any) {
      setStatus('error');
      setError(err.message || "Failed to start tunnel");
    }
  };

  const stopTunnel = async () => {
    if (!user || !processId || !ampBridge.isAvailable()) return;
    
    try {
      await ampBridge.os.updateSpawnedProcess(processId, 'exit');
      
      const tunnels = await loadTunnelsJSON(user);
      const filtered = tunnels.filter(t => t.domain !== domain);
      await saveTunnelsJSON(user, filtered);
      
      setStatus('idle');
      setPublicUrl(null);
      setProcessId(null);
      toast.success("Tunnel stopped");
      onStatusChange?.();
    } catch (err: any) {
      toast.error("Failed to stop tunnel process");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-base-300/50 border border-base-100 rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            Tunnel: {domain}
          </h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>
        
        <div className="p-6 space-y-6">
          {isInitializing ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm opacity-70">Checking tunnel status...</p>
            </div>
          ) : status === 'idle' ? (
            activeTunnels.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <AlertTriangle className="h-12 w-12 text-warning mx-auto opacity-50" />
                <h4 className="font-bold text-lg">No Tunnels Configured</h4>
                <p className="text-sm opacity-70">
                  You haven't enabled any tunnel services yet. Please configure a provider in Settings.
                </p>
                <Link to="/settings" className="btn btn-primary mt-4" onClick={onClose}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Tunnels
                </Link>
              </div>
            ) : (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Select Tunnel Provider</span>
                </label>
                <select 
                  className="select select-bordered w-full" 
                  value={activeProfile}
                  onChange={(e) => setActiveProfile(e.target.value)}
                >
                  {TUNNEL_PROFILES.filter(p => activeTunnels.includes(p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt opacity-70">
                    {TUNNEL_PROFILES.find(p => p.id === activeProfile)?.needsToken 
                      ? "Requires auth token in Settings."
                      : "No setup required."}
                  </span>
                  <Link to="/settings" className="label-text-alt text-primary hover:underline flex items-center gap-1" onClick={onClose}>
                    <Settings className="h-3 w-3" /> Configure
                  </Link>
                </label>
              </div>

              <div className="bg-base-200 p-4 rounded-lg text-sm opacity-80">
                <p className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>
                    Exposing a local project to the internet bypasses your firewall. Ensure your project does not contain sensitive data or weak passwords.
                  </span>
                </p>
              </div>

              <button className="btn btn-primary w-full" onClick={startTunnel}>
                <Play className="h-4 w-4 mr-2" />
                Start Tunnel
              </button>
            </>
            )
          ) : status === 'starting' ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="font-medium animate-pulse">Establishing secure tunnel...</p>
              <p className="text-xs opacity-50">Waiting for public URL</p>
            </div>
          ) : status === 'active' && publicUrl ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="flex items-center gap-2 text-success font-bold">
                  <div className="h-3 w-3 rounded-full bg-success animate-pulse"></div>
                  Tunnel is Live
                </div>
                <p className="text-sm opacity-70 text-center">
                  Your local project is now accessible on the internet.
                </p>
              </div>

              <div className="bg-base-200 p-4 rounded-lg border border-base-300">
                <label className="text-xs font-bold uppercase tracking-wider opacity-50 mb-2 block">Public URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={publicUrl} 
                    className="input input-bordered w-full font-mono text-sm bg-base-100" 
                  />
                  <button 
                    className="btn btn-square btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl);
                      toast.success("URL copied to clipboard");
                    }}
                    title="Copy URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <button className="btn btn-error w-full" onClick={stopTunnel}>
                <Square className="h-4 w-4 mr-2" />
                Stop Tunnel
              </button>
            </div>
          ) : status === 'error' ? (
            <div className="space-y-4">
              <div className="bg-error/10 border border-error/20 p-4 rounded-lg">
                <h4 className="font-bold text-error flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Tunnel Failed
                </h4>
                <p className="text-sm text-error/80">{error}</p>
              </div>
              <button className="btn btn-soft w-full" onClick={() => setStatus('idle')}>
                Try Again
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
