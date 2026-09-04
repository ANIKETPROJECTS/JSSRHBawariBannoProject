import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube } from "lucide-react";
import storyImage from "@/assets/story.jpg";
import atelierFilm from "@/assets/atelier-film.mp4";

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-royal text-primary-foreground">
      <video
        className="footer-film-media pointer-events-none absolute inset-0 size-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster={storyImage}
        aria-label="Moving textile details from the Bawari Banno atelier"
      >
        <source src={atelierFilm} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/65 to-ink/75" />
      <div className="fabric-texture relative">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-10 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-8 border-b border-primary-foreground/25 pb-10 sm:pb-14">
            <div className="max-w-lg">
              <p className="text-eyebrow text-gold-soft">The house note</p>
              <p className="mt-4 font-display text-4xl leading-[0.95] tracking-tight sm:text-6xl">Made to be remembered.</p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/80">A living archive of Indian textiles, gathered with care and sent from our atelier to yours.</p>
            </div>
            <span className="text-eyebrow text-primary-foreground/70">Bawari Banno · 1974—2026</span>
          </div>
        </div>
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-12 sm:gap-12 sm:px-10 sm:pb-16 md:grid-cols-4">
          <div>
            <p className="font-display text-4xl tracking-tight">Bawari Banno</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-primary-foreground/75">
              Handpicked handloom and heirloom sarees, sourced directly from weaving clusters
              across India since 1974.
            </p>
            <div className="mt-6 flex gap-3">
              {[Instagram, Facebook, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                   className="rounded-full border border-primary-foreground/25 p-2.5 transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <Icon className="size-4" strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-eyebrow text-gold-soft">Explore</p>
            <ul className="mt-5 space-y-3 text-sm text-primary-foreground/80">
              <li>
                <Link to="/products" className="hover:text-gold">
                  All Sarees
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-gold">
                  Our Story
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-gold">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-gold">
                  Wedding Collection
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-eyebrow text-gold-soft">Visit</p>
            <address className="mt-5 space-y-2 text-sm not-italic leading-relaxed text-primary-foreground/80">
              <p>14 Mylapore Silk Street, Chennai 600004</p>
              <p>+91 98400 21774</p>
              <p>care@vastraa.example</p>
            </address>
          </div>

          <div>
            <p className="text-eyebrow text-gold-soft">The Loom Letter</p>
            <p className="mt-5 text-sm text-primary-foreground/75">
              New weaves, revival drops and atelier notes — once a month.
            </p>
            <form
              className="mt-5 flex min-w-0 border-b border-primary-foreground/30 focus-within:border-gold"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="sr-only" htmlFor="newsletter">
                Email address
              </label>
              <input
                id="newsletter"
                type="email"
                placeholder="your@email.com"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-primary-foreground/45"
              />
              <button type="submit" className="shrink-0 text-eyebrow text-gold">
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-primary-foreground/25">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-primary-foreground/65 sm:px-10 sm:py-6">
            <p>© {new Date().getFullYear()} Bawari Banno. All rights reserved.</p>
            <p>Crafted in India · Demo storefront</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
