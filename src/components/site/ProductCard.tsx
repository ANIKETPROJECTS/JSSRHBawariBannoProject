import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { formatPrice, type Saree } from "@/data/sarees";
import { useCart } from "./CartDrawer";
import cartIcon from "../../../attached_assets/shopping-bag_(3)_1787336793109.png";
import wishlistHeart from "../../../attached_assets/favorite_1787336225274.png";

export function ProductCard({
  saree,
  tall = false,
  showAddToCart = false,
}: {
  saree: Saree;
  tall?: boolean;
  showAddToCart?: boolean;
}) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addItem } = useCart();
  useEffect(() => {
    fetch("/api/auth/wishlist").then((response) => response.ok ? response.json() : null).then((result) => {
      if (result?.wishlist?.includes(saree.id)) setIsWishlisted(true);
    }).catch(() => undefined);
  }, [saree.id]);

  return (
    <Link
      to="/products/$productId"
      params={{ productId: saree.id }}
      className="group block"
    >
      <div className="relative overflow-hidden border border-border bg-card">
        <img
          src={saree.image}
          alt={saree.name}
          loading="lazy"
          width={900}
          height={1200}
          className={`${tall ? "aspect-[3/5]" : "aspect-[3/4]"} w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]`}
        />
        <button
          type="button"
          aria-label={isWishlisted ? `Remove ${saree.name} from wishlist` : `Add ${saree.name} to wishlist`}
          aria-pressed={isWishlisted}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsWishlisted((current) => {
              const next = !current;
              fetch("/api/auth/wishlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: saree.id }) }).catch(() => undefined);
              return next;
            });
          }}
          className={`absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm transition-colors ${
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
        <h3 className="overflow-hidden text-2xl leading-tight text-ellipsis text-foreground transition-colors group-hover:text-primary whitespace-nowrap">
          {saree.name}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-xl font-medium tracking-wide text-primary">{formatPrice(saree.price)}</p>
          <p className="text-base tracking-wide text-muted-foreground line-through">
            {formatPrice(Math.ceil((saree.price * 1.15) / 100) * 100)}
          </p>
          {showAddToCart && (
            <button
              type="button"
              aria-label={`Add ${saree.name} to cart`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
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
