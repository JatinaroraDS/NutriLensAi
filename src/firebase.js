/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signIn = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    throw error;
  }
};
export const signOutUser = () => auth.signOut();

/**
 * Validate connection to Firestore as per instructions.
 */
async function testConnection() {
  try {
    // Attempt to read a dummy document to verify connectivity
    await getDocFromServer(doc(db, 'system', 'health'));
    console.log("Firebase connection established.");
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('permission'))) {
      console.warn("Firestore connection check: Expected behavior or offline.");
    }
  }
}
testConnection();
