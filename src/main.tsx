import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { startKeepalive } from './services/AMPBridge';
import './index.css';

console.log('[AMP] Application starting...');

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
