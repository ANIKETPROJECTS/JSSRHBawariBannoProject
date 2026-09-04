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

const heroDetails = [
  {
    eyebrow: "The Festive Edit · 2026",
    title: "A quieter kind of grandeur.",
    description: "Heirloom silk, handloom cotton and the considered beauty of a drape made slowly.",
  },
  {
    eyebrow: "The Heritage Edit · 2026",
    title: "Colour with a memory.",
    description: "Light-catching silk and old-world architecture, composed for celebrations that linger.",
  },
  {
    eyebrow: "The Atelier Edit · 2026",
    title: "Woven for the in-between.",
    description: "Tactile handloom, softened light and the everyday ritual of dressing with intention.",
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
        <div className="relative min-h-[520px] overflow-hidden bg-ink sm:min-h-[680px] lg:min-h-[min(78vh,760px)]">
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
               className="hero-media relative h-[520px] min-h-[420px] w-full object-cover hero-fade-in sm:h-[680px] lg:h-[min(78vh,760px)]"
            />
          )}
          {transitioningFrom === null && (
            <img
              src={slides[currentHero].image}
              alt={slides[currentHero].alt}
              width={1920}
              height={1088}
             className="hero-media relative h-[520px] min-h-[420px] w-full object-cover sm:h-[680px] lg:h-[min(78vh,760px)]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/30 to-transparent" />
          <div className="pointer-events-none absolute inset-4 border border-primary-foreground/15 sm:inset-7" />
          <div className="pointer-events-none absolute right-6 top-7 hidden text-right text-primary-foreground sm:block lg:right-10 lg:top-10">
            <span className="font-display text-7xl leading-none text-primary-foreground/20 lg:text-8xl">
              {String(currentHero + 1).padStart(2, "0")}
            </span>
            <span className="ml-2 text-eyebrow text-primary-foreground/60">/ 03</span>
          </div>
          <div className="absolute inset-0 flex items-end pb-14 sm:items-center sm:pb-0">
            <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-10">
              <div className="max-w-[34rem] text-primary-foreground">
                <p className="text-eyebrow text-gold-soft">{heroDetails[currentHero % heroDetails.length].eyebrow}</p>
                <h1 className="mt-4 max-w-[19rem] break-words font-display text-[2.65rem] font-medium leading-[0.98] tracking-[-0.035em] min-[420px]:text-5xl sm:max-w-xl sm:text-6xl md:text-8xl">
                  {heroDetails[currentHero % heroDetails.length].title}
                </h1>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
                  {heroDetails[currentHero % heroDetails.length].description}
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

      {/* Categories — staggered editorial collage */}
      <section className="mx-auto max-w-[1320px] overflow-hidden px-5 pb-6 pt-16 sm:px-10 sm:pb-10 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.35fr] lg:items-start lg:gap-14">
          <div className="max-w-md lg:sticky lg:top-32 lg:pt-4">
            <p className="text-eyebrow text-muted-foreground">Discover the house</p>
            <h2 className="mt-3 font-display text-5xl font-medium leading-[0.92] tracking-tight text-primary sm:text-6xl lg:text-7xl">
              By tradition,<br />by mood.
            </h2>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
              An evolving wardrobe of Indian textiles, arranged by the feeling you want to carry with you.
            </p>
            <Link to="/products" className="mt-8 inline-flex items-center gap-3 border-b border-accent pb-2 text-eyebrow text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              Explore the collection <ArrowRight className="size-3.5" strokeWidth={1.6} />
            </Link>
            <div className="mt-12 hidden items-start gap-4 border-t border-border pt-4 sm:flex">
              <span className="font-display text-3xl text-accent">01</span>
              <p className="max-w-[12rem] text-xs leading-relaxed text-muted-foreground">A living archive of colour, craft and the art of the drape.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {categoryEdits.slice(0, 4).map((category, index) => (
              <Link
                key={category.id}
                to="/categories/$category"
                params={{ category: category.id }}
                className={`category-reveal group relative overflow-hidden bg-secondary ${index % 2 === 1 ? "mt-6 sm:mt-10" : ""}`}
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="aspect-[0.9] overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.title}
                    loading="lazy"
                    width={640}
                    height={820}
                    className="size-full object-cover grayscale-[12%] transition duration-700 ease-out group-hover:scale-105 group-hover:grayscale-0"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-95" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-2 text-primary-foreground sm:inset-x-6 sm:bottom-6">
                  <span className="font-display text-xl leading-none sm:text-3xl">{category.title}</span>
                  <ArrowRight className="mb-0.5 size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </div>
              </Link>
            ))}
          </div>
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
