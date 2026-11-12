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
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          memoryStorage.set(key, val);
          return val;
        }
      }
    } catch {
      // Fallback
    }
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const sessionVal = window.sessionStorage.getItem(key);
        if (sessionVal !== null) {
          memoryStorage.set(key, sessionVal);
          return sessionVal;
        }
      }
    } catch {
      // Fallback
    }
    return memoryStorage.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    memoryStorage.set(key, value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore quota or security errors in iframe
    }
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
      }
    } catch {
      // Fallback
    }
  },

  removeItem(key: string): void {
    memoryStorage.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  },

  clearWithPrefix(prefix: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith(prefix)) {
            window.localStorage.removeItem(key);
          }
        });
      }
    } catch {
      // Ignore
    }
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        Object.keys(window.sessionStorage).forEach((key) => {
          if (key.startsWith(prefix)) {
            window.sessionStorage.removeItem(key);
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

// Session keys for distributor persistent lock
export const ROLE_SESSION_KEY = 'QAZAN_NET_ACTIVE_ROLE';
export const DISTRIBUTOR_LOCK_KEY = 'QAZAN_NET_DISTRIBUTOR_SESSION_LOCKED';

export const getPersistentRole = (): 'admin' | 'distributor' | null => {
  try {
    if (typeof window !== 'undefined') {
      const direct = window.localStorage?.getItem(ROLE_SESSION_KEY);
      if (direct === 'distributor' || direct === 'admin') return direct;
      const isLocked = window.localStorage?.getItem(DISTRIBUTOR_LOCK_KEY);
      if (isLocked === 'true') return 'distributor';
    }
  } catch {}
  const saved = safeStorage.getItem(ROLE_SESSION_KEY) || safeStorage.getItem('QAZAN_NET_V2_role');
  if (saved === 'distributor' || saved === 'admin') return saved;
  return null;
};

export const setPersistentRole = (role: 'admin' | 'distributor'): void => {
  safeStorage.setItem(ROLE_SESSION_KEY, role);
  safeStorage.setItem('QAZAN_NET_V2_role', role);
  if (role === 'distributor') {
    safeStorage.setItem(DISTRIBUTOR_LOCK_KEY, 'true');
  } else {
    safeStorage.removeItem(DISTRIBUTOR_LOCK_KEY);
  }
};

export const clearPersistentRole = (): void => {
  safeStorage.removeItem(ROLE_SESSION_KEY);
  safeStorage.removeItem('QAZAN_NET_V2_role');
  safeStorage.removeItem(DISTRIBUTOR_LOCK_KEY);
  safeStorage.removeItem('QAZAN_ACTIVE_SESSION');
};

