// Safe storage wrapper that works seamlessly in restricted cross-origin iframes,
// mobile sandboxed environments, and private browsing modes without throwing SecurityError.

const memoryStorage = new Map<string, string>();

let isLocalStorageAvailable = false;
try {
  if (typeof window !== 'undefined' && 'localStorage' in window) {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    isLocalStorageAvailable = window.localStorage.getItem(testKey) === testKey;
    window.localStorage.removeItem(testKey);
  }
} catch {
  isLocalStorageAvailable = false;
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (isLocalStorageAvailable) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Fallback to memory storage
    }
    return memoryStorage.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    try {
      if (isLocalStorageAvailable) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore quota or security errors in iframe
    }
    memoryStorage.set(key, value);
  },

  removeItem(key: string): void {
    try {
      if (isLocalStorageAvailable) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
    memoryStorage.delete(key);
  },

  clearWithPrefix(prefix: string): void {
    try {
      if (isLocalStorageAvailable) {
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith(prefix)) {
            window.localStorage.removeItem(key);
          }
        });
      }
    } catch {
      // Ignore
    }
    for (const key of memoryStorage.keys()) {
      if (key.startsWith(prefix)) {
        memoryStorage.delete(key);
      }
    }
  },
};
