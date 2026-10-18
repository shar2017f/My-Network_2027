// PWA Service Worker Registration - Safe Stub
// Prevents registration loops and HTML parse errors in development and preview
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  location.protocol === 'https:' &&
  !location.hostname.includes('localhost') &&
  !location.hostname.includes('127.0.0.1')
) {
  window.addEventListener('load', () => {
    fetch('/sw.js', { method: 'HEAD' })
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('javascript')) {
          navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
            console.debug('ServiceWorker registration deferred:', err);
          });
        }
      })
      .catch(() => {});
  });
}
