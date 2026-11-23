import { useEffect, useState } from "react";
import type { Saree } from "@/data/sarees";

export function CartProductImage({ product, className = "" }: { product: Saree; className?: string }) {
  const selectedVariant = product.variants?.find((variant) => variant.id === product.selectedVariantId);
  const sources = [...new Set([
    selectedVariant?.image,
    ...(selectedVariant?.images ?? []),
    product.image,
    ...(product.images ?? []),
  ].filter((source): source is string => Boolean(source?.trim())))];
  const sourceKey = sources.join("\n");
  const [failedSources, setFailedSources] = useState<string[]>([]);
  useEffect(() => setFailedSources([]), [sourceKey]);
  const source = sources.find((candidate) => !failedSources.includes(candidate));

  if (!source) {
    return <div role="img" aria-label={`${product.name} image unavailable`} className={`shrink-0 bg-white ${className}`} />;
  }

  return (
    <img
      src={source}
      alt={product.name}
      className={`shrink-0 bg-white object-contain ${className}`}
      onError={() => setFailedSources((current) => [...current, source])}
    />
  );
}
