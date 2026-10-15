import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCyAQx8_sZZQCIhrXCeLF8ppFycMFvmGJI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'nagaryojana-ef7e6.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'nagaryojana-ef7e6',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'nagaryojana-ef7e6.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '507801620069',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:507801620069:web:62d7bc90b5d66c7da0008c',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-866XJR6LZK',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
