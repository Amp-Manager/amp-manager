
// lib/db.ts
// Handles IndexedDB operations using the 'idb' library.

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Node, Edge } from '@xyflow/react';
import { DockerStat, DockerDisk, DockerInfo } from '@/types';

export type SettingValue = string | number | boolean | null | any[] | Record<string, any>;

export interface AmpManagerDBSchema extends DBSchema {
  settings: {
    key: string;
    value: any;
  };
  tags: {
    key: string;
    value: {
      id: string;
      name: string;
      color: string;
      created_at: number;
    };
    indexes: { 'by-name': string };
  };
  sites: {
    key: string;
    value: {
      id: string;
      domain: string;
      path: string;
      tags: string[]; // Array of tag IDs
      is_encrypted: boolean;
      created_at: number;
      updated_at: number;
    };
    indexes: { 'by-domain': string; 'by-tags': string };
  };
  notes: {
    key: string;
    value: {
      id: string;
      site_id: string;
      title: string;
      content: string; // Plain text content
      content_iv?: string; // Hex string
      content_ciphertext?: string; // Hex string
      content_salt?: string; // Hex string for PBKDF2
      is_encrypted: boolean;
      tags: string[]; // Array of tag IDs
      created_at: number;
      updated_at: number;
    };
    indexes: { 'by-site': string; 'by-created': number; 'by-tags': string };
  };
  tasks: {
    key: string;
    value: {
      id: string;
      site_id: string;
      description: string;
      status: 'pending' | 'in-progress' | 'done';
      due_date?: number;
      alert_before_minutes?: number;
      created_at: number;
    };
    indexes: { 'by-site': string; 'by-due-date': number; 'by-status': string };
  };
  env_history: {
    key: number;
    value: {
      id?: number;
      timestamp: number;
      angie_conf_date: number | null;
      cert_file_date: number | null;
      www_folder_date: number | null;
    };
    indexes: { 'by-timestamp': number };
  };
  site_configs: {
    key: number;
    value: {
      id?: number;
      site_id: string;
      content: string;
      version: number;
      created_at: number;
      is_active: number; // 0 or 1
      hash: string;
    };
    indexes: { 'by-site': string; 'by-version': number; 'by-active': number };
  };
  workflows: {
    key: string;
    value: {
      id: string;
      title: string;
      description: string;
      nodes: Node[];
      edges: Edge[];
      tags?: string[];
      created_at: number;
      updated_at: number;
    };
    indexes: { 'by-updated': number };
  };
  credentials: {
    key: string;
    value: {
      id: string;
      name: string;
      type: 'ssh' | 'password' | 'api_key' | 'ssh_key';  // ssh_key is internal (AMP Manager)
      username?: string;        // For password or SFTP username
      secret: string;           // Encrypted: private key, password, or token
      public_key?: string;      // Plain text for SSH public key
      iv: string;
      salt: string;
      tags?: string[];
      created_at: number;
      updated_at: number;
    };
    indexes: { 'by-name': string; 'by-type': string };
  };
  metrics: {
    key: number;
    value: {
      id?: number;
      timestamp: number;
      stats: DockerStat[];
      disk: DockerDisk[];
      info: DockerInfo;
    };
    indexes: { 'by-timestamp': number };
  };
  config_backups: {
    key: string;
    value: {
      id: string;
      filename: string;
      path: string;
      content: string;
      timestamp: number;
      type: 'factory' | 'snapshot';
    };
    indexes: { 'by-filename': string; 'by-type': string };
  };
  activity_logs: {
    key: string;
    value: {
      id: string;
      action: 'delete' | 'create' | 'update' | 'deploy' | 'error';
      entity_type: 'domain' | 'note' | 'workflow' | 'credential' | 'database';
      entity_id: string;
      entity_name: string;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
  databases: {
    key: string; // dbName
    value: {
      name: string;
      tags: string[];
      updated_at: number;
    };
    indexes: { 'by-tags': string };
  };
  databases_cache: {
    key: string; // 'list'
    value: {
      key: string;
      data: any[];
      timestamp: number;
    };
  };
  tunnels: {
    key: string; // domain
    value: {
      domain: string;
      profile: string;
      publicUrl: string;
      processId: number;
      startedAt: number;
      status: string;
    };
  };
  domain_status: {
    key: string; // domain
    value: {
      domain: string;
      configValid: boolean;
      hostsValid: boolean;
      sslValid: boolean;
      wwwValid: boolean;
      caMatch: boolean;
      status: 'valid' | 'warning' | 'error';
      lastChecked: number;
    };
    indexes: { 'by-status': string };
  };
}

const DB_VERSION = 15;

export async function logActivity(
  db: IDBPDatabase<AmpManagerDBSchema>,
  action: 'delete' | 'create' | 'update' | 'deploy' | 'error',
  entity_type: 'domain' | 'note' | 'workflow' | 'credential' | 'database',
  entity_id: string,
  entity_name: string
) {
  await db.add('activity_logs', {
    id: crypto.randomUUID(),
    action,
    entity_type,
    entity_id,
    entity_name,
    timestamp: Date.now(),
  });
}

export async function initDB(username: string): Promise<IDBPDatabase<AmpManagerDBSchema>> {
  const dbName = `AmpManagerDB_${username}`;
  
  return openDB<AmpManagerDBSchema>(dbName, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Settings Store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Tags Store
      if (!db.objectStoreNames.contains('tags')) {
        const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
        tagStore.createIndex('by-name', 'name', { unique: true });
      }

      // Sites Store
      if (!db.objectStoreNames.contains('sites')) {
        const siteStore = db.createObjectStore('sites', { keyPath: 'id' });
        siteStore.createIndex('by-domain', 'domain', { unique: true });
        siteStore.createIndex('by-tags', 'tags', { multiEntry: true });
      }

      // Notes Store
      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('by-site', 'site_id');
        noteStore.createIndex('by-created', 'created_at');
        noteStore.createIndex('by-tags', 'tags', { multiEntry: true });
      } else {
        const noteStore = transaction.objectStore('notes');
        if (!noteStore.indexNames.contains('by-tags')) {
          noteStore.createIndex('by-tags', 'tags', { multiEntry: true });
        }
      }

      // Tasks Store
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('by-site', 'site_id');
        taskStore.createIndex('by-due-date', 'due_date');
        taskStore.createIndex('by-status', 'status');
      }

      // Env History Store
      if (!db.objectStoreNames.contains('env_history')) {
        const envStore = db.createObjectStore('env_history', { keyPath: 'id', autoIncrement: true });
        envStore.createIndex('by-timestamp', 'timestamp');
      }

      // Site Configs Store
      if (!db.objectStoreNames.contains('site_configs')) {
        const configStore = db.createObjectStore('site_configs', { keyPath: 'id', autoIncrement: true });
        configStore.createIndex('by-site', 'site_id');
        configStore.createIndex('by-version', 'version');
        configStore.createIndex('by-active', 'is_active');
      }

      // Workflows Store
      if (!db.objectStoreNames.contains('workflows')) {
        const workflowStore = db.createObjectStore('workflows', { keyPath: 'id' });
        workflowStore.createIndex('by-updated', 'updated_at');
      }

      // Credentials Store
      if (!db.objectStoreNames.contains('credentials')) {
        const credStore = db.createObjectStore('credentials', { keyPath: 'id' });
        credStore.createIndex('by-name', 'name', { unique: true });
        credStore.createIndex('by-type', 'type');
      }

      // Metrics Store
      if (!db.objectStoreNames.contains('metrics')) {
        const metricStore = db.createObjectStore('metrics', { keyPath: 'id', autoIncrement: true });
        metricStore.createIndex('by-timestamp', 'timestamp');
      }

      // Config Backups Store
      if (!db.objectStoreNames.contains('config_backups')) {
        const backupStore = db.createObjectStore('config_backups', { keyPath: 'id' });
        backupStore.createIndex('by-filename', 'filename');
        backupStore.createIndex('by-type', 'type');
      }

      // Activity Logs Store
      if (!db.objectStoreNames.contains('activity_logs')) {
        const activityStore = db.createObjectStore('activity_logs', { keyPath: 'id' });
        activityStore.createIndex('by-timestamp', 'timestamp');
      }

      // Databases Store
      if (!db.objectStoreNames.contains('databases')) {
        const dbStore = db.createObjectStore('databases', { keyPath: 'name' });
        dbStore.createIndex('by-tags', 'tags', { multiEntry: true });
      }

      // Databases Cache Store
      if (!db.objectStoreNames.contains('databases_cache')) {
        db.createObjectStore('databases_cache', { keyPath: 'key' });
      }

      // Tunnels Store
      if (!db.objectStoreNames.contains('tunnels')) {
        db.createObjectStore('tunnels', { keyPath: 'domain' });
      }

      // Domain Status Store (v14)
      if (!db.objectStoreNames.contains('domain_status')) {
        const statusStore = db.createObjectStore('domain_status', { keyPath: 'domain' });
        statusStore.createIndex('by-status', 'status');
      }
    },
  });
}

export async function deleteUserDB(username: string): Promise<void> {
  const dbName = `AmpManagerDB_${username}`;
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      // Another tab has the database open - resolve anyway, deletion completes later
      resolve();
    };
  });
}
