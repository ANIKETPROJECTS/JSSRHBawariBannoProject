import type { Saree } from "@/data/sarees";

export type Filters = {
  availability: "all" | "in-stock" | "out-of-stock";
  price: "all" | "under-5000" | "5000-15000" | "15000-30000" | "over-30000";
  discount: "all" | "on-sale" | "full-price";
  blousePiece: "all" | "with" | "without";
  size: string[];
  colors: string[];
  fabrics: string[];
  occasion: string[];
  technique: string[];
  pattern: string[];
  borderType: string[];
};

export const defaultFilters: Filters = {
  availability: "all",
  price: "all",
  discount: "all",
  blousePiece: "all",
  size: [],
  colors: [],
  fabrics: [],
  occasion: [],
  technique: [],
  pattern: [],
  borderType: [],
};

export type ProductFilterKey =
  | "size"
  | "occasion"
  | "technique"
  | "pattern"
  | "borderType";

function includesAny(value: string, options: string[]) {
  return options.length === 0 || options.some((option) => value.toLowerCase() === option.toLowerCase());
}

export function getProductFilterValue(product: Saree, key: ProductFilterKey) {
  if (key === "size") return product.size || "Free Size";
  if (key === "occasion") {
    if (product.occasion) return product.occasion;
    if (product.category === "wedding") return "Wedding";
    if (product.category === "designer") return "Party";
    if (product.category === "cotton") return "Everyday";
    return "Festive";
  }
  if (key === "technique") {
    if (product.technique) return product.technique;
    const details = `${product.fabric} ${product.description}`.toLowerCase();
    if (details.includes("block print")) return "Block Print";
    if (details.includes("handloom") || details.includes("pit loom")) return "Handloom";
    if (details.includes("embroider") || details.includes("sequin")) return "Embroidered";
    return "Woven";
  }
  if (key === "pattern") {
    if (product.pattern) return product.pattern;
    const details = `${product.name} ${product.description}`.toLowerCase();
    if (details.includes("floral") || details.includes("bloom")) return "Floral";
    if (details.includes("print")) return "Printed";
    if (details.includes("buti") || details.includes("paisley")) return "Buti & Paisley";
    return "Woven Motif";
  }
  if (product.borderType) return product.borderType;
  const details = `${product.name} ${product.description}`.toLowerCase();
  if (details.includes("scallop")) return "Scalloped";
  if (details.includes("contrast")) return "Contrast";
  if (details.includes("zari") || details.includes("gold")) return "Zari";
  return "Woven";
}

export function productMatchesFilterOptions(product: Saree, filters: Filters) {
  const priceMatch =
    filters.price === "all" ||
    (filters.price === "under-5000" && product.price < 5000) ||
    (filters.price === "5000-15000" && product.price >= 5000 && product.price <= 15000) ||
    (filters.price === "15000-30000" && product.price > 15000 && product.price <= 30000) ||
    (filters.price === "over-30000" && product.price > 30000);
  const availabilityMatch =
    filters.availability === "all" ||
    (filters.availability === "in-stock" && (product.stock ?? 1) > 0) ||
    (filters.availability === "out-of-stock" && (product.stock ?? 0) <= 0);
  const hasDiscount = Number(product.originalPrice ?? 0) > product.price && Number(product.discountValue ?? 0) > 0;
  const discountMatch =
    filters.discount === "all" ||
    (filters.discount === "on-sale" && hasDiscount) ||
    (filters.discount === "full-price" && !hasDiscount);
  const blouseMatch =
    filters.blousePiece === "all" ||
    (filters.blousePiece === "with" && Boolean(product.blouse)) ||
    (filters.blousePiece === "without" && !product.blouse);
  const colors = product.colors ?? product.variants?.map((variant) => variant.color) ?? [];
  const colorMatch = filters.colors.length === 0 || colors.some((color) => includesAny(color, filters.colors));
  const fabricMatch = filters.fabrics.length === 0 || includesAny(product.fabric, filters.fabrics);
  const attributeMatch = (key: ProductFilterKey, selected: string[]) =>
    selected.length === 0 || selected.includes(getProductFilterValue(product, key));

  return (
    priceMatch &&
    availabilityMatch &&
    discountMatch &&
    blouseMatch &&
    colorMatch &&
    fabricMatch &&
    attributeMatch("size", filters.size) &&
    attributeMatch("occasion", filters.occasion) &&
    attributeMatch("technique", filters.technique) &&
    attributeMatch("pattern", filters.pattern) &&
    attributeMatch("borderType", filters.borderType)
  );
}