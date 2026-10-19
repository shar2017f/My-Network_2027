// Client-side Service Worker Registration and Communication

type SyncCallback = () => void;
const syncListeners: SyncCallback[] = [];

export function onServiceWorkerSync(callback: SyncCallback): () => void {
  syncListeners.push(callback);
  return () => {
    const idx = syncListeners.indexOf(callback);
    if (idx !== -1) syncListeners.splice(idx, 1);
  };
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Service Workers cannot be registered inside cross-origin or sandboxed iframes
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    window.self !== window.top
  ) {
    return Promise.resolve(null);
  }

  // Register when window finishes loading to avoid competing with initial rendering
  return new Promise((resolve) => {
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[SW] Service Worker registered successfully with scope:', registration.scope);

          // Listen for background sync messages from SW
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'TRIGGER_CLOUD_SYNC') {
              console.log('[SW] Received TRIGGER_CLOUD_SYNC from service worker');
              syncListeners.forEach((fn) => {
                try {
                  fn();
                } catch (e) {
                  console.error('Sync listener error:', e);
                }
              });
            }
          });

          // Check for SW updates periodically
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[SW] New version available; will activate on reload.');
                  } else {
                    console.log('[SW] Content is cached for offline use.');
                  }
                }
              });
            }
          });

          resolve(registration);
        })
        .catch((error) => {
          console.warn('[SW] Service Worker registration failed:', error);
          resolve(null);
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
    }
  });
}

export function requestBackgroundSync(): void {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((registration) => {
        // @ts-expect-error SyncManager is standard in modern browsers
        return registration.sync?.register('qnet-sync');
      })
      .catch((err) => {
        console.debug('Background sync registration skipped:', err);
      });
  }
}
