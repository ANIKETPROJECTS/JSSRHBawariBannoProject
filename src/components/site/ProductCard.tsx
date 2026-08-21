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
        <span className="absolute left-3 top-3 border border-gold/60 bg-background/85 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-primary">
          {saree.fabric}
        </span>
      </div>
      <div className="pt-4">
        <h3 className="font-display text-xl leading-tight text-foreground transition-colors group-hover:text-primary">
          {saree.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{saree.fabric}</p>
        <p className="mt-2 text-sm tracking-wide text-primary">{formatPrice(saree.price)}</p>
      </div>
    </Link>
  );
}
