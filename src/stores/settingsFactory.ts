import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PollingSettingsState {
  live: boolean;
  interval: number;
  setLive: (live: boolean) => void;
  setInterval: (interval: number) => void;
}

export const createPollingSettingsStore = (name: string, defaultLive: boolean = false, defaultInterval: number = 60000) => {
  return create<PollingSettingsState>()(
    persist(
      (set) => ({
        live: defaultLive,
        interval: defaultInterval,
        setLive: (live) => set({ live }),
        setInterval: (interval) => set({ interval }),
      }),
      {
        name: `${name}-settings`,
      }
    )
  );
};
