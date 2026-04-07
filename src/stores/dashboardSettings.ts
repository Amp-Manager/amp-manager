import { createPollingSettingsStore } from "./settingsFactory";

export const useDashboardSettings = createPollingSettingsStore("dashboard", false);
