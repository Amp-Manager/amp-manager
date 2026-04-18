import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { startKeepalive, ampBridge } from './services/AMPBridge';
import { updateInstanceInfo, loadConfigJSON, setCurrentUser } from './lib/db';
import './index.css';

console.log('[AMP] Application starting...');

async function initializeApp() {
  // Load existing config for lastUser
  const existingConfig = await loadConfigJSON() || {};
  const lastUser = existingConfig.lastUser || null;
  
  // Restore current user from last session (if exists)
  if (lastUser) {
    setCurrentUser(lastUser);
  }
  
  // Generate instance ID
  const instanceId = `amp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  // Get PID and port from Neutralino globals (available on app startup)
  const pid = typeof window !== 'undefined' ? ((window as any).NL_PID || '0') : '0';
  const port = typeof window !== 'undefined' ? ((window as any).NL_PORT || 0) : 0;
  const launchedAt = Date.now();
  
  try {
    await updateInstanceInfo(instanceId, pid, port, launchedAt);
    console.log('[AMP] Instance info saved:', { instanceId, pid, port, launchedAt, lastUser });
  } catch (e) {
    console.error('[AMP] Failed to save instance info:', e);
  }
  
  // Spawn watchdog (runs in background, monitors for zombie state)
  ampBridge.spawnWatchdog();
}

let isReconnecting = false;

if (typeof window !== 'undefined' && window.Neutralino?.events) {
  console.log('[AMP] Neutralino events available, setting up serverOffline handler');
  
  window.Neutralino.events.on('serverOffline', () => {
    console.error('[AMP] serverOffline event fired - backend became unresponsive');
    if (!isReconnecting) {
      isReconnecting = true;
      window.location.href = '/';
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

console.log('[AMP] Starting keepalive with 30s interval');
startKeepalive(30000);

// Initialize app (spawn watchdog after config is ready)
initializeApp().catch(e => console.error('[AMP] Init error:', e));
