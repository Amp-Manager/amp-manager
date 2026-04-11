import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { deriveKey, generateSalt, encryptData, decryptData, bufferToHex, hexToBuffer, encryptWithKey } from '../lib/crypto';
import { dataStorage } from '../lib/storage';
import { ampBridge } from '../services/AMPBridge';
import { loadCredentialsJSON, saveCredentialsJSON, loadUserJSON, saveUserJSON, setCurrentUser, setEncryptionKey } from '../lib/db';

interface AuthContextType {
  user: string | null;
  db: null;
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
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const db = null;

  const login = useCallback(async (username: string, password: string) => {
    try {
      const userData = await loadUserJSON(username);

      if (!userData) {
        throw new Error('User not found. Please register.');
      }

      if (!userData.salt || !userData.validation_iv || !userData.validation_ciphertext) {
        throw new Error('User data corrupted. Please re-register or contact support.');
      }

      const salt = hexToBuffer(userData.salt);
      const key = await deriveKey(password, salt);
      
      const validationIv = hexToBuffer(userData.validation_iv);
      const validationCiphertext = hexToBuffer(userData.validation_ciphertext);
      
      try {
        const decryptedValidation = await decryptData(key, validationIv, validationCiphertext);
        if (decryptedValidation !== 'VALIDATION_CHECK') {
           throw new Error('Invalid password.');
        }
      } catch {
        throw new Error('Invalid password. Ensure Caps Lock is off and retype your password carefully.');
      }

      setUser(username);
      setEncryptionKey(key);
      setCurrentUser(username); // Set global currentUser for db functions
      
      await ensureSSHKeyExists(username, key);
      await dataStorage.save('config.json', { lastUser: username });
    } catch (error) {
      throw error;
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    try {
      const existing = await loadUserJSON(username);
      if (existing) {
        throw new Error('User already exists. Please login.');
      }

      await dataStorage.ensureUserDir(username);

      const salt = generateSalt();
      const key = await deriveKey(password, salt);

      const { iv, ciphertext } = await encryptData(key, 'VALIDATION_CHECK');

      await saveUserJSON(username, {
        salt: bufferToHex(salt),
        validation_iv: bufferToHex(iv),
        validation_ciphertext: bufferToHex(ciphertext),
        created_at: Date.now()
      });

      setUser(username);
      setEncryptionKey(key);
      setCurrentUser(username); // Set global currentUser for db functions
      
      await ensureSSHKeyExists(username, key);
      await dataStorage.save('config.json', { lastUser: username });
    } catch (error) {
      throw error;
    }
  }, []);

  const verifyPassword = useCallback(async (pwd: string): Promise<boolean> => {
    if (!encryptionKey || !user) return false;
    
    const userData = await loadUserJSON(user);
    if (!userData) return false;

    const validationIv = hexToBuffer(userData.validation_iv);
    const validationCiphertext = hexToBuffer(userData.validation_ciphertext);
    
    try {
      const decrypted = await decryptData(encryptionKey, validationIv, validationCiphertext);
      return decrypted === 'VALIDATION_CHECK';
    } catch {
      return false;
    }
  }, [user, encryptionKey]);

  const logout = useCallback(async () => {
    await dataStorage.save('config.json', { lastUser: null });
    setUser(null);
    setEncryptionKey(null);
    setCurrentUser(null); // Clear global currentUser for db functions
  }, []);

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

async function ensureSSHKeyExists(username: string, key: CryptoKey) {
  try {
    const allCreds = await loadCredentialsJSON(username, key);
    const existingKey = allCreds.find(c => c.id === 'ssh_amp_manager');
    
    if (existingKey) return;

    if (!ampBridge.isAvailable()) return;

    const res = await ampBridge.sshKeyGenerate(username);
    if (res.status !== 'ok') return;

    const pubKeyResult = await ampBridge.sshKeyStatus();
    
    const keyInfo = JSON.stringify({
      publicKey: pubKeyResult.public_key,
      keyPath: pubKeyResult.key_path,
      fingerprint: pubKeyResult.fingerprint,
      generatedAt: Date.now()
    });
    
    const { iv, ciphertext } = await encryptWithKey(keyInfo, key);
    
    const newCred = {
      id: 'ssh_amp_manager',
      name: 'AMP Manager SSH Key',
      type: 'ssh_key',
      secret: ciphertext,
      iv: iv,
      salt: 'session',
      public_key: pubKeyResult.public_key,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    allCreds.push(newCred);
    await saveCredentialsJSON(username, allCreds, key);
  } catch {
    // Ignore SSH key errors
  }
}