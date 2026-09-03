import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartProvider } from "./CartDrawer";
import { WishlistProvider } from "./WishlistContext";
import { ReviewsProvider } from "./ReviewsContext";
import { CustomerAuthProvider } from "./CustomerAuthContext";
import whatsappIcon from "../../../attached_assets/apple_1787301622693.png";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <CustomerAuthProvider>
      <ReviewsProvider>
        <WishlistProvider>
          <CartProvider>
            <div className="flex min-h-screen min-w-0 w-full flex-col overflow-x-clip bg-background">
              <Header />
              <main className="min-w-0 flex-1">{children}</main>
              <a
                href="https://wa.me/919619523254"
                target="_blank"
                rel="noreferrer"
                aria-label="Chat with us on WhatsApp"
                title="Chat with us on WhatsApp"
                className="fixed bottom-3 right-3 z-50 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <img src={whatsappIcon} alt="" className="size-14 object-contain" />
              </a>
              <Footer />
            </div>
          </CartProvider>
        </WishlistProvider>
      </ReviewsProvider>
    </CustomerAuthProvider>
  );
}

export function PageHeading({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <div className="border-b border-border fabric-texture">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-14">
        <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-3 break-words font-display text-4xl text-primary sm:text-5xl md:text-6xl">{title}</h1>
        {intro && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {intro}
          </p>
        )}
      </div>
    </div>
  );
}
