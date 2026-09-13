import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import cartIcon from "../../../attached_assets/shopping-bag_(3)_1787337643766.png";
import wishlistIcon from "../../../attached_assets/love_1787337671571.png";
import profileIcon from "../../../attached_assets/user_(4)_1787337639892.png";
import logoImage from "../../../attached_assets/Bawari_Banno_Horizontal_Transparent-01_1789242095079.png";
import instagramIcon from "../../../attached_assets/instagram_1789283397488.png";
import searchIcon from "../../../attached_assets/search_(2)_1789284877555.png";
import whatsappIcon from "../../../attached_assets/whatsapp_1789286832089.png";
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

const socialLinks = [
  { label: "Instagram", icon: instagramIcon },
] as const;

export function Header() {
  const { openCart, items } = useCart();
  const { count: wishlistCount } = useWishlist();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typedPlaceholder, setTypedPlaceholder] = useState("Search a saree");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const openCategories = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setCategoriesOpen(true); };
  const closeCategories = () => { closeTimer.current = window.setTimeout(() => setCategoriesOpen(false), 140); };

  useEffect(() => {
    const phrases = ["Search a saree", "Search a fabric", "Search a collection"];
    let phraseIndex = 0;
    let characterIndex = phrases[0].length;
    let deleting = true;
    let timer: number | undefined;

    const tick = () => {
      const phrase = phrases[phraseIndex];
      if (deleting) {
        characterIndex -= 1;
        if (characterIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      } else {
        characterIndex += 1;
        if (characterIndex === phrases[phraseIndex].length) {
          deleting = true;
        }
      }

      setTypedPlaceholder(phrases[phraseIndex].slice(0, characterIndex));
      timer = window.setTimeout(tick, deleting ? 65 : 105);
    };

    timer = window.setTimeout(tick, 1200);
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <header className="relative sticky top-0 z-40 border-b border-white/20 bg-[#ED145B] text-white backdrop-blur-xl">
      <div className="h-9 border-b border-white/20 bg-[#ED145B]">
        <div
          className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-7 lg:px-10"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <div className="flex min-w-0 items-center">
            {socialLinks.map(({ label, icon }) => (
              <a
                key={label}
                href="#"
                aria-label={`${label}: @bawaribanno`}
                className="flex items-center gap-2 rounded-full px-2 py-1 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <img src={icon} alt="" className="size-6 object-contain brightness-0 invert" />
                <span className="whitespace-nowrap text-base font-medium tracking-[0.02em]">
                  @bawaribanno
                </span>
              </a>
            ))}
          </div>
          <div className="ml-auto hidden min-w-0 items-center gap-3 md:flex">
            <a
              href="tel:+911111111111"
              aria-label="Call Bawari Banno at plus 91 11111 11111"
              className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <img src={whatsappIcon} alt="" className="size-5 object-contain brightness-0 invert" />
              <span className="whitespace-nowrap text-xs font-medium tracking-[0.03em]">
                +91 11111 11111
              </span>
            </a>
            <div
              aria-label='"परंपरा में बसी, आज की नारी।" Tradition, woven into the woman of today.'
              className="hidden max-w-[34rem] min-w-0 overflow-hidden border-l border-white pl-3 lg:block"
            >
              <div className="header-quote-track whitespace-nowrap text-xs font-medium tracking-[0.02em] text-white">
                <span>"परंपरा में बसी, आज की नारी।"</span>
                <span className="mx-3" aria-hidden="true">·</span>
                <span>Tradition, woven into the woman of today.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="relative">
       <div className="relative mx-auto flex h-[3.5rem] max-w-[1440px] items-center justify-between gap-3 px-4 sm:h-[4rem] sm:px-7 lg:h-[4.5rem] lg:px-10">
         <div aria-hidden="true" className="w-10 shrink-0 sm:w-16 lg:hidden" />
        <Link
           to="/"
           onClick={(event) => {
             if (window.location.pathname !== "/") return;
             event.preventDefault();
             window.scrollTo({ top: 0, behavior: "smooth" });
           }}
            className="group absolute -top-1 left-1/2 z-10 flex -translate-x-1/2 items-baseline gap-2 lg:-top-9"
           >
            <img
              src={logoImage}
              alt="Bawari Banno"
                 className="h-[5rem] w-[13.5rem] object-contain sm:h-[5.25rem] sm:w-[14rem] lg:h-[8rem] lg:w-[25rem]"
            />
        </Link>

         <div className="hidden items-center gap-2 lg:mr-auto lg:flex" style={{ fontFamily: "'Poppins', sans-serif" }}>
           <button
             type="button"
             aria-label="Focus search"
             onClick={() => searchInputRef.current?.focus()}
             className="rounded-full p-2 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
           >
              <img src={searchIcon} alt="" className="size-5 object-contain brightness-0 invert sm:size-6" />
           </button>
           <input
             ref={searchInputRef}
             type="search"
             aria-label="Search the collection"
             value={query}
             onChange={(event) => setQuery(event.target.value)}
             placeholder={`${typedPlaceholder}…`}
             className="w-36 border-b border-white bg-transparent px-1 py-1.5 text-sm text-white outline-none placeholder:text-white xl:w-48"
           />
         </div>

          <div className="relative z-10 flex shrink-0 translate-y-2 items-center gap-1 sm:translate-y-2 sm:gap-2 lg:ml-auto lg:translate-y-0">
          <button
            type="button"
            aria-label="Shopping bag"
            onClick={openCart}
             className="relative rounded-full p-2 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
             <img src={cartIcon} alt="" className="size-5 object-contain brightness-0 invert sm:size-6" />
            {itemCount > 0 && (
               <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-black/25 text-[0.6rem] text-white">
                {itemCount}
              </span>
            )}
          </button>
          <Link
            to="/wishlist"
            aria-label="Wishlist"
             className="relative rounded-full p-2 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
             <img src={wishlistIcon} alt="" className="size-5 object-contain brightness-0 invert sm:size-6" />
            {wishlistCount > 0 && (
               <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-black/25 text-[0.6rem] text-white">
                {wishlistCount}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            aria-label="Account"
             className="hidden rounded-full p-2 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:block"
          >
             <img src={profileIcon} alt="" className="size-5 object-contain brightness-0 invert sm:size-6" />
          </Link>
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
             className="flex rounded-full p-2 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
          >
            {mobileMenuOpen ? <X className="size-5" strokeWidth={1.6} /> : <Menu className="size-5" strokeWidth={1.6} />}
          </button>
        </div>
      </div>

       <nav
         aria-label="Primary navigation"
         className="relative hidden h-14 w-full items-center justify-between gap-4 border-t border-white/20 px-8 sm:px-12 lg:flex lg:px-20 xl:px-28"
         style={{ fontFamily: "'Poppins', sans-serif" }}
       >
          {nav.map((item) => (
            item.label === "Categories" ? (
              <div key={`${item.label}-${item.to}`} className="relative" onMouseEnter={openCategories} onMouseLeave={closeCategories}>
                  <button type="button" aria-expanded={categoriesOpen} onClick={() => setCategoriesOpen((open) => !open)} className="group flex cursor-pointer items-center gap-1 whitespace-nowrap py-2 text-sm font-medium uppercase tracking-[0.1em] text-white transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#ED145B]">
                   Categories <ChevronDown className={`size-3 transition-transform ${categoriesOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
                  {categoriesOpen && <div className="absolute left-1/2 top-full z-50 w-60 -translate-x-1/2 pt-3"><div className="border border-white/20 bg-[#ED145B] p-2 shadow-xl">
                  {[
                    { label: "Silk Sarees", href: "/categories/silk-sarees" },
                    { label: "Cotton Sarees", href: "/categories/cotton-sarees" },
                    { label: "Designer Sarees", href: "/categories/designer-sarees" },
                    { label: "Wedding Collection", href: "/categories/wedding-collection" },
                  ].map((category) => (
                    <Link
                      key={category.label}
                      to={category.href}
                        className="block px-3 py-2.5 text-sm text-white transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                  className="relative whitespace-nowrap py-2 text-sm font-medium uppercase tracking-[0.1em] text-white transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#ED145B]"
                activeProps={{
                  className:
                       "text-white after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-white",
                }}
              >
                {item.label}
              </Link>
            )
          ))}
      </nav>
      </div>
      {mobileMenuOpen && (
          <div className="border-t border-border bg-white px-4 py-4 text-foreground shadow-sm lg:hidden">
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
