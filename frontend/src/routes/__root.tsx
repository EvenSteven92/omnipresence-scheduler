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
        <h1 className="display-mono text-7xl text-foreground">404</h1>
        <p className="label-mono mt-4">Route not found</p>
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
        <p className="label-mono">Runtime error</p>
        <h1 className="mt-2 text-lg text-foreground">{error.message}</h1>
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
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap",
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
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
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
        <div className="flex h-screen flex-col bg-background text-foreground">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <Sidebar />
            <main className="min-h-0 flex-1 overflow-y-auto pb-14 md:pb-0">
              <Outlet />
            </main>
          </div>
        </div>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}
