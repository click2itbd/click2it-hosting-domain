import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

let firestoreInstance: any;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  }, (firebaseConfig as any).firestoreDatabaseId);
} catch (err) {
  console.warn('[Firebase] Persistent cache failed, falling back to standard Firestore:', err);
  try {
    firestoreInstance = initializeFirestore(app, {}, (firebaseConfig as any).firestoreDatabaseId);
  } catch (err2) {
    console.warn('[Firebase] Firestore fallback initialization:', err2);
    firestoreInstance = initializeFirestore(app, {});
  }
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

const siteKey = (firebaseConfig as any).appCheck?.siteKey;
const isBrowser = typeof window !== 'undefined';
const isDev = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isRealSiteKey = siteKey && typeof siteKey === 'string' && !siteKey.includes('YOUR_') && !siteKey.includes('RECAPTCHA');

if (isBrowser && isRealSiteKey) {
  if (isDev) {
    try {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      console.warn('App Check init skipped:', e);
    }
  } else {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      console.warn('App Check init skipped:', e);
    }
  }
}

export { app };
export { firebaseConfig };
