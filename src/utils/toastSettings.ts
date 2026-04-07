import { initDB, AmpManagerDBSchema } from '@/lib/db';
import { IDBPDatabase } from 'idb';

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
  volume: number; // 0-1
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

export async function loadToastSettings(
  username: string,
  db: IDBPDatabase<AmpManagerDBSchema>
): Promise<ToastSettings> {
  const stored = await db.get('settings', 'toastSettings');
  if (stored && stored.value) {
    // Merge with defaults to handle partial/old settings
    return {
      ...DEFAULT_TOAST_SETTINGS,
      ...stored.value,
      types: {
        ...DEFAULT_TOAST_SETTINGS.types,
        ...(stored.value.types || {}),
      },
    };
  }
  return { ...DEFAULT_TOAST_SETTINGS };
}

export async function saveToastSettings(
  username: string,
  db: IDBPDatabase<AmpManagerDBSchema>,
  settings: ToastSettings
): Promise<void> {
  await db.put('settings', {
    key: 'toastSettings',
    value: settings,
  });
}
