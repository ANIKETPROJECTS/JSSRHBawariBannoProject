import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 bg-royal text-primary-foreground">
      <div className="fabric-texture">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-4">
          <div>
            <p className="font-display text-3xl">Vastraa</p>
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
                  className="rounded-full border border-primary-foreground/25 p-2.5 transition-colors hover:border-gold hover:text-gold"
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
              className="mt-5 flex border-b border-primary-foreground/30 focus-within:border-gold"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="sr-only" htmlFor="newsletter">
                Email address
              </label>
              <input
                id="newsletter"
                type="email"
                placeholder="your@email.com"
                className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-primary-foreground/45"
              />
              <button type="submit" className="text-eyebrow text-gold">
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-primary-foreground/15">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-primary-foreground/60">
            <p>© {new Date().getFullYear()} Vastraa Saree Atelier. All rights reserved.</p>
            <p>Crafted in India · Demo storefront</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
