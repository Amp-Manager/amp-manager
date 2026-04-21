import type { AmpResponse, DockerStat, DockerDisk, Domain } from '@/types';

/**
 * AMPBridge Service
 * Centralizes all communication with the Neutralino.js backend (window.AMP).
 * Priority: Desktop application stability and predictable UI.
 */

/**
 * Execute a command with timeout to prevent hanging.
 * Critical for preventing Neutralino backend freeze.
 */
export async function execWithTimeout(
  command: string,
  timeoutMs: number = 30000
): Promise<{ exitCode: number; stdOut: string; stdErr: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
    }, timeoutMs);

    ampBridge.os.execCommand(command)
    .then((result: { exitCode: number; stdOut: string; stdErr: string }) => {
      clearTimeout(timeout);
      resolve(result);
    })
    .catch((err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Execute a backend call with retry logic.
 * Helps recover from transient IPC failures.
 */
export async function execWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (e.code === 'NE_RT_NATRTER' || e.message?.includes('not allowed')) {
        throw e;
      }
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError!;
}

/**
 * Start heartbeat keepalive to prevent Windows from suspending the app.
 * Sends periodic lightweight IPC calls to keep backend responsive.
 * Fails silently - serverOffline event handles actual disconnects.
 */
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
let keepaliveCount = 0;

export function startKeepalive(intervalMs: number = 30000): void {
  if (keepaliveInterval) return;

  console.log(`[AMP] Keepalive starting with ${intervalMs}ms interval`);

  keepaliveInterval = setInterval(async () => {
    keepaliveCount++;
    try {
      await ampBridge.status();
    } catch (e) {
      console.warn(`[AMP] Keepalive ping #${keepaliveCount} failed:`, e);
      // Fail silently - serverOffline event will handle actual disconnects
    }
  }, intervalMs);
}

export function stopKeepalive(): void {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  }
}

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
   * Check if running in development mode (browser localhost)
   * Uses compile-time flag from Vite - only true during npm run dev
   */
  public isDevMode(): boolean {
    return typeof __AMP_DEV__ !== 'undefined' && __AMP_DEV__ === true;
  }

  /**
   * Check if the AMP backend is available (running in Neutralino)
   */
  public isAvailable(): boolean {
    if (this.isDevMode()) return false;
    return typeof window !== 'undefined' && !!window.AMP;
  }

  /**
   * Standard wrapper for AMP calls to handle errors and logging
   */
  private async call<T>(method: string, ...args: any[]): Promise<T> {
    if (!this.isAvailable()) {
      throw new Error('Backend not connected. Running in browser dev mode?');
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
    execCommand: (command: string, options?: { cwd?: string; stdIn?: string; background?: boolean }) => {
      if (typeof window !== 'undefined' && window.Neutralino?.os) {
        return window.Neutralino.os.execCommand(command, options);
      }
      return Promise.resolve({ pid: 0, stdout: '', stderr: '', exitCode: 0 });
    },
    open: (url: string) => {
      if (typeof window !== 'undefined' && window.Neutralino?.os) {
        return window.Neutralino.os.open(url);
      }
    },
    spawnProcess: (command: string, options?: { cwd?: string; envs?: Record<string, string> }) => {
      if (typeof window !== 'undefined' && window.Neutralino?.os) {
        return window.Neutralino.os.spawnProcess(command, options);
      }
      return Promise.resolve({ pid: 0, id: 0 });
    },
    updateSpawnedProcess: (id: number, event: string, data?: any) => {
      if (typeof window !== 'undefined' && window.Neutralino?.os) {
        return window.Neutralino.os.updateSpawnedProcess(id, event, data);
      }
    },
    getSpawnedProcesses: () => {
      if (typeof window !== 'undefined' && window.Neutralino?.os) {
        return window.Neutralino.os.getSpawnedProcesses();
      }
      return Promise.resolve([]);
    },
    getEnv: (key: string) => {
      if (typeof window !== 'undefined' && window.Neutralino?.os) {
        return window.Neutralino.os.getEnv(key);
      }
      return Promise.resolve('');
    },
    getEnvs: () => {
      if (typeof window !== 'undefined' && window.Neutralino?.os) {
        return window.Neutralino.os.getEnvs();
      }
      return Promise.resolve({});
    },
    showOpenDialog: (title?: string, options?: any) => {
      if (typeof window !== 'undefined' && window.Neutralino?.os) {
        return window.Neutralino.os.showOpenDialog(title, options);
      }
      return Promise.resolve([]);
    },
    showFolderDialog: (title?: string, options?: any) => {
      if (typeof window !== 'undefined' && window.Neutralino?.os) {
        return window.Neutralino.os.showFolderDialog(title, options);
      }
      return Promise.resolve('');
    },
    showSaveDialog: (title?: string, options?: any) => {
      if (typeof window !== 'undefined' && window.Neutralino?.os) {
        return window.Neutralino.os.showSaveDialog(title, options);
      }
      return Promise.resolve('');
    }
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


  /**
   * Spawn watchdog process for automatic zombie recovery.
   * Uses cmd.exe /c start to run detached (survives parent death).
   */
  public async spawnWatchdog(): Promise<void> {
    if (this.isDevMode()) return;
    try {
      await window.Neutralino.os.execCommand({
        command: 'start /b cmd.exe /c "title AMP_WATCHDOG && amp-tasks.bat watch"',
        background: true
      });
      console.log('[AMP] Watchdog spawned');
    } catch (e) {
      console.error('[AMP] Failed to spawn watchdog:', e);
    }
  }

  /**
   * Forcefully terminates any remaining AMP watchdog processes.
   * Prevents the "infinite re-launch" loop when the UI is closed.
   */
  public async killStaleWatchdogs(): Promise<void> {
    if (this.isDevMode()) return;

    try {
      /**
       * We use PowerShell because it handles window title filtering much better than taskkill.
       * -WindowStyle Hidden: Prevents a terminal window from flashing.
       * -ErrorAction SilentlyContinue: Prevents crashes if no processes are found.
       */
      const cleanupCommand = [
        'powershell',
        '-WindowStyle Hidden',
        '-Command "',
        'Get-Process cmd -ErrorAction SilentlyContinue | ',
        "Where-Object { $_.MainWindowTitle -like '*AMP*' } | ",
        'Stop-Process -Force',
        '"'
      ].join(' ');

      await window.Neutralino.os.execCommand({
        command: cleanupCommand,
        background: true
      });

      console.log('[AMP] Cleanup: Stale watchdog processes terminated.');
    } catch (e) {
      // We log as a warning because if no watchdogs exist, 
      // the command might return a non-zero exit code.
      console.warn('[AMP] Cleanup: Watchdog termination skipped or failed.', e);
    }
  }

}

export const ampBridge = AMPBridge.getInstance();
