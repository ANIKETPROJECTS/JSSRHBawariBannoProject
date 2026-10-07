import { useWishlist } from "./WishlistContext";
import { useReviewSummary } from "./ReviewsContext";
import { Link } from "@tanstack/react-router";
import { formatPrice, type Saree } from "@/data/sarees";
import buyNowIcon from "../../../attached_assets/shopping-bag_(3)_1787337643766.png";
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
  showBuyNow = false,
  editorial = false,
  videoSrc,
}: {
  saree: Saree;
  tall?: boolean;
  showBuyNow?: boolean;
  editorial?: boolean;
  videoSrc?: string;
}) {
  const { ids, toggle } = useWishlist();
  const reviewSummary = useReviewSummary(saree.id);
  const isWishlisted = ids.includes(saree.id);
  const showCardActions = !videoSrc && (showBuyNow || !editorial);
  const originalPrice = Number(saree.originalPrice ?? 0);
  const hasDiscount = originalPrice > saree.price && Number(saree.discountValue ?? 0) > 0;

  return (
    <article className="group block">
      <div className="relative overflow-hidden border border-border bg-card">
        <Link to="/products/$productId" params={{ productId: saree.id }} className="block">
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
        </Link>
        {showCardActions && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex translate-y-0 flex-col transition-transform duration-300 sm:translate-y-full sm:group-hover:translate-y-0 sm:group-focus-within:translate-y-0">
            <Link
              to="/products/$productId"
              params={{ productId: saree.id }}
              aria-label={`Buy ${saree.name} now`}
              className="flex min-h-10 w-full flex-none cursor-pointer items-center justify-center gap-1.5 bg-[#ED145B] px-2 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-white transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset sm:gap-2 sm:text-[0.68rem]"
            >
              <img src={buyNowIcon} alt="" aria-hidden="true" className="size-5 object-contain brightness-0 invert sm:size-6" />
              <span>Buy Now</span>
            </Link>
          </div>
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
          onClick={() => void toggle(saree.id)}
          className={`product-card-wishlist-button absolute right-2 top-2 flex size-9 cursor-pointer items-center justify-center rounded-full bg-transparent transition-colors sm:right-3 sm:top-3 ${
            isWishlisted ? "text-[#ED145B]" : "text-foreground/75 hover:text-[#ED145B]"
          }`}
        >
          <span className="relative size-[1.35rem] transition-transform duration-200 group-hover:scale-105 active:scale-90">
            <svg
              viewBox="0 0 512 512"
              aria-hidden="true"
              className={`wishlist-heart-fill absolute inset-0 size-full transition-opacity duration-200 ${
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
              className={`wishlist-heart-image relative size-full object-contain transition-opacity duration-200 ${
                isWishlisted ? "opacity-0" : "opacity-100"
              }`}
            />
          </span>
        </button>
      </div>
      <div className="pt-4">
        <Link to="/products/$productId" params={{ productId: saree.id }}>
          <h3
            className={`product-card-name ${editorial
              ? "font-sans text-xl font-medium leading-tight text-foreground transition-colors group-hover:text-primary"
              : "min-h-[2.75rem] overflow-hidden text-lg leading-snug text-foreground transition-colors group-hover:text-primary sm:min-h-[3.5rem] sm:text-2xl"}`}
            title={saree.name}
          >
            {saree.name}
          </h3>
        </Link>
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
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="product-card-price text-lg font-semibold tracking-wide text-[#ed145b] sm:text-xl">{formatPrice(saree.price)}</p>
            {hasDiscount && (
              <>
                <p className="product-card-original-price text-sm font-normal tracking-wide text-black line-through decoration-black sm:text-base">
                  {formatPrice(originalPrice)}
                </p>
                <span className="text-[0.65rem] font-normal text-green-600 sm:text-xs">
                  {saree.discountType === "fixed"
                    ? `${formatPrice(Number(saree.discountValue))} OFF`
                    : `${Number(saree.discountValue)}% OFF`}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
