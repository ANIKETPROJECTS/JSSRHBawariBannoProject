import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Play } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { categoryEdits, sarees } from "@/data/sarees";
import maroonHeroImage from "@/assets/hero-editorial-maroon-wide.jpg";
import tealHeroImage from "@/assets/hero-editorial-teal-wide.jpg";
import emeraldHeroImage from "@/assets/hero-editorial-emerald-wide.jpg";

const heroSlides = [
  {
    image: maroonHeroImage,
    alt: "Woman in a maroon silk saree beneath a carved palace arch",
  },
  {
    image: tealHeroImage,
    alt: "Woman in a teal silk saree on a sunlit heritage terrace",
  },
  {
    image: emeraldHeroImage,
    alt: "Woman in an emerald handloom saree inside a textile atelier",
  },
] as const;

const legacyHeroImages = new Set(["/src/assets/hero.jpg", "/src/assets/story.jpg", "/src/assets/craft.jpg"]);

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
  const [activeHero, setActiveHero] = useState(0);
  const [transitioningFrom, setTransitioningFrom] = useState<number | null>(null);
  const activeHeroRef = useRef(0);
  const [liveHeroSlides, setLiveHeroSlides] = useState<typeof heroSlides | null>(null);
  const slides = liveHeroSlides ?? heroSlides;
  const currentHero = activeHero % slides.length;
  const previousHero = transitioningFrom === null ? currentHero : transitioningFrom % slides.length;

  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Catalog unavailable")))
      .then((catalog: { heroes?: Array<{ image?: string; alt?: string }> }) => {
        const nextSlides = (catalog.heroes ?? [])
          .filter((slide) => slide.image)
          .map((slide, index) => {
            const image = String(slide.image);
            const replacement = legacyHeroImages.has(image) ? heroSlides[index % heroSlides.length] : null;
            return {
              image: replacement?.image ?? image,
              alt: replacement?.alt ?? String(slide.alt ?? "Bawari Banno saree collection"),
            };
          });
        if (nextSlides.length) setLiveHeroSlides(nextSlides as typeof heroSlides);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextHero = (activeHeroRef.current + 1) % slides.length;
      setTransitioningFrom(activeHeroRef.current);
      activeHeroRef.current = nextHero;
      setActiveHero(nextHero);
      window.setTimeout(() => setTransitioningFrom(null), 750);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <SiteShell>
      {/* Hero */}
      <section className="mx-auto max-w-none px-0">
        <div className="relative min-h-[590px] overflow-hidden bg-ink sm:min-h-[680px] lg:min-h-[min(78vh,760px)]">
          <img
            src={slides[previousHero].image}
            alt={slides[previousHero].alt}
            width={1920}
            height={1088}
             className="hero-media absolute inset-0 h-full w-full object-cover"
          />
          {transitioningFrom !== null && (
            <img
              key={currentHero}
              src={slides[currentHero].image}
              alt={slides[currentHero].alt}
              width={1920}
              height={1088}
               className="hero-media relative h-[590px] min-h-[420px] w-full object-cover hero-fade-in sm:h-[680px] lg:h-[min(78vh,760px)]"
            />
          )}
          {transitioningFrom === null && (
            <img
              src={slides[currentHero].image}
              alt={slides[currentHero].alt}
              width={1920}
              height={1088}
             className="hero-media relative h-[590px] min-h-[420px] w-full object-cover sm:h-[680px] lg:h-[min(78vh,760px)]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/30 to-transparent" />
          <div className="absolute inset-0 flex items-end pb-14 sm:items-center sm:pb-0">
            <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-10">
              <div className="max-w-[34rem] text-primary-foreground">
                <p className="text-eyebrow text-gold-soft">The Festive Edit · 2026</p>
                <h1 className="mt-4 max-w-[19rem] break-words font-display text-[2.65rem] font-medium leading-[0.98] tracking-[-0.035em] min-[420px]:text-5xl sm:max-w-xl sm:text-6xl md:text-8xl">
                  A quieter kind of grandeur.
                </h1>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
                  Heirloom silk, handloom cotton and the considered beauty of a drape made slowly.
                </p>
                <Link
                  to="/products"
                  className="mt-8 inline-flex items-center gap-3 border border-gold bg-gold px-6 py-3.5 text-eyebrow text-ink transition-colors hover:bg-transparent hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:px-8"
                >
                  Explore the edit <ArrowRight className="size-3.5" strokeWidth={1.7} />
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 right-5 flex items-center gap-2 sm:bottom-8 sm:right-10" aria-label="Hero slides">
            {slides.map((slide, index) => (
              <button
                key={`${slide.image}-${index}`}
                type="button"
                aria-label={`Show slide ${index + 1}`}
                aria-current={index === currentHero}
                onClick={() => {
                  setTransitioningFrom(currentHero);
                  activeHeroRef.current = index;
                  setActiveHero(index);
                  window.setTimeout(() => setTransitioningFrom(null), 750);
                }}
                className={`h-px transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-ink ${index === currentHero ? "w-10 bg-gold" : "w-5 bg-primary-foreground/60 hover:bg-primary-foreground"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Categories — horizontal circular scroller */}
      <section className="mx-auto max-w-[1440px] px-4 pt-16 sm:px-8 sm:pt-24 lg:px-10">
        <div className="mb-10 flex items-end justify-between border-b border-border pb-5">
          <div>
            <p className="text-eyebrow text-muted-foreground">Discover the house</p>
            <h2 className="mt-2 font-display text-4xl font-medium tracking-tight text-primary sm:text-5xl">By tradition, by mood.</h2>
          </div>
          <Link to="/products" className="hidden text-eyebrow text-primary underline decoration-accent underline-offset-8 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:block">View all</Link>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto px-4 pb-3 sm:mx-0 sm:justify-between sm:gap-4 sm:px-0">
          {categoryEdits.slice(0, 7).map((category) => (
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

      <ProductRail
        title="New Trends"
        products={[...sarees].sort((a, b) => b.addedOn.localeCompare(a.addedOn)).slice(0, 5)}
      />

      <ProductRail
        title="Bestsellers"
        products={sarees.filter((saree) => saree.featured).slice(0, 5)}
      />

      <ProductRail title="Shop by Fabric" products={sarees.slice(0, 5)} />

      <section className="mx-auto max-w-[1440px] px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="mb-8 flex items-end justify-between border-b border-border pb-5">
          <div>
            <p className="text-eyebrow text-muted-foreground">A glimpse at the drape</p>
            <h2 className="mt-2 font-display text-4xl font-medium text-primary min-[420px]:text-5xl sm:text-6xl">
              Six yards in motion.
            </h2>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {sarees.slice(0, 5).map((saree, index) => (
            <figure key={saree.id} className="group relative aspect-[9/16] overflow-hidden bg-secondary">
              <img
                src={saree.image}
                alt={`Customer wearing ${saree.name}`}
                loading="lazy"
                className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-ink/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-11 items-center justify-center rounded-full border border-primary-foreground/80 bg-ink/20 text-primary-foreground backdrop-blur-sm transition-transform group-hover:scale-110">
                  <Play className="ml-0.5 size-4 fill-current" strokeWidth={1.5} />
                </span>
              </div>
            </figure>
          ))}
        </div>
      </section>

    </SiteShell>
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
    <section className="mx-auto max-w-[1440px] px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <h2 className="text-center font-display text-4xl font-light text-primary min-[420px]:text-5xl sm:text-6xl">{title}</h2>

      <div className="mt-8 grid grid-cols-1 gap-8 pb-3 min-[420px]:grid-cols-2 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
          {products.map((saree) => (
          <ProductCard key={saree.id} saree={saree} tall showAddToCart />
        ))}
      </div>
    </section>
  );
}
