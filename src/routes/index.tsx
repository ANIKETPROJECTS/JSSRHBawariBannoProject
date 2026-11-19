import { startTransition, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { categoryEdits, sarees } from "@/data/sarees";
import categoryTitleArt from "../../Bawari Banno (8).svg";
import newTrendsTitleArt from "../../Bawari Banno (9).svg";
import bestSellersTitleArt from "../../Bawari Banno (10).svg";
import trendingCollectionTitleArt from "../../Bawari Banno (11).svg";
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
  ].slice(0, 6);
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
            title:
              fallback.id === "wedding-collection"
                ? "Wedding"
                : String(category?.label ?? fallback.title),
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
      <section className="home-hero w-full overflow-hidden bg-white">
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
      <section className="home-categories-section bg-[#ED145B] pb-4 pt-1 sm:pt-2">
        <div className="home-content-container home-category-container">
          <div className="home-section-heading home-category-heading relative mx-auto mb-3 sm:mb-4">
            <h2 className="home-category-title">
              <img src={categoryTitleArt} alt="Our Categories" className="home-category-heading-art" />
            </h2>
          </div>
          <div className="home-category-list grid grid-cols-2 gap-3 pb-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {homepageCategoryEdits.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                to="/categories/$category"
                params={{ category: category.id }}
                className="home-category-card group block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED145B] focus-visible:ring-offset-2"
              >
                <div className="home-category-image overflow-hidden rounded-t-full bg-[#f8f4ef]">
                  <img
                    src={category.image}
                    alt={category.title}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={800}
                    className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <span className="category-card-name flex min-h-12 items-center justify-center px-2 py-2 text-center text-base text-primary sm:min-h-14 sm:py-2.5 sm:text-lg">
                  {category.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductRail
        title="New Trends"
        variant="new-trends"
        products={[...homepageProducts]
          .sort((a, b) => String(b.addedOn ?? "").localeCompare(String(a.addedOn ?? "")))
          .slice(0, 6)}
      />

      <ProductRail
        title="Best Sellers"
        variant="best-sellers"
        products={homepageBestsellers}
      />

      <ProductRail
        title="Trending Collection"
        variant="trending"
        products={homepageProducts.slice(0, 6)}
      />

    </SiteShell>
  );
}
function ProductRail({
  title,
  products,
  variant,
}: {
  title: string;
  products: typeof sarees;
  variant: "new-trends" | "best-sellers" | "trending";
}) {
  const titleArt = {
    "new-trends": newTrendsTitleArt,
    "best-sellers": bestSellersTitleArt,
    trending: trendingCollectionTitleArt,
  }[variant];

  return (
    <section className={`home-product-section home-new-trends home-${variant} w-full bg-white`}>
      <div className="home-content-container home-category-container pb-0 pt-1 sm:pt-2">
        <div
          className="home-section-heading home-new-trends-heading relative mx-auto mb-3 sm:mb-4"
        >
          <h2 className="home-section-title home-new-trends-title text-center leading-tight">
            <img src={titleArt} alt={title} className="home-new-trends-heading-art" />
          </h2>
        </div>

        <div className="home-trends-grid">
          <div className="home-trends-track">
            {products.map((saree) => (
              <div key={saree.id} className="home-trends-card">
                <ProductCard saree={saree} tall editorial showBuyNow ratingBadgeOnImage />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

