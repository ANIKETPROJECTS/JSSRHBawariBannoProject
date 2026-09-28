export type StorefrontProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
};

export function toStorefrontProduct(value: unknown): StorefrontProduct | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = String(record["id"] ?? "").trim();
  const images = Array.isArray(record["images"]) ? record["images"].map(String).filter(Boolean) : [];
  const image = String(record["image"] ?? images[0] ?? "").trim();
  if (!id || !image || record["published"] === false) return null;
  const price = Number(record["price"] ?? 0);
  return {
    id,
    name: String(record["name"] ?? id),
    price: Number.isFinite(price) ? price : 0,
    image,
  };
}