import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  type Auth,
  type Unsubscribe,
  type User,
} from "firebase/auth";

import { getFirebaseApp } from "@/firebase/config";

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  authInstance ??= getAuth(getFirebaseApp());
  return authInstance;
}

export async function signInAnonymousUser(): Promise<User> {
  const auth = getFirebaseAuth();

  await setPersistence(auth, browserLocalPersistence);

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

export function subscribeToAuthState(
  onUserChange: (user: User | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), onUserChange, onError);
}

export type { User };
