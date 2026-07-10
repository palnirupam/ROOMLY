import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Container } from "@/shared/ui/Container";
import { Skeleton } from "@/shared/ui/Skeleton";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { error, isLoading, retry, status } = useAuth();

  if (isLoading) {
    return (
      <main className="safe-page bg-app-gradient min-h-dvh text-slate-950 dark:text-slate-50">
        <Container className="space-y-6">
          <Skeleton className="h-12 w-40" />
          <Card className="mx-auto max-w-md space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </Card>
        </Container>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="safe-page bg-app-gradient min-h-dvh text-slate-950 dark:text-slate-50">
        <Container>
          <Card className="mx-auto max-w-md text-center">
            <h1 className="text-xl font-semibold">Unable to start Roomly</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {error?.message ?? "Anonymous authentication failed."}
            </p>
            <Button className="mt-6" type="button" onClick={retry}>
              Try again
            </Button>
          </Card>
        </Container>
      </main>
    );
  }

  return children;
}
