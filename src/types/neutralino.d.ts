export {};

interface AmpApi {
  version: () => Promise<{ status: string; version: string; build: string; engine: string }>;
  runtimeStatus: () => Promise<{ status: string; docker: boolean; angie: boolean; db: boolean; php: boolean }>;
  listDomains: () => Promise<any>;
  createDomain: (name: string) => Promise<any>;
  removeDomain: (name: string) => Promise<any>;
  generateConfig: (name: string) => Promise<any>;
  caStatus: () => Promise<any>;
  caReset: () => Promise<any>;
  caUninstall: () => Promise<any>;
  envCheck: () => Promise<{ status: string; project_root: string; [key: string]: any }>;
  scanDomains: () => Promise<{ status: string; count: number; domains: string[] }>;
  fs: {
    readTextFile: (path: string) => Promise<string>;
    writeTextFile: (path: string, content: string) => Promise<void>;
    getFolderSize: (path: string) => Promise<string>;
  };
  angie: {
    testConfig: () => Promise<{ valid: boolean; output: string }>;
    reload: () => Promise<void>;
  };
  docker: {
    stats: () => Promise<any[]>;
    disk: () => Promise<any[]>;
    info: () => Promise<any>;
    envMetrics: () => Promise<any>;
    launchDesktop: () => Promise<any>;
    startContainers: () => Promise<any>;
    stopContainers: () => Promise<any>;
    restartAngie: () => Promise<any>;
    restartRuntime: () => Promise<any>;
    restartFullStack: () => Promise<any>;
  };
  workflow: {
    git: (data: any) => Promise<any>;
    node: (data: any) => Promise<any>;
    npm: (data: any) => Promise<any>;
    shell: (data: any) => Promise<any>;
    sftp: (data: any) => Promise<any>;
    webhook: (data: any) => Promise<any>;
  };
}

interface NeutralinoApp {
  exit: () => void;
}

interface NeutralinoWindow {
  minimize: () => void;
  maximize: () => void;
  unmaximize: () => void;
  isMaximized: () => Promise<boolean>;
  close: () => void;
  setDraggableRegion: (domId: string) => Promise<void>;
}

interface NeutralinoOS {
  execCommand: (command: string, options?: { cwd?: string }) => Promise<{ pid: number; stdout: string; stderr: string; exitCode: number }>;
}

interface NeutralinoEvents {
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
  dispatch: (event: string, data?: any) => void;
}

interface Neutralino {
  window: NeutralinoWindow;
  app: NeutralinoApp;
  os: NeutralinoOS;
  events: NeutralinoEvents;
}

declare global {
  interface Window {
    AMP: AmpApi;
    Neutralino: Neutralino;
  }
}
