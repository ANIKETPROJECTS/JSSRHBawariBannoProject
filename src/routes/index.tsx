import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { categoryEdits, sarees } from "@/data/sarees";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import drapeFilm from "@/assets/drape-film.mp4";
import heroImage from "../../attached_assets/Gemini_Generated_Image_h64dhbh64dhbh64d_1789288153200.png";

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
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "fallback">("loading");
  const homepageProducts = liveProducts ?? sarees;
  const homepageCategoryEdits = liveCategoryEdits ?? categoryEdits;
  const curatedBestsellers = homepageProducts.filter((saree) => saree.featured || saree.bestseller);
  const curatedBestsellerIds = new Set(curatedBestsellers.map((saree) => saree.id));
  const homepageBestsellers = [
    ...curatedBestsellers,
    ...homepageProducts.filter((saree) => !curatedBestsellerIds.has(saree.id)),
  ].slice(0, 5);
  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Catalog unavailable")))
      .then((catalog: {
        products?: typeof sarees;
        categories?: Array<{ id?: string; slug?: string; label?: string; image?: string }>;
      }) => {
        if (catalog.products?.length) setLiveProducts(catalog.products);

        const liveCategoryBySlug = new Map(
          (catalog.categories ?? []).map((category) => [
            String(category.slug ?? category.id ?? ""),
            category,
          ]),
        );
        const nextCategoryEdits = categoryEdits.map((fallback) => {
          const category = liveCategoryBySlug.get(fallback.id);
          return {
            ...fallback,
            title: String(category?.label ?? fallback.title),
            image: String(category?.image || fallback.image),
          };
        });
        if (nextCategoryEdits.length) setLiveCategoryEdits(nextCategoryEdits);
        setCatalogState("ready");
      })
      .catch(() => setCatalogState("fallback"));
  }, []);

  return (
    <SiteShell>
      {/* Hero */}
      <section className="h-[calc(100svh-5.75rem)] w-full overflow-hidden bg-white lg:h-[calc(100svh-10.25rem)]">
        <img
          src={heroImage}
          alt="Bawari Banno saree collection"
          className="block h-full w-full object-cover"
        />
      </section>

      {/* Categories — portrait card grid */}
      <section className="home-categories-section bg-white px-4 pb-0 pt-10 sm:pt-12">
        <div className="home-section-heading home-category-heading relative mx-auto mb-4 max-w-[1600px] sm:mb-5">
          <h2 className="home-section-title home-category-title text-center font-sans font-light leading-tight tracking-tight text-primary/90">
            Our Categories
          </h2>
          <Link
            to="/products"
            className="section-view-all section-view-all--aligned absolute bottom-0 right-0"
          >
            View all
          </Link>
        </div>
        <div className="home-category-list mx-auto flex max-w-[1600px] gap-3 overflow-x-auto pb-2 sm:gap-4 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
          {homepageCategoryEdits.slice(0, 5).map((category) => (
            <Link
              key={category.id}
              to="/categories/$category"
              params={{ category: category.id }}
              className="home-category-card group block w-[42vw] max-w-[260px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED145B] focus-visible:ring-offset-2 lg:w-full lg:max-w-none"
            >
              <div className="home-category-image overflow-hidden rounded-t-full border border-[#eadfd5] bg-[#f8f4ef]">
                <img
                  src={category.image}
                  alt={category.title}
                  loading="lazy"
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
      </section>

      {catalogState === "loading" ? (
        <HomepageCatalogLoader />
      ) : (
        <>
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
            videos={homepageProducts.slice(0, 5).map((saree, index) => ({
              id: `testimonial-${saree.id}-${index}`,
              src: drapeFilm,
              poster: saree.image,
              label: `Client testimonial ${index + 1}`,
            }))}
          />
        </>
      )}

    </SiteShell>
  );
}

function HomepageCatalogLoader() {
  return (
    <section className="site-container section-frame pb-10 pt-10 sm:pb-12 sm:pt-14" aria-busy="true" aria-label="Loading the collection">
      <div className="mx-auto h-10 w-48 animate-pulse bg-primary/5" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="aspect-[3/4] animate-pulse bg-secondary/70" />
        ))}
      </div>
    </section>
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
    <section className={`home-product-section home-${variant} ${variant === "best-sellers" ? "w-full bg-[#fbf3f0]" : "bg-white"}`}>
      <div className="mx-auto max-w-[1600px] px-4 pb-0 pt-8 sm:pt-10">
      <div className={`home-section-heading home-${variant}-heading relative mx-auto mb-4 max-w-[1600px] sm:mb-5`}>
        <h2 className={`home-section-title home-${variant}-title text-center font-sans leading-tight`}>{title}</h2>
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
                <ProductCard saree={saree} tall editorial showAddToCart />
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
            <div key={saree.id} className="home-bestseller-card relative rounded-2xl border border-[#eadbd2] bg-white p-2 shadow-[0_8px_22px_rgba(83,42,48,0.08)] sm:p-3">
              <span className="home-rank-badge absolute left-3 top-3 z-20">#{index + 1}</span>
              <span className="home-bestseller-ribbon absolute left-2 top-12 z-20">Bestseller</span>
              <ProductCard saree={saree} tall editorial showAddToCart />
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

  return (
    <section className="home-trending-section w-full bg-[#451421] px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="home-section-heading home-trending-heading relative mb-5 sm:mb-7">
          <h2 className="home-section-title home-trending-title text-center font-sans">{title}</h2>
          <Link
            to={viewAllTo}
            className="section-view-all section-view-all--aligned absolute bottom-0 right-0"
          >
            View all
          </Link>
        </div>
        {featured && (
          <div className="home-trending-layout grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-5">
            <div className="home-trending-feature relative min-w-0 overflow-hidden border border-[#c9a45d] bg-[#f8f1e9]">
              <ProductCard saree={featured} tall editorial showAddToCart />
              <div className="home-trending-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-5 sm:p-8">
                <div className="max-w-sm text-center text-white">
                  <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#e6c777]">The Bawari edit</p>
                  <h3 className="font-sans text-2xl font-medium leading-tight text-white sm:text-3xl">{title}</h3>
                  <Link
                    to={viewAllTo}
                    className="pointer-events-auto mt-4 inline-flex items-center gap-2 border border-[#d3b366] bg-[#451421]/80 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f2d68c] transition hover:bg-[#d3b366] hover:text-[#451421] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Shop the Collection <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="home-trending-grid grid grid-cols-2 gap-3 sm:gap-4">
              {collectionProducts.slice(0, 4).map((saree) => (
                <div key={saree.id} className="home-trending-product min-w-0 border border-[#c9a45d] bg-[#fffaf3] p-2 sm:p-3">
                  <ProductCard saree={saree} tall editorial showAddToCart />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ClientTestimonials({
  videos,
}: {
  videos: Array<{
    id: string;
    src: string;
    poster: string;
    label: string;
  }>;
}) {
  return (
    <section className="mx-auto max-w-[1600px] bg-white px-4 pb-0 pt-8 sm:pt-10">
      <div className="mb-4 text-center sm:mb-5">
        <div className="relative mx-auto max-w-[1600px]">
          <h2 className="font-sans leading-tight text-primary">Client Testimonials</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {videos.map((video) => (
          <div key={video.id} className="group relative overflow-hidden border border-border bg-card">
            <video
              src={video.src}
              poster={video.poster}
              autoPlay
              loop
              muted
              playsInline
              aria-label={video.label}
              className="aspect-[3/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
