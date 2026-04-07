
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { deriveKey, generateSalt, encryptData, decryptData, bufferToHex, hexToBuffer } from '../lib/crypto';
import { initDB } from '../lib/db';
import { IDBPDatabase } from 'idb';
import { AmpManagerDBSchema } from '../lib/db';
import { ampBridge } from '../services/AMPBridge';
import { toast } from '@/utils/toast';

interface AuthContextType {
  user: string | null;
  db: IDBPDatabase<AmpManagerDBSchema> | null;
  encryptionKey: CryptoKey | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  verifyPassword: (password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [db, setDb] = useState<IDBPDatabase<AmpManagerDBSchema> | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const database = await initDB(username);
      const settings = await database.get('settings', 'security_metadata');

      if (!settings) {
        throw new Error('User not found. Please register.');
      }

      const salt = hexToBuffer(settings.salt);
      const key = await deriveKey(password, salt);
      
      // Validate password by attempting to decrypt the validation hash
      const validationIv = hexToBuffer(settings.validation_iv);
      const validationCiphertext = hexToBuffer(settings.validation_ciphertext);
      
      try {
        const decryptedValidation = await decryptData(key, validationIv, validationCiphertext);
        if (decryptedValidation !== 'VALIDATION_CHECK') {
           throw new Error('Invalid password.');
        }
      } catch (e) {
        throw new Error('Invalid password. Ensure Caps Lock is off and retype your password carefully.');
      }

      setUser(username);
      setDb(database);
      setEncryptionKey(key);
      
      // Auto-generate SSH key for tunneling
      await ensureSSHKeyExists(username, database, key);
    } catch (error) {
      throw error;
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    try {
      const database = await initDB(username);
      const existingSettings = await database.get('settings', 'security_metadata');

      if (existingSettings) {
        throw new Error('User already exists. Please login.');
      }

      const salt = generateSalt();
      const key = await deriveKey(password, salt);

      // Create validation hash
      const { iv, ciphertext } = await encryptData(key, 'VALIDATION_CHECK');

      await database.put('settings', {
        key: 'security_metadata',
        salt: bufferToHex(salt),
        validation_iv: bufferToHex(iv),
        validation_ciphertext: bufferToHex(ciphertext),
        created_at: Date.now()
      });

      setUser(username);
      setDb(database);
      setEncryptionKey(key);
      
      // Auto-generate SSH key for tunneling
      await ensureSSHKeyExists(username, database, key);
    } catch (error) {
      throw error;
    }
  }, []);

  // Helper if SSH key exists for tunneling
  const ensureSSHKeyExists = async (
    username: string,
    database: IDBPDatabase<AmpManagerDBSchema>,
    key: CryptoKey
  ) => {
    try {
      const existingKey = await database.get('credentials', 'ssh_amp_manager');
      if (existingKey) return;

      if (!ampBridge.isAvailable()) return;

      const res = await ampBridge.sshKeyGenerate(username);
      if (res.status !== 'ok') return;

      const pubKeyResult = await ampBridge.sshKeyStatus();
      
      const keyData = JSON.stringify({
        username: username,
        keyPath: res.key_path || `${process.env.USERPROFILE}\\.ssh\\id_ed25519`,
        fingerprint: pubKeyResult.fingerprint || res.fingerprint || '',
        publicKey: pubKeyResult.public_key || res.public_key || ''
      });

      const { iv, ciphertext } = await encryptData(key, keyData);

      await database.put('credentials', {
        id: 'ssh_amp_manager',
        name: 'AMP Manager SSH Key',
        type: 'ssh_key',
        username: username,
        secret: bufferToHex(ciphertext),
        iv: bufferToHex(iv),
        salt: '',
        created_at: Date.now(),
        updated_at: Date.now()
      });

      toast.success('SSH key configured for tunneling');
    } catch (err) {
      // Silent fail - tunnel services will still work
    }
  };

  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    if (!user || !db) return false;
    
    try {
      const settings = await db.get('settings', 'security_metadata');
      if (!settings) return false;

      const salt = hexToBuffer(settings.salt);
      const key = await deriveKey(password, salt);
      
      const validationIv = hexToBuffer(settings.validation_iv);
      const validationCiphertext = hexToBuffer(settings.validation_ciphertext);
      
      const decryptedValidation = await decryptData(key, validationIv, validationCiphertext);
      return decryptedValidation === 'VALIDATION_CHECK';
    } catch (e) {
      return false;
    }
  }, [user, db]);

  const logout = useCallback(() => {
    if (db) {
      db.close();
    }
    setUser(null);
    setDb(null);
    setEncryptionKey(null);
  }, [db]);

  const value = useMemo(() => ({
    user,
    db,
    encryptionKey,
    login,
    register,
    verifyPassword,
    logout,
    isAuthenticated: !!user
  }), [user, db, encryptionKey]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
