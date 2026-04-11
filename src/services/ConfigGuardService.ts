import { loadSiteConfigsJSON, saveSiteConfigsJSON } from '@/lib/db';
import { ampBridge } from './AMPBridge';

export const ESSENTIAL_FILES = [
  'docker-compose.yml',
  'docker-compose.override.yml',
  'config/angie.conf',
  'config/default.local.conf',
  'config/php.ini',
  'config/db-init/01-grant-root.sql'
];

export interface ConfigBackup {
  id: string;
  filename: string;
  path: string;
  content: string;
  timestamp: number;
  type: 'factory' | 'snapshot';
}

class ConfigGuardService {
  async captureFactorySettings() {
    const configs = await loadSiteConfigsJSON();
    const existing = configs.filter(c => c.type === 'factory');
    
    const existingFilenames = new Set(existing.map((b: any) => b.filename));
    const missingFiles = ESSENTIAL_FILES.filter(f => !existingFilenames.has(f));

    if (missingFiles.length === 0) return;
    if (!ampBridge.isAvailable()) return;

    const env = await ampBridge.envCheck();
    const nlPath = env.project_root;
    if (!nlPath) return;

    for (const file of missingFiles) {
      try {
        const path = `${nlPath}/${file.replace(/\//g, '\\')}`;
        const content = await ampBridge.fs.readTextFile(path);
        
        configs.push({
          id: `factory:${file}`,
          filename: file,
          path: path,
          content: content,
          timestamp: Date.now(),
          type: 'factory'
        });
      } catch {
        // Silently skip files that cannot be read
      }
    }
    
    await saveSiteConfigsJSON(configs);
  }

  async getBackups(): Promise<ConfigBackup[]> {
    const configs = await loadSiteConfigsJSON();
    return configs as ConfigBackup[];
  }

  async restoreFile(fileId: string): Promise<ConfigBackup> {
    const configs = await loadSiteConfigsJSON();
    const backup = configs.find(c => c.id === fileId) as ConfigBackup;
    if (!backup) throw new Error('Config backup not found');

    await ampBridge.fs.writeTextFile(backup.path, backup.content);
    return backup;
  }

  async createSnapshot(file: string) {
    if (!ampBridge.isAvailable()) return;
    const env = await ampBridge.envCheck();
    const nlPath = env.project_root;
    const path = `${nlPath}/${file.replace(/\//g, '\\')}`;
    const content = await ampBridge.fs.readTextFile(path);
    
    const configs = await loadSiteConfigsJSON();
    const timestamp = Date.now();
    configs.push({
      id: `snapshot:${file}:${timestamp}`,
      filename: file,
      path: path,
      content: content,
      timestamp: timestamp,
      type: 'snapshot'
    });
    await saveSiteConfigsJSON(configs);
  }

  async deleteBackup(fileId: string) {
    const configs = await loadSiteConfigsJSON();
    const backup = configs.find(c => c.id === fileId);
    if (backup && backup.type === 'factory') {
      throw new Error('Factory backups cannot be deleted');
    }
    const filtered = configs.filter(c => c.id !== fileId);
    await saveSiteConfigsJSON(filtered);
  }
}

export const configGuardService = new ConfigGuardService();