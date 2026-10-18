import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { validateFirebaseEnvironment, testFirestoreConnection, FirebaseValidationResult } from './utils/firebaseValidation';

let firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB_STUjdz0fPcYAk0JWz59SiMyJ-WKwCuw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0990631330.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0990631330",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0990631330.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "746698279074",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:746698279074:web:bdbcfb3f791029b9006ffb",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-422fbad2-d827-4e69-8599-aed85390d277"
};

try {
  // Dynamically load firebase-applet-config.json if present
  const modules = import.meta.glob('../firebase-applet-config.json', { eager: true });
  const configModule: any = Object.values(modules)[0];
  if (configModule?.default) {
    firebaseConfig = { ...firebaseConfig, ...configModule.default };
  }
} catch {
  // Fall back to environment config
}

// Run environment validation script immediately at initialization
export const firebaseValidationResult: FirebaseValidationResult = validateFirebaseEnvironment(firebaseConfig);

const app = initializeApp(firebaseConfig);

const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

let firestoreInstance: any;
try {
  firestoreInstance = dbId
    ? initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }, dbId)
    : initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch {
  try {
    firestoreInstance = dbId
      ? initializeFirestore(app, {}, dbId)
      : initializeFirestore(app, {});
  } catch {
    firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

const siteKey = (firebaseConfig as any).appCheck?.siteKey;
const isBrowser = typeof window !== 'undefined';
const isRealSiteKey = siteKey && typeof siteKey === 'string' && !siteKey.includes('YOUR_') && !siteKey.includes('RECAPTCHA');

if (isBrowser) {
  if (isRealSiteKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      console.warn('App Check init skipped:', e);
    }
  }

  // Asynchronously test Firestore connection upon boot
  setTimeout(() => {
    testFirestoreConnection(db).then((connected) => {
      firebaseValidationResult.testedFirestore = true;
      firebaseValidationResult.firestoreConnected = connected;
    });
  }, 1000);
}

export { app };
export { firebaseConfig };
