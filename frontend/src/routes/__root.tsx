import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Sidebar } from "@/components/Sidebar";
import { BrandTheme } from "@/components/BrandTheme";
import { WorkspaceProvider } from "@/lib/workspace-context";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-body-sm text-muted-foreground">Route not found</p>
        <Link
          to="/"
          className="btn-action-primary btn-action mt-6"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="page-kicker">Runtime error</p>
        <h1 className="mt-2 font-display text-lg font-bold text-foreground">{error.message}</h1>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="btn-action-primary btn-action mt-6"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "OmniSocial — TORCC" },
      {
        name: "description",
        content: "Schedule, publish, and analyze social content across every platform.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="h-full overflow-hidden">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <BrandTheme />
        {/*
          App shell scroll contract:
          - Outer shell is 100dvh and does not scroll (avoids double-scroll / mobile chrome bugs)
          - <main> is the ONLY page scrollport for normal routes
          - Full-height tools (composer) fill main and scroll inside their panes
        */}
        <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <Sidebar />
            <main
              id="app-scroll"
              data-testid="app-scroll"
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pb-16 md:pb-0 [-webkit-overflow-scrolling:touch]"
            >
              <Outlet />
            </main>
          </div>
        </div>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}
