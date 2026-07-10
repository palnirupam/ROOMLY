import { getFirestore, type Firestore } from "firebase/firestore";

import { getFirebaseApp } from "@/firebase/config";

let firestoreInstance: Firestore | null = null;

export function getFirebaseFirestore(): Firestore {
  firestoreInstance ??= getFirestore(getFirebaseApp());
  return firestoreInstance;
}
