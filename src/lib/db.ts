// lib/db.ts
// KISS: Single source of truth - ignores extra params from old code

import { dataStorage } from './storage';
import { ampBridge } from '../services/AMPBridge';

export type SettingValue = string | number | boolean | null | any[] | Record<string, any>;

let _currentUser: string | null = null;
let _encryptionKey: CryptoKey | null = null;

export function setCurrentUser(username: string | null): void {
  _currentUser = username;
}

export function getCurrentUser(): string | null {
  return _currentUser;
}

export function setEncryptionKey(key: CryptoKey | null): void {
  _encryptionKey = key;
}

export function getEncryptionKey(): CryptoKey | null {
  return _encryptionKey;
}

function ensureUser(): string {
  if (!_currentUser) throw new Error('Not authenticated');
  return _currentUser;
}

// =====================
// GLOBAL CONFIG
// =====================
export async function loadConfigJSON(): Promise<any> { return await dataStorage.load<any>('config.json'); }
export async function saveConfigJSON(config: any): Promise<void> { await dataStorage.save('config.json', config); }

export async function updateInstanceInfo(instanceId: string, pid: string, port: number, launchedAt: number): Promise<void> {
  const config = await loadConfigJSON() || {};
  // Preserve lastUser if exists
  const lastUser = config.lastUser || null;
  config.lastUser = lastUser;
  config.instanceId = instanceId;
  config.processName = 'amp-manager-win_x64.exe';
  config.pid = pid;
  config.port = port;
  config.launchedAt = launchedAt;
  await saveConfigJSON(config);
}

export async function clearInstanceInfo(): Promise<void> {
  const config = await loadConfigJSON() || {};
  delete config.instanceId;
  delete config.processName;
  delete config.pid;
  delete config.port;
  delete config.launchedAt;
  // Keep lastUser
  await saveConfigJSON(config);
}

// =====================
// USER AUTH (explicit username)
// =====================
export async function loadUserJSON(username: string): Promise<any> {
  return await dataStorage.loadUser<any>(username, 'user.json');
}
export async function saveUserJSON(username: string, data: any): Promise<void> {
  await dataStorage.ensureUserDir(username);
  await dataStorage.saveUser(username, 'user.json', data);
}

// =====================
// LOAD - Accept ...args, ignore extras
// =====================
function resolveKey(...args: any[]): CryptoKey | null {
  // Check args for CryptoKey
  for (let i = 0; i < args.length; i++) {
    const passed = args[i];
    if (!passed) continue;
    if (passed instanceof CryptoKey) return passed;
    if (typeof passed === 'object' && (passed as any).type === 'secret') return passed as unknown as CryptoKey;
  }
  // Global fallback only if at least one arg was passed (not all undefined)
  const hasArg = args.some(a => a !== undefined && a !== null && a !== false && a !== '');
  if (hasArg) {
    const globalKey = getEncryptionKey();
    if (globalKey && typeof globalKey === 'object' && (globalKey as any).type === 'secret') return globalKey;
  }
  return null;
}

export async function loadSitesJSON(..._args: any[]): Promise<any[]> { try { return await dataStorage.loadUser<any[]>(ensureUser(), 'sites.json') || []; } catch { return []; } }
export async function loadTagsJSON(..._args: any[]): Promise<any[]> { try { return await dataStorage.loadUser<any[]>(ensureUser(), 'tags.json') || []; } catch { return []; } }
export async function loadNotesJSON(..._args: any[]): Promise<any[]> { 
  // Pattern: loadNotesJSON(user, key) - key in second arg
  // Try explicit key first, then global key fallback
  let key = _args[1] instanceof CryptoKey ? _args[1] : null;
  if (!key) key = getEncryptionKey();
  
  if (!key) {
    try { return await dataStorage.loadUser<any[]>(ensureUser(), 'notes.json') || []; } catch { return []; }
  }
  try { 
    return await dataStorage.loadUser<any[]>(ensureUser(), 'notes.json', { encrypt: true, key }) || []; 
  } catch { return []; }
}
export async function loadCredentialsJSON(..._args: any[]): Promise<any[]> { 
  let key = _args[1] instanceof CryptoKey ? _args[1] : null;
  if (!key) key = getEncryptionKey();
  try { return await dataStorage.loadUser<any[]>(ensureUser(), 'credentials.json', key ? { encrypt: true, key } : undefined) || []; } catch { return []; } 
}
export async function loadSettingsJSON(..._args: any[]): Promise<any> { 
  let key = _args[1] instanceof CryptoKey ? _args[1] : null;
  if (!key) key = getEncryptionKey();
  try { 
    const data = await dataStorage.loadUser<any>(ensureUser(), 'settings.json', key ? { encrypt: true, key } : undefined);
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data;
    }
    return {}; 
  } catch { return {}; } 
}
export async function loadTunnelsJSON(..._args: any[]): Promise<any[]> { try { return await dataStorage.loadUser<any[]>(ensureUser(), 'tunnels.json') || []; } catch { return []; } }
export async function loadActivityLogsJSON(..._args: any[]): Promise<any[]> { try { return await dataStorage.loadUser<any[]>(ensureUser(), 'activity_logs.json') || []; } catch { return []; } }
export async function loadWorkflowsJSON(..._args: any[]): Promise<any[]> { 
  let key = _args[1] instanceof CryptoKey ? _args[1] : null;
  if (!key) key = getEncryptionKey();
  try { return await dataStorage.loadUser<any[]>(ensureUser(), 'workflows.json', key ? { encrypt: true, key } : undefined) || []; } catch { return []; } 
}
export async function loadSiteConfigsJSON(..._args: any[]): Promise<any[]> { 
  let key = _args[1] instanceof CryptoKey ? _args[1] : null;
  if (!key) key = getEncryptionKey();
  try { return await dataStorage.loadUser<any[]>(ensureUser(), 'site_configs.json', key ? { encrypt: true, key } : undefined) || []; } catch { return []; } 
}
export async function loadDomainStatusJSON(..._args: any[]): Promise<any[]> { try { return await dataStorage.loadUser<any[]>(ensureUser(), 'domain_status.json') || []; } catch { return []; } }
export async function loadDatabasesJSON(..._args: any[]): Promise<any[]> { try { return await dataStorage.loadUser<any[]>(ensureUser(), 'databases.json') || []; } catch { return []; } }
export async function loadDatabasesCacheJSON(..._args: any[]): Promise<any> { try { return await dataStorage.loadUser<any>(ensureUser(), 'databases_cache.json') || null; } catch { return null; } }

// =====================
// SAVE - Accept ...args, ignore extras  
// =====================
export async function saveSitesJSON(..._args: any[]): Promise<void> { const data = _args[1] || []; await dataStorage.saveUser(ensureUser(), 'sites.json', data); }
export async function saveTagsJSON(..._args: any[]): Promise<void> { const data = _args[0] || []; await dataStorage.saveUser(ensureUser(), 'tags.json', data); }
export async function saveNotesJSON(..._args: any[]): Promise<void> { 
  // Pattern: saveNotesJSON(user, data, key) - key is at _args[2]
  const data = _args[1] || [];
  const key = _args[2] instanceof CryptoKey ? _args[2] : null;
  await dataStorage.saveUser(ensureUser(), 'notes.json', data, key ? { encrypt: true, key } : undefined); 
}
export async function saveCredentialsJSON(..._args: any[]): Promise<void> { 
  // Pattern: saveCredentialsJSON(user, data, key) - key is at _args[2]
  const data = _args[1] || [];
  const key = _args[2] instanceof CryptoKey ? _args[2] : null;
  await dataStorage.saveUser(ensureUser(), 'credentials.json', data, key ? { encrypt: true, key } : undefined); 
}
export async function saveSettingsJSON(..._args: any[]): Promise<void> { 
  // Pattern: saveSettingsJSON(user, data, key) - key is at _args[2]
  const data = _args[1] || {};
  const key = _args[2] instanceof CryptoKey ? _args[2] : null;
  await dataStorage.saveUser(ensureUser(), 'settings.json', data, key ? { encrypt: true, key } : undefined); 
}
export async function saveTunnelsJSON(..._args: any[]): Promise<void> { const data = _args[0] || []; await dataStorage.saveUser(ensureUser(), 'tunnels.json', data); }
export async function saveActivityLogsJSON(..._args: any[]): Promise<void> { const data = _args[0] || []; await dataStorage.saveUser(ensureUser(), 'activity_logs.json', data); }
export async function saveWorkflowsJSON(..._args: any[]): Promise<void> { 
  // Pattern: saveWorkflowsJSON(user, data, key) - key is at _args[2]
  const data = _args[1] || [];
  const key = _args[2] instanceof CryptoKey ? _args[2] : null;
  await dataStorage.saveUser(ensureUser(), 'workflows.json', data, key ? { encrypt: true, key } : undefined); 
}
export async function saveSiteConfigsJSON(..._args: any[]): Promise<void> { 
  // Pattern: saveSiteConfigsJSON(user, data, key) - key is at _args[2]
  const data = _args[1] || [];
  const key = _args[2] instanceof CryptoKey ? _args[2] : null;
  await dataStorage.saveUser(ensureUser(), 'site_configs.json', data, key ? { encrypt: true, key } : undefined); 
}
export async function saveDomainStatusJSON(..._args: any[]): Promise<void> { const data = _args[1] || []; await dataStorage.saveUser(ensureUser(), 'domain_status.json', data); }
export async function saveDatabasesJSON(..._args: any[]): Promise<void> { const data = _args[0] || []; await dataStorage.saveUser(ensureUser(), 'databases.json', data); }
export async function saveDatabasesCacheJSON(..._args: any[]): Promise<void> { const data = _args[0] || { key: '', data: [], timestamp: 0 }; await dataStorage.saveUser(ensureUser(), 'databases_cache.json', data); }

// =====================
// ACTIVITY LOGGING
// =====================
export async function logActivityJSON(_first?: any, _second?: any, _third?: any, _fourth?: any, _fifth?: any): Promise<void> {
  // Handle old: logActivityJSON(user, action, type, id, name) and new: logActivityJSON(action, type, id, name)
  let action: any, entity_type: any, entity_id: any, entity_name: any;
  if (typeof _first === 'string' && ['delete', 'create', 'update', 'deploy', 'error'].includes(_first)) {
    action = _first; entity_type = _second; entity_id = _third; entity_name = _fourth;
  } else {
    action = _second; entity_type = _third; entity_id = _fourth; entity_name = _fifth;
  }
  if (!action || !entity_type) return;
  const logs = await loadActivityLogsJSON();
  logs.push({ id: crypto.randomUUID(), action, entity_type, entity_id, entity_name, timestamp: Date.now() });
  await saveActivityLogsJSON(logs);
}

// =====================
// DELETE
// =====================
export async function deleteUserData(username: string) {
  // Delete individual files first
  const files = ['user.json', 'settings.json', 'tunnels.json', 'activity_logs.json', 'credentials.json', 'notes.json', 'sites.json', 'tags.json', 'site_configs.json', 'workflows.json', 'domain_status.json', 'databases.json', 'databases_cache.json'];
  for (const file of files) { 
    await dataStorage.removeUser(username, file); 
  }
  
  // Delete entire user folder using native Neutralino
  const userDir = `users/user_${username}`;
  try {
    await ampBridge.fs.remove(userDir);
  } catch {
    // Ignore - folder might not exist
  }
  
  // Update config - merge instead of overwrite
  const config = await dataStorage.load<any>('config.json') || {};
  config.lastUser = null;
  await dataStorage.save('config.json', config);
}