import { useMemo, useState } from "react";
import { CategorySidebar, type Filters, type Selection } from "@/components/site/CategorySidebar";
import { ProductCard } from "@/components/site/ProductCard";
import { categories, sarees, type Saree } from "@/data/sarees";

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
  initialSelection?: Selection;
};

export function CollectionPage({
  eyebrow = "The Collection",
  title,
  description,
  products = sarees,
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

  const list = useMemo(() => {
    const filtered = products.filter((s) => {
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
      const colorMatch = filters.colors.length === 0 || filters.colors.includes(getSareeColor(s.id));
      const fabricMatch = filters.fabrics.length === 0 || filters.fabrics.some((fabric) => s.fabric.toLowerCase().includes(fabric.toLowerCase()));
      return priceMatch && colorMatch && fabricMatch;
    });
    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "newest") sorted.sort((a, b) => b.addedOn.localeCompare(a.addedOn));
    if (sort === "featured") sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return sorted;
  }, [filters, products, selection, sort]);

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