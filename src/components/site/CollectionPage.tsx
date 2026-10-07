import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { CategorySidebar, type Selection } from "@/components/site/CategorySidebar";
import { ProductCard } from "@/components/site/ProductCard";
import { categories, sarees, type CategoryNode, type Saree } from "@/data/sarees";
import { getColorFilterKey, productColors, type ProductColorOption } from "@/data/colors";
import { defaultFilters, productMatchesFilterOptions, type Filters } from "@/components/site/productFilters";

type Sort = "featured" | "price-asc" | "price-desc" | "newest";

const sortLabels: Record<Sort, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  newest: "Newest",
};

const curatedListingPresentation: Record<string, { eyebrow: string; title: string; description: string }> = {
  "/new-arrival": {
    eyebrow: "JUST IN",
    title: "New Arrival",
    description: "Fresh drapes, straight from the looms.",
  },
  "/trending": {
    eyebrow: "WHAT'S TRENDING",
    title: "Trending Sarees",
    description: "The drapes everyone is choosing right now.",
  },
  "/bestseller": {
    eyebrow: "OUR BEST LOVED",
    title: "Bestsellers",
    description: "Customer favourites, loved again and again.",
  },
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
  minimumProducts?: Saree[];
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
        ...(Array.isArray(item.colors)
          ? { colors: item.colors.map(String).map((color) => color.trim()).filter(Boolean) }
          : typeof item.color === "string" && item.color.trim()
            ? { colors: [item.color.trim()] }
            : {}),
        blouse: String(item.blouse ?? ""),
        size: item.size == null ? undefined : String(item.size),
        occasion: item.occasion == null ? undefined : String(item.occasion),
        technique: item.technique == null ? undefined : String(item.technique),
        pattern: item.pattern == null ? undefined : String(item.pattern),
        borderType: item.borderType == null ? undefined : String(item.borderType),
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
  minimumProducts,
  initialSelection = { category: null, subcategory: null },
}: CollectionPageProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const categoryListingStyle = pathname.startsWith("/categories/");
  const curatedPresentation = curatedListingPresentation[pathname];
  const sharedListingStyle = categoryListingStyle || Boolean(curatedPresentation);
  const bannerEyebrow = curatedPresentation?.eyebrow ?? eyebrow;
  const bannerTitle = curatedPresentation?.title ?? title;
  const bannerDescription = curatedPresentation?.description ?? description;
  const listingBadge = pathname === "/new-arrival" ? "new" : pathname === "/bestseller" ? "rank" : undefined;
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [sort, setSort] = useState<Sort>("featured");
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters });
  const [liveCategories, setLiveCategories] = useState<CategoryNode[] | null>(null);
  const [liveProducts, setLiveProducts] = useState<Saree[] | null>(null);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "fallback">(products ? "ready" : "loading");
  const [visibleCount, setVisibleCount] = useState(16);

  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Catalog unavailable")))
      .then((catalog: { categories?: unknown[]; products?: unknown[] }) => {
        if (Array.isArray(catalog.categories)) {
          const nextCategories = categoryTreeFromRecords(catalog.categories);
          if (nextCategories.length) setLiveCategories(nextCategories);
        }
        if (!products && Array.isArray(catalog.products)) setLiveProducts(sareesFromRecords(catalog.products));
        setCatalogState("ready");
      })
      .catch(() => setCatalogState("fallback"));
  }, []);

  const activeProducts = products ?? (catalogState === "loading" ? [] : liveProducts ?? sarees);
  const collectionProducts = useMemo(() => {
    const filtered = productFilter ? activeProducts.filter(productFilter) : activeProducts;
    if (!productFilter || filtered.length >= 2) return filtered;

    const fallbackPool = minimumProducts?.length ? minimumProducts : sarees;
    const seenIds = new Set(filtered.map((product) => product.id));
    const supplements = fallbackPool
      .filter((product) => !seenIds.has(product.id))
      .slice(0, 2 - filtered.length);
    return [...filtered, ...supplements];
  }, [activeProducts, minimumProducts, productFilter]);
  const activeCategories = liveCategories ?? categories;
  const availableColors = useMemo<ProductColorOption[]>(() => {
    const seen = new Set(productColors.map((color) => color.key));
    const customColors: ProductColorOption[] = [];
    activeProducts.flatMap((product) => [
      ...(product.colors ?? []),
      ...(product.variants ?? []).map((variant) => variant.color),
    ]).forEach((value) => {
      const label = String(value ?? "").trim();
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
       const savedColors = [
         ...(s.colors ?? []),
         ...(s.variants?.map((variant) => variant.color).filter(Boolean) ?? []),
       ].map(getColorFilterKey);
       const normalizedFilters = {
         ...filters,
         colors: filters.colors.map(getColorFilterKey),
       };
       const colorProduct = savedColors.length
         ? { ...s, colors: savedColors }
         : { ...s, colors: [getSareeColor(s.id)] };
       return productMatchesFilterOptions(colorProduct, normalizedFilters);
     });
    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "newest") sorted.sort((a, b) => String(b.addedOn ?? "").localeCompare(String(a.addedOn ?? "")));
    if (sort === "featured") sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return sorted;
  }, [collectionProducts, filters, selection, sort]);

  const visibleList = list.slice(0, visibleCount);
  const clearFilters = () => {
    setFilters({ ...defaultFilters });
    setSelection({ category: null, subcategory: null });
  };
  const header = sharedListingStyle ? (
    <header className="category-listing-hero">
      <div className="category-listing-container category-listing-hero-content">
        <nav className="category-listing-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/products">Sarees</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{bannerTitle}</span>
        </nav>
        <p className="category-listing-eyebrow">{bannerEyebrow}</p>
        <h1 className="category-listing-title">{bannerTitle}</h1>
        <p className="category-listing-description">{bannerDescription}</p>
      </div>
    </header>
  ) : (
    <div className="fabric-texture border-b border-border">
      <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-8 md:py-12">
        <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-2 font-display text-5xl font-light leading-none tracking-tight text-primary md:text-6xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
  const content = (
    <section className={sharedListingStyle ? "category-listing-content" : "mx-auto max-w-[1440px] px-5 pb-16 pt-8 md:px-8 lg:pt-10"}>
      <div className={sharedListingStyle ? "category-listing-container category-listing-layout" : "flex flex-col gap-7 sm:gap-10 lg:flex-row"}>
        <CategorySidebar
          selection={selection}
          onSelect={setSelection}
          filters={filters}
          onFiltersChange={setFilters}
          categoryData={activeCategories}
          productsForCategories={collectionProducts}
          availableColors={availableColors}
          categoryListingStyle={sharedListingStyle}
        />

        <div className={sharedListingStyle ? "category-listing-results" : "flex-1"}>
          <div className={sharedListingStyle ? "category-listing-toolbar" : "flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"}>
            {catalogState === "loading" && !products ? (
              <p className="text-sm text-muted-foreground">Loading the collection…</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {list.length} {list.length === 1 ? "saree" : "sarees"}
              </p>
            )}
            <label className={sharedListingStyle ? "category-listing-sort" : "flex w-full items-center justify-between gap-3 text-sm sm:w-auto sm:justify-start"}>
              <span className="text-muted-foreground">Sort by</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className={sharedListingStyle ? "category-listing-sort-select" : "min-w-0 border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-gold sm:w-auto"}
              >
                {(Object.keys(sortLabels) as Sort[]).map((key) => (
                  <option key={key} value={key}>{sortLabels[key]}</option>
                ))}
              </select>
            </label>
          </div>

          {catalogState === "loading" && !products ? (
            <div className={sharedListingStyle ? "category-listing-product-grid category-listing-skeleton-grid" : "mt-7 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3"} aria-busy="true" aria-label="Loading the collection">
              {[0, 1, 2].map((item) => <div key={item} className="aspect-[3/4] animate-pulse bg-secondary/70" />)}
            </div>
          ) : (
            <div className={sharedListingStyle ? "category-listing-product-grid" : "mt-7 grid grid-cols-1 gap-x-4 gap-y-10 sm:mt-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4"}>
              {(categoryListingStyle ? visibleList : list).map((saree, index) => (
                <ProductCard
                  key={saree.id}
                  saree={saree}
                  tall
                  editorial
                  showBuyNow
                  categoryListingStyle={categoryListingStyle}
                  listingVisualStyle={sharedListingStyle}
                  listingBadge={listingBadge}
                  listingRank={listingBadge === "rank" ? index + 1 : undefined}
                />
              ))}
            </div>
          )}

          {categoryListingStyle && list.length > visibleCount && (
            <div className="category-listing-load-more">
              <button type="button" onClick={() => setVisibleCount((count) => count + 8)}>
                Load more
              </button>
            </div>
          )}

          {catalogState !== "loading" && list.length === 0 && (
            categoryListingStyle ? (
              <div className="category-listing-empty">
                <p>No sarees found</p>
                <button type="button" onClick={clearFilters}>Clear filters</button>
              </div>
            ) : (
              <p className="mt-10 text-sm text-muted-foreground">
                Nothing here yet — try another category or clear a filter.
              </p>
            )
          )}
        </div>
      </div>
    </section>
  );

  return (
    sharedListingStyle
      ? <div className="category-listing-page">{header}{content}</div>
      : <>{header}{content}</>
  );
}

export const categoryPageDetails = categoryDetails;
export const categoryList = categories;