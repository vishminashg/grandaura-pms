import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import fallbackConfig from '../../firebase-applet-config.json';

// Firebase config resolution:
// - In production (Netlify, etc.) the real values come from Vite env vars
//   (VITE_FIREBASE_*) set in the hosting dashboard — see .env.example.
// - If those aren't present (e.g. running inside AI Studio, or a fresh
//   local checkout with no .env yet), we fall back to the committed
//   firebase-applet-config.json so the app still runs out of the box.
const usingEnvConfig = !!import.meta.env.VITE_FIREBASE_API_KEY;

function resolveFirebaseConfig() {
  if (usingEnvConfig) {
    const env = import.meta.env;
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    };
  }
  return fallbackConfig;
}

const firebaseConfig = resolveFirebaseConfig();

// Only fall back to the JSON file's database ID when we're ALSO using the
// JSON file's project config. If env vars are driving a different Firebase
// project, defaulting to the JSON file's database ID would point auth at
// one project and Firestore at another's (nonexistent) database.
const firestoreDatabaseId =
  import.meta.env.VITE_FIREBASE_FIRESTORE_DB_ID ||
  (usingEnvConfig ? '(default)' : (fallbackConfig as any).firestoreDatabaseId) ||
  '(default)';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);

// Secondary, isolated Firebase app instance used ONLY when an admin creates
// a new staff account from inside the app. Firebase Auth's
// createUserWithEmailAndPassword always signs the newly-created user into
// whichever app instance made the call — running it on a separate instance
// keeps the acting admin signed into the primary app the whole time.
export function getSecondaryAuth() {
  const SECONDARY_APP_NAME = 'staff-provisioning';
  const existing = getApps().find((a) => a.name === SECONDARY_APP_NAME);
  const secondaryApp = existing || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  return getAuth(secondaryApp);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || 'system_guest',
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Optional validation probe as requested by the Firebase skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'settings', 'general'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase network notice:', error.message);
    }
  }
}