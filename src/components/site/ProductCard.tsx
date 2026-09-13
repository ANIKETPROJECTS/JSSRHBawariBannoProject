import { useWishlist } from "./WishlistContext";
import { useReviewSummary } from "./ReviewsContext";
import { Link } from "@tanstack/react-router";
import { formatPrice, type Saree } from "@/data/sarees";
import { useCart } from "./CartDrawer";
import { toast } from "sonner";
import cartIcon from "../../../attached_assets/shopping-bag_(3)_1787336793109.png";
import wishlistHeart from "../../../attached_assets/favorite_1787336225274.png";

function formatReviewCount(count: number) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  return count.toLocaleString("en-IN");
}

function editorialReviewCount(productId: string) {
  const seed = [...productId].reduce((total, character) => total + character.charCodeAt(0), 0);
  return 10 + (seed % 6);
}

export function ProductCard({
  saree,
  tall = false,
  showAddToCart = false,
  editorial = false,
  videoSrc,
}: {
  saree: Saree;
  tall?: boolean;
  showAddToCart?: boolean;
  editorial?: boolean;
  videoSrc?: string;
}) {
  const { ids, toggle } = useWishlist();
  const { addItem } = useCart();
  const reviewSummary = useReviewSummary(saree.id);
  const isWishlisted = ids.includes(saree.id);
  const originalPrice = Number(saree.originalPrice ?? 0);
  const hasDiscount = originalPrice > saree.price && Number(saree.discountValue ?? 0) > 0;

  return (
    <Link
      to="/products/$productId"
      params={{ productId: saree.id }}
      className="group block"
    >
      <div className="relative overflow-hidden border border-border bg-card">
        {videoSrc ? (
          <video
            src={videoSrc}
            poster={saree.image}
            autoPlay
            loop
            muted
            playsInline
            aria-label={`Video of ${saree.name}`}
            className={`${tall ? "aspect-[3/5]" : "aspect-[3/4]"} w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]`}
          />
        ) : (
          <img
            src={saree.image}
            alt={saree.name}
            loading="lazy"
            width={900}
            height={1200}
            className={`${tall ? "aspect-[3/5]" : "aspect-[3/4]"} w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]`}
          />
        )}
        {editorial && (
          <span
            className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1.5 text-sm font-medium text-slate-900 shadow-sm backdrop-blur-sm"
            aria-label={`5.0 star rating from ${editorialReviewCount(saree.id)} reviews`}
          >
            <span>5.0</span>
            <span className="text-base leading-none text-[#FFD700]" aria-hidden="true">★</span>
            <span className="text-slate-400" aria-hidden="true">|</span>
            <span className="text-xs text-slate-700">
              {formatReviewCount(editorialReviewCount(saree.id))}
            </span>
          </span>
        )}
        <button
          type="button"
          aria-label={isWishlisted ? `Remove ${saree.name} from wishlist` : `Add ${saree.name} to wishlist`}
          aria-pressed={isWishlisted}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void toggle(saree.id);
          }}
          className={`absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm transition-colors sm:right-3 sm:top-3 ${
            isWishlisted ? "text-red-600" : "text-foreground/75 hover:text-red-600"
          }`}
        >
          <span className="relative size-[1.35rem] transition-transform duration-200 group-hover:scale-105 active:scale-90">
            <svg
              viewBox="0 0 512 512"
              aria-hidden="true"
              className={`absolute inset-0 size-full transition-opacity duration-200 ${
                isWishlisted ? "opacity-100" : "opacity-0"
              }`}
            >
              <path
                d="M256 480C232 460 32 304 32 177 32 95 93 32 174 32c39 0 71 17 82 37 11-20 43-37 82-37 81 0 142 63 142 145 0 127-200 283-224 303Z"
                fill="currentColor"
              />
            </svg>
            <img
              src={wishlistHeart}
              alt=""
              aria-hidden="true"
              className="relative size-full object-contain transition-opacity duration-200"
              style={{
                filter: isWishlisted
                  ? "brightness(0) saturate(100%) invert(19%) sepia(93%) saturate(3480%) hue-rotate(348deg) brightness(91%) contrast(94%)"
                  : "none",
              }}
            />
          </span>
        </button>
      </div>
      <div className="pt-4">
        <h3
          className={`product-card-name ${editorial
            ? "font-sans text-xl font-medium leading-tight text-foreground transition-colors group-hover:text-primary"
            : "min-h-[2.75rem] overflow-hidden text-lg leading-snug text-foreground transition-colors group-hover:text-primary sm:min-h-[3.5rem] sm:text-2xl"}`}
          title={saree.name}
        >
          {saree.name}
        </h3>
        {!editorial && (
          <div className="mt-2 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {reviewSummary.count > 0 ? (
              <>
                <span className="tracking-[0.12em] text-gold" aria-label={`${reviewSummary.average} out of 5 stars`}>
                  {"★".repeat(Math.max(0, Math.min(5, Math.round(reviewSummary.average))))}
                </span>
                <span>{reviewSummary.average.toFixed(1)} ({reviewSummary.count})</span>
              </>
            ) : (
              <span>No reviews yet</span>
            )}
          </div>
        )}
        <div className={`${editorial ? "mt-1" : "mt-2"} flex flex-wrap items-center gap-x-2 gap-y-1`}>
           <p className="text-lg font-medium tracking-wide text-accent sm:text-xl">{formatPrice(saree.price)}</p>
          {hasDiscount && <><p className="text-sm tracking-wide text-muted-foreground line-through sm:text-base">{formatPrice(originalPrice)}</p><span className="text-[0.65rem] font-medium text-red-700 sm:text-xs">{saree.discountType === "fixed" ? `${formatPrice(Number(saree.discountValue))} OFF` : `${Number(saree.discountValue)}% OFF`}</span></>}
          {showAddToCart && (
            <button
              type="button"
              aria-label={`Add ${saree.name} to cart`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (saree.variants?.length) {
                  toast.info("Choose a color on the product page before adding it to your bag.");
                  return;
                }
                addItem(saree);
              }}
              className="ml-auto flex size-7 shrink-0 items-center justify-center transition-transform hover:scale-110 active:scale-95"
            >
              <img src={cartIcon} alt="" aria-hidden="true" className="size-6 object-contain" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
