import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

import { registerServiceWorker } from './services/serviceWorkerRegistration';

// Register Service Worker for offline browsing and seamless operations sync
registerServiceWorker().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
