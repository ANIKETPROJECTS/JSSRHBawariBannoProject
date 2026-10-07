import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Heart, Minus, Plus, Share2, ShoppingBag } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductRating, ProductReviews } from "@/components/site/ProductReviews";
import { ProductPolicies, ProductTrustStrip } from "@/components/site/ProductPolicies";
import { useCart } from "@/components/site/CartDrawer";
import { useReviewSummary } from "@/components/site/ReviewsContext";
import { useWishlist } from "@/components/site/WishlistContext";
import { formatPrice, sarees, type Saree, type SareeVariant } from "@/data/sarees";
import { getProductColor } from "@/data/colors";
import { getCachedStorefrontCatalog, loadStorefrontCatalog } from "@/lib/storefront-catalog";
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
  const immediateSaree = useMemo(() => {
    if (initialSaree) return initialSaree;
    const cachedProduct = getCachedStorefrontCatalog()?.products.find(
      (product) => String(product.id ?? "") === productId,
    );
    return cachedProduct ? normalizeProduct(cachedProduct, null) : null;
  }, [initialSaree, productId]);
  const [productState, setProductState] = useState<{
    productId: string;
    saree: Saree | null;
    loading: boolean;
  }>(() => ({ productId, saree: immediateSaree, loading: !immediateSaree }));
  const currentProductState = productState.productId === productId
    ? productState
    : { productId, saree: immediateSaree, loading: !immediateSaree };
  const { saree, loading } = currentProductState;

  useEffect(() => {
    let active = true;
    void loadStorefrontCatalog()
      .then((catalog) => {
        if (!active) return;
        const liveProduct = catalog.products.find((product) => String(product.id ?? "") === productId);
        if (liveProduct) {
          setProductState({ productId, saree: normalizeProduct(liveProduct, immediateSaree), loading: false });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!active) return;
        setProductState((current) => current.productId === productId
          ? { ...current, loading: false }
          : { productId, saree: immediateSaree, loading: false });
      });

    return () => {
      active = false;
    };
  }, [immediateSaree, productId]);

  if (!saree && loading) {
    return <SiteShell><ProductDetailLoading /></SiteShell>;
  }
  if (!saree) {
    return <SiteShell><div className="mx-auto max-w-7xl px-5 py-24 text-center"><h1 className="font-display text-4xl text-primary">Product unavailable</h1><p className="mt-3 text-sm text-muted-foreground">This product could not be found.</p><Link to="/products" className="mt-7 inline-flex bg-primary px-5 py-3 text-eyebrow text-white">Back to products</Link></div></SiteShell>;
  }
  return (
    <SiteShell>
      <ProductDetailContent saree={saree} />
    </SiteShell>
  );
}

function ProductDetailLoading() {
  return (
    <>
      <div className="product-detail-breadcrumb-wrap">
        <div className="h-3 w-40 animate-pulse bg-secondary/70" />
      </div>
      <section className="product-detail-frame" aria-busy="true" aria-label="Loading product details">
        <div className="aspect-[3/4] w-full animate-pulse bg-secondary/70" />
        <div className="product-detail-copy space-y-5">
          <p role="status" className="text-sm text-muted-foreground">Loading product details…</p>
          <div className="h-3 w-28 animate-pulse bg-secondary/70" />
          <div className="h-10 w-4/5 animate-pulse bg-secondary/70" />
          <div className="h-20 w-full animate-pulse bg-secondary/70" />
          <div className="h-8 w-32 animate-pulse bg-secondary/70" />
          <div className="h-12 w-full animate-pulse bg-secondary/70" />
        </div>
      </section>
    </>
  );
}

function normalizeProduct(raw: Record<string, unknown>, fallback: (typeof sarees)[number] | null): (typeof sarees)[number] {
  const variants = Array.isArray(raw.variants)
    ? raw.variants.map((entry, index): SareeVariant | null => {
      const row = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      const images = Array.isArray(row.images) ? row.images.map(String).filter(Boolean).slice(0, 5) : [];
      const image = String(row.image ?? images[0] ?? "");
      const color = String(row.color ?? "");
      if (!color || !image) return null;
      return {
        id: String(row.id ?? `${String(raw.id ?? fallback?.id ?? "product")}-variant-${index + 1}`),
        color,
        stock: Math.max(0, Math.trunc(Number(row.stock ?? 0))),
        image,
        images: images.length ? images : [image],
      };
    }).filter((variant): variant is SareeVariant => Boolean(variant))
    : fallback?.variants;
  return {
    id: String(raw.id ?? fallback?.id ?? ""),
    name: String(raw.name ?? fallback?.name ?? "Untitled product"),
    fabric: String(raw.fabric ?? fallback?.fabric ?? ""),
    price: Number(raw.price ?? fallback?.price ?? 0),
    category: String(raw.category ?? fallback?.category ?? ""),
    subcategory: raw.subcategory == null ? fallback?.subcategory : String(raw.subcategory),
    image: String(raw.image ?? fallback?.image ?? ""),
    images: Array.isArray(raw.images) ? raw.images.map(String).filter(Boolean).slice(0, 5) : fallback?.images,
    variants,
    stock: raw.stock == null ? fallback?.stock : Math.max(0, Math.trunc(Number(raw.stock))),
    blouse: String(raw.blouse ?? fallback?.blouse ?? ""),
    size: raw.size == null ? fallback?.size : String(raw.size),
    occasion: raw.occasion == null ? fallback?.occasion : String(raw.occasion),
    technique: raw.technique == null ? fallback?.technique : String(raw.technique),
    pattern: raw.pattern == null ? fallback?.pattern : String(raw.pattern),
    borderType: raw.borderType == null ? fallback?.borderType : String(raw.borderType),
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

function ProductDetailContent({ saree }: { saree: (typeof sarees)[number] }) {
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(saree.variants?.[0]?.id ?? "");
  const { addItem } = useCart();
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlist();
  const reviewSummary = useReviewSummary(saree.id);
  const [sharing, setSharing] = useState(false);
  const isWishlisted = wishlistIds.includes(saree.id);
  const variantOptions = saree.variants ?? [];
  const variantKey = variantOptions.map((variant) => variant.id).join("|");
  const selectedVariant = variantOptions.find((variant) => variant.id === selectedVariantId) ?? variantOptions[0];
  const selectedProduct = selectedVariant
    ? {
      ...saree,
      image: selectedVariant.image,
      images: selectedVariant.images?.length ? selectedVariant.images : [selectedVariant.image],
      stock: selectedVariant.stock,
      selectedVariantId: selectedVariant.id,
      selectedVariantColor: selectedVariant.color,
    }
    : saree;
  const availableStock = selectedVariant?.stock ?? saree.stock;
  const maxQuantity = availableStock == null ? 9 : Math.min(9, Math.max(1, availableStock));

  useEffect(() => {
    setSelectedVariantId((current) => variantOptions.some((variant) => variant.id === current) ? current : (variantOptions[0]?.id ?? ""));
  }, [saree.id, variantKey]);

  useEffect(() => {
    setActive(0);
    setQty(1);
  }, [selectedVariantId]);

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

  const gallery = (selectedProduct.images?.length ? selectedProduct.images : [selectedProduct.image]).filter(Boolean).slice(0, 5);
  const originalPrice = Number(saree.originalPrice ?? 0);
  const hasDiscount = originalPrice > saree.price && Number(saree.discountValue ?? 0) > 0;
  const related = sarees
    .filter((s) => s.id !== saree.id && s.category === saree.category)
    .slice(0, 4);

  return (
    <>
      <div className="product-detail-breadcrumb-wrap">
        <nav className="product-detail-breadcrumbs">
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

      <section className="product-detail-frame">
        <div className="product-detail-gallery flex self-start gap-2 sm:gap-4">
          <div className="flex w-14 shrink-0 flex-col gap-2 sm:w-16 sm:gap-3">
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

        <div className="product-detail-copy">
          <p className="text-eyebrow text-muted-foreground">{saree.fabric}</p>
          <h1 className="product-detail-title page-title-light mt-3 font-display text-primary">{saree.name}</h1>
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

          {variantOptions.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Available Colors</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {variantOptions.map((variant) => {
                  const isSelected = variant.id === selectedVariant?.id;
                  const isAvailable = variant.stock > 0;
                  const color = getProductColor(variant.color);
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={cn(
                        "flex items-center gap-2 border p-2 text-left transition-colors",
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-gold",
                        !isAvailable && "opacity-55",
                      )}
                    >
                      <img src={variant.image} alt="" className="size-10 shrink-0 object-cover" />
                       <span className="min-w-0">
                         <span className="flex items-center gap-1.5 truncate text-xs text-primary">
                           <span className="size-3 shrink-0 rounded-full border border-black/10" style={color ? { backgroundColor: color.hex } : undefined} />
                           {color?.label ?? variant.color}
                         </span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">{isAvailable ? `${variant.stock} available` : "Sold out"}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 h-px bg-border" />

          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
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
                onClick={() => setQty((q) => Math.min(maxQuantity, q + 1))}
                className="p-3 text-foreground/70 hover:text-primary"
              >
                <Plus className="size-3.5" strokeWidth={1.8} />
              </button>
            </div>

            <button
              type="button"
              disabled={availableStock === 0}
              onClick={() => addItem(selectedProduct, qty)}
              className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 bg-primary px-4 py-3.5 text-eyebrow text-primary-foreground transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50 sm:px-8"
            >
              <ShoppingBag className="size-4" strokeWidth={1.6} /> {availableStock === 0 ? "Sold Out" : "Add to Cart"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
            <button
              type="button"
              aria-pressed={isWishlisted}
              onClick={() => void toggleWishlist(saree.id)}
              className={cn(
                "inline-flex min-w-0 flex-1 items-center justify-center gap-2 border px-3 py-3 text-[0.62rem] transition-colors sm:flex-none sm:px-5 sm:text-eyebrow",
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
              className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 border border-border px-3 py-3 text-[0.62rem] text-primary transition-colors hover:border-gold hover:bg-gold/5 disabled:cursor-wait disabled:opacity-60 sm:flex-none sm:px-5 sm:text-eyebrow"
            >
              <Share2 className="size-4" strokeWidth={1.6} />
              {sharing ? "Sharing…" : "Share Product"}
            </button>
          </div>

          <ProductPolicies saree={saree} />
          <ProductTrustStrip />
        </div>
      </section>

      <div className="product-detail-reviews-container">
        <ProductReviews productId={saree.id} />
      </div>

      {related.length > 0 && (
        <section className="product-recommendations-band">
          <div className="product-recommendations-inner">
            <h2 className="product-recommendations-title">You May Also Like</h2>
            <div className="product-recommendations-ornament" aria-hidden="true" />
            <div className={`product-recommendations-grid${related.length < 4 ? " is-short" : ""}`}>
              {related.map((item) => (
                <ProductCard key={item.id} saree={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
