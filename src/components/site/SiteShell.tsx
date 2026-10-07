import { useEffect, useState, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import whatsappIcon from "../../../attached_assets/apple_1787301622693.png";

export function SiteShell({ children }: { children: ReactNode }) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setShowBackToTop(window.scrollY > 320);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <div className="flex min-h-screen min-w-0 w-full flex-col overflow-x-clip bg-background">
      <Header />
      <main className="min-w-0 flex-1">{children}</main>
      {showBackToTop && (
        <button
          type="button"
          aria-label="Back to top"
          title="Back to top"
          onClick={() => {
            const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
          }}
          className="fixed bottom-[4.75rem] right-3 z-40 flex size-10 items-center justify-center rounded-full bg-primary text-white shadow-md transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowUp aria-hidden="true" className="size-4" />
        </button>
      )}
      <a
        href="https://wa.me/918459769859"
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
    <div className="section-frame mx-2 fabric-texture sm:mx-3">
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
