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
  const { user } = useAuth();
  const [toastSettings, setToastSettings] = useState<ToastSettings>(DEFAULT_TOAST_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const settings = await loadToastSettings(user);
        setToastSettings(settings);

        setToastSoundEnabled(settings.soundEnabled);
        setToastVolume(settings.volume);
      } catch (err) {
        // Silently fail - will use defaults
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const updateToastSettings = useCallback(async (updates: Partial<ToastSettings>) => {
    if (!user) return;

    setToastSettings((prev) => {
      const newSettings = {
        ...prev,
        ...updates,
        types: updates.types ? { ...prev.types, ...updates.types } : prev.types,
      };

      setToastSoundEnabled(newSettings.soundEnabled);
      setToastVolume(newSettings.volume);

      saveToastSettings(user, newSettings).catch(() => {
        // Silently fail - settings applied but not persisted
      });

      return newSettings;
    });
  }, [user]);

  const resetToDefaults = useCallback(async () => {
    if (!user) return;

    const defaults = { ...DEFAULT_TOAST_SETTINGS };
    setToastSettings(defaults);
    setToastSoundEnabled(defaults.soundEnabled);
    setToastVolume(defaults.volume);

    try {
      await saveToastSettings(user, defaults);
    } catch (err) {
      // Silently fail - defaults applied but not persisted
    }
  }, [user]);

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
