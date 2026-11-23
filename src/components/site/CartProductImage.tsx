import { useEffect, useState } from "react";
import type { Saree } from "@/data/sarees";

export function CartProductImage({ product, className = "" }: { product: Saree; className?: string }) {
  const selectedVariant = product.variants?.find((variant) => variant.id === product.selectedVariantId);
  const productSources = [
    selectedVariant?.image,
    ...(selectedVariant?.images ?? []),
    product.image,
    ...(product.images ?? []),
  ].filter((source): source is string => Boolean(source?.trim()));
  const sources = [...new Set(productSources.flatMap((source) => (
    source.startsWith("/allimages/")
      ? [source, new URL(source, "https://bawaribanno.com").href]
      : [source]
  )))];
  const sourceKey = sources.join("\n");
  const [failedSources, setFailedSources] = useState<string[]>([]);
  useEffect(() => setFailedSources([]), [sourceKey]);
  const source = sources.find((candidate) => !failedSources.includes(candidate));

  if (!source) {
    return <div role="img" aria-label={`${product.name} image unavailable`} className={`shrink-0 bg-transparent ${className}`} />;
  }

  return (
    <img
      src={source}
      alt={product.name}
      className={`shrink-0 bg-transparent object-contain ${className}`}
      onError={() => setFailedSources((current) => [...current, source])}
    />
  );
}
