import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
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
        const nextCategoryEdits = categoryEdits.slice(0, 4).map((fallback) => {
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

      {/* Categories — horizontal card row */}
      <section className="mx-auto max-w-[1440px] overflow-hidden px-4 pb-0 pt-14 sm:px-8 sm:pt-20 lg:px-10">
        <div className="mb-10 flex items-end justify-between border-b border-border pb-5">
          <div>
            <p className="text-eyebrow text-muted-foreground">Discover the house</p>
            <h2 className="mt-2 font-display text-4xl font-medium tracking-tight text-primary sm:text-5xl">
              By tradition, by mood.
            </h2>
          </div>
          <Link
            to="/products"
            className="hidden text-eyebrow text-primary underline decoration-accent underline-offset-8 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:block"
          >
            View all
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto px-4 pb-3 sm:mx-0 sm:justify-between sm:gap-4 sm:px-0">
          {homepageCategoryEdits.slice(0, 7).map((category) => (
            <Link
              key={category.id}
              to="/categories/$category"
              params={{ category: category.id }}
              className="group flex w-[7.6rem] shrink-0 flex-col items-center gap-3 text-center sm:w-36"
            >
              <div className="rounded-full border border-border bg-secondary/60 p-1 transition-colors duration-300 group-hover:border-primary group-hover:bg-gold/25">
                <img
                  src={category.image}
                  alt={category.title}
                  loading="lazy"
                  width={320}
                  height={320}
                  className="size-[7.1rem] rounded-full object-cover grayscale-[15%] transition-transform duration-500 group-hover:scale-[1.04] group-hover:grayscale-0 sm:size-[8.4rem]"
                />
              </div>
              <span className="font-display text-base leading-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">
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
          <TrendShowcase
            products={[...homepageProducts].sort((a, b) => String(b.addedOn ?? "").localeCompare(String(a.addedOn ?? ""))).slice(0, 5)}
          />

          <ProductRail
            title="Bestsellers"
            products={homepageBestsellers}
          />

          <ProductRail title="Shop by Fabric" products={homepageProducts.slice(0, 5)} />

          <DrapeCarousel products={homepageProducts.slice(0, 5)} />
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
  products,
}: {
  title: string;
  products: typeof sarees;
}) {
  return (
    <section className="site-container section-frame bg-secondary/20 pb-10 pt-10 sm:pb-12 sm:pt-14">
      <h2 className="text-center font-display text-4xl font-light text-primary min-[420px]:text-5xl sm:text-6xl">{title}</h2>

      <div className="mt-8 grid grid-cols-1 gap-8 pb-3 min-[420px]:grid-cols-2 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
          {products.map((saree) => (
          <ProductCard key={saree.id} saree={saree} tall showAddToCart />
        ))}
      </div>
    </section>
  );
}

function TrendShowcase({ products }: { products: typeof sarees }) {
  const [feature, ...supporting] = products;

  if (!feature) return null;

  return (
    <section className="site-container section-frame bg-card pb-10 pt-10 sm:pb-12 sm:pt-14">
      <div className="mb-8 flex items-end justify-between border-b border-border pb-5 sm:mb-10">
        <div>
          <p className="text-eyebrow text-muted-foreground">Just arrived</p>
          <h2 className="mt-2 font-display text-5xl font-medium leading-none tracking-tight text-primary sm:text-6xl">
            New trends<span className="text-accent">.</span>
          </h2>
        </div>
        <Link
          to="/new-arrival"
          className="hidden items-center gap-2 text-eyebrow text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:inline-flex"
        >
          See the drop <ArrowRight className="size-3.5" strokeWidth={1.6} />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.25fr_0.75fr] sm:gap-5">
        <Link
          to="/products/$productId"
          params={{ productId: feature.id }}
          className="trend-reveal group relative min-h-[25rem] overflow-hidden bg-ink sm:min-h-0"
        >
          <img
            src={feature.image}
            alt={feature.name}
            loading="lazy"
            width={1100}
            height={760}
            className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
          <div className="absolute left-5 top-5 flex items-center gap-2 text-primary-foreground sm:left-7 sm:top-7">
            <span className="flex size-7 items-center justify-center rounded-full border border-gold/70 text-xs text-gold">01</span>
            <span className="text-eyebrow text-primary-foreground/80">The latest drape</span>
          </div>
          <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-primary-foreground sm:inset-x-7 sm:bottom-7">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold-soft">{feature.fabric}</p>
              <h3 className="mt-1 font-display text-3xl leading-none sm:text-4xl">{feature.name}</h3>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary-foreground/70 transition-colors group-hover:border-gold group-hover:bg-gold group-hover:text-ink">
              <ArrowRight className="size-4" strokeWidth={1.5} />
            </span>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          {supporting.slice(0, 4).map((saree, index) => (
            <Link
              key={saree.id}
              to="/products/$productId"
              params={{ productId: saree.id }}
              className="trend-reveal group relative aspect-square overflow-hidden bg-secondary"
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              <img
                src={saree.image}
                alt={saree.name}
                loading="lazy"
                width={540}
                height={540}
                className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
              <div className="absolute inset-x-3 bottom-3 text-primary-foreground sm:inset-x-4 sm:bottom-4">
                <span className="block text-[0.6rem] text-gold-soft">0{index + 2}</span>
                <span className="mt-1 block truncate font-display text-base leading-none sm:text-lg">{saree.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Link
        to="/new-arrival"
        className="mt-6 inline-flex items-center gap-2 text-eyebrow text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:hidden"
      >
        See the drop <ArrowRight className="size-3.5" strokeWidth={1.6} />
      </Link>
    </section>
  );
}

function DrapeCarousel({ products }: { products: typeof sarees }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previousIndex = (activeIndex - 1 + products.length) % products.length;
  const nextIndex = (activeIndex + 1) % products.length;
  const activeProduct = products[activeIndex];

  if (!activeProduct) return null;

  const goTo = (direction: number) => {
    setActiveIndex((index) => (index + direction + products.length) % products.length);
  };

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <section className="site-container section-frame pb-10 pt-10 sm:pb-12 sm:pt-14">
      <div className="mb-8 flex items-end justify-between border-b border-border pb-5">
        <div>
          <p className="text-eyebrow text-muted-foreground">A glimpse at the drape</p>
          <h2 className="mt-2 font-display text-5xl font-medium leading-none text-primary sm:text-6xl">
            Six yards in motion<span className="text-accent">.</span>
          </h2>
        </div>
        <span className="hidden text-eyebrow text-muted-foreground sm:block">Scroll the edit</span>
      </div>

      <div className="relative mx-auto flex max-w-[840px] items-center gap-2 py-10 sm:gap-3">
        <button
          type="button"
          aria-label={`Previous drape: ${products[previousIndex].name}`}
          onClick={() => goTo(-1)}
          className="z-20 flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:size-9"
        >
          <ChevronLeft className="size-5" strokeWidth={1.2} />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-3">
          <div className="relative min-w-0 flex-1 basis-0 self-stretch overflow-hidden opacity-35 blur-[2px]">
            <img
              src={products[previousIndex].image}
              alt=""
              className="size-full object-cover grayscale-[20%]"
            />
          </div>

          <div
            key={activeProduct.id}
            className="drape-center-in group relative z-10 aspect-[0.9] w-[52%] shrink-0 overflow-hidden bg-secondary shadow-2xl shadow-ink/10"
          >
          <video
            ref={videoRef}
            key={drapeFilm}
            src={drapeFilm}
            poster={activeProduct.image}
            autoPlay
            loop
            muted
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/10" />
          <button
            type="button"
            aria-label={isPlaying ? "Pause the drape film" : "Play the drape film"}
            onClick={toggleVideo}
            className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary-foreground/80 bg-ink/25 text-primary-foreground backdrop-blur-sm transition-transform duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {isPlaying ? <Pause className="size-5" strokeWidth={1.3} /> : <Play className="ml-0.5 size-5 fill-current" strokeWidth={1.3} />}
          </button>
          <div className="absolute inset-x-5 bottom-5 text-primary-foreground sm:inset-x-7 sm:bottom-7">
            <p className="text-eyebrow text-gold-soft">{activeProduct.fabric}</p>
            <h3 className="mt-1 font-display text-2xl leading-none sm:text-3xl">{activeProduct.name}</h3>
          </div>
          </div>

          <div className="relative min-w-0 flex-1 basis-0 self-stretch overflow-hidden opacity-35 blur-[2px]">
            <img
              src={products[nextIndex].image}
              alt=""
              className="size-full object-cover grayscale-[20%]"
            />
          </div>
        </div>

        <button
          type="button"
          aria-label={`Next drape: ${products[nextIndex].name}`}
          onClick={() => goTo(1)}
          className="z-20 flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:size-9"
        >
          <ChevronRight className="size-5" strokeWidth={1.2} />
        </button>

        <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              aria-label={`Show ${product.name}`}
              aria-current={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={`h-px transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${index === activeIndex ? "w-8 bg-primary" : "w-3 bg-muted-foreground/60 hover:bg-primary"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
