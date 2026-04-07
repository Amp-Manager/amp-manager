import { initDB } from '../lib/db';
import { decryptWithKey, encryptWithKey } from '../lib/crypto';
import { toast } from '@/utils/toast';
import type { SiteRecord, Note, Credential, Tag, DatabaseRecord, ActivityLog, Task, SettingRecord } from '../types/entities';
import type { Workflow } from '../components/workflow/types';

export interface BackupData {
  version: string;
  timestamp: number;
  sites: SiteRecord[];
  notes: Note[];
  credentials: Credential[];
  workflows: Workflow[];
  tags: Tag[];
  tasks: Task[];
  settings: SettingRecord[];
  databases?: DatabaseRecord[];
  activity_logs?: ActivityLog[];
}

class BackupService {
  async exportData(username: string, encryptionKey: CryptoKey | null, includeSensitive: boolean): Promise<BackupData> {
    const db = await initDB(username);
    
    const [sites, notesRaw, credentialsRaw, workflows, tags, tasks, settings] = await Promise.all([
      db.getAll('sites'),
      db.getAll('notes'),
      db.getAll('credentials'),
      db.getAll('workflows'),
      db.getAll('tags'),
      db.getAll('tasks'),
      db.getAll('settings')
    ]);

    const notes = await Promise.all(notesRaw.map(async (note) => {
      if (includeSensitive && note.is_encrypted && encryptionKey) {
        try {
          const decrypted = await decryptWithKey(note.content_iv!, note.content_ciphertext!, encryptionKey);
          return { ...note, content: decrypted, is_encrypted: false, content_iv: undefined, content_ciphertext: undefined };
        } catch {
          toast.error(`Failed to decrypt note "${note.id}". Check your encryption key.`);
          throw new Error('Decryption failed. Please verify your encryption key and try again.');
        }
      }
      return note;
    }));

    const credentials = [];
    if (includeSensitive) {
      const processedCredentials = await Promise.all(credentialsRaw.map(async (cred) => {
        if (encryptionKey) {
          try {
            const decrypted = await decryptWithKey(cred.iv, cred.secret, encryptionKey);
            return { ...cred, secret: decrypted, iv: undefined, salt: 'plain' };
          } catch {
            toast.error(`Failed to decrypt credential "${cred.id}". Check your encryption key.`);
            throw new Error('Decryption failed. Please verify your encryption key and try again.');
          }
        }
        return cred;
      }));
      credentials.push(...processedCredentials);
    }

    return {
      version: '1.0.0',
      timestamp: Date.now(),
      sites,
      notes,
      credentials,
      workflows,
      tags,
      tasks,
      settings
    };
  }

  async importData(username: string, data: BackupData, encryptionKey: CryptoKey | null, overwrite: boolean) {
    const db = await initDB(username);
    
    if (overwrite) {
      await Promise.all([
        db.clear('sites'),
        db.clear('notes'),
        db.clear('credentials'),
        db.clear('workflows'),
        db.clear('tags'),
        db.clear('tasks'),
        db.clear('settings')
      ]);
    }

    await Promise.all([
      // Sites
      ...data.sites.map(site => db.put('sites', site)),
      // Tags
      ...data.tags.map(tag => db.put('tags', tag)),
      // Tasks
      ...data.tasks.map(task => db.put('tasks', task)),
      // Workflows
      ...data.workflows.map(workflow => db.put('workflows', workflow)),
      // Settings
      ...data.settings.map(setting => db.put('settings', setting)),
      // Notes (Re-encrypt if needed)
      ...data.notes.map(async (note) => {
        if (note.is_encrypted === false && note.content && encryptionKey) {
          const { iv, ciphertext } = await encryptWithKey(note.content, encryptionKey);
          return db.put('notes', {
            ...note,
            is_encrypted: true,
            content: '',
            content_iv: iv,
            content_ciphertext: ciphertext,
            content_salt: 'session'
          });
        }
        return db.put('notes', note);
      }),
      // Credentials (Re-encrypt if needed)
      ...data.credentials.map(async (cred) => {
        if (cred.salt === 'plain' && encryptionKey) {
          const { iv, ciphertext } = await encryptWithKey(cred.secret, encryptionKey);
          return db.put('credentials', {
            ...cred,
            secret: ciphertext,
            iv: iv,
            salt: 'session'
          });
        }
        return db.put('credentials', cred);
      })
    ]);
  }
}

export const backupService = new BackupService();
