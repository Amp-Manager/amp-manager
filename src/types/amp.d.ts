/**
 * Type definitions for the AMP Manager Neutralino Bridge
 */

import type { Domain, Tag } from './entities';
import type { DockerStat, DockerDisk } from './docker';

declare global {
  interface Window {
    Neutralino: any;
    AMP: {
      // Domain Management
      listDomains: () => Promise<AmpResponse>;
      createDomain: (name: string, options?: { scaffold?: boolean }) => Promise<AmpResponse>;
      removeDomain: (name: string) => Promise<AmpResponse>;
      generateConfig: (name: string) => Promise<AmpResponse>;

      // CA Management
      caStatus: () => Promise<AmpResponse>;
      caReset: () => Promise<AmpResponse>;
      caUninstall: () => Promise<AmpResponse>;
      regenerateSsl: (domain: string) => Promise<AmpResponse>;
      regenerateAllSsl: () => Promise<AmpResponse>;

      // SSH Key Management
      sshKeyStatus: () => Promise<AmpResponse & { 
        key_exists: boolean; 
        fingerprint?: string;
        public_key?: string;
        key_path?: string;
      }>;
      sshKeyGenerate: (username: string) => Promise<AmpResponse & { 
        key_path?: string; 
        fingerprint?: string;
        public_key?: string;
      }>;

      // Service Control
      dockerUp: () => Promise<AmpResponse>;
      dockerStop: () => Promise<AmpResponse>;
      dockerRestart: () => Promise<AmpResponse>;
      restartAngie: () => Promise<AmpResponse>;
      envCheck: () => Promise<{ status: string; project_root: string; [key: string]: any }>;
      version: () => Promise<{ status: string; version: string; build: string; engine: string }>;
      runtimeStatus: () => Promise<AmpResponse>;
      scanDomains: () => Promise<AmpResponse>;
      clearCache: () => Promise<AmpResponse>;
      clearLogs: () => Promise<AmpResponse>;

      dbQuery: (query: string) => Promise<AmpResponse>;
      // Filesystem Helpers
      fs: {
        readTextFile: (path: string) => Promise<string>;
        writeTextFile: (path: string, content: string) => Promise<void>;
        copyFile: (source: string, dest: string) => Promise<void>;
        deleteFile: (path: string) => Promise<void>;
        readDirectory: (path: string) => Promise<Array<{ entry: string; type: string; path: string }>>;
      };

      // Angie Helpers
      angie: {
        testConfig: () => Promise<{ valid: boolean; output: string }>;
        reload: () => Promise<AmpResponse>;
        liveStatus: () => Promise<AmpResponse>;
      };

      // Docker Metrics
      docker: {
        stats: () => Promise<DockerStat[]>;
        disk: () => Promise<DockerDisk[]>;
        info: () => Promise<any>;
        envMetrics: () => Promise<AmpResponse>;
        launchDesktop: () => Promise<AmpResponse>;
        startContainers: () => Promise<AmpResponse>;
        stopContainers: () => Promise<AmpResponse>;
        restartAngie: () => Promise<AmpResponse>;
        restartRuntime: () => Promise<AmpResponse>;
        restartFullStack: () => Promise<AmpResponse>;
      };

      // Workflow Helpers
      workflow: {
        git: (path: string, args: string) => Promise<AmpResponse>;
        node: (path: string, script: string) => Promise<AmpResponse>;
        npm: (path: string, command: string) => Promise<AmpResponse>;
        shell: (path: string, command: string) => Promise<AmpResponse>;
        sftpWithAmpKey: (host: string, username: string, localPath: string, remotePath: string) => Promise<AmpResponse>;
        sftpWithCustomKey: (host: string, username: string, localPath: string, remotePath: string, keyContent: string) => Promise<AmpResponse>;
        webhook: (url: string, payload: string) => Promise<AmpResponse>;
      };

      // Native OS Dialogs
      os: {
        showSaveDialog: (title: string, options?: any) => Promise<string>;
        showOpenDialog: (title: string, options?: any) => Promise<string[]>;
        showMessageBox: (title: string, content: string, type?: string) => Promise<void>;
        open: (url: string) => Promise<void>;
        execCommand: (command: string) => Promise<{ exitCode: number; stdOut: string; stdErr: string }>;
        spawnProcess: (command: string, options?: { cwd?: string; stdIn?: string }) => Promise<{ id: number; pid: number }>;
        updateSpawnedProcess: (id: number, action: string, data?: string) => Promise<{ status: string }>;
      };
    };
  }
}

export interface NeutralinoDirEntry {
  entry: string;
  type: "FILE" | "DIRECTORY" | "OTHER";
  path: string;
}

export interface AmpResponse {
  status: 'ok' | 'error';
  message?: string;
  output?: string;
  stdOut?: string;        // dbQuery LIST/CREATE responses
  stdErr?: string;        // error debugging
  domain?: string;
  steps?: AmpStep[];
  domains?: Partial<Domain>[];
  tags?: Tag[];
  [key: string]: any;
}

export interface AmpStep {
  name: string;
  label: string;
  success: boolean;
  error?: string;
  path?: string;
}

export {};
