import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
    return { saree: saree ?? null };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.saree) {
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
  const { saree: initialSaree } = Route.useLoaderData();
  const { productId } = Route.useParams();
  const [saree, setSaree] = useState(initialSaree);
  const [loading, setLoading] = useState(!initialSaree);
  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Catalog unavailable")))
      .then((catalog: { products?: Array<Record<string, unknown>> }) => {
        const liveProduct = (catalog.products ?? []).find((product) => String(product.id ?? "") === productId);
        if (liveProduct) setSaree(normalizeProduct(liveProduct, initialSaree));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [initialSaree, productId]);
  if (!saree) return <SiteShell><div className="mx-auto max-w-7xl px-5 py-24 text-center"><h1 className="font-display text-4xl text-primary">Product unavailable</h1><p className="mt-3 text-sm text-muted-foreground">{loading ? "Loading product details…" : "This product could not be found."}</p><Link to="/products" className="mt-7 inline-flex bg-primary px-5 py-3 text-eyebrow text-white">Back to products</Link></div></SiteShell>;
  return (
    <SiteShell>
      <ProductDetailContent saree={saree} />
    </SiteShell>
  );
}

function normalizeProduct(raw: Record<string, unknown>, fallback: (typeof sarees)[number] | null): (typeof sarees)[number] {
  return {
    id: String(raw.id ?? fallback?.id ?? ""),
    name: String(raw.name ?? fallback?.name ?? "Untitled product"),
    fabric: String(raw.fabric ?? fallback?.fabric ?? ""),
    price: Number(raw.price ?? fallback?.price ?? 0),
    category: String(raw.category ?? fallback?.category ?? ""),
    subcategory: raw.subcategory == null ? fallback?.subcategory : String(raw.subcategory),
    image: String(raw.image ?? fallback?.image ?? ""),
    images: Array.isArray(raw.images) ? raw.images.map(String).filter(Boolean).slice(0, 5) : fallback?.images,
    blouse: String(raw.blouse ?? fallback?.blouse ?? ""),
    length: String(raw.length ?? fallback?.length ?? ""),
    care: String(raw.care ?? fallback?.care ?? ""),
    weight: String(raw.weight ?? fallback?.weight ?? ""),
    countryOfOrigin: String(raw.countryOfOrigin ?? fallback?.countryOfOrigin ?? "India"),
    description: String(raw.productDescription ?? raw.description ?? fallback?.description ?? ""),
    productDetails: raw.productDetails == null ? fallback?.productDetails : String(raw.productDetails),
    productDescription: raw.productDescription == null ? fallback?.productDescription : String(raw.productDescription),
    productSpecification: raw.productSpecification == null ? fallback?.productSpecification : String(raw.productSpecification),
    addedOn: String(raw.addedOn ?? fallback?.addedOn ?? ""),
    featured: raw.featured === true,
    newArrival: raw.newArrival === true,
    trending: raw.trending === true,
    bestseller: raw.bestseller === true,
    originalPrice: raw.originalPrice == null ? fallback?.originalPrice : Number(raw.originalPrice),
    discountType: raw.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: raw.discountValue == null ? fallback?.discountValue : Number(raw.discountValue),
  };
}

function ProductInfoSections({ saree }: { saree: (typeof sarees)[number] }) {
  const [openInfo, setOpenInfo] = useState("details");
  const details = [
    ["Fabric", saree.fabric],
    ["Category", saree.category],
    ["Length", saree.length],
  ].filter(([, value]) => value);
  const specifications = [
    ["Weight", saree.weight],
    ["Care Instructions", saree.care],
    ["Country of Origin", saree.countryOfOrigin || "India"],
  ].filter(([, value]) => value);
  const sections = [
    ["details", "PRODUCT DETAILS", details],
    ["description", "PRODUCT DESCRIPTION", saree.description ? [["Description", saree.description]] : []],
    ["specification", "PRODUCT SPECIFICATION", specifications],
  ] as const;
  return (
    <div className="mt-8 border-y border-border">
      {sections.map(([id, title, rows]) => (
        <div key={id} className="border-b border-border last:border-b-0">
          <button type="button" aria-expanded={openInfo === id} onClick={() => setOpenInfo(openInfo === id ? "" : id)} className="flex w-full items-center justify-between gap-4 py-4 text-left text-xs font-medium tracking-[0.08em] text-primary">
            <span>{title}</span><span className="text-base font-normal">{openInfo === id ? "⌃" : "⌄"}</span>
          </button>
          {openInfo === id && <div className="space-y-2 pb-5 text-sm leading-relaxed text-muted-foreground">{rows.length ? rows.map(([label, value]) => <div key={label}><span className="font-medium text-foreground/80">{label}: </span><span className="whitespace-pre-line">{value}</span></div>) : <p>Product information will be added soon.</p>}</div>}
        </div>
      ))}
    </div>
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

  const gallery = (saree.images?.length ? saree.images : [saree.image]).filter(Boolean).slice(0, 5);
  const originalPrice = Number(saree.originalPrice ?? 0);
  const hasDiscount = originalPrice > saree.price && Number(saree.discountValue ?? 0) > 0;
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
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-gold">PRODUCT DESCRIPTION</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{saree.description || "Product description will be added soon."}</p>
          </div>
          <p className="mt-4 text-2xl tracking-wide text-foreground">
            {formatPrice(saree.price)}
          </p>
          {hasDiscount && <div className="flex items-center gap-3"><p className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice)}</p><span className="text-xs font-medium text-red-700">{saree.discountType === "fixed" ? `${formatPrice(Number(saree.discountValue))} OFF` : `${Number(saree.discountValue)}% OFF`}</span></div>}
          <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>
          <a href="#reviews" className="mt-3 inline-flex hover:opacity-80">
            <ProductRating summary={reviewSummary} />
          </a>

          <div className="mt-6 h-px bg-border" />

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

          <ProductInfoSections saree={saree} />
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
