import { loadSettingsJSON, saveSettingsJSON } from '@/lib/db';

export type ToastPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-center' 
  | 'bottom-right';

export interface ToastSettings {
  position: ToastPosition;
  soundEnabled: boolean;
  volume: number;
  types: {
    success: boolean;
    error: boolean;
    info: boolean;
    warning: boolean;
  };
}

export const DEFAULT_TOAST_SETTINGS: ToastSettings = {
  position: 'top-right',
  soundEnabled: true,
  volume: 0.5,
  types: {
    success: true,
    error: true,
    info: true,
    warning: true,
  },
};

export async function loadToastSettings(username: string): Promise<ToastSettings> {
  const settings = await loadSettingsJSON(username);
  const stored = settings.toastSettings;
  if (stored) {
    return {
      ...DEFAULT_TOAST_SETTINGS,
      ...stored,
      types: {
        ...DEFAULT_TOAST_SETTINGS.types,
        ...(stored.types || {}),
      },
    };
  }
  return { ...DEFAULT_TOAST_SETTINGS };
}

export async function saveToastSettings(username: string, settings: ToastSettings): Promise<void> {
  const allSettings = await loadSettingsJSON(username);
  allSettings.toastSettings = settings;
  await saveSettingsJSON(username, allSettings);
}