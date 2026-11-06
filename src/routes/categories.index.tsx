import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { loadStorefrontCatalog } from "@/lib/storefront-catalog";
import { categories as storefrontCategories, categoryEdits } from "@/data/sarees";

type CategoryCard = {
  slug: string;
  label: string;
  description: string;
  image: string;
  productCount: number;
};

const fallbackCategories: CategoryCard[] = storefrontCategories.map((category) => ({
  slug: category.id,
  label: category.label,
  description: "Explore this Bawari Banno collection.",
  image: categoryEdits.find((edit) => edit.id === category.id)?.image ?? "",
  productCount: 0,
}));

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: [
      { title: "Saree Categories | Bawari Banno" },
      { name: "description", content: "Explore every saree category at Bawari Banno." },
    ],
  }),
  component: CategoriesDirectory,
});

function CategoriesDirectory() {
  const [categoryCards, setCategoryCards] = useState<CategoryCard[]>(fallbackCategories);

  useEffect(() => {
    let active = true;
    void loadStorefrontCatalog()
      .then(({ categories, products }) => {
        const topLevelCategories = categories
          .filter((category) => category.published !== false && !category.parentSlug)
          .map((category) => {
            const slug = String(category.slug ?? "").trim();
            const categoryProducts = products.filter((product) =>
              product.published !== false && String(product.category ?? "") === slug,
            );
            return {
              slug,
              label: String(category.label ?? category.name ?? slug).trim(),
              description: String(category.description ?? "").trim() || "Discover sarees selected for this collection.",
              image: String(category.image ?? categoryProducts[0]?.image ?? "").trim(),
              productCount: categoryProducts.length,
              order: Number(category.order ?? 0),
            };
          })
          .filter((category) => category.slug && category.label)
          .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
        if (active && topLevelCategories.length) setCategoryCards(topLevelCategories);
      })
      .catch(() => undefined);

    return () => { active = false; };
  }, []);

  return (
    <SiteShell>
      <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-7 lg:px-10 lg:py-14">
        <p className="text-eyebrow text-gold">Explore Bawari Banno</p>
        <h1 className="mt-2 font-display text-4xl font-light text-primary sm:text-5xl">All categories</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Browse every collection. Choose a category to see its available sarees.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {categoryCards.map((category) => (
            <Link
              key={category.slug}
              to="/categories/$category"
              params={{ category: category.slug }}
              className="group border border-border bg-white transition-colors hover:border-[#ED145B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED145B]"
            >
              <div className="aspect-[4/5] overflow-hidden bg-[#f8f4ef]">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.label}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-end bg-gradient-to-br from-[#f8f4ef] to-[#eadfd5] p-4">
                    <span className="text-sm text-primary/60">{category.label}</span>
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <h2 className="category-directory-card-title text-sm text-primary">{category.label}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{category.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#ED145B]">
                  View sarees <ArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </SiteShell>
  );
}
