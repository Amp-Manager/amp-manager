import type { AmpResponse, DockerStat, DockerDisk, Domain } from '@/types';

/**
 * AMPBridge Service
 * Centralizes all communication with the Neutralino.js backend (window.AMP).
 * Priority: Desktop application stability and predictable UI.
 */
class AMPBridge {
  private static instance: AMPBridge;

  private constructor() {}

  public static getInstance(): AMPBridge {
    if (!AMPBridge.instance) {
      AMPBridge.instance = new AMPBridge();
    }
    return AMPBridge.instance;
  }

  /**
   * Check if the AMP backend is available (running in Neutralino)
   */
  public isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.AMP;
  }

  /**
   * Standard wrapper for AMP calls to handle errors and logging
   */
  private async call<T>(method: string, ...args: any[]): Promise<T> {
    if (!this.isAvailable()) {
      throw new Error('Backend not connected. Please restart the desktop application.');
    }

    // Resolve nested methods like 'os.open'
    const parts = method.split('.');
    let fn: any = window.AMP;
    let parent: any = null;

    for (const part of parts) {
      parent = fn;
      fn = fn[part];
    }

    if (typeof fn !== 'function') {
      throw new Error(`Backend method "${method}" is not available.`);
    }

    return await fn.apply(parent, args);
  }

  // System
  public version() { return this.call<{ status: string; version: string; build: string; engine: string }>('version'); }
  public status() { return this.call<AmpResponse>('status'); }
  public runtimeStatus() { return this.call<AmpResponse>('runtimeStatus'); }
  public phpExtensions() { return this.call<AmpResponse>('phpExtensions'); }
  public envCheck() { return this.call<{ status: string; project_root: string; [key: string]: any }>('envCheck'); }
  public clearCache() { return this.call<AmpResponse>('clearCache'); }
  public clearLogs() { return this.call<AmpResponse>('clearLogs'); }

  // Domains
  public scanDomains() { return this.call<AmpResponse>('scanDomains'); }
  public listDomains() { return this.call<AmpResponse>('listDomains'); }
  public createDomain(name: string, options?: { scaffold?: boolean }) { 
    return this.call<AmpResponse>('createDomain', name, options); 
  }
  public removeDomain(name: string) { return this.call<AmpResponse>('removeDomain', name); }
  public generateConfig(name: string) { return this.call<AmpResponse>('generateConfig', name); }

  // Database
  public dbQuery(query: string) { return this.call<AmpResponse>('dbQuery', query); }

  // CA
  public caStatus() { return this.call<AmpResponse>('caStatus'); }
  public caReset() { return this.call<AmpResponse>('caReset'); }
  public caUninstall() { return this.call<AmpResponse>('caUninstall'); }
  public regenerateSsl(domain: string) { return this.call<AmpResponse>('regenerateSsl', domain); }
  public regenerateAllSsl() { return this.call<AmpResponse>('regenerateAllSsl'); }

  // SSH Key Management
  public sshKeyStatus() { 
    return this.call<AmpResponse & { 
      key_exists: boolean; 
      fingerprint?: string;
      public_key?: string;
      key_path?: string;
    }>('sshKeyStatus'); 
  }
  public sshKeyGenerate(username: string) { 
    return this.call<AmpResponse & { 
      key_path?: string; 
      fingerprint?: string;
      public_key?: string;
    }>('sshKeyGenerate', username); 
  }

  // OS
  public os = {
    open: (url: string) => this.call<void>('os.open', url),
    execCommand: (command: string) => this.call<{ exitCode: number; stdOut: string; stdErr: string }>('os.execCommand', command),
    spawnProcess: (command: string, cwd?: string) => this.call<{ id: number; pid: number }>('os.spawnProcess', command, cwd),
    updateSpawnedProcess: (id: number, action: string, data?: string) => 
      this.call<{ status: string }>('os.updateSpawnedProcess', id, action, data),
    showSaveDialog: (title: string, options?: any) => this.call<string>('os.showSaveDialog', title, options),
    showOpenDialog: (title: string, options?: any) => this.call<string[]>('os.showOpenDialog', title, options),
  };

  // Filesystem
  public fs = {
    readTextFile: (path: string) => this.call<string>('fs.readTextFile', path),
    writeTextFile: (path: string, content: string) => this.call<void>('fs.writeTextFile', path, content),
    copyFile: (source: string, dest: string) => this.call<void>('fs.copyFile', source, dest),
    deleteFile: (path: string) => this.call<void>('fs.deleteFile', path),
    readDirectory: (path: string) => this.call<any[]>('fs.readDirectory', path),
    getFolderSize: (path: string) => this.call<string>('fs.getFolderSize', path),
    createDirectory: (path: string) => this.call<void>('fs.createDirectory', path),
    remove: (path: string) => this.call<void>('fs.remove', path),
    getAbsolutePath: (path: string) => this.call<string>('fs.getAbsolutePath', path),
  };

  // Angie
  public angie = {
    testConfig: () => this.call<{ valid: boolean; output: string }>('angie.testConfig'),
    reload: () => this.call<void>('angie.reload'),
    liveStatus: () => this.call<AmpResponse>('angie.liveStatus'),
  };

  // Docker
  public docker = {
    stats: () => this.call<DockerStat[]>('docker.stats'),
    disk: () => this.call<DockerDisk[]>('docker.disk'),
    info: () => this.call<any>('docker.info'),
    envMetrics: () => this.call<AmpResponse>('docker.envMetrics'),
    launchDesktop: () => this.call<AmpResponse>('docker.launchDesktop'),
    startContainers: () => this.call<AmpResponse>('docker.startContainers'),
    stopContainers: () => this.call<AmpResponse>('docker.stopContainers'),
    restartAngie: () => this.call<AmpResponse>('docker.restartAngie'),
    restartRuntime: () => this.call<AmpResponse>('docker.restartRuntime'),
    restartFullStack: () => this.call<AmpResponse>('docker.restartFullStack'),
  };

  // Workflow
  public workflow = {
    npm: (domain: string, cmd: string) => this.call<AmpResponse>('workflow.npm', domain, cmd),
    node: (domain: string, cmd: string) => this.call<AmpResponse>('workflow.node', domain, cmd),
    shell: (domain: string, cmd: string) => this.call<AmpResponse>('workflow.shell', domain, cmd),
    git: (domain: string, cmd: string) => this.call<AmpResponse>('workflow.git', domain, cmd),
    // DEFAULT
    sftpWithAmpKey: (host: string, username: string, localPath: string, remotePath: string) => 
      this.call<AmpResponse>('workflow.sftpWithAmpKey', host, username, localPath, remotePath),
    // ADVANCED
    sftpWithCustomKey: (host: string, username: string, localPath: string, remotePath: string, keyContent: string) => 
      this.call<AmpResponse>('workflow.sftpWithCustomKey', host, username, localPath, remotePath, keyContent),
    webhook: (url: string, data: string) => this.call<AmpResponse>('workflow.webhook', url, data),
  };

  // Events
  public events = {
    on: (event: string, handler: (data: any) => void) => {
      if (typeof window !== 'undefined' && window.Neutralino?.events) {
        window.Neutralino.events.on(event, handler);
      }
    },
    off: (event: string, handler: (data: any) => void) => {
      if (typeof window !== 'undefined' && window.Neutralino?.events) {
        window.Neutralino.events.off(event, handler);
      }
    },
    dispatch: (event: string, data?: any) => {
      if (typeof window !== 'undefined' && window.Neutralino?.events) {
        window.Neutralino.events.dispatch(event, data);
      }
    }
  };

  // Window
  public window = {
    minimize: () => window.Neutralino?.window?.minimize(),
    maximize: () => window.Neutralino?.window?.maximize(),
    unmaximize: () => window.Neutralino?.window?.unmaximize(),
    isMaximized: () => window.Neutralino?.window?.isMaximized(),
    close: () => window.Neutralino?.window?.close(),
    setDraggableRegion: (id: string) => window.Neutralino?.window?.setDraggableRegion(id),
  };

  // App
  public app = {
    exit: () => window.Neutralino?.app?.exit(),
  };
}

export const ampBridge = AMPBridge.getInstance();
