import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App safely (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with auto-detect long polling so it works smoothly in mobile iframes,
// cross-origin preview frames, and networks where streaming WebSockets are blocked.
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
})();

// Initialize Auth with graceful fallback for iframe environments where third-party cookies or storage might be restricted
export const auth = (() => {
  try {
    return getAuth(app);
  } catch (err) {
    console.warn('Firebase Auth safe mode in iframe:', err);
    return null as any;
  }
})();

// Test Firestore connection on boot with timeout protection to prevent UI hanging
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const fetchDoc = getDoc(doc(db, 'system_data', 'network_state'));
    const timeout = new Promise<{ exists: () => boolean }>((resolve) =>
      setTimeout(() => resolve({ exists: () => false }), 3000)
    );
    const snap = await Promise.race([fetchDoc, timeout]);
    const isOk = snap.exists();
    if (isOk) {
      console.log('[Firestore] Connected successfully in iframe preview environment.');
    }
    return isOk;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Client is offline or partitioned in iframe preview.');
    } else {
      console.log('[Firestore] Connection initialized with local cache fallback:', error);
    }
    return false;
  }
}
