import { IDBPDatabase } from 'idb';
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
  async captureFactorySettings(db: IDBPDatabase<any>) {
    const existing = await db.getAllFromIndex('config_backups', 'by-type', 'factory');
    
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
        
        await db.put('config_backups', {
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
  }

  async getBackups(db: IDBPDatabase<any>) {
    return await db.getAll('config_backups') as ConfigBackup[];
  }

  async restoreFile(db: IDBPDatabase<any>, fileId: string) {
    const backup = await db.get('config_backups', fileId) as ConfigBackup;
    if (!backup) throw new Error('Config backup not found');

    await ampBridge.fs.writeTextFile(backup.path, backup.content);
    return backup;
  }

  async createSnapshot(db: IDBPDatabase<any>, file: string) {
    if (!ampBridge.isAvailable()) return;
    const env = await ampBridge.envCheck();
    const nlPath = env.project_root;
    const path = `${nlPath}/${file.replace(/\//g, '\\')}`;
    const content = await ampBridge.fs.readTextFile(path);
    
    const timestamp = Date.now();
    await db.put('config_backups', {
      id: `snapshot:${file}:${timestamp}`,
      filename: file,
      path: path,
      content: content,
      timestamp: timestamp,
      type: 'snapshot'
    });
  }

  async deleteBackup(db: IDBPDatabase<any>, fileId: string) {
    const backup = await db.get('config_backups', fileId);
    if (backup && backup.type === 'factory') {
      throw new Error('Factory backups cannot be deleted');
    }
    await db.delete('config_backups', fileId);
  }
}

export const configGuardService = new ConfigGuardService();
