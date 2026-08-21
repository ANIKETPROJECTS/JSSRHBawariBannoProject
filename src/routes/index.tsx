import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Play } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { categoryEdits, sarees } from "@/data/sarees";
import craftImage from "@/assets/craft.jpg";
import heroImage from "@/assets/hero.jpg";
import storyImage from "@/assets/story.jpg";

const heroSlides = [
  {
    image: heroImage,
    alt: "Woman in a maroon Kanjivaram silk saree in a heritage courtyard",
  },
  {
    image: storyImage,
    alt: "Handwoven saree craftsmanship and textile details",
  },
  {
    image: craftImage,
    alt: "Artisan hands working with traditional saree weaving techniques",
  },
] as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vastraa — Handwoven Silk & Cotton Sarees" },
      {
        name: "description",
        content:
          "Shop handwoven Kanjivaram, Banarasi, handloom cotton and bridal sarees, sourced directly from Indian weaving clusters.",
      },
      { property: "og:title", content: "Vastraa — Handwoven Silk & Cotton Sarees" },
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHero((current) => (current + 1) % heroSlides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <SiteShell>
      {/* Hero */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden">
          <img
            src={heroSlides[activeHero].image}
            alt={heroSlides[activeHero].alt}
            width={1920}
            height={1088}
            className="h-[68vh] min-h-[420px] w-full object-cover transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-5">
              <div className="max-w-xl text-primary-foreground">
                <p className="text-eyebrow text-gold">The Festive Edit · 2026</p>
                <h1 className="mt-4 font-display text-5xl font-light leading-[1.05] tracking-tight md:text-7xl">
                  Six yards, woven with a lifetime of patience.
                </h1>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-primary-foreground/80">
                  Pure zari Kanjivarams, Banarasi brocades and airy handloom cottons — traced
                  back to the looms and hands that made them.
                </p>
                <Link
                  to="/products"
                  className="mt-8 inline-flex items-center gap-2 border border-gold bg-gold/95 px-8 py-3.5 text-eyebrow text-ink transition-colors hover:bg-transparent hover:text-gold"
                >
                  Shop Now <ArrowRight className="size-3.5" strokeWidth={2} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories — horizontal circular scroller */}
      <section className="mx-auto max-w-[1440px] px-2 pt-2 sm:px-4 sm:pt-3">
        <div className="no-scrollbar overflow-x-auto pb-3">
          <div className="flex min-w-0 justify-between gap-0">
          {categoryEdits.slice(0, 7).map((category) => (
            <Link
              key={category.id}
              to="/products"
              className="group flex w-44 shrink-0 flex-col items-center gap-3 text-center"
            >
              <div className="rounded-full border border-gold/60 bg-gold/10 p-1 transition-colors duration-300 group-hover:border-primary group-hover:bg-gold/25">
                <img
                  src={category.image}
                  alt={category.title}
                  loading="lazy"
                  width={320}
                  height={320}
                  className="size-44 rounded-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <span className="font-display text-lg leading-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">
                {category.title}
              </span>
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
        <h2 className="text-center font-display text-4xl font-light text-primary sm:text-5xl">
          Six yards in motion.
        </h2>

        <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
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
              <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between px-3 pb-3 text-primary-foreground">
                <span className="text-xs">Customer look</span>
                <span className="text-[0.65rem] tracking-[0.15em] text-primary-foreground/70">
                  0{index + 1}
                </span>
              </figcaption>
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
    <section className="mx-auto max-w-[1440px] px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <h2 className="text-center font-display text-5xl font-light text-primary sm:text-6xl">{title}</h2>

      <div className="mt-8 grid grid-cols-5 gap-5 pb-3">
        {products.map((saree) => (
          <ProductCard key={saree.id} saree={saree} tall />
        ))}
      </div>
    </section>
  );
}
