import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { categoryEdits, sarees } from "@/data/sarees";
import maroonHeroImage from "@/assets/hero-editorial-maroon-wide.jpg";
import tealHeroImage from "@/assets/hero-editorial-teal-wide.jpg";
import emeraldHeroImage from "@/assets/hero-editorial-emerald-wide.jpg";
import drapeFilm from "@/assets/drape-film.mp4";

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
      <section className="mx-auto max-w-[1240px] overflow-hidden px-5 pb-8 pt-14 sm:px-10 sm:pb-12 sm:pt-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_minmax(0,1.1fr)] lg:items-center lg:gap-12">
          <div className="max-w-md lg:pt-0">
            <p className="text-eyebrow text-muted-foreground">Discover the house</p>
            <h2 className="mt-3 font-display text-5xl font-medium leading-[0.92] tracking-tight text-primary sm:text-6xl lg:text-[4.25rem]">
              By tradition,<br />by mood.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
              An evolving wardrobe of Indian textiles, arranged by the feeling you want to carry with you.
            </p>
            <Link to="/products" className="mt-6 inline-flex items-center gap-3 border-b border-accent pb-2 text-eyebrow text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              Explore the collection <ArrowRight className="size-3.5" strokeWidth={1.6} />
            </Link>
            <div className="mt-8 hidden items-start gap-4 border-t border-border pt-3 sm:flex">
              <span className="font-display text-3xl text-accent">01</span>
              <p className="max-w-[12rem] text-xs leading-relaxed text-muted-foreground">A living archive of colour, craft and the art of the drape.</p>
            </div>
          </div>
          <div className="grid max-w-[540px] grid-cols-2 gap-3 justify-self-end sm:gap-4">
            {categoryEdits.slice(0, 4).map((category, index) => (
              <Link
                key={category.id}
                to="/categories/$category"
                params={{ category: category.id }}
                className="category-reveal group relative overflow-hidden bg-secondary"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="aspect-[0.82] overflow-hidden">
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
                <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-primary-foreground sm:inset-x-4 sm:bottom-4">
                  <span className="font-display text-base leading-none sm:text-2xl">{category.title}</span>
                  <ArrowRight className="mb-0.5 size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <TrendShowcase
        products={[...sarees].sort((a, b) => b.addedOn.localeCompare(a.addedOn)).slice(0, 5)}
      />

      <ProductRail
        title="Bestsellers"
        products={sarees.filter((saree) => saree.featured).slice(0, 5)}
      />

      <ProductRail title="Shop by Fabric" products={sarees.slice(0, 5)} />

      <DrapeCarousel products={sarees.slice(0, 5)} />

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

function TrendShowcase({ products }: { products: typeof sarees }) {
  const [feature, ...supporting] = products;

  if (!feature) return null;

  return (
    <section className="mx-auto max-w-[1320px] px-5 pb-4 pt-16 sm:px-10 sm:pt-24">
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
    <section className="mx-auto max-w-[1440px] px-5 pb-16 pt-16 sm:px-10 sm:pb-20 sm:pt-24">
      <div className="mb-8 flex items-end justify-between border-b border-border pb-5">
        <div>
          <p className="text-eyebrow text-muted-foreground">A glimpse at the drape</p>
          <h2 className="mt-2 font-display text-5xl font-medium leading-none text-primary sm:text-6xl">
            Six yards in motion<span className="text-accent">.</span>
          </h2>
        </div>
        <span className="hidden text-eyebrow text-muted-foreground sm:block">Scroll the edit</span>
      </div>

      <div className="relative mx-auto h-[25rem] max-w-[1180px] overflow-hidden bg-secondary/20 sm:h-[31rem]">
        <div className="absolute inset-y-10 left-[-17%] w-[42%] opacity-20 blur-[4px] sm:inset-y-12 sm:left-[3%] sm:w-[20%] sm:opacity-30">
          <img
            src={products[previousIndex].image}
            alt=""
            className="size-full object-cover grayscale-[30%]"
          />
          <div className="absolute inset-0 bg-background/30" />
        </div>
        <div className="absolute inset-y-12 left-[14%] hidden w-[20%] opacity-30 blur-[2px] sm:block">
          <img
            src={products[(previousIndex - 1 + products.length) % products.length].image}
            alt=""
            className="size-full object-cover grayscale-[20%]"
          />
          <div className="absolute inset-0 bg-background/20" />
        </div>
        <div className="absolute inset-y-10 right-[-17%] w-[42%] opacity-20 blur-[4px] sm:inset-y-12 sm:right-[3%] sm:w-[20%] sm:opacity-30">
          <img
            src={products[nextIndex].image}
            alt=""
            className="size-full object-cover grayscale-[30%]"
          />
          <div className="absolute inset-0 bg-background/30" />
        </div>
        <div className="absolute inset-y-12 right-[14%] hidden w-[20%] opacity-30 blur-[2px] sm:block">
          <img
            src={products[(nextIndex + 1) % products.length].image}
            alt=""
            className="size-full object-cover grayscale-[20%]"
          />
          <div className="absolute inset-0 bg-background/20" />
        </div>

        <button
          type="button"
          aria-label={`Previous drape: ${products[previousIndex].name}`}
          onClick={() => goTo(-1)}
          className="absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:left-8"
        >
          <ChevronLeft className="size-5" strokeWidth={1.2} />
          <span className="hidden text-[0.58rem] uppercase tracking-[0.2em] [writing-mode:vertical-rl] sm:block">Previous</span>
        </button>
        <button
          type="button"
          aria-label={`Next drape: ${products[nextIndex].name}`}
          onClick={() => goTo(1)}
          className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:right-8"
        >
          <ChevronRight className="size-5" strokeWidth={1.2} />
          <span className="hidden text-[0.58rem] uppercase tracking-[0.2em] [writing-mode:vertical-rl] sm:block">Next</span>
        </button>

        <div
          key={activeProduct.id}
          className="drape-center-in group absolute left-1/2 top-1/2 z-10 aspect-[1.42] w-[min(72%,18rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-secondary shadow-2xl shadow-ink/10 sm:w-[min(30%,20rem)]"
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

        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
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
