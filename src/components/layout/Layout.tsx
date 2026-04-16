import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Globe, Plus, HardDrive, Container, ShieldCheck, Settings, LayoutDashboard, Workflow, Key } from "lucide-react";
import { CreateSiteModal } from "./CreateSiteModal";
import { SystemPreloader } from "./SystemPreloader";
import { useAuth } from "@/context/AuthContext";
import { SyncProvider, useSync } from "@/context/SyncContext";
import { useProjectSync } from "@/hooks/useProjectSync";
import { loadSitesJSON, loadTagsJSON, loadNotesJSON, loadCredentialsJSON, loadWorkflowsJSON, loadSettingsJSON } from "@/lib/db";
import SearchPalette, { SearchableItem } from "./SearchPalette";
import { ampBridge } from "@/services/AMPBridge";
import { toast } from "@/utils/toast";

function LayoutContent() {
  const { isAuthenticated, user, encryptionKey } = useAuth();
  const { isSynced, setIsSynced, forceSyncOnStartup } = useSync();
  const { steps, performSync } = useProjectSync();
  const [isPreloaderOpen, setIsPreloaderOpen] = useState(false);
  const syncInitialized = useRef(false);
  const [open, setOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const [initialTagId, setInitialTagId] = useState<string | undefined>(undefined);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchableItems, setSearchableItems] = useState<SearchableItem[]>([]);
  const [dbTags, setDbTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const navigate = useNavigate();

  // Docker status polling
  const [dockerStatus, setDockerStatus] = useState<{ docker: boolean; containers: boolean }>({ docker: false, containers: false });
  const [caRootOk, setCaRootOk] = useState(false);

  useEffect(() => {
    const checkDocker = async () => {
      try {
        if (ampBridge.isAvailable()) {
          const status = await ampBridge.runtimeStatus();
          setDockerStatus({
            docker: status?.docker === true,
            containers: status?.angie === true || status?.db === true || status?.php === true
          });
        }
      } catch { /* ignore */ }
    };
    checkDocker();
    const interval = setInterval(checkDocker, 60000);
    return () => clearInterval(interval);
  }, []);

  // CA root status check on mount
  useEffect(() => {
    ampBridge.caStatus().then(res => {
      setCaRootOk(res?.caroot_ok === 'ok' || res?.caroot_ok === true);
    });
  }, []);

  // Dynamic badge based on state
  const dockerBadge = (
    <div className="flex items-center gap-2">
      <div className={`status ${
        !dockerStatus.docker ? 'status-error' : 
        !dockerStatus.containers ? 'status-warning' : 
        'status-success'
      }`}></div>
      <span className="text-xs">{
        !dockerStatus.docker ? 'Docker Off' : 
        !dockerStatus.containers ? 'Stopped' : 
        'Running'
      }</span>
    </div>
  );

  const navItems = useMemo(() => [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/domains", icon: Globe, label: "Domains" },
    { to: "/hosts", icon: HardDrive, label: "Hosts" },
    { to: "/docker", icon: Container, label: "Docker" },
    { to: "/certificates", icon: ShieldCheck, label: "Certificates" },
    { to: "/workflow", icon: Workflow, label: "Workflow" },
    { to: "/credentials", icon: Key, label: "Credentials" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ], []);

  const fetchSearchableItems = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      const [sites, notes, credentials, workflows, tags] = await Promise.all([
        loadSitesJSON(),
        loadNotesJSON(user, encryptionKey || undefined),
        loadCredentialsJSON(user, encryptionKey || undefined),
        loadWorkflowsJSON(),
        loadTagsJSON()
      ]);
      
      setDbTags(tags);

      const items: SearchableItem[] = [
        ...navItems.map(item => ({
          id: item.to,
          title: item.label,
          type: 'nav' as const,
          categoryId: item.label,
          tags: [],
          action: () => navigate(item.to)
        })),
        ...sites.map(s => ({
          id: s.id,
          title: s.domain,
          type: 'domain' as const,
          categoryId: 'Domains',
          tags: s.tags || [],
          action: () => navigate(`/domains`)
        })),
        ...notes.map(n => ({
          id: n.id,
          title: n.title,
          type: 'note' as const,
          categoryId: 'Notes',
          tags: n.tags || [],
          content: n.content,
          action: () => navigate(`/notes/${n.id}`)
        })),
        ...credentials.map(c => ({
          id: c.id,
          title: c.name,
          type: 'credential' as const,
          categoryId: 'Credentials',
          tags: c.tags || [],
          content: `${c.type} ${c.username || ''}`,
          action: () => navigate(`/credentials`)
        })),
        ...workflows.map(w => ({
          id: w.id,
          title: w.title,
          type: 'workflow' as const,
          categoryId: 'Workflow',
          tags: w.tags || [],
          content: w.description,
          action: () => navigate(`/workflow`)
        }))
      ];
      setSearchableItems(items);
    } catch (err) {
      // Silently fail - search palette will have fewer items
    }
  }, [isAuthenticated, user, encryptionKey, navigate, navItems]);

  useEffect(() => {
    fetchSearchableItems();
  }, [fetchSearchableItems, open]); // refresh when open for now

  // Check if sync is needed on mount
  useEffect(() => {
    if (!isAuthenticated || !user || syncInitialized.current || isSynced) return;
    
    const checkAndPerformSync = async () => {
      syncInitialized.current = true;
      
      // If not forced to sync, check last sync timestamp
      if (!forceSyncOnStartup) {
        try {
          const settings = await loadSettingsJSON(user);
          
          const lastSync = settings.lastSyncTimestamp || 0;
          const intervalHours = settings.syncIntervalHours || 6;
          const hoursSinceSync = (Date.now() - lastSync) / (1000 * 60 * 60);
          
          if (hoursSinceSync < intervalHours) {
            setIsSynced(true);
            return;
          }
        } catch (err) {
          // Silently skip sync. User can manually sync later
        }
      }
      
      // Need to perform sync
      setIsPreloaderOpen(true);
      const success = await performSync(user);
      
      if (success) {
        setIsSynced(true);
        setIsPreloaderOpen(false);
        
        // Docker status toasts (sequential)
        if (!dockerStatus.docker) {
          toast.error('Docker is not running', {
            description: 'Start Docker Desktop to enable local development.',
            action: {
              label: 'Open Docker',
              onClick: () => navigate('/docker')
            },
            duration: 7500
          });
        } else if (!dockerStatus.containers) {
          toast.error('Docker containers are stopped', {
            description: 'Start containers to enable local domains, databases, and PHP.',
            action: {
              label: 'Open Docker',
              onClick: () => navigate('/docker'),
            },
            duration: 7500
          });
        }
       
      }
    };
    
    checkAndPerformSync();
  }, [isAuthenticated, user, forceSyncOnStartup, isSynced]);

  const handlePreloaderComplete = useCallback(() => {
    setIsSynced(true);
    setIsPreloaderOpen(false);
  }, [setIsSynced]);

  const handlePreloaderError = useCallback((error: string) => {
    setIsPreloaderOpen(false);
    setIsSynced(true); // Allow user to continue even if sync failed
  }, [setIsSynced]);

  const handleMinimize = useCallback(() => {
    ampBridge.window.minimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    try {
      const isMax = await ampBridge.window.isMaximized();
      if (isMax) {
        ampBridge.window.unmaximize();
        setIsMaximized(false);
      } else {
        ampBridge.window.maximize();
        setIsMaximized(true);
      }
    } catch (err) {
      // If detection fails, assume we are maximizing
      ampBridge.window.maximize();
      setIsMaximized(true);
    }
  }, []);

  const handleClose = useCallback(() => {
    try {
      ampBridge.window.close();
    } catch (e) {
      // Fallback to app exit if window close fails
      ampBridge.app.exit();
    }
  }, []);

  const handleSearchTrigger = useCallback(() => {
    if (!isAuthenticated) return;

    window.dispatchEvent(
      new CustomEvent("open-search-palette", {
        detail: { tagId: undefined }
      })
    );
  }, [isAuthenticated]);

  const handleNewDomainClick = useCallback(() => {
    if (isAuthenticated && caRootOk) {
      setIsCreateModalOpen(true);
    }
  }, [isAuthenticated, caRootOk]);
  const categories = useMemo(() => navItems.map(item => ({ id: item.label, name: item.label })), [navItems]);


  // Titlebar
  useEffect(() => {
    const draggable = document.getElementById('titlebar-amp');
    if (!draggable) return;

    let ticking = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!ticking) {
        requestAnimationFrame(() => {
           // Update only once per frame (~60fps)
          const rect = draggable.getBoundingClientRect();
          draggable.style.setProperty('--glow-x', `${e.clientX - rect.left}px`);
          draggable.style.setProperty('--glow-y', `${e.clientY - rect.top}px`);
          ticking = false; // reset for next frame
        });
        ticking = true; // block until next frame
      }
    };

    draggable.addEventListener('mousemove', handleMouseMove);
    return () => draggable.removeEventListener('mousemove', handleMouseMove);
  }, []); // empty deps run once on mount


  useEffect(() => {
    // Wait for Neutralino to be ready before setting draggable region
    const initNativeDrag = async () => {
      try {
        // Wait for Neutralino to be fully ready
        if (!ampBridge.isAvailable()) {
          return;
        }

        // Wait for DOM to be ready
        if (!document.getElementById('titlebar-amp')) {
          setTimeout(initNativeDrag, 100);
          return;
        }

        // Delay to get window is ready
        await new Promise(resolve => setTimeout(resolve, 200));

        // Only set the title text area as draggable, NOT the buttons
        await ampBridge.window.setDraggableRegion('titlebar-amp');
      } catch (e) {
        // Silently fail - draggable region may not work
      }
    };

    // Listen for custom Neutralino ready event from main.js
    const handleNeutralinoReady = () => {
      initNativeDrag();
    };

    // Try if Neutralino is already available
    if (ampBridge.isAvailable()) {
      initNativeDrag();
    } else {
      // Listen for the custom event dispatched by main.js
      window.addEventListener('neutralino.ready', handleNeutralinoReady);
      return () => window.removeEventListener('neutralino.ready', handleNeutralinoReady);
    }
  }, []);

  // keyboard events
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setInitialTagId(undefined);
        setOpen((open) => !open);
      }
    };

    const handleOpenWithTag = (e: any) => {
      const { tagId } = e.detail;
      setInitialTagId(tagId);
      setOpen(true);
    };

    document.addEventListener("keydown", down);
    window.addEventListener('open-search-palette', handleOpenWithTag);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener('open-search-palette', handleOpenWithTag);
    };
  }, []);


  return (
    <div className="flex flex-col h-full w-full bg-base-100 overflow-hidden">
      
      {/* TITLE BAR - 3 Column Layout: Left Menu | Center Title | Right Buttons */}
      <div 
        id="wintitlebar" 
        className="flex-shrink-0 h-[42px] bg-[#090d10] text-white flex items-center z-[9999] select-none"
      >
        {/* LEFT COLUMN: 248px Menu */}
        <div style={{ width: '248px' }} className="flex items-center overflow-hidden shrink-0">
          <ul className="flex items-center text-xs gap-2 m-0 p-0 px-4">
            <li>
              {dockerBadge}
            </li>
            <li>
              <a
                onClick={handleNewDomainClick}
                className={`
                  flex items-center gap-1 ml-2 p-2 transition-all
                  ${isAuthenticated && caRootOk ? "cursor-pointer hover:bg-white/10" : "cursor-not-allowed opacity-40"}
                `}
              >
                <Plus className="h-3 w-3 group-hover:rotate-90 transition-transform" />
                NEW Domain
              </a>
            </li>
          </ul>
        </div>

        {/* CENTER COLUMN: Title (Draggable) */}
        
        <div 
          id="titlebar-amp" 
          className=" h-[40px] flex flex-1 h-full border border-base-300 border-t-0 rounded-b-xl cursor-grabbing pt-[2px] "
        >
          <span 
          className="flex flex-1 inset-shadow-xs inset-shadow-primary border border-base-300 border-t-0 rounded-b-xl items-center justify-center text-xs text-center">
            AMP MANAGER {isAuthenticated && <span className="uppercase ml-2">— {user}</span>}
          </span>
        </div>

        {/* RIGHT COLUMN: Buttons (248px) */}
        <div style={{ width: '248px' }} className="flex h-full justify-end items-center shrink-0">
          <div className="flex gap-1">
            <span 
              onClick={handleSearchTrigger}
              className="cursor-pointer text-xs leading-[30px] mr-2"
            >
              <span className="text-[10px] mr-2">Search</span>
              <kbd className="kbd kbd-xs">Ctrl</kbd>+<kbd className="kbd kbd-xs">K</kbd>
            </span>
            <button id="min-btn" onClick={handleMinimize} className="px-2 hover:bg-white/10 h-full text-xs leading-[30px]">🗕</button>
            <button
              id="max-btn"
              onClick={handleMaximize}
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              className="px-2 hover:bg-white/10 h-full text-xs leading-[30px]"
            >
              {isMaximized ? "🗗" : "🗖"}
            </button>

            <button id="close-btn" onClick={handleClose} className="px-2 hover:bg-red-500/80 h-full text-xs leading-[30px]">✕</button>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar /> {/* fixed h-full */}
        <main className="h-full flex-1 rounded-lg overflow-y-auto overflow-x-hidden bg-base-300/50 p-6">
            <Outlet />
        </main>
      </div>

      {/* System Preloader */}
      <SystemPreloader
        isOpen={isPreloaderOpen}
        steps={steps}
        onComplete={handlePreloaderComplete}
        onError={handlePreloaderError}
      />

      {open && (
        <SearchPalette
          items={searchableItems}
          categories={categories}
          tags={dbTags}
          initialTagId={initialTagId}
          onSelect={(item) => item.action()}
          onClose={() => {
            setOpen(false);
            setInitialTagId(undefined);
          }}
        />
      )}

      <CreateSiteModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          // Optionally trigger a global refresh or notification
        }}
      />
    </div>
  );
}

export default function Layout() {
  return (
    <SyncProvider>
      <LayoutContent />
    </SyncProvider>
  );
}
