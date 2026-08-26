import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, Heart, Minus, Plus, Share2, ShoppingBag } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductRating, ProductReviews } from "@/components/site/ProductReviews";
import { ProductPolicies } from "@/components/site/ProductPolicies";
import { useCart } from "@/components/site/CartDrawer";
import { useReviewSummary } from "@/components/site/ReviewsContext";
import { useWishlist } from "@/components/site/WishlistContext";
import { formatPrice, sarees } from "@/data/sarees";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/$productId")({
  loader: ({ params }) => {
    const saree = sarees.find((s) => s.id === params.productId);
    if (!saree) throw notFound();
    return { saree };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Saree unavailable | Bawari Banno" }, { name: "robots", content: "noindex" }],
      };
    }
    const { saree } = loaderData;
    return {
      meta: [
        { title: `${saree.name} — ${saree.fabric} | Bawari Banno` },
        { name: "description", content: saree.description.slice(0, 155) },
        { property: "og:title", content: `${saree.name} | Bawari Banno` },
        { property: "og:description", content: saree.description.slice(0, 155) },
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { saree } = Route.useLoaderData();
  return (
    <SiteShell>
      <ProductDetailContent saree={saree} />
    </SiteShell>
  );
}

function ProductDetailContent({ saree }: { saree: (typeof sarees)[number] }) {
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const { addItem } = useCart();
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlist();
  const reviewSummary = useReviewSummary(saree.id);
  const [sharing, setSharing] = useState(false);
  const isWishlisted = wishlistIds.includes(saree.id);

  async function shareProduct() {
    if (sharing) return;
    setSharing(true);
    const url = typeof window === "undefined" ? `/products/${saree.id}` : window.location.href;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: saree.name,
          text: `${saree.name} — ${formatPrice(saree.price)}`,
          url,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      window.alert("Product link copied to your clipboard.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      window.alert("Could not share this product right now.");
    } finally {
      setSharing(false);
    }
  }

  const gallery = [saree.image, saree.image, saree.image];
  const related = sarees
    .filter((s) => s.id !== saree.id && s.category === saree.category)
    .concat(sarees.filter((s) => s.id !== saree.id && s.category !== saree.category))
    .slice(0, 4);

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 pt-8">
        <nav className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <span className="px-2">/</span>
          <Link to="/products" className="hover:text-primary">
            Products
          </Link>
          <span className="px-2">/</span>
          <span className="text-foreground">{saree.name}</span>
        </nav>
      </div>

      <section className="mx-auto mt-8 grid max-w-7xl gap-12 px-5 lg:grid-cols-2">
        <div className="flex self-start gap-4">
          <div className="flex flex-col gap-3">
            {gallery.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "w-16 border transition-colors",
                  active === i ? "border-gold" : "border-border hover:border-gold/50",
                )}
              >
                <img
                  src={img}
                  alt={`${saree.name} view ${i + 1}`}
                  loading="lazy"
                  width={900}
                  height={1200}
                  className="aspect-[3/4] w-full object-cover"
                />
              </button>
            ))}
          </div>
          <div className="aspect-[3/4] flex-1 border border-border bg-card">
            <img
              src={gallery[active]}
              alt={saree.name}
              width={900}
              height={1200}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div>
          <p className="text-eyebrow text-muted-foreground">{saree.fabric}</p>
          <h1 className="mt-3 font-display text-4xl text-primary md:text-5xl">{saree.name}</h1>
          <p className="mt-4 text-2xl tracking-wide text-foreground">
            {formatPrice(saree.price)}
          </p>
          <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>
          <a href="#reviews" className="mt-3 inline-flex hover:opacity-80">
            <ProductRating summary={reviewSummary} />
          </a>

          <div className="mt-6 h-px bg-border" />

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {saree.description}
          </p>

          <dl className="mt-7 space-y-3 text-sm">
            {[
              ["Fabric", saree.fabric],
              ["Blouse", saree.blouse],
              ["Length", saree.length],
              ["Care", saree.care],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4">
                <dt className="w-24 shrink-0 text-eyebrow text-muted-foreground">{label}</dt>
                <dd className="text-foreground/85">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center border border-border">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-3 text-foreground/70 hover:text-primary"
              >
                <Minus className="size-3.5" strokeWidth={1.8} />
              </button>
              <span className="w-10 text-center text-sm">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => Math.min(9, q + 1))}
                className="p-3 text-foreground/70 hover:text-primary"
              >
                <Plus className="size-3.5" strokeWidth={1.8} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => addItem(saree, qty)}
              className="inline-flex flex-1 items-center justify-center gap-2 bg-primary px-8 py-3.5 text-eyebrow text-primary-foreground transition-colors hover:bg-ink"
            >
              <ShoppingBag className="size-4" strokeWidth={1.6} /> Add to Cart
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              aria-pressed={isWishlisted}
              onClick={() => void toggleWishlist(saree.id)}
              className={cn(
                "inline-flex items-center justify-center gap-2 border px-5 py-3 text-eyebrow transition-colors",
                isWishlisted
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-primary hover:border-gold hover:bg-gold/5",
              )}
            >
              {isWishlisted ? (
                <Check className="size-4" strokeWidth={1.8} />
              ) : (
                <Heart className="size-4" strokeWidth={1.6} />
              )}
              {isWishlisted ? "Saved to Wishlist" : "Add to Wishlist"}
            </button>
            <button
              type="button"
              onClick={() => void shareProduct()}
              disabled={sharing}
              className="inline-flex items-center justify-center gap-2 border border-border px-5 py-3 text-eyebrow text-primary transition-colors hover:border-gold hover:bg-gold/5 disabled:cursor-wait disabled:opacity-60"
            >
              <Share2 className="size-4" strokeWidth={1.6} />
              {sharing ? "Sharing…" : "Share Product"}
            </button>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Complimentary blouse stitching consultation · Ships in 3–5 days
          </p>
          <ProductPolicies />
        </div>
      </section>

      <ProductReviews productId={saree.id} />

      <section className="mx-auto mt-24 max-w-7xl px-5">
        <h2 className="font-display text-3xl text-primary rule-gold">You may also like</h2>
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {related.map((item) => (
            <ProductCard key={item.id} saree={item} />
          ))}
        </div>
      </section>
    </>
  );
}
