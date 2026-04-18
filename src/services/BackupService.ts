import { 
  loadSitesJSON, saveSitesJSON,
  loadTagsJSON, saveTagsJSON,
  loadNotesJSON, saveNotesJSON,
  loadCredentialsJSON, saveCredentialsJSON,
  loadWorkflowsJSON, saveWorkflowsJSON
} from '../lib/db';
import { decryptWithKey, encryptWithKey } from '../lib/crypto';
import { toast } from '@/utils/toast';

export interface BackupData {
  version: string;
  timestamp: number;
  sites: any[];
  notes: any[];
  credentials: any[];
  workflows: any[];
  tags: any[];
}

class BackupService {
  async exportData(username: string, encryptionKey: CryptoKey | null, includeSensitive: boolean): Promise<BackupData> {
    const [sites, notesRaw, credentialsRaw, workflows, tags] = await Promise.all([
      loadSitesJSON(),
      loadNotesJSON(username, encryptionKey || undefined),
      loadCredentialsJSON(username, encryptionKey || undefined),
      loadWorkflowsJSON(),
      loadTagsJSON()
    ]);

    const notes = await Promise.all(notesRaw.map(async (note) => {
      if (includeSensitive && note.is_encrypted && encryptionKey) {
        try {
          const decrypted = await decryptWithKey(note.content_iv, note.content_ciphertext, encryptionKey);
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
      tags
    };
  }

  async importData(username: string, data: BackupData, encryptionKey: CryptoKey | null, overwrite: boolean) {
    if (overwrite) {
      await Promise.all([
        saveSitesJSON(username, []),
        saveNotesJSON(username, [], encryptionKey),
        saveCredentialsJSON(username, [], encryptionKey),
        saveWorkflowsJSON(username, []),
        saveTagsJSON([])
      ]);
    }

    if (data.sites?.length) {
      const existing = await loadSitesJSON();
      await saveSitesJSON(username, [...existing, ...data.sites]);
    }

    if (data.tags?.length) {
      const existing = await loadTagsJSON();
      await saveTagsJSON([...existing, ...data.tags]);
    }

    if (data.workflows?.length) {
      const existing = await loadWorkflowsJSON();
      await saveWorkflowsJSON(username, [...existing, ...data.workflows]);
    }

    if (data.notes?.length) {
      const existing = await loadNotesJSON(username, encryptionKey || undefined);
      const reencrypted = await Promise.all(data.notes.map(async (note) => {
        if (note.is_encrypted === false && note.content && encryptionKey) {
          const { iv, ciphertext } = await encryptWithKey(note.content, encryptionKey);
          return {
            ...note,
            is_encrypted: true,
            content: '',
            content_iv: iv,
            content_ciphertext: ciphertext,
            content_salt: 'session'
          };
        }
        return note;
      }));
      await saveNotesJSON(username, [...existing, ...reencrypted], encryptionKey);
    }

    if (data.credentials?.length) {
      const existing = await loadCredentialsJSON(username, encryptionKey || undefined);
      const reencrypted = await Promise.all(data.credentials.map(async (cred) => {
        if (cred.salt === 'plain' && encryptionKey) {
          const { iv, ciphertext } = await encryptWithKey(cred.secret, encryptionKey);
          return {
            ...cred,
            secret: ciphertext,
            iv: iv,
            salt: 'session'
          };
        }
        return cred;
      }));
      await saveCredentialsJSON(username, [...existing, ...reencrypted], encryptionKey);
    }
  }
}

export const backupService = new BackupService();