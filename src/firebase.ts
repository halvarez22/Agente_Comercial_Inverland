/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App — override via VITE_* env when deploying against inverland-portal
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env || {};

const app = initializeApp({
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: viteEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
});

const databaseId = viteEnv.VITE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

// Initialize Firestore with Long Polling to prevent WebChannel 400 transport errors
export const db =
  databaseId && databaseId !== '(default)'
    ? initializeFirestore(app, { experimentalForceLongPolling: true }, databaseId)
    : initializeFirestore(app, { experimentalForceLongPolling: true });

export default app;
