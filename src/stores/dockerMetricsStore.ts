import { create } from "zustand";
import { useDockerSettings } from "./dockerSettings";
import { DockerStat, DockerDiskUsage, DockerInfo, DockerDisk } from "@/types";
import { ampBridge } from "@/services/AMPBridge";
import { toast } from "@/utils/toast";

// Mock Data test UI
const generateMockStats = (): DockerStat[] => [];

const generateMockDisk = (): DockerDiskUsage => ({
  Images: [],
  Containers: [],
  Volumes: [],
  BuildCache: [],
});

const mockInfo: DockerInfo = {
  NCPU: 0,
  MemTotal: 0,
  Driver: 'none',
  ServerVersion: 'none',
  ContainersRunning: 0,
  ContainersStopped: 0,
  Images: 0,
  OSType: 'linux'
};

interface FolderSizes {
  www: string;
  data: string;
  lastUpdated: number | null;
}

interface DockerMetricsState {
  stats: DockerStat[];
  disk: DockerDiskUsage | null;
  info: DockerInfo | null;
  folderSizes: FolderSizes;
  loading: boolean;
  isEngineRunning: boolean;
  isLaunching: boolean;
  isCalculatingFolders: boolean;
  activeSites: number;
  isLoadingSites: boolean;
  nextRefresh: number;
  checkEngineStatus: () => Promise<boolean>;
  launchEngine: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchActiveSites: () => Promise<void>;
  refreshFolderSizes: () => Promise<void>;
  startPolling: () => () => void;
}

export const useDockerMetricsStore = create<DockerMetricsState>((set, get) => ({
  stats: [],
  disk: null,
  info: null,
  folderSizes: { www: '0 B', data: '0 B', lastUpdated: null },
  loading: true,
  isEngineRunning: true,
  isLaunching: false,
  isCalculatingFolders: false,
  activeSites: 0,
  isLoadingSites: false,
  nextRefresh: 0,

  checkEngineStatus: async () => {
    try {
      if (ampBridge.isAvailable()) {
        const status = await ampBridge.runtimeStatus();
        const isRunning = status.docker === true;
        set({ isEngineRunning: isRunning });
        return isRunning;
      }
      return true; // Mock
    } catch {
      set({ isEngineRunning: false });
      return false;
    }
  },

  launchEngine: async () => {
    set({ isLaunching: true });
    try {
      if (ampBridge.isAvailable()) {
        const res = await ampBridge.docker.launchDesktop();
        if (res.status !== 'ok') {
          throw new Error(res.message || 'Launch failed');
        }
      }
      // Polling with max 3 attempts, 10s intervals
      let attempts = 0;
      const MAX_ATTEMPTS = 3;
      const check = async () => {
        attempts++;
        const isRunning = await get().checkEngineStatus();
        if (isRunning) {
          set({ isLaunching: false });
          get().fetchMetrics();
        } else if (attempts < MAX_ATTEMPTS) {
          setTimeout(check, 10000);
        } else {
          set({ isLaunching: false });
          toast.error("Docker Desktop did not start. Please launch it manually.");
        }
      };
      setTimeout(check, 10000);
    } catch {
      set({ isLaunching: false });
      toast.error("Could not launch Docker Desktop. Please start it manually.");
    }
  },

  fetchMetrics: async () => {
    const isRunning = await get().checkEngineStatus();
    if (!isRunning) {
      set({ loading: false });
      return;
    }

    const { interval } = useDockerSettings.getState();
    set({ nextRefresh: Date.now() + interval });
    
    // Fetch active sites count in parallel with metrics
    get().fetchActiveSites();
    
    try {
      let currentStats: DockerStat[];
      let envMetrics: { info: DockerInfo, df: DockerDiskUsage };

      if (ampBridge.isAvailable()) {
        const [stats, info, dfArray] = await Promise.all([
          ampBridge.docker.stats(),
          ampBridge.docker.info(),
          ampBridge.docker.disk()
        ]);
        currentStats = stats;
        
        // Convert df array to expected object format
        const df: DockerDiskUsage = {
          Images: dfArray.filter((item: any) => item.Type === 'Images'),
          Containers: dfArray.filter((item: any) => item.Type === 'Containers'),
          Volumes: dfArray.filter((item: any) => item.Type === 'Local Volumes'),
          BuildCache: dfArray.filter((item: any) => item.Type === 'Build Cache')
        };
        
        envMetrics = { info, df };

        // Use manual running count if available
        if (info && info.ContainersRunning !== undefined) {
          envMetrics.info = {
            ...info,
            ContainersRunning: info.ContainersRunning
          };
        }
      } else {
        currentStats = generateMockStats();
        envMetrics = { info: mockInfo, df: generateMockDisk() };
      }

      set({ 
        stats: currentStats, 
        disk: envMetrics.df, 
        info: envMetrics.info, 
        loading: false,
        isEngineRunning: true
      });
    } catch {
      set({ loading: false, isEngineRunning: false });
    }
  },

  fetchActiveSites: async () => {
    set({ isLoadingSites: true });
    try {
      if (ampBridge.isAvailable()) {
        const res = await ampBridge.listDomains();
        if (res.status === 'ok' && Array.isArray(res.domains)) {
          set({ activeSites: res.domains.length });
        } else {
          set({ activeSites: 0 });
        }
      } else {
        // Mock
        set({ activeSites: 0 });
      }
    } catch {
      // Silently fail - UI will show 0 sites
    } finally {
      set({ isLoadingSites: false });
    }
  },

  refreshFolderSizes: async () => {
    set({ isCalculatingFolders: true });
    try {
      let wwwSize = '0 B';
      let dataSize = '0 B';

      if (ampBridge.isAvailable()) {
        const env = await ampBridge.envCheck();
        const root = env.project_root ? (env.project_root.endsWith('\\') ? env.project_root : env.project_root + '\\') : 'error\\';
        const [www, data] = await Promise.all([
          ampBridge.fs.getFolderSize(`${root}www`),
          ampBridge.fs.getFolderSize(`${root}data`)
        ]);
        wwwSize = www;
        dataSize = data;
      } else {
        // Mock
        wwwSize = '0 B';
        dataSize = '0 B';
      }

      set({ 
        folderSizes: { 
          www: wwwSize, 
          data: dataSize, 
          lastUpdated: Date.now() 
        },
        isCalculatingFolders: false
      });
    } catch {
      set({ isCalculatingFolders: false });
    }
  },

  startPolling: () => {
    get().fetchMetrics(); // Initial fetch

    const id = setInterval(() => {
      const { live } = useDockerSettings.getState();
      if (live) {
        get().fetchMetrics();
      }
    }, useDockerSettings.getState().interval);

    return () => clearInterval(id);
  }
}));
