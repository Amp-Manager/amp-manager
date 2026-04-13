import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { startKeepalive } from './services/AMPBridge';
import { toast } from '@/utils/toast';
import './index.css';

if (typeof Neutralino !== 'undefined') {
  Neutralino.events.on('serverOffline', () => {
    toast.error('Connection lost. Click to retry.', {
      action: { 
        label: 'Retry', 
        onClick: () => window.location.reload() 
      },
      duration: Infinity
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startKeepalive(30000);
