import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeading } from "@/components/site/SiteShell";
import { CategorySidebar, type Selection } from "@/components/site/CategorySidebar";
import { ProductCard } from "@/components/site/ProductCard";
import { sarees } from "@/data/sarees";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "All Sarees — Silk, Cotton & Bridal | Vastraa" },
      {
        name: "description",
        content:
          "Browse the full Vastraa catalogue: Kanjivaram, Banarasi, Mysore silk, handloom cotton, designer and bridal sarees.",
      },
      { property: "og:title", content: "All Sarees — Silk, Cotton & Bridal | Vastraa" },
      {
        property: "og:description",
        content: "Filter by fabric and weave across the full Vastraa saree catalogue.",
      },
    ],
  }),
  component: Products,
});

type Sort = "featured" | "price-asc" | "price-desc" | "newest";

const sortLabels: Record<Sort, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  newest: "Newest",
};

function Products() {
  const [selection, setSelection] = useState<Selection>({
    category: null,
    subcategory: null,
  });
  const [sort, setSort] = useState<Sort>("featured");

  const list = useMemo(() => {
    const filtered = sarees.filter((s) => {
      if (selection.subcategory) return s.subcategory === selection.subcategory;
      if (selection.category) return s.category === selection.category;
      return true;
    });
    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "newest") sorted.sort((a, b) => b.addedOn.localeCompare(a.addedOn));
    if (sort === "featured")
      sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return sorted;
  }, [selection, sort]);

  return (
    <SiteShell>
      <PageHeading
        eyebrow="The Collection"
        title="All Sarees"
        intro="Nine weaves currently on the shelf, each traced to its loom. Filter by category or sort to find your drape."
      />

      <section className="mx-auto mt-12 max-w-7xl px-5">
        <div className="flex flex-col gap-10 lg:flex-row">
          <CategorySidebar selection={selection} onSelect={setSelection} />

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <p className="text-sm text-muted-foreground">
                {list.length} {list.length === 1 ? "saree" : "sarees"}
              </p>
              <label className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Sort by</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
                >
                  {(Object.keys(sortLabels) as Sort[]).map((key) => (
                    <option key={key} value={key}>
                      {sortLabels[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-3">
              {list.map((saree) => (
                <ProductCard key={saree.id} saree={saree} />
              ))}
            </div>
            {list.length === 0 && (
              <p className="mt-10 text-sm text-muted-foreground">
                Nothing here yet — try another category.
              </p>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
