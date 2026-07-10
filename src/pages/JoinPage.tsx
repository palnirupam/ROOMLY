import { useSearchParams } from "react-router";
import { JoinRoomForm } from "@/features/rooms/JoinRoomForm";
import { PageTransition } from "@/shared/ui/PageTransition";
import { Card } from "@/shared/ui/Card";
import { Container } from "@/shared/ui/Container";
import { Header } from "@/shared/ui/Header";

export function JoinPage() {
  const [searchParams] = useSearchParams();
  const initialRoomCode = searchParams.get("code") ?? undefined;

  return (
    <PageTransition>
      <main className="safe-page bg-app-gradient min-h-dvh text-slate-950 dark:text-slate-50">
        <Container className="flex min-h-[calc(100dvh-2.5rem)] flex-col justify-between gap-8 sm:min-h-[calc(100dvh-4rem)]">
          <Header />

          <section className="mx-auto flex w-full max-w-md flex-1 items-center">
            <Card className="w-full">
              <div className="space-y-2">
                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                  Anonymous room chat
                </p>
                <h1 className="text-3xl font-semibold tracking-normal text-slate-950 dark:text-white">
                  Join Roomly
                </h1>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Create a new room or join an existing one.
                </p>
              </div>

              <JoinRoomForm {...(initialRoomCode ? { initialRoomCode } : {})} />
            </Card>
          </section>
        </Container>
      </main>
    </PageTransition>
  );
}
