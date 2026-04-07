/**
 * Core Entity Interfaces for AMP Manager
 * Centralized source of truth for data structures.
 */

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

export interface Domain {
  id: string;        // Unique ID (usually the hostname)
  name: string;      // Display name / Hostname (maps to 'domain' in DB)
  path: string;      // Local filesystem path
  phpVersion: string;
  status: 'active' | 'error' | 'warning';
  ssl: boolean;
  ssl_valid?: boolean;  // true if SSL cert is valid (created after CA install/reset)
  createdAt: Date;
  tags?: string[];    // Array of Tag IDs
}

export interface Credential {
  id: string;
  name: string;
  type: 'ssh' | 'password' | 'api_key' | 'ssh_key';  // ssh_key is internal only (AMP Manager)
  username?: string;
  secret: string;           // Encrypted: private key, password, or token
  public_key?: string;      // Plain text for SSH public key
  iv: string;
  salt: string;
  tags?: string[];
  created_at: number;
  updated_at: number;
}

export interface Note {
  id: string;
  site_id: string;
  title: string;
  content: string;
  content_iv?: string;
  content_ciphertext?: string;
  content_salt?: string;
  is_encrypted: boolean;
  tags: string[];
  created_at: number;
  updated_at: number;
}

export interface SiteRecord {
  id: string;
  domain: string;
  path: string;
  tags: string[];
  is_encrypted: boolean;
  created_at: number;
  updated_at: number;
}

export interface DatabaseRecord {
  name: string;
  tags?: string[];
  updated_at: number;
}

export interface Task {
  id: string;
  site_id: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done';
  due_date?: number;
  alert_before_minutes?: number;
  created_at: number;
}

export interface ActivityLog {
  id: string;
  action: 'delete' | 'create' | 'update' | 'deploy' | 'error';
  entity_type: 'domain' | 'note' | 'workflow' | 'credential' | 'database';
  entity_id: string;
  entity_name: string;
  timestamp: number;
}

export interface SettingRecord {
  key: string;
  [key: string]: any; // Allow for direct fields like salt, validation_iv, etc.
}

export interface TunnelRecord {
  domain: string;
  profile: string;
  publicUrl: string;
  processId: number;
  startedAt: number;
  status: string;
}

export interface DomainStatus {
  domain: string;
  configValid: boolean;  // Angie config exists
  hostsValid: boolean;    // Windows HOSTS entry exists
  sslValid: boolean;     // SSL certificate exists
  wwwValid: boolean;     // Web folder exists
  caMatch: boolean;      // SSL signed by local CA
  status: 'valid' | 'warning' | 'error';
  lastChecked: number;
}

export interface HostEntry {
  ip: string;
  domain: string;
  source: 'AMP' | 'other';
}

export interface SyncSettings {
  syncIntervalHours: number;
  lastSyncTimestamp: number;
  forceSyncOnStartup: boolean;
}

export type SyncStepStatus = 'pending' | 'current' | 'done' | 'error';

export interface SyncStep {
  id: string;
  label: string;
  status: SyncStepStatus;
  progress?: { current: number; total: number };
  error?: string;
}
