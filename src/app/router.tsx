import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";

import { RouteFallback } from "@/app/routes/RouteFallback";
import { RouteError } from "@/app/routes/RouteError";

const JoinPage = lazy(() =>
  import("@/pages/JoinPage").then((module) => ({
    default: module.JoinPage,
  })),
);

const ChatPage = lazy(() =>
  import("@/pages/ChatPage").then((module) => ({
    default: module.ChatPage,
  })),
);

const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);

function lazyRoute(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        path: "/",
        element: <Navigate to="/join" replace />,
      },
      {
        path: "/join",
        element: lazyRoute(<JoinPage />),
      },
      {
        path: "/room/:roomCode",
        element: lazyRoute(<ChatPage />),
      },
      {
        path: "*",
        element: lazyRoute(<NotFoundPage />),
      },
    ],
  },
]);
