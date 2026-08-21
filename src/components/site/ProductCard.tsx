import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { formatPrice, type Saree } from "@/data/sarees";

export function ProductCard({ saree, tall = false }: { saree: Saree; tall?: boolean }) {
  const [isWishlisted, setIsWishlisted] = useState(false);

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
            setIsWishlisted((current) => !current);
          }}
          className={`absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm transition-colors ${
            isWishlisted ? "text-red-600" : "text-foreground/75 hover:text-red-600"
          }`}
        >
          <Heart className="size-5" fill={isWishlisted ? "currentColor" : "none"} strokeWidth={1.7} />
        </button>
      </div>
      <div className="pt-4">
        <h3 className="overflow-hidden text-2xl leading-tight text-ellipsis text-foreground transition-colors group-hover:text-primary whitespace-nowrap">
          {saree.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-xl font-medium tracking-wide text-primary">{formatPrice(saree.price)}</p>
          <p className="text-base tracking-wide text-muted-foreground line-through">
            {formatPrice(Math.ceil((saree.price * 1.15) / 100) * 100)}
          </p>
        </div>
      </div>
    </Link>
  );
}
