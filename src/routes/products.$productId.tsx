import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, Heart, Minus, Plus, Share2, ShoppingBag, Star } from "lucide-react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductRating, ProductReviews } from "@/components/site/ProductReviews";
import { ProductPolicies, ProductTrustStrip } from "@/components/site/ProductPolicies";
import { useCart } from "@/components/site/CartContext";
import { useReviewSummary } from "@/components/site/ReviewsContext";
import { useWishlist } from "@/components/site/WishlistContext";
import { formatPrice, sarees, type Saree, type SareeVariant } from "@/data/sarees";
import { getProductColor } from "@/data/colors";
import { getCachedStorefrontCatalog, loadStorefrontCatalog } from "@/lib/storefront-catalog";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/site/product-detail/ProductImage";
import "@/components/site/product-detail/product-detail.css";

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
    if (loading || typeof document === "undefined") return;
    document.title = saree
      ? `${saree.name} — ${saree.fabric} | Bawari Banno`
      : "Saree unavailable | Bawari Banno";
  }, [loading, saree]);

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
  const navigate = useNavigate();
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
      toast.success("Product link copied to your clipboard.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share this product right now.");
    } finally {
      setSharing(false);
    }
  }

  const gallery = (selectedProduct.images?.length ? selectedProduct.images : [selectedProduct.image]).filter(Boolean).slice(0, 5);
  const originalPrice = Number(saree.originalPrice ?? 0);
  const hasDiscount = originalPrice > saree.price && Number(saree.discountValue ?? 0) > 0;
  const sameCategoryRelated = sarees.filter(
    (s) => s.id !== saree.id && s.category === saree.category,
  );
  const otherCategoryRelated = sarees.filter(
    (s) => s.id !== saree.id && s.category !== saree.category,
  );
  const related = [...sameCategoryRelated, ...otherCategoryRelated].slice(0, 4);

  return (
    <div className="product-page">
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
          {gallery.length > 0 && <div className="flex w-14 shrink-0 flex-col gap-2 sm:w-16 sm:gap-3">
            {gallery.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show ${saree.name} view ${i + 1}`}
                aria-pressed={active === i}
                className={cn(
                  "product-detail-gallery-thumb",
                  active === i && "is-active",
                )}
              >
                <ProductImage
                  key={img}
                  src={img}
                  alt={`${saree.name} view ${i + 1}`}
                  className="aspect-[3/4] w-full object-cover"
                />
              </button>
            ))}
          </div>}
          <div className="product-detail-main-image">
            {gallery[active] ? (
              <ProductImage
                key={gallery[active]}
                src={gallery[active]}
                alt={saree.name}
                loading="eager"
              />
            ) : (
              <ProductImage alt={saree.name} />
            )}
          </div>
        </div>

        <div className="product-detail-copy">
          <p className="product-detail-brand">BAWARI BANNO</p>
          <h1 className="product-detail-title page-title-light mt-2 font-display text-primary">{saree.name}</h1>
          <p className="product-detail-fabric">{saree.fabric}</p>
          <a href="#reviews" className="product-detail-rating mt-4 hover:border-primary/40">
            <Star className="size-4 fill-[#14958f] text-[#14958f]" aria-hidden="true" />
            <ProductRating summary={reviewSummary} />
          </a>

          <div className="product-detail-divider" />

          <div className="product-detail-price-block">
            <p className="product-detail-price">{formatPrice(saree.price)}</p>
            {hasDiscount && (
              <div className="product-detail-price-note">
                <span className="line-through">{formatPrice(originalPrice)}</span>
                <span className="product-detail-discount">
                  {saree.discountType === "fixed"
                    ? `${formatPrice(Number(saree.discountValue))} OFF`
                    : `${Number(saree.discountValue)}% OFF`}
                </span>
              </div>
            )}
            <p className="product-detail-tax-note">Inclusive of all taxes</p>
          </div>

          {variantOptions.length > 0 && (
            <div className="product-detail-colors mt-6">
              <p className="product-detail-color-title">MORE COLORS</p>
              <div className="product-detail-color-grid mt-3">
                {variantOptions.map((variant) => {
                  const isSelected = variant.id === selectedVariant?.id;
                  const isAvailable = variant.stock > 0;
                  const color = getProductColor(variant.color);
                  const colorLabel = color?.label ?? variant.color;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      aria-label={`${colorLabel}${isAvailable ? "" : ", sold out"}`}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={cn(
                        "product-detail-color-option",
                        isSelected && "is-selected",
                        !isAvailable && "opacity-55",
                      )}
                    >
                      <ProductImage
                        key={variant.image}
                        src={variant.image}
                        alt=""
                        fallbackClassName="size-full"
                        className="size-full object-cover"
                      />
                      <span className="product-detail-color-name">{colorLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="product-detail-divider mt-6" />

          <div className="product-detail-purchase-actions mt-8">
              <div className="product-detail-quantity flex items-center border">
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
              className="product-detail-cart-button inline-flex h-12 min-w-0 items-center justify-center gap-1 whitespace-nowrap px-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:gap-2 sm:px-3"
            >
              <ShoppingBag className="size-3.5 shrink-0" strokeWidth={1.6} /> {availableStock === 0 ? "Sold Out" : "Add to Cart"}
            </button>
            <button
              type="button"
              disabled={availableStock === 0}
              onClick={() => {
                addItem(selectedProduct, qty, { showToast: false });
                void navigate({ to: "/checkout", search: { coupon: undefined } });
              }}
              className="product-detail-buy-button inline-flex h-12 min-w-0 items-center justify-center gap-1 whitespace-nowrap border px-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:gap-2 sm:px-3"
            >
              Buy now <ChevronRight className="size-3.5 shrink-0" strokeWidth={1.6} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
            <button
              type="button"
              aria-pressed={isWishlisted}
              onClick={() => void toggleWishlist(saree.id)}
              className={cn(
                "product-detail-secondary-action inline-flex min-w-0 flex-1 items-center justify-center gap-2 border px-2.5 py-3 transition-colors sm:flex-none sm:px-5 sm:text-eyebrow",
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
              className="product-detail-secondary-action inline-flex min-w-0 flex-1 items-center justify-center gap-2 border px-2.5 py-3 transition-colors disabled:cursor-wait disabled:opacity-60 sm:flex-none sm:px-5 sm:text-eyebrow"
            >
              <Share2 className="size-4" strokeWidth={1.6} />
              {sharing ? "Sharing…" : "Share Product"}
            </button>
          </div>

          <div className="product-detail-delivery-note">
            <p className="product-detail-color-title">DELIVERY &amp; RETURNS</p>
            <p>Dispatch in 1–2 business days. Delivery and return details are available below.</p>
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
    </div>
  );
}
