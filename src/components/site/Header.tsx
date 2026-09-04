import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { sarees } from "@/data/sarees";
import cartIcon from "../../../attached_assets/shopping-bag_(3)_1787337643766.png";
import wishlistIcon from "../../../attached_assets/love_1787337671571.png";
import profileIcon from "../../../attached_assets/user_(4)_1787337639892.png";
import { useCart } from "./CartDrawer";
import { useWishlist } from "./WishlistContext";

const nav = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Categories" },
  { to: "/new-arrival", label: "New Arrival" },
  { to: "/trending", label: "Trending" },
  { to: "/bestseller", label: "Bestseller" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact Us" },
] as const;

export function Header() {
  const { openCart, items } = useCart();
  const { count: wishlistCount } = useWishlist();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const closeTimer = useRef<number | undefined>(undefined);
  const openCategories = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setCategoriesOpen(true); };
  const closeCategories = () => { closeTimer.current = window.setTimeout(() => setCategoriesOpen(false), 140); };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="flex h-7 items-center justify-center bg-primary px-4 text-[0.57rem] font-medium uppercase tracking-[0.25em] text-primary-foreground">
        Complimentary shipping across India · Private appointments available
      </div>
      <div className="relative mx-auto flex h-[4.5rem] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-10">
        <div className="relative flex min-w-0 items-center">
          <button
            type="button"
            aria-label="Search the collection"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
            className="flex shrink-0 items-center gap-2 rounded-full bg-secondary/70 p-2 text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:px-3"
          >
            <Search className="size-[1.05rem]" strokeWidth={1.4} />
            <span className="hidden text-[0.65rem] font-medium uppercase tracking-[0.16em] lg:inline">Search</span>
          </button>
          {searchOpen && (
            <input
              id="site-search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sarees, fabrics, collections…"
              className="ml-2 w-32 border-b border-primary bg-transparent px-1 py-2 text-xs outline-none placeholder:text-muted-foreground sm:w-52 sm:text-sm lg:w-64"
            />
          )}
          {searchOpen && query.trim() && (
            <div className="absolute left-0 top-full z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] border border-border bg-background p-2 shadow-xl">
              {sarees.filter((saree) => `${saree.name} ${saree.fabric} ${saree.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 4).map((saree) => (
                <Link
                  key={saree.id}
                  to="/products/$productId"
                  params={{ productId: saree.id }}
                  onClick={() => { setSearchOpen(false); setQuery(""); }}
                  className="flex min-w-0 items-center gap-3 p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <img src={saree.image} alt={saree.name} className="size-12 shrink-0 object-cover" />
                  <span className="min-w-0 text-sm text-primary">{saree.name}</span>
                </Link>
              ))}
              {sarees.filter((saree) => `${saree.name} ${saree.fabric} ${saree.category}`.toLowerCase().includes(query.toLowerCase())).length === 0 && (
                <p className="px-2 py-3 text-sm text-muted-foreground">No matching pieces found.</p>
              )}
            </div>
          )}
        </div>
        <Link
           to="/"
           onClick={(event) => {
             if (window.location.pathname !== "/") return;
             event.preventDefault();
             window.scrollTo({ top: 0, behavior: "smooth" });
           }}
          className="group shrink-0 items-baseline gap-2 lg:absolute lg:left-1/2 lg:flex lg:-translate-x-1/2"
         >
          <span className="font-display text-[1.9rem] leading-none tracking-[-0.03em] text-primary transition-colors group-hover:text-accent sm:text-[2.15rem]">
            Bawari Banno
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label="Shopping bag"
            onClick={openCart}
            className="relative rounded-full p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <img src={cartIcon} alt="" className="size-5 object-contain sm:size-6" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] text-primary-foreground">
                {itemCount}
              </span>
            )}
          </button>
          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="relative rounded-full p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <img src={wishlistIcon} alt="" className="size-5 object-contain sm:size-6" />
            {wishlistCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] text-primary-foreground">
                {wishlistCount}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            aria-label="Account"
            className="hidden rounded-full p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:block"
          >
            <img src={profileIcon} alt="" className="size-5 object-contain sm:size-6" />
          </Link>
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex rounded-full p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
          >
            {mobileMenuOpen ? <X className="size-5" strokeWidth={1.6} /> : <Menu className="size-5" strokeWidth={1.6} />}
          </button>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="hidden h-11 items-center justify-center gap-6 border-t border-border/70 lg:flex xl:gap-8">
          {nav.map((item) => (
            item.label === "Categories" ? (
              <div key={`${item.label}-${item.to}`} className="relative" onMouseEnter={openCategories} onMouseLeave={closeCategories}>
                 <button type="button" aria-expanded={categoriesOpen} onClick={() => setCategoriesOpen((open) => !open)} className="group flex cursor-pointer items-center gap-1 py-2 text-[0.68rem] font-medium uppercase tracking-[0.15em] text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4">
                   Categories <ChevronDown className={`size-3 transition-transform ${categoriesOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
                 {categoriesOpen && <div className="absolute left-1/2 top-full z-50 w-60 -translate-x-1/2 pt-3"><div className="border border-border bg-background p-2 shadow-xl">
                  {[
                    { label: "Silk Sarees", href: "/categories/silk-sarees" },
                    { label: "Cotton Sarees", href: "/categories/cotton-sarees" },
                    { label: "Designer Sarees", href: "/categories/designer-sarees" },
                    { label: "Wedding Collection", href: "/categories/wedding-collection" },
                  ].map((category) => (
                    <Link
                      key={category.label}
                      to={category.href}
                       className="block px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      onClick={() => setCategoriesOpen(false)}
                    >
                      {category.label}
                    </Link>
                  ))}
                </div></div>}
              </div>
            ) : (
              <Link
                key={`${item.label}-${item.to}`}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                 className="relative py-2 text-[0.68rem] font-medium uppercase tracking-[0.15em] text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4"
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
      {mobileMenuOpen && (
         <div className="border-t border-border bg-background px-4 py-4 shadow-sm lg:hidden">
           <nav aria-label="Mobile navigation" className="grid gap-1 text-sm">
            {nav.map((item) => (
              item.label === "Categories" ? (
                <details key={`${item.label}-${item.to}`} className="border-b border-border/70 pb-1">
                     <summary className="cursor-pointer list-none py-2.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                     Categories <ChevronDown className="float-right mt-0.5 size-4" strokeWidth={1.5} />
                  </summary>
                  <div className="grid gap-1 border-l border-border pl-3 pb-2">
                    <Link to="/categories/silk-sarees" onClick={() => setMobileMenuOpen(false)} className="py-1.5 text-muted-foreground">Silk Sarees</Link>
                    <Link to="/categories/cotton-sarees" onClick={() => setMobileMenuOpen(false)} className="py-1.5 text-muted-foreground">Cotton Sarees</Link>
                    <Link to="/categories/designer-sarees" onClick={() => setMobileMenuOpen(false)} className="py-1.5 text-muted-foreground">Designer Sarees</Link>
                    <Link to="/categories/wedding-collection" onClick={() => setMobileMenuOpen(false)} className="py-1.5 text-muted-foreground">Wedding Collection</Link>
                  </div>
                </details>
              ) : (
                <Link
                  key={`${item.label}-${item.to}`}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-b border-border/70 py-2.5 text-foreground"
                  activeProps={{ className: "border-b border-border/70 py-2.5 text-primary" }}
                >
                  {item.label}
                </Link>
              )
            ))}
            <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-foreground">
              Account
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
