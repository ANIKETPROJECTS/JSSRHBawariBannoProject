import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import cartIcon from "../../../attached_assets/shopping-bag_(1)_1787301302642.png";
import profileIcon from "../../../attached_assets/user_(3)_1787301305424.png";
import searchIcon from "../../../attached_assets/search_(1)_1787301344357.png";

const nav = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Categories" },
  { to: "/products", label: "New Arrival" },
  { to: "/products", label: "Trending" },
  { to: "/products", label: "Bestseller" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact Us" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-3xl leading-none tracking-tight text-primary">
            Bawari Banno
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            item.label === "Categories" ? (
              <details key={`${item.label}-${item.to}`} className="group relative">
                <summary className="list-none cursor-pointer py-1 text-base tracking-wide text-foreground/80 transition-colors hover:text-primary">
                  Categories <span className="ml-1 text-[0.65rem]">⌄</span>
                </summary>
                <div className="absolute left-1/2 top-full z-50 mt-3 w-48 -translate-x-1/2 border border-border bg-background p-2 shadow-xl">
                  {[
                    { label: "Silk Sarees", href: "/products" },
                    { label: "Cotton Sarees", href: "/products" },
                    { label: "Designer Sarees", href: "/products" },
                    { label: "Wedding Collection", href: "/products" },
                  ].map((category) => (
                    <Link
                      key={category.label}
                      to={category.href}
                      className="block px-3 py-2.5 text-base text-foreground/80 transition-colors hover:bg-secondary hover:text-primary"
                    >
                      {category.label}
                    </Link>
                  ))}
                </div>
              </details>
            ) : (
              <Link
                key={`${item.label}-${item.to}`}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="relative py-1 text-base tracking-wide text-foreground/80 transition-colors hover:text-primary"
                activeProps={{
                  className:
                    "text-primary after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-gold",
                }}
              >
                {item.label}
              </Link>
            )
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Search"
            className="rounded-full border border-transparent p-2.5 text-foreground/70 transition-colors hover:border-border hover:text-primary"
          >
            <img src={searchIcon} alt="" className="size-4 object-contain" />
          </button>
          <button
            type="button"
            aria-label="Shopping bag"
            className="rounded-full border border-transparent p-2.5 text-foreground/70 transition-colors hover:border-border hover:text-primary"
          >
            <img src={cartIcon} alt="" className="size-4 object-contain" />
          </button>
          <button
            type="button"
            aria-label="Wishlist"
            className="rounded-full border border-transparent p-2.5 text-foreground/70 transition-colors hover:border-border hover:text-primary"
          >
            <Heart className="size-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Account"
            className="rounded-full border border-border p-2.5 text-foreground/80 transition-colors hover:border-gold hover:text-primary"
          >
            <img src={profileIcon} alt="" className="size-4 object-contain" />
          </button>
        </div>
      </div>

      <nav className="flex items-center gap-6 overflow-x-auto px-5 py-2.5 text-base md:hidden no-scrollbar">
        {nav.map((item) => (
          item.label === "Categories" ? (
            <details key={`${item.label}-${item.to}`} className="shrink-0">
              <summary className="list-none cursor-pointer whitespace-nowrap text-foreground/75">
                Categories ⌄
              </summary>
              <div className="mt-2 flex gap-4 border-l border-border pl-4">
                <Link to="/products" className="whitespace-nowrap text-foreground/75">
                  Silk Sarees
                </Link>
                <Link to="/products" className="whitespace-nowrap text-foreground/75">
                  Cotton Sarees
                </Link>
                <Link to="/products" className="whitespace-nowrap text-foreground/75">
                  Designer Sarees
                </Link>
                <Link to="/products" className="whitespace-nowrap text-foreground/75">
                  Wedding Collection
                </Link>
              </div>
            </details>
          ) : (
            <Link
              key={`${item.label}-${item.to}`}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="whitespace-nowrap text-foreground/75"
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          )
        ))}
      </nav>
    </header>
  );
}
