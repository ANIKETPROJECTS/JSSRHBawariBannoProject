import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import logoImage from "../../attached_assets/Bawari_Banno_Horizontal_Transparent-01_1789242095079.png";
import comingSoonLogoImage from "../../attached_assets/Full_Final-01_1792488092202.png";
import { CartProvider } from "@/components/site/CartDrawer";
import { CustomerAuthProvider } from "@/components/site/CustomerAuthContext";
import { ReviewsProvider } from "@/components/site/ReviewsContext";
import { WishlistProvider } from "@/components/site/WishlistContext";
import { Toaster } from "@/components/ui/sonner";

// Temporary launch switch: set to false to restore the regular storefront and Admin UI.
const COMING_SOON_MODE = true;

function ComingSoonPage() {
  return (
    <main
      aria-labelledby="coming-soon-title"
      className="flex min-h-screen w-full flex-col items-center justify-center bg-[#ED145B] px-6 text-center text-white"
    >
      <img
        src={comingSoonLogoImage}
        alt="Bawari Banno"
        className="mb-8 size-48 max-w-[72vw] object-contain"
      />
      <div aria-hidden="true" className="mb-7 h-px w-16 bg-[#D4B16A]" />
      <h1 id="coming-soon-title" className="font-display text-4xl font-medium sm:text-5xl">
        Coming Soon
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-white/90 sm:text-lg">
        We’re getting things ready. Please check back soon.
      </p>
      <a
        href="https://wa.me/919167599635"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp at 9167599635"
        className="mt-6 text-sm text-white underline decoration-white/70 underline-offset-4 transition-colors hover:text-white/80 sm:text-base"
      >
        Visit us on WhatsApp · 9167599635
      </a>
    </main>
  );
}

function NotFoundComponent() {
  if (COMING_SOON_MODE) return <ComingSoonPage />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  if (COMING_SOON_MODE) return <ComingSoonPage />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: logoImage, type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: COMING_SOON_MODE ? ComingSoonPage : NotFoundComponent,
  errorComponent: COMING_SOON_MODE ? ComingSoonPage : ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
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

  if (COMING_SOON_MODE) return <ComingSoonPage />;

  return (
    <QueryClientProvider client={queryClient}>
      <CustomerAuthProvider>
        <ReviewsProvider>
          <WishlistProvider>
            <CartProvider>
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
            </CartProvider>
          </WishlistProvider>
        </ReviewsProvider>
      </CustomerAuthProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
