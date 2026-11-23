import { useState } from "react";

type ProductImageProps = {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  loading?: "eager" | "lazy";
};

export function ProductImage({
  src,
  alt,
  className = "",
  fallbackClassName = "",
  loading = "lazy",
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        role="img"
        aria-label={`${alt || "Product"} image unavailable`}
        className={`product-image-fallback ${fallbackClassName}`}
      >
        <span className="product-image-fallback-mark" aria-hidden="true" />
        <span>Image unavailable</span>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      width={900}
      height={1200}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
