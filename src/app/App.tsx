import { RouterProvider } from "react-router";

import { AppErrorBoundary } from "@/app/error/AppErrorBoundary";
import { router } from "@/app/router";
import { ThemeProvider } from "@/app/theme/ThemeProvider";
import { AuthGate } from "@/features/auth/AuthGate";
import { AuthProvider } from "@/features/auth/AuthContext";

export function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AuthGate>
            <RouterProvider router={router} />
          </AuthGate>
        </AuthProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
