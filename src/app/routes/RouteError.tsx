import { isRouteErrorResponse, useRouteError } from "react-router";

import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Container } from "@/shared/ui/Container";

export function RouteError() {
  const error = useRouteError();
  const title = isRouteErrorResponse(error)
    ? `${String(error.status)} ${error.statusText}`
    : "Unable to load this page";

  return (
    <main className="safe-page min-h-dvh bg-slate-950 text-slate-50">
      <Container>
        <Card className="mx-auto max-w-md text-center">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm text-slate-300">
            Try returning to the join screen.
          </p>
          <Button className="mt-6" asChild>
            <a href="/join">Go to Join</a>
          </Button>
        </Card>
      </Container>
    </main>
  );
}
