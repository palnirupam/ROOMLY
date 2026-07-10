import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";

import { appEnv } from "@/shared/config/env";

const requiredFirebaseConfig = {
  apiKey: appEnv.firebaseApiKey,
  authDomain: appEnv.firebaseAuthDomain,
  projectId: appEnv.firebaseProjectId,
  storageBucket: appEnv.firebaseStorageBucket,
  messagingSenderId: appEnv.firebaseMessagingSenderId,
  appId: appEnv.firebaseAppId,
} as const;

function getMissingConfigKeys() {
  return Object.entries(requiredFirebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function getRequiredConfigValue(
  key: keyof typeof requiredFirebaseConfig,
): string {
  const value = requiredFirebaseConfig[key];

  if (!value) {
    throw new Error(`Missing Firebase environment variable: ${key}`);
  }

  return value;
}

function getFirebaseOptions(): FirebaseOptions {
  const missingConfigKeys = getMissingConfigKeys();

  if (missingConfigKeys.length > 0) {
    throw new Error(
      `Missing Firebase environment variables: ${missingConfigKeys.join(", ")}`,
    );
  }

  return {
    apiKey: getRequiredConfigValue("apiKey"),
    authDomain: getRequiredConfigValue("authDomain"),
    projectId: getRequiredConfigValue("projectId"),
    storageBucket: getRequiredConfigValue("storageBucket"),
    messagingSenderId: getRequiredConfigValue("messagingSenderId"),
    appId: getRequiredConfigValue("appId"),
  };
}

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(getFirebaseOptions());
}
