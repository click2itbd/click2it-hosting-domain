import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

let firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForBuildAndProductionFallback",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-studio-422fbad2-d827-4e69-8599-aed85390d277.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-studio-422fbad2-d827-4e69-8599-aed85390d277",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-studio-422fbad2-d827-4e69-8599-aed85390d277.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "593966307838",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:593966307838:web:click2itbd",
  firestoreDatabaseId: "(default)"
};

try {
  // Dynamically load firebase-applet-config.json if present
  const modules = import.meta.glob('../firebase-applet-config.json', { eager: true });
  const configModule: any = Object.values(modules)[0];
  if (configModule?.default) {
    firebaseConfig = { ...firebaseConfig, ...configModule.default };
  }
} catch (e) {
  // Fall back to environment config
}

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
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn('App Check init skipped:', e);
  }
}

export { app };
export { firebaseConfig };
