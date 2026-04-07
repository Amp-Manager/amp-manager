import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { 
  ToastSettings, 
  DEFAULT_TOAST_SETTINGS, 
  loadToastSettings, 
  saveToastSettings 
} from '@/utils/toastSettings';
import { 
  setToastSoundEnabled, 
  setToastVolume 
} from '@/utils/toastSound';

interface ToastSettingsContextType {
  toastSettings: ToastSettings;
  updateToastSettings: (updates: Partial<ToastSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  isLoading: boolean;
}

const ToastSettingsContext = createContext<ToastSettingsContextType | undefined>(undefined);

export function ToastSettingsProvider({ children }: { children: ReactNode }) {
  const { user, db } = useAuth();
  const [toastSettings, setToastSettings] = useState<ToastSettings>(DEFAULT_TOAST_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings when user changes
  useEffect(() => {
    const loadSettings = async () => {
      if (!user || !db) {
        setIsLoading(false);
        return;
      }

      try {
        const settings = await loadToastSettings(user, db);
        setToastSettings(settings);

        // Apply sound settings to audio module
        setToastSoundEnabled(settings.soundEnabled);
        setToastVolume(settings.volume);
      } catch (err) {
        // Silently fail - will use defaults
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user, db]);

  // Update settings function
  const updateToastSettings = useCallback(async (updates: Partial<ToastSettings>) => {
    if (!user || !db) return;

    setToastSettings((prev) => {
      const newSettings = {
        ...prev,
        ...updates,
        types: updates.types ? { ...prev.types, ...updates.types } : prev.types,
      };

      // Apply sound settings immediately
      setToastSoundEnabled(newSettings.soundEnabled);
      setToastVolume(newSettings.volume);

      // Save to IndexedDB (fire and forget)
      saveToastSettings(user, db, newSettings).catch(() => {
        // Silently fail - settings applied but not persisted
      });

      return newSettings;
    });
  }, [user, db]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    if (!user || !db) return;

    const defaults = { ...DEFAULT_TOAST_SETTINGS };
    setToastSettings(defaults);
    setToastSoundEnabled(defaults.soundEnabled);
    setToastVolume(defaults.volume);

    try {
      await saveToastSettings(user, db, defaults);
    } catch (err) {
      // Silently fail - defaults applied but not persisted
    }
  }, [user, db]);

  const value: ToastSettingsContextType = {
    toastSettings,
    updateToastSettings,
    resetToDefaults,
    isLoading,
  };

  return (
    <ToastSettingsContext.Provider value={value}>
      {children}
    </ToastSettingsContext.Provider>
  );
}

export function useToastSettings(): ToastSettingsContextType {
  const context = useContext(ToastSettingsContext);
  if (context === undefined) {
    throw new Error('useToastSettings must be used within a ToastSettingsProvider');
  }
  return context;
}
