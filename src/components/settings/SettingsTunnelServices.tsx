import React, { useState, useEffect } from 'react';
import { Loader2, Save, Globe, Square, Key, AlertCircle } from 'lucide-react';
import { loadSettingsJSON, saveSettingsJSON, loadTunnelsJSON, saveTunnelsJSON } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/utils/toast';
import { ampBridge } from '@/services/AMPBridge';

const TUNNEL_SERVICES = [
  { 
    id: 'localhostrun', 
    name: 'localhost.run',
    defaultCommand: 'ssh -R 80:{domain}:8080 nokey@localhost.run',
    note: 'No setup required. Free with automatic HTTPS.',
    tip: 'Use {domain} for your local domain (e.g. myproject.local). Public URL is assigned automatically.'
  },
  { 
    id: 'serveo', 
    name: 'Serveo',
    defaultCommand: 'ssh -R 80:{domain}:8080 serveo.net',
    note: 'No setup required. Free SSH tunnel service.',
    tip: 'Use {domain} for your local domain. To use a custom name: ssh -R myname:80:{domain}:8080 serveo.net'
  },
  { 
    id: 'localtonet', 
    name: 'Localtonet',
    defaultCommand: 'ssh -p 223 -R {name}:80:{domain}:8080 YOUR_TOKEN@localto.net',
    note: 'Requires free account. Token-based authentication.',
    tip: 'Replace {name} with your desired subdomain (e.g. myproject). Get your token from localtonet.com dashboard.'
  },
];

export function SettingsTunnelServices() {
  const { user } = useAuth();
  const [tunnelActive, setTunnelActive] = useState<Record<string, boolean>>({});
  const [tunnelTemplates, setTunnelTemplates] = useState<Record<string, string>>({});
  const [isSavingTunnels, setIsSavingTunnels] = useState<Record<string, boolean>>({});
  const [sshKeyInfo, setSshKeyInfo] = useState<{ exists: boolean; fingerprint?: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return;
        
        // Check SSH key status
        if (ampBridge.isAvailable()) {
          try {
            const keyRes = await ampBridge.sshKeyStatus();
            setSshKeyInfo({ exists: keyRes.key_exists, fingerprint: keyRes.fingerprint });
          } catch (e) {
            // Silently ignore - SSH key status will show as unavailable
          }
        }
        
        // Load current tunnel settings
        const settings = await loadSettingsJSON(user);
        const active: Record<string, boolean> = {};
        const templates: Record<string, string> = {};
        
        for (const t of TUNNEL_SERVICES) {
          active[t.id] = settings[`tunnel_active_${t.id}`] || false;
          templates[t.id] = settings[`tunnel_template_${t.id}`] || t.defaultCommand;
        }
        
        setTunnelActive(active);
        setTunnelTemplates(templates);
      } catch (err) {
        // Silently fail - settings will use defaults
      }
    };
    fetchData();
  }, [user]);

  const handleSaveTunnel = async (serviceId: string) => {
    if (!user) return;
    setIsSavingTunnels(prev => ({ ...prev, [serviceId]: true }));
    try {
      const settings = await loadSettingsJSON(user);
      settings[`tunnel_active_${serviceId}`] = tunnelActive[serviceId] || false;
      settings[`tunnel_template_${serviceId}`] = tunnelTemplates[serviceId] || '';
      await saveSettingsJSON(user, settings);
      
      toast.success(`${TUNNEL_SERVICES.find(s => s.id === serviceId)?.name} settings saved`);
    } catch (err) {
      toast.error(`Failed to save settings`);
    } finally {
      setIsSavingTunnels(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const handleStopAllTunnels = async () => {
    if (!user || !ampBridge.isAvailable()) return;
    try {
      const tunnels = await loadTunnelsJSON(user);
      
      for (const tunnel of tunnels) {
        if (tunnel.status === 'active' && tunnel.processId) {
          try {
            await ampBridge.os.updateSpawnedProcess(tunnel.processId, 'exit');
          } catch (e) {
            // Silently continue stopping other tunnels
          }
        }
      }
      
      await saveTunnelsJSON(user, []);
      toast.success("All active tunnels have been stopped");
    } catch (err) {
      toast.error("Failed to stop all tunnels");
    }
  };

  return (
    <div className="card bg-base-100 shadow border border-base-300 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-sky-500"></div>
      <div className="card-body">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-sky-500 gap-2">
            <Globe className="w-6 h-6" />
            <h2 className="card-title">Tunnel Services</h2>
          </div>
          <button 
            className="btn btn-error btn-sm btn-soft"
            onClick={handleStopAllTunnels}
          >
            <Square className="w-4 h-4 mr-1" />
            Stop All Tunnels
          </button>
        </div>
        <p className="text-sm opacity-70 mb-4">
          Enable SSH-based tunnel services to expose your local sites. 
          Use <code className="bg-base-200 px-1 rounded">{'{domain}'}</code> as placeholder for the domain name.
        </p>

        {/* SSH Key Status */}
        <div className="alert alert-info alert-soft text-xs mb-4">
          <Key className="h-4 w-4" />
          <div>
            <span className="font-medium">SSH Key: </span>
            {sshKeyInfo === null ? (
              <span className="text-primary-content">Checking...</span>
            ) : sshKeyInfo.exists ? (
              <span className="text-success">Configured ({sshKeyInfo.fingerprint?.split(' ')[0] || 'ready'})</span>
            ) : (
              <span className="text-warning">Will be generated automatically on first use</span>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          {TUNNEL_SERVICES.map(service => (
            <div key={service.id} className="bg-base-200/50 border border-base-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">{service.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium opacity-70">
                    {tunnelActive[service.id] ? 'Enabled' : 'Disabled'}
                  </span>
                  <input 
                    type="checkbox" 
                    className="toggle toggle-xs toggle-primary" 
                    checked={tunnelActive[service.id] || false}
                    onChange={(e) => setTunnelActive(prev => ({ ...prev, [service.id]: e.target.checked }))}
                  />
                </div>
              </div>

              {tunnelActive[service.id] && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-xs opacity-60 mb-2">{service.note}</p>
                  
                  <div className="form-control w-full">
                    <label className="label" htmlFor={`tunnel-template-${service.id}`}>
                      <span className="label-text font-medium">SSH Command</span>
                    </label>
                    <textarea 
                      id={`tunnel-template-${service.id}`}
                      className="textarea textarea-bordered w-full font-mono text-xs h-20"
                      value={tunnelTemplates[service.id] || service.defaultCommand}
                      onChange={(e) => setTunnelTemplates(prev => ({ ...prev, [service.id]: e.target.value }))}
                    />
                  </div>

                  <div className="alert alert-sm alert-info alert-soft">
                    <p>{service.tip}</p>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSaveTunnel(service.id)}
                      disabled={isSavingTunnels[service.id]}
                    >
                      {isSavingTunnels[service.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}