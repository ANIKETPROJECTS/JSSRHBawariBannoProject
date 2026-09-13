import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { categoryEdits, sarees } from "@/data/sarees";
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
      <section className="bg-white px-4 pb-0 pt-10 sm:pt-12">
        <div className="relative mx-auto mb-4 max-w-[1600px] sm:mb-5">
          <h2 className="text-center font-sans font-light leading-tight tracking-tight text-primary/90">
            Our Categories
          </h2>
          <Link
            to="/products"
            className="section-view-all section-view-all--aligned absolute bottom-0 right-0"
          >
            View all
          </Link>
        </div>
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {homepageCategoryEdits.slice(0, 5).map((category) => (
            <Link
              key={category.id}
              to="/categories/$category"
              params={{ category: category.id }}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED145B] focus-visible:ring-offset-2"
            >
              <div className="overflow-hidden bg-[#f8f8f8]">
                <img
                  src={category.image}
                  alt={category.title}
                  loading="lazy"
                  width={640}
                  height={800}
                  className="aspect-[3/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <span className="category-card-name flex min-h-12 items-start justify-center px-2 pt-3 text-center text-lg text-primary sm:text-xl">
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
            products={[...homepageProducts]
              .sort((a, b) => String(b.addedOn ?? "").localeCompare(String(a.addedOn ?? "")))
              .slice(0, 5)}
          />

          <ProductRail
            title="Best Sellers"
            viewAllTo="/bestseller"
            products={homepageBestsellers}
          />

          <ProductRail
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
}: {
  title: string;
  viewAllTo: string;
  products: typeof sarees;
}) {
  return (
    <section className="mx-auto max-w-[1600px] bg-white px-4 pb-0 pt-8 sm:pt-10">
      <div className="relative mx-auto mb-4 max-w-[1600px] sm:mb-5">
        <h2 className="text-center font-sans leading-tight text-primary">{title}</h2>
        <Link
          to={viewAllTo}
          className="section-view-all section-view-all--aligned absolute bottom-0 right-0"
        >
          View all
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {products.map((saree) => (
          <ProductCard key={saree.id} saree={saree} tall editorial showAddToCart />
        ))}
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
