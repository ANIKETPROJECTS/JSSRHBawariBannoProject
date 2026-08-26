import { useEffect, useMemo, useState } from "react";
import { CategorySidebar, type Filters, type Selection } from "@/components/site/CategorySidebar";
import { ProductCard } from "@/components/site/ProductCard";
import { categories, sarees, type CategoryNode, type Saree } from "@/data/sarees";
import { getColorFilterKey, productColors, type ProductColorOption } from "@/data/colors";

type Sort = "featured" | "price-asc" | "price-desc" | "newest";

const sortLabels: Record<Sort, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  newest: "Newest",
};

const categoryDetails: Record<string, { title: string; description: string }> = {
  all: {
    title: "All Sarees",
    description: "Nine heirloom weaves currently on the shelf, from everyday handloom cottons to occasion-ready silks, each traced to its loom.",
  },
  silk: {
    title: "Silk Sarees",
    description: "Lustrous silk drapes woven for celebrations, with temple borders, brocade details and the unmistakable richness of Indian craft.",
  },
  cotton: {
    title: "Cotton Sarees",
    description: "Light, breathable handloom cottons made for long days, warm weather and the quiet luxury of an easy, beautiful drape.",
  },
  designer: {
    title: "Designer Sarees",
    description: "Contemporary silhouettes and thoughtful embellishment for evenings that call for something a little more unexpected.",
  },
  wedding: {
    title: "Wedding Collection",
    description: "Ceremonial sarees with generous zari, rich colour and the presence to become part of your family story.",
  },
};

function getSareeColor(id: string) {
  if (id.includes("maroon") || id.includes("crimson")) return "maroon";
  if (id.includes("blue")) return "blue";
  if (id.includes("emerald")) return "green";
  if (id.includes("ivory")) return "ivory";
  if (id.includes("pink") || id.includes("blush")) return "pink";
  if (id.includes("indigo")) return "indigo";
  if (id.includes("plum")) return "plum";
  if (id.includes("mustard")) return "mustard";
  return "ivory";
}

export type CollectionPageProps = {
  eyebrow?: string;
  title: string;
  description: string;
  products?: Saree[];
  productFilter?: (saree: Saree) => boolean;
  initialSelection?: Selection;
};

function categoryTreeFromRecords(records: unknown[]): CategoryNode[] {
  const items = records
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .filter((item) => item.published !== false && String(item.slug ?? "").trim());
  return items
    .filter((item) => !item.parentSlug)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((parent) => {
      const id = String(parent.slug);
      const children = items
        .filter((item) => String(item.parentSlug ?? "") === id)
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
        .map((child) => ({ id: String(child.slug), label: String(child.label ?? child.name ?? child.slug) }));
      return {
        id,
        label: String(parent.label ?? parent.name ?? id),
        ...(children.length ? { children } : {}),
      };
    });
}

function sareesFromRecords(records: unknown[]): Saree[] {
  return records
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .filter((item) => item.published !== false && String(item.id ?? "").trim())
    .map((item) => {
      const images = Array.isArray(item.images) ? item.images.map(String).filter(Boolean) : [];
      return {
        id: String(item.id),
        name: String(item.name ?? item.id),
        fabric: String(item.fabric ?? ""),
        price: Number(item.price ?? 0),
        category: String(item.category ?? ""),
        ...(item.subcategory ? { subcategory: String(item.subcategory) } : {}),
        image: String(item.image ?? images[0] ?? ""),
        ...(images.length ? { images: images.slice(0, 5) } : {}),
        blouse: String(item.blouse ?? ""),
        length: String(item.length ?? ""),
        care: String(item.care ?? ""),
        weight: String(item.weight ?? ""),
        countryOfOrigin: String(item.countryOfOrigin ?? "India"),
        description: String(item.description ?? ""),
        ...(item.productDetails ? { productDetails: String(item.productDetails) } : {}),
        ...(item.productDescription || item.description ? { productDescription: String(item.productDescription ?? item.description) } : {}),
        ...(item.productSpecification ? { productSpecification: String(item.productSpecification) } : {}),
        addedOn: String(item.addedOn ?? item.createdAt ?? ""),
        ...(item.featured ? { featured: true } : {}),
        ...(item.originalPrice != null ? { originalPrice: Number(item.originalPrice) } : {}),
        ...(item.discountType === "fixed" || item.discountType === "percentage" ? { discountType: item.discountType } : {}),
        ...(item.discountValue != null ? { discountValue: Number(item.discountValue) } : {}),
        ...(item.newArrival === true ? { newArrival: true } : {}),
        ...(item.trending === true ? { trending: true } : {}),
        ...(item.bestseller === true ? { bestseller: true } : {}),
        ...(Array.isArray(item.variants) ? {
          variants: item.variants.map((variant, index) => {
            const row = variant && typeof variant === "object" ? variant as Record<string, unknown> : {};
            const images = Array.isArray(row.images) ? row.images.map(String).filter(Boolean).slice(0, 5) : [];
            return {
              id: String(row.id ?? `${String(item.id)}-variant-${index + 1}`),
              color: String(row.color ?? ""),
              stock: Math.max(0, Math.trunc(Number(row.stock ?? 0))),
              image: String(row.image ?? images[0] ?? ""),
              ...(images.length ? { images } : {}),
            };
          }).filter((variant) => variant.color && variant.image),
        } : {}),
      };
    });
}

export function CollectionPage({
  eyebrow = "The Collection",
  title,
  description,
  products,
  productFilter,
  initialSelection = { category: null, subcategory: null },
}: CollectionPageProps) {
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [sort, setSort] = useState<Sort>("featured");
  const [filters, setFilters] = useState<Filters>({
    price: "all",
    colors: [],
    fabrics: [],
    inStock: false,
  });
  const [liveCategories, setLiveCategories] = useState<CategoryNode[] | null>(null);
  const [liveProducts, setLiveProducts] = useState<Saree[] | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Catalog unavailable")))
      .then((catalog: { categories?: unknown[]; products?: unknown[] }) => {
        if (Array.isArray(catalog.categories)) {
          const nextCategories = categoryTreeFromRecords(catalog.categories);
          if (nextCategories.length) setLiveCategories(nextCategories);
        }
        if (!products && Array.isArray(catalog.products)) setLiveProducts(sareesFromRecords(catalog.products));
      })
      .catch(() => undefined);
  }, []);

  const activeProducts = products ?? liveProducts ?? sarees;
  const collectionProducts = productFilter ? activeProducts.filter(productFilter) : activeProducts;
  const activeCategories = liveCategories ?? categories;
  const availableColors = useMemo<ProductColorOption[]>(() => {
    const seen = new Set(productColors.map((color) => color.key));
    const customColors: ProductColorOption[] = [];
    activeProducts.flatMap((product) => product.variants ?? []).forEach((variant) => {
      const label = String(variant.color ?? "").trim();
      const key = getColorFilterKey(label);
      if (!label || seen.has(key)) return;
      seen.add(key);
      customColors.push({ key, label, hex: "#b5aaa0" });
    });
    return [...productColors, ...customColors];
  }, [activeProducts]);

  const list = useMemo(() => {
    const filtered = collectionProducts.filter((s) => {
      if (selection.subcategory) return s.subcategory === selection.subcategory;
      if (selection.category) return s.category === selection.category;
      return true;
    }).filter((s) => {
      const priceMatch =
        filters.price === "all" ||
        (filters.price === "under-5000" && s.price < 5000) ||
        (filters.price === "5000-15000" && s.price >= 5000 && s.price <= 15000) ||
        (filters.price === "15000-30000" && s.price > 15000 && s.price <= 30000) ||
        (filters.price === "over-30000" && s.price > 30000);
       const variantColors = s.variants?.map((variant) => variant.color).filter(Boolean) ?? [];
       const colorMatch = filters.colors.length === 0 || (variantColors.length ? variantColors.some((color) => filters.colors.includes(getColorFilterKey(color))) : filters.colors.includes(getSareeColor(s.id)));
      const fabricMatch = filters.fabrics.length === 0 || filters.fabrics.some((fabric) => s.fabric.toLowerCase().includes(fabric.toLowerCase()));
      return priceMatch && colorMatch && fabricMatch;
    });
    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "newest") sorted.sort((a, b) => b.addedOn.localeCompare(a.addedOn));
    if (sort === "featured") sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return sorted;
  }, [collectionProducts, filters, selection, sort]);

  return (
    <>
      <div className="border-b border-border fabric-texture">
        <div className="mx-auto max-w-7xl px-5 py-10 md:py-11">
          <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-2 font-display text-5xl font-light leading-none tracking-tight text-primary md:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      <section className="mx-auto mt-10 max-w-7xl px-5 pb-16">
        <div className="flex flex-col gap-10 lg:flex-row">
          <CategorySidebar
            selection={selection}
            onSelect={setSelection}
            filters={filters}
            onFiltersChange={setFilters}
            categoryData={activeCategories}
            availableColors={availableColors}
          />

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <p className="text-sm text-muted-foreground">
                {list.length} {list.length === 1 ? "saree" : "sarees"}
              </p>
              <label className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Sort by</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as Sort)}
                  className="border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
                >
                  {(Object.keys(sortLabels) as Sort[]).map((key) => (
                    <option key={key} value={key}>{sortLabels[key]}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-3">
              {list.map((saree) => <ProductCard key={saree.id} saree={saree} showAddToCart />)}
            </div>
            {list.length === 0 && (
              <p className="mt-10 text-sm text-muted-foreground">
                Nothing here yet — try another category or clear a filter.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export const categoryPageDetails = categoryDetails;
export const categoryList = categories;