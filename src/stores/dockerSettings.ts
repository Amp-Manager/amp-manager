import { createPollingSettingsStore } from "./settingsFactory";

export const useDockerSettings = createPollingSettingsStore("docker", false);
