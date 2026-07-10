import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { User } from "@/firebase/auth";

type AuthStatus = "loading" | "authenticated" | "error";

type AuthContextValue = {
  error: Error | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  retry: () => void;
  status: AuthStatus;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    async function initializeAuth() {
      try {
        setStatus("loading");
        setError(null);

        const { signInAnonymousUser, subscribeToAuthState } =
          await import("@/firebase/auth");

        if (!isActive) {
          return;
        }

        unsubscribe = subscribeToAuthState(
          (nextUser) => {
            if (!isActive) {
              return;
            }

            setUser(nextUser);

            if (nextUser) {
              setStatus("authenticated");
            }
          },
          (authError) => {
            if (!isActive) {
              return;
            }

            setError(authError);
            setStatus("error");
          },
        );

        await signInAnonymousUser();
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError
            : new Error("Authentication failed."),
        );
        setStatus("error");
      }
    }

    void initializeAuth();

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [retryKey]);

  const retry = useCallback(() => {
    setRetryKey((currentRetryKey) => currentRetryKey + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isAuthenticated: status === "authenticated" && Boolean(user),
      isLoading: status === "loading",
      retry,
      status,
      user,
    }),
    [error, retry, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
