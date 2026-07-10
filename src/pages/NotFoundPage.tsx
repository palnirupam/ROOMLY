import { Link } from "react-router";

import { PageTransition } from "@/shared/ui/PageTransition";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Container } from "@/shared/ui/Container";
import { Header } from "@/shared/ui/Header";

export function NotFoundPage() {
  return (
    <PageTransition>
      <main className="safe-page bg-app-gradient min-h-dvh text-slate-950 dark:text-slate-50">
        <Container className="flex min-h-[calc(100dvh-2.5rem)] flex-col gap-8 sm:min-h-[calc(100dvh-4rem)]">
          <Header />

          <section className="mx-auto flex w-full max-w-md flex-1 items-center">
            <Card className="w-full text-center">
              <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                404
              </p>
              <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                This Roomly page does not exist.
              </p>
              <Button className="mt-6" asChild>
                <Link to="/join">Back to Join</Link>
              </Button>
            </Card>
          </section>
        </Container>
      </main>
    </PageTransition>
  );
}
