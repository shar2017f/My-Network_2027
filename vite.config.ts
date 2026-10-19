import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

function preventReloadPlugin(): Plugin {
  return {
    name: 'prevent-vite-reload-loop',
    enforce: 'pre',
    transform(code, id) {
      if (
        id.includes('bundledDevClient.mjs') ||
        id.includes('client.mjs') ||
        id.endsWith('/@vite/client')
      ) {
        return {
          code: code
            .replace(/location\.reload\(\);/g, 'console.warn("[vite] reload suppressed.");')
            .replace(/pageReload\(\);/g, 'console.warn("[vite] pageReload suppressed.");'),
          map: null,
        };
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'script',
            injectTo: 'head-prepend',
            children: `
(function() {
  if (typeof window === 'undefined') return;
  var NativeWS = window.WebSocket;
  if (!NativeWS) return;
  function MockViteWS(url, protocols) {
    var isHmr = false;
    if (typeof url === 'string' && (url.indexOf('token=') !== -1 || url.indexOf('vite-hmr') !== -1)) {
      isHmr = true;
    }
    if (typeof protocols === 'string' && protocols.indexOf('vite-hmr') !== -1) {
      isHmr = true;
    }
    if (Array.isArray(protocols) && protocols.indexOf('vite-hmr') !== -1) {
      isHmr = true;
    }
    if (!isHmr) {
      return new NativeWS(url, protocols);
    }
    this.url = url;
    this.readyState = 1;
    this.protocol = 'vite-hmr';
    this.bufferedAmount = 0;
    this.extensions = '';
    this.binaryType = 'blob';
    var listeners = {};
    this.addEventListener = function(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    };
    this.removeEventListener = function(type, fn) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter(function(l) { return l !== fn; });
      }
    };
    this.dispatchEvent = function(evt) {
      var arr = listeners[evt.type] || [];
      for (var i = 0; i < arr.length; i++) {
        try { arr[i].call(this, evt); } catch (e) {}
      }
      var onFn = this['on' + evt.type];
      if (typeof onFn === 'function') {
        try { onFn.call(this, evt); } catch (e) {}
      }
    };
    var self = this;
    setTimeout(function() {
      self.dispatchEvent(new Event('open'));
      self.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'connected' }) }));
    }, 5);
    this.send = function() {};
    this.close = function() {};
  }
  MockViteWS.prototype = NativeWS.prototype;
  MockViteWS.CONNECTING = 0;
  MockViteWS.OPEN = 1;
  MockViteWS.CLOSING = 2;
  MockViteWS.CLOSED = 3;
  window.WebSocket = MockViteWS;
})();
`,
          },
        ];
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      preventReloadPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'قعزان نت - نظام إدارة ومحاسبة شبكة الكروت',
          short_name: 'قعزان نت',
          description: 'نظام إدارة ومحاسبة شبكة كروت الإنترنت قعزان نت للمسؤول والموزع الميداني',
          theme_color: '#0f172a',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
      hmr: false,
      watch: null,
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
    },
  };
});
