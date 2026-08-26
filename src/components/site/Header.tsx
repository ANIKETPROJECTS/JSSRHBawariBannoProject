import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { sarees } from "@/data/sarees";
import cartIcon from "../../../attached_assets/shopping-bag_(3)_1787337643766.png";
import wishlistIcon from "../../../attached_assets/love_1787337671571.png";
import profileIcon from "../../../attached_assets/user_(4)_1787337639892.png";
import searchIcon from "../../../attached_assets/search_(4)_1787337839736.png";
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
  const [query, setQuery] = useState("");
  const closeTimer = useRef<number | undefined>(undefined);
  const openCategories = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setCategoriesOpen(true); };
  const closeCategories = () => { closeTimer.current = window.setTimeout(() => setCategoriesOpen(false), 140); };

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5">
         <Link
           to="/"
           onClick={(event) => {
             if (window.location.pathname !== "/") return;
             event.preventDefault();
             window.scrollTo({ top: 0, behavior: "smooth" });
           }}
           className="flex items-baseline gap-2"
         >
          <span className="font-display text-3xl leading-none tracking-tight text-primary">
            Bawari Banno
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            item.label === "Categories" ? (
              <div key={`${item.label}-${item.to}`} className="relative" onMouseEnter={openCategories} onMouseLeave={closeCategories}>
                <button type="button" onClick={() => setCategoriesOpen((open) => !open)} className="group flex cursor-pointer items-center py-1 text-lg tracking-wide text-foreground transition-colors hover:text-primary">
                  Categories <span className="ml-1 text-[0.65rem]">⌄</span>
                </button>
                {categoriesOpen && <div className="absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-3"><div className="border border-border bg-background p-2 shadow-xl">
                  {[
                    { label: "Silk Sarees", href: "/categories/silk-sarees" },
                    { label: "Cotton Sarees", href: "/categories/cotton-sarees" },
                    { label: "Designer Sarees", href: "/categories/designer-sarees" },
                    { label: "Wedding Collection", href: "/categories/wedding-collection" },
                  ].map((category) => (
                    <Link
                      key={category.label}
                      to={category.href}
                      className="block px-3 py-2.5 text-lg text-foreground transition-colors hover:bg-secondary hover:text-primary"
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
                className="relative py-1 text-lg tracking-wide text-foreground transition-colors hover:text-primary"
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen((open) => !open)}
            className="p-1 transition-transform hover:scale-110"
          >
            <img src={searchIcon} alt="" className="size-6 object-contain" />
          </button>
          <button
            type="button"
            aria-label="Shopping bag"
            onClick={openCart}
            className="relative p-1 transition-transform hover:scale-110"
          >
            <img src={cartIcon} alt="" className="size-6 object-contain" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] text-primary-foreground">
                {itemCount}
              </span>
            )}
          </button>
          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="relative p-1 transition-transform hover:scale-110"
          >
            <img src={wishlistIcon} alt="" className="size-6 object-contain" />
            {wishlistCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] text-primary-foreground">
                {wishlistCount}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            aria-label="Account"
            className="p-1 transition-transform hover:scale-110"
          >
            <img src={profileIcon} alt="" className="size-6 object-contain" />
          </Link>
        </div>
      </div>
      {searchOpen && <div className="border-t border-border bg-background px-5 py-4 shadow-sm"><div className="mx-auto max-w-7xl"><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sarees, fabrics, collections…" className="w-full border-b border-primary bg-transparent px-1 py-3 text-base outline-none placeholder:text-muted-foreground" />{query.trim() && <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{sarees.filter((saree) => `${saree.name} ${saree.fabric} ${saree.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 4).map((saree) => <Link key={saree.id} to="/products/$productId" params={{ productId: saree.id }} onClick={() => { setSearchOpen(false); setQuery(""); }} className="flex items-center gap-3 border border-border p-2 hover:bg-secondary"><img src={saree.image} alt="" className="size-12 object-cover" /><span className="text-sm text-primary">{saree.name}</span></Link>)}</div>}</div></div>}

      <nav className="flex items-center gap-6 overflow-x-auto px-5 py-2.5 text-lg md:hidden no-scrollbar">
        {nav.map((item) => (
          item.label === "Categories" ? (
            <details key={`${item.label}-${item.to}`} className="shrink-0">
                <summary className="list-none cursor-pointer whitespace-nowrap text-foreground">
                Categories ⌄
              </summary>
              <div className="mt-2 flex gap-4 border-l border-border pl-4">
                  <Link to="/categories/silk-sarees" className="whitespace-nowrap text-foreground">
                  Silk Sarees
                </Link>
                  <Link to="/categories/cotton-sarees" className="whitespace-nowrap text-foreground">
                  Cotton Sarees
                </Link>
                  <Link to="/categories/designer-sarees" className="whitespace-nowrap text-foreground">
                  Designer Sarees
                </Link>
                  <Link to="/categories/wedding-collection" className="whitespace-nowrap text-foreground">
                  Wedding Collection
                </Link>
              </div>
            </details>
          ) : (
            <Link
              key={`${item.label}-${item.to}`}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="whitespace-nowrap text-foreground"
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
