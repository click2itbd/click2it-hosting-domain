import { doc, getDocFromServer } from 'firebase/firestore';

export interface FirebaseValidationResult {
  isValid: boolean;
  isDummyApiKey: boolean;
  missingKeys: string[];
  warnings: string[];
  errors: string[];
  currentOrigin: string;
  isProductionOrigin: boolean;
  testedFirestore: boolean;
  firestoreConnected: boolean;
}

export function validateFirebaseEnvironment(config: Record<string, any>): FirebaseValidationResult {
  const missingKeys: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const isBrowser = typeof window !== 'undefined';
  const currentOrigin = isBrowser ? window.location.origin : 'SSR/Node';
  const hostname = isBrowser ? window.location.hostname : '';

  const isProductionOrigin =
    hostname === 'click2it.bd' ||
    hostname === 'www.click2it.bd' ||
    hostname.endsWith('.click2itbd.com') ||
    hostname === 'click2itbd.com';

  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  for (const field of requiredFields) {
    if (!config[field] || typeof config[field] !== 'string' || config[field].trim() === '') {
      missingKeys.push(field);
    }
  }

  const isDummyApiKey =
    !config.apiKey ||
    config.apiKey.includes('DummyKey') ||
    config.apiKey.includes('YOUR_') ||
    config.apiKey.includes('PLACEHOLDER');

  if (missingKeys.length > 0) {
    errors.push(`Missing required Firebase config variables: ${missingKeys.join(', ')}`);
  }

  if (isDummyApiKey) {
    if (isProductionOrigin) {
      errors.push(
        `Critical: The application is running on production origin (${hostname}), but using fallback dummy VITE_FIREBASE_API_KEY. Authentication and Firestore will be restricted.`
      );
    } else {
      warnings.push(
        `VITE_FIREBASE_API_KEY is not configured with a real key. Using local/preview dummy fallback.`
      );
    }
  }

  if (config.authDomain && isProductionOrigin) {
    // Check if authDomain matches expectations or if cross-domain auth needs Console config
    if (!config.authDomain.includes('firebaseapp.com') && !config.authDomain.includes(hostname)) {
      warnings.push(
        `Current origin (${hostname}) differs from Firebase authDomain (${config.authDomain}). Ensure "${hostname}" is added to Authorized Domains in Firebase Console.`
      );
    }
  }

  const isValid = errors.length === 0 && !isDummyApiKey;

  // Print diagnostic log
  if (errors.length > 0) {
    console.error('🔥 [Firebase Validation Error]', {
      origin: currentOrigin,
      hostname,
      errors,
      warnings,
      configSummary: {
        projectId: config.projectId,
        authDomain: config.authDomain,
        hasApiKey: !!config.apiKey && !isDummyApiKey,
      },
    });
  } else if (warnings.length > 0) {
    console.warn('🔥 [Firebase Validation Warning]', {
      origin: currentOrigin,
      warnings,
      configSummary: {
        projectId: config.projectId,
        authDomain: config.authDomain,
      },
    });
  } else {
    console.log('✅ [Firebase Validation] Environment configuration is valid for origin:', currentOrigin);
  }

  return {
    isValid,
    isDummyApiKey,
    missingKeys,
    warnings,
    errors,
    currentOrigin,
    isProductionOrigin,
    testedFirestore: false,
    firestoreConnected: false,
  };
}

export async function testFirestoreConnection(dbInstance: any): Promise<boolean> {
  if (typeof window === 'undefined' || !dbInstance) return false;
  try {
    // Check connection using an allowed public read collection
    const testDocRef = doc(dbInstance, 'dynamic_pages', '_connection_check');
    await getDocFromServer(testDocRef);
    console.log('✅ [Firebase Validation] Firestore connection test succeeded.');
    return true;
  } catch (error: any) {
    const msg = error?.message || String(error);
    // If the doc doesn't exist, getDocFromServer still succeeds and establishes network connection.
    // If it's an offline or network error, log appropriately.
    if (msg.includes('offline') || msg.includes('unavailable') || msg.includes('Failed to get document')) {
      console.warn('⚠️ [Firebase Validation] Firestore is unreachable or offline:', msg);
      return false;
    } else if (msg.includes('permission-denied') || msg.includes('Permission Denied') || msg.includes('insufficient permissions')) {
      // If permission is denied for health-check, consider client connected to Firebase servers
      console.info('ℹ️ [Firebase Validation] Firestore is connected (authenticated / rules enforced).');
      return true;
    } else {
      console.warn('⚠️ [Firebase Validation] Firestore connection check message:', msg);
      return false;
    }
  }
}
