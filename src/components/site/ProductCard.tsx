import { Link } from "@tanstack/react-router";
import { formatPrice, type Saree } from "@/data/sarees";

export function ProductCard({ saree, tall = false }: { saree: Saree; tall?: boolean }) {
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
