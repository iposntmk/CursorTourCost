import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

export const firebaseConfig = {
  apiKey: 'AIzaSyBUUPig4WhKaiQSqv-3TUDUsPK1sDFUQVc',
  authDomain: 'quantum-ratio-468010-d4.firebaseapp.com',
  projectId: 'quantum-ratio-468010-d4',
  storageBucket: 'quantum-ratio-468010-d4.firebasestorage.app',
  messagingSenderId: '47637327464',
  appId: '1:47637327464:web:5d3d195fbb79d0227f55dd',
  measurementId: 'G-MDTCMXW070',
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const functions = getFunctions(app);

export const getFirebaseConsoleUrl = (section: string = 'overview') =>
  `https://console.firebase.google.com/u/0/project/${firebaseConfig.projectId}/${section}`;

if (import.meta.env.DEV && typeof window !== 'undefined') {
  const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
  if (useEmulators) {
    connectFirestoreEmulator(db, '127.0.0.1', Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT) || 8080);
    connectFunctionsEmulator(functions, '127.0.0.1', Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT) || 5001);
  }
}

export const initAnalytics = async () => {
  if (typeof window === 'undefined') return null;
  if (!(await isAnalyticsSupported())) return null;
  return getAnalytics(app);
};
