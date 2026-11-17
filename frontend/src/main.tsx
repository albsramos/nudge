import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { startReminderClock } from '@/features/notes';
import './index.css';
import { App } from './app/App';

// Runs once at startup, outside React: the offline-capable service worker and the in-app reminder clock.
registerSW({ immediate: true });
startReminderClock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
