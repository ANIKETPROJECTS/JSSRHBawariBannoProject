import { startTransition, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { categoryEdits, sarees } from "@/data/sarees";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import maroonCollectionImage from "@/assets/hero-editorial-maroon-wide.jpg";
import heroImage from "@/assets/homepage-hero.webp";
import { loadStorefrontCatalog } from "@/lib/storefront-catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bawari Banno — Handwoven Silk & Cotton Sarees" },
      {
        name: "description",
        content:
          "Shop handwoven Kanjivaram, Banarasi, handloom cotton and bridal sarees, sourced directly from Indian weaving clusters.",
      },
      { property: "og:title", content: "Bawari Banno — Handwoven Silk & Cotton Sarees" },
      {
        property: "og:description",
        content:
          "An atelier of heirloom sarees: Kanjivaram, Banarasi, handloom cotton and bridal zari drapes.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [liveProducts, setLiveProducts] = useState<typeof sarees | null>(null);
  const [liveCategoryEdits, setLiveCategoryEdits] = useState<typeof categoryEdits | null>(null);
  const homepageProducts = liveProducts ?? sarees;
  const homepageCategoryEdits = liveCategoryEdits ?? categoryEdits;
  const curatedBestsellers = homepageProducts.filter((saree) => saree.featured || saree.bestseller);
  const curatedBestsellerIds = new Set(curatedBestsellers.map((saree) => saree.id));
  const homepageBestsellers = [
    ...curatedBestsellers,
    ...homepageProducts.filter((saree) => !curatedBestsellerIds.has(saree.id)),
  ].slice(0, 5);
  useEffect(() => {
    let active = true;
    void loadStorefrontCatalog()
      .then((catalog) => {
        if (!active) return;
        const products = catalog.products as unknown as typeof sarees;
        if (products.length) {
          startTransition(() => setLiveProducts(products));
        }

        const liveCategoryBySlug = new Map(catalog.categories.map((category) => [
          String(category.slug ?? category.id ?? ""),
          category,
        ]));
        const nextCategoryEdits = categoryEdits.map((fallback) => {
          const category = liveCategoryBySlug.get(fallback.id);
          return {
            ...fallback,
            title: String(category?.label ?? fallback.title),
            image: String(category?.image || fallback.image),
          };
        });
        if (nextCategoryEdits.length) {
          startTransition(() => setLiveCategoryEdits(nextCategoryEdits));
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return (
    <SiteShell>
      {/* Hero */}
      <section className="h-[calc(100svh-5.75rem)] w-full overflow-hidden bg-white lg:h-[calc(100svh-10.25rem)]">
        <img
          src={heroImage}
          alt="Bawari Banno saree collection"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="block h-full w-full object-cover"
        />
      </section>

      {/* Categories — portrait card grid */}
      <section className="home-categories-section bg-white pb-0 pt-10 sm:pt-12">
        <div className="home-content-container">
          <div className="home-section-heading home-category-heading relative mx-auto mb-4 sm:mb-5">
            <h2 className="home-section-title home-category-title text-center leading-tight tracking-tight text-primary/90">
              Our Categories
            </h2>
            <Link
              to="/products"
              className="section-view-all section-view-all--aligned absolute bottom-0 right-0"
            >
              View all
            </Link>
          </div>
          <div className="home-category-list grid grid-cols-2 gap-3 pb-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 lg:pb-0">
            {homepageCategoryEdits.slice(0, 5).map((category) => (
              <Link
                key={category.id}
                to="/categories/$category"
                params={{ category: category.id }}
                className="home-category-card group block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED145B] focus-visible:ring-offset-2"
              >
                <div className="home-category-image overflow-hidden rounded-t-full border border-[#eadfd5] bg-[#f8f4ef]">
                  <img
                    src={category.image}
                    alt={category.title}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={800}
                    className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <span className="category-card-name flex min-h-10 items-start justify-center px-2 pt-3 text-center text-xs text-primary sm:text-sm">
                  {category.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductRail
        title="New Trends"
        viewAllTo="/new-arrival"
        variant="new-trends"
        products={[...homepageProducts]
          .sort((a, b) => String(b.addedOn ?? "").localeCompare(String(a.addedOn ?? "")))
          .slice(0, 5)}
      />

      <ProductRail
        title="Best Sellers"
        viewAllTo="/bestseller"
        variant="best-sellers"
        products={homepageBestsellers}
      />

      <TrendingCollection
        title="Trending Collection"
        viewAllTo="/trending"
        products={homepageProducts.slice(0, 5)}
      />

      <ClientTestimonials
        products={homepageProducts.slice(0, 3)}
      />
    </SiteShell>
  );
}

function ProductRail({
  title,
  viewAllTo,
  products,
  variant,
}: {
  title: string;
  viewAllTo: string;
  products: typeof sarees;
  variant: "new-trends" | "best-sellers";
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (rail) rail.scrollBy({ left: rail.clientWidth * direction * 0.8, behavior: "smooth" });
  };

  return (
    <section
      className={`home-product-section home-${variant} ${variant === "best-sellers" ? "w-full bg-[#fbf3f0]" : "bg-white"}`}
    >
      <div className="home-content-container pb-0 pt-8 sm:pt-10">
        <div
          className={`home-section-heading home-${variant}-heading relative mx-auto mb-4 sm:mb-5`}
        >
          <h2
            className={`home-section-title home-${variant}-title text-center leading-tight`}
          >
            {title}
          </h2>
          <Link
            to={viewAllTo}
            className="section-view-all section-view-all--aligned absolute bottom-0 right-0"
          >
            View all
          </Link>
        </div>

        {variant === "new-trends" ? (
          <div className="home-trends-carousel relative">
            <button
              type="button"
              aria-label="Show previous new trends"
              onClick={() => scrollRail(-1)}
              className="home-carousel-arrow absolute left-1 top-[34%] z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e7d7cf] bg-white/95 text-[#70263a] shadow-md transition hover:bg-[#70263a] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#70263a] sm:-left-3"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <div ref={railRef} className="home-trends-track">
              {products.map((saree) => (
                <div key={saree.id} className="home-trends-card relative">
                  <ProductCard saree={saree} tall editorial showBuyNow />
                  <span className="home-new-tag absolute left-2 top-2 z-10">New</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              aria-label="Show more new trends"
              onClick={() => scrollRail(1)}
              className="home-carousel-arrow absolute right-1 top-[34%] z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e7d7cf] bg-white/95 text-[#70263a] shadow-md transition hover:bg-[#70263a] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#70263a] sm:-right-3"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="home-bestseller-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {products.map((saree, index) => (
              <div
                key={saree.id}
                className="home-bestseller-card relative rounded-2xl border border-[#eadbd2] bg-white p-2 shadow-[0_8px_22px_rgba(83,42,48,0.08)] sm:p-3"
              >
                <span className="home-rank-badge absolute left-3 top-3 z-20">#{index + 1}</span>
                <span className="home-bestseller-ribbon absolute left-2 top-12 z-20">
                  Bestseller
                </span>
                <ProductCard saree={saree} tall editorial showBuyNow />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TrendingCollection({
  title,
  viewAllTo,
  products,
}: {
  title: string;
  viewAllTo: string;
  products: typeof sarees;
}) {
  const [featured, ...collectionProducts] = products;
  const productsViewportRef = useRef<HTMLDivElement>(null);
  const productsTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = productsViewportRef.current;
    const track = productsTrackRef.current;
    if (!viewport || !track || collectionProducts.length < 2) return;

    let pausedUntil = 0;
    const pauseAutoplay = () => {
      pausedUntil = Date.now() + 8000;
    };
    const touchOptions: AddEventListenerOptions = { passive: true };
    viewport.addEventListener("pointerdown", pauseAutoplay);
    viewport.addEventListener("touchstart", pauseAutoplay, touchOptions);

    const timer = window.setInterval(() => {
      if (
        document.hidden ||
        !window.matchMedia("(max-width: 639px)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        (window.matchMedia("(hover: hover)").matches && viewport.matches(":hover")) ||
        viewport.contains(document.activeElement) ||
        Date.now() < pausedUntil
      ) {
        return;
      }

      const cards = Array.from(track.children) as HTMLElement[];
      if (cards.length < 2) return;

      const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
      const step = viewport.clientWidth + gap;
      const currentIndex = Math.round(viewport.scrollLeft / step);
      const nextIndex = currentIndex >= cards.length - 1 ? 0 : currentIndex + 1;
      const nextCard = cards[nextIndex];
      const left =
        nextCard.getBoundingClientRect().left -
        viewport.getBoundingClientRect().left +
        viewport.scrollLeft;

      viewport.scrollTo({ left, behavior: "smooth" });
    }, 5200);

    return () => {
      window.clearInterval(timer);
      viewport.removeEventListener("pointerdown", pauseAutoplay);
      viewport.removeEventListener("touchstart", pauseAutoplay, touchOptions);
    };
  }, [collectionProducts.length]);

  return (
    <section className="home-trending-section w-full bg-[#451421] py-6 lg:py-8">
      <div className="home-content-container home-trending-inner">
        <div className="home-section-heading home-trending-heading relative mb-5 sm:mb-7">
          <h2 className="home-section-title home-trending-title text-center">{title}</h2>
          <Link
            to={viewAllTo}
            className="section-view-all section-view-all--aligned absolute bottom-0 right-0"
          >
            View all
          </Link>
        </div>
        {featured && (
          <div className="home-trending-layout">
            <CollectionBanner
              title={title}
              to={viewAllTo}
              image={maroonCollectionImage}
            />
            <div
              ref={productsViewportRef}
              className="home-trending-products-viewport"
              aria-label="Trending products"
            >
              <div ref={productsTrackRef} className="home-trending-products-track">
                {collectionProducts.slice(0, 4).map((saree) => (
                  <div
                    key={saree.id}
                    className="home-trending-product min-w-0 border border-[#c9a45d] bg-[#fffaf3] p-2 sm:p-3"
                  >
                    <ProductCard saree={saree} tall editorial showBuyNow />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CollectionBanner({
  title,
  to,
  image,
}: {
  title: string;
  to: string;
  image: string;
}) {
  return (
    <div className="home-collection-banner relative min-w-0 overflow-hidden border border-[#c9a45d]">
      <img
        src={image}
        alt="Model wearing a maroon saree in a heritage setting"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="home-collection-banner-shade absolute inset-0" aria-hidden="true" />
      <div className="home-collection-banner-content absolute inset-x-0 bottom-0 z-10">
        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#e6c777]">
          The Festive Edit
        </p>
        <h3 className="home-collection-banner-title text-2xl leading-tight text-white sm:text-3xl">
          {title}
        </h3>
        <Link
          to={to}
          className="mt-4 inline-flex items-center gap-2 border border-[#d3b366] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f2d68c] transition hover:bg-[#d3b366] hover:text-[#451421] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Shop the Collection <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function ClientTestimonials({
  products,
}: {
  products: typeof sarees;
}) {
  return (
    <section className="home-testimonials-section w-full">
      <div className="home-testimonials-inner">
        <header className="home-testimonials-heading">
          <h2 className="home-testimonials-title leading-tight text-primary">Client Testimonials</h2>
          <div className="home-testimonials-ornament" aria-hidden="true"><span /></div>
          <p className="home-testimonials-subtitle">Loved by women across India</p>
        </header>

        <div className="home-testimonials-track">
          {products.map((saree) => (
            <article key={saree.id} className="home-testimonial-card">
              <span className="home-testimonial-verified">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m3.2 8.2 3 3 6.6-6.5" />
                </svg>
                Verified Buyer <span>(placeholder)</span>
              </span>
              <div className="home-testimonial-photo">
                <img
                  src={saree.image}
                  alt="Product image placeholder; customer photo not provided"
                  loading="lazy"
                  decoding="async"
                  width={180}
                  height={180}
                />
                <span className="home-testimonial-photo-note">Photo placeholder</span>
              </div>
              <div className="home-testimonial-copy">
                <span className="home-testimonial-quote-mark" aria-hidden="true">“</span>
                <p className="home-testimonial-review">
                  Review text placeholder — add the customer&apos;s quote.
                </p>
                <div className="home-testimonial-rating">
                  <span className="home-testimonial-stars" aria-label="Five-star rating placeholder">☆☆☆☆☆</span>
                  <span>Rating not provided (placeholder)</span>
                </div>
                <p className="home-testimonial-name">Customer name (placeholder)</p>
                <p className="home-testimonial-city">City (placeholder)</p>
                <p className="home-testimonial-product">Bought: {saree.name}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
