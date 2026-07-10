import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Container } from "@/shared/ui/Container";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(error, info);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="safe-page min-h-dvh bg-slate-950 text-slate-50">
        <Container>
          <Card className="mx-auto max-w-md text-center">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-300">
              Refresh the page to start again.
            </p>
            <Button
              className="mt-6"
              type="button"
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </Card>
        </Container>
      </main>
    );
  }
}
