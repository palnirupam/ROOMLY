import { Container } from "@/shared/ui/Container";
import { Skeleton } from "@/shared/ui/Skeleton";

export function RouteFallback() {
  return (
    <main className="safe-page bg-app-gradient min-h-dvh text-slate-950 dark:text-slate-50">
      <Container className="space-y-6">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </Container>
    </main>
  );
}
