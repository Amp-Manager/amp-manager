import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, XCircle } from "lucide-react";
import PageLoader from "@/components/layout/PageLoader";
import { useBatchError } from "@/context/BatchErrorContext";
import { loadSitesJSON, saveSitesJSON, loadTagsJSON, loadTunnelsJSON, saveTunnelsJSON, loadActivityLogsJSON, loadSettingsJSON } from "@/lib/db";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/utils/toast";
import { CreateSiteModal } from "@/components/layout/CreateSiteModal";
import { DomainLogModal } from "@/components/domains/DomainLogModal";
import TunnelService from "@/components/domains/TunnelService";
import { ampBridge } from "@/services/AMPBridge";

// components
import { DomainHeader } from "@/components/domains/DomainHeader";
import { DomainToolbar } from "@/components/domains/DomainToolbar";
import { DomainEmptyState } from "@/components/domains/DomainEmptyState";
import { DomainTableView } from "@/components/domains/DomainTableView";

import { DomainTimelineView } from "@/components/domains/DomainTimelineView";
import { DomainConfigEditor } from "@/components/domains/DomainConfigEditor";
import { DomainDeleteModal } from "@/components/domains/DomainDeleteModal";
import type { Domain, Tag, ActivityLog, TunnelRecord, SiteRecord } from "@/types/entities";

export default function Domains() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("table");
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configMode, setConfigMode] = useState<'view' | 'edit'>('view');
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]); // Keeping any for now as it's a UI-specific format
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null);
  const [isTunnelOpen, setIsTunnelOpen] = useState(false);
  const [tunnelDomain, setTunnelDomain] = useState<Domain | null>(null);
  const [idePath, setIdePath] = useState<string | null>(null);
  const [activeTunnels, setActiveTunnels] = useState<Record<string, TunnelRecord>>({});
  const [caReady, setCaReady] = useState(true);
  const { handleError } = useBatchError();
  const navigate = useNavigate();

  const fetchDomains = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!ampBridge.isAvailable()) {
        throw new Error("Neutralino bridge not found");
      }
      
      // Load IDE path and active tunnels
      if (user) {
        const settings = await loadSettingsJSON();
        if (settings.IDEpath) setIdePath(settings.IDEpath);
        
        const tunnels = await loadTunnelsJSON() as TunnelRecord[];
        const tunnelMap = tunnels.reduce((acc: Record<string, TunnelRecord>, t: TunnelRecord) => {
          if (t.status === 'active') {
            acc[t.domain] = t;
          }
          return acc;
        }, {});
        setActiveTunnels(tunnelMap);
      }

      // Fetch environment and CA status
      const [env, caRes] = await Promise.all([
        ampBridge.envCheck(),
        ampBridge.caStatus()
      ]);
      const projectRoot = env.project_root || 'error';
      setCaReady(caRes?.caroot_ok === true || caRes?.caroot_ok === 'ok');
      
      const data = await ampBridge.listDomains();
      
      const tags = await loadTagsJSON() as Tag[];
      setAllTags(tags);

      if (data.status === 'ok' && Array.isArray(data.domains)) {
        const existingSites = await loadSitesJSON() as SiteRecord[];
        const existingSitesMap = new Map(existingSites.map(s => [s.id, s]));

        const mappedDomains = await Promise.all(data.domains.map(async (d: any): Promise<Domain> => {
          const domainName = d.domain || d.name || "unknown.local";
          let existing = existingSitesMap.get(domainName);
          
          if (!existing) {
            const newSite: SiteRecord = {
              id: domainName,
              domain: domainName,
              path: d.path || `${projectRoot}\\www\\${domainName}`,
              tags: [],
              is_encrypted: false,
              created_at: Date.now(),
              updated_at: Date.now()
            };
            try {
              existingSites.push(newSite);
              await saveSitesJSON(existingSites);
              existing = newSite;
            } catch (e) {
              // Silently fail - domain will still be displayed
            }
          }

          return {
            id: domainName,
            name: domainName,
            path: d.path || `${projectRoot}\\www\\${domainName}`,
            phpVersion: d.php || '8.2', 
            status: 'active',
            ssl: d.ssl || false,
            ssl_valid: d.ssl_valid === true,
            createdAt: existing && existing.created_at ? new Date(existing.created_at) : new Date(),
            tags: existing?.tags || []
          };
        }));
        setDomains(mappedDomains);
      } else {
        throw new Error(data.message || "Failed to list domains");
      }
    } catch (err: any) {
      setError(err.message);
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        const activityLogs = await loadActivityLogsJSON(user || "default");
        
        const events: any[] = activityLogs.map(log => ({
          id: log.id,
          date: new Date(log.timestamp),
          title: `${log.action.toUpperCase()}: ${log.entity_name}`,
          content: `Action ${log.action} performed on ${log.entity_type}`,
          isSuccess: log.action !== 'error' && log.action !== 'delete',
          domain: log.entity_type === 'domain' ? log.entity_name : undefined
        }));
        
        // Sort by date descending
        events.sort((a, b) => b.date.getTime() - a.date.getTime());
        setTimelineEvents(events);
      } catch (err) {
        // Silently fail - timeline will be empty
      }
    };

    const init = async () => {
      await Promise.all([
        fetchDomains(),
        fetchTimelineData()
      ]);
    };

    init();
  }, []);

  const filteredDomains = domains.filter(d => 
    (d.name || "").toLowerCase().includes((search || "").toLowerCase())
  );

  const handleOpenLink = async (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault();
    if (ampBridge.isAvailable()) {
      try {
        await ampBridge.os.open(url);
      } catch (err) {
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const handleOpenFolder = async (path: string) => {
    if (ampBridge.isAvailable()) {
      try {
        await ampBridge.os.open(path);
      } catch (err) {
        toast.error("Failed to open folder in explorer");
      }
    } else {
      toast.info("Folder opening is only available in the desktop app");
    }
  };

  const handleOpenInIDE = async (path: string) => {
    if (!idePath) {
      toast.error("IDE path not configured. Please set it in Settings.");
      navigate('/settings');
      return;
    }

    if (ampBridge.isAvailable()) {
      try {
        // Use Neutralino to execute the IDE with the path as argument
        // Wrap path in quotes to handle spaces
        await ampBridge.os.execCommand(`"${idePath}" "${path}"`);
        toast.success("Opening in IDE...");
      } catch (err) {
        toast.error("Failed to launch IDE. Check the path in Settings.");
      }
    } else {
      toast.info("IDE integration is only available in the desktop app");
    }
  };

  const handleOpenTerminal = async (path: string) => {
    if (ampBridge.isAvailable()) {
      try {
        // On Windows, we can use 'start cmd /k' to open a new terminal window at the path
        await ampBridge.os.execCommand(`start cmd /k "cd /d ${path}"`);
        toast.success("Opening Terminal...");
      } catch (err) {
        toast.error("Failed to launch Terminal.");
      }
    } else {
      toast.info("Terminal integration is only available in the desktop app");
    }
  };

  const handleStopTunnel = async (domainName: string) => {
    const tunnel = activeTunnels[domainName];
    if (!tunnel || !ampBridge.isAvailable()) return;
    
    try {
      await ampBridge.os.updateSpawnedProcess(tunnel.processId, 'exit');
      
      if (user) {
        const tunnels = await loadTunnelsJSON(user);
        const filtered = tunnels.filter(t => t.domain !== domainName);
        await saveTunnelsJSON(user, filtered);
      }
      
      toast.success(`Tunnel stopped for ${domainName}`);
      fetchDomains();
    } catch (err) {
      toast.error("Failed to stop tunnel");
    }
  };

  const handleStopAllTunnels = async () => {
    if (!ampBridge.isAvailable()) return;
    
    try {
      for (const [_domainName, tunnel] of Object.entries(activeTunnels)) {
        try {
          const t = tunnel as TunnelRecord;
          await ampBridge.os.updateSpawnedProcess(t.processId, 'exit');
        } catch (e) {
          // Silently continue stopping other tunnels
        }
      }
      
      if (user) {
        await saveTunnelsJSON(user, []);
      }
      toast.success(`Stopped ${Object.keys(activeTunnels).length} tunnel(s)`);
      fetchDomains();
    } catch (err) {
      toast.error("Failed to stop all tunnels");
    }
  };

  const handleDelete = (id: string) => {
    const domain = domains.find(d => d.id === id);
    if (!domain) return;
    setDomainToDelete(domain);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    await fetchDomains();
    setIsDeleteModalOpen(false);
    setDomainToDelete(null);
  };

  return (
    <div className="space-y-8">
      <DomainHeader 
        onCreateClick={() => setIsCreateModalOpen(true)} 
        onSyncComplete={fetchDomains}
        activeTunnelCount={Object.keys(activeTunnels).length}
        onStopAllTunnels={handleStopAllTunnels}
        caReady={caReady}
      />

      <DomainToolbar 
        search={search} 
        onSearchChange={setSearch} 
        view={view} 
        onViewChange={setView} 
      />

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-error/20 bg-error/5">
          <XCircle className="h-12 w-12 text-error mb-4" />
          <h3 className="text-lg font-bold">Failed to load domains</h3>
          <p className="opacity-70 mb-6">{error}</p>
          <button className="btn btn-primary" onClick={fetchDomains}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </button>
        </div>
      ) : filteredDomains.length === 0 ? (
        <DomainEmptyState />
      ) : (
        <div className="mb-0">
          {view === 'table' && (
            <DomainTableView 
              domains={filteredDomains}
              allTags={allTags}
              activeTunnels={activeTunnels}
              onOpenLink={handleOpenLink}
              onOpenFolder={handleOpenFolder}
              onAddNote={(name) => navigate('/notes/new', { state: { domain: name } })}
              onConfig={(d) => { setSelectedDomain(d); setConfigMode('edit'); setIsConfigOpen(true); }}
              onLogs={(d) => { setSelectedDomain(d); setIsLogOpen(true); }}
              onOpenIDE={handleOpenInIDE}
              onOpenTerminal={handleOpenTerminal}
              onDelete={handleDelete}
              onShare={(d) => { setTunnelDomain(d); setIsTunnelOpen(true); }}
              onStopTunnel={handleStopTunnel}
            />
          )}
          
          {view === 'calendar' && (
            <DomainTimelineView timelineEvents={timelineEvents} />
          )}
        </div>
      )}

      <DomainConfigEditor 
        domain={selectedDomain} 
        open={isConfigOpen} 
        onOpenChange={setIsConfigOpen}
        mode={configMode}
      />

      <DomainLogModal
        domain={selectedDomain}
        open={isLogOpen}
        onOpenChange={setIsLogOpen}
      />

      <CreateSiteModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchDomains}
      />

      <DomainDeleteModal
        domain={domainToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleConfirmDelete}
      />

      {isTunnelOpen && tunnelDomain && (
        <TunnelService 
          domain={tunnelDomain.name} 
          onClose={() => {
            setIsTunnelOpen(false);
            setTunnelDomain(null);
          }} 
          onStatusChange={fetchDomains}
        />
      )}
    </div>
  );
}

