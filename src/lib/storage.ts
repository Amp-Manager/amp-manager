import { encryptWithKey, decryptWithKey } from './crypto';
import { ampBridge } from '../services/AMPBridge';

const USERS_DIR = 'users';
const USER_DIR_PREFIX = 'user_';
const LS_PREFIX = 'amp_';

function getLsKey(key: string): string {
  return `${LS_PREFIX}${key.replace(/[\/\\]/g, '_')}`;
}

export interface StorageOptions {
  encrypt?: boolean;
  key?: CryptoKey;
}

export const dataStorage = {
  async ensureUserDir(username: string): Promise<void> {
    if (ampBridge.isDevMode()) return;
    const user = username.toLowerCase();
    const userDir = await ampBridge.fs.getAbsolutePath(`${USERS_DIR}/${USER_DIR_PREFIX}${user}`);
    try {
      await ampBridge.fs.createDirectory(userDir);
    } catch { /* ignore if exists */ }
    await new Promise(r => setTimeout(r, 50));
  },

  async saveUser(username: string, filename: string, data: unknown, options: StorageOptions = {}): Promise<void> {
    const user = username.toLowerCase();
    
    if (ampBridge.isDevMode()) {
      const lsKey = getLsKey(`${USERS_DIR}/${USER_DIR_PREFIX}${user}/${filename}`);
      let jsonData: string;
      const isValidKey = options.key && typeof options.key === 'object' && options.key.type === 'secret';
      if (options.encrypt && isValidKey) {
        const encrypted = await encryptWithKey(JSON.stringify(data), options.key);
        jsonData = JSON.stringify({
          encrypted: true,
          data: encrypted.ciphertext,
          iv: encrypted.iv
        });
      } else {
        jsonData = JSON.stringify(data, null, 2);
      }
      localStorage.setItem(lsKey, jsonData);
      return;
    }

    await this.ensureUserDir(user);
    const filePath = await ampBridge.fs.getAbsolutePath(`${USERS_DIR}/${USER_DIR_PREFIX}${user}/${filename}`);
    
    let jsonData: string;
    const isValidKey = options.key && typeof options.key === 'object' && options.key.type === 'secret';
    if (options.encrypt && isValidKey) {
      const encrypted = await encryptWithKey(JSON.stringify(data), options.key);
      jsonData = JSON.stringify({
        encrypted: true,
        data: encrypted.ciphertext,
        iv: encrypted.iv
      });
    } else {
      jsonData = JSON.stringify(data, null, 2);
    }
    await ampBridge.fs.writeTextFile(filePath, jsonData);
  },

  async loadUser<T>(username: string, filename: string, options: StorageOptions = {}): Promise<T | null> {
    const user = username.toLowerCase();
    
    if (ampBridge.isDevMode()) {
      const lsKey = getLsKey(`${USERS_DIR}/${USER_DIR_PREFIX}${user}/${filename}`);
      const stored = localStorage.getItem(lsKey);
      if (!stored) return null;
      try {
        const parsed = JSON.parse(stored);
        const isValidKey = options.key && typeof options.key === 'object' && options.key.type === 'secret';
        if (parsed.encrypted && isValidKey) {
          const decrypted = await decryptWithKey(parsed.iv, parsed.data, options.key);
          return JSON.parse(decrypted) as T;
        }
        return parsed as T;
      } catch {
        return null;
      }
    }

    try {
      const filePath = await ampBridge.fs.getAbsolutePath(`${USERS_DIR}/${USER_DIR_PREFIX}${user}/${filename}`);
      const result = await ampBridge.fs.readTextFile(filePath);
      const parsed = JSON.parse(result);
      
      const isValidKey = options.key && typeof options.key === 'object' && options.key.type === 'secret';
      if (parsed.encrypted && isValidKey) {
        const decrypted = await decryptWithKey(parsed.iv, parsed.data, options.key);
        return JSON.parse(decrypted) as T;
      }
      return parsed as T;
    } catch {
      return null;
    }
  },

  async removeUser(username: string, filename: string): Promise<void> {
    const user = username.toLowerCase();
    
    if (ampBridge.isDevMode()) {
      const lsKey = getLsKey(`${USERS_DIR}/${USER_DIR_PREFIX}${user}/${filename}`);
      localStorage.removeItem(lsKey);
      return;
    }

    try {
      const filePath = await ampBridge.fs.getAbsolutePath(`${USERS_DIR}/${USER_DIR_PREFIX}${user}/${filename}`);
      await ampBridge.fs.deleteFile(filePath);
    } catch { /* ignore */ }
  },

  async existsUser(username: string, filename: string): Promise<boolean> {
    const user = username.toLowerCase();
    
    if (ampBridge.isDevMode()) {
      const lsKey = getLsKey(`${USERS_DIR}/${USER_DIR_PREFIX}${user}/${filename}`);
      return localStorage.getItem(lsKey) !== null;
    }

    try {
      const filePath = await ampBridge.fs.getAbsolutePath(`${USERS_DIR}/${USER_DIR_PREFIX}${user}/${filename}`);
      await ampBridge.fs.readTextFile(filePath);
      return true;
    } catch { return false; }
  },

  async save(key: string, data: unknown, options: StorageOptions = {}): Promise<void> {
    if (ampBridge.isDevMode()) {
      const lsKey = getLsKey(key);
      const jsonData = JSON.stringify(data, null, 2);
      localStorage.setItem(lsKey, jsonData);
      return;
    }

    const filePath = await ampBridge.fs.getAbsolutePath(key);
    const jsonData = JSON.stringify(data, null, 2);
    await ampBridge.fs.writeTextFile(filePath, jsonData);
  },

  async load<T>(key: string, options: StorageOptions = {}): Promise<T | null> {
    if (ampBridge.isDevMode()) {
      const lsKey = getLsKey(key);
      const stored = localStorage.getItem(lsKey);
      if (!stored) return null;
      try {
        return JSON.parse(stored) as T;
      } catch { return null; }
    }

    try {
      const filePath = await ampBridge.fs.getAbsolutePath(key);
      const result = await ampBridge.fs.readTextFile(filePath);
      return JSON.parse(result) as T;
    } catch { return null; }
  },

  async remove(key: string): Promise<void> {
    if (ampBridge.isDevMode()) {
      const lsKey = getLsKey(key);
      localStorage.removeItem(lsKey);
      return;
    }
    try { await ampBridge.fs.deleteFile(key); } catch { /* ignore */ }
  },

  async exists(key: string): Promise<boolean> {
    if (ampBridge.isDevMode()) {
      const lsKey = getLsKey(key);
      return localStorage.getItem(lsKey) !== null;
    }
    try { await ampBridge.fs.readTextFile(key); return true; } catch { return false; }
  }
};

export default dataStorage;