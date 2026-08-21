import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import whatsappIcon from "../../../attached_assets/apple_1787301622693.png";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
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
      <div className="mx-auto max-w-7xl px-5 py-14">
        <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-3 font-display text-5xl text-primary md:text-6xl">{title}</h1>
        {intro && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {intro}
          </p>
        )}
      </div>
    </div>
  );
}
